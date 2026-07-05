import { and, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
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

// Query audience batch based on audienceScope with OFFSET/LIMIT
async function queryAudienceBatch(
  db: Database,
  audienceScope: string,
  referenceId: string | null | undefined,
  offset: number,
  limit: number,
  alreadySentIds: Set<string>
): Promise<Array<{ id: string; name: string | null; phone: string | null; whatsappNumber: string | null }>> {
  if (audienceScope === "all") {
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .where(
        and(
          eq(donatur.isActive, true),
          eq(donatur.waOptOut, false),
          or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone))
        )
      )
      .limit(limit)
      .offset(offset);
  }

  if (audienceScope === "campaign_donors" && referenceId) {
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .innerJoin(transactions, eq(transactions.donaturId, donatur.id))
      .where(
        and(
          eq(donatur.isActive, true),
          eq(donatur.waOptOut, false),
          or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)),
          eq(transactions.productId, referenceId),
          eq(transactions.productType, "campaign"),
          eq(transactions.paymentStatus, "paid")
        )
      )
      .limit(limit)
      .offset(offset);
  }

  if (audienceScope === "inactive_62d") {
    const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .where(
        and(
          eq(donatur.isActive, true),
          eq(donatur.waOptOut, false),
          or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)),
          sql`(SELECT MAX(${transactions.paidAt}) FROM transactions WHERE ${transactions.donaturId} = ${donatur.id} AND ${transactions.paymentStatus} = 'paid') < ${sixtyTwoDaysAgo}`
        )
      )
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
}): Promise<Record<string, string>> {
  const vars: Record<string, string> = {};

  if (job.type === "campaign_new" && job.referenceId) {
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, job.referenceId),
    });
    if (campaign) {
      vars.campaign_title = campaign.title;
      vars.campaign_name = campaign.title;
      vars.campaign_slug = campaign.slug;
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

  // Pick one job that is pending/processing and ready for next batch
  const job = await db.query.waBroadcastJobs.findFirst({
    where: and(
      or(eq(waBroadcastJobs.status, "pending"), eq(waBroadcastJobs.status, "processing")),
      lte(waBroadcastJobs.nextBatchAt, now)
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

  // Build anti-spam set: who already received this job
  const existingLogs = await db
    .select({ donaturId: waBroadcastLogs.donaturId })
    .from(waBroadcastLogs)
    .where(eq(waBroadcastLogs.jobId, job.id));

  const alreadySentIds = new Set(
    existingLogs.map((l) => l.donaturId).filter((id): id is string => id !== null)
  );

  // Count total recipients on first run
  if (job.totalRecipients === 0 && job.currentOffset === 0) {
    const countResult = await queryAudienceBatch(db, job.audienceScope, job.referenceId, 0, 999999, alreadySentIds);
    await db
      .update(waBroadcastJobs)
      .set({ totalRecipients: countResult.length })
      .where(eq(waBroadcastJobs.id, job.id));
  }

  const batch = await queryAudienceBatch(
    db,
    job.audienceScope,
    job.referenceId,
    job.currentOffset,
    job.batchSize,
    alreadySentIds
  );

  const sharedVars = await buildSharedVars(db, job);
  const wa = new WhatsAppService(db, frontendUrl);

  let batchSent = 0;
  let batchFailed = 0;
  let batchSkipped = 0;

  for (const d of batch) {
    if (alreadySentIds.has(d.id)) {
      batchSkipped++;
      continue;
    }

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
      // Free-text: render {var} substitution then send raw
      let message = job.contentOverride;
      for (const [key, val] of Object.entries(variables)) {
        message = message.replaceAll(`{${key}}`, val);
      }
      sent = await wa.sendMessage(phone, message);
    } else if (job.templateKey) {
      const result = await wa.send({ phone, templateKey: job.templateKey, variables });
      sent = result;
    } else {
      errorMessage = "No template or content";
    }

    await db.insert(waBroadcastLogs).values({
      id: createId(),
      jobId: job.id,
      donaturId: d.id,
      templateKey: job.templateKey,
      phone,
      status: sent ? "sent" : errorMessage ? "failed" : "failed",
      errorMessage,
      sentAt: new Date(),
    });

    if (sent) batchSent++;
    else batchFailed++;

    await new Promise((r) => setTimeout(r, 2000));
  }

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
    // Schedule next batch
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
