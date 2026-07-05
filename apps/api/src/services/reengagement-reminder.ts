import { and, eq, gt, gte, isNotNull, or, sql } from "drizzle-orm";
import { donatur, transactions, waBroadcastJobs, waBroadcastLogs, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { WhatsAppService } from "./whatsapp";

interface ReengagementResult {
  candidates: number;
  skippedNoPhone: number;
  skippedRecentlySent: number;
  sent: number;
  failed: number;
}

export async function runReengagementReminders(
  db: Database,
  frontendUrl?: string
): Promise<ReengagementResult> {
  const result: ReengagementResult = {
    candidates: 0,
    skippedNoPhone: 0,
    skippedRecentlySent: 0,
    sent: 0,
    failed: 0,
  };

  const sixtyTwoDaysAgo = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000);

  // Query donatur yang sudah pernah donasi tapi tidak aktif 62+ hari
  // Correlated subquery: MAX(paid_at) dari transactions < 62 hari lalu
  const candidates = await db
    .select({
      id: donatur.id,
      name: donatur.name,
      phone: donatur.phone,
      whatsappNumber: donatur.whatsappNumber,
    })
    .from(donatur)
    .where(
      and(
        eq(donatur.isActive, true),
        eq(donatur.waOptOut, false),
        gt(donatur.totalDonations, 0),
        or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)),
        sql`(SELECT MAX(${transactions.paidAt}) FROM transactions WHERE ${transactions.donaturId} = ${donatur.id} AND ${transactions.paymentStatus} = 'paid') < ${sixtyTwoDaysAgo}`
      )
    );

  result.candidates = candidates.length;

  if (candidates.length === 0) {
    console.log("[Reengagement] No inactive donors found.");
    return result;
  }

  console.log(`[Reengagement] Found ${candidates.length} inactive donors (62+ days).`);

  // Anti-spam: batch-check siapa yang sudah terima reengagement WA dalam 62 hari terakhir
  const recentlyReceived = await db
    .select({ donaturId: waBroadcastLogs.donaturId })
    .from(waBroadcastLogs)
    .where(
      and(
        eq(waBroadcastLogs.templateKey, "wa_tpl_reengagement"),
        eq(waBroadcastLogs.status, "sent"),
        gte(waBroadcastLogs.sentAt, sixtyTwoDaysAgo)
      )
    );

  const recentIds = new Set(
    recentlyReceived.map((r) => r.donaturId).filter((id): id is string => id !== null)
  );

  // Synthetic job entry untuk audit trail dan FK requirement wa_broadcast_logs.job_id NOT NULL
  const jobId = createId();
  const now = new Date();
  await db.insert(waBroadcastJobs).values({
    id: jobId,
    name: `Re-engagement ${now.toISOString().slice(0, 10)}`,
    type: "reengagement",
    templateKey: "wa_tpl_reengagement",
    audienceScope: "inactive_62d",
    batchSize: candidates.length,
    batchIntervalMinutes: 60,
    nextBatchAt: now,
    status: "processing",
    totalRecipients: candidates.length,
    startedAt: now,
    createdAt: now,
  });

  const wa = new WhatsAppService(db, frontendUrl);

  for (const d of candidates) {
    const phone = d.whatsappNumber || d.phone;
    if (!phone) {
      result.skippedNoPhone++;
      await db.insert(waBroadcastLogs).values({
        id: createId(),
        jobId,
        donaturId: d.id,
        templateKey: "wa_tpl_reengagement",
        phone: "",
        status: "skipped_no_phone",
        sentAt: new Date(),
      });
      continue;
    }

    if (recentIds.has(d.id)) {
      result.skippedRecentlySent++;
      await db.insert(waBroadcastLogs).values({
        id: createId(),
        jobId,
        donaturId: d.id,
        templateKey: "wa_tpl_reengagement",
        phone,
        status: "skipped_recently_sent",
        sentAt: new Date(),
      });
      continue;
    }

    const sent = await wa.send({
      phone,
      templateKey: "wa_tpl_reengagement",
      variables: { customer_name: d.name || "Donatur" },
    });

    await db.insert(waBroadcastLogs).values({
      id: createId(),
      jobId,
      donaturId: d.id,
      templateKey: "wa_tpl_reengagement",
      phone,
      status: sent ? "sent" : "failed",
      sentAt: new Date(),
    });

    if (sent) {
      result.sent++;
    } else {
      result.failed++;
    }

    // 2s delay antar kirim untuk hindari deteksi spam WA
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Update job ke completed
  await db
    .update(waBroadcastJobs)
    .set({
      status: "completed",
      sentCount: result.sent,
      failedCount: result.failed,
      skippedCount: result.skippedNoPhone + result.skippedRecentlySent,
      completedAt: new Date(),
    })
    .where(eq(waBroadcastJobs.id, jobId));

  console.log("[Reengagement] Done:", result);
  return result;
}
