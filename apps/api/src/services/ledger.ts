import { eq, sql } from "drizzle-orm";
import { ledgerAccounts, ledgerEntries, ledgerLines, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

interface LedgerLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export async function createLedgerEntry(
  db: Database,
  params: {
    refType: string;
    refId: string;
    memo: string;
    lines: LedgerLineInput[];
    createdBy?: string;
  }
) {
  const { refType, refId, memo, lines, createdBy } = params;

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error(`Ledger entry not balanced: debit=${totalDebit}, credit=${totalCredit}`);
  }

  const now = new Date();
  const entryNumber = generateEntryNumber();
  const entryId = createId();

  await db.insert(ledgerEntries).values({
    id: entryId,
    entryNumber,
    refType,
    refId,
    postedAt: now,
    memo,
    status: "posted",
    createdBy,
  });

  for (const line of lines) {
    const account = await db.query.ledgerAccounts.findFirst({
      where: eq(ledgerAccounts.code, line.accountCode),
    });

    if (!account) {
      throw new Error(`Ledger account not found: ${line.accountCode}`);
    }

    await db.insert(ledgerLines).values({
      id: createId(),
      entryId,
      accountId: account.id,
      description: line.description,
      debit: line.debit || 0,
      credit: line.credit || 0,
    });
  }

  return { entryId, entryNumber };
}

export async function createDonationLedgerEntry(
  db: Database,
  params: {
    donationId: string;
    amount: number;
    campaignTitle: string;
    donorName: string;
    paymentMethod?: string;
    bankAccountCode?: string;
    createdBy?: string;
  }
) {
  const bankCode = params.bankAccountCode || "1020";

  return createLedgerEntry(db, {
    refType: "donation",
    refId: params.donationId,
    memo: `Donasi dari ${params.donorName} untuk ${params.campaignTitle}`,
    createdBy: params.createdBy,
    lines: [
      {
        accountCode: bankCode,
        debit: params.amount,
        description: `Terima donasi via ${params.paymentMethod || 'Transfer Bank'}`
      },
      {
        accountCode: "2010",
        credit: params.amount,
        description: `Titipan donasi untuk ${params.campaignTitle}`
      },
    ],
  });
}

export async function createDisbursementLedgerEntry(
  db: Database,
  params: {
    disbursementId: string;
    amount: number;
    purpose: string;
    recipientName: string;
    campaignTitle: string;
    paymentMethod?: string;
    bankAccountCode?: string;
    createdBy?: string;
  }
) {
  const bankCode = params.bankAccountCode || "1020";

  return createLedgerEntry(db, {
    refType: "disbursement",
    refId: params.disbursementId,
    memo: `Penyaluran: ${params.purpose} kepada ${params.recipientName} untuk ${params.campaignTitle}`,
    createdBy: params.createdBy,
    lines: [
      {
        accountCode: "2010",
        debit: params.amount,
        description: `Penyaluran titipan untuk ${params.campaignTitle}`
      },
      {
        accountCode: bankCode,
        credit: params.amount,
        description: `Bayar ke ${params.recipientName} via ${params.paymentMethod || 'Transfer Bank'}`
      },
    ],
  });
}

export async function getAccountBalance(db: Database, accountCode: string) {
  const account = await db.query.ledgerAccounts.findFirst({
    where: eq(ledgerAccounts.code, accountCode),
  });

  if (!account) return null;

  const result = await db
    .select({
      totalDebit: sql<number>`coalesce(sum(${ledgerLines.debit}), 0)`,
      totalCredit: sql<number>`coalesce(sum(${ledgerLines.credit}), 0)`,
    })
    .from(ledgerLines)
    .where(eq(ledgerLines.accountId, account.id));

  const totalDebit = Number(result[0]?.totalDebit || 0);
  const totalCredit = Number(result[0]?.totalCredit || 0);

  const balance = account.normalSide === "debit"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;

  return { account, balance, totalDebit, totalCredit };
}

function generateEntryNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JE-${year}${month}-${random}`;
}
