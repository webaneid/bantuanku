/**
 * Pemeriksa rekonsiliasi Buku Kas (READ-ONLY): apakah semua uang yang SAH sudah tercatat?
 *   set -a; source apps/api/.env; set +a
 *   cd apps/api && npm run cashbook:check
 * Keluar 0 bila lengkap; 2 bila ada pembayaran verified / pencairan paid yang belum masuk buku kas.
 * Sesi dipaksa read-only. URL koneksi tidak dicetak.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}
const sql = postgres(url, { max: 1, connection: { default_transaction_read_only: "on" } as any });
const rp = (n: any) => Number(n || 0).toLocaleString("id-ID");

async function main() {
  const [a] = await sql`
    select count(*)::int n, coalesce(sum(p.amount),0)::bigint total
    from transaction_payments p
    where p.status = 'verified'
      and not exists (select 1 from cash_entries e where e.ref_type = 'transaction_payment' and e.ref_id = p.id)`;
  const [b] = await sql`
    select count(*)::int n, coalesce(sum(coalesce(d.transferred_amount, d.amount) + coalesce(d.additional_fees,0)),0)::bigint total
    from disbursements d
    where d.status = 'paid'
      and not exists (select 1 from cash_entries e where e.ref_type = 'disbursement' and e.ref_id = d.id)`;
  const [c] = await sql`
    select count(*)::int n, coalesce(sum(t.total_amount),0)::bigint total
    from transactions t
    where t.payment_status = 'paid'
      and t.total_amount > 0
      and coalesce((t.type_specific_data ->> 'is_non_cash')::boolean, false) = false
      and not exists (select 1 from cash_entries e where e.transaction_id = t.id and e.direction = 'in' and e.ref_type in ('transaction_payment','transaction_paid'))`;
  const [g] = await sql`select count(*)::int n, coalesce(sum(amount),0)::bigint total from cash_entries where ref_type = 'transaction_paid'`;
  const [d] = await sql`
    select count(*)::int n from cash_entries e
    where e.ref_type = 'transaction_payment' and not exists (select 1 from transaction_payments p where p.id = e.ref_id and p.status = 'verified')`;
  const [e] = await sql`select count(*)::int n, coalesce(sum(amount),0)::bigint total from cash_entries where component = 'kelebihan'`;
  const [f] = await sql`select count(*)::int n from cash_entries x join cash_accounts a on a.id = x.cash_account_id where a.kind = 'unmapped'`;

  console.log("== REKONSILIASI BUKU KAS ==");
  console.log(`Pembayaran verified BELUM di buku kas : ${a.n} (Rp ${rp(a.total)})   ${a.n ? "<-- jalankan backfill / periksa hook" : "OK"}`);
  console.log(`Pencairan paid BELUM di buku kas      : ${b.n} (Rp ${rp(b.total)})   ${b.n ? "<-- jalankan backfill / periksa hook" : "OK"}`);
  console.log(`Baris buku kas tanpa pembayaran verified: ${d.n}   ${d.n ? "<-- pembayaran dibatalkan? beri entri pembalik" : "OK"}`);
  console.log(`Transaksi PAID tanpa baris buku kas apa pun: ${c.n} (Rp ${rp(c.total)})   ${c.n ? "<-- jalankan backfill / periksa hook" : "OK"}`);
  console.log(`[info] Pemasukan sintetis (paid tanpa pembayaran verified, D3): ${g.n} baris (Rp ${rp(g.total)})`);
  console.log(`[info] Komponen kelebihan: ${e.n} baris (Rp ${rp(e.total)}); baris pada akun 'unmapped': ${f.n}`);
  await sql.end();
  process.exit(a.n === 0 && b.n === 0 && c.n === 0 ? 0 : 2);
}
main().catch(async (err) => {
  console.error("Pemeriksa gagal:", err?.message || err);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});
