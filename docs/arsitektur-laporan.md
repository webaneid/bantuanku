# Arsitektur Laporan

## Ringkasan

Laporan adalah API agregasi untuk dashboard keuangan, performa program, liability, cash flow, zakat, qurban, revenue sharing, mitra, fundraiser, rekening, dan konsistensi data. Sumber utamanya adalah tabel operasional: `transactions`, `disbursements`, `revenue_shares`, `campaigns`, `mitra`, `fundraisers`, `donatur`, zakat, qurban, dan COA.

Dokumen ini tidak menggantikan akuntansi double-entry. Detail COA dan jurnal ada di `arsitektur-akuntansi.md`.

Statistik admin khusus donatur dan mustahiq didokumentasikan terpisah di `arsitektur-statistik.md`.

## Implementasi Terkait

| Area | File |
|------|------|
| Reports API | `apps/api/src/routes/admin/reports.ts` |
| Dashboard API | `apps/api/src/routes/admin/dashboard.ts` |
| Analytics API | `apps/api/src/routes/admin/analytics.ts` |
| Statistics API | `apps/api/src/routes/admin/statistics.ts` |
| Export API | `apps/api/src/routes/admin/export.ts` |
| Public stats | `apps/api/src/routes/public-stats.ts` |
| Admin UI reports | `apps/admin/src/app/dashboard/reports/**` |
| Report components | `apps/admin/src/components/reports/**` |

## Endpoint Reports

Base path: `/admin/reports`.

| Path | Role | Fungsi |
|------|------|--------|
| `/dashboard` | `super_admin`, `admin_finance` | Ringkasan income, expense, balance, donor, campaign. |
| `/donations-summary` | `super_admin`, `admin_finance` | Summary donasi by campaign/by date. |
| `/campaigns-performance` | `super_admin`, `admin_campaign` | Performa campaign by category/pillar. |
| `/financial-statement` | `super_admin`, `admin_finance` | Statement berbasis transaksi paid dan disbursement paid. |
| `/ledger-summary` | `super_admin`, `admin_finance` | Ringkasan ledger/keuangan. |
| `/donor-analytics` | `super_admin`, `admin_finance` | Analitik donatur. |
| `/liability-balance` | `super_admin`, `admin_finance` | Saldo titipan/liability. |
| `/account-balance/:code` | `super_admin`, `admin_finance` | Saldo COA berdasarkan kode. |
| `/cash-flow` | `super_admin`, `admin_finance` | Cash flow. |
| `/cash-flow-by-category` | `super_admin`, `admin_finance` | Cash flow per kategori. |
| `/zakat` | `super_admin`, `admin_finance` | Laporan zakat. |
| `/qurban` | `super_admin`, `admin_finance` | Laporan qurban. |
| `/qurban-execution` | `super_admin`, `admin_finance` | Laporan pelaksanaan qurban. |
| `/campaign` | `super_admin`, `admin_finance` | Laporan campaign. |
| `/unique-codes` | `super_admin`, `admin_finance` | Laporan kode unik transaksi. |
| `/revenue-sharing` | `super_admin`, `admin_finance` | Laporan revenue share. |
| `/program-summary` | `super_admin`, `admin_finance`, `admin_campaign` | Summary program. |
| `/program-detail` | `super_admin`, `admin_finance`, `admin_campaign` | Detail program. |
| `/mitra-summary` | `super_admin`, `admin_finance` | Summary mitra. |
| `/mitra-detail` | `super_admin`, `admin_finance` | Detail mitra. |
| `/fundraiser-summary` | `super_admin`, `admin_finance` | Summary fundraiser. |
| `/fundraiser-detail` | `super_admin`, `admin_finance` | Detail fundraiser. |
| `/rekening-summary` | `super_admin`, `admin_finance` | Summary rekening. |
| `/rekening-detail` | `super_admin`, `admin_finance` | Detail rekening. |
| `/donor-detail` | `super_admin`, `admin_finance` | Detail donatur. |
| `/consistency-check` | `super_admin`, `admin_finance` | Cek konsistensi kategori/data. |
| `/consistency-check/details` | `super_admin`, `admin_finance` | Detail inkonsistensi. |

## Dokumen Terkait

| Dokumen | Keterkaitan |
|---------|-------------|
| `arsitektur-revenue-share.md` | Detail skema dan kalkulasi revenue share (amil, developer, fundraiser, mitra) |
| `arsitektur-transaksi.md` | Sumber utama income — semua transaksi paid |
| `arsitektur-disbursement.md` | Sumber utama expense — semua disbursement paid |
| `arsitektur-akuntansi.md` | COA dan double-entry journal |
| `arsitektur-statistik.md` | Statistik donatur dan mustahiq (terpisah dari laporan keuangan) |

## Sumber Data Utama

| Data | Sumber |
|------|--------|
| Income | `transactions` dengan `paymentStatus = "paid"`. |
| Expense | `disbursements` dengan `status = "paid"`. |
| Revenue share | `revenue_shares` dan `RevenueShareService`. Lihat `arsitektur-revenue-share.md`. |
| Campaign | `campaigns` dan transaksi `productType = "campaign"`. |
| Zakat | `zakatTypes`, `zakatPeriods`, transaksi kategori zakat, distribusi zakat. |
| Qurban | `qurbanPeriods`, `qurbanPackages`, `qurbanPackagePeriods`, `qurbanExecutions`, transaksi qurban. |
| Mitra | `mitra`, campaign milik mitra, zakat/qurban by `createdBy`. |
| Fundraiser | `fundraisers` dan referral/revenue share. |
| Rekening | `bank_accounts` dan transaksi/disbursement terkait. |
| COA saldo | `chart_of_accounts` dan service ledger. |

## Kategori Finansial

Reports API memiliki daftar kategori internal untuk validasi dan grouping:

- income: `campaign_donation`, `zakat_fitrah`, `zakat_maal`, `zakat_profesi`, `zakat_pertanian`, `zakat_peternakan`, `zakat_bisnis`, `qurban_payment`, `qurban_savings`, `qurban_admin_fee`;
- expense: `zakat_to_*`, `campaign_to_beneficiary`, `campaign_to_vendor`, `qurban_purchase_*`, `qurban_execution_fee`, `operational_*`, `vendor_general_payment`, `revenue_share_*`.

Daftar ini adalah konstanta di route reports, bukan DB enum.

## Filter Tanggal

Beberapa endpoint memakai `startDate` dan `endDate`. Implementasi `endOfDay()` mengubah `endDate` menjadi pukul `23:59:59.999` agar transaksi pada hari akhir ikut masuk. Beberapa query memakai `paidAt`, beberapa memakai `createdAt`, dan beberapa memakai `COALESCE(paid_at, created_at)`.

## Catatan Kritis

1. Laporan bukan satu model tunggal. Tiap endpoint punya query dan definisi periode sendiri.
2. Financial statement modern sengaja tidak bergantung pada legacy `/admin/ledger`.
3. Kategori laporan adalah string di kode, bukan enum database.
4. Beberapa endpoint menggunakan raw SQL untuk agregasi kompleks; perubahan nama kolom/kategori harus dicek langsung ke route.
5. Jika ada perbedaan angka antara dashboard, reports, dan statistics, cek dulu sumber tanggal dan status yang dipakai tiap endpoint.
