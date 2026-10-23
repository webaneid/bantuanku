# Arsitektur Donatur

> Terakhir di-sync: 2026-07-04

---

## Overview

Donatur adalah entitas utama yang melakukan donasi. Setiap donatur bisa terhubung ke akun `users` (jika punya login), tapi bisa juga berdiri sendiri (donasi guest). Tabel `donatur` menyimpan profil lengkap terpisah dari `users`.

---

## Schema Database

### `donatur`
```
id              text PK (createId)
email           text UNIQUE NOT NULL
passwordHash    text                    -- legacy, auth aktual via users.id
name            text NOT NULL
phone           text
whatsappNumber  text

website         text

-- Alamat (Indonesia Address System)
detailAddress   text                    -- jalan, nomor, RT/RW
provinceCode    text FK indonesia_provinces.code
regencyCode     text FK indonesia_regencies.code
districtCode    text FK indonesia_districts.code
villageCode     text FK indonesia_villages.code

-- Link ke akun login
userId          text FK users.id ON DELETE SET NULL  -- NULL jika belum punya akun

-- Data pekerjaan & penghasilan
jobTitleId      integer FK job_titles.id (ON DELETE SET NULL)
incomeRangeId   integer FK income_ranges.id (ON DELETE SET NULL)

-- Data pribadi
nik             varchar(16)
npwp            varchar(25)
birthPlace      varchar(100)
birthDate       date
gender          varchar(10)             -- "laki-laki" | "perempuan"

avatar          text

-- Statistik (denormalized)
totalDonations  bigint DEFAULT 0        -- jumlah transaksi
totalAmount     bigint DEFAULT 0        -- total rupiah
-- CATATAN: totalDonations/totalAmount TIDAK PERNAH diperbarui kode manapun (selalu 0). Jangan dipakai sebagai sumber angka; hitung dari transactions (payment_status='paid', donatur_id). Export donatur sudah memakai hitungan nyata.

-- Verifikasi
emailVerifiedAt     timestamptz
phoneVerifiedAt     timestamptz

-- Status
isActive        boolean DEFAULT true
isAnonymous     boolean DEFAULT false

lastLoginAt     timestamptz
createdAt / updatedAt   timestamptz
```

---

## Relasi

- `donatur.userId` → `users.id` ON DELETE SET NULL — donatur dengan akun login; jika user dihapus, donatur tetap ada dengan userId = NULL
- `donatur.provinceCode` → `indonesia_provinces.code` — alamat berjenjang
- `donatur.jobTitleId` → `job_titles.id` ON DELETE SET NULL
- `donatur.incomeRangeId` → `income_ranges.id` ON DELETE SET NULL
- `transactions.donaturId` → `donatur.id` — riwayat transaksi

---

## API Endpoints

### Public/Account (login required)

Semua endpoint profil donatur ada di prefix `/v1/auth/me` dan `/v1/account/`.

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/auth/me` | Profil donatur sendiri + data akun |
| `PATCH` | `/v1/auth/me` | Update profil donatur (nama, kontak, alamat, dll) |
| `PATCH` | `/v1/auth/me/password` | Ganti password sendiri |
| `GET` | `/v1/auth/me/profile-data` | Profil per entity type (donatur/employee/mitra) |
| `PATCH` | `/v1/auth/me/profile` | Update profil per entity type |
| `GET` | `/v1/account/donations` | Riwayat donasi donatur sendiri |
| `GET` | `/v1/transactions/my` | Riwayat semua transaksi (dipakai di web frontend) |
| `POST` | `/v1/auth/forgot-password/request-otp` | Minta OTP reset password via WhatsApp |
| `POST` | `/v1/auth/forgot-password/reset` | Reset password dengan OTP |

> **Catatan:** URL halaman web donatur (`/account/profile`, `/account/transactions`) adalah **URL halaman web** (frontend), bukan path API. API yang dipanggil oleh halaman tersebut adalah `/auth/me` dan `/transactions/my`.

### Admin

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/v1/admin/donatur` | staff | List donatur (paginated, search nama/email/phone) |
| `GET` | `/v1/admin/donatur/:id` | staff | Detail donatur + bank accounts + statistik donasi |
| `GET` | `/v1/admin/donatur/:id/donations` | staff | Riwayat transaksi donatur (semua role staff bisa akses) |
| `POST` | `/v1/admin/donatur` | super_admin, admin_campaign | Buat donatur baru |
| `PUT` | `/v1/admin/donatur/:id` | super_admin, admin_campaign | Update profil donatur (field `password` opsional untuk ganti password) |
| `DELETE` | `/v1/admin/donatur/:id` | super_admin | Hapus donatur (ada delete guard cek transaksi) |
| `POST` | `/v1/admin/donatur/:id/activate-user` | super_admin | Buat akun login untuk donatur yang belum punya akun |

> **Ganti password donatur dari admin:** dilakukan via `PUT /:id` dengan field `password` — tidak ada endpoint tersendiri.

### Public (Guest)

| Method | Path | Fungsi |
|--------|------|--------|
| ~~`GET`~~ | ~~`/v1/donatur/search`~~ | **Dihapus 2026-10-24** (mengembalikan `id` dan data tersamar; tidak dipakai lagi). |
| `POST` | `/v1/donatur/check` | Body `{ identifier }` (email, atau HP/WhatsApp). Jawab `{ type, registered, hasAccount }` — **tanpa id dan tanpa data pribadi**. Rate limit sama dengan `/search`. Dipakai checkout satu-isian (2026-10-24); server mencari donatur sendiri saat membuat transaksi. |
| ~~`POST`~~ | ~~`/v1/donatur`~~ | **Dihapus 2026-10-24** (donatur dibuat server saat transaksi; endpoint ini mengembalikan `id` donatur yang sudah ada). |

---

## Export CSV Donatur

Path: `GET /v1/admin/statistics/donatur/export`
Role: `super_admin`, `admin_finance`, `admin_campaign`
Filter: `startDate`, `endDate`

Kolom yang diekspor: name, email, phone, whatsappNumber, nik, npwp, gender, birthPlace, birthDate, jobTitleName, jobCategoryName, incomeRangeLabel, provinceName, regencyName, districtName, villageName, detailAddress, **riwayat donasi** (`Riwayat Donasi`: transaksi `paid` per donatur), totalDonations, totalAmount (keduanya dihitung dari transaksi `paid`, bukan dari kolom DB), isActive, hasAccount (punya akun login), lastLoginAt, createdAt.

---

## Halaman Web (Account)

| Route | Fungsi |
|-------|--------|
| `/account` | Dashboard akun donatur |
| `/account/profile` | Edit profil donatur (API: `GET/PATCH /auth/me`) |
| `/account/transactions` | Riwayat transaksi (API: `GET /transactions/my`) |
| `/account/qurban-savings` | Tabungan qurban |
| `/account/fundraiser` | Profil fundraiser (jika aktif) |

### Tampilan Halaman Akun (redesign 2026-10-24)

Semua halaman `/account/*` memakai cangkang yang sama (`apps/web/src/app/account/layout.tsx`):

| Area | Mobile (< lg) | Desktop (lg ke atas) |
|---|---|---|
| Navigasi | **bar bawah mengambang** (`AccountBottomNav`, `z-[1030]`): Beranda, Riwayat, Qurban, Profil (aktif = lingkaran primary); Influencer lewat aksi cepat dashboard; Keluar di hero dashboard dan di bawah halaman Profil | bar atas (logo, Kembali ke Beranda, avatar) + sidebar dengan kartu pengguna dan menu (aktif = primary) |
| Kepala halaman | `AccountPageHeader`: hero gradasi primary, sudut bawah membulat, tombol kembali opsional (detail tabungan) | judul biasa di atas konten |
| Isi | kartu bersudut besar (`rounded-2xl shadow-sm`) di atas latar abu, teks berjarak 15px | tabel baku dan kartu seperti sebelumnya |

- `/account` (dashboard): hero dengan total kontribusi (`stats.totalAmount`) + tombol "Donasi Sekarang" (`/program`), lima aksi cepat melingkar (Riwayat, Tabungan Qurban, Qurban, Influencer, Profil), ubin ringkasan (donasi berhasil, menunggu bayar), kartu kelengkapan profil (hilang bila 100%), daftar transaksi terbaru; desktop 2/3 transaksi + 1/3 ringkasan. Aturan alihkan ke profil bila empat isian wajib belum lengkap tidak berubah.
- `/account/transactions`: filter berbentuk pil bergulir; mobile = kartu, desktop = tabel baku.
- `/account/qurban-savings`: mobile = kartu berprogres, desktop = tabel baku; detail memakai kartu progres (token tema, bukan warna mentah), mobile menaruh form setor sebelum riwayat.
- `/account/fundraiser`: kartu status + link referral (tombol Salin/WhatsApp setinggi 48px), tab berbentuk pil, tabel referral dan panel pencairan tetap.
- `/account/profile`: kartu per bagian; di mobile ada tombol Keluar di bawah.
- Gotcha CSS: aturan global `ul { padding-left }` membuat daftar kartu menjorok; daftar kartu memakai `m-0 list-none p-0`.

| `/register` | Daftar akun baru |
| `/login` | Login |
| `/forgot-password` | Reset password via OTP WA |

---

## Registrasi & Login Flow

```
Register:
  POST /v1/auth/register
  { email, password, name, phone, whatsappNumber }
  → Buat record users
  → Buat record donatur (linked ke userId)
  → Return accessToken + refreshToken

Login:
  POST /v1/auth/login
  { email, password }
  → Cari di users (by email)
  → verifyPassword(input, passwordHash)
  → signToken(payload, JWT_SECRET, "15m")
  → Return { user, accessToken, refreshToken }

Forgot Password:
  POST /v1/auth/forgot-password/request-otp  { phone }
  → Cari donatur/user by phone (normalisasi format)
  → Kirim OTP 6 digit via WhatsApp
  → OTP valid 5 menit, max 5 percobaan

  POST /v1/auth/forgot-password/reset  { phone, otp, newPassword }
  → Verifikasi OTP
  → Update passwordHash di users
```

---

## Sinkronisasi users ↔ donatur

Donatur punya `userId` yang link ke `users`. Profil lengkap (alamat, NIK, NPWP, dll.) ada di tabel `donatur`, bukan `users`.

Saat update profil donatur (`PATCH /auth/me` atau `PUT /admin/donatur/:id`):
- Update tabel `donatur`
- Jika nama/email berubah → sinkronisasi ke tabel `users` juga

---

## Password

Password disimpan di `users.passwordHash` (bcrypt). Kolom `donatur.passwordHash` adalah **legacy** — tidak dipakai untuk auth aktual.

Saat update password donatur:
- Hash baru disimpan ke `users.passwordHash`
- `donatur.passwordHash` juga diupdate (untuk backward compat)

---

## Auto-Create Donatur (Guest Checkout)

`TransactionService.findOrCreateDonatur()` dipanggil setiap kali transaksi dibuat:
1. Cari donatur by email atau phone (dengan normalisasi format via `normalizePhone` dari `lib/contact-helpers`)
2. Jika tidak ketemu → INSERT donatur baru:
   - `email`: diberikan → normalize & simpan; tidak ada → `"donor-{id}@temp.local"`
   - `phone` / `whatsappNumber`: normalize format Indonesia

Guest donatur dengan `email = "donor-xxx@temp.local"` adalah donatur tanpa akun. `userId` nullable — bisa di-link ke akun nyata nanti.

---

## Rekening Bank Donatur

Rekening donatur dikelola via `entity_bank_accounts` dengan `entityType = "donatur"` dan `entityId = donatur.id`. Diisi via form profil web atau `PATCH /auth/me`.

---

## Data Pekerjaan & Penghasilan

Sejak migration 107-108, donatur bisa diisi:
- `jobTitleId` → FK ke `job_titles.id`
- `incomeRangeId` → FK ke `income_ranges.id`

Diisi via form profil web atau admin panel.

---

## Normalisasi Kontak

Semua normalisasi phone number menggunakan `normalizePhone` dari `apps/api/src/lib/contact-helpers.ts`. Fungsi ini dipanggil di:
- `auth.ts` (register, forgot-password)
- `account.ts` (matching transaksi by phone)
- `admin/donatur.ts` (via `normalizeContactData`)

Tidak ada inline implementasi `normalizePhone` di route files — semua import dari lib.

---

## Gap Implementasi

| Gap | Prioritas | Status |
|-----|-----------|--------|
| ~~gender disimpan "male"/"female" di mustahiq, tidak konsisten dengan donatur "laki-laki"/"perempuan"~~ | P1 | ✅ Diperbaiki 2026-07-04 (migration 116) |
| ~~`donatur.userId` FK tanpa ON DELETE SET NULL~~ | P2 | ✅ Diperbaiki 2026-07-04 (migration 117) |
| ~~Export CSV donatur tidak include alamat, whatsapp, npwp, isActive~~ | P2 | ✅ Diperbaiki 2026-07-04 |
| ~~Riwayat transaksi donatur tidak bisa dilihat admin_campaign~~ | P2 | ✅ Diperbaiki 2026-07-04 |
| ~~normalizePhone duplikat di 3 tempat~~ | P3 | ✅ Diperbaiki 2026-07-04 |
| ~~console.log debug aktif di /auth/me dan POST /admin/donatur~~ | P2 | ✅ Diperbaiki 2026-07-04 |
| Tidak ada filter isActive di list admin donatur | P3 | Open |
| Pagination UI hardcode limit 100 | P3 | Open |
