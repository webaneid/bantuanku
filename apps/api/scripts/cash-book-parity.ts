/**
 * Paritas Buku Kas vs laporan lama (READ-ONLY). Menjelaskan SELURUH selisih sebagai identitas yang harus tepat.
 *   set -a; source apps/api/.env; set +a; cd apps/api && npm run cashbook:parity -- [YYYY-MM-DD YYYY-MM-DD]
 * Tanpa argumen = seluruh riwayat. Keluar 0 bila identitas cocok; 2 bila tidak. Sesi read-only; URL tidak dicetak.
 */
import postgres from "postgres";
import { endOfDayWIB, startOfDayWIB } from "../src/utils/timezone";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}
const [startArg, endArg] = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const from = startArg ? startOfDayWIB(startArg) : new Date("1970-01-01T00:00:00Z");
const to = endArg ? endOfDayWIB(endArg) : new Date("2999-12-31T23:59:59Z");
const sql = postgres(url, { max: 1, connection: { default_transaction_read_only: "on" } as any });
const rp = (v: any) => Number(v || 0).toLocaleString("id-ID").padStart(16);
const val = (r: any, k: string) => Number(r[0]?.[k] || 0);

async function main() {
  // Laporan lama: tanggal paid_at (dashboard) / COALESCE(paid_at, created_at) (financial-statement)
  const dash = await sql`select coalesce(sum(total_amount),0)::bigint a, coalesce(sum(unique_code),0)::bigint uc, count(*)::int n
    from transactions where payment_status='paid' and coalesce(paid_at, created_at) between ${from} and ${to}`;
  const nonCash = await sql`select coalesce(sum(total_amount),0)::bigint a from transactions
    where payment_status='paid' and coalesce(paid_at, created_at) between ${from} and ${to}
      and (coalesce((type_specific_data->>'is_non_cash')::boolean,false) or total_amount <= 0)`;
  const comp = await sql`select component, ref_type, coalesce(sum(amount),0)::bigint a from cash_entries
    where direction='in' and entry_date between ${from} and ${to} group by 1,2`;
  const sumC = (c: string, rt?: string) => comp.filter((r: any) => r.component === c && (!rt || r.ref_type === rt)).reduce((s: number, r: any) => s + Number(r.a), 0);
  const inTotal = comp.reduce((s: number, r: any) => s + Number(r.a), 0);
  const pokokPaid = await sql`select coalesce(sum(e.amount),0)::bigint a from cash_entries e join transactions t on t.id=e.transaction_id
    where e.direction='in' and e.component='pokok' and t.payment_status='paid' and e.entry_date between ${from} and ${to}`;
  const out = await sql`select coalesce(sum(amount),0)::bigint a from disbursements where status='paid' and coalesce(paid_at, created_at) between ${from} and ${to}`;
  const outFee = await sql`select coalesce(sum(coalesce(additional_fees,0)),0)::bigint a, coalesce(sum(coalesce(transferred_amount, amount) - amount),0)::bigint d
    from disbursements where status='paid' and coalesce(paid_at, created_at) between ${from} and ${to}`;
  const bookOut = await sql`select coalesce(sum(amount),0)::bigint a from cash_entries where direction='out' and entry_date between ${from} and ${to}`;

  const A = val(dash, "a"), UC = val(dash, "uc"), NC = val(nonCash, "a");
  const pokok = sumC("pokok"), kode = sumC("kode_unik"), lebih = sumC("kelebihan");
  const pokokNonPaid = pokok - val(pokokPaid, "a");
  const kurang = val(pokokPaid, "a") - (A - NC);

  console.log(`== PARITAS BUKU KAS vs LAPORAN LAMA (${startArg || "awal"} s/d ${endArg || "kini"}) ==`);
  console.log("-- Uang MASUK");
  console.log(`${rp(A)}  laporan lama /dashboard: Σ total_amount transaksi paid (${val(dash, "n")} transaksi)`);
  console.log(`${rp(A + UC)}  laporan lama /financial-statement: + seluruh kode unik tercatat (${rp(UC)})`);
  console.log(`${rp(inTotal)}  BUKU KAS: Σ masuk = pokok + kode unik diterima + kelebihan`);
  console.log("   penjelasan selisih terhadap /dashboard:");
  console.log(`${rp(-NC)}  transaksi non-tunai/nol dikecualikan (konversi tabungan)`);
  console.log(`${rp(kurang)}  paid tetapi pembayaran terverifikasi KURANG dari total (negatif = kurang bayar)`);
  console.log(`${rp(pokokNonPaid)}  pokok dari transaksi BELUM paid (cicilan/partial/processing)`);
  console.log(`${rp(kode)}  kode unik yang benar-benar diterima (laporan lama: ${rp(UC)} → tidak diterima ${rp(UC - kode)})`);
  console.log(`${rp(lebih)}  kelebihan (pembayaran ganda / lebih bayar)`);
  const explained = A - NC + kurang + pokokNonPaid + kode + lebih;
  const inOk = explained === inTotal;
  console.log(`${rp(explained)}  jumlah penjelasan  ${inOk ? "== buku kas ✓" : "!= buku kas ✗ (selisih " + (inTotal - explained) + ")"}`);
  console.log(`   [info] dari total masuk, pemasukan sintetis (paid tanpa pembayaran, D3): ${rp(sumC("pokok", "transaction_paid"))}`);

  console.log("-- Uang KELUAR");
  console.log(`${rp(val(out, "a"))}  laporan lama: Σ disbursements paid (amount)`);
  console.log(`${rp(val(outFee, "a"))}  + biaya transfer tambahan; ${rp(val(outFee, "d"))} selisih transferred_amount − amount`);
  console.log(`${rp(val(bookOut, "a"))}  BUKU KAS: Σ keluar`);
  const outExplained = val(out, "a") + val(outFee, "a") + val(outFee, "d");
  const outOk = outExplained === val(bookOut, "a");
  console.log(`${rp(outExplained)}  jumlah penjelasan  ${outOk ? "== buku kas ✓" : "!= buku kas ✗ (selisih " + (val(bookOut, "a") - outExplained) + ")"}`);
  await sql.end();
  process.exit(inOk && outOk ? 0 : 2);
}
main().catch(async (e) => {
  console.error("Paritas gagal:", e?.message || e);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});
