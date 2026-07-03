# Arsitektur Mitra

## Ringkasan

Mitra adalah lembaga partner yang dapat mendaftar dari web publik, diverifikasi admin, memiliki profil publik, rekening, akun user opsional, serta ownership terhadap program. Mitra berbeda dari vendor: mitra adalah owner/partner program, sedangkan vendor adalah penyedia barang/jasa.

## Implementasi Terkait

| Area | File |
|------|------|
| Schema | `packages/db/src/schema/mitra.ts` |
| Public API | `apps/api/src/routes/mitra.ts` |
| Admin API | `apps/api/src/routes/admin/mitra.ts` |
| Admin UI | `apps/admin/src/app/dashboard/mitra/**` |
| Public form | `apps/web/src/app/daftar-mitra/page.tsx` |
| Public profile | `apps/web/src/app/mitra/[slug]/page.tsx` |
| URL Registry | `apps/admin/src/lib/url-registry.ts` (kategori Static) |
| Campaign ownership | `packages/db/src/schema/campaign.ts` |
| Zakat ownership | `packages/db/src/schema/zakat-types.ts` |
| Qurban ownership | `packages/db/src/schema/qurban-packages.ts` |

## Model Data

Tabel utama: `mitra`.

| Area | Kolom penting |
|------|---------------|
| Identitas | `name`, `slug`, `description`, `logoUrl` |
| PIC | `picName`, `picPosition` |
| Kontak | `email`, `phone`, `whatsappNumber`, `website` |
| Alamat | `detailAddress`, `provinceCode`, `regencyCode`, `districtCode`, `villageCode` |
| Dokumen | `ktpUrl`, `bankBookUrl`, `npwpUrl` |
| Status | `status`, `verifiedBy`, `verifiedAt`, `rejectionReason` |
| Keuangan | `totalPrograms`, `totalDonationReceived`, `totalRevenueEarned`, `currentBalance`, `totalWithdrawn` |
| User link | `userId` |
| Internal | `notes`, `createdAt`, `updatedAt` |

Status yang digunakan:

| Status | Arti |
|--------|------|
| `pending` | Baru dibuat/daftar, menunggu verifikasi. |
| `verified` | Disetujui dan dapat tampil/aktif. |
| `rejected` | Ditolak dengan alasan opsional. |
| `suspended` | Dinonaktifkan sementara. |

Rekening mitra disimpan di `entity_bank_accounts` dengan `entityType = "mitra"`.

## Endpoint Publik

Base path: `/mitra`.

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/register` | Registrasi mitra publik, status awal `pending`. |
| `POST` | `/upload-document` | Upload dokumen registrasi (KTP/NPWP/buku rekening), tanpa auth. Kategori `document`, maks 5MB gambar / 10MB PDF. Kembalikan `{ url }`. |
| `GET` | `/check-slug/:slug` | Cek ketersediaan slug. |
| `GET` | `/:slug` | Profil publik mitra (hanya status `verified`). |

Profil publik hanya mengembalikan mitra berstatus `verified`. Guard menggunakan `!== "verified"` sehingga `pending`, `rejected`, dan `suspended` semua diblokir.

## Endpoint Admin

Base path: `/admin/mitra`.

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/me` | Authenticated | Mitra melihat profil sendiri. |
| `GET` | `/me/programs` | Authenticated | Mitra melihat program sendiri. |
| `GET` | `/stats` | `super_admin` | Statistik mitra. |
| `GET` | `/` | `super_admin`, `admin_campaign`, `admin_finance` | List mitra. |
| `GET` | `/:id` | `super_admin`, `admin_campaign`, `admin_finance` | Detail mitra. |
| `POST` | `/` | `super_admin` | Buat mitra dari admin. |
| `PUT` | `/:id` | `super_admin` | Update mitra dan rekening. |
| `DELETE` | `/:id` | `super_admin` | Hapus mitra jika tidak punya campaign aktif. |
| `POST` | `/:id/verify` | `super_admin` | Set status `verified`. |
| `POST` | `/:id/reject` | `super_admin` | Set status `rejected`. |
| `POST` | `/:id/suspend` | `super_admin` | Set status `suspended`. |
| `POST` | `/:id/activate` | `super_admin` | Set status `verified`. |
| `POST` | `/:id/activate-user` | `super_admin` | Buat akun user role `mitra`. |
| `GET` | `/:id/programs` | `super_admin`, `admin_campaign`, `admin_finance` | List program milik mitra. |

## Ownership Program

Ownership mitra dibaca dari beberapa pola:

- Campaign memakai `campaigns.mitraId`.
- Zakat type milik mitra dibaca dari `zakatTypes.createdBy = mitra.userId`.
- Qurban package milik mitra dibaca dari `qurbanPackages.createdBy = mitra.userId`.

Endpoint program mitra menggabungkan campaign, zakat type, dan qurban package ke satu list `programs`.

## Revenue Share Mitra

Setiap transaksi `paid` yang terkait dengan program milik mitra akan menghasilkan bagian revenue share untuk mitra tersebut.

- **Kalkulasi**: saat transaksi `paid`, `RevenueShareService.applyMitraRevenue()` dipanggil
- **Balance naik**: `mitra.currentBalance += mitraAmount`, `mitra.totalRevenueEarned += mitraAmount`
- **Resolusi mitraId** per product type:
  - Campaign: `campaigns.mitraId` langsung
  - Zakat: `zakatPeriods.mitraId` → fallback `zakatTypes.createdBy` → `mitra.userId` lookup
  - Qurban: `qurbanPackages.createdBy` → `mitra.userId` lookup
- **Pencairan**: dibuat manual oleh admin via disbursement `disbursementType = "revenue_share"`, `category = "revenue_share_mitra"`
- **Persentase**: dari `amil_mitra_donation_percentage` (campaign) atau `amil_mitra_percentage` (zakat); khusus qurban mitra dapat sisa adminFee setelah bagian amil

> Detail formula, skip conditions, dan alur lengkap: lihat `arsitektur-revenue-share.md`.

---

## Admin UI — Mitra Dashboard

Halaman `/dashboard/mitra` (`apps/admin/src/app/dashboard/mitra/page.tsx`) punya dua branch berdasarkan role:

### Branch: Super Admin / Admin
Menampilkan list semua mitra dengan filter status dan search. Bisa klik ke detail mitra.

### Branch: Mitra (isMitra)
Mitra yang login (`roles = ["mitra"]`) melihat dashboard pribadi:

| Section | Sumber Data | Keterangan |
|---------|-------------|------------|
| Status badge | `mitraMe.status` | Tampilkan status verifikasi |
| Stats (4 kartu) | `mitraMe.*` | Total program, donasi masuk, bagi hasil, saldo |
| Dokumen Registrasi | `mitraMe.ktpUrl`, `bankBookUrl`, `npwpUrl` | Preview gambar (thumbnail + hover overlay) atau ikon PDF + link; hanya tampil jika ada minimal 1 dokumen |
| Program Saya | `GET /admin/mitra/me` → programs | List campaign/zakat/qurban yang dimiliki mitra; klik buka halaman edit program |

**Dokumen Registrasi** — deteksi format:
- URL mengandung `.pdf` → tampilkan ikon dokumen + teks "Lihat PDF" + link buka di tab baru
- URL lainnya → tampilkan `<img>` thumbnail + overlay "Lihat Gambar" saat hover + link buka di tab baru
- URL kosong/null → tampilkan teks "Belum diupload"

Catatan: dokumen diupload saat registrasi via `POST /mitra/upload-document` (no auth, `uploadedBy: null`). Setelah mitra diaktivasi dan login, dokumen tetap dapat dilihat karena URL tersimpan di field `mitra.ktpUrl` / `mitra.bankBookUrl` / `mitra.npwpUrl` yang dikembalikan `GET /admin/mitra/me`.

---

## Catatan Kritis

1. Slug mitra unik tetapi nullable di schema. Public register selalu membuat slug.
2. Admin create dapat langsung membuat user jika password dikirim; public register tidak membuat user otomatis.
3. ~~Delete mitra hanya menolak jika ada campaign aktif.~~ **Sudah diperbaiki** — guard sekarang juga mengecek zakat type dan qurban package yang linked lewat `mitra.userId`.
4. ~~Profil publik saat ini menolak `rejected` dan `suspended`, tetapi tidak menolak `pending`.~~ **Sudah diperbaiki** — guard sekarang `!== "verified"`.
5. Agregat keuangan di tabel `mitra` adalah field tersimpan; laporan program juga menghitung data dari transaksi/program aktual.
6. `postalCode` ada di Zod validation schema (publik dan admin) tetapi tidak ada kolom `postal_code` di tabel `mitra`. Field ini di-destructure dan dibuang — tidak pernah disimpan ke DB.
7. `GET /admin/mitra/me` punya fallback lookup berdasarkan `email` jika mitra tidak ditemukan lewat `userId` (untuk data lama yang belum ter-link). `GET /admin/mitra/me/programs` tidak memiliki fallback ini — mitra lama yang belum link `userId` akan mendapat 404 dari endpoint programs meski `/me` berhasil.

## Gap Implementasi

Semua gap yang ditemukan per 2026-07-03 sudah diperbaiki. Lihat bagian Perbaikan di bawah.

## Perbaikan

> 2026-07-03

| Fix | File | Detail |
|-----|------|--------|
| `GET /me/programs` email fallback | `apps/api/src/routes/admin/mitra.ts` | Tambah fallback lookup berdasarkan `email` jika `userId` tidak ditemukan — konsisten dengan `/me` |
| Hapus `postalCode` dead code | `apps/api/src/routes/mitra.ts`, `apps/api/src/routes/admin/mitra.ts` | Field ada di Zod schema tapi tidak pernah disimpan ke DB; dihapus dari kedua Zod schema dan destruktur handler |
| Perkuat delete guard | `apps/api/src/routes/admin/mitra.ts` | Tambah pengecekan zakat type dan qurban package yang linked lewat `mitra.userId` sebelum delete |
| Block `pending` di profil publik | `apps/api/src/routes/mitra.ts` | Ganti guard `=== "rejected" \|\| === "suspended"` menjadi `!== "verified"` — hanya mitra terverifikasi yang tampil publik |
| Cascading address selector di form publik | `apps/web/src/app/daftar-mitra/page.tsx` | Ganti textarea alamat biasa dengan cascading province→regency→district→village menggunakan endpoint `/v1/indonesia/*` |
| Address selector pakai `<Autocomplete>` | `apps/web/src/app/daftar-mitra/page.tsx` | Ganti `<select>` native dengan komponen `Autocomplete` dari `apps/web/src/components/Autocomplete.tsx` — support search/filter, penting untuk kecamatan/desa yang ribuan pilihan |
| Document upload via file picker | `apps/web/src/app/daftar-mitra/page.tsx`, `apps/api/src/routes/mitra.ts` | Ganti URL text input KTP/NPWP/buku rekening dengan file upload ke endpoint publik `POST /mitra/upload-document` (kategori `document`, GCS/local) |
| Daftarkan `/daftar-mitra` di URL registry | `apps/admin/src/lib/url-registry.ts` | Tambah ke `STATIC_URLS` kategori Static agar bisa dipilih di `URLAutocomplete` component |
| Dokumen Registrasi di mitra dashboard | `apps/admin/src/app/dashboard/mitra/page.tsx` | Tambah section "Dokumen Registrasi" di view mitra (isMitra branch): menampilkan KTP, Buku Rekening, NPWP sebagai thumbnail/preview gambar atau link PDF — data dari `GET /admin/mitra/me` (field `ktpUrl`, `bankBookUrl`, `npwpUrl`) |
