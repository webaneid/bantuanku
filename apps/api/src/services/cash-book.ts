import { and, eq, inArray, sql } from "drizzle-orm";
import {
  campaigns,
  cashAccounts,
  cashEntries,
  disbursements,
  paymentGateways,
  settings,
  transactionPayments,
  transactions,
  createId,
} from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import {
  allocatePayment,
  classifyAccount,
  fundForDisbursement,
  fundForTransaction,
  type AccountClassification,
  type Component,
  type PostedByComponent,
} from "./cash-book-rules";

/**
 * Posting ke Buku Kas (ADR-0016). SATU-SATUNYA tempat yang menulis `cash_entries` dari peristiwa uang.
 * Idempoten: kunci unik (ref_type, ref_id, component) + pemeriksaan sebelum menulis.
 * Dipanggil di dalam transaksi DB yang sama dengan perubahan status (Fase 2); gagal posting = batal.
 */

export interface PostResult {
  posted: number;
  skipped: string | null;
  entries: Array<{ direction: "in" | "out"; component: Component; amount: number; fund: string; account: string }>;
}

interface AccountCatalog {
  names: Map<string, { name: string; purpose: string }>;
}

function parseJsonArray(value?: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const maskAccount = (n?: string | null) => (n && n.length > 4 ? `…${n.slice(-4)}` : n || "");

/** Nama tampilan akun kas dari settings (rekening, QRIS) dan tabel gateway. */
export async function loadAccountCatalog(db: Database): Promise<AccountCatalog> {
  const names = new Map<string, { name: string; purpose: string }>();
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, ["payment_bank_accounts", "payment_qris_accounts"]));
  for (const row of rows) {
    for (const item of parseJsonArray(row.value)) {
      if (!item?.id) continue;
      const isBank = row.key === "payment_bank_accounts";
      const label = isBank
        ? [item.bankName, maskAccount(item.accountNumber)].filter(Boolean).join(" ")
        : item.name || item.id;
      const programs: string[] = Array.isArray(item.programs) ? item.programs : [];
      names.set(String(item.id).toLowerCase(), { name: label || item.id, purpose: programs.includes("zakat") ? "zakat" : "umum" });
    }
  }
  const gateways = await db.select({ code: paymentGateways.code, name: paymentGateways.name }).from(paymentGateways);
  for (const g of gateways) names.set(String(g.code).toLowerCase(), { name: g.name || g.code, purpose: "umum" });
  return { names };
}

/** Ambil (atau buat) akun kas untuk metode bayar. Upsert aman terhadap balapan lewat UNIQUE ref_key. */
export async function getOrCreateCashAccount(db: Database, cls: AccountClassification, catalog: AccountCatalog): Promise<string> {
  const known = catalog.names.get(cls.refKey);
  const fallbackName: Record<string, string> = { cash: "Kas Tunai", unmapped: "Belum dipetakan" };
  const name = known?.name || fallbackName[cls.refKey] || cls.refKey;
  await db
    .insert(cashAccounts)
    .values({
      id: createId(),
      kind: cls.kind,
      name,
      refKey: cls.refKey,
      gatewayCode: cls.gatewayCode,
      purpose: known?.purpose || "umum",
    })
    .onConflictDoNothing({ target: cashAccounts.refKey });
  const [row] = await db.select({ id: cashAccounts.id }).from(cashAccounts).where(eq(cashAccounts.refKey, cls.refKey)).limit(1);
  return row.id;
}

async function campaignPillar(db: Database, campaignId?: string | null): Promise<string | null> {
  if (!campaignId) return null;
  const [row] = await db.select({ pillar: campaigns.pillar }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  return row?.pillar ?? null;
}

/** Posting satu pembayaran terverifikasi → 1–3 baris `in` (pokok, kode_unik, kelebihan). */
export async function postVerifiedPayment(db: Database, paymentId: string, catalogIn?: AccountCatalog): Promise<PostResult> {
  const [payment] = await db.select().from(transactionPayments).where(eq(transactionPayments.id, paymentId)).limit(1);
  if (!payment) return { posted: 0, skipped: "pembayaran tidak ditemukan", entries: [] };
  if (payment.status !== "verified") return { posted: 0, skipped: "belum verified", entries: [] };
  if (!(payment.amount > 0)) return { posted: 0, skipped: "jumlah tidak positif", entries: [] };

  const already = await db
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(and(eq(cashEntries.refType, "transaction_payment"), eq(cashEntries.refId, payment.id)))
    .limit(1);
  if (already.length > 0) return { posted: 0, skipped: "sudah diposting", entries: [] };

  const [txn] = await db.select().from(transactions).where(eq(transactions.id, payment.transactionId)).limit(1);
  if (!txn) return { posted: 0, skipped: "transaksi tidak ditemukan", entries: [] };

  // Sudah teralokasi pada pembayaran-pembayaran sebelumnya untuk transaksi ini
  const postedRows = await db
    .select({ component: cashEntries.component, total: sql<number>`coalesce(sum(${cashEntries.amount}), 0)::bigint` })
    .from(cashEntries)
    .where(and(eq(cashEntries.transactionId, txn.id), eq(cashEntries.refType, "transaction_payment"), eq(cashEntries.direction, "in")))
    .groupBy(cashEntries.component);
  const posted: PostedByComponent = { pokok: 0, kode_unik: 0, kelebihan: 0 };
  for (const r of postedRows) {
    if (r.component in posted) posted[r.component as keyof PostedByComponent] = Number(r.total);
  }

  const alloc = allocatePayment(payment.amount, txn.totalAmount, txn.uniqueCode || 0, posted);

  const tsd = (txn.typeSpecificData || {}) as Record<string, any>;
  const pillar = txn.productType === "campaign" ? tsd.pillar ?? (await campaignPillar(db, txn.productId)) : null;
  const { fund, fundDetail } = fundForTransaction({
    productType: txn.productType,
    category: txn.category,
    productId: txn.productId,
    typeSpecificData: tsd,
    pillar,
  });

  const catalog = catalogIn || (await loadAccountCatalog(db));
  const cls = classifyAccount({ paymentMethod: payment.paymentMethod || txn.paymentMethodId, gatewayCode: payment.gatewayCode });
  const accountId = await getOrCreateCashAccount(db, cls, catalog);
  const entryDate = payment.verifiedAt || payment.paymentDate || payment.createdAt;

  const rows = (Object.keys(alloc) as Array<keyof PostedByComponent>)
    .filter((component) => alloc[component] > 0)
    .map((component) => ({
      id: createId(),
      entryDate,
      direction: "in" as const,
      amount: alloc[component],
      component,
      fund,
      fundDetail,
      cashAccountId: accountId,
      method: cls.method,
      gatewayCode: cls.gatewayCode,
      refType: "transaction_payment",
      refId: payment.id,
      transactionId: txn.id,
      campaignId: txn.productType === "campaign" ? txn.productId : null,
    }));
  if (rows.length === 0) return { posted: 0, skipped: "tidak ada nominal", entries: [] };

  await db.insert(cashEntries).values(rows).onConflictDoNothing();
  return {
    posted: rows.length,
    skipped: null,
    entries: rows.map((r) => ({ direction: r.direction, component: r.component as Component, amount: r.amount, fund: r.fund, account: cls.refKey })),
  };
}

/** Posting satu pencairan `paid` → baris `out` (pokok) + `out` biaya_transfer bila ada. */
export async function postPaidDisbursement(db: Database, disbursementId: string, catalogIn?: AccountCatalog): Promise<PostResult> {
  const [d] = await db.select().from(disbursements).where(eq(disbursements.id, disbursementId)).limit(1);
  if (!d) return { posted: 0, skipped: "pencairan tidak ditemukan", entries: [] };
  if (d.status !== "paid") return { posted: 0, skipped: "belum paid", entries: [] };

  const already = await db
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(and(eq(cashEntries.refType, "disbursement"), eq(cashEntries.refId, d.id)))
    .limit(1);
  if (already.length > 0) return { posted: 0, skipped: "sudah diposting", entries: [] };

  const pillar = d.referenceType === "campaign" ? await campaignPillar(db, d.referenceId) : null;
  const { fund, fundDetail } = fundForDisbursement({ category: d.category, pillar });

  const catalog = catalogIn || (await loadAccountCatalog(db));
  const cls = classifyAccount({ paymentMethod: d.sourceBankId || d.bankAccountId || d.destinationBankId, gatewayCode: null });
  const accountId = await getOrCreateCashAccount(db, cls, catalog);
  const entryDate = d.paidAt || d.transferDate || d.createdAt;

  const pokok = Number(d.transferredAmount ?? d.amount ?? 0);
  const fee = Number(d.additionalFees ?? 0);
  const base = {
    entryDate,
    direction: "out" as const,
    fund,
    fundDetail,
    cashAccountId: accountId,
    method: cls.method,
    gatewayCode: cls.gatewayCode,
    refType: "disbursement",
    refId: d.id,
    transactionId: null,
    campaignId: d.referenceType === "campaign" ? d.referenceId : null,
  };
  const rows = [
    ...(pokok > 0 ? [{ id: createId(), ...base, amount: pokok, component: "pokok" }] : []),
    ...(fee > 0 ? [{ id: createId(), ...base, amount: fee, component: "biaya_transfer" }] : []),
  ];
  if (rows.length === 0) return { posted: 0, skipped: "tidak ada nominal", entries: [] };

  await db.insert(cashEntries).values(rows).onConflictDoNothing();
  return {
    posted: rows.length,
    skipped: null,
    entries: rows.map((r) => ({ direction: "out" as const, component: r.component as Component, amount: r.amount, fund: r.fund, account: cls.refKey })),
  };
}


