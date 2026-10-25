// @ts-ignore
import { describe, it, expect } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { createDb } from "@bantuanku/db/client";
import { cashAccounts, cashEntries, disbursements, transactionPayments, transactions, users, createId } from "@bantuanku/db";
import { postPaidDisbursement, postVerifiedPaymentsForTransaction, safePost } from "../cash-book";

/**
 * Integrasi posting (DB nyata dengan migrasi 123). Seluruh data uji dibuat DI DALAM transaksi lalu di-rollback,
 * jadi aman dijalankan di DB dev.
 */
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

async function makeTxn(tx: any, v: { productType: string; category: string; total: number; unique?: number; pillar?: string; pm?: string }) {
  const id = createId();
  await tx.insert(transactions).values({
    id,
    transactionNumber: `TST-${id.slice(0, 8)}`,
    productType: v.productType,
    productId: createId(),
    productName: "Uji",
    unitPrice: v.total,
    subtotal: v.total,
    totalAmount: v.total,
    uniqueCode: v.unique || 0,
    donorName: "Penguji",
    category: v.category,
    paymentMethodId: v.pm,
    paymentStatus: "paid",
    typeSpecificData: v.pillar ? { pillar: v.pillar } : {},
  } as any);
  return id;
}

async function addPayment(tx: any, transactionId: string, amount: number, paymentMethod: string, gatewayCode?: string, at = new Date()) {
  const id = createId();
  await tx.insert(transactionPayments).values({
    id,
    paymentNumber: `PAY-TST-${id.slice(0, 8)}`,
    transactionId,
    amount,
    paymentMethod,
    gatewayCode: gatewayCode || null,
    status: "verified",
    verifiedAt: at,
  } as any);
  return id;
}

const anyUserId = async (tx: any): Promise<string> => {
  const [u] = await tx.select({ id: users.id }).from(users).limit(1);
  if (!u) throw new Error("butuh minimal 1 user di DB uji");
  return u.id;
};

const entriesOf = (tx: any, transactionId: string) =>
  tx.select().from(cashEntries).where(eq(cashEntries.transactionId, transactionId));

describe("Buku Kas: posting pembayaran", () => {
  it("zakat fitrah via rekening bank: pokok + kode unik, dana zakat/fitrah, akun bank", async () => {
    await inRollback(async (tx) => {
      const t = await makeTxn(tx, { productType: "zakat", category: "zakat_fitrah", total: 50000, unique: 123, pm: "bank-uji-1" });
      await addPayment(tx, t, 50123, "bank-uji-1");
      await postVerifiedPaymentsForTransaction(tx, t);
      const rows = await entriesOf(tx, t);
      expect(rows.length).toBe(2);
      const byComp = Object.fromEntries(rows.map((r: any) => [r.component, r]));
      expect(byComp.pokok.amount).toBe(50000);
      expect(byComp.kode_unik.amount).toBe(123);
      expect(byComp.pokok.fund).toBe("zakat");
      expect(byComp.pokok.fundDetail).toBe("fitrah");
      expect(byComp.pokok.direction).toBe("in");
      const [acc] = await tx.select().from(cashAccounts).where(eq(cashAccounts.id, byComp.pokok.cashAccountId));
      expect(acc.kind).toBe("bank");
      expect(acc.refKey).toBe("bank-uji-1");
    });
  });

  it("gateway tanpa kode unik: hanya pokok, akun gateway", async () => {
    await inRollback(async (tx) => {
      const t = await makeTxn(tx, { productType: "campaign", category: "campaign_donation", total: 200000, unique: 514, pillar: "sedekah" });
      await addPayment(tx, t, 200000, "flip", "flip");
      await postVerifiedPaymentsForTransaction(tx, t);
      const rows = await entriesOf(tx, t);
      expect(rows.length).toBe(1);
      expect(rows[0].component).toBe("pokok");
      expect(rows[0].gatewayCode).toBe("flip");
      expect(rows[0].fund).toBe("campaign");
    });
  });

  it("wakaf (pilar) + pembayaran ganda: kelebihan tetap pemasukan", async () => {
    await inRollback(async (tx) => {
      const t = await makeTxn(tx, { productType: "campaign", category: "campaign_donation", total: 100000, unique: 213, pillar: "wakaf" });
      const t0 = new Date(Date.now() - 60000);
      await addPayment(tx, t, 100213, "qris-uji", undefined, t0);
      await addPayment(tx, t, 100213, "qris-uji", undefined, new Date());
      await postVerifiedPaymentsForTransaction(tx, t);
      const rows = await entriesOf(tx, t);
      const sum = (c: string) => rows.filter((r: any) => r.component === c).reduce((a: number, r: any) => a + r.amount, 0);
      expect(sum("pokok")).toBe(100000);
      expect(sum("kode_unik")).toBe(213);
      expect(sum("kelebihan")).toBe(100213);
      expect(rows.every((r: any) => r.fund === "wakaf")).toBe(true);
    });
  });

  it("idempoten: posting ulang tidak menambah baris", async () => {
    await inRollback(async (tx) => {
      const t = await makeTxn(tx, { productType: "qurban", category: "qurban_payment", total: 3400000, unique: 486 });
      await addPayment(tx, t, 3400486, "flip", "flip");
      await postVerifiedPaymentsForTransaction(tx, t);
      const first = (await entriesOf(tx, t)).length;
      const again = await postVerifiedPaymentsForTransaction(tx, t);
      expect((await entriesOf(tx, t)).length).toBe(first);
      expect(again.every((r) => r.posted === 0)).toBe(true);
    });
  });

  it("pembayaran bukan verified tidak diposting", async () => {
    await inRollback(async (tx) => {
      const t = await makeTxn(tx, { productType: "campaign", category: "campaign_donation", total: 1000 });
      const id = createId();
      await tx.insert(transactionPayments).values({ id, paymentNumber: `PAY-TST-${id.slice(0, 8)}`, transactionId: t, amount: 1000, paymentMethod: "flip", status: "pending" } as any);
      await postVerifiedPaymentsForTransaction(tx, t);
      expect((await entriesOf(tx, t)).length).toBe(0);
    });
  });
});

describe("Buku Kas: posting pencairan", () => {
  it("zakat_to_fakir: pokok keluar + biaya_transfer, dana zakat/fakir", async () => {
    await inRollback(async (tx) => {
      const id = createId();
      await tx.insert(disbursements).values({
        id,
        disbursementNumber: `DIS-TST-${id.slice(0, 8)}`,
        disbursementType: "zakat",
        amount: 100000,
        transferredAmount: 100000,
        additionalFees: 2500,
        category: "zakat_to_fakir",
        bankAccountId: "bank-uji-1",
        sourceBankId: "bank-uji-1",
        recipientName: "Penerima Uji",
        createdBy: await anyUserId(tx),
        status: "paid",
        paidAt: new Date(),
      } as any);
      await postPaidDisbursement(tx, id);
      const rows = await tx.select().from(cashEntries).where(eq(cashEntries.refId, id));
      expect(rows.length).toBe(2);
      expect(rows.every((r: any) => r.direction === "out" && r.fund === "zakat" && r.fundDetail === "fakir")).toBe(true);
      expect(rows.find((r: any) => r.component === "pokok").amount).toBe(100000);
      expect(rows.find((r: any) => r.component === "biaya_transfer").amount).toBe(2500);
      await postPaidDisbursement(tx, id);
      expect((await tx.select().from(cashEntries).where(eq(cashEntries.refId, id))).length).toBe(2);
    });
  });

  it("penyaluran zakat lama (kategori generik 'zakat') tetap dana zakat", async () => {
    await inRollback(async (tx) => {
      const id = createId();
      await tx.insert(disbursements).values({
        id,
        disbursementNumber: `DIS-TST-${id.slice(0, 8)}`,
        disbursementType: "zakat",
        amount: 50000,
        category: "zakat",
        bankAccountId: "bank-uji-1",
        recipientName: "Penerima Uji",
        createdBy: await anyUserId(tx),
        status: "paid",
        paidAt: new Date(),
        typeSpecificData: { asnaf: "Miskin" },
      } as any);
      await postPaidDisbursement(tx, id);
      const [row] = await tx.select().from(cashEntries).where(eq(cashEntries.refId, id));
      expect(row.fund).toBe("zakat");
      expect(row.fundDetail).toBe("miskin");
    });
  });
});

describe("Buku Kas: safePost", () => {
  it("kegagalan posting tidak membatalkan transaksi induk (savepoint)", async () => {
    await inRollback(async (tx) => {
      const t = await makeTxn(tx, { productType: "campaign", category: "campaign_donation", total: 1000 });
      await safePost(tx, "uji-gagal", async (d: any) => {
        await d.execute(sql`select * from tabel_yang_tidak_ada`); // memicu error SQL
      });
      // transaksi induk masih hidup: baris uji tetap terbaca dan penulisan lanjutan berhasil
      const rows = await tx.select().from(transactions).where(eq(transactions.id, t));
      expect(rows.length).toBe(1);
      await addPayment(tx, t, 1000, "flip", "flip");
      await postVerifiedPaymentsForTransaction(tx, t);
      expect((await entriesOf(tx, t)).length).toBe(1);
    });
  });
});
