// @ts-ignore
import { describe, it, expect } from "bun:test";
import { createDb } from "@bantuanku/db/client";
import { sql } from "drizzle-orm";
import { backfillCashBook, runBackfill } from "../cash-book-backfill";

/**
 * Integrasi (butuh DATABASE_URL ke DB nyata dengan migrasi 123). SEMUA penulisan dibatalkan (rollback) di akhir,
 * jadi aman dijalankan di DB dev.
 */
const db = createDb(process.env.DATABASE_URL!) as any;

class Rollback extends Error {}

describe("Buku Kas: backfill", () => {
  it("paritas dengan sumber dan idempoten (jalan 2× → 0 baris baru)", async () => {
    let first: any;
    let second: any;
    try {
      await db.transaction(async (tx: any) => {
        first = await runBackfill(tx);
        second = await runBackfill(tx);
        throw new Rollback("batalkan");
      });
    } catch (e) {
      if (!(e instanceof Rollback)) throw e;
    }
    expect(first.parity.inDifference).toBe(0);
    expect(first.parity.outDifference).toBe(0);
    expect(second.entriesInserted).toBe(0);
    expect(second.parity.inDifference).toBe(0);
  });

  it("dry-run tidak meninggalkan baris apa pun", async () => {
    const count = async () => Number((await db.execute(sql`select count(*)::int as n from cash_entries`)).rows[0].n);
    const accounts = async () => Number((await db.execute(sql`select count(*)::int as n from cash_accounts`)).rows[0].n);
    const [beforeEntries, beforeAccounts] = [await count(), await accounts()];
    const report = await backfillCashBook(db, { apply: false });
    expect(report.parity.inDifference).toBe(0);
    expect(await count()).toBe(beforeEntries);
    expect(await accounts()).toBe(beforeAccounts);
  });
});
