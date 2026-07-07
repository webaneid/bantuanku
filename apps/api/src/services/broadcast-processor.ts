import { and, asc, eq, isNotNull, lte, notInArray, or, sql } from "drizzle-orm";
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
import { GOWAClient } from "./whatsapp-gowa";

interface BatchResult {
  jobId: string;
  jobName: string;
  batchSent: number;
  batchFailed: number;
  batchSkipped: number;
  status: "batch_done" | "completed" | "no_job";
}

// Subquery: exclude donatur already logged for this job (any status including 'sending')
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

// Query next batch of eligible recipients.
// Cursor-less pagination: NOT EXISTS excludes already-logged donatur at DB level — no OFFSET.
// ORDER BY donatur.id ensures stable, deterministic ordering across cron runs.
async function queryAudienceBatch(
  db: Database,
  audienceScope: string,
  referenceId: string | null | undefined,
  limit: number,
  jobId: string
): Promise<Array<{ id: string; name: string | null; phone: string | null; whatsappNumber: string | null }>> {
  const notSent = alreadySentExclusion(jobId);

  if (audienceScope === "all") {
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), notSent))
      .orderBy(asc(donatur.id))
      .limit(limit);
  }

  if (audienceScope === "campaign_donors" && referenceId) {
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .innerJoin(transactions, eq(transactions.donaturId, donatur.id))
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), eq(transactions.productId, referenceId), eq(transactions.productType, "campaign"), eq(transactions.paymentStatus, "paid"), notSent))
      .groupBy(donatur.id, donatur.name, donatur.phone, donatur.whatsappNumber)
      .orderBy(asc(donatur.id))
      .limit(limit);
  }

  if (audienceScope === "inactive_62d") {
    const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);
    return db
      .select({ id: donatur.id, name: donatur.name, phone: donatur.phone, whatsappNumber: donatur.whatsappNumber })
      .from(donatur)
      .where(and(eq(donatur.isActive, true), eq(donatur.waOptOut, false), or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)), sql`(SELECT MAX(${transactions.paidAt}) FROM transactions WHERE ${transactions.donaturId} = ${donatur.id} AND ${transactions.paymentStatus} = 'paid') < ${sixtyTwoDaysAgo}`, notSent))
      .orderBy(asc(donatur.id))
      .limit(limit);
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
  // ORDER BY createdAt ensures FIFO processing when multiple jobs are pending.
  const job = await db.query.waBroadcastJobs.findFirst({
    where: and(
      or(eq(waBroadcastJobs.status, "pending"), eq(waBroadcastJobs.status, "processing")),
      lte(waBroadcastJobs.nextBatchAt, now),
      notInArray(waBroadcastJobs.type, ["birthday", "reengagement"])
    ),
    orderBy: [asc(waBroadcastJobs.createdAt)],
  });

  if (!job) {
    return { jobId: "", jobName: "", batchSent: 0, batchFailed: 0, batchSkipped: 0, status: "no_job" };
  }

  console.log(`[Broadcast] Processing job: ${job.id} (${job.name}), offset=${job.currentOffset}`);

  try {
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

    // Cursor-less pagination: each run fetches next batchSize un-sent donatur.
    // NOT EXISTS at DB level + ORDER BY id → no OFFSET needed.
    const batch = await queryAudienceBatch(
      db,
      job.audienceScope,
      job.referenceId,
      job.batchSize,
      job.id
    );

    const sharedVars = await buildSharedVars(db, job, frontendUrl);
    const wa = new WhatsAppService(db, frontendUrl);
    const waConfig = await wa.getConfig();

    // Pre-batch connectivity check — abort early if device is not connected.
    // Prevents sending 30+ failed requests when WA session has expired.
    const gowaClient = new GOWAClient({
      apiUrl: waConfig.apiUrl,
      username: waConfig.username,
      password: waConfig.password,
      deviceId: waConfig.deviceId,
      messageDelay: waConfig.messageDelay,
    });
    const { connected } = await gowaClient.checkStatus();
    if (!connected) {
      console.warn(`[Broadcast] Job ${job.id} aborted: GOWA device not connected`);
      await db.update(waBroadcastJobs)
        .set({ status: "paused", errorMessage: "Device WA tidak terhubung — reconnect lalu resume job ini" })
        .where(eq(waBroadcastJobs.id, job.id));
      return { jobId: job.id, jobName: job.name, batchSent: 0, batchFailed: 0, batchSkipped: 0, status: "no_job" };
    }

    const messageDelay = waConfig.messageDelay > 0 ? waConfig.messageDelay : 2000;

    let batchSent = 0;
    let batchFailed = 0;
    let batchSkipped = 0;
    let claimConflicts = 0;

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
        }).onConflictDoNothing({ target: [waBroadcastLogs.jobId, waBroadcastLogs.donaturId] });
        continue;
      }

      // Claim-before-send: insert log with status='sending' BEFORE sending WA.
      // onConflictDoNothing() safely handles concurrent cron overlap without catching
      // unrelated DB errors (connection loss, schema mismatch, etc.).
      const logId = createId();
      const claimed = await db.insert(waBroadcastLogs).values({
        id: logId,
        jobId: job.id,
        donaturId: d.id,
        templateKey: job.templateKey,
        phone,
        status: "sending",
        sentAt: new Date(),
      }).onConflictDoNothing({ target: [waBroadcastLogs.jobId, waBroadcastLogs.donaturId] }).returning({ id: waBroadcastLogs.id });

      if (!claimed.length) {
        // 0 rows inserted = unique constraint conflict = already claimed by another process.
        // Not a business-level skip — do not increment batchSkipped.
        claimConflicts++;
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

      // Update log to final status after WA response
      await db.update(waBroadcastLogs)
        .set({ status: sent ? "sent" : "failed", errorMessage: errorMessage ?? null })
        .where(eq(waBroadcastLogs.id, logId));

      if (sent) batchSent++;
      else batchFailed++;

      await new Promise((r) => setTimeout(r, messageDelay));
    }

    if (claimConflicts > 0) {
      console.log(`[Broadcast] Job ${job.id}: ${claimConflicts} claim conflict(s) skipped (concurrent processor).`);
    }

    // currentOffset is an informational progress counter for admin UI; query no longer uses OFFSET.
    const newOffset = job.currentOffset + batch.length;
    // Batch is last when fewer rows returned than requested — all un-sent donatur exhausted.
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
    }

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

  } catch (err) {
    // Fatal error — mark job as failed so it doesn't get retried forever in 'processing' state
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Broadcast] Job ${job.id} fatal error:`, err);
    await db
      .update(waBroadcastJobs)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(waBroadcastJobs.id, job.id))
      .catch((dbErr) => console.error("[Broadcast] Failed to mark job as failed:", dbErr));
    throw err;
  }
}
