import { asc, eq, sql } from "drizzle-orm";
import { disbursements, transactionPayments, transactions } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { loadAccountCatalog, postPaidDisbursement, postPaidTransactionWithoutPayment, postVerifiedPayment } from "./cash-book";

/**
 * Backfill Buku Kas dari riwayat (ADR-0016, docs/arsitektur-buku-kas.md §7). Idempoten.
 * Tanpa cut-off dan tanpa saldo awal (D9). Tidak mengubah data lama: hanya MENULIS baris `cash_entries`.
 */

export interface BackfillReport {
  payments: { verified: number; posted: number; skipped: Record<string, number> };
  disbursements: { paid: number; posted: number; skipped: Record<string, number> };
  /** Kelompok A (D3): transaksi paid tanpa pembayaran terverifikasi, dicatat sintetis */
  paidWithoutPayment: { candidates: number; posted: number; amount: number; skipped: Record<string, number> };
  entriesInserted: number;
  byComponent: Record<string, { rows: number; amount: number }>;
  byFund: Record<string, { in: number; out: number }>;
  byAccount: Record<string, { in: number; out: number }>;
  parity: {
    verifiedPaymentsTotal: number;
    cashBookIn: number;
    inDifference: number;
    paidDisbursementsTotal: number;
    cashBookOut: number;
    outDifference: number;
  };
}

class DryRunRollback extends Error {
  constructor(public report: BackfillReport) {
    super("dry-run rollback");
  }
}

const bump = (m: Record<string, number>, k: string) => {
  m[k] = (m[k] || 0) + 1;
};

/** Menjalankan posting untuk seluruh riwayat pada `db` (boleh berupa transaksi). */
export async function runBackfill(db: Database): Promise<BackfillReport> {
  const catalog = await loadAccountCatalog(db);
  const report: BackfillReport = {
    payments: { verified: 0, posted: 0, skipped: {} },
    disbursements: { paid: 0, posted: 0, skipped: {} },
    paidWithoutPayment: { candidates: 0, posted: 0, amount: 0, skipped: {} },
    entriesInserted: 0,
    byComponent: {},
    byFund: {},
    byAccount: {},
    parity: { verifiedPaymentsTotal: 0, cashBookIn: 0, inDifference: 0, paidDisbursementsTotal: 0, cashBookOut: 0, outDifference: 0 },
  };
  const add = (e: { direction: "in" | "out"; component: string; amount: number; fund: string; account: string }) => {
    report.entriesInserted += 1;
    const c = (report.byComponent[`${e.direction}:${e.component}`] ||= { rows: 0, amount: 0 });
    c.rows += 1;
    c.amount += e.amount;
    (report.byFund[e.fund] ||= { in: 0, out: 0 })[e.direction] += e.amount;
    (report.byAccount[e.account] ||= { in: 0, out: 0 })[e.direction] += e.amount;
  };

  // Urut per transaksi dan waktu agar alokasi kumulatif (cicilan) deterministik
  const payments = await db
    .select({ id: transactionPayments.id })
    .from(transactionPayments)
    .where(eq(transactionPayments.status, "verified"))
    .orderBy(asc(transactionPayments.transactionId), asc(transactionPayments.verifiedAt), asc(transactionPayments.createdAt), asc(transactionPayments.id));
  report.payments.verified = payments.length;
  for (const p of payments) {
    const r = await postVerifiedPayment(db, p.id, catalog);
    if (r.skipped) bump(report.payments.skipped, r.skipped);
    else report.payments.posted += 1;
    r.entries.forEach(add);
  }

  // Kelompok A (D3): transaksi paid tanpa pembayaran terverifikasi → pemasukan sintetis berlabel
  const noPayment = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(sql`${transactions.paymentStatus} = 'paid' and not exists (select 1 from transaction_payments p where p.transaction_id = ${transactions.id} and p.status = 'verified')`)
    .orderBy(asc(transactions.paidAt), asc(transactions.id));
  report.paidWithoutPayment.candidates = noPayment.length;
  for (const t of noPayment) {
    const r = await postPaidTransactionWithoutPayment(db, t.id, catalog);
    if (r.skipped) bump(report.paidWithoutPayment.skipped, r.skipped);
    else {
      report.paidWithoutPayment.posted += 1;
      report.paidWithoutPayment.amount += r.entries.reduce((a, e) => a + e.amount, 0);
    }
    r.entries.forEach(add);
  }

  const paid = await db
    .select({ id: disbursements.id })
    .from(disbursements)
    .where(eq(disbursements.status, "paid"))
    .orderBy(asc(disbursements.paidAt), asc(disbursements.id));
  report.disbursements.paid = paid.length;
  for (const d of paid) {
    const r = await postPaidDisbursement(db, d.id, catalog);
    if (r.skipped) bump(report.disbursements.skipped, r.skipped);
    else report.disbursements.posted += 1;
    r.entries.forEach(add);
  }

  // Paritas terhadap sumber: seluruh pembayaran verified dan seluruh pencairan paid (termasuk yang sudah diposting sebelumnya)
  const [src] = (
    await db.execute(sql`
      select
        (select coalesce(sum(amount),0) from transaction_payments where status = 'verified')::bigint as verified_total,
        (select coalesce(sum(amount),0) from cash_entries where direction = 'in' and ref_type = 'transaction_payment')::bigint as book_in,
        (select coalesce(sum(coalesce(transferred_amount, amount) + coalesce(additional_fees, 0)),0) from disbursements where status = 'paid')::bigint as paid_total,
        (select coalesce(sum(amount),0) from cash_entries where direction = 'out' and ref_type = 'disbursement')::bigint as book_out
    `)
  ).rows as any[];
  report.parity = {
    verifiedPaymentsTotal: Number(src.verified_total),
    cashBookIn: Number(src.book_in),
    inDifference: Number(src.book_in) - Number(src.verified_total),
    paidDisbursementsTotal: Number(src.paid_total),
    cashBookOut: Number(src.book_out),
    outDifference: Number(src.book_out) - Number(src.paid_total),
  };
  return report;
}

/** `apply=false` (dry-run): seluruh penulisan dibatalkan (rollback); hanya laporan yang dikembalikan. */
export async function backfillCashBook(db: Database, opts: { apply: boolean }): Promise<BackfillReport> {
  if (opts.apply) return db.transaction(async (tx) => runBackfill(tx as unknown as Database));
  try {
    await db.transaction(async (tx) => {
      const report = await runBackfill(tx as unknown as Database);
      throw new DryRunRollback(report);
    });
  } catch (err) {
    if (err instanceof DryRunRollback) return err.report;
    throw err;
  }
  throw new Error("tidak tercapai");
}
