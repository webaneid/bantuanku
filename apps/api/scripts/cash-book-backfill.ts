/**
 * Backfill Buku Kas. Default DRY-RUN (semua penulisan dibatalkan). Gunakan --apply untuk menulis.
 *   set -a; source apps/api/.env; set +a
 *   cd apps/api && npm run cashbook:backfill --            # dry-run
 *   cd apps/api && npm run cashbook:backfill -- --apply    # tulis ke DB
 * URL koneksi tidak dicetak.
 */
import { createDb } from "@bantuanku/db/client";
import { backfillCashBook } from "../src/services/cash-book-backfill";

const apply = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set (source file .env dulu)");
  process.exit(1);
}

const db = createDb(url);
const rupiah = (n: number) => n.toLocaleString("id-ID");

backfillCashBook(db as any, { apply })
  .then((r) => {
    console.log(apply ? "== BACKFILL (DITULIS) ==" : "== BACKFILL DRY-RUN (tidak ada yang ditulis) ==");
    console.log(`Pembayaran verified: ${r.payments.verified} (diposting ${r.payments.posted}; dilewati ${JSON.stringify(r.payments.skipped)})`);
    console.log(`Paid tanpa pembayaran (kelompok A): ${r.paidWithoutPayment.candidates} kandidat, diposting ${r.paidWithoutPayment.posted} (Rp ${rupiah(r.paidWithoutPayment.amount)}); dilewati ${JSON.stringify(r.paidWithoutPayment.skipped)}`);
    console.log(`Pencairan paid:      ${r.disbursements.paid} (diposting ${r.disbursements.posted}; dilewati ${JSON.stringify(r.disbursements.skipped)})`);
    console.log(`Baris buku kas baru: ${r.entriesInserted}`);
    console.log("-- per komponen"); for (const [k, v] of Object.entries(r.byComponent)) console.log(`   ${k.padEnd(22)} ${String(v.rows).padStart(4)} baris  Rp ${rupiah(v.amount)}`);
    console.log("-- per dana (masuk / keluar)"); for (const [k, v] of Object.entries(r.byFund)) console.log(`   ${k.padEnd(14)} masuk Rp ${rupiah(v.in)}  keluar Rp ${rupiah(v.out)}`);
    console.log("-- per akun kas (masuk / keluar)"); for (const [k, v] of Object.entries(r.byAccount)) console.log(`   ${k.padEnd(26)} masuk Rp ${rupiah(v.in)}  keluar Rp ${rupiah(v.out)}`);
    const p = r.parity;
    console.log("-- paritas");
    console.log(`   masuk : sumber Rp ${rupiah(p.verifiedPaymentsTotal)} | buku kas Rp ${rupiah(p.cashBookIn)} | selisih ${p.inDifference}`);
    console.log(`   keluar: sumber Rp ${rupiah(p.paidDisbursementsTotal)} | buku kas Rp ${rupiah(p.cashBookOut)} | selisih ${p.outDifference}`);
    process.exit(p.inDifference === 0 && p.outDifference === 0 ? 0 : 2);
  })
  .catch((e) => {
    console.error("Backfill gagal:", e?.message || e);
    process.exit(1);
  });
