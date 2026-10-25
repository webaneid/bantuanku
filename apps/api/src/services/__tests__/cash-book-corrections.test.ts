// @ts-ignore
import { describe, it, expect } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb } from "@bantuanku/db/client";
import { auditLogs, cashAccounts, cashEntries, transactionPayments, transactions, users, createId } from "@bantuanku/db";
import { CashBookError, createAdjustment, postVerifiedPaymentsForTransaction, reverseEntry } from "../cash-book";

/** Koreksi (tulis). Semua data uji dibuat di dalam transaksi yang di-rollback. */
const db = createDb(process.env.DATABASE_URL!) as any;
class Rollback extends Error {}
async function inRollback(fn: (tx: any, meta: { userId: string }) => Promise<void>) {
  try {
    await db.transaction(async (tx: any) => {
      const [u] = await tx.select({ id: users.id }).from(users).limit(1);
      await fn(tx, { userId: u.id });
      throw new Rollback("batalkan");
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

async function oneEntry(tx: any) {
  const id = createId();
  await tx.insert(transactions).values({
    id, transactionNumber: `TST-${id.slice(0, 8)}`, productType: "campaign", productId: createId(), productName: "Uji",
    unitPrice: 10000, subtotal: 10000, totalAmount: 10000, donorName: "Penguji", category: "campaign_donation", paymentMethodId: "flip", paymentStatus: "paid", typeSpecificData: { pillar: "sedekah" },
  } as any);
  const pid = createId();
  await tx.insert(transactionPayments).values({ id: pid, paymentNumber: `PAY-TST-${pid.slice(0, 8)}`, transactionId: id, amount: 10000, paymentMethod: "bank-9000009", status: "verified", verifiedAt: new Date() } as any);
  await postVerifiedPaymentsForTransaction(tx, id);
  const [entry] = await tx.select().from(cashEntries).where(eq(cashEntries.transactionId, id));
  return entry;
}

describe("Buku Kas: koreksi", () => {
  it("membalik entri: lawan arah, jumlah sama, bertaut, tercatat audit; tidak bisa dibalik dua kali", async () => {
    await inRollback(async (tx, meta) => {
      const orig = await oneEntry(tx);
      const rev = await reverseEntry(tx, orig.id, "salah catat uji", meta);
      expect(rev).toMatchObject({ direction: "out", amount: 10000, component: "koreksi", reversesEntryId: orig.id, fund: orig.fund, cashAccountId: orig.cashAccountId });
      const audits = await tx.select().from(auditLogs).where(eq(auditLogs.entityId, rev.id));
      expect(audits.length).toBe(1);
      expect(audits[0].action).toBe("cashbook.reverse");
      await expect(reverseEntry(tx, orig.id, "coba lagi uji", meta)).rejects.toThrow("sudah dibalik");
      await expect(reverseEntry(tx, rev.id, "balik pembalik", meta)).rejects.toThrow("tidak dapat dibalik");
    });
  });

  it("catatan wajib dan entri harus ada", async () => {
    await inRollback(async (tx, meta) => {
      const orig = await oneEntry(tx);
      await expect(reverseEntry(tx, orig.id, "xx", meta)).rejects.toThrow(CashBookError);
      await expect(reverseEntry(tx, "tidak-ada", "catatan cukup panjang", meta)).rejects.toThrow("tidak ditemukan");
    });
  });

  it("penyesuaian manual: tervalidasi dan tercatat", async () => {
    await inRollback(async (tx, meta) => {
      const orig = await oneEntry(tx);
      const created = await createAdjustment(tx, { direction: "in", amount: 25000, fund: "campaign", fundDetail: "sedekah", accountId: orig.cashAccountId, note: "setoran tunai belum tercatat" }, meta);
      expect(created).toMatchObject({ direction: "in", amount: 25000, component: "koreksi", refType: "adjustment" });
      const audits = await tx.select().from(auditLogs).where(eq(auditLogs.entityId, created.id));
      expect(audits[0].action).toBe("cashbook.adjustment");
      await expect(createAdjustment(tx, { direction: "in", amount: -5, fund: "campaign", accountId: orig.cashAccountId, note: "jumlah negatif" }, meta)).rejects.toThrow("bilangan bulat positif");
      await expect(createAdjustment(tx, { direction: "in", amount: 10, fund: "ngawur", accountId: orig.cashAccountId, note: "dana tidak valid" }, meta)).rejects.toThrow("Dana tidak valid");
      await expect(createAdjustment(tx, { direction: "in", amount: 10, fund: "zakat", accountId: "tidak-ada", note: "akun tidak ada" }, meta)).rejects.toThrow("Akun kas tidak ditemukan");
    });
  });
});
