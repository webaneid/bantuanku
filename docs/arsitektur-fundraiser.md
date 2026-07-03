# Arsitektur Fundraiser (Influencer)

> Terakhir di-sync: 2026-07-03  
> Nama kode internal: `fundraiser` — dilabel "Influencer" di UI

---

## Overview

Fundraiser adalah individu (donatur atau karyawan) yang mempromosikan donasi via link referral. Setiap donasi yang masuk melalui kode referral mereka menghasilkan komisi.

---

## Schema Database

### `fundraisers`
```
id          text PK (createId)
donaturId   text FK donatur.id (NULL jika murni employee)
employeeId  text FK employees.id (NULL jika murni donatur)
code        text UNIQUE NOT NULL     -- format: "FRS6200001"
slug        text UNIQUE              -- untuk URL halaman mitra
status      text DEFAULT "pending"   -- "pending" | "active" | "suspended"
approvedBy  text FK users.id
approvedAt  timestamptz
commissionPercentage    decimal(5,2) DEFAULT 5.00   -- override global setting (belum dipakai di kalkulasi)
totalReferrals          integer DEFAULT 0
totalDonationAmount     bigint DEFAULT 0
totalCommissionEarned   bigint DEFAULT 0
currentBalance          bigint DEFAULT 0
totalWithdrawn          bigint DEFAULT 0
notes       text
createdAt   timestamptz DEFAULT now()
updatedAt   timestamptz DEFAULT now()
```

> **Catatan FK**: Employee yang apply via `POST /admin/fundraisers/me/apply` bisa memiliki **keduanya** (`donaturId` DAN `employeeId`) jika email employee cocok dengan akun donatur yang sudah ada. Lihat seksi "Registration Flow".

### `fundraiser_referrals`
```
id                  text PK
fundraiserId        text FK fundraisers.id
transactionId       text FK transactions.id
donationAmount      bigint
commissionPercentage decimal(5,2)
commissionAmount    bigint
status              text DEFAULT "pending"   -- "pending" | "paid"
paidAt              timestamptz
notes               text
createdAt           timestamptz DEFAULT now()
updatedAt           timestamptz DEFAULT now()
```

---

## Registration Flow

Ada dua jalur registrasi:

### 1. Donatur (via web publik)
- Endpoint: `POST /v1/fundraisers/register`
- Default status: `"pending"` (kecuali setting `fundraiser_auto_approve = "true"` → langsung `"active"`)
- Tidak butuh rekening bank saat registrasi

### 2. Employee (via admin panel)
- Endpoint: `POST /v1/admin/fundraisers/me/apply`
- Status selalu `"pending"` — tidak ada auto-approve
- **Wajib punya rekening bank dulu** (via `POST /v1/admin/fundraisers/me/save-bank-account`)
- Jika email employee cocok dengan akun donatur, `donaturId` juga di-set → keduanya bisa ter-isi

### 3. Admin membuat langsung
- Endpoint: `POST /v1/admin/fundraisers`
- Status langsung `"active"` + `approvedAt` di-set otomatis — tidak perlu approval flow

---

## Referral Tracking

Ada **dua mekanisme** tracking paralel:

### 1. localStorage 7 hari (web browser)

File: `apps/web/src/lib/referral.ts`

```ts
saveReferralCode(code: string)    // simpan + set expiry 7 hari
getReferralCode(): string | null  // ambil jika belum expired
clearReferralCode()
```

**Entry Points:**
- **URL `?ref=FRS...`** → `ReferralCapture` di `providers.tsx` — auto-save saat ada query param
- **Halaman mitra `/mitra/[slug]`** → `MitraReferralCapture.tsx` — auto-save jika mitra punya fundraiser aktif
  - API `GET /mitra/:slug` mengembalikan `fundraiserCode` (null jika tidak ada fundraiser aktif)
  - Lookup: `mitra.userId` → `donatur.userId` → `fundraisers.donaturId` dengan `status = "active"`
  - Client component `apps/web/src/app/mitra/[slug]/MitraReferralCapture.tsx` memanggil `saveReferralCode(code)` via `useEffect`

**Saat checkout**: `getReferralCode()` dibaca dari localStorage → dikirim sebagai `referred_by_fundraiser_code` ke `POST /v1/transactions`. Jika localStorage kosong (expired setelah 7 hari), API otomatis fallback ke cookie server.

### 2. HTTP Cookie server-side (30 hari default)

Endpoint: `POST /v1/fundraisers/track-referral`

Menyimpan kode ke cookie `fundraiser_ref` (httpOnly, secure, SameSite=Lax). Durasi dari setting `fundraiser_cookie_days` (default 30 hari).

**Dipanggil otomatis** dari `ReferralCapture` (`providers.tsx`) saat `?ref=` terdeteksi, bersamaan dengan `saveReferralCode()`. Non-blocking (fire-and-forget).

**Fallback di API**: `POST /v1/transactions` membaca `getCookie(c, "fundraiser_ref")` jika `referred_by_fundraiser_code` tidak ada di body — menangani kasus localStorage expired (hari ke 8–30).

**Efek gabungan**: donatur yang datang via referral dilindungi oleh dua lapis — localStorage 7 hari (prioritas utama) + cookie 30 hari (fallback). Referral baru menimpa yang lama. Campaign apapun yang didonasi tetap dihitung.

---

## Proteksi Self-Referral

Di `TransactionService` (saat create transaksi): jika kode fundraiser yang dipakai dimiliki oleh donatur yang sama (cocok via `donaturId`, email, atau WhatsApp), komisi **tidak dibuat**. `fundraiser_referrals` tidak di-insert, `totalReferrals` tidak naik.

---

## Komisi & Revenue Share

- **Default rate**: `amil_fundraiser_percentage` dari `settings` (category = "amil"), default 0%
- **Override per fundraiser**: `fundraisers.commissionPercentage` ada di schema, tapi **belum dipakai** di kalkulasi — selalu pakai global setting
- **Qurban**: basis komisi = `adminFee`, bukan `totalAmount`
- **Zakat**: basis komisi = `totalAmount`, rate = `amil_fundraiser_percentage`
- **Dikecualikan**: Campaign dengan `pillar = "Wakaf"` atau `"Fidyah"` → komisi = 0 dan tidak muncul di daftar program yang bisa dibagikan fundraiser

> Detail formula kalkulasi, resolusi mitra, dan semua pihak penerima: lihat `arsitektur-revenue-share.md`

### Timing Kalkulasi

Saat transaksi **dibuat** (`TransactionService.create`):
- INSERT `fundraiser_referrals` (status: `"pending"`, `commissionAmount = 0`, `commissionPercentage = "0.00"` — placeholder)
- UPDATE `fundraisers.totalReferrals + 1`, `totalDonationAmount += totalAmount`
- `currentBalance` dan `totalCommissionEarned` **tidak diubah di sini**

Saat transaksi **paid** (`RevenueShareService.calculateForPaidTransaction`):
- INSERT `revenue_shares` (amil + developer + fundraiser + mitra)
- `syncFundraiserCommission()`:
  - UPDATE `fundraiser_referrals` → status `"paid"`, `paidAt` di-set, `commissionAmount` final
  - UPDATE `fundraisers.currentBalance += commissionAmount` ← **baru naik sekarang**
  - UPDATE `fundraisers.totalCommissionEarned += commissionAmount`

Detail lengkap kalkulasi di `arsitektur-revenue-share.md`.

---

## Pencairan (Disbursement)

- **Minimum**: Rp 500.000
- **Biaya transfer**: Rp 6.500 dipotong dari jumlah yang diterima
- **Flow**: `draft → submitted → approved → paid` (atau `→ rejected`)
  - `draft`: dibuat di service, langsung di-chain ke `submitted` dalam satu request
  - `submitted`: fundraiser sudah ajukan, menunggu review admin
  - `approved` → `paid`: di-handle oleh admin via `POST /v1/admin/disbursements/:id/mark-paid`

Disbursement record di tabel `disbursements` dengan:
```
disbursementType = "revenue_share"
category         = "revenue_share_fundraiser"
recipientType    = "fundraiser"
recipientId      = fundraiser.id
```

Saat disbursement di-`mark-paid`: `DisbursementService.markAsPaid()` mengupdate `fundraisers.totalWithdrawn += paidAmount` dan `fundraisers.currentBalance -= paidAmount`.

---

## API Endpoints

### Public (tanpa auth)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/fundraisers/validate/:code` | Validasi kode fundraiser aktif |
| `POST` | `/v1/fundraisers/track-referral` | Simpan referral ke cookie server-side |

### User/Donatur (auth required)

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/v1/fundraisers/register` | Daftarkan diri sebagai fundraiser |
| `GET` | `/v1/fundraisers/me` | Profil + statistik fundraiser sendiri |
| `GET` | `/v1/fundraisers/me/referrals` | List referral dengan pagination |
| `GET` | `/v1/fundraisers/me/disbursements` | List pencairan |
| `POST` | `/v1/fundraisers/me/disbursements` | Ajukan pencairan |
| `GET` | `/v1/fundraisers/active-programs` | List program aktif untuk di-share |

### Employee via Admin Panel (auth required)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/admin/fundraisers/me` | Profil fundraiser employee |
| `GET` | `/v1/admin/fundraisers/me/has-bank-account` | Cek apakah sudah punya rekening |
| `POST` | `/v1/admin/fundraisers/me/apply` | Daftar sebagai fundraiser (employee) |
| `POST` | `/v1/admin/fundraisers/me/save-bank-account` | Simpan rekening bank (wajib sebelum apply) |
| `GET` | `/v1/admin/fundraisers/me/referrals` | List referral |
| `GET` | `/v1/admin/fundraisers/me/disbursement-availability` | Saldo tersedia + flag `canSubmit` |
| `GET` | `/v1/admin/fundraisers/me/disbursements` | List pencairan |
| `POST` | `/v1/admin/fundraisers/me/disbursements` | Ajukan pencairan |
| `GET` | `/v1/admin/fundraisers/active-programs` | List program aktif untuk di-share |

### Admin Management

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/admin/fundraisers/stats` | Statistik agregat semua fundraiser |
| `GET` | `/v1/admin/fundraisers` | List semua fundraiser (search by code/slug/name) |
| `GET` | `/v1/admin/fundraisers/:id` | Detail fundraiser |
| `POST` | `/v1/admin/fundraisers` | Buat fundraiser baru (langsung active) |
| `PUT` | `/v1/admin/fundraisers/:id` | Update fundraiser |
| `DELETE` | `/v1/admin/fundraisers/:id` | Hapus fundraiser (guard: tidak bisa jika sudah ada referral; hanya super_admin) |
| `POST` | `/v1/admin/fundraisers/:id/approve` | Approve (set active + approvedBy + approvedAt) |
| `POST` | `/v1/admin/fundraisers/:id/suspend` | Suspend fundraiser |
| `POST` | `/v1/admin/fundraisers/:id/activate` | Aktifkan kembali (tanpa update approvedBy) |
| `GET` | `/v1/admin/fundraisers/:id/referrals` | List referral per fundraiser (admin view) |

---

## Halaman

| Route | Fungsi |
|-------|--------|
| `/account/fundraiser` | Dashboard fundraiser (web donatur) |
| `/mitra/[slug]` | Landing page mitra dengan auto-capture referral |
| `/dashboard/fundraisers` | List & manage fundraiser (admin) |
| `/dashboard/my-fundraiser` | Dashboard fundraiser (employee via admin panel) |
| `/dashboard/reports/fundraiser` | Laporan komisi (admin) — gunakan `GET /admin/reports/fundraiser-summary` dan `GET /admin/reports/fundraiser-detail` |

---

## Format Kode Fundraiser

```
FRS6200001
└── FRS = prefix
    └── 620 = kode unik
        └── 0001 = nomor urut (dari COUNT(*) fundraisers + 1)
```

---

## Settings Terkait

| Key | Category | Default | Keterangan |
|-----|----------|---------|------------|
| `amil_fundraiser_percentage` | `amil` | `"5.00"` | Commission rate global |
| `fundraiser_auto_approve` | — | `"false"` | Jika `"true"`, registrasi donatur langsung `"active"` |
| `fundraiser_cookie_days` | — | `"30"` | Durasi cookie tracking server-side (hari) |

---

## Dual-Tracking Saldo Fundraiser

`fundraisers.currentBalance` diupdate oleh `RevenueShareService.syncFundraiserCommission()` saat transaksi paid. Namun `DisbursementService` **tidak membaca `currentBalance`** untuk menentukan saldo tersedia — ia menghitung ulang dari:

```
availability = SUM(revenue_shares.fundraiserAmount
                   WHERE fundraiserId = id
                   AND transactions.paymentStatus = 'paid'
                   AND fundraiserAmount > 0)
             - SUM(disbursement_revenue_share_items.allocatedAmount
                   WHERE disbursements.status IN ('submitted', 'approved', 'paid'))
```

Artinya ada dua sumber kebenaran yang seharusnya sinkron:
- **`fundraisers.currentBalance`** → dipakai di UI dashboard fundraiser (tampilan saldo)
- **`revenue_shares + disbursement_revenue_share_items`** → dipakai saat validasi pencairan

**Potensi drift**: jika `syncFundraiserCommission()` sukses tapi `disbursement_revenue_share_items` korup (atau sebaliknya), kedua angka akan berbeda. Saat ini tidak ada mekanisme reconciliation otomatis.

Response `GET /me/disbursement-availability` menyertakan flag `canSubmit: fundraiser.status === "active" && bankAccounts.length > 0`.

---

## Catatan Penting

1. **FK ganda**: Umumnya fundraiser hanya punya salah satu (`donaturId` atau `employeeId`). Pengecualian: employee yang apply via `me/apply` dan emailnya cocok dengan akun donatur — kedua FK akan ter-set. `findMyFundraiser()` sudah menangani ini dengan OR condition.
2. `currentBalance` naik **hanya saat transaksi `paid`** — bukan saat create. `fundraiser_referrals` di-insert (status `"pending"`, `commissionAmount = 0`) saat create; `syncFundraiserCommission()` mengubah ke `"paid"` dan mengkredit balance saat transaksi approved.
3. Wakaf dan Fidyah **dikecualikan** dari komisi — difilter di `RevenueShareService` berdasarkan `campaign.pillar`.
4. Override `commissionPercentage` per-fundraiser ada di schema tapi **belum digunakan** di kalkulasi — saat ini selalu pakai global `amil_fundraiser_percentage` dari settings.
5. Saldo `currentBalance` (tampilan) dan availability disbursement (dari `revenue_shares`) adalah dua jalur terpisah — lihat seksi "Dual-Tracking" di atas.
6. Status `"suspended"` sudah di-handle di kedua UI (web dan admin panel menampilkan pesan penangguhan). `"inactive"` **tidak ada** di kode — hanya `"pending"`, `"active"`, `"suspended"`. Endpoint `/:id/activate` sudah tersedia untuk reactivate.
7. Aturan pencairan: **minimal Rp 500.000**, **biaya transfer Rp 6.500** dipotong dari jumlah yang diterima. Berlaku di `POST /v1/fundraisers/me/disbursements` (web) dan `POST /v1/admin/fundraisers/me/disbursements` (admin panel).
8. Self-referral tidak menghasilkan komisi — diproteksi di `TransactionService` dengan cek `donaturId`, email, dan WhatsApp.
9. Fundraiser bisa share program dari **mitra manapun**, tidak terbatas pada mitra sendiri. Jika fundraiser juga mitra dan share campaign miliknya sendiri, **kedua komisi (mitra + fundraiser) bisa didapat sekaligus** dari satu transaksi — ini by-design, keduanya dipotong dari porsi amil, tidak saling mengurangi bagian program.
10. Program yang muncul di portal fundraiser untuk dibagikan: **semua campaign aktif (kecuali Wakaf & Fidyah) + semua zakat aktif + semua qurban aktif** — tanpa filter kepemilikan mitra. Ini disengaja agar fundraiser punya pilihan program seluas-luasnya.

---

## Perbaikan

| Tanggal | Isu | Perubahan |
|---------|-----|-----------|
| 2026-07-03 | Admin route `POST /me/disbursements` tidak ada MIN_WITHDRAWAL check & TRANSFER_FEE deduction | Ditambahkan konstanta dan validasi di `apps/api/src/routes/admin/fundraisers.ts` |
| 2026-07-03 | `MitraReferralCapture` belum diimplementasikan | Dibuat `apps/web/src/app/mitra/[slug]/MitraReferralCapture.tsx` + API `GET /mitra/:slug` mengembalikan `fundraiserCode` |
| 2026-07-03 | Helper functions duplikat di dua route file | Diekstrak ke `apps/api/src/lib/fundraiser-helpers.ts` |
| 2026-07-03 | Dokumentasi tidak mencerminkan implementasi aktual | Audit menyeluruh: koreksi status values, endpoint list, formula availability, catatan dual-FK, cookie tracking |
| 2026-07-03 | Referral caching hanya 24 jam, cookie tidak terhubung ke frontend/checkout | localStorage diperpanjang ke 7 hari; `ReferralCapture` sekarang juga panggil `POST /track-referral`; `POST /transactions` fallback ke cookie jika localStorage kosong |
| 2026-07-03 | `active-programs` menampilkan Wakaf & Fidyah padahal tidak ada komisi | Filter `notInArray(campaigns.pillar, ["Wakaf","Fidyah"])` ditambahkan di kedua endpoint `active-programs` |
