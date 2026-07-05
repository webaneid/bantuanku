import { and, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import { donatur, waBroadcastJobs, waBroadcastLogs, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { WhatsAppService } from "./whatsapp";

interface BirthdayResult {
  todayBirthdays: number;
  skippedNoPhone: number;
  skippedRecentlySent: number;
  sent: number;
  failed: number;
}

function getTodayWIBMonthDay(): { month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  return {
    month: parseInt(parts.find((p) => p.type === "month")!.value),
    day: parseInt(parts.find((p) => p.type === "day")!.value),
  };
}

export async function runBirthdayReminders(
  db: Database,
  frontendUrl?: string
): Promise<BirthdayResult> {
  const result: BirthdayResult = {
    todayBirthdays: 0,
    skippedNoPhone: 0,
    skippedRecentlySent: 0,
    sent: 0,
    failed: 0,
  };

  const { month, day } = getTodayWIBMonthDay();
  console.log(`[Birthday] WIB today: month=${month}, day=${day}`);

  // Query donatur with birthday today — DB handles isActive + waOptOut + phone + birthDate filters
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
        isNotNull(donatur.birthDate),
        or(isNotNull(donatur.whatsappNumber), isNotNull(donatur.phone)),
        sql`EXTRACT(MONTH FROM ${donatur.birthDate}::date) = ${month}`,
        sql`EXTRACT(DAY FROM ${donatur.birthDate}::date) = ${day}`
      )
    );

  result.todayBirthdays = candidates.length;

  if (candidates.length === 0) {
    console.log("[Birthday] No birthdays today.");
    return result;
  }

  // Anti-spam: batch-check who already received birthday WA in last 23 hours
  const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
  const recentlyReceived = await db
    .select({ donaturId: waBroadcastLogs.donaturId })
    .from(waBroadcastLogs)
    .where(
      and(
        eq(waBroadcastLogs.templateKey, "wa_tpl_birthday"),
        eq(waBroadcastLogs.status, "sent"),
        gte(waBroadcastLogs.sentAt, twentyThreeHoursAgo)
      )
    );

  const recentIds = new Set(
    recentlyReceived.map((r) => r.donaturId).filter((id): id is string => id !== null)
  );

  // Create synthetic job entry for audit trail and log FK requirement
  const jobId = createId();
  const now = new Date();
  await db.insert(waBroadcastJobs).values({
    id: jobId,
    name: `Ucapan Ulang Tahun ${day}/${month}`,
    type: "birthday",
    templateKey: "wa_tpl_birthday",
    audienceScope: "birthday_today",
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
        templateKey: "wa_tpl_birthday",
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
        templateKey: "wa_tpl_birthday",
        phone,
        status: "skipped_recently_sent",
        sentAt: new Date(),
      });
      continue;
    }

    const sent = await wa.send({
      phone,
      templateKey: "wa_tpl_birthday",
      variables: { customer_name: d.name || "Donatur" },
    });

    await db.insert(waBroadcastLogs).values({
      id: createId(),
      jobId,
      donaturId: d.id,
      templateKey: "wa_tpl_birthday",
      phone,
      status: sent ? "sent" : "failed",
      sentAt: new Date(),
    });

    if (sent) {
      result.sent++;
    } else {
      result.failed++;
    }

    // 2s delay between sends to avoid WA rate-limit detection
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Mark job as completed
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

  console.log("[Birthday] Done:", result);
  return result;
}
