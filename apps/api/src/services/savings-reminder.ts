/**
 * Savings Reminder Scheduler
 *
 * Automatically sends WhatsApp reminders to qurban savings holders
 * based on their installment schedule (monthly or weekly).
 *
 * Logic:
 * 1. Query all active savings with donorPhone
 * 2. Filter by installmentDay matching today (monthly=tanggal, weekly=hari)
 * 3. Skip savings that already have a verified deposit this period
 * 4. Send WA reminder using wa_tpl_savings_reminder template
 */

import { eq, and, gte, lte } from "drizzle-orm";
import {
  qurbanSavings,
  qurbanSavingsTransactions,
} from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { WhatsAppService } from "./whatsapp";

interface ReminderResult {
  totalActive: number;
  dueToday: number;
  alreadyPaid: number;
  sent: number;
  skippedNoPhone: number;
  errors: number;
}

/**
 * Get today's date info in Jakarta timezone
 */
function getTodayJakarta() {
  const now = new Date();
  // Convert to Jakarta time (UTC+7)
  const jakartaOffset = 7 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const jakartaMinutes = utcMinutes + jakartaOffset;

  const jakartaDate = new Date(now);
  jakartaDate.setUTCHours(0, 0, 0, 0);
  if (jakartaMinutes >= 24 * 60) {
    jakartaDate.setUTCDate(jakartaDate.getUTCDate() + 1);
  }

  // Get Jakarta's current date parts
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value);
  const dayOfMonth = parseInt(parts.find((p) => p.type === "day")!.value);

  // Day of week: our convention 1=Senin(Mon)...7=Minggu(Sun)
  // JS getDay: 0=Sun, 1=Mon...6=Sat
  const jsDay = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  ).getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Convert: Sun(0)→7, Mon(1)→1, etc.

  return { year, month, dayOfMonth, dayOfWeek };
}

/**
 * Get the start of current period for a savings entry
 */
function getPeriodBounds(
  frequency: string,
  today: { year: number; month: number; dayOfMonth: number; dayOfWeek: number }
): { start: Date; end: Date } {
  if (frequency === "weekly") {
    // Current week: Monday to Sunday
    const now = new Date(today.year, today.month - 1, today.dayOfMonth);
    const daysSinceMonday = today.dayOfWeek - 1; // 0 for Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  // Monthly: 1st to last day of month
  const start = new Date(today.year, today.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(today.year, today.month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Run savings reminders for today.
 * Returns summary of what was processed.
 */
export async function runSavingsReminders(
  db: Database,
  envFrontendUrl?: string
): Promise<ReminderResult> {
  const result: ReminderResult = {
    totalActive: 0,
    dueToday: 0,
    alreadyPaid: 0,
    sent: 0,
    skippedNoPhone: 0,
    errors: 0,
  };

  const wa = new WhatsAppService(db, envFrontendUrl);

  // 1. Get all active savings
  const allActive = await db
    .select({
      id: qurbanSavings.id,
      savingsNumber: qurbanSavings.savingsNumber,
      donorPhone: qurbanSavings.donorPhone,
      donorName: qurbanSavings.donorName,
      targetAmount: qurbanSavings.targetAmount,
      currentAmount: qurbanSavings.currentAmount,
      installmentAmount: qurbanSavings.installmentAmount,
      installmentFrequency: qurbanSavings.installmentFrequency,
      installmentCount: qurbanSavings.installmentCount,
      installmentDay: qurbanSavings.installmentDay,
    })
    .from(qurbanSavings)
    .where(eq(qurbanSavings.status, "active"));

  result.totalActive = allActive.length;

  if (allActive.length === 0) {
    console.log("[SavingsReminder] No active savings found.");
    return result;
  }

  // 2. Filter by installmentDay matching today
  const today = getTodayJakarta();
  console.log(
    `[SavingsReminder] Today: ${today.year}-${today.month}-${today.dayOfMonth}, dayOfWeek=${today.dayOfWeek} (1=Mon..7=Sun)`
  );

  const dueToday = allActive.filter((s) => {
    if (!s.installmentDay) return false;
    if (s.installmentFrequency === "weekly") {
      return s.installmentDay === today.dayOfWeek;
    }
    if (s.installmentFrequency === "monthly") {
      // Handle day 29-31: if month doesn't have that day, trigger on last day
      const lastDayOfMonth = new Date(today.year, today.month, 0).getDate();
      if (s.installmentDay > lastDayOfMonth) {
        return today.dayOfMonth === lastDayOfMonth;
      }
      return s.installmentDay === today.dayOfMonth;
    }
    return false;
  });

  result.dueToday = dueToday.length;

  if (dueToday.length === 0) {
    console.log("[SavingsReminder] No savings due today.");
    return result;
  }

  // 3. For each due saving, check if already paid this period
  const recipients: Array<{ phone: string; variables: Record<string, string> }> = [];
  const periodBoundsCache = new Map<string, { start: Date; end: Date }>();

  for (const saving of dueToday) {
    if (!saving.donorPhone) {
      result.skippedNoPhone++;
      continue;
    }

    // Get period bounds (cache by frequency)
    const freq = saving.installmentFrequency;
    if (!periodBoundsCache.has(freq)) {
      periodBoundsCache.set(freq, getPeriodBounds(freq, today));
    }
    const bounds = periodBoundsCache.get(freq)!;

    // Check for verified deposit in current period
    const depositsThisPeriod = await db
      .select({ id: qurbanSavingsTransactions.id })
      .from(qurbanSavingsTransactions)
      .where(
        and(
          eq(qurbanSavingsTransactions.savingsId, saving.id),
          eq(qurbanSavingsTransactions.transactionType, "deposit"),
          eq(qurbanSavingsTransactions.status, "verified"),
          gte(qurbanSavingsTransactions.transactionDate, bounds.start),
          lte(qurbanSavingsTransactions.transactionDate, bounds.end)
        )
      );

    if (depositsThisPeriod.length > 0) {
      result.alreadyPaid++;
      continue;
    }

    // Count total verified deposits for progress
    const allDeposits = await db
      .select({ id: qurbanSavingsTransactions.id })
      .from(qurbanSavingsTransactions)
      .where(
        and(
          eq(qurbanSavingsTransactions.savingsId, saving.id),
          eq(qurbanSavingsTransactions.transactionType, "deposit"),
          eq(qurbanSavingsTransactions.status, "verified")
        )
      );

    const installmentPaid = allDeposits.length;
    const remaining = saving.targetAmount - saving.currentAmount;

    const freqLabel: Record<string, string> = {
      weekly: "Mingguan",
      monthly: "Bulanan",
    };

    recipients.push({
      phone: saving.donorPhone,
      variables: {
        customer_name: saving.donorName,
        savings_number: saving.savingsNumber,
        savings_target: wa.formatCurrency(saving.targetAmount),
        savings_current: wa.formatCurrency(saving.currentAmount),
        savings_remaining: wa.formatCurrency(remaining > 0 ? remaining : 0),
        savings_progress: `${Math.min(100, Math.round((saving.currentAmount / saving.targetAmount) * 100))}%`,
        installment_amount: wa.formatCurrency(saving.installmentAmount),
        installment_frequency: freqLabel[saving.installmentFrequency] || saving.installmentFrequency,
        installment_count: String(saving.installmentCount),
        installment_paid: String(installmentPaid),
        installment_remaining: String(Math.max(0, saving.installmentCount - installmentPaid)),
      },
    });
  }

  if (recipients.length === 0) {
    console.log("[SavingsReminder] All due savings already paid this period.");
    return result;
  }

  // 4. Send bulk reminders
  console.log(`[SavingsReminder] Sending reminders to ${recipients.length} recipients...`);

  try {
    await wa.sendBulk(recipients, "wa_tpl_savings_reminder");
    result.sent = recipients.length;
  } catch (err) {
    console.error("[SavingsReminder] Bulk send error:", err);
    result.errors = recipients.length;
  }

  console.log(`[SavingsReminder] Done. Result:`, result);
  return result;
}

/**
 * Schedule daily savings reminder check.
 * Runs every day at the specified hour (Jakarta time).
 * Returns a cleanup function to stop the scheduler.
 */
export function startSavingsReminderScheduler(
  db: Database,
  envFrontendUrl?: string,
  runAtHour: number = 8 // Default: 08:00 WIB
): () => void {
  let timeoutId: NodeJS.Timeout | null = null;

  function getMillisUntilNextRun(): number {
    const now = new Date();
    // Get current Jakarta time
    const jakartaNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const jakartaHour = jakartaNow.getHours();
    const jakartaMinute = jakartaNow.getMinutes();

    // Calculate hours until next run
    let hoursUntil = runAtHour - jakartaHour;
    if (hoursUntil < 0 || (hoursUntil === 0 && jakartaMinute > 0)) {
      hoursUntil += 24; // Next day
    }

    const millisUntil = hoursUntil * 60 * 60 * 1000 - jakartaMinute * 60 * 1000;
    return Math.max(millisUntil, 60000); // Minimum 1 minute
  }

  function scheduleNext() {
    const ms = getMillisUntilNextRun();
    const hours = (ms / 3600000).toFixed(1);
    console.log(`[SavingsReminder] Next run in ${hours} hours`);

    timeoutId = setTimeout(async () => {
      try {
        console.log("[SavingsReminder] Running scheduled check...");
        await runSavingsReminders(db, envFrontendUrl);
      } catch (err) {
        console.error("[SavingsReminder] Scheduled run error:", err);
      }
      // Schedule next run (24 hours later, but recalculate to stay aligned)
      scheduleNext();
    }, ms);
  }

  scheduleNext();
  console.log(`[SavingsReminder] Scheduler started. Will run daily at ${runAtHour}:00 WIB`);

  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      console.log("[SavingsReminder] Scheduler stopped.");
    }
  };
}
