import { and, desc, eq, gte, lt } from "drizzle-orm";
import { disbursements, entityBankAccounts, users } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { DisbursementService } from "./disbursement";

const AUTO_RUN_DAY = 20;
const AUTO_RUN_HOUR = 6;
const AUTO_RUN_MINUTE = 20;
const MINIMUM_AUTO_DISBURSEMENT = 1_000_000;
const DEVELOPER_RECIPIENT_NAME = "Webane Indonesia";
const DEVELOPER_RECIPIENT_CONTACT = "085210626455";

type AutoDisbursementResult = {
  executed: boolean;
  reason?: string;
  disbursementId?: string;
  amount?: number;
};

function getJakartaNow() {
  const now = new Date();
  const jakartaString = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(jakartaString);
}

function getJakartaDayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getMillisUntilNextRun(targetHour: number, targetMinute: number): number {
  const jakartaNow = getJakartaNow();
  const nextRun = new Date(jakartaNow);
  nextRun.setHours(targetHour, targetMinute, 0, 0);

  if (jakartaNow >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const diff = nextRun.getTime() - jakartaNow.getTime();
  return Math.max(diff, 60_000);
}

export async function runDeveloperAutoDisbursement(db: Database): Promise<AutoDisbursementResult> {
  const jakartaNow = getJakartaNow();
  if (jakartaNow.getDate() !== AUTO_RUN_DAY) {
    return {
      executed: false,
      reason: `Skip: hari ini bukan tanggal ${AUTO_RUN_DAY} WIB`,
    };
  }

  const developerUser = await db.query.users.findFirst({
    where: and(eq(users.isDeveloper, true), eq(users.isActive, true)),
    columns: { id: true, phone: true },
    orderBy: [desc(users.createdAt)],
  });

  if (!developerUser) {
    return {
      executed: false,
      reason: "Skip: akun developer tidak ditemukan",
    };
  }

  const developerBank = await db.query.entityBankAccounts.findFirst({
    where: and(
      eq(entityBankAccounts.entityType, "developer"),
      eq(entityBankAccounts.entityId, developerUser.id)
    ),
    orderBy: [desc(entityBankAccounts.createdAt)],
  });

  if (!developerBank) {
    return {
      executed: false,
      reason: "Skip: rekening developer belum tersedia",
    };
  }

  const { start: todayStart, end: tomorrowStart } = getJakartaDayBounds(jakartaNow);
  const existingToday = await db.query.disbursements.findFirst({
    where: and(
      eq(disbursements.disbursementType, "revenue_share"),
      eq(disbursements.category, "revenue_share_developer"),
      eq(disbursements.createdBy, developerUser.id),
      gte(disbursements.createdAt, todayStart),
      lt(disbursements.createdAt, tomorrowStart)
    ),
    columns: { id: true },
    orderBy: [desc(disbursements.createdAt)],
  });

  if (existingToday) {
    return {
      executed: false,
      reason: "Skip: auto-pengajuan bulan ini sudah dibuat",
    };
  }

  const disbursementService = new DisbursementService(db);
  const availability = await disbursementService.getRevenueShareAvailability("revenue_share_developer");
  const amount = Math.floor(Number(availability.totalAvailable || 0));

  if (amount < MINIMUM_AUTO_DISBURSEMENT) {
    return {
      executed: false,
      reason: `Skip: saldo tersedia di bawah minimum Rp ${MINIMUM_AUTO_DISBURSEMENT.toLocaleString("id-ID")}`,
    };
  }

  const created = await disbursementService.create({
    disbursement_type: "revenue_share",
    amount,
    category: "revenue_share_developer",
    recipient_type: "manual",
    recipient_id: developerUser.id,
    recipient_name: DEVELOPER_RECIPIENT_NAME,
    recipient_contact: developerUser.phone || DEVELOPER_RECIPIENT_CONTACT,
    recipient_bank_name: developerBank.bankName,
    recipient_bank_account: developerBank.accountNumber,
    recipient_bank_account_name: developerBank.accountHolderName,
    purpose: `Auto pengajuan fee developer tanggal ${AUTO_RUN_DAY}`,
    description: "Auto-generated revenue share disbursement for developer",
    notes: "Dibuat otomatis oleh scheduler bulanan developer",
    created_by: developerUser.id,
    type_specific_data: {
      auto_generated: true,
      auto_job: "developer_revenue_share",
      generated_at: new Date().toISOString(),
    },
  });

  const submitted = await disbursementService.updateStatus(created.id, {
    status: "submitted",
    user_id: developerUser.id,
  });

  return {
    executed: true,
    disbursementId: submitted.id,
    amount: Number(submitted.amount || 0),
  };
}

export function startDeveloperAutoDisbursementScheduler(db: Database): () => void {
  let timeoutId: NodeJS.Timeout | null = null;

  const scheduleNext = () => {
    const waitMs = getMillisUntilNextRun(AUTO_RUN_HOUR, AUTO_RUN_MINUTE);
    const hours = (waitMs / 3_600_000).toFixed(2);
    console.log(`[DeveloperAutoDisbursement] Next run in ${hours} hours`);

    timeoutId = setTimeout(async () => {
      try {
        console.log("[DeveloperAutoDisbursement] Running scheduled job...");
        const result = await runDeveloperAutoDisbursement(db);
        if (result.executed) {
          console.log(
            `[DeveloperAutoDisbursement] Created disbursement ${result.disbursementId} amount=${result.amount}`
          );
        } else {
          console.log(`[DeveloperAutoDisbursement] ${result.reason}`);
        }
      } catch (err) {
        console.error("[DeveloperAutoDisbursement] Scheduled run error:", err);
      }

      scheduleNext();
    }, waitMs);
  };

  scheduleNext();
  console.log(
    `[DeveloperAutoDisbursement] Scheduler started. Daily check at ${String(AUTO_RUN_HOUR).padStart(2, "0")}:${String(AUTO_RUN_MINUTE).padStart(2, "0")} WIB`
  );

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      console.log("[DeveloperAutoDisbursement] Scheduler stopped.");
    }
  };
}
