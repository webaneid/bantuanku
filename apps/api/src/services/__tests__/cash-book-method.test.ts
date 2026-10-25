// @ts-ignore
import { describe, it, expect } from "bun:test";
import { createDb } from "@bantuanku/db/client";
import { transactionPayments, transactions, createId } from "@bantuanku/db";
import { eq } from "drizzle-orm";
import { paymentMethodError } from "../cash-book";
import { METHOD_REQUIRED_MESSAGE } from "../cash-book-rules";

/** "Tidak boleh ada uang masuk tanpa metode" (ADR-0016 Fase 5): gerbang API + trigger database. */
const db = createDb(process.env.DATABASE_URL!) as any;
class Rollback extends Error {}
async function inRollback(fn: (tx: any) => Promise<void>) {
  try {
    await db.transaction(async (tx: any) => {
      await fn(tx);
      throw new Rollback("batalkan");
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}
const catalog = { names: new Map([["bank-9000001", { name: "BSI", purpose: "umum" }], ["qris-9000002", { name: "QRIS", purpose: "umum" }]]) } as any;

async function insertTxn(tx: any, v: { status: string; pm: string | null; nonCash?: boolean; total?: number }) {
  const id = createId();
  await tx.insert(transactions).values({
    id, transactionNumber: `TST-${id.slice(0, 8)}`, productType: "campaign", productId: createId(), productName: "Uji",
    unitPrice: v.total ?? 10000, subtotal: v.total ?? 10000, totalAmount: v.total ?? 10000, donorName: "Penguji",
    category: "campaign_donation", paymentMethodId: v.pm, paymentStatus: v.status,
    typeSpecificData: v.nonCash ? { is_non_cash: true } : {},
  } as any);
  return id;
}
async function insertPayment(tx: any, transactionId: string, pm: string, status: string, gatewayCode?: string) {
  const id = createId();
  await tx.insert(transactionPayments).values({
    id, paymentNumber: `PAY-TST-${id.slice(0, 8)}`, transactionId, amount: 1000, paymentMethod: pm, gatewayCode: gatewayCode || null, status,
  } as any);
  return id;
}
/** Jalankan dalam SAVEPOINT dan kembalikan pesan galat database (atau null). */
async function dbError(tx: any, fn: (t: any) => Promise<void>): Promise<string | null> {
  try {
    await tx.transaction(async (t: any) => fn(t));
    return null;
  } catch (e: any) {
    return String(e?.cause?.message || e?.message || e);
  }
}

describe("paymentMethodError (gerbang API)", () => {
  it("menolak kosong, generik, dan id yang tidak terdaftar", async () => {
    for (const pm of [null, undefined, "", "bank_transfer", "transfer", "manual", "qris", "bank-8888888"]) {
      expect(await paymentMethodError(db, { paymentMethod: pm as any }, catalog)).toBe(METHOD_REQUIRED_MESSAGE);
    }
  });
  it("menerima rekening/QRIS terdaftar, gateway, dan tunai", async () => {
    expect(await paymentMethodError(db, { paymentMethod: "bank-9000001" }, catalog)).toBeNull();
    expect(await paymentMethodError(db, { paymentMethod: "bank_bank-9000001" }, catalog)).toBeNull();
    expect(await paymentMethodError(db, { paymentMethod: "qris-9000002" }, catalog)).toBeNull();
    expect(await paymentMethodError(db, { paymentMethod: "ipaymu" }, catalog)).toBeNull();
    expect(await paymentMethodError(db, { paymentMethod: "x", gatewayCode: "flip" }, catalog)).toBeNull();
    expect(await paymentMethodError(db, { paymentMethod: "cash" }, catalog)).toBeNull();
  });
});

describe("trigger database (migrasi 124)", () => {
  it("pembayaran verified tanpa metode jelas ditolak; metode jelas lolos", async () => {
    await inRollback(async (tx) => {
      const t = await insertTxn(tx, { status: "pending", pm: "flip" });
      expect(await dbError(tx, (d) => insertPayment(d, t, "bank_transfer", "verified").then(() => {}))).toContain("Metode pembayaran wajib");
      expect(await dbError(tx, (d) => insertPayment(d, t, "", "verified").then(() => {}))).toContain("Metode pembayaran wajib");
      expect(await dbError(tx, (d) => insertPayment(d, t, "bank-9000001", "verified").then(() => {}))).toBeNull();
    });
  });
  it("memverifikasi pembayaran pending bermetode generik ditolak, tetapi menolaknya (rejected) tetap bisa", async () => {
    await inRollback(async (tx) => {
      const t = await insertTxn(tx, { status: "pending", pm: "flip" });
      const p = await insertPayment(tx, t, "transfer", "pending");
      expect(await dbError(tx, (d) => d.update(transactionPayments).set({ status: "verified" }).where(eq(transactionPayments.id, p)))).toContain("Metode pembayaran wajib");
      expect(await dbError(tx, (d) => d.update(transactionPayments).set({ status: "rejected" }).where(eq(transactionPayments.id, p)))).toBeNull();
    });
  });
  it("transaksi paid wajib bermetode jelas, kecuali non-tunai atau nominal 0", async () => {
    await inRollback(async (tx) => {
      expect(await dbError(tx, (d) => insertTxn(d, { status: "paid", pm: null }).then(() => {}))).toContain("tanpa metode");
      expect(await dbError(tx, (d) => insertTxn(d, { status: "paid", pm: "bank_transfer" }).then(() => {}))).toContain("tanpa metode");
      expect(await dbError(tx, (d) => insertTxn(d, { status: "paid", pm: "flip" }).then(() => {}))).toBeNull();
      expect(await dbError(tx, (d) => insertTxn(d, { status: "paid", pm: "internal_savings", nonCash: true }).then(() => {}))).toBeNull();
      expect(await dbError(tx, (d) => insertTxn(d, { status: "paid", pm: null, total: 0 }).then(() => {}))).toBeNull();
    });
  });
  it("transaksi gateway: metode boleh kosong di transaksi bila catatan pembayarannya bergateway", async () => {
    await inRollback(async (tx) => {
      const t = await insertTxn(tx, { status: "pending", pm: null });
      await insertPayment(tx, t, "ipaymu", "pending", "ipaymu");
      expect(await dbError(tx, (d) => d.update(transactions).set({ paymentStatus: "paid" }).where(eq(transactions.id, t)))).toBeNull();
    });
  });
});
