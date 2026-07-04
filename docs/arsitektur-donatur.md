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
| `GET` | `/v1/donatur/search` | Cari donatur by email/phone untuk guest checkout |
| `POST` | `/v1/donatur` | Buat donatur baru (guest checkout) |

---

## Export CSV Donatur

Path: `GET /v1/admin/statistics/donatur/export`
Role: `super_admin`, `admin_finance`, `admin_campaign`
Filter: `startDate`, `endDate`

Kolom yang diekspor: name, email, phone, whatsappNumber, nik, npwp, gender, birthPlace, birthDate, jobTitleName, jobCategoryName, incomeRangeLabel, provinceName, regencyName, districtName, villageName, detailAddress, totalDonations, totalAmount, isActive, hasAccount (punya akun login), lastLoginAt, createdAt.

---

## Halaman Web (Account)

| Route | Fungsi |
|-------|--------|
| `/account` | Dashboard akun donatur |
| `/account/profile` | Edit profil donatur (API: `GET/PATCH /auth/me`) |
| `/account/transactions` | Riwayat transaksi (API: `GET /transactions/my`) |
| `/account/qurban-savings` | Tabungan qurban |
| `/account/fundraiser` | Profil fundraiser (jika aktif) |
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
