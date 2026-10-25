/**
 * Rekonsiliasi saldo & komisi fundraiser terhadap hak sebenarnya (revenue_shares transaksi PAID).
 *   set -a; source apps/api/.env; set +a
 *   cd apps/api && npm run fundraiser:reconcile              # dry-run (sesi read-only, tidak menulis)
 *   cd apps/api && npm run fundraiser:reconcile -- --apply   # menulis (satu transaksi DB) - HANYA setelah disetujui
 *
 * Hak per fundraiser = Σ revenue_shares.fundraiser_amount (transaksi paid).
 * Seharusnya: total_commission_earned = hak; current_balance = hak − pencairan paid (total_withdrawn);
 * fundraiser_referrals.commission_amount = hak transaksi itu (0 bila transaksi belum paid).
 * Hanya kode fundraiser & angka yang dicetak (tanpa nama/PII). URL koneksi tidak dicetak.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum di-set");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const sql = postgres(url, { max: 1, ...(apply ? {} : { connection: { default_transaction_read_only: "on" } as any }) });
const rp = (n: any) => Number(n || 0).toLocaleString("id-ID");

async function main() {
  console.log(apply ? "== REKONSILIASI FUNDRAISER: APPLY (menulis) ==" : "== REKONSILIASI FUNDRAISER: DRY-RUN (tidak menulis) ==");

  const rows = await sql`
    select f.id, f.code,
      f.total_commission_earned::bigint as kolom_hak, f.current_balance::bigint as kolom_saldo, f.total_withdrawn::bigint as kolom_ditarik,
      coalesce((select sum(rs.fundraiser_amount) from revenue_shares rs join transactions t on t.id = rs.transaction_id
                where rs.fundraiser_id = f.id and t.payment_status = 'paid'), 0)::bigint as hak,
      coalesce((select sum(d.amount) from disbursements d
                where d.recipient_type = 'fundraiser' and d.recipient_id = f.id and d.category = 'revenue_share_fundraiser' and d.status = 'paid'), 0)::bigint as dicairkan,
      coalesce((select sum(d.amount) from disbursements d
                where d.recipient_type = 'fundraiser' and d.recipient_id = f.id and d.category = 'revenue_share_fundraiser' and d.status in ('submitted','approved')), 0)::bigint as diajukan
    from fundraisers f order by f.code`;

  let bad = 0;
  console.log(apply ? "-- KONDISI SEBELUM menulis (baris di bawah = yang akan diperbaiki) --" : "-- KONDISI SAAT INI --");
  console.log("kode         | hak(paid)  | kolom_hak  | selisih_hak | saldo_kolom | saldo_seharusnya | selisih_saldo | dicairkan | diajukan");
  const fixes: { id: string; hak: number; saldo: number }[] = [];
  for (const r of rows) {
    const hak = Number(r.hak), dicairkan = Number(r.dicairkan);
    const saldo = hak - dicairkan;
    const dHak = Number(r.kolom_hak) - hak, dSaldo = Number(r.kolom_saldo) - saldo;
    if (dHak !== 0 || dSaldo !== 0) {
      bad++;
      fixes.push({ id: r.id, hak, saldo });
      console.log(`${r.code.padEnd(12)} | ${rp(hak).padStart(10)} | ${rp(r.kolom_hak).padStart(10)} | ${rp(dHak).padStart(11)} | ${rp(r.kolom_saldo).padStart(11)} | ${rp(saldo).padStart(16)} | ${rp(dSaldo).padStart(13)} | ${rp(dicairkan).padStart(9)} | ${rp(r.diajukan).padStart(8)}`);
    }
  }
  console.log(`Fundraiser dengan selisih: ${bad} dari ${rows.length}`);

  const refs = await sql`
    select fr.id, fr.status, fr.commission_amount::bigint as komisi, t.payment_status,
      coalesce(rs.fundraiser_amount, 0)::bigint as hak
    from fundraiser_referrals fr
    left join transactions t on t.id = fr.transaction_id
    left join revenue_shares rs on rs.transaction_id = fr.transaction_id
    where fr.commission_amount is distinct from (case when t.payment_status = 'paid' then coalesce(rs.fundraiser_amount, 0) else 0 end)`;
  const refTotal = refs.reduce((s, r) => s + Number(r.komisi) - (r.payment_status === "paid" ? Number(r.hak) : 0), 0);
  console.log(`Referral dengan komisi tak sesuai: ${refs.length} (kelebihan total Rp ${rp(refTotal)}; belum-paid ${refs.filter((r) => r.payment_status !== "paid").length})`);

  const [noRs] = await sql`
    select count(*)::int n, coalesce(sum(t.total_amount),0)::bigint total
    from transactions t
    where t.payment_status = 'paid' and t.referred_by_fundraiser_id is not null
      and not exists (select 1 from revenue_shares rs where rs.transaction_id = t.id)`;
  console.log(`Transaksi paid berfundraiser TANPA baris revenue_shares: ${noRs.n} (Rp ${rp(noRs.total)})`);
  const noRsRows = await sql`
    select t.product_type, t.admin_fee::bigint as admin_fee, t.total_amount::bigint as total, to_char(t.paid_at at time zone 'Asia/Jakarta','YYYY-MM-DD') as tgl
    from transactions t
    where t.payment_status = 'paid' and t.referred_by_fundraiser_id is not null
      and not exists (select 1 from revenue_shares rs where rs.transaction_id = t.id) order by t.paid_at limit 20`;
  for (const t of noRsRows) console.log(`   ${t.tgl} ${t.product_type} admin_fee Rp ${rp(t.admin_fee)} total Rp ${rp(t.total)}`);

  if (!apply) {
    console.log("\nDry-run selesai. Tidak ada yang ditulis. Jalankan dengan --apply HANYA setelah disetujui.");
  } else {
    await sql.begin(async (tx: any) => {
      for (const f of fixes) {
        await tx`update fundraisers set total_commission_earned = ${f.hak}, current_balance = ${f.saldo}, updated_at = now() where id = ${f.id}`;
      }
      await tx`
        update fundraiser_referrals fr set commission_amount = x.target, updated_at = now()
        from (
          select fr2.id, (case when t.payment_status = 'paid' then coalesce(rs.fundraiser_amount, 0) else 0 end) as target
          from fundraiser_referrals fr2
          left join transactions t on t.id = fr2.transaction_id
          left join revenue_shares rs on rs.transaction_id = fr2.transaction_id
        ) x
        where x.id = fr.id and fr.commission_amount is distinct from x.target`;
      await tx`insert into audit_logs (id, action, entity, entity_id, new_data) values (${Math.random().toString(36).slice(2) + Date.now().toString(36)}, 'fundraiser.reconcile', 'fundraisers', 'all', ${tx.json({ fundraisers: fixes.length, referrals: refs.length })})`;
    });
    console.log(`\nAPPLY selesai: ${fixes.length} fundraiser, ${refs.length} referral diperbarui. Jalankan lagi tanpa --apply: harus "selisih: 0".`);
  }
  await sql.end();
}

main().catch((e) => {
  console.error("Gagal:", e?.message || e);
  process.exit(1);
});
