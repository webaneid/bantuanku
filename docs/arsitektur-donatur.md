# Arsitektur Donatur

> Terakhir di-sync: 2026-07-02

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
userId          text FK users.id        -- NULL jika belum punya akun

-- Data pekerjaan & penghasilan
jobTitleId      integer FK job_titles.id (SET NULL)
incomeRangeId   integer FK income_ranges.id (SET NULL)

-- Data pribadi
nik             varchar(16)
npwp            varchar(25)
birthPlace      varchar(100)
birthDate       date
gender          varchar(10)             -- "male" | "female"

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

- `donatur.userId` → `users.id` — donatur dengan akun login
- `donatur.provinceCode` → `indonesia_provinces.code` — alamat berjenjang
- `donatur.jobTitleId` → `job_titles.id` — pekerjaan
- `donatur.incomeRangeId` → `income_ranges.id` — penghasilan
- `transactions.donaturId` → `donatur.id` — riwayat transaksi

---

## API Endpoints

### Public/Account (login required)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/account/profile` | Profil donatur sendiri |
| `PUT` | `/v1/account/profile` | Update profil donatur |
| `GET` | `/v1/account/transactions` | Riwayat transaksi |
| `POST` | `/v1/auth/change-password` | Ganti password |
| `POST` | `/v1/auth/forgot-password/request` | Minta OTP reset password |
| `POST` | `/v1/auth/forgot-password/reset` | Reset dengan OTP |

### Admin

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/admin/donatur` | List donatur (paginated, search) |
| `GET` | `/v1/admin/donatur/:id` | Detail donatur |
| `POST` | `/v1/admin/donatur` | Buat donatur baru (dari admin) |
| `PUT` | `/v1/admin/donatur/:id` | Update profil donatur |
| `DELETE` | `/v1/admin/donatur/:id` | Hapus donatur |
| `POST` | `/v1/admin/donatur/:id/change-password` | Ganti password donatur |

---

## Halaman Web (Account)

| Route | Fungsi |
|-------|--------|
| `/account` | Dashboard akun donatur |
| `/account/profile` | Edit profil donatur |
| `/account/transactions` | Riwayat transaksi |
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
```

---

## Sinkronisasi users ↔ donatur

Donatur punya `userId` yang link ke `users`. Tapi profil lengkap (alamat, NIK, NPWP, dll.) ada di tabel `donatur`, bukan `users`.

Saat update profil donatur (`PUT /account/profile`):
- Update tabel `donatur`
- Jika nama/email berubah → sinkronisasi ke tabel `users` juga

---

## Password

Password disimpan di `users.passwordHash` (bcrypt). Kolom `donatur.passwordHash` adalah **legacy** — tidak dipakai untuk auth aktual.

Saat update password donatur dari admin:
- Hash baru disimpan ke `users.passwordHash`
- `donatur.passwordHash` juga diupdate (untuk backward compat)

---

## Auto-Create Donatur (Guest Checkout)

`TransactionService.findOrCreateDonatur()` dipanggil setiap kali transaksi dibuat:
1. Cari donatur by email atau phone (dengan normalisasi format)
2. Jika tidak ketemu → INSERT donatur baru:
   - `email`: diberikan → normalize & simpan; tidak ada → `"donor-{id}@temp.local"`
   - `phone` / `whatsappNumber`: normalize format Indonesia

Guest donatur dengan `email = "donor-xxx@temp.local"` adalah donatur tanpa akun. `userId` nullable — bisa di-link ke akun nyata nanti. Rekening donatur dikelola via `entity_bank_accounts` dengan `entityType = "donatur"`.

---

## Donatur Modal (Admin)

Komponen `DonorModal` dipakai di admin untuk search/select donatur saat membuat transaksi manual. Lihat `arsitektur-donatur-modal.md` untuk detail komponen.

---

## Data Pekerjaan & Penghasilan

Sejak migration 107-108, donatur bisa diisi:
- `jobTitleId` → FK ke `job_titles.id` (dari `job_categories` module)
- `incomeRangeId` → FK ke `income_ranges.id`

Diisi via form profil web atau admin panel.
