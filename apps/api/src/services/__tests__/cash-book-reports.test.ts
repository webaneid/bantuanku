// @ts-ignore
import { describe, it, expect } from "bun:test";
import { createDb } from "@bantuanku/db/client";
import {
  disbursementRevenueShareItems,
  disbursements,
  revenueShares,
  transactionPayments,
  transactions,
  users,
  createId,
} from "@bantuanku/db";
import { postPaidDisbursement, postVerifiedPaymentsForTransaction } from "../cash-book";
import {
  ReportInputError,
  accountsReport,
  fundsReport,
  listEntries,
  parseParty,
  parseRange,
  revenueShareReport,
  revenueShareTransactions,
} from "../cash-book-reports";

/** Integrasi laporan (DB nyata, migrasi 123). Pendekatan SELISIH: ukur sebelum/sesudah menyisipkan data uji; semua di-rollback. */
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
const ALL = parseRange(undefined, undefined);

async function zakatTxn(tx: any, total: number) {
  const id = createId();
  await tx.insert(transactions).values({
    id, transactionNumber: `TST-${id.slice(0, 8)}`, productType: "zakat", productId: createId(), productName: "Zakat Uji",
    unitPrice: total, subtotal: total, totalAmount: total, uniqueCode: 0, donorName: "Penguji",
    category: "zakat_fitrah", paymentMethodId: "flip", paymentStatus: "paid", paidAt: new Date(), typeSpecificData: {},
  } as any);
  return id;
}
async function pay(tx: any, transactionId: string, amount: number, method: string, gateway?: string, status = "verified") {
  const id = createId();
  await tx.insert(transactionPayments).values({
    id, paymentNumber: `PAY-TST-${id.slice(0, 8)}`, transactionId, amount, paymentMethod: method, gatewayCode: gateway || null, status, verifiedAt: status === "verified" ? new Date() : null,
  } as any);
}
const userId = async (tx: any) => (await tx.select({ id: users.id }).from(users).limit(1))[0].id;

describe("laporan buku kas: validasi input", () => {
  it("menolak tanggal dan enum tak valid", () => {
    expect(() => parseRange("2026-1-1", undefined)).toThrow(ReportInputError);
    expect(() => parseParty("hacker")).toThrow(ReportInputError);
  });
  it("filter enum ditolak sebelum menyentuh SQL", async () => {
    await expect(listEntries(db, { range: ALL, fund: "x'; drop table cash_entries;--", page: 1, limit: 5, offset: 0 })).rejects.toThrow(ReportInputError);
    await expect(listEntries(db, { range: ALL, component: "abc", page: 1, limit: 5, offset: 0 })).rejects.toThrow(ReportInputError);
  });
});

describe("laporan buku kas: angka", () => {
  it("Arus Kas dan Dana per Sumber bergeser tepat sesuai data uji; identitas selalu 0", async () => {
    await inRollback(async (tx) => {
      const e0 = await listEntries(tx, { range: ALL, fund: "zakat", page: 1, limit: 5, offset: 0 });
      const f0 = await fundsReport(tx, ALL);
      const z0 = f0.program.find((p) => p.fund === "zakat")!;

      const t = await zakatTxn(tx, 100000);
      await pay(tx, t, 100000, "bank-9000001");
      await postVerifiedPaymentsForTransaction(tx, t);
      // hak pihak lain 12.500 (amil total) dari transaksi ini
      await tx.insert(revenueShares).values({
        transactionId: t, donationAmount: 100000, amilPercentage: "12.5", amilTotalAmount: 12500, developerAmount: 1000,
        amilNetAmount: 11500, programAmount: 87500, status: "calculated",
      } as any);
      // penyaluran zakat 60.000
      const did = createId();
      await tx.insert(disbursements).values({
        id: did, disbursementNumber: `DIS-TST-${did.slice(0, 8)}`, disbursementType: "zakat", amount: 60000, category: "zakat_to_fakir",
        bankAccountId: "bank-9000001", sourceBankId: "bank-9000001", recipientName: "Penerima", createdBy: await userId(tx), status: "paid", paidAt: new Date(),
      } as any);
      await postPaidDisbursement(tx, did);

      const e1 = await listEntries(tx, { range: ALL, fund: "zakat", page: 1, limit: 5, offset: 0 });
      expect(e1.summary.masuk - e0.summary.masuk).toBe(100000);
      expect(e1.summary.keluar - e0.summary.keluar).toBe(60000);

      const f1 = await fundsReport(tx, ALL);
      const z1 = f1.program.find((p) => p.fund === "zakat")!;
      expect(z1.masuk - z0.masuk).toBe(100000);
      expect(z1.hakPihakLain - z0.hakPihakLain).toBe(12500);
      expect(z1.disalurkan - z0.disalurkan).toBe(60000);
      expect(z1.sisa - z0.sisa).toBe(27500); // 100.000 − 12.500 − 60.000
      expect(f1.identitas.selisih).toBe(0);
    });
  });

  it("Bagi Hasil: developer sudah dibayar sebagian lewat item pencairan paid", async () => {
    await inRollback(async (tx) => {
      const r0 = await revenueShareReport(tx, ALL);
      const dev0 = r0.parties.find((p) => p.party === "developer")!;
      const t = await zakatTxn(tx, 200000);
      const [rs] = await tx.insert(revenueShares).values({
        transactionId: t, donationAmount: 200000, amilPercentage: "12.5", amilTotalAmount: 25000, developerAmount: 4000,
        amilNetAmount: 21000, programAmount: 175000, status: "calculated",
      } as any).returning();
      const did = createId();
      await tx.insert(disbursements).values({
        id: did, disbursementNumber: `DIS-TST-${did.slice(0, 8)}`, disbursementType: "revenue_share", amount: 1500, category: "revenue_share_developer",
        bankAccountId: "bank-9000001", recipientName: "Developer", createdBy: await userId(tx), status: "paid", paidAt: new Date(),
      } as any);
      await tx.insert(disbursementRevenueShareItems).values({ disbursementId: did, revenueShareId: rs.id, shareType: "developer", allocatedAmount: 1500 } as any);

      const r1 = await revenueShareReport(tx, ALL);
      const dev1 = r1.parties.find((p) => p.party === "developer")!;
      expect(dev1.hak - dev0.hak).toBe(4000);
      expect(dev1.dibayar - dev0.dibayar).toBe(1500);
      expect(dev1.sisa - dev0.sisa).toBe(2500);

      const rows = await revenueShareTransactions(tx, "developer", ALL, { page: 1, limit: 200, offset: 0 });
      const mine = rows.rows.find((r) => r.hak === 4000 && r.dibayar === 1500);
      expect(mine?.status).toBe("sebagian");
    });
  });

  it("Sirkulasi Rekening: statistik gateway menghitung semua status; sirkulasi hanya pembayaran berhasil", async () => {
    await inRollback(async (tx) => {
      const a0 = await accountsReport(tx, ALL);
      const g0 = a0.gateways.find((g) => g.gateway === "midtrans") || { percobaan: 0, berhasil: 0, tertunda: 0, gagal: 0, totalBerhasil: 0 };
      const t = await zakatTxn(tx, 50000);
      await pay(tx, t, 50000, "midtrans", "midtrans", "verified");
      await pay(tx, t, 50000, "midtrans", "midtrans", "pending");
      await pay(tx, t, 50000, "midtrans", "midtrans", "rejected");
      await postVerifiedPaymentsForTransaction(tx, t);
      const a1 = await accountsReport(tx, ALL);
      const g1 = a1.gateways.find((g) => g.gateway === "midtrans")!;
      expect(g1.percobaan - g0.percobaan).toBe(3);
      expect(g1.berhasil - g0.berhasil).toBe(1);
      expect(g1.tertunda - g0.tertunda).toBe(1);
      expect(g1.gagal - g0.gagal).toBe(1);
      expect(g1.totalBerhasil - g0.totalBerhasil).toBe(50000);
      expect(a1.totals.sirkulasi - a0.totals.sirkulasi).toBe(50000);
    });
  });
});
