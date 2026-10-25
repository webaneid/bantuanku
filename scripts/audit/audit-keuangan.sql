-- ============================================================================
-- AUDIT DATA KEUANGAN (READ-ONLY) — persiapan ADR-0016 (Buku Kas & Hak Bagi Hasil)
-- Hanya SELECT. Tidak mengubah data. Tidak mencetak nama/email/telepon donatur.
-- Jalankan lewat scripts/audit/audit-keuangan.sh (memaksa transaksi READ ONLY).
-- Semua nominal dalam rupiah. "verified" = transaction_payments.status = 'verified'.
-- ============================================================================
\set ON_ERROR_STOP off
\pset pager off
\pset null '-'
\timing off

\echo
\echo '######## 0. IDENTITAS AUDIT'
select now() at time zone 'Asia/Jakarta' as waktu_wib, current_database() as database, current_setting('TimeZone') as tz_db,
       current_setting('default_transaction_read_only') as sesi_read_only,
       (select data_type from information_schema.columns where table_name='transactions' and column_name='paid_at') as tipe_paid_at;

\echo
\echo '######## 1. INVENTARIS TABEL UANG (jumlah baris)'
select 'transactions' tabel, count(*) baris from transactions
union all select 'transaction_payments', count(*) from transaction_payments
union all select 'disbursements', count(*) from disbursements
union all select 'revenue_shares', count(*) from revenue_shares
union all select 'disbursement_revenue_share_items', count(*) from disbursement_revenue_share_items
union all select 'bank_accounts (tabel)', count(*) from bank_accounts
union all select 'ledger_entries', count(*) from ledger_entries
union all select 'ledger_lines', count(*) from ledger_lines
union all select 'chart_of_accounts', count(*) from chart_of_accounts
union all select 'fundraisers', count(*) from fundraisers
union all select 'mitra', count(*) from mitra
order by 1;

\echo
\echo '######## 2. TRANSAKSI per jenis x status (nominal = total_amount; paid_amount = tercatat di transaksi)'
select product_type, payment_status, count(*) n, sum(total_amount) total_amount, sum(coalesce(unique_code,0)) kode_unik, sum(coalesce(paid_amount,0)) paid_amount
from transactions group by 1,2 order by 1,2;

\echo
\echo '######## 3. SUMBER DANA yang dapat diturunkan (jenis produk + pilar/kategori), hanya transaksi paid'
select t.product_type,
       coalesce(t.type_specific_data->>'pillar', '(tanpa pilar)') as pilar,
       t.category,
       coalesce(t.type_specific_data->>'payment_type','-') as payment_type,
       count(*) n, sum(t.total_amount) total_amount
from transactions t where t.payment_status='paid'
group by 1,2,3,4 order by 1,2,3,4;

\echo
\echo '######## 4. KEBENARAN UANG MASUK: transaksi paid vs pembayaran terverifikasi'
\echo '-- 4a. ringkasan: kelompok kecocokan (tagihan = total_amount + kode_unik)'
with v as (
  select t.id, t.total_amount, coalesce(t.unique_code,0) uc, coalesce(t.paid_amount,0) paid_amount,
         coalesce((select sum(p.amount) from transaction_payments p where p.transaction_id=t.id and p.status='verified'),0) verified_sum
  from transactions t where t.payment_status='paid'
)
select case
  when verified_sum = 0 then 'A. paid TANPA pembayaran verified'
  when verified_sum = total_amount then 'B. verified = total (tanpa kode unik)'
  when verified_sum = total_amount + uc then 'C. verified = total + kode unik'
  when verified_sum < total_amount then 'D. verified KURANG dari total'
  else 'E. verified LEBIH dari total+kode unik (ganda/lebih bayar)' end as kelompok,
  count(*) n, sum(total_amount) sum_total, sum(uc) sum_kode_unik, sum(paid_amount) sum_paid_amount, sum(verified_sum) sum_verified
from v group by 1 order by 1;

\echo '-- 4b. daftar transaksi paid yang TIDAK cocok (maks 40; terbesar selisih dulu)'
with v as (
  select t.transaction_number, t.product_type, t.payment_method_id, t.total_amount, coalesce(t.unique_code,0) uc, coalesce(t.paid_amount,0) paid_amount,
         coalesce((select sum(p.amount) from transaction_payments p where p.transaction_id=t.id and p.status='verified'),0) verified_sum,
         (select count(*) from transaction_payments p where p.transaction_id=t.id and p.status='verified') n_verified
  from transactions t where t.payment_status='paid'
)
select transaction_number, product_type, payment_method_id, total_amount, uc kode_unik, paid_amount, verified_sum, n_verified,
       verified_sum - (total_amount + uc) as selisih_vs_tagihan
from v where verified_sum <> total_amount + uc
order by abs(verified_sum - (total_amount + uc)) desc limit 40;

\echo '-- 4c. transaksi BUKAN paid yang sudah punya pembayaran verified (uang masuk yang tidak terbaca laporan)'
select t.payment_status, t.product_type, count(distinct t.id) n_transaksi, sum(p.amount) verified_sum
from transactions t join transaction_payments p on p.transaction_id=t.id and p.status='verified'
where t.payment_status <> 'paid' group by 1,2 order by 1,2;

\echo '-- 4d. dugaan pembayaran GANDA: >1 pembayaran verified pada satu transaksi dengan nominal sama / external_id sama'
select t.transaction_number, p.amount, count(*) kali, string_agg(coalesce(p.gateway_code,p.payment_method),',') metode
from transaction_payments p join transactions t on t.id=p.transaction_id
where p.status='verified' group by t.transaction_number, p.amount having count(*) > 1 order by kali desc, amount desc limit 30;
select 'external_id sama pada >1 pembayaran verified' catatan, count(*) n
from (select external_id from transaction_payments where status='verified' and external_id is not null group by external_id having count(*)>1) x;

\echo '-- 4e. transaksi paid tanpa paid_at / paid_amount=0 / pembayaran verified tanpa verified_at'
select (select count(*) from transactions where payment_status='paid' and paid_at is null) paid_tanpa_paid_at,
       (select count(*) from transactions where payment_status='paid' and coalesce(paid_amount,0)=0) paid_dengan_paid_amount_0,
       (select count(*) from transaction_payments where status='verified' and verified_at is null) verified_tanpa_verified_at;

\echo
\echo '######## 5. METODE & GATEWAY (pembayaran verified)'
select coalesce(p.gateway_code,'(manual/non-gateway)') as gateway,
       p.payment_method, count(*) n, sum(p.amount) jumlah
from transaction_payments p where p.status='verified' group by 1,2 order by 1,2;

\echo '-- 5b. KODE UNIK per metode: apakah benar-benar diterima? (transaksi paid)'
with v as (
  select t.id, coalesce(p0.gateway_code,'(manual/non-gateway)') gateway, t.payment_method_id, t.total_amount, coalesce(t.unique_code,0) uc,
         coalesce((select sum(p.amount) from transaction_payments p where p.transaction_id=t.id and p.status='verified'),0) vs
  from transactions t
  left join lateral (select gateway_code from transaction_payments p where p.transaction_id=t.id and p.status='verified' order by p.created_at limit 1) p0 on true
  where t.payment_status='paid' and coalesce(t.unique_code,0) > 0
)
select gateway, payment_method_id, count(*) n, sum(uc) sum_kode_unik,
       count(*) filter (where vs >= total_amount + uc) as kode_unik_diterima,
       count(*) filter (where vs < total_amount + uc) as kode_unik_TIDAK_diterima,
       sum(uc) filter (where vs < total_amount + uc) as nominal_kode_unik_TIDAK_diterima
from v group by 1,2 order by 1,2;

\echo
\echo '######## 6. REKENING: siapa yang menyimpan uang?'
\echo '-- 6a. rekening menurut settings (payment_bank_accounts / payment_qris_accounts) — jumlah elemen & id'
select key, case when value ~ '^\s*\[' then json_array_length(value::json) else null end as jumlah_elemen, left(value, 0) as _
from settings where key in ('payment_bank_accounts','payment_qris_accounts');
select 'id rekening di payment_bank_accounts' sumber, e->>'id' id, e->>'bankName' nama, e->>'coaCode' coa, e->'programs' programs
from settings s, json_array_elements(case when s.value ~ '^\s*\[' then s.value::json else '[]'::json end) e where s.key='payment_bank_accounts';
select 'id akun QRIS' sumber, e->>'id' id, e->>'name' nama
from settings s, json_array_elements(case when s.value ~ '^\s*\[' then s.value::json else '[]'::json end) e where s.key='payment_qris_accounts';

\echo '-- 6b. metode bayar pada transaksi paid: dikenal di settings atau tidak?'
with known as (
  select e->>'id' id from settings s, json_array_elements(case when s.value ~ '^\s*\[' then s.value::json else '[]'::json end) e
  where s.key in ('payment_bank_accounts','payment_qris_accounts')
)
select coalesce(t.payment_method_id,'(kosong)') payment_method_id,
       case when t.payment_method_id is null then 'KOSONG'
            when t.payment_method_id in (select id from known) then 'rekening/QRIS di settings'
            when t.payment_method_id in (select code from payment_gateways) then 'gateway'
            else 'TAK DIKENAL' end as jenis,
       count(*) n, sum(t.total_amount) total
from transactions t where t.payment_status='paid' group by 1,2 order by n desc;

\echo '-- 6c. keterhubungan rekening: transactions.bank_account_id terisi? tabel bank_accounts terisi? (saldo tabel dipakai updateBankBalance)'
select (select count(*) from transactions where bank_account_id is not null) txn_dengan_bank_account_id,
       (select count(*) from transactions) total_txn,
       (select count(*) from bank_accounts) baris_bank_accounts,
       (select coalesce(sum(balance),0) from bank_accounts) total_saldo_tabel_bank_accounts,
       (select count(*) from disbursements where status='paid' and source_bank_id is not null) disb_paid_dgn_sumber_rekening,
       (select count(*) from disbursements where status='paid') disb_paid;

\echo
\echo '######## 7. UANG KELUAR (disbursements)'
select status, disbursement_type, category, recipient_type, count(*) n, sum(amount) amount, sum(coalesce(transferred_amount,0)) transferred, sum(coalesce(additional_fees,0)) biaya_tambahan
from disbursements group by 1,2,3,4 order by 1,2,3,4;
\echo '-- 7b. disbursement paid yang bermasalah'
select count(*) filter (where paid_at is null) paid_tanpa_paid_at,
       count(*) filter (where source_bank_id is null and bank_account_id is null) tanpa_rekening_sumber,
       count(*) filter (where payment_proof is null and transfer_proof_url is null) tanpa_bukti,
       count(*) filter (where transferred_amount is not null and transferred_amount <> amount) transferred_beda_dari_amount,
       count(*) filter (where category is null or category = '') tanpa_kategori
from disbursements where status='paid';
\echo '-- 7c. disbursement paid per rekening sumber'
select coalesce(source_bank_id, bank_account_id, '(kosong)') rekening, count(*) n, sum(amount) amount
from disbursements where status='paid' group by 1 order by 1;

\echo
\echo '######## 8. BAGI HASIL (revenue_shares)'
select status, count(*) n, sum(donation_amount) basis, sum(amil_total_amount) amil_total, sum(amil_net_amount) amil_net,
       sum(developer_amount) developer, sum(fundraiser_amount) fundraiser, sum(mitra_amount) mitra, sum(program_amount) program
from revenue_shares group by 1 order by 1;
\echo '-- 8b. kewajiban bagi hasil vs yang sudah ditransfer (lewat disbursement_revenue_share_items pada disbursement paid)'
with hak as (
  select 'developer' pihak, coalesce(sum(developer_amount),0) hak from revenue_shares
  union all select 'fundraiser', coalesce(sum(fundraiser_amount),0) from revenue_shares
  union all select 'mitra', coalesce(sum(mitra_amount),0) from revenue_shares
), bayar as (
  select i.share_type pihak, sum(i.allocated_amount) dibayar
  from disbursement_revenue_share_items i join disbursements d on d.id=i.disbursement_id and d.status='paid' group by 1
)
select h.pihak, h.hak, coalesce(b.dibayar,0) sudah_dibayar_via_items, h.hak - coalesce(b.dibayar,0) selisih_belum_dibayar
from hak h left join bayar b using (pihak) order by 1;
\echo '-- 8c. disbursement bertipe revenue_share (paid) — nominal vs item penghubung'
select d.category, count(*) n, sum(d.amount) amount,
       count(*) filter (where not exists (select 1 from disbursement_revenue_share_items i where i.disbursement_id=d.id)) tanpa_item_penghubung
from disbursements d where d.disbursement_type='revenue_share' and d.status='paid' group by 1 order by 1;
\echo '-- 8d. transaksi paid TANPA revenue_share (catatan: wakaf/fidyah dan admin fee 0 memang dilewati)'
select t.product_type, coalesce(t.type_specific_data->>'pillar','-') pilar, count(*) n, sum(t.total_amount) total
from transactions t left join revenue_shares r on r.transaction_id=t.id
where t.payment_status='paid' and r.id is null group by 1,2 order by 1,2;
\echo '-- 8e. revenue_share milik transaksi yang BUKAN paid'
select t.payment_status, count(*) n, sum(r.amil_total_amount) amil from revenue_shares r join transactions t on t.id=r.transaction_id where t.payment_status <> 'paid' group by 1;
\echo '-- 8f. saldo fundraiser & mitra di tabel vs perhitungan dari bagi hasil'
select 'fundraiser' pihak, coalesce(sum(current_balance),0) saldo_tabel, coalesce(sum(total_withdrawn),0) total_withdrawn,
       (select coalesce(sum(fundraiser_amount),0) from revenue_shares) hak_dari_revenue_shares from fundraisers
union all
select 'mitra', coalesce(sum(current_balance),0), coalesce(sum(total_withdrawn),0),
       (select coalesce(sum(mitra_amount),0) from revenue_shares) from mitra;

\echo
\echo '######## 9. JEJAK LEGACY (uang yang mungkin TIDAK ada di transactions)'
select to_regclass('qurban_payments') is not null as ada_qurban_payments,
       to_regclass('qurban_orders') is not null as ada_qurban_orders,
       to_regclass('qurban_savings_transactions') is not null as ada_qurban_savings_tx,
       to_regclass('zakat_distributions') is not null as ada_zakat_distributions,
       to_regclass('ledger') is not null as ada_ledger_legacy \gset
\if :ada_qurban_payments
  \echo '-- qurban_payments (status, jumlah, nominal)'
  select status, count(*) n, coalesce(sum(amount),0) amount from qurban_payments group by 1 order by 1;
\endif
\if :ada_qurban_orders
  \echo '-- qurban_orders (payment_status)'
  select payment_status, count(*) n, coalesce(sum(total_amount),0) total, coalesce(sum(paid_amount),0) paid from qurban_orders group by 1 order by 1;
\endif
\if :ada_qurban_savings_tx
  \echo '-- qurban_savings_transactions (status)'
  select status, count(*) n, coalesce(sum(amount),0) amount from qurban_savings_transactions group by 1 order by 1;
\endif
\if :ada_zakat_distributions
  \echo '-- zakat_distributions (status)'
  select status, count(*) n, coalesce(sum(amount),0) amount from zakat_distributions group by 1 order by 1;
\endif
\if :ada_ledger_legacy
  \echo '-- tabel ledger legacy'
  select count(*) baris from ledger;
\endif

\echo
\echo '######## 10. PERBANDINGAN DEFINISI "UANG MASUK" (semua waktu, transaksi paid)'
select
  (select coalesce(sum(total_amount),0) from transactions where payment_status='paid') as a_sum_total_amount,
  (select coalesce(sum(total_amount + coalesce(unique_code,0)),0) from transactions where payment_status='paid') as b_total_plus_kode_unik,
  (select coalesce(sum(paid_amount),0) from transactions where payment_status='paid') as c_sum_paid_amount,
  (select coalesce(sum(p.amount),0) from transaction_payments p join transactions t on t.id=p.transaction_id where p.status='verified' and t.payment_status='paid') as d_verified_pada_txn_paid,
  (select coalesce(sum(amount),0) from transaction_payments where status='verified') as e_semua_verified,
  (select coalesce(sum(amount),0) from disbursements where status='paid') as f_uang_keluar_paid;

\echo
\echo '######## 11. HYGIENE KATEGORI'
select category, count(*) n from transactions group by 1 order by 2 desc;
select 'transaksi paid dengan category kosong' catatan, count(*) n from transactions where payment_status='paid' and (category is null or category='');

\echo
\echo '######## SELESAI — kirim seluruh output ini (tanpa URL koneksi) untuk dinilai.'
