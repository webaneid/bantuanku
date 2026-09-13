# Arsitektur Import Donatur

> Dibuat: 2026-07-04

---

## Overview

Fitur import memungkinkan admin menambah banyak donatur sekaligus dari file Excel (.xlsx) atau CSV. Data yang sudah ada di spreadsheet lama (dari sistem lain atau Google Sheet) bisa dimigrasikan tanpa input manual satu per satu.

Linked dari: `arsitektur-donatur.md`

---

## Prinsip Desain

1. **Preview sebelum commit** — file diparse dan divalidasi dulu, admin melihat hasilnya sebelum data masuk DB. Tidak ada perubahan DB sampai admin konfirmasi.
2. **WhatsApp sebagai identifier utama** — nomor WhatsApp wajib diisi. Dipakai sebagai kunci deduplication bersama email.
3. **Alamat parsial** — template menyertakan kolom `Alamat Lengkap` (teks bebas) tapi tidak menyertakan kode province/regency/district/village. Admin bisa melengkapi via form edit setelah import.
4. **Dua mode duplikat** — `skip` (default) dan `update`. Keduanya tidak menghentikan proses — baris yang skip/update dicatat di hasil.
5. **Minim library** — satu library tambahan: `xlsx` (SheetJS) untuk parse .xlsx. CSV didukung natively.

---

## Template

### Kolom Template

| Kolom Header | Field DB | Wajib | Validasi |
|---|---|---|---|
| Nama | `name` | ✅ | min 2 karakter |
| WhatsApp | `whatsappNumber` | ✅ | normalisasi format Indonesia (0812...) |
| Email | `email` | — | format email valid jika diisi |
| Telepon | `phone` | — | normalisasi jika diisi |
| Alamat Lengkap | `detailAddress` | — | teks bebas (nama jalan, RT/RW, dst) |
| Jenis Kelamin | `gender` | — | `laki-laki` atau `perempuan` |
| NIK | `nik` | — | 16 digit angka |
| NPWP | `npwp` | — | teks |
| Tempat Lahir | `birthPlace` | — | teks |
| Tanggal Lahir | `birthDate` | — | format `YYYY-MM-DD` (misal: `1990-05-20`) |
| Catatan | `notes` | — | teks bebas |

### Field yang TIDAK ada di template (by design)
- Kode provinsi/kabupaten/kecamatan/desa — diisi manual via edit setelah import
- Bank accounts — terlalu kompleks untuk flat import
- jobTitleId, incomeRangeId — referential lookup, tidak praktis di Excel
- isActive — default `true` untuk semua baris import

### File contoh
`GET /admin/donatur/import/template` mengembalikan file `.xlsx` dengan:
- Baris 1: header (nama kolom)
- Baris 2: contoh data (untuk panduan format)
- Sheet: "Import Donatur"

---

## Endpoint API

### `GET /admin/donatur/import/template`
Download file template .xlsx.

**Role:** semua staff  
**Response:** file `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

### `POST /admin/donatur/import/preview`
Upload file, parse, validasi, kembalikan preview. **Tidak menulis ke DB.**

**Role:** `super_admin`, `admin_campaign`  
**Content-Type:** `multipart/form-data`  
**Body:** field `file` (xlsx atau csv)  
**Query:** `?mode=skip` (default) atau `?mode=update`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRows": 50,
    "validRows": 47,
    "errorRows": 3,
    "duplicateRows": 5,
    "rows": [
      {
        "rowNumber": 2,
        "status": "valid",
        "data": { "name": "Budi", "whatsappNumber": "081234567890", ... }
      },
      {
        "rowNumber": 4,
        "status": "error",
        "errors": ["WhatsApp wajib diisi", "NIK harus 16 digit"],
        "data": { "name": "Siti", ... }
      },
      {
        "rowNumber": 7,
        "status": "duplicate",
        "duplicateType": "whatsapp",
        "existingId": "abc123",
        "data": { ... }
      }
    ]
  }
}
```

Status per baris: `valid` | `error` | `duplicate`

---

### `POST /admin/donatur/import/commit`
Commit hasil import ke DB. Hanya baris berstatus `valid` yang diproses; `error` selalu dilewati.

**Role:** `super_admin`, `admin_campaign`  
**Content-Type:** `multipart/form-data`  
**Body:** field `file` (file yang sama dengan preview)  
**Query:** `?mode=skip` (default) atau `?mode=update`

**Mode:**
- `skip` — baris duplikat dilewati (tidak diupdate)
- `update` — baris duplikat diupdate dengan data dari file (field kosong di file TIDAK menimpa data yang sudah ada di DB)

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 42,
    "skipped": 5,
    "updated": 0,
    "errors": 3,
    "details": [...]
  }
}
```

---

## Logika Deduplication

Urutan pengecekan per baris:

1. **Duplikat dalam file** — jika WhatsApp atau email sudah muncul di baris sebelumnya dalam file yang sama → status `error` (bukan `duplicate`)
2. **Duplikat dengan DB by WhatsApp** — WhatsApp yang sudah ada di tabel donatur → status `duplicate`
3. **Duplikat dengan DB by email** — email yang sudah ada di tabel donatur → status `duplicate`
4. Jika lolos semua cek → status `valid`

Pada commit:
- Baris `error` → selalu dilewati (tidak bisa diforce)
- Baris `duplicate` + mode `skip` → dilewati, counter `skipped++` (resolusi conflict, lihat di bawah, diabaikan total di mode ini)
- Baris `duplicate` + mode `update` → update field yang tidak kosong di file, counter `updated++`. Field yang **selalu** bisa diupdate (kalau tidak kosong di file): `name`, `phone`, `detailAddress`, `gender`, `nik`, `npwp`, `birthPlace`, `birthDate`.
- Baris `valid` → insert baru, counter `imported++`

### Conflict Resolution untuk Email/WhatsApp (v1.1)

`email` dan `whatsappNumber` adalah dedup key — keduanya **tidak otomatis ikut ter-update** seperti field lain, karena mengubahnya bisa berarti "menggabungkan" identitas donatur secara tidak sengaja. Saat baris `duplicate` punya field lain (bukan yang jadi dasar match) yang nilainya beda dari data di DB, preview response menyertakan objek `conflict`:

```json
{
  "rowNumber": 3, "status": "duplicate", "duplicateType": "whatsapp", "existingId": "...",
  "conflict": {
    "field": "email",
    "existingValue": "email.lama@x.com",
    "newValue": "email.baru@x.com",
    "conflictsWithOtherDonatur": false
  }
}
```

- `conflictsWithOtherDonatur: false` → aman ditimpa, admin bisa pilih via checkbox di step Preview ("Timpa {field} lama dengan yang baru").
- `conflictsWithOtherDonatur: true` → nilai baru di file **sudah dipakai donatur lain** (bukan yang match) — UI tidak menawarkan pilihan sama sekali, hanya menampilkan peringatan. Kalau tetap dipaksa lewat API langsung (`resolutions: {"3":"overwrite"}`), commit akan menolak baris itu dengan `status: "error"`, bukan crash constraint DB.

Admin memilih resolusi per-baris di step Preview (checkbox, default tidak dicentang = pertahankan data lama). Pilihan dikirim saat commit lewat field `resolutions` (JSON string, `{"<rowNumber>": "overwrite"}`) di multipart form data — tidak ada entry untuk suatu baris berarti "keep" (perilaku lama, backward compatible).

**Catatan implementasi**: pengecekan `conflictsWithOtherDonatur` memakai data yang sama dari batch query dedup (tidak ada query tambahan) — dan berlaku silang antar dua donatur berbeda: kalau baris file match ke donatur A via WhatsApp TAPI emailnya ternyata milik donatur B yang berbeda, sistem mendeteksi ini sebagai konflik yang diblokir walau match utamanya tetap ke A (diverifikasi lewat testing nyata, kasus ini genuinely terjadi kalau data di file "menyilang" dua donatur sekaligus).

---

## Normalisasi Data

Saat parse dan saat commit, data dinormalisasi menggunakan fungsi yang sama dengan jalur input lain:

- **WhatsApp / Telepon**: `normalizePhone()` dari `lib/contact-helpers` — konversi `+6281...` / `6281...` → `0812...`
- **Email**: lowercase + trim
- **Gender**: case-insensitive match, termasuk alias singkat — `"laki-laki"`, `"laki"`, `"l"` → disimpan `"laki-laki"`; `"perempuan"`, `"wanita"`, `"p"` → disimpan `"perempuan"`
- **Tanggal lahir**: terima `YYYY-MM-DD` ATAU format export Indonesia `"D MMMM YYYY[ pukul HH.MM]"` (misal `"22 Mei 2003 pukul 07.00"`) — lihat `parseBirthDate()`. Format lain sama sekali tidak dikenali → **field ini di-skip dengan warning, baris tetap valid** (tidak menggagalkan seluruh baris — lihat § Field Opsional Invalid di bawah)
- **NIK**: strip spasi, cek 16 digit angka. Kalau tidak valid (termasuk placeholder seperti `"0"`, `"123"`, `"-"`, `"000000"`) → **field ini di-skip dengan warning, baris tetap valid**
- **Alamat**: kolom "Alamat Lengkap" (nama di template) ATAU "Alamat Detail" (nama kolom di file hasil export donatur) diterima sebagai alias satu sama lain
- **Email kosong**: jika WhatsApp ada tapi email kosong → sistem generate `donor-{id}@temp.local` saat commit (kolom `donatur.email` adalah `UNIQUE NOT NULL` di DB, jadi tidak bisa dikosongkan)
- **Telepon kosong**: jika kolom "Telepon" kosong di file → `phone` di-fallback ke nilai WhatsApp (`donatur-import.ts:428`)

### Field Opsional Invalid: Skip Field, Bukan Gagalkan Baris (v1.2)

Sebelumnya (sampai 2026-09-13), NIK dan Tanggal Lahir yang formatnya salah membuat **seluruh baris** berstatus `error` — padahal keduanya field opsional. Ini terbukti jadi penyebab utama kegagalan import saat diuji dengan data export donatur client sungguhan (26% baris gagal, mayoritas karena tanggal lahir format `"22 Mei 2003 pukul 07.00"` dan NIK placeholder).

Sekarang: field opsional yang invalid **di-skip saja** (tidak diisi ke `data`), baris tetap `valid`/`duplicate` seperti biasa, dan pesan penjelasan masuk ke `RowResult.warnings` (array baru, terpisah dari `errors`):

```json
{ "rowNumber": 23, "status": "valid", "warnings": ["NIK \"0\" tidak valid (harus 16 digit angka), field ini dilewati"], "data": { "name": "...", ... } }
```

Field yang **tetap** menggagalkan seluruh baris (blocking, tidak berubah): Nama kosong, WhatsApp kosong/tidak valid, Email format salah (kalau diisi), Jenis Kelamin nilai tidak dikenal (kalau diisi), dan WhatsApp/email duplikat dalam file yang sama.

**Diverifikasi dengan data export donatur client sungguhan** (194 baris): sebelum fix 142 valid/51 error, sesudah fix 186 valid/6 error (sisa 6 murni WhatsApp duplikat dalam file — proteksi yang memang harus tetap gagal, bukan bug).

---

## Alur Frontend

```
Halaman /dashboard/donatur
  └── Tombol "Import Donatur"
        └── Buka modal ImportDonaturModal
              ├── Step 1: Upload
              │     ├── Download template (.xlsx)
              │     ├── Drag & drop atau pilih file
              │     ├── Pilih mode: Skip duplikat / Update duplikat
              │     └── Tombol "Analisa File" → POST /preview
              │
              ├── Step 2: Preview
              │     ├── Ringkasan: X valid, Y error, Z duplikat
              │     ├── Tabel preview semua baris (status + data + error message)
              │     ├── Filter: tampilkan semua / hanya error / hanya duplikat
              │     └── Tombol "Import Sekarang" → POST /commit
              │
              └── Step 3: Hasil
                    ├── Ringkasan: X berhasil diimpor, Y dilewati, Z gagal
                    └── Tombol "Selesai" → refresh list donatur
```

---

## Implementasi

| Area | File |
|------|------|
| Route API | `apps/api/src/routes/admin/donatur-import.ts` |
| Mount ke router | `apps/api/src/routes/admin/donatur.ts` — `donaturAdmin.route("/import", donaturImportRoute)` |
| Frontend modal | `apps/admin/src/components/modals/ImportDonaturModal.tsx` |
| Halaman donatur | `apps/admin/src/app/dashboard/donatur/page.tsx` — tombol "Import" di header |
| Library | `xlsx` (SheetJS) di `apps/api/package.json` |

---

## Gap & Batasan (v1)

| Batasan | Alasan | Plan |
|---------|--------|------|
| Alamat cascade (province-desa) tidak diimport | Potensi mismatch nama → kode | v2: fuzzy match atau pilih dari dropdown |
| Bank accounts tidak diimport | One-to-many tidak praktis di flat Excel | v2: sheet terpisah atau endpoint terpisah |
| Max baris: 1.000 per file | Cegah timeout, file besar butuh background job | v2: async import dengan progress |
| Format tanggal harus YYYY-MM-DD | Parser ketat untuk cegah ambiguitas | Cantumkan di template dan panduan |
| **Dedup WhatsApp tidak dijamin DB** — kolom `donatur.whatsapp_number` tidak punya unique constraint (hanya `email` yang `UNIQUE`). Dedup saat import murni cek aplikasi (`SELECT` sebelum `INSERT`), berpotensi race condition kalau dua proses (commit import ganda, atau import + registrasi donatur normal) berjalan bersamaan pada WhatsApp yang sama | Desain awal `donatur` tidak mewajibkan WhatsApp unik (banyak donatur historis tanpa WhatsApp) | Perlu keputusan: tambah unique index parsial (`WHERE whatsapp_number IS NOT NULL`) — cek dulu tidak ada duplikat existing di data produksi sebelum migrasi, atau terima risiko karena commit import adalah aksi manual staff (bukan concurrent user-facing flow) |
| Tipe `duplicateType: "in_file"` ada di kode (backend & frontend) tapi tidak pernah di-assign — duplikat dalam file diklasifikasikan `status: "error"`, bukan `duplicate` | Sisa desain versi sebelumnya yang berubah, belum dibersihkan | Cleanup: hapus `"in_file"` dari union type di `donatur-import.ts:57` dan `ImportDonaturModal.tsx:20` |
