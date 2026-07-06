import { and, eq, isNotNull, lte, notInArray, or, sql } from "drizzle-orm";
import {
  campaigns,
  donatur,
  transactions,
  waBroadcastJobs,
  waBroadcastLogs,
  createId,
} from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { WhatsAppService } from "./whatsapp";

interface BatchResult {
  jobId: string;
  jobName: string;
  batchSent: number;
  batchFailed: number;
  batchSkipped: number;
  status: "batch_done" | "completed" | "no_job";
}

// Subquery: exclude donatur already logged for this job (any status)
function alreadySentExclusion(jobId: string) {
  return sql`NOT EXISTS (
    SELECT 1 FROM wa_broadcast_logs
    WHERE wa_broadcast_logs.donatur_id = ${donatur.id}
      AND wa_broadcast_logs.job_id = ${jobId}
  )`;
}

// COUNT total unique eligible recipients for a job (no row materialisation)
async function countAudience(
  db: Database,
  audienceScope: string,
  referenceId: string | null | undefined,
  jobId: string
): Promise<number> {
  const notSent = alreadySentExclusion(jobId);

  if (audienceScope === "all") {
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(donatur)
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), notSent));
    return Number(rows[0]?.n ?? 0);
  }

  if (audienceScope === "campaign_donors" && referenceId) {
    const rows = await db
      .select({ n: sql<number>`count(distinct ${donatur.id})` })
      .from(donatur)
      .innerJoin(transactions, eq(transactions.donaturId, donatur.id))
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), eq(transactions.productId, referenceId), eq(transactions.productType, "campaign"), eq(transactions.paymentStatus, "paid"), notSent));
    return Number(rows[0]?.n ?? 0);
  }

  if (audienceScope === "inactive_62d") {
    const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(donatur)
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), sql`(SELECT MAX(${transactions.paidAt}) FROM transactions WHERE ${transactions.donaturId} = ${donatur.id} AND ${transactions.paymentStatus} = 'paid') < ${sixtyTwoDaysAgo}`, notSent));
    return Number(rows[0]?.n ?? 0);
  }

  return 0;
}

// Query a page of eligible recipients, excluding already-logged donatur at DB level
async function queryAudienceBatch(
  db: Database,
  audienceScope: string,
  referenceId: string | null | undefined,
  offset: number,
  limit: number,
  jobId: string
): Promise<Array<{ id: string; name: string | null; phone: string | null; whatsappNumber: string | null }>> {
  const notSent = alreadySentExclusion(jobId);

  if (audienceScope === "all") {
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), notSent))
      .limit(limit)
      .offset(offset);
  }

  if (audienceScope === "campaign_donors" && referenceId) {
    // groupBy deduplicates donatur with multiple transactions for the same campaign
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .innerJoin(transactions, eq(transactions.donaturId, donatur.id))
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), eq(transactions.productId, referenceId), eq(transactions.productType, "campaign"), eq(transactions.paymentStatus, "paid"), notSent))
      .groupBy(donatur.id, donatur.name, donatur.phone, donatur.whatsappNumber)
      .limit(limit)
      .offset(offset);
  }

  if (audienceScope === "inactive_62d") {
    const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), sql`(SELECT MAX(${transactions.paidAt}) FROM transactions WHERE ${transactions.donaturId} = ${donatur.id} AND ${transactions.paymentStatus} = 'paid') < ${sixtyTwoDaysAgo}`, notSent))
      .limit(limit)
      .offset(offset);
  }

  return [];
}

// Build shared template variables for the job type
async function buildSharedVars(db: Database, job: {
  type: string;
  referenceId: string | null | undefined;
  referenceName: string | null | undefined;
}, frontendUrl?: string): Promise<Record<string, string>> {
  const vars: Record<string, string> = {};

  if (job.type === "campaign_new" && job.referenceId) {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, job.referenceId),
    });
    if (campaign) {
      const base = (frontendUrl || "").replace(/\/+$/, "");
      vars.campaign_title = campaign.title;
      vars.campaign_name = campaign.title;
      vars.campaign_slug = campaign.slug;
      vars.campaign_url = `${base}/program/${campaign.slug}`;
      vars.campaign_description = campaign.description
        ? (campaign.description.length > 150 ? campaign.description.slice(0, 150) + "..." : campaign.description)
        : "";
      vars.campaign_target = campaign.goal
        ? "Rp " + campaign.goal.toLocaleString("id-ID")
        : "Tidak ada target";
    }
  }

  if (job.referenceName) {
    vars.reference_name = job.referenceName;
  }

  return vars;
}

export async function processBroadcastBatch(
  db: Database,
  frontendUrl?: string
): Promise<BatchResult> {
  const now = new Date();

  // Pick one job that is pending/processing and ready for next batch.
  // Exclude synthetic jobs managed by their own cron (birthday, reengagement).
  const job = await db.query.waBroadcastJobs.findFirst({
    where: and(
      or(eq(waBroadcastJobs.status, "pending"), eq(waBroadcastJobs.status, "processing")),
      lte(waBroadcastJobs.nextBatchAt, now),
      notInArray(waBroadcastJobs.type, ["birthday", "reengagement"])
    ),
  });

  if (!job) {
    return { jobId: "", jobName: "", batchSent: 0, batchFailed: 0, batchSkipped: 0, status: "no_job" };
  }

  console.log(`[Broadcast] Processing job: ${job.id} (${job.name}), offset=${job.currentOffset}`);

  // Mark as processing if still pending
  if (job.status === "pending") {
    await db
      .update(waBroadcastJobs)
      .set({ status: "processing", startedAt: now })
      .where(eq(waBroadcastJobs.id, job.id));
  }

  // Count total recipients on first run using COUNT(*) — no full table fetch
  if (job.totalRecipients === 0 && job.currentOffset === 0) {
    const total = await countAudience(db, job.audienceScope, job.referenceId, job.id);
    await db
      .update(waBroadcastJobs)
      .set({ totalRecipients: total })
      .where(eq(waBroadcastJobs.id, job.id));
  }

  // Audience query already excludes already-sent donatur via NOT EXISTS at DB level
  const batch = await queryAudienceBatch(
    db,
    job.audienceScope,
    job.referenceId,
    job.currentOffset,
    job.batchSize,
    job.id
  );

  const sharedVars = await buildSharedVars(db, job, frontendUrl);
  const wa = new WhatsAppService(db, frontendUrl);

  let batchSent = 0;
  let batchFailed = 0;
  let batchSkipped = 0;

  for (const d of batch) {
    const phone = d.whatsappNumber || d.phone;
    if (!phone) {
      batchSkipped++;
      await db.insert(waBroadcastLogs).values({
        id: createId(),
        jobId: job.id,
        donaturId: d.id,
        templateKey: job.templateKey,
        phone: "",
        status: "skipped_no_phone",
        sentAt: new Date(),
      });
      continue;
    }

    const variables: Record<string, string> = {
      customer_name: d.name || "Donatur",
      ...sharedVars,
    };

    let sent = false;
    let errorMessage: string | undefined;

    if (job.type === "manual_free" && job.contentOverride) {
      let message = job.contentOverride;
      for (const [key, val] of Object.entries(variables)) {
        message = message.replaceAll(`{${key}}`, val);
      }
      sent = await wa.sendMessage(phone, message);
    } else if (job.templateKey) {
      sent = await wa.send({ phone, templateKey: job.templateKey, variables });
    } else {
      errorMessage = "No template or content";
    }

    await db.insert(waBroadcastLogs).values({
      id: createId(),
      jobId: job.id,
      donaturId: d.id,
      templateKey: job.templateKey,
      phone,
      status: sent ? "sent" : "failed",
      errorMessage,
      sentAt: new Date(),
    });

    if (sent) batchSent++;
    else batchFailed++;

    await new Promise((r) => setTimeout(r, 2000));
  }

  // Offset advances by actual batch size fetched (already-sent excluded at DB level,
  // so OFFSET correctly tracks only un-sent rows)
  const newOffset = job.currentOffset + batch.length;
  const isLastBatch = batch.length < job.batchSize;

  const totalSent = job.sentCount + batchSent;
  const totalFailed = job.failedCount + batchFailed;
  const totalSkipped = job.skippedCount + batchSkipped;

  if (isLastBatch) {
    await db
      .update(waBroadcastJobs)
      .set({
        status: "completed",
        sentCount: totalSent,
        failedCount: totalFailed,
        skippedCount: totalSkipped,
        currentOffset: newOffset,
        completedAt: new Date(),
        nextBatchAt: null,
      })
      .where(eq(waBroadcastJobs.id, job.id));

    console.log(`[Broadcast] Job ${job.id} completed. sent=${totalSent} failed=${totalFailed}`);
    return { jobId: job.id, jobName: job.name, batchSent, batchFailed, batchSkipped, status: "completed" };
  } else {
    const nextBatchAt = new Date(now.getTime() + job.batchIntervalMinutes * 60 * 1000);
    await db
      .update(waBroadcastJobs)
      .set({
        status: "processing",
        sentCount: totalSent,
        failedCount: totalFailed,
        skippedCount: totalSkipped,
        currentOffset: newOffset,
        nextBatchAt,
      })
      .where(eq(waBroadcastJobs.id, job.id));

    console.log(`[Broadcast] Job ${job.id} batch done. offset=${newOffset}, next=${nextBatchAt.toISOString()}`);
    return { jobId: job.id, jobName: job.name, batchSent, batchFailed, batchSkipped, status: "batch_done" };
  }
}
