# Arsitektur Laporan

> Terakhir di-sync dengan kode: 2026-09-22 (audit dokumen vs implementasi, dilengkapi verifikasi runtime).

> **Akan dirombak:** laporan keuangan direncanakan digantikan Buku Kas + Hak Bagi Hasil (5 laporan). Lihat `arsitektur-buku-kas.md` dan `decisions/adr-0016-buku-kas-dan-hak-bagi-hasil.md`. Dokumen ini tetap benar untuk kondisi saat ini.

## Ringkasan

Laporan adalah API agregasi untuk dashboard keuangan, performa program, liability, cash flow, zakat, qurban, revenue sharing, mitra, fundraiser, rekening, dan konsistensi kategori. Sumber utamanya adalah tabel operasional (`transactions`, `disbursements`, `revenue_shares`, `campaigns`, `mitra`, `fundraisers`, `donatur`, tabel zakat/qurban) — **bukan** ledger/COA double-entry.

Fakta penting yang sering disalahpahami:

1. Angka laporan **tidak dihitung dari `chart_of_accounts` / ledger**. `/financial-statement` memakai kode akun sintetis (1100/2100/3100/4100/5100) yang dibentuk di kode; `chartOfAccounts` hanya dipakai `/cash-flow` untuk **label** nama akun.
2. Laporan **bukan satu model tunggal**: tiap endpoint punya kolom tanggal, filter status, dan definisi "donatur" sendiri (lihat § Filter Tanggal dan § Definisi Donatur Unik).
3. Tidak ada endpoint yang membaca `zakat_distributions` lama untuk laporan keuangan admin; hanya `public-stats` yang masih menjumlahkan `zakatDistributions` (status `disbursed`) bersama disbursement universal.

Detail COA dan jurnal ada di `arsitektur-akuntansi.md`. Statistik donatur/mustahiq (`/admin/statistics/*`) didokumentasikan di `arsitektur-statistik.md`.

## Implementasi Terkait

| Area | File |
|------|------|
| Reports API | `apps/api/src/routes/admin/reports.ts` (mount `/admin/reports`) |
| Dashboard API | `apps/api/src/routes/admin/dashboard.ts` (mount `/admin/dashboard`) |
| Analytics API | `apps/api/src/routes/admin/analytics.ts` (mount `/admin/analytics`) |
| Statistics API | `apps/api/src/routes/admin/statistics.ts` (mount `/admin/statistics`, lihat `arsitektur-statistik.md`) |
| Export CSV API | `apps/api/src/routes/admin/export.ts` (mount `/admin/export`), builder CSV di `apps/api/src/services/export.ts` |
| Public stats | `apps/api/src/routes/public-stats.ts` (mount `/v1/public-stats`, **tanpa auth**) |
| Revenue share (dipakai `/revenue-sharing`) | `apps/api/src/services/revenue-share.ts` |
| Helper timezone | `apps/api/src/utils/timezone.ts` — `startOfDayWIB()`, `endOfDayWIB()`, `APP_TIMEZONE` (dipakai `reports.ts`, `analytics.ts`, `export.ts`) + helper WIB lain di `dashboard.ts` |
| Admin UI reports | `apps/admin/src/app/dashboard/reports/**` — navigasi di `reports/layout.tsx` dan `reports/page.tsx` |
| Report components | `apps/admin/src/components/reports/` — `ReportFilters`, `ReportSummaryCards`, `ReportTable`, `ExportButton` |
| Admin home dashboard | `apps/admin/src/app/dashboard/page.tsx` (memanggil `/admin/dashboard/*`) |

Export Excel di halaman laporan dilakukan **client-side** (tombol `ExportButton` → callback `onExportExcel` memakai package `xlsx` di browser); endpoint `/admin/export/*` (CSV server-side) tidak dipanggil oleh admin UI mana pun saat ini. Detail export di `arsitektur-export-import.md`.

## Akses dan Guard

Semua route `/admin/*` berada di balik `authMiddleware`. Selain itu:

| Prefix | Guard tingkat prefix (`admin/index.ts`) |
|--------|------------------------------------------|
| `/admin/reports/*`, `/admin/dashboard/*`, `/admin/analytics/*`, `/admin/export/*`, `/admin/statistics/*` | `staffOnly` = `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator`, `employee` |

- **`/admin/reports/*`**: setiap endpoint punya `requireRole(...)` sendiri (tabel di bawah) yang lebih ketat dari `staffOnly`.
- **`/admin/dashboard/*`**: **tidak punya `requireRole` lokal** — hanya `staffOnly`, sehingga semua staf (termasuk `program_coordinator` dan `employee`) bisa membaca ringkasan income all-time, jumlah donatur, dan disbursement pending. **Keputusan (2026-09-22): disengaja**, home dashboard boleh dilihat semua staf; tidak ada `coordinatorFilter`.
- **`/admin/analytics/*`**: `super_admin`, `admin_finance`, `admin_campaign` (`requireRole` per route).
- **`/v1/public-stats/*`**: publik, tanpa auth, hanya kena rate limit global.

## Endpoint Reports

Base path: `/admin/reports`. Semua `GET`. Kolom "Kolom tanggal" adalah kolom yang dipakai filter `startDate`/`endDate` (mekanisme parsing tanggal: lihat § Filter Tanggal).

| Path | Role | Fungsi | Kolom tanggal | Catatan implementasi |
|------|------|--------|---------------|----------------------|
| `/dashboard` | `super_admin`, `admin_finance` | Ringkasan income (`transactions` paid), expense (`disbursements` paid), balance, jumlah donatur, jumlah campaign | `transactions.paidAt`, `disbursements.paidAt` | "Donatur unik" = `count(distinct userId)` → donasi guest (`userId` null) tidak terhitung. "Campaign aktif" = status `active`/`published`/`ongoing`. |
| `/donations-summary` | `super_admin`, `admin_finance` | Summary donasi: total, by campaign (top 10), by date | `transactions.createdAt` (bukan `paidAt`) | Mencakup **semua** `productType` paid (zakat, qurban, dll), hanya `byCampaign` yang campaign-only. `totalFees` **hardcoded 0**. `byDate` dikelompokkan `Asia/Jakarta`. |
| `/campaigns-performance` | `super_admin`, `admin_campaign` | Performa campaign by kategori/pilar | `campaigns.createdAt` | Filter tanggal hanya menyaring **campaign yang dibuat** di rentang itu; `collected` tetap all-time. |
| `/financial-statement` | `super_admin`, `admin_finance` | Neraca + laba rugi ringkas | `COALESCE(paid_at, created_at)` | Sintetis, bukan double-entry (lihat § Financial Statement). Tanggal opsional, tetapi jika diisi harus `YYYY-MM-DD` (selain itu `400`). |
| `/ledger-summary` | `super_admin`, `admin_finance` | **Ringkasan disbursement** (jumlah per status, top 10 campaign) — bukan ledger | `disbursements.createdAt` | Nama endpoint menyesatkan; tidak menyentuh ledger/COA. |
| `/donor-analytics` | `super_admin`, `admin_finance` | Top 20 donatur + retensi bulanan | `transactions.createdAt` | `donorRetention.newDonors`/`returningDonors` **hardcoded 0** (stub). Pengelompokan top donor per `userId+donorName+donorEmail`. |
| `/liability-balance` | `super_admin`, `admin_finance` | Saldo titipan dana per campaign (donasi − disbursement) | Tidak ada filter tanggal (all-time) | Campaign-only (`product_type='campaign'`, `reference_type='campaign'`), paid saja. Bukan dari ledger 2010. |
| `/account-balance/:code` | `super_admin`, `admin_finance` | **Deprecated — selalu `410 Gone`** | — | Pesan mengarahkan ke `/financial-statement`. Tidak dipakai UI. |
| `/cash-flow` | `super_admin`, `admin_finance` | Mutasi kas & bank: kas masuk (transaksi paid), kas keluar (disbursement paid), kode unik | `COALESCE(paid_at, created_at)` | `startDate`/`endDate` **wajib**. Param: `accountCode`, `refType`, `search`, `page`, `limit` (default 50, maks 200). Paginasi & search di memori. Baris yang tidak ter-resolve ke akun kas dibuang diam-diam. `openingBalance` selalu 0. Lihat § Cash Flow. |
| `/cash-flow-by-category` | `super_admin`, `admin_finance` | Cash flow per kategori | `transactions.paidAt`, `disbursements.paidAt` | Balas `422` jika kategori tidak ada di `INCOME_CATEGORIES`/`EXPENSE_CATEGORIES` (blok kode unik tidak divalidasi). `paidAt` null → `new Date()`. Tanpa paginasi. Tidak dipakai UI. |
| `/zakat` | `super_admin`, `admin_finance` | Laporan zakat: income, expense, per periode | Income: `COALESCE(paidAt, createdAt)`; expense: `disbursements.paidAt` | Income mengecualikan `typeSpecificData.is_admin_fee_entry`, `periodByType` tidak. `422` untuk kategori tidak valid. |
| `/qurban` | `super_admin`, `admin_finance` | Laporan qurban: income, expense, per hewan | `paidAt` | `periodByAnimal` hanya kategori `qurban_payment` dan tanpa admin-fee. `422` untuk kategori tidak valid. |
| `/qurban-execution` | `super_admin`, `admin_finance` | Laporan pelaksanaan (penyembelihan) qurban | `qurbanExecutions.executionDate` | Bukan laporan keuangan. `donorName` dan `onBehalfOf` **selalu `null`**. Tanpa filter status & paginasi. |
| `/campaign` | `super_admin`, `admin_finance` | Laporan campaign: income/expense | `paidAt` | Validasi kategori **income no-op** (semua baris dipetakan ke literal `campaign_donation`, tak pernah gagal); validasi expense aktif (`422` bila kategori bukan `campaign_to_beneficiary`/`campaign_to_vendor`). Tidak dipakai UI. |
| `/unique-codes` | `super_admin`, `admin_finance` | Laporan kode unik transaksi | `transactions.paidAt` | Bucket bulan `to_char(paidAt AT TIME ZONE 'Asia/Jakarta','YYYY-MM')` (WIB). `detail` di-limit 100 baris. |
| `/revenue-sharing` | `super_admin`, `admin_finance` | Laporan revenue share | `revenue_shares.calculatedAt` | Lewat `RevenueShareService.list/summary` (memaksa transaksi `paid`). Batas tanggal WIB. Paginasi `page`/`limit` (default 50, maks 100). |
| `/program-summary` | `super_admin`, `admin_finance`, `admin_campaign` | Summary per program (campaign) | `campaigns.createdAt`, `transactions.paidAt`, `disbursements.paidAt` | Paginasi di memori (default 20, maks 100). `collected` all-time. Expense dicocokkan via `referenceId` saja (tanpa cek tipe). |
| `/program-detail` | `super_admin`, `admin_finance`, `admin_campaign` | Detail satu campaign (`campaignId` wajib) | `paidAt` | List dibatasi 200 baris; summary dihitung dari list terbatas itu → bisa under-count. `404` jika campaign tidak ada. |
| `/mitra-summary` | `super_admin`, `admin_finance` | Summary per mitra | **Tidak ada filter tanggal** | Bagi hasil dibaca dari `revenue_shares` tanpa cek transaksi paid. Paginasi di memori. |
| `/mitra-detail` | `super_admin`, `admin_finance` | Detail satu mitra (`mitraId` wajib) | Shares: `calculatedAt`; disbursement: `paidAt` | Dibatasi 200 shares / 100 disbursement. |
| `/fundraiser-summary` | `super_admin`, `admin_finance` | Summary per fundraiser | **Tidak ada filter tanggal** | Komisi dibaca dari `disbursements` (bukan `revenue_shares`), status `submitted`/`approved`/`paid`. Paginasi di memori. |
| `/fundraiser-detail` | `super_admin`, `admin_finance` | Detail satu fundraiser (`fundraiserId` wajib) | Referral: `paidAt`; disbursement: `createdAt` | `commissionPercentage`/`commissionAmount` per referral **hardcoded 0**. Dibatasi 200 referral / 100 disbursement. |
| `/rekening-summary` | `super_admin`, `admin_finance` | Kas masuk per rekening bank (dari settings `payment_bank_accounts`) | **Tidak ada filter tanggal** | **Income-only**: `balance = totalIn` (disbursement tidak terhubung ke rekening). Menjumlahkan dua bentuk `payment_method_id` (lihat § Rekening). Paginasi di memori. |
| `/rekening-detail` | `super_admin`, `admin_finance` | Mutasi satu rekening (`bankAccountId`, `startDate`, `endDate` semua wajib) | `COALESCE(paid_at, created_at)` | `kasOut` selalu 0, `openingBalance` selalu 0. Query sudah **parameterized** (lihat Perbaikan). |
| `/donor-detail` | `super_admin`, `admin_finance` | Riwayat transaksi satu donatur (`donorId` wajib) | `paidAt` | Dicocokkan via **`donorEmail`**, bukan `donaturId`. Dibatasi 200 baris. `404` jika donatur tidak ada. |
| `/consistency-check` | `super_admin`, `admin_finance` | Cek konsistensi kategori | Transaksi: `paidAt`; disbursement: `createdAt` | Hanya cek "kategori ada di daftar kategori valid" — **bukan** rekonsiliasi nominal/ledger. |
| `/consistency-check/details` | `super_admin`, `admin_finance` | Detail baris dengan kategori invalid | Sama dengan di atas | Param: `source` (`all`/`transactions`/`disbursements`), `search`, `page`, `limit` (default 20, maks 100). Paginasi di memori. Kategori kosong/null tidak muncul di detail walau dihitung di summary. |

## Endpoint Dashboard

Base path: `/admin/dashboard`. Dipakai halaman home admin (`apps/admin/src/app/dashboard/page.tsx`). Guard: `staffOnly` saja (lihat § Akses).

| Path | Fungsi | Catatan |
|------|--------|---------|
| `/stats` | Total donasi paid, total nominal, jumlah campaign `active`, donasi bulan berjalan | Awal bulan dihitung WIB (`getStartOfMonthWIB`). Tidak dipanggil UI. |
| `/recent-donations` | N transaksi paid terakhir (`limit`, default 10) | Urut `paidAt` desc. Mengembalikan `donorName` apa adanya; flag `isAnonymous` ikut dikirim (API tidak menyamarkan nama). |
| `/stats-by-category` | Income per `transactions.category`, expense per `disbursements.category`, ringkasan per tipe produk | All-time, tanpa filter tanggal. Bucket berdasarkan prefix kategori (`zakat_`, `qurban_`, `campaign_*`, `operational_`). |
| `/enhanced-stats` | Periode berjalan vs sebelumnya (`period` = `7d`/`30d`/`90d`, default 30d), total all-time, donatur unik, disbursement pending, tren harian | Batas periode WIB (`addDaysWIB`), tren `date(... AT TIME ZONE 'Asia/Jakarta')`. "Donatur unik" = `count(distinct donorName)` (per **nama**). Disbursement pending = status `submitted` saja. |

## Endpoint Analytics

Base path: `/admin/analytics`, role `super_admin`/`admin_finance`/`admin_campaign`. **Tidak dipanggil oleh admin UI mana pun.**

| Path | Fungsi | Catatan |
|------|--------|---------|
| `/overview` | Total campaign, campaign aktif, donasi paid, user, tren harian | Tren harian `Asia/Jakarta`. |
| `/conversion` | Funnel status pembayaran (pending/partial/paid/failed/expired), konversi per tipe produk | Filter `transactions.createdAt` dengan batas hari WIB (`endDate` inklusif sampai 23:59:59.999 WIB). |
| `/growth` | Pertumbuhan donasi/campaign/user per periode (`period` = `daily`/`weekly`/`monthly`/`yearly`) | Bucket WIB. Sebelum 2026-09-22 endpoint ini selalu `500` (lihat Perbaikan). |

## Endpoint Export CSV

Base path: `/admin/export` (CSV server-side, `Content-Type: text/csv`). Tidak dipanggil admin UI. Filter tanggal memakai batas hari WIB (`endDate` inklusif); nama file masih memakai tanggal UTC (`toISOString`).

| Path | Role | Sumber |
|------|------|--------|
| `/campaigns` | `super_admin`, `admin_campaign` | `campaigns` |
| `/donations` | `super_admin`, `admin_finance` | `transactions` |
| `/ledger` | `super_admin`, `admin_finance` | `ledger_entries` + `ledger_lines` + `chart_of_accounts` (baris jurnal per akun). Filter `startDate`/`endDate` (by `postedAt`, batas WIB) dan `accountCode`. Handler legacy (tabel `ledger`, kolom disbursement) sudah dihapus 2026-09-22. |
| `/users` | `super_admin` | `users` |

## Public Stats

Base path: `/v1/public-stats` (tanpa auth). Dipakai web publik (`apps/web/src/services/stats.ts`, `services/public-reports.ts`, `app/ai-reference/route.ts`).

| Path | Fungsi |
|------|--------|
| `/` | `totalDonors`, `totalCampaigns` (status `active`), `totalDisbursed` (disbursement universal `paid` + `zakat_distributions` `disbursed`), `totalPartners` (mitra `verified`) |
| `/zakat-report`, `/zakat-activities` | Laporan zakat publik & kegiatan (periode `active`, activity report `published`) |
| `/qurban-report`, `/qurban-activities` | Laporan qurban publik & kegiatan |

## Frontend Laporan (Admin)

Sidebar menu **Laporan** (`Sidebar.tsx`) dan `reports/layout.tsx` menautkan halaman berikut. Endpoint yang dipanggil tiap halaman:

| Halaman `/dashboard/reports/...` | Endpoint |
|----------------------------------|----------|
| (index) | `/dashboard`, `/consistency-check` |
| `neraca` | `/financial-statement` |
| `cash-flow`, `mutation` | `/cash-flow` |
| `category-audit` | `/consistency-check/details` |
| `zakat` | `/zakat` |
| `qurban` | `/qurban` |
| `qurban-execution` | `/qurban-execution` |
| `revenue-sharing` | `/revenue-sharing` |
| `liability-balance` | `/liability-balance` |
| `unique-codes` | `/unique-codes` |
| `program` | `/program-summary`, `/program-detail` |
| `mitra` | `/mitra-summary`, `/mitra-detail` |
| `fundraiser` | `/fundraiser-summary`, `/fundraiser-detail` |
| `rekening` | `/rekening-summary`, `/rekening-detail` |
| `donatur` | `/donor-analytics`, `/donor-detail` |

**Endpoint reports tanpa konsumen UI**: `/donations-summary`, `/campaigns-performance`, `/ledger-summary`, `/account-balance/:code` (410), `/cash-flow-by-category`, `/campaign`. Menu Sidebar "Reports" dibatasi `super_admin` + `admin_finance`.

## Sumber Data Utama

| Data | Sumber |
|------|--------|
| Income | `transactions` dengan `paymentStatus = "paid"`; kode unik (`unique_code`) dihitung **terpisah** sebagai income tambahan (`totalAmount` sudah tidak memuat kode unik: `totalAmount = subtotal + adminFee`). |
| Expense | `disbursements` dengan `status = "paid"` (beberapa endpoint memasukkan juga `submitted`/`approved`: `/fundraiser-*`, `/mitra-summary`, `/consistency-check*`). |
| Revenue share | `revenue_shares` dan `RevenueShareService`. Lihat `arsitektur-revenue-share.md`. |
| Campaign | `campaigns` dan transaksi `productType = "campaign"`. |
| Zakat | `zakatTypes`, `zakatPeriods`, transaksi kategori zakat, disbursement `zakat_to_%`. |
| Qurban | `qurbanPeriods`, `qurbanPackages`, `qurbanPackagePeriods`, `qurbanExecutions`, transaksi qurban. |
| Mitra | `mitra`, `revenue_shares` (`mitraAmount`), disbursement `recipientType='mitra'`. |
| Fundraiser | `fundraisers`, transaksi `referredByFundraiserId`, disbursement `recipientType='fundraiser'`. |
| Rekening | Daftar rekening dari tabel `settings` (`category=payment`, `key=payment_bank_accounts`, JSON) + transaksi paid berdasarkan `payment_method_id`. Tabel `bank_accounts` **tidak** dipakai laporan. |
| Label akun kas | `chart_of_accounts` — hanya nama akun di `/cash-flow`, tidak memengaruhi nominal. |

## Financial Statement

`/financial-statement` sengaja tidak bergantung pada legacy `/admin/ledger` dan **tidak double-entry**. Semua angka berasal dari lima agregat SQL:

```text
totalRevenue     = SUM(transactions.total_amount paid) + SUM(transactions.unique_code paid)
totalExpenses    = SUM(disbursements.amount paid)
netIncome        = totalRevenue - totalExpenses
campaignLiability= MAX(0, SUM(campaign income paid) - SUM(campaign disbursement paid))
totalAssets      = netIncome          -- akun "1100 Kas & Bank (Net)"
totalEquity      = totalAssets - totalLiabilities
```

Kode akun di respons (`1100`, `2100`, `3100`, `4100`, `5100`) adalah label tetap di kode, **bukan** baris `chart_of_accounts`. Karena itu neraca selalu "seimbang" secara konstruksi; bukan bukti rekonsiliasi terhadap jurnal.

## Cash Flow

`/cash-flow` menggabungkan tiga blok `UNION ALL` (transaksi paid, disbursement paid, kode unik) lewat raw SQL. Akun kas per baris **di-resolve ulang di kode** (bukan dari kolom SQL): (1) `coaCode` rekening dari settings jika termasuk kode kas standar `6201–6206, 6210`; (2) `6210` jika metode pembayaran mengandung "cash"; (3) `6206` (Payment Gateway) jika metode bukan `bank_*`/`manual_*`; selain itu baris dibuang. `chartOfAccounts` dipakai hanya untuk nama akun. Cabang deskripsi `qurban_savings_deposit`/`qurban_savings_withdrawal` tidak pernah dihasilkan SQL (dead code).

## Rekening

Daftar rekening berasal dari JSON settings dengan id berbentuk `bank-<timestamp>` (dibuat halaman Settings → Payments). Kolom `transactions.payment_method_id` tersimpan dalam **dua bentuk** tergantung jalur pembuatan transaksi:

| Bentuk | Asal |
|--------|------|
| `bank-<timestamp>` (id rekening apa adanya) | Checkout publik (web) |
| `bank_bank-<timestamp>` (`bank_` + id) | Form admin tabungan/pembayaran qurban |

`/rekening-summary` dan `/rekening-detail` menjumlahkan/mencocokkan **kedua bentuk** (satu transaksi hanya punya satu bentuk, jadi tidak ada hitung ganda). Sebelum 2026-09-22 hanya bentuk `bank_<id>` yang dikenali, sehingga transaksi checkout publik tidak pernah muncul di laporan rekening (lihat Perbaikan).

## Kategori Finansial

Reports API memiliki daftar kategori internal untuk validasi dan grouping:

- income: `campaign_donation`, `zakat_fitrah`, `zakat_maal`, `zakat_profesi`, `zakat_pertanian`, `zakat_peternakan`, `zakat_bisnis`, `qurban_payment`, `qurban_savings`, `qurban_admin_fee`;
- expense: `zakat_to_{fakir,miskin,amil,mualaf,riqab,gharim,fisabilillah,ibnussabil}`, `campaign_to_beneficiary`, `campaign_to_vendor`, `qurban_purchase_{sapi,kambing}`, `qurban_execution_fee`, `operational_{salary,rent,utilities,internet,marketing,pg_fee,bank_fee,supplies,other}`, `vendor_general_payment`, `revenue_share_{mitra,fundraiser,developer}`.

Daftar ini adalah konstanta di `reports.ts` (`INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`, plus subset `ZAKAT_*`, `QURBAN_*`, `CAMPAIGN_*`), bukan DB enum. `/consistency-check*` hanya mengecek kategori tersimpan ada di daftar ini.

## Filter Tanggal

**Zona waktu**: belum ada setting zona waktu yang bisa dikonfigurasi (tidak ada key di tabel `settings` maupun halaman Settings). Seluruh sistem memakai WIB (`Asia/Jakarta`) lewat konstanta `APP_TIMEZONE` di `apps/api/src/utils/timezone.ts`. Jika kelak ada setting zona waktu, cukup ubah sumber konstanta itu.

Sejak 2026-09-22 semua filter `startDate`/`endDate` di `reports.ts`, `analytics.ts`, dan `export.ts` memakai batas hari **WIB** lewat `startOfDayWIB()` (00:00:00.000 WIB) dan `endOfDayWIB()` (23:59:59.999 WIB). Input `YYYY-MM-DD` diperlakukan sebagai tanggal WIB; string yang sudah memuat waktu/offset dipakai apa adanya. Tiga endpoint dengan raw SQL (`/financial-statement`, `/cash-flow`, `/rekening-detail`) memakai `'YYYY-MM-DD'::timestamp AT TIME ZONE 'Asia/Jakarta'`, sehingga hasilnya **tidak lagi bergantung pada `TimeZone` sesi Postgres**. Bucket bulan (`to_char`) di `/unique-codes`, `/donor-analytics`, dan `analytics/growth` juga dikonversi ke WIB.

Catatan lingkungan: di produksi, migrasi 111 mengonversi kolom ke `timestamptz` dan menyetel timezone database ke **UTC**. Karena itu sebelum perbaikan, `startDate=endDate=2026-02-24` memakai jendela 00:00–23:59 UTC (= 07:00–06:59 WIB) dan melewatkan transaksi 00:00–06:59 WIB. Database dev yang belum menjalankan migrasi 111 masih memakai kolom `timestamp` tanpa zona sehingga hasil uji di sana **tidak representatif** — verifikasi perubahan boundary waktu harus memakai database dengan migrasi 111 (lihat Perbaikan).

Kolom tanggal yang dipakai tetap bervariasi per endpoint: `transactions.paidAt` (mayoritas), `createdAt` (`/donations-summary`, `/donor-analytics`), `COALESCE(paid_at, created_at)` (`/financial-statement`, `/cash-flow`, `/rekening-detail`, `/zakat` income), `disbursements.createdAt` (`/ledger-summary`, `/fundraiser-detail`, `/consistency-check*`), `revenue_shares.calculatedAt`, `qurbanExecutions.executionDate` — lihat kolom "Kolom tanggal" di tabel endpoint. `/admin/statistics/*` (dokumen terpisah) belum memakai helper ini.

## Definisi Donatur Unik

Angka "jumlah donatur" berbeda antar tempat karena definisi berbeda:

| Tempat | Definisi |
|--------|----------|
| `/reports/dashboard`, `/reports/donations-summary` | `count(distinct transactions.userId)` — guest (`userId` null) tidak terhitung |
| `/admin/dashboard/enhanced-stats` (home admin) | `count(distinct donorName)` — dihitung per **nama** ("Hamba Allah" menyatu) |
| `/v1/public-stats` (web publik) | `count(distinct coalesce(userId, lower(donorEmail)))` |
| `/reports/campaigns-performance` | `count(distinct donorEmail)` per campaign |

## Catatan Kritis

1. Laporan bukan satu model tunggal. Tiap endpoint punya query dan definisi periode sendiri.
2. Financial statement modern sengaja tidak bergantung pada legacy `/admin/ledger`, dan tidak double-entry.
3. Kategori laporan adalah string di kode, bukan enum database.
4. Tiga endpoint memakai raw SQL string (`sql.raw`) — `/financial-statement` dan `/cash-flow` aman hanya karena tanggal divalidasi regex ketat; **jangan pernah** menginterpolasi param lain ke `sql.raw` (lihat Perbaikan `/rekening-detail`). Untuk param baru gunakan template `sql` (parameter terikat).
5. Jika ada perbedaan angka antara dashboard, reports, dan statistics, cek dulu kolom tanggal, timezone boundary, filter status, dan definisi donatur pada tabel di atas.
6. Endpoint detail (`/program-detail`, `/mitra-detail`, `/fundraiser-detail`, `/donor-detail`) membatasi jumlah baris (100–200) dan menghitung summary dari baris terbatas itu.

## Gap Implementasi

| Gap | Dampak |
|-----|--------|
| `/rekening-summary` & `/rekening-detail` income-only (`kasOut`, saldo awal = 0) | Saldo rekening = total masuk, bukan saldo bank sebenarnya |
| `/cash-flow` membuang baris yang tidak ter-resolve ke akun kas, `openingBalance` = 0 | Total bisa lebih kecil dari mutasi sebenarnya tanpa peringatan |
| `/ledger-summary` adalah ringkasan disbursement, namanya menyesatkan | Konsumen API salah mengira ini laporan ledger |
| `/donor-analytics.donorRetention` (`newDonors`/`returningDonors`) hardcoded 0; `/donations-summary.totalFees` hardcoded 0; `/fundraiser-detail` komisi per referral hardcoded 0; `/qurban-execution` `donorName`/`onBehalfOf` selalu null | Field ada di respons tapi tidak bermakna |
| `/campaign`: validasi kategori income no-op | Tidak ada proteksi kategori invalid di endpoint ini |
| Detail endpoints dibatasi 100–200 baris dan summary dihitung dari list terbatas | Summary under-count untuk entitas dengan banyak transaksi |
| Paginasi in-memory di `/program-summary`, `/mitra-summary`, `/fundraiser-summary`, `/rekening-summary`, `/consistency-check/details`, `/cash-flow` | Seluruh dataset dimuat per request; tidak scalable |
| `/mitra-summary`, `/mitra-detail` membaca `revenue_shares` tanpa filter transaksi `paid` (berbeda dengan `RevenueShareService`) | Angka mitra bisa berbeda dengan `/revenue-sharing` |
| `/program-summary` mencocokkan disbursement hanya via `referenceId` | Disbursement non-campaign dengan id sama bisa ikut terhitung |
| Tiga definisi "donatur unik" (lihat tabel) | Angka donatur di home admin, reports, dan web publik tidak sama |
| `/admin/analytics/*`, `/admin/export/*`, `/admin/dashboard/stats`, serta 5 endpoint reports tidak punya konsumen UI | Kode mati / belum terhubung; risiko drift tak terdeteksi (contoh nyata: `analytics/growth` `500` bertahun-tahun tanpa ada yang sadar) |
| `/admin/statistics/*` (dokumen `arsitektur-statistik.md`) masih memakai `setHours(23,59,59,999)` timezone proses server, bukan helper WIB | Batas hari export statistik bergantung timezone server |
| Nama file export CSV memakai `toISOString()` (tanggal UTC) | Nama file bisa berbeda satu hari dari tanggal WIB |
| `ledger_lines.account_id` di DB dev masih FK ke tabel legacy `ledger_accounts`, sedangkan schema Drizzle (`ledgerAccounts` = alias `chart_of_accounts`) menunjuk `chart_of_accounts` | Drift schema vs DB; ekspor ledger COA tidak bisa diuji end-to-end di DB dev |
| `/reports/campaigns-performance` dibuka untuk `admin_campaign`, tetapi tidak ada halaman UI yang memanggilnya (menu Laporan hanya untuk `super_admin`/`admin_finance`) | Izin API tidak punya jalur pakai |
| `/donor-detail` mencocokkan donatur via email, bukan `donaturId` | Donatur dengan email placeholder (`donor-*@temp.local`) atau email ganda tercampur/terlewat |
| `/donations-summary` dan `/donor-analytics` memfilter `transactions.createdAt`, sedangkan `/dashboard` memfilter `paidAt` | Transaksi dibuat di akhir bulan tapi dibayar bulan berikutnya masuk periode berbeda; selisih angka antar laporan |

## Perbaikan

> 2026-09-22

| Fix | File | Detail |
|-----|------|--------|
| Batas tanggal laporan UTC → WIB | `utils/timezone.ts` (`startOfDayWIB`, `endOfDayWIB`, `APP_TIMEZONE`), `reports.ts`, `analytics.ts`, `export.ts` | Sebelumnya `endOfDay` memakai `setUTCHours` dan `new Date(startDate)` (UTC), raw SQL memakai `::timestamp` yang tergantung `TimeZone` sesi DB (UTC di produksi), `/revenue-sharing` memakai timezone proses Node. Semua diganti batas WIB eksplisit. Diverifikasi pada database yang meniru produksi (salinan data + migrasi 111, timezone DB UTC): filter 24 Feb → batas UTC lama menghasilkan **0** transaksi, kini **5** (Rp 4.050.000, cocok dengan hitungan langsung `psql`); `/financial-statement` 4.052.447 dan `/cash-flow` 10 baris cocok; 23 Feb → 1 transaksi (19:45 WIB) benar. |
| `GET /admin/analytics/growth` selalu `500` | `analytics.ts` | Bug lama: format `to_char` dikirim sebagai parameter terikat sehingga ekspresi di `SELECT` dan `GROUP BY` menjadi placeholder berbeda (`must appear in the GROUP BY clause`). Kini ekspresi bucket identik (literal dari whitelist) di ketiga klausa; keempat `period` diverifikasi berjalan. |
| Handler `/admin/export/ledger` legacy dihapus | `export.ts` | Handler pertama (tabel `ledger` legacy, kolom disbursement, abaikan `accountCode`) tidak dipakai siapa pun dan menutupi handler kedua. Handler kedua kini aktif dan diperbaiki: sebelumnya `startDate`/`endDate` hanya dipakai pada query `entries` yang hasilnya tidak digunakan (filter tanggal tidak berpengaruh) — sekarang diterapkan pada query baris jurnal dengan batas WIB, plus `accountCode`. Diverifikasi dengan data uji: 24 Feb → 2 baris, 23 Feb → 0, filter akun bekerja. |
| SQL injection di `/rekening-detail` | `apps/api/src/routes/admin/reports.ts` | Param `bankAccountId` dari query string diinterpolasi mentah ke `sql.raw(...)` (`payment_method_id = '${pmId}'`); hanya tanggal yang divalidasi. Payload `x' OR '1'='1` mengubah filter jadi selalu-benar. Diganti template `sql` dengan parameter terikat (`IN (${pmIdPlain}, ${pmIdLegacy})`, tanggal juga terikat). Diverifikasi: payload injeksi kini menghasilkan `mutations: []`. |
| Laporan rekening tidak menghitung transaksi checkout publik | `reports.ts` (`/rekening-summary`, `/rekening-detail`) | Laporan mencocokkan `payment_method_id = 'bank_' + id`, padahal checkout menyimpan `id` apa adanya (`bank-<ts>`). Sekarang kedua bentuk dicocokkan. Diverifikasi dengan data lokal: rekening dengan 1 transaksi paid (Rp 50.000 + kode unik 755) sebelumnya menampilkan `totalIn: 0, transactionCount: 0`, kini `totalIn: 50755` dan detail memuat 2 mutasi. |
| Komentar kode menyesatkan | `reports.ts` | Docstring `/liability-balance` mengklaim sumber ledger akun 2010 (sebenarnya `transactions`+`disbursements`); docstring `/account-balance/:code` kini menyebut endpoint deprecated (410). |

## Dokumen Terkait

| Dokumen | Keterkaitan |
|---------|-------------|
| `arsitektur-revenue-share.md` | Detail skema dan kalkulasi revenue share (amil, developer, fundraiser, mitra) |
| `arsitektur-transaksi.md` | Sumber utama income — semua transaksi paid |
| `arsitektur-disbursement.md` | Sumber utama expense — semua disbursement paid |
| `arsitektur-akuntansi.md` | COA dan double-entry journal (tidak dipakai langsung oleh laporan) |
| `arsitektur-statistik.md` | Statistik donatur dan mustahiq (terpisah dari laporan keuangan) |
| `arsitektur-timezone.md` | Boundary WIB; lihat Gap Implementasi soal `reports.ts` |
| `arsitektur-export-import.md` | Export Excel client-side dan CSV server-side |
| `arsitektur-security.md` | Catatan keamanan raw SQL |
