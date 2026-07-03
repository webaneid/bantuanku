# Arsitektur Revenue Share

> Terakhir di-sync: 2026-07-02  
> File utama: `apps/api/src/services/revenue-share.ts`

---

## Dokumen Terkait

| Dokumen | Keterkaitan |
|---------|-------------|
| `arsitektur-transaksi.md` | Revenue share dikalkulasi saat transaksi `paid` |
| `arsitektur-fundraiser.md` | Detail fundraiser, referral tracking, pencairan |
| `arsitektur-akuntansi.md` | Ledger entries untuk setiap bagian revenue |
| `arsitektur-disbursement.md` | Pencairan saldo mitra dan fundraiser |
| `arsitektur-laporan.md` | Laporan revenue share per periode |

---

## Overview

Setiap transaksi yang lunas (`paymentStatus = "paid"`) menghasilkan **satu record `revenue_shares`** yang membagi penerimaan ke empat pihak:

| Pihak | Kolom | Keterangan |
|-------|-------|-----------|
| **Amil (LAZ)** | `amilTotalAmount` / `amilNetAmount` | Hak amil sesuai syariah; `amilNetAmount` = setelah dipotong developer + fundraiser |
| **Developer** | `developerAmount` | Biaya platform — dipotong dari porsi amil |
| **Fundraiser** | `fundraiserAmount` | Komisi referral individu — dipotong dari porsi amil |
| **Mitra** | `mitraAmount` | Lembaga partner — dipotong dari porsi amil (campaign/zakat) atau bagian terpisah (qurban) |
| **Program** | `programAmount` | Sisa yang disalurkan ke tujuan donasi (campaign/zakat saja) |

---

## Schema Database

### `revenue_shares` — Snapshot kalkulasi per transaksi

```
id                  text PK (createId)
transactionId       text FK transactions.id UNIQUE

-- Basis kalkulasi
donationAmount      bigint NOT NULL     -- basis amount (adminFee untuk qurban, totalAmount lainnya)

-- Amil
amilPercentage      decimal(5,2)
amilTotalAmount     bigint              -- total hak amil sebelum potongan internal
amilNetAmount       bigint              -- amilTotalAmount - developer - fundraiser (- mitra untuk non-qurban)

-- Developer (platform fee)
developerPercentage decimal(5,2)
developerAmount     bigint

-- Fundraiser referral
fundraiserPercentage decimal(5,2)
fundraiserAmount    bigint
fundraiserId        text FK fundraisers.id (nullable)

-- Mitra partner
mitraPercentage     decimal(5,2)
mitraAmount         bigint
mitraId             text FK mitra.id (nullable)

-- Program (disalurkan ke penerima manfaat)
programAmount       bigint              -- 0 untuk qurban

status              text DEFAULT "calculated"   -- "calculated" | "distributed"
calculatedAt        timestamptz DEFAULT now()
distributedAt       timestamptz
createdAt / updatedAt timestamptz
```

> **Constraint**: `UNIQUE` pada `transactionId` — satu transaksi hanya punya satu `revenue_shares` record.

---

## Konfigurasi (Settings)

Semua persentase disimpan di tabel `settings` dengan `category = "amil"`:

| Key | Default | Keterangan |
|-----|---------|-----------|
| `amil_donation_percentage` | 20% | Hak amil dari campaign donation |
| `amil_zakat_percentage` | 12.5% | Hak amil dari zakat (1/8 asnaf amil) |
| `amil_qurban_owner_percentage` | 0% | Hak amil dari admin fee qurban |
| `amil_developer_percentage` | 0% | Biaya platform (dipotong dari porsi amil) |
| `amil_fundraiser_percentage` | 0% | Komisi fundraiser (dipotong dari porsi amil) |
| `amil_mitra_percentage` | 0% | Bagian mitra untuk zakat (dipotong dari porsi amil) |
| `amil_mitra_donation_percentage` | 0% | Bagian mitra untuk campaign (dipotong dari porsi amil) |

> Persentase bisa 0 — mitra dan fundraiser hanya dikreditkan jika nilai > 0.  
> Override per-fundraiser: `fundraisers.commissionPercentage` (default 5.00%, tapi global setting yang dipakai di revenue share).

---

## Basis Amount per Product Type

| productType | Basis (`donationAmount`) | Alasan |
|-------------|--------------------------|--------|
| `campaign` | `totalAmount` | Full donasi masuk sebagai basis |
| `zakat` | `totalAmount` | Full zakat masuk sebagai basis |
| `qurban` | `adminFee` | Harga paket = ke mitra qurban; hanya admin fee yang dibagi LAZ/developer |

---

## Formula Kalkulasi

### Campaign & Zakat

```
basis         = totalAmount
amilTotal     = basis × amilPercentage
developer     = basis × developerPercentage
fundraiser    = basis × fundraiserPercentage  (0 jika tidak ada referral)
mitra         = basis × mitraPercentage        (0 jika tidak ada mitra)
amilNet       = amilTotal - developer - fundraiser - mitra
program       = basis - amilTotal
```

**Constraint**: `developer + fundraiser + mitra ≤ amilTotal` (error jika melebihi).

### Qurban (dengan mitra)

```
basis         = adminFee
amilTotal     = basis × amilQurbanOwnerPercentage
developer     = basis × developerPercentage
fundraiser    = basis × fundraiserPercentage
mitra         = basis - amilTotal                 ← sisa setelah amil
amilNet       = amilTotal - developer - fundraiser
program       = 0                                 ← qurban langsung ke hewan, bukan via program
```

### Qurban (tanpa mitra, LAZ kelola sendiri)

```
basis         = adminFee
amilTotal     = basis  (100%)
developer     = basis × developerPercentage
fundraiser    = basis × fundraiserPercentage
mitra         = 0
amilNet       = basis - developer - fundraiser
program       = 0
```

---

## Resolusi Mitra per Product Type

Mitra di-resolve berbeda untuk setiap jenis produk:

| productType | Cara resolve mitraId |
|-------------|----------------------|
| `campaign` | `campaigns.mitraId` langsung |
| `zakat` | `zakatPeriods.mitraId` → fallback: `zakatTypes.createdBy` → lookup `mitra.userId` |
| `qurban` | `qurbanPackages.createdBy` → lookup `mitra.userId` |

> Untuk zakat dan qurban, mitra di-identifikasi dari **siapa yang membuat** paket/tipe — bukan dari kolom FK langsung. Ini memungkinkan mitra mendapat share dari produk yang mereka kontribusikan ke platform.

---

## Skip Conditions (Revenue Share Tidak Dikalkulasi)

| Kondisi | Reason yang dicatat |
|---------|---------------------|
| `typeSpecificData.is_admin_fee_entry = true` | `"qurban_admin_fee_entry"` |
| Campaign dengan `pillar = "Wakaf"` | `"wakaf"` |
| Campaign dengan `pillar = "Fidyah"` | `"fidyah"` |
| Qurban dengan `adminFee = 0` | `"qurban_admin_fee_zero"` |

Untuk skip, `syncFundraiserCommission()` tetap dipanggil dengan `amount = 0` agar referral record di-update ke status `"paid"` tanpa komisi.

---

## Alur Kalkulasi

```
approve-payment (transaksi → "paid")
    │
    └── RevenueShareService.calculateForPaidTransaction(transactionId)
            │
            ├── Cek existing revenue_shares → jika ada, return existing (idempotent)
            ├── Ambil AmilSettings dari tabel settings
            ├── Resolve mitraId per product type
            ├── Cek skip conditions (wakaf, fidyah, adminFee=0)
            │
            ├── Hitung: amilTotal, developer, fundraiser, mitra, amilNet, program
            ├── Validasi: developer + fundraiser + mitra ≤ amilTotal
            │
            ├── INSERT revenue_shares (status: "calculated")
            │     └── Unique constraint catch → return existing jika race condition
            │
            ├── syncFundraiserCommission()
            │     ├── Jika referral belum ada → INSERT + UPDATE fundraiser balance
            │     └── Jika referral ada (status "pending") → UPDATE ke "paid", kredit full amount
            │         (Jika sudah "paid" → hanya kredit delta, untuk kasus re-approval)
            │
            └── applyMitraRevenue()  (jika ada mitra)
                    └── UPDATE mitra: totalDonationReceived, totalRevenueEarned, currentBalance
```

---

## Idempotency

`calculateForPaidTransaction()` aman dipanggil lebih dari sekali:
1. Cek `revenue_shares` by `transactionId` di awal → return existing jika sudah ada
2. Unique constraint di DB sebagai safety net → catch duplicate key error, return existing

---

## Side Effects per Pihak

### Fundraiser
- `fundraiser_referrals.status` → `"paid"`, `paidAt` di-set
- `fundraisers.currentBalance` += `fundraiserAmount` (**hanya saat ini**, tidak saat create transaksi)
- `fundraisers.totalCommissionEarned` += `fundraiserAmount`

### Mitra
- `mitra.totalDonationReceived` += `donationAmount` (basis)
- `mitra.totalRevenueEarned` += `mitraAmount`
- `mitra.currentBalance` += `mitraAmount`

### Amil & Developer
- Tidak ada kolom `currentBalance` di DB untuk amil dan developer.
- **Developer**: porsi tersimpan di `revenue_shares.developerAmount`. Saldo tersedia dihitung real-time dari `SUM(developerAmount) - SUM(committed via disbursement_revenue_share_items)`.
- **Auto-disbursement developer**: `apps/api/src/services/developer-auto-disbursement.ts` menjalankan scheduler harian yang pada tanggal 20 pukul 06:20 WIB otomatis membuat disbursement `revenue_share_developer` jika saldo ≥ Rp 1.000.000.
- Integrasi ledger (akuntansi) dilakukan terpisah via `arsitektur-akuntansi.md`.

---

## API Endpoints

Base path: `/v1/admin/revenue-shares`. Guard: `staffOnly` (excludes `mitra`).

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/admin/revenue-shares` | List semua revenue share (filter: transactionId, fundraiserId, mitraId, status, productType, dateFrom, dateTo, page, limit) |
| `GET` | `/admin/revenue-shares/summary` | Agregat total: amilAmount, developerAmount, fundraiserAmount, mitraAmount, programAmount |
| `GET` | `/admin/revenue-shares/:id` | Detail satu record revenue share + enrichment transaksi, fundraiser, mitra |

> Tidak ada endpoint POST/PUT/DELETE — `revenue_shares` hanya dibuat oleh `RevenueShareService.calculateForPaidTransaction()` dan tidak bisa diubah manual.

---

## Pencairan (Disbursement)

Saldo `currentBalance` yang terakumulasi di `fundraisers` dan `mitra` bisa dicairkan via sistem disbursement:

| Pihak | Min. Pencairan | Biaya Transfer | Endpoint |
|-------|---------------|----------------|---------|
| Fundraiser | Rp 500.000 | Rp 6.500 | `POST /v1/fundraisers/me/disbursements` |
| Mitra | Sesuai kebijakan | Sesuai kebijakan | Admin manual |

Record disbursement di tabel `disbursements`:
```
disbursementType = "revenue_share"
category         = "revenue_share_fundraiser" | "revenue_share_mitra"
recipientType    = "fundraiser" | "mitra"
recipientId      = fundraiser.id | mitra.id
```

Saat disbursement diproses: `currentBalance -= amount` di tabel fundraiser/mitra.

### Relasi Disbursement ↔ Revenue Share

Tabel `disbursement_revenue_share_items` menghubungkan satu disbursement ke satu atau lebih record `revenue_shares`. Ini memungkinkan pelacakan **revenue share mana saja** yang termasuk dalam disbursement tertentu.

```
id                text PK (createId)
disbursementId    text FK disbursements.id  ON DELETE CASCADE
revenueShareId    text FK revenue_shares.id ON DELETE CASCADE
shareType         text NOT NULL             -- "mitra" | "fundraiser" | "developer"
allocatedAmount   bigint NOT NULL

UNIQUE (disbursementId, revenueShareId, shareType)
```

**Lifecycle `revenue_shares.status`:**
```
"calculated"  ← INSERT saat transaksi paid (RevenueShareService)
"distributed" ← (tidak pernah di-set — tidak dipakai oleh sistem saat ini)
```

**Cara sistem melacak commitment:** `disbursement_revenue_share_items` di-INSERT saat status disbursement berubah ke `"submitted"` (`DisbursementService.updateStatus()`). Record ini yang menjadi sumber kebenaran tentang berapa yang sudah terkomit/dibayar dari setiap `revenue_shares`.

```
Availability = revenue_shares.{partnerAmount}
             - SUM(disbursement_revenue_share_items.allocatedAmount WHERE disbursements.status != 'rejected')
```

> **Catatan**: `revenue_shares.status` ("distributed") dan `distributedAt` ada di schema tapi tidak pernah di-set — sistem lebih memilih query langsung ke `disbursement_revenue_share_items` daripada update status field. Field ini adalah backlog yang belum penting karena availability sudah dihitung real-time.

---

## Catatan Penting

1. **Satu transaksi = satu revenue_shares** — tidak ada per-installment revenue share. Kalkulasi hanya terjadi saat `paymentStatus = "paid"` (fully paid).
2. **Developer dan amil tidak punya balance di DB** — hanya tercatat di `revenue_shares`. Rekap via laporan dan ledger.
3. **Qurban berbeda**: mitra qurban dapat porsi mayoritas (sisa setelah amil dari admin fee), bukan persentase kecil seperti zakat/campaign.
4. **`programAmount` = 0 untuk qurban** — tidak ada "program fund" terpisah; penerimaan langsung untuk pembelian hewan.
5. **Wakaf & Fidyah dikecualikan** — diidentifikasi via `campaign.pillar`, bukan via tipe produk.
6. **Override commissionPercentage per fundraiser** — field ada di schema `fundraisers` tapi `RevenueShareService` saat ini menggunakan global `amil_fundraiser_percentage`. Override belum diimplementasikan di kalkulasi.
