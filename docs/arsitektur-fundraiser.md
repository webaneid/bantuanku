# Arsitektur Fundraiser (Influencer)

> Terakhir di-sync: 2026-07-02  
> Nama kode internal: `fundraiser` — dilabel "Influencer" di UI

---

## Overview

Fundraiser adalah individu (donatur atau karyawan) yang mempromosikan donasi via link referral. Setiap donasi yang masuk melalui kode referral mereka menghasilkan komisi.

---

## Schema Database

### `fundraisers`
```
id          text PK (createId)
donaturId   text FK donatur.id (NULL jika employee)
employeeId  text FK employees.id (NULL jika donatur)
code        text UNIQUE NOT NULL     -- format: "FRS6200001"
slug        text UNIQUE              -- untuk URL halaman mitra
status      text DEFAULT "pending"   -- "pending" | "active" | "inactive"
approvedBy  text FK users.id
approvedAt  timestamptz
commissionPercentage    decimal(5,2) DEFAULT 5.00   -- override global setting
totalReferrals          integer DEFAULT 0
totalDonationAmount     bigint DEFAULT 0
totalCommissionEarned   bigint DEFAULT 0
currentBalance          bigint DEFAULT 0
totalWithdrawn          bigint DEFAULT 0
notes       text
```

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
```

---

## Referral Tracking (localStorage 24 jam)

File: `apps/web/src/lib/referral.ts`

```ts
saveReferralCode(code: string)   // simpan + set expiry 24 jam
getReferralCode(): string | null  // ambil jika belum expired
clearReferralCode()
```

### Entry Points
1. **URL `?ref=FRS...`** → `ReferralCapture` di `providers.tsx` — auto-save saat ada query param
2. **Halaman mitra `/mitra/[slug]`** → `MitraReferralCapture.tsx` — save ref otomatis jika mitra punya fundraiser aktif

### Saat Checkout
Field `referred_by_fundraiser_code` dikirim ke `POST /v1/transactions`. API lookup fundraiser by code → simpan `referredByFundraiserId` di transaksi.

Saat transaksi dibuat → `fundraiser_referrals` dibuat (status `"pending"`). `currentBalance` **tidak naik** saat ini — hanya naik saat transaksi benar-benar `paid` via `RevenueShareService`.

---

## Komisi & Revenue Share

- **Default rate**: `amil_fundraiser_percentage` dari `settings` (category = "amil"), default 0%
- **Override per fundraiser**: `fundraisers.commissionPercentage` ada di schema, tapi **belum dipakai** di kalkulasi
- **Qurban**: basis komisi = `adminFee`, bukan `totalAmount`
- **Dikecualikan**: Campaign dengan `pillar = "Wakaf"` atau `"Fidyah"` → komisi = 0

> Detail formula kalkulasi, resolusi mitra, dan semua pihak penerima: lihat `arsitektur-revenue-share.md`

### Timing Kalkulasi

Saat transaksi **dibuat** (`TransactionService.create`):
- INSERT `fundraiser_referrals` (status: `"pending"`, `commissionAmount = 0`, `commissionPercentage = "0.00"` — placeholder, nilai final dari RevenueShareService)
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
- **Biaya transfer**: Rp 6.500 dipotong dari jumlah
- **Flow**: `submitted → approved → paid`

Endpoint: `POST /v1/fundraisers/me/disbursements`

Disbursement record di tabel `disbursements` dengan:
```
disbursementType = "revenue_share"
category         = "revenue_share_fundraiser"
recipientType    = "fundraiser"
recipientId      = fundraiser.id
```

---

## API Endpoints

### User (login required)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/fundraisers/me` | Profil fundraiser sendiri |
| `GET` | `/v1/fundraisers/me/stats` | Statistik referral & komisi |
| `GET` | `/v1/fundraisers/me/referrals` | List referral |
| `GET` | `/v1/fundraisers/me/disbursements` | List pencairan |
| `POST` | `/v1/fundraisers/me/disbursements` | Ajukan pencairan |

### Admin

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/admin/fundraisers` | List semua fundraiser |
| `GET` | `/v1/admin/fundraisers/:id` | Detail fundraiser |
| `POST` | `/v1/admin/fundraisers` | Daftarkan fundraiser baru |
| `PUT` | `/v1/admin/fundraisers/:id` | Update fundraiser |
| `POST` | `/v1/admin/fundraisers/:id/approve` | Approve fundraiser |
| `GET` | `/v1/admin/revenue-shares` | Laporan revenue share |

---

## Halaman

| Route | Fungsi |
|-------|--------|
| `/account/fundraiser` | Dashboard fundraiser (web) |
| `/mitra/[slug]` | Landing page mitra dengan auto-capture referral |
| `/dashboard/fundraisers` | List & manage fundraiser (admin) |
| `/dashboard/my-fundraiser` | Dashboard fundraiser (employee) |
| `/dashboard/reports/fundraiser` | Laporan komisi (admin) |

---

## Format Kode Fundraiser

```
FRS6200001
└── FRS = prefix
    └── 620 = kode unik (auto-increment atau acak)
        └── 0001 = nomor urut
```

---

## Dual-Tracking Saldo Fundraiser

`fundraisers.currentBalance` diupdate oleh `RevenueShareService.syncFundraiserCommission()` saat transaksi paid. Namun `DisbursementService` **tidak membaca `currentBalance`** untuk menentukan saldo tersedia — ia menghitung ulang dari:

```
availability = SUM(revenue_shares.fundraiserAmount WHERE fundraiserId = id)
             - SUM(disbursement_revenue_share_items.allocatedAmount
                   WHERE disbursements.status != 'rejected')
```

Artinya ada dua sumber kebenaran yang seharusnya sinkron:
- **`fundraisers.currentBalance`** → dipakai di UI dashboard fundraiser (tampilan saldo)
- **`revenue_shares + disbursement_revenue_share_items`** → dipakai saat validasi pencairan

**Potensi drift**: jika `syncFundraiserCommission()` sukses tapi `disbursement_revenue_share_items` korup (atau sebaliknya), kedua angka akan berbeda. Saat ini tidak ada mekanisme reconciliation otomatis.

---

## Catatan Penting

1. Fundraiser bisa terhubung ke **donatur** ATAU **employee** — tidak keduanya sekaligus.
2. `currentBalance` naik **hanya saat transaksi `paid`** — bukan saat create. `fundraiser_referrals` di-insert (status `"pending"`, `commissionAmount = 0`) saat create; `syncFundraiserCommission()` mengubah ke `"paid"` dan mengkredit balance saat transaksi approved.
3. Wakaf dan Fidyah **dikecualikan** dari komisi — difilter di `RevenueShareService` berdasarkan `campaign.pillar`.
4. Override `commissionPercentage` per-fundraiser ada di schema tapi **belum digunakan** di kalkulasi — saat ini selalu pakai global `amil_fundraiser_percentage` dari settings.
5. Saldo `currentBalance` (tampilan) dan availability disbursement (dari `revenue_shares`) adalah dua jalur terpisah — lihat seksi "Dual-Tracking" di atas.
