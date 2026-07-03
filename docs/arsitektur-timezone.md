# Arsitektur Timezone

Dokumen ini adalah source of truth untuk kebijakan tanggal/waktu Bantuanku. Standar bisnis sistem adalah WIB (`Asia/Jakarta`, UTC+7), sedangkan penyimpanan timestamp memakai `timestamptz` PostgreSQL dan objek `Date` JavaScript.

## Prinsip Utama

1. Timestamp audit dan event disimpan sebagai waktu absolut (`timestamptz`) agar aman lintas runtime.
2. Boundary bisnis Indonesia seperti nomor order tahunan, laporan harian/bulanan, reminder, dan tanggal operasional harus dihitung dalam konteks WIB.
3. Tampilan tanggal publik/admin seharusnya eksplisit memakai `Asia/Jakarta`, bukan timezone browser, tetapi implementasi saat ini belum konsisten.
4. Input tanggal dari `<input type="date">` harus diperlakukan sebagai tanggal kalender bisnis, bukan timestamp UTC mentah.
5. Perubahan timezone harus dicek bersama arsitektur modul yang memakai tanggal tersebut.

## Dokumen Terkait

| Arsitektur Terkait | Alasan Keterkaitan |
|---|---|
| `docs/arsitektur-database.md` | Konversi timestamp ke `timestamptz`, migrasi, default `now()` |
| `docs/arsitektur-transaksi.md` | `paidAt`, `paymentDate`, status pembayaran, expired payment |
| `docs/arsitektur-universal-payment.md` | Expiry VA/QRIS/manual/gateway dan upload proof `paymentDate` |
| `docs/arsitektur-qurban.md` | Nomor order/payment/savings berbasis tahun WIB |
| `docs/arsitektur-laporan.md` | Boundary laporan harian/bulanan, dashboard, analytics |
| `docs/arsitektur-notifikasi.md` | Reminder tabungan qurban dan template tanggal/jam WhatsApp |
| `docs/arsitektur-activity-reports.md` | `activityDate`, publish date, tampilan laporan kegiatan |
| `docs/arsitektur-i18n.md` | Locale display `id-ID`/`en-US` dan wrapper format tanggal |
| `docs/arsitektur-seo.md` | Metadata tanggal halaman publik bila digunakan di structured data |

## Implementasi Database

Mayoritas schema Drizzle sudah memakai:

```ts
timestamp("field_name", { precision: 3, mode: "date", withTimezone: true })
```

Migrasi penting:

| File | Fungsi |
|---|---|
| `packages/db/migrations/111_convert_timestamps_to_timestamptz.sql` | Mengubah semua `timestamp without time zone` di public schema menjadi `timestamptz` |

Strategi migrasi 111:

1. `SET LOCAL timezone = 'Asia/Jakarta'` agar timestamp lama tanpa timezone dianggap sebagai WIB.
2. Alter semua kolom `timestamp without time zone` ke `timestamptz` dengan `AT TIME ZONE 'Asia/Jakarta'`.
3. Set timezone database ke `UTC` untuk operasi berikutnya.

Implikasi:

- Database menyimpan waktu absolut.
- Aplikasi tetap menerima `Date` object dari Drizzle.
- Tampilan harus menentukan timezone sendiri agar tidak bergantung ke browser/server locale.

## Utility Backend

File: `apps/api/src/utils/timezone.ts`.

| Function | Implementasi Aktual | Pemakaian |
|---|---|---|
| `getCurrentYearWIB()` | `formatInTimeZone(new Date(), 'Asia/Jakarta', 'yyyy')` | Nomor order/payment/savings qurban |
| `getCurrentMonthWIB()` | Format bulan WIB | Tersedia, belum banyak dipakai |
| `getCurrentDateWIB()` | Format tanggal WIB | Tersedia, belum banyak dipakai |
| `formatWIB(date, format)` | Format date dengan `date-fns-tz` | Tersedia untuk format custom backend |
| `addHoursWIB(date, hours)` | Convert via `toDate`, lalu `setHours` | Tersedia, tetapi tidak banyak dipakai di payment service saat ini |
| `addDaysWIB(date, days)` | Convert via `toDate`, lalu `setDate` | Analytics/dashboard period |
| `getStartOfMonthWIB(date)` | Membuat midnight tanggal 1 WIB sebagai UTC instant | Dashboard monthly stats |
| `nowWIB()` | Convert `new Date()` via `toDate` | Tersedia |

Dependensi `date-fns-tz` ada di `apps/api/package.json`.

## Utility Frontend Web

File: `apps/web/src/lib/timezone.ts`.

| Function | Implementasi Aktual | Pemakaian |
|---|---|---|
| `formatDateWIB(date, format)` | `formatInTimeZone(date, 'Asia/Jakarta', format)` | Format custom WIB |
| `nowWIB()` | Convert `new Date()` via `toDate` | Current WIB helper |
| `toWIB(date)` | Convert input date via `toDate` | Konversi date helper |

Dependensi `date-fns-tz` ada di `apps/web/package.json`.

Fungsi `formatDate` dan `formatDateTime` di `apps/web/src/lib/format.ts` sudah dimigrasi: keduanya kini memakai `formatInTimeZone(d, 'Asia/Jakarta', pattern, { locale: indonesianLocale })` via `date-fns-tz`, sehingga output konsisten WIB dan bulan dalam Bahasa Indonesia.

## Pemakaian Backend Saat Ini

### Qurban Numbering

File terkait:

- `apps/api/src/routes/qurban.ts`
- `apps/api/src/routes/admin/qurban.ts`
- `apps/api/src/routes/admin/qurban-savings.ts`

Nomor yang sudah memakai `getCurrentYearWIB()`:

| Prefix / Entity | Catatan |
|---|---|
| `QBN-{year}-...` | Order qurban |
| `PAY-QBN-{year}-...` | Payment qurban |
| `SAV-QBN-{year}-...` | Savings qurban |
| `PAY-SAV-QBN-{year}-...` | Payment tabungan qurban |
| `ORD-QBN-{year}-...` | Manual/admin order qurban |

Tujuannya mencegah nomor order memakai tahun UTC yang salah pada jam 00:00-06:59 WIB.

### Dashboard dan Analytics

File terkait:

- `apps/api/src/routes/admin/dashboard.ts`
- `apps/api/src/routes/admin/analytics.ts`

Implementasi:

- Dashboard monthly stats memakai `getStartOfMonthWIB(now)`.
- Dashboard period comparison memakai `addDaysWIB`.
- Analytics overview period `7d`, `30d`, `90d`, `1y` memakai `addDaysWIB`.

Gap: grouping trend analytics masih memakai SQL `date(transactions.paidAt)` tanpa timezone eksplisit. Jika session database UTC, bucket tanggal dapat mengikuti UTC, bukan WIB.

### Notifikasi

File terkait:

- `apps/api/src/services/whatsapp.ts`
- `apps/api/src/services/savings-reminder.ts`

WhatsApp template variables `current_date` dan `current_time` diformat dengan `timeZone: 'Asia/Jakarta'`.

Savings reminder masih memakai operasi `setHours` pada `Date` runtime untuk boundary Senin/Minggu. Kebenarannya bergantung pada timezone runtime Node (`TZ`) atau environment server. Jika `TZ` tidak `Asia/Jakarta`, boundary reminder bisa bergeser.

### Payment Expiry

Payment service yang ditemukan:

| File | Implementasi Aktual |
|---|---|
| `apps/api/src/services/payment/manual.ts` | `new Date()` lalu `setHours(+48)` |
| `apps/api/src/services/payment/midtrans.ts` | `new Date()` lalu `setMinutes(+expiryMinutes)` |
| `apps/api/src/services/payment/xendit.ts` | `new Date()` lalu `setMinutes(+expiryMinutes)`, dikirim ISO string |
| `apps/api/src/services/payment/flip.ts` | Mengikuti `expired_date` dari provider |
| `apps/api/src/services/payment/ipaymu.ts` | Mengikuti `Expired` dari provider |

Untuk expiry berbasis durasi absolut, `new Date() + menit/jam` secara instant aman. Masalah muncul jika aturan bisnis mengharuskan cutoff kalender WIB, bukan sekadar durasi.

## Pemakaian Frontend Saat Ini

### Status Konsistensi Frontend

Semua formatter tanggal di admin dan web sudah dimigrasi ke helper WIB. Pemakaian yang masih legitimate dari `date-fns` non-timezone:

| File | Pola yang Masih Diizinkan | Alasan |
|---|---|---|
| `users/page.tsx`, `RecentActivity.tsx` | `formatDistanceToNow(new Date(x), { locale: idLocale })` | Relatif waktu ("3 menit lalu") — timezone tidak kritis untuk presentasi relatif |

Semua pola berikut **sudah sepenuhnya dieliminasi** dari codebase:

| Pola Lama | Pengganti |
|---|---|
| `toLocaleDateString('id-ID')` | `formatDate(x)` dari `@/lib/format` |
| `date-fns format(new Date(x), pat, { locale: ... })` | `formatDateWIB(x, pat)` dari `@/lib/timezone` |
| `new Date().toISOString().split('T')[0]` | `todayWIBDateInput()` dari `@/lib/timezone` |
| `new Date(x).toISOString().slice(0,10)` | `toWIBDateInput(x)` dari `@/lib/timezone` |
| `startOfMonth(new Date())` + format | `startOfMonthWIBInput()` dari `@/lib/timezone` |
| `startOfYear(new Date())` + format | `startOfYearWIBInput()` dari `@/lib/timezone` |

## Input Date dan Date-Only Field

Field date-only di UI banyak memakai `<input type="date">` dengan nilai `yyyy-MM-dd`, tetapi backend/schema menyimpan sebagai `timestamptz`. Contoh domain:

| Domain | Field |
|---|---|
| Campaign | `startDate`, `endDate` |
| Zakat period | `startDate`, `endDate`, `executionDate` |
| Zakat distribution | `reportDate` |
| Qurban package/period/execution | `executionDateOverride`, `executionDate` |
| Disbursement | `transferDate` |
| Activity reports | `activityDate` |
| Transaction payment proof | `paymentDate` |

Risiko utama: string `yyyy-MM-dd` yang diparse dengan `new Date(value)` di JavaScript diperlakukan sebagai midnight UTC, bukan midnight WIB. Untuk field kalender bisnis, parser seharusnya membuat instant `yyyy-MM-ddT00:00:00+07:00` atau menyimpan sebagai date-only jika tidak membutuhkan jam.

## Relasi dengan Modul Activity Reports

`activity_reports.activityDate` memakai `timestamptz`. Admin create/edit mengirim tanggal dari form, public/admin menampilkan dengan campuran `date-fns format` dan `toLocaleDateString`.

Implikasi:

- Jika `activityDate` dimaksudkan sebagai tanggal kegiatan saja, seharusnya diperlakukan sebagai date-only atau midnight WIB.
- Jika tetap `timestamptz`, semua formatter activity report harus eksplisit `Asia/Jakarta`.
- Dokumen detail activity reports ada di `docs/arsitektur-activity-reports.md`.

## Legacy Documents yang Diserap

Dokumen root lama berikut sudah diserap ke dokumen ini:

| File Lama | Status Isi |
|---|---|
| `dokumentasi-timezone-system-wide.md` | Diserap sebagai histori audit dan daftar risiko; line number lama tidak dijadikan source of truth |
| `TIMEZONE-FRONTEND-FIX.md` | Diserap, tetapi klaim global frontend sudah WIB dikoreksi karena kode aktual belum begitu |
| `TIMEZONE-FIX-COMPLETED.md` | Diserap sebagai histori fix backend/frontend; status aktual diverifikasi ulang terhadap kode |

## Gap Implementasi

Gap berikut masih terbuka (formatter tanggal display sudah selesai 100%):

| Gap | Dampak | Rekomendasi |
|---|---|---|
| Date-only field disimpan sebagai `timestamptz` | Semantik kalender bercampur dengan instant | Untuk field murni tanggal, pertimbangkan tipe `date`; jika tetap `timestamptz`, wajib parse midnight WIB |
| `savings-reminder.ts` memakai `setHours` runtime | Bergantung `TZ` process — boundary reminder bisa geser jika `TZ` bukan WIB | Gunakan helper WIB atau pastikan `TZ=Asia/Jakarta` di deployment |
| Backend `addHoursWIB`/`addDaysWIB` memakai `toDate` lalu mutasi local date | Bisa membingungkan semantik instant vs wall-clock | Tambahkan test boundary dan dokumentasikan penggunaan per kasus |
| Environment `TZ=Asia/Jakarta` belum bisa dipastikan dari repo | Runtime lokal/production bisa beda | Enforce di PM2 config / systemd env file |
| Test boundary 00:00-06:59 WIB belum ada | Regresi diam-diam tidak terdeteksi | Buat test untuk nomor qurban, form default, dan SQL grouping |

## SOP Perubahan

1. Jangan memakai `new Date().toISOString().split('T')[0]` untuk tanggal bisnis. Gunakan helper tanggal WIB.
2. Jangan menampilkan timestamp dengan `toLocaleDateString`/`toLocaleString` tanpa `timeZone`.
3. Untuk nomor yang mengandung tahun/bulan/tanggal bisnis, gunakan helper WIB.
4. Untuk query laporan harian/bulanan, boundary dan grouping harus berbasis `Asia/Jakarta`.
5. Untuk date-only form, parse dan serialize sebagai tanggal kalender WIB.
6. Jika mengubah timestamp schema, update `docs/arsitektur-database.md` dan dokumen domain terkait.
7. Jika mengubah formatter publik, update `docs/arsitektur-i18n.md` karena locale dan timezone saling terkait.
8. Jika mengubah payment expiry, update `docs/arsitektur-universal-payment.md` dan `docs/arsitektur-transaksi.md`.

## Status Implementasi

> Terakhir diimplementasi: 2026-07-02 — semua formatter display sudah 100% WIB

| # | Item | Status |
|---|------|--------|
| 1 | SQL grouping WIB — `analytics.ts`, `dashboard.ts`, `reports.ts`, `audit.ts` | ✅ Selesai |
| 2 | `apps/web/src/lib/format.ts` — `formatDate` + `formatDateTime` pakai `formatInTimeZone` + `indonesianLocale` | ✅ Selesai |
| 3 | `apps/web/src/lib/timezone.ts` — tambah `todayWIBDateInput()` + `toWIBDateInput()` | ✅ Selesai |
| 4 | Install `date-fns-tz` di admin, buat `apps/admin/src/lib/timezone.ts` dengan semua helper | ✅ Selesai |
| 5 | Migrate `toISOString().split/slice` (17 lokasi admin & web) ke helper WIB | ✅ Selesai |
| 6 | Migrate `startOfMonth/Year + format` (5 report pages) ke `startOfMonthWIBInput()` / `startOfYearWIBInput()` | ✅ Selesai |
| 7 | Migrate ~51 lokasi `format(new Date(x), pat, { locale: ... })` di seluruh admin ke `formatDateWIB` | ✅ Selesai |
| 8 | Bersihkan semua orphan `idLocale` / `localeId` / `id` locale imports (~35 file) | ✅ Selesai |

### Cakupan Migrasi `formatDateWIB` (Item 7–8)

File admin yang dimigrasikan (total ~44 file, ~75 lokasi):

**Laporan & Statistik:**
`reports/page.tsx`, `reports/mutation/page.tsx`, `reports/category-audit/page.tsx`, `reports/neraca/page.tsx`, `reports/unique-codes/page.tsx`, `reports/rekening/page.tsx`, `reports/revenue-sharing/page.tsx`, `reports/fundraiser/page.tsx`, `reports/mitra/page.tsx`, `reports/donatur/page.tsx`, `reports/program/page.tsx`

**Transaksi & Keuangan:**
`transactions/page.tsx`, `transactions/[id]/page.tsx`, `donations/page.tsx`, `donations/[id]/edit/page.tsx`, `disbursements/[id]/page.tsx`, `ledger/page.tsx`, `ledger/[id]/page.tsx`

**Qurban:**
`qurban/orders/page.tsx`, `qurban/savings/page.tsx`, `qurban/savings/[id]/page.tsx`, `qurban/savings/pending-deposits/page.tsx`, `qurban/periods/[id]/page.tsx`

**Zakat:**
`zakat/donations/page.tsx`, `zakat/distributions/page.tsx`, `zakat/distributions/[id]/page.tsx`, `zakat/periods/[id]/page.tsx`

**Campaign & Lainnya:**
`campaigns/page.tsx`, `campaigns/donations/page.tsx`, `statistics/mustahiq/page.tsx`, `statistics/donatur/page.tsx`

**Komponen:**
`components/fundraiser/RevenueShareDisbursementPanel.tsx`, `components/dashboard/RevenueChart.tsx`, `components/reports/ReportTable.tsx`

**Invoice:**
`invoice/donation/[referenceId]/page.tsx`, `invoice/qurban/[referenceId]/page.tsx`

### Verifikasi Akhir

- `npx tsc --noEmit -p apps/admin/tsconfig.json` → **0 error**
- `npx tsc --noEmit -p apps/web/tsconfig.json` → **0 error**
- `grep -rn "toLocaleDateString('id-ID')" apps/admin/src apps/web/src` → 0 hasil (sudah bersih)
- `grep -rn "format(new Date.*locale:" apps/admin/src` → 0 hasil (sudah bersih)
