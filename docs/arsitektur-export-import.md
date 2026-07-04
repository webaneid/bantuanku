# Arsitektur Export Import

Dokumen ini adalah source of truth untuk mekanisme export/import Bantuanku.

> Terakhir di-sync: 2026-07-04

## Ringkasan

Export di Bantuanku terbagi menjadi dua pola:

1. **CSV server-side**: API admin membuat CSV dan mengirim response `text/csv`.
2. **Excel client-side**: halaman admin reports mengambil data JSON dari API reports, lalu membuat `.xlsx` di browser memakai package `xlsx`.

Import massal tersedia untuk entitas:

| Entitas | Status |
|---------|--------|
| Donatur | ✅ Tersedia (`/admin/donatur/import`) |
| Mustahiq | ✅ Tersedia (`/admin/mustahiqs/import`) |
| Lainnya | Belum diimplementasikan |

## Dokumen Terkait

| Arsitektur Terkait | Alasan Keterkaitan |
|---|---|
| `docs/arsitektur-auth.md` | Role guard endpoint export admin |
| `docs/arsitektur-laporan.md` | Export report memakai data dari Reports API |
| `docs/arsitektur-timezone.md` | Filename, filter tanggal, dan format tanggal export |
| `docs/arsitektur-transaksi.md` | Export donasi/transaksi dan kode unik |
| `docs/arsitektur-disbursement.md` | Export pencairan, cash flow, rekening, liability |
| `docs/arsitektur-akuntansi.md` | Export ledger/accounting/cash flow |
| `docs/arsitektur-donatur.md` | Export statistik donatur |
| `docs/arsitektur-mustahiq.md` | Export statistik mustahiq |
| `docs/arsitektur-zakat.md` | Export laporan zakat |
| `docs/arsitektur-qurban.md` | Export laporan qurban |
| `docs/arsitektur-fundraiser.md` | Export fundraiser/revenue sharing |
| `docs/arsitektur-mitra.md` | Export laporan mitra |

## File Implementasi

| Area | File |
|---|---|
| CSV helper backend | `apps/api/src/services/export.ts` |
| API export umum | `apps/api/src/routes/admin/export.ts` |
| API export statistik | `apps/api/src/routes/admin/statistics.ts` |
| Reports API sumber Excel | `apps/api/src/routes/admin/reports.ts` |
| Excel helper admin | `apps/admin/src/utils/export-excel.ts` |
| Tombol export/cetak report | `apps/admin/src/components/reports/ExportButton.tsx` |
| Filter laporan admin | `apps/admin/src/components/reports/ReportFilters.tsx` |
| Halaman statistik donatur/mustahiq | `apps/admin/src/app/dashboard/statistics/**` |
| Halaman laporan Excel | `apps/admin/src/app/dashboard/reports/**` |
| **Import donatur (API)** | `apps/api/src/routes/admin/donatur-import.ts` |
| **Import mustahiq (API)** | `apps/api/src/routes/admin/mustahiq-import.ts` |
| **Import donatur (modal)** | `apps/admin/src/components/modals/ImportDonaturModal.tsx` |
| **Import mustahiq (modal)** | `apps/admin/src/components/modals/ImportMustahiqModal.tsx` |

Dependensi:

| Package | Lokasi | Fungsi |
|---|---|---|
| `xlsx` | `apps/admin/package.json` | Membuat file `.xlsx` di browser |
| `papaparse` | `package-lock.json` transitive/tercatat | Tidak ditemukan pemakaian aktif pada kode export/import |

## Export CSV Server-Side

### Helper CSV

File: `apps/api/src/services/export.ts`.

`generateCSV(data, columns)`:

- Membuat header dari `columns.header`.
- Mengambil nilai dari `row[col.key]`.
- Jika `col.format` ada, nilai diformat dahulu.
- Semua cell dibungkus tanda kutip.
- Tanda kutip di dalam nilai di-escape menjadi `""`.
- Baris digabung dengan `\n`.

Formatter yang tersedia:

| Function | Perilaku |
|---|---|
| `formatCurrency(value)` | Hanya menerima `number`; selain number menjadi `Rp 0` |
| `formatDate(value)` | `new Date(value).toLocaleDateString("id-ID", { year, month, day, hour, minute })` |
| `formatBoolean(value)` | Truthy -> `Ya`, falsy -> `Tidak` |

Kolom export predefined:

| Constant | Domain |
|---|---|
| `campaignExportColumns` | Campaign |
| `donationExportColumns` | Donations/transaksi |
| `disbursementExportColumns` | Legacy ledger/disbursement style |
| `userExportColumns` | Users |
| `ledgerExportColumns` | Ledger entries/lines |

### API `/admin/export`

Base route: `/v1/admin/export`.

Route ini dipasang di `apps/api/src/routes/admin/index.ts` dengan guard:

- Global admin auth: role admin panel.
- `admin.use("/export/*", staffOnly)`.
- Handler masing-masing tetap punya `requireRole`.

Endpoint:

| Endpoint | Role Handler | Filter | Output |
|---|---|---|---|
| `GET /admin/export/campaigns` | `super_admin`, `admin_campaign` | `status`, `startDate`, `endDate` by `campaigns.createdAt` | CSV campaign |
| `GET /admin/export/donations` | `super_admin`, `admin_finance` | `campaignId`, `paymentStatus`, `startDate`, `endDate` by `transactions.createdAt` | CSV transactions |
| `GET /admin/export/ledger` | `super_admin`, `admin_finance` | Implementasi pertama: `status`, `startDate`, `endDate` by `ledger.createdAt` | CSV legacy ledger/disbursement columns |
| `GET /admin/export/users` | `super_admin` | `status`, `startDate`, `endDate` by `users.createdAt` | CSV users |
| `GET /admin/export/ledger` | `super_admin`, `admin_finance` | Implementasi kedua: `startDate`, `endDate`, `accountCode`, join `ledgerEntries`, `ledgerLines`, `ledgerAccounts` | CSV ledger accounting |

Catatan kritis: file `apps/api/src/routes/admin/export.ts` mendefinisikan `GET /ledger` dua kali. Pada Hono, route pertama yang match dapat membuat route kedua tidak pernah dipakai, tergantung urutan matching. Ini harus dianggap gap sampai diverifikasi/fix.

Semua response CSV memakai `Content-Disposition: attachment`. Filename dibuat dengan `new Date().toISOString().split("T")[0]`, sehingga tanggal filename mengikuti UTC, bukan WIB.

## Export CSV Statistik

File: `apps/api/src/routes/admin/statistics.ts`.

Endpoint:

| Endpoint | Role | Filter | Output |
|---|---|---|---|
| `GET /admin/statistics/donatur/export` | `super_admin`, `admin_finance`, `admin_campaign` | `startDate`, `endDate` by `donatur.createdAt` | CSV donatur |
| `GET /admin/statistics/mustahiq/export` | `super_admin`, `admin_finance`, `admin_campaign` | `startDate`, `endDate` by `mustahiqs.createdAt` | CSV mustahiq |

Perilaku filter:

- `startDate` diparse dengan `new Date(startDate)`.
- `endDate` diparse dengan `new Date(endDate)` lalu `setHours(23, 59, 59, 999)`.
- Jika tanggal kosong, export semua data.

Admin UI:

- `apps/admin/src/app/dashboard/statistics/donatur/page.tsx`
- `apps/admin/src/app/dashboard/statistics/mustahiq/page.tsx`

UI memanggil endpoint dengan `responseType: "blob"`, membuat `Blob`, membuat object URL, lalu klik anchor download. Filename fallback UI sudah memakai `todayWIBDateInput()`, tetapi backend fallback filename masih memakai `toISOString()`.

## Export Excel Client-Side

File: `apps/admin/src/utils/export-excel.ts`.

### `exportToExcel`

Menerima:

| Parameter | Fungsi |
|---|---|
| `data` | Array object yang akan diexport |
| `columns` | Definisi header, key, width, format |
| `filename` | Nama file tanpa ekstensi |
| `sheetName` | Default `Laporan` |
| `title` | Optional title row |
| `subtitle` | Optional subtitle row |
| `summaryRow` | Optional total/summary row |

Perilaku:

- Workbook dibuat di browser dengan `XLSX.utils.book_new()`.
- Row title/subtitle/header/data/summary dibuat sebagai array of arrays.
- Column width diisi dari `columns.width` atau minimal panjang header.
- Title row di-merge sepanjang jumlah kolom.
- Sheet name dipotong maksimal 31 karakter.
- File ditulis dengan `XLSX.writeFile(wb, filename + ".xlsx")`.

Format kolom:

| Format | Perilaku Aktual |
|---|---|
| `currency` | Jika value number, value tetap number; tidak diberi format mata uang Excel |
| `date` | Jika value string, dikembalikan apa adanya; jika bukan string, `new Date(val).toLocaleDateString("id-ID")` |
| `number` | Tidak ada perlakuan khusus selain value mentah |
| `text` | Tidak ada perlakuan khusus selain value mentah |

### `exportMultiSheetExcel`

Sama seperti `exportToExcel`, tetapi menerima banyak sheet. Dipakai untuk laporan yang butuh pemisahan pemasukan/pengeluaran/detail.

## Halaman Admin Reports yang Export Excel

Export Excel mengambil data yang sudah difetch halaman dari `/admin/reports/**`; tidak memanggil endpoint khusus `/export`.

| Halaman | Helper | Sumber API |
|---|---|---|
| `reports/program` | `exportToExcel`, `exportMultiSheetExcel` | `/admin/reports/program-summary`, `/admin/reports/program-detail` |
| `reports/zakat` | `exportMultiSheetExcel` | `/admin/reports/zakat` |
| `reports/qurban` | `exportMultiSheetExcel` | `/admin/reports/qurban` |
| `reports/qurban-execution` | `exportMultiSheetExcel` | `/admin/reports/qurban-execution` |
| `reports/cash-flow` | `exportToExcel` | `/admin/reports/cash-flow` |
| `reports/mutation` | `exportToExcel` | Reports mutation data |
| `reports/liability-balance` | `exportToExcel` | `/admin/reports/liability-balance` |
| `reports/rekening` | `exportToExcel` | `/admin/reports/rekening-summary`, `/admin/reports/rekening-detail` |
| `reports/revenue-sharing` | `exportToExcel` | `/admin/reports/revenue-sharing` |
| `reports/fundraiser` | `exportToExcel` | `/admin/reports/fundraiser-summary/detail` |
| `reports/mitra` | `exportToExcel` | `/admin/reports/mitra-summary/detail` |
| `reports/donatur` | `exportToExcel` | `/admin/reports/donor-detail` |
| `reports/unique-codes` | `exportToExcel` | `/admin/reports/unique-codes` |

Komponen `ExportButton` hanya membungkus dua action:

- `onExportExcel`
- `onPrint`

Tidak ada state permission atau audit logging di komponen ini.

## Print Report

`ExportButton` juga menyediakan tombol `Cetak` jika `onPrint` diberikan. Ini bukan export file; umumnya halaman reports memakai print browser lewat handler halaman. Elemen filter dan tombol memakai class `no-print`.

## Import

### Pola Umum (3-step)

Semua fitur import mengikuti pola yang sama:

```
1. GET  /admin/{entity}/import/template   → Download template XLSX
2. POST /admin/{entity}/import/preview    → Dry-run: parse, validasi, cek duplikat
3. POST /admin/{entity}/import/commit     → Tulis ke DB (hanya row valid)
```

**Preview tidak menulis ke DB.** Commit hanya menulis row yang lolos validasi — row error di-skip (dicatat di response).

Parser server-side menggunakan `xlsx` (SheetJS) via `XLSX.read()` + `sheet_to_json()`. File dikirim sebagai `multipart/form-data` dengan field `file`.

---

### Import Donatur

**Endpoint**: `apps/api/src/routes/admin/donatur-import.ts`, dipasang di `/admin/donatur/import`

**Role**: `super_admin`, `admin_finance`, `admin_campaign`

| Endpoint | Fungsi |
|----------|--------|
| `GET /template` | Download template XLSX 10 kolom + 1 baris contoh |
| `POST /preview` | Dry-run: parse XLSX, validasi, cek duplikat, return stats |
| `POST /commit` | Tulis ke DB (mode: `skip` atau `update`) |

**Kolom template** (10 kolom):

| Kolom | Wajib | Keterangan |
|-------|-------|------------|
| Nama Lengkap | ✓ | |
| WhatsApp | ✓ | Deduplikasi utama; `normalizePhone()` sebelum simpan |
| Email | | Deduplikasi sekunder |
| Telepon | | |
| Jenis Kelamin | | `laki-laki` / `perempuan` |
| Tanggal Lahir | | Format `YYYY-MM-DD` |
| Kota | | |
| Provinsi | | |
| Pekerjaan | | |
| Catatan | | |

**Deduplication logic**:
1. In-file: kombinasi WA+email unik (buang duplikat dalam file yang sama)
2. DB by WA: jika WA sudah ada → skip atau update (tergantung mode)
3. DB by email: jika email sudah ada → skip atau update (tergantung mode)

**Mode `skip`** (default): baris duplikat dilewati.
**Mode `update`**: baris duplikat di-update fieldnya.

**Response preview**:
```json
{
  "total": 100,
  "valid": 85,
  "skipped": 10,
  "errors": 5,
  "rows": [{ "row": 2, "status": "valid"|"skip"|"error", "reason": "..." }]
}
```

**Admin UI**: `ImportDonaturModal` di halaman `/dashboard/donatur` — 3-step wizard (upload → preview → result).

---

### Import Mustahiq

**Endpoint**: `apps/api/src/routes/admin/mustahiq-import.ts`, dipasang di `/admin/mustahiqs/import`

**Role**: `super_admin`, `admin_campaign`

| Endpoint | Fungsi |
|----------|--------|
| `GET /template` | Download template XLSX 18 kolom + 1 baris contoh |
| `POST /preview` | Dry-run: parse XLSX, validasi, cek duplikat |
| `POST /commit` | Tulis ke DB |

**Kolom template** (18 kolom):

| Kolom | Wajib | Keterangan |
|-------|-------|------------|
| Nama Lengkap | ✓ | |
| Kategori Asnaf | ✓ | `fakir`/`miskin`/`amil`/`mualaf`/`riqab`/`gharim`/`fisabilillah`/`ibnus_sabil` |
| ID Mustahiq | | Deduplikasi utama (unique constraint DB) |
| Email | | |
| Telepon | | |
| WhatsApp | | |
| NIK | | |
| Tanggal Lahir | | Format `YYYY-MM-DD` |
| Jenis Kelamin | | `laki-laki` / `perempuan` |
| Status Pernikahan | | |
| Jumlah Tanggungan | | Integer |
| Alamat | | |
| Bank | | |
| No. Rekening | | |
| Nama Pemilik Rekening | | |
| Catatan | | |

**Deduplication**: by `mustahiqId` (unique constraint di DB). Duplikat dalam file di-skip.

**Admin UI**: `ImportMustahiqModal` di halaman `/dashboard/master/mustahiqs`.

---

### SOP Import Entitas Baru

Saat menambah import untuk entitas baru, ikuti pola ini:

1. Buat `apps/api/src/routes/admin/{entity}-import.ts` dengan 3 endpoint
2. Pasang route di file utama entitas: `app.route("/import", importRoute)`
3. Buat modal 3-step di `apps/admin/src/components/modals/Import{Entity}Modal.tsx`
4. Tambahkan tombol Import di halaman list entitas
5. Dokumentasikan di sini: kolom template, required fields, dedup logic, mode
6. **Jangan commit tanpa preview step** — preview wajib ada untuk menghindari data rusak massal

## Keamanan dan Role

| Jalur | Guard |
|---|---|
| `/admin/export/*` | `staffOnly`, lalu role spesifik per endpoint |
| `/admin/statistics/*/export` | `staffOnly`, lalu `super_admin`, `admin_finance`, `admin_campaign` |
| Excel client-side reports | Akses mengikuti halaman reports dan API `/admin/reports/*` |

Role `mitra` tidak masuk `staffOnly`, sehingga tidak bisa mengakses `/admin/export/*`, `/admin/statistics/*`, atau `/admin/reports/*`.

Gap: export client-side tidak punya endpoint export khusus, sehingga audit akses export bergantung pada akses API data dan action UI, bukan pada event export tersendiri.

## Format dan Encoding

| Format | Implementasi |
|---|---|
| CSV umum `/admin/export/*` | `Content-Type: text/csv` |
| CSV statistik | `Content-Type: text/csv; charset=utf-8` |
| Excel | `.xlsx` client-side via `xlsx` |

CSV tidak menambahkan BOM UTF-8. Untuk beberapa versi Excel di Windows, karakter Indonesia bisa bermasalah jika Excel salah mendeteksi encoding.

CSV escaping sudah menangani tanda kutip, tetapi belum secara eksplisit menangani mitigasi CSV injection untuk nilai yang diawali `=`, `+`, `-`, atau `@`.

## Gap Implementasi

| Gap | Dampak | Rekomendasi |
|---|---|---|
| `GET /admin/export/ledger` didefinisikan dua kali | Salah satu handler bisa tidak pernah dipakai; perilaku export ledger ambigu | Pisahkan path, misalnya `/ledger-legacy` dan `/ledger-entries`, atau hapus handler lama |
| Import hanya tersedia untuk donatur & mustahiq | Entitas lain (mitra, karyawan, dll.) belum punya import | Tambahkan mengikuti pola 3-step yang sama |
| Filename backend memakai `toISOString()` | Tanggal filename bisa UTC, bukan WIB | Gunakan helper dari `arsitektur-timezone.md` |
| Filter `startDate/endDate` memakai `new Date("yyyy-MM-dd")` | Boundary bisa UTC dan tidak sesuai tanggal bisnis WIB | Parse sebagai date input WIB |
| `formatDate` backend CSV tidak set `timeZone` | Tampilan tanggal bergantung timezone runtime | Format eksplisit `Asia/Jakarta` |
| CSV tidak menambah BOM UTF-8 | Excel Windows bisa salah baca karakter | Pertimbangkan prefix `\uFEFF` untuk CSV yang ditujukan ke Excel |
| CSV belum mitigasi formula injection | Nilai user seperti `=HYPERLINK(...)` bisa dieksekusi Excel | Escape cell yang diawali `=`, `+`, `-`, `@` |
| `formatCurrency` backend hanya menerima number | Numeric string/decimal dari DB bisa jadi `Rp 0` | Normalisasi `Number(value || 0)` dengan handling NaN |
| Excel `currency` tidak diberi number format | User melihat angka mentah, bukan format rupiah Excel | Set cell style/number format jika tetap memakai XLSX |
| Excel `date` string dikembalikan apa adanya | Format tanggal tidak konsisten antar halaman | Normalisasi tanggal di helper atau gunakan `formatDateWIB` |
| Export Excel client-side hanya mengekspor data yang sedang dimuat halaman | Jika halaman memakai pagination, export bisa hanya halaman saat ini | Tambahkan endpoint export server-side atau fetch semua data sebelum export |
| Tidak ada audit log export | Data sensitif bisa diunduh tanpa jejak event export | Tambahkan audit event untuk export penting |
| Tidak ada rate limit khusus export | Export besar bisa membebani API/browser | Tambahkan limit/streaming/background job untuk dataset besar |
| Data sensitif ikut export | NIK, rekening, email, telepon bisa keluar massal | Buat masking/permission granular per kolom |
| Tidak ada kontrak schema export stabil | Perubahan kolom bisa silent breaking untuk user operasional | Versikan template export atau dokumentasikan kolom wajib |

## SOP Perubahan

1. Semua endpoint export baru wajib mencatat role, filter, sumber data, format output, dan kolom utama di dokumen ini.
2. Jika export memakai tanggal, patuhi `docs/arsitektur-timezone.md`.
3. Jika export berasal dari laporan keuangan, cek `docs/arsitektur-laporan.md` dan `docs/arsitektur-akuntansi.md`.
4. Jika export membawa data personal seperti NIK, nomor rekening, telepon, atau email, wajib evaluasi role dan masking.
5. Import tidak boleh dibuat langsung commit ke database tanpa tahap validasi row, preview error, dan audit trail.
7. Setiap import baru wajib didokumentasikan di section Import dokumen ini sebelum merge.
6. Jika ada helper export baru, hindari membuat formatter tanggal/mata uang baru yang berbeda dari helper existing tanpa alasan kuat.

## Dependensi

| Package | Lokasi | Fungsi |
|---------|--------|--------|
| `xlsx` (SheetJS) | `apps/api/package.json` | Parse XLSX server-side di import handler |
| `xlsx` | `apps/admin/package.json` | Generate XLSX client-side di reports & export Excel |
