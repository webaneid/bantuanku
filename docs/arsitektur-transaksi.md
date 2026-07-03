# Arsitektur Transaksi (Universal Model)

> Terakhir di-sync: 2026-07-02 (audit implementasi lengkap — route paths, service methods, schema details)

---

## Dokumen Terkait

Transaksi adalah pusat dari seluruh sistem. Dokumen ini perlu dibaca bersama arsitektur berikut untuk gambaran utuh:

| Dokumen | Keterkaitan |
|---------|-------------|
| `arsitektur-universal-payment.md` | Flow web invoice, metode pembayaran manual/QRIS/gateway, upload bukti, UniversalInvoice (PDF), expiry, dan webhook |
| `arsitektur-donasi.md` | Spesifik campaign/donasi: pillar, target, snapshot produk |
| `arsitektur-zakat.md` | Spesifik zakat: zakat_type, kalkulator nisab, period |
| `arsitektur-qurban.md` | Spesifik qurban: paket, periode, shared group, tabungan, dual model legacy |
| `arsitektur-donatur.md` | `findOrCreateDonatur()`, profil donatur, riwayat transaksi |
| `arsitektur-fundraiser.md` | Komisi fundraiser, referral tracking, pencairan |
| `arsitektur-revenue-share.md` | Formula lengkap revenue share: amil, developer, mitra, fundraiser |
| `arsitektur-akuntansi.md` | Ledger integration, double-entry, COA category mapping |
| `arsitektur-disbursement.md` | Sisi pengeluaran: dana keluar dari hasil penerimaan transaksi |
| `arsitektur-notifikasi.md` | WhatsApp notification saat transaksi dibuat dan saat payment approved |
| `arsitektur-laporan.md` | Laporan keuangan, rekap per kategori, export transaksi |

---

## Overview

Model transaksi universal menggantikan tabel-tabel payment spesifik per modul. Satu `transactions` record bisa punya banyak `transaction_payments` (mendukung cicilan dan multi-payment).

---

## Schema Database

### `transactions` — Order utama

```
id                  text PK (createId)
transactionNumber   text UNIQUE NOT NULL    -- contoh: "TRX-20250702-12345" (5-digit numeric suffix)

-- Referensi produk (polymorphic)
productType         text NOT NULL           -- "campaign" | "zakat" | "qurban"
productId           text NOT NULL           -- ID produk (campaignId, zakatTypeId, dll.)

-- Snapshot produk (denormalized untuk display & invoice)
productName         text NOT NULL
productDescription  text
productImage        text

-- Detail order
quantity            integer DEFAULT 1
unitPrice           bigint NOT NULL
subtotal            bigint NOT NULL
adminFee            bigint DEFAULT 0        -- nullable (tidak ada .notNull() di schema)
totalAmount         bigint NOT NULL
uniqueCode          integer DEFAULT 0       -- kode unik untuk manual transfer

-- Data donatur
donorName           text NOT NULL
donorEmail          text
donorPhone          text
isAnonymous         boolean DEFAULT false

-- Asosiasi user (nullable = guest checkout OK)
userId              text FK users.id
donaturId           text FK donatur.id

-- Pembayaran
paymentMethodId     text
bankAccountId       text FK bank_accounts.id  -- rekening LAZ tujuan
paymentStatus       text DEFAULT "pending"    -- pending | processing | partial | paid | failed | cancelled | expired
paidAmount          bigint DEFAULT 0
paidAt              timestamptz

-- Data spesifik per tipe (JSON)
typeSpecificData    jsonb

-- Kategori & tipe
category            text NOT NULL           -- "campaign_donation" | "zakat_maal" | "zakat_fitrah" | "qurban_payment" | "qurban_savings" | dll.
transactionType     text DEFAULT "income"   -- "income" | "expense"

message             text                    -- pesan dari donatur
notes               text                    -- catatan internal

-- Fundraiser
referredByFundraiserId  text

-- Integrasi ledger
ledgerEntryId       text

createdAt / updatedAt   timestamptz
```

### `transaction_payments` — Pembayaran per transaksi

```
id                  text PK (createId)
paymentNumber       text UNIQUE NOT NULL
transactionId       text FK transactions.id (CASCADE)

-- Detail pembayaran
amount              bigint NOT NULL
paymentDate         timestamptz
paymentMethod       text NOT NULL           -- "bank_transfer" | "qris" | dll.
paymentChannel      text

-- Cicilan
installmentNumber   integer                 -- nomor cicilan jika ada

-- Bukti & verifikasi
paymentProof        text                    -- URL gambar
verifiedBy          text FK users.id
verifiedAt          timestamptz
rejectedBy          text FK users.id
rejectedAt          timestamptz

-- Status
status              text DEFAULT "pending"  -- pending | verified | rejected
rejectionReason     text

-- Gateway (QRIS, VA, dll.)
externalId          text
paymentCode         text
paymentUrl          text
qrCode              text
expiredAt           timestamptz
gatewayCode         text
webhookPayload      jsonb

-- Integrasi ledger
ledgerEntryId       text

notes               text
createdAt / updatedAt   timestamptz
```

---

## Kontrak POST /transactions

**Satu transaksi = satu produk**. Tidak ada `items[]`. Body diteruskan langsung ke `TransactionService.create()`.

```ts
// CreateTransactionDTO (apps/api/src/services/transaction.ts)
{
  product_type: "campaign" | "zakat" | "qurban",
  product_id: string,          // campaignId | zakatPeriodId | packagePeriodId
  quantity?: number,           // default 1
  unit_price?: number,
  admin_fee?: number,
  donor_name: string,
  donor_email?: string,
  donor_phone?: string,
  donatur_id?: string,
  is_anonymous?: boolean,
  message?: string,
  payment_method_id?: string,
  type_specific_data?: Record<string, any>,
  user_id?: string,
  include_unique_code?: boolean,
  referred_by_fundraiser_code?: string,
}
```

Cart multi-item → frontend membuat **N transaksi terpisah** (satu per item).

---

## Category Values (aktual dari getCategoryFromTransaction)

| productType | Kondisi | category |
|-------------|---------|----------|
| `campaign` | semua | `campaign_donation` |
| `zakat` | name contains "fitrah" | `zakat_fitrah` |
| `zakat` | name contains "maal" | `zakat_maal` |
| `zakat` | name contains "profesi/penghasilan" | `zakat_profesi` |
| `zakat` | name contains "pertanian" | `zakat_pertanian` |
| `zakat` | name contains "peternakan" | `zakat_peternakan` |
| `zakat` | name contains "bisnis/perdagangan" | `zakat_bisnis` |
| `zakat` | default | `zakat_maal` |
| `qurban` | `type_specific_data.payment_type = "savings"` | `qurban_savings` |
| `qurban` | lainnya | `qurban_payment` |

**Wakaf bukan kategori terpisah** — tetap `campaign_donation` dengan `pillar = "Wakaf"` di `typeSpecificData`.

---

## Status Flow (lengkap)

### `transactions.paymentStatus`
```
pending
  │
  ├── upload-proof       → processing   (menunggu verifikasi admin)
  │                         paidAmount += uploaded_amount
  │
  ├── approve-payment:
  │     paidAmount >= totalAmount → paid     (lunas, side effects trigger)
  │     paidAmount <  totalAmount → partial  (cicilan, side effects TIDAK trigger)
  │
  ├── reject-payment → failed
  │     paidAmount -= rejected_pending_amount  (rollback agar tidak terinfasi)
  │
  ├── partial + upload-proof → processing   (lanjut cicilan)
  │
  └── (gateway webhook expired) → cancelled
```

Nilai yang dipakai implementasi: `pending | processing | partial | paid | failed | cancelled | expired`

> Kolom pakai tipe `text`, bukan enum DB — tidak ada constraint di level PostgreSQL.
> Gateway webhook `expired` (iPaymu/Xendit/Flip) dipetakan ke `cancelled`, bukan `expired`.
> `PUT /transactions/:id` bisa set manual ke status apapun (termasuk `failed` dan `expired`) oleh admin_finance.

### `transaction_payments.status`
```
pending → verified
        → rejected
```

---

## API Endpoints

Semua route ada di file `apps/api/src/routes/transactions.ts` (satu file, bukan split admin/public).
Auth guard diterapkan per-route: `authMiddleware` + `requireRole()` inline di masing-masing handler.

### Tanpa Auth (Guest OK)

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/v1/transactions` | Buat transaksi baru (guest & login) |
| `GET` | `/v1/transactions/:id` | Detail satu transaksi |
| `POST` | `/v1/transactions/:id/upload-proof` | Upload bukti bayar (multipart) |
| `POST` | `/v1/transactions/:id/confirm-payment` | Konfirmasi metode bayar |
| `GET` | `/v1/transactions/:id/qris` | Generate QR code QRIS dinamis |

### Login Required (semua role)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/transactions/my` | Riwayat transaksi user yang sedang login |

### Admin (super_admin / admin_finance)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/transactions` | List semua transaksi (filter by product_type/status/donatur) |
| `POST` | `/v1/transactions/:id/payments` | Buat payment record manual |
| `POST` | `/v1/transactions/:id/approve-payment` | Verifikasi pembayaran |
| `POST` | `/v1/transactions/:id/reject-payment` | Tolak pembayaran |
| `PUT` | `/v1/transactions/:id` | Update data transaksi |

---

## TransactionService

File: `apps/api/src/services/transaction.ts`

| Method | Keterangan |
|--------|-----------|
| `create(dto)` | Buat transaksi baru: fetch produk snapshot, findOrCreateDonatur, generate uniqueCode, insert transaksi, insert fundraiser_referral jika ada ref code |
| `getById(id)` | Detail transaksi + enrichment per tipe: zakat → `zakat_type_name`, `zakat_period_name`, `year`, `hijri_year`; campaign → `pillar` |
| `getByTransactionNumber(num)` | Lookup by transactionNumber (format: `TRX-YYYYMMDD-NNNNN`) |
| `list(filters)` | List transaksi dengan filter `product_type`, `product_id`, `status`, `donor_email`, `donatur_id`, `page`, `limit`. **Otomatis exclude** row dengan `typeSpecificData->>'is_admin_fee_entry' = true` (admin fee companion entry) |
| `assignSharedGroup(orderId, packagePeriodId)` | Untuk qurban patungan: cari grup yang `slotsFilled < maxSlots`, atau buat grup baru jika semua penuh |
| `confirmSharedGroupSlot(orderId)` | Increment `slotsFilled` pada grup saat payment di-approve |
| `releaseSharedGroupSlot(orderId)` | No-op hook — reserved untuk future slot reservation logic |

### Format `transactionNumber`

```
TRX-{YYYYMMDD}-{NNNNN}
      ↑                ↑
      tanggal      5-digit numeric timestamp suffix (Date.now() % 100000)
```

Contoh: `TRX-20250702-83412`

### Filter `is_admin_fee_entry`

Beberapa transaksi qurban membuat dua record: satu untuk harga paket dan satu untuk admin fee.
Entry admin fee ditandai `typeSpecificData.is_admin_fee_entry = true` dan disembunyikan dari `list()`.

---

## Alur Create Transaksi

```
POST /v1/transactions  (tanpa auth — guest checkout OK)
    │
    → TransactionService.create(body)
        │
        ├── getProduct(product_type, product_id)    → fetch snapshot
        ├── getCategoryFromTransaction(...)          → tentukan category
        ├── findOrCreateDonatur({ name, email, phone })
        │     └── jika guest tanpa email → email: "donor-{id}@temp.local"
        ├── generateUniqueCode()
        ├── INSERT transactions
        ├── Jika referred_by_fundraiser_code:
        │     └── INSERT fundraiser_referrals (status: "pending")
        │     └── UPDATE fundraisers.currentBalance += commissionAmount  ⚠️
        └── Return transaction
    │
    → WhatsApp notification (async, fire-and-forget)
    → Meta CAPI event (async, fire-and-forget)
```

⚠️ **Known Risk**: `currentBalance` fundraiser naik saat transaksi **dibuat**, bukan saat **verified**. Saldo bisa terlihat sebelum pembayaran lunas. Revenue share dihitung ulang saat approve dengan `RevenueShareService`.

---

## Alur Verifikasi Pembayaran (approve-payment)

```
POST /v1/transactions/:id/approve-payment
    │
    ├── Cek status: hanya "pending" | "processing" | "partial" yang bisa di-approve
    │
    ├── Fetch pending transaction_payments → amountVerifiedNow (total yg di-approve sekarang)
    │
    ├── Tentukan newPaymentStatus:
    │     paidAmount >= totalAmount  → "paid"
    │     paidAmount <  totalAmount  → "partial"   (cicilan belum lunas)
    │
    ├── UPDATE transactions: paymentStatus = newPaymentStatus
    │     paidAt di-set HANYA jika newPaymentStatus = "paid"
    │
    ├── UPDATE transaction_payments (pending → verified)
    │
    ├── UPDATE bank balance += amountVerifiedNow  (selalu, per-installment)
    │
    └── Jika newPaymentStatus = "paid" saja:
          ├── UPDATE campaigns.collected + donorCount (campaign)
          ├── confirmSharedGroupSlot (qurban patungan)
          ├── RevenueShareService.calculateForPaidTransaction()
          │     ├── Skip jika wakaf/fidyah (pillar-based)
          │     ├── Basis qurban = adminFee (bukan totalAmount)
          │     └── Distribute: amil + developer + fundraiser + mitra
          ├── WhatsApp "payment_approved" ke donatur
          ├── WhatsApp ke mitra & fundraiser
          └── Meta CAPI Purchase event
    
    Untuk qurban_savings (semua status, bukan hanya paid):
    └── syncQurbanSavingsBalance() + WhatsApp wa_tpl_savings_deposit (per setoran)
```

> **Penting untuk cicilan / tabungan qurban**: Setiap setoran yang di-approve menaikkan bank balance sebesar `amountVerifiedNow`. Side effect finansial (campaign.collected, revenue share, slot qurban, CAPI) hanya trigger sekali saat status → "paid". Dengan ini, partial payment benar-benar ditangani — tidak lagi auto-`"paid"` meski baru bayar sebagian.

## Alur Penolakan Pembayaran (reject-payment)

```
POST /v1/transactions/:id/reject-payment
    │
    ├── Cek status: "pending" | "processing" | "partial"
    │
    ├── Fetch pending transaction_payments → rejectedAmount
    │
    ├── UPDATE transactions:
    │     paymentStatus = "failed"
    │     paidAmount = GREATEST(0, paidAmount - rejectedAmount)   ← rollback
    │
    ├── UPDATE transaction_payments (pending → rejected, simpan rejectionReason)
    │
    └── WhatsApp "payment_rejected" ke donatur (dengan invoice_url untuk retry)
```

> `paidAmount` di-rollback saat reject agar saldo tidak terinflasi jika donatur re-upload bukti baru.

---

## Revenue Share Subsystem

> Detail lengkap formula, resolusi mitra, dan semua pihak: lihat `arsitektur-revenue-share.md`

File: `apps/api/src/services/revenue-share.ts`

Saat transaksi `paid`, `RevenueShareService.calculateForPaidTransaction()` membagi revenue ke empat pihak: amil (LAZ), developer (platform fee), fundraiser (referral), mitra (lembaga partner). Satu record `revenue_shares` di-insert per transaksi (idempotent via unique constraint).

**Basis kalkulasi**:
- Campaign/Zakat: `totalAmount`
- Qurban: `adminFee` (bukan harga paket)

**Skip conditions**: Wakaf, Fidyah (by campaign pillar), Qurban adminFee = 0, admin fee entry.

---

## Invoice

Satu transaksi memiliki dua representasi invoice yang berbeda tujuan.

### Invoice Web (Universal)

Route: `apps/web/src/app/invoice/[id]/`

| Route | Komponen | Fungsi |
|-------|----------|--------|
| `/invoice/[id]` | `UniversalInvoice` | Tampilkan status transaksi, opsi bayar, download PDF |
| `/invoice/[id]/payment-method` | `UniversalPaymentMethodSelector` | Pilih metode bayar |
| `/invoice/[id]/payment-detail` | `UniversalPaymentDetailSelector` | Detail VA/QRIS/manual, upload bukti |

- Mengambil data dari `GET /v1/transactions/:id` (universal endpoint).
- Mendukung semua `productType`: campaign, zakat, qurban.
- PDF di-generate client-side dengan `html2canvas` + `jsPDF`.
- Bisa diakses tanpa login (shareable link untuk donatur).
- Detail lengkap di `arsitektur-universal-payment.md`.

### Invoice Admin (Per-Modul, Legacy)

Route: `apps/admin/src/app/(public)/invoice/`

| Route | API yang Dipanggil | Tipe Data |
|-------|-------------------|-----------|
| `/invoice/donation/[referenceId]` | `GET /donations/invoice/:referenceId` | Donasi (legacy) |
| `/invoice/qurban/[referenceId]` | `GET /qurban/orders/by-number/:referenceId` | Qurban order (legacy) |
| `/invoice/zakat/[referenceId]` | `GET /zakat/donations/invoice/:referenceId` | Zakat (legacy) |

- Masing-masing halaman render invoice spesifik per modul (bukan universal).
- Aksi utama: **Print** (`window.print()`) dan **Copy link**.
- Berada di route group `(public)` admin — tidak memerlukan auth admin untuk diakses.
- Mengambil data dari endpoint legacy masing-masing modul, bukan dari tabel `transactions`.
- Masih relevan selama data legacy (donations, zakat_donations, qurban_orders) belum sepenuhnya dimigrasikan ke `transactions`.

### Perbandingan Dua Model Invoice

| Aspek | Invoice Web (Universal) | Invoice Admin (Legacy) |
|-------|------------------------|----------------------|
| Route | `/invoice/[id]` | `/invoice/{modul}/[referenceId]` |
| Data source | `transactions` table | Tabel per-modul lama |
| Auth | Tidak perlu | Tidak perlu (public group) |
| PDF | `html2canvas` + `jsPDF` (client-side) | `window.print()` |
| Cakupan | Semua productType universal | Hanya modul spesifik masing-masing |
| Status | Aktif, path utama | Legacy, bertahan selama migrasi belum selesai |

---

## Catatan Penting

1. **Single-product per transaksi** — multi-item cart → N transaksi terpisah.
2. **Guest checkout**: `findOrCreateDonatur()` auto-buat donatur dengan `email = "donor-{id}@temp.local"` jika guest tanpa email.
3. **uniqueCode**: integer ditambahkan ke nominal transfer manual, di-generate saat `include_unique_code !== false`.
4. **typeSpecificData (jsonb)**: data spesifik per produk — zakat menyimpan `zakat_type_id`, `period_id`; qurban menyimpan `package_period_id`, `payment_type`.
5. **Dual model di Qurban**: `qurban_payments` (legacy) masih coexist dengan `transaction_payments`.
6. **Dual model Invoice**: web invoice universal (`/invoice/[id]`) dan admin invoice legacy (`/invoice/{modul}/[referenceId]`) coexist — keduanya bisa diakses tanpa auth.

---

## Rencana Pengembangan (Backlog)

Temuan dari audit 2026-07-02. Diurutkan dari risiko tertinggi ke pengembangan fitur.

---

### ✅ Risiko Aktif — Diselesaikan 2026-07-02

#### 1. ✅ Tidak Ada Database Transaction (Atomicity)

**Sudah diperbaiki**: Seluruh blok DB operations di `approve-payment` dan `reject-payment` sekarang dibungkus dalam `db.transaction(async (tx) => { ... })`. Side-effects async (WhatsApp, CAPI) tetap di luar — hanya DB operations yang atomic.

---

#### 2. ✅ Approve-Payment Tidak Idempotent

**Sudah diperbaiki** dengan dua lapis guard:
1. Cek awal: jika `transaction.paymentStatus === "paid"` → return success langsung
2. Re-fetch status di dalam `db.transaction()` → jika sudah "paid" oleh concurrent request → abort tanpa side effects

---

#### 3. ✅ Fundraiser Balance Naik Saat Transaksi Dibuat

**Sudah diperbaiki**:
- `transaction.ts create()`: Hanya update `totalReferrals` + `totalDonationAmount` (pipeline metrics). `currentBalance` dan `totalCommissionEarned` **tidak lagi di-update** di sini.
- `revenue-share.ts applyFundraiserRevenue()`: Deteksi `referral.status === "pending"` → kredit full `commissionAmount` ke balance (bukan hanya delta). Sehingga balance hanya naik saat transaksi benar-benar `paid`.

---

#### 4. ✅ paidAmount Bisa Desync dengan transaction_payments

**Sudah diperbaiki**: Fungsi `syncTransactionPaidAmount(tx, id)` ditambahkan di `transactions.ts` (baris ~141). Dipanggil di akhir `db.transaction()` block di `approve-payment` dan `reject-payment` — menjamin `paidAmount` selalu = `SUM(non-rejected payments)` setelah setiap operasi.

---

### 🟡 Teknis Debt (penting tapi tidak urgent)

#### 5. Legacy Fallback Path Harus Dihapus

`upload-proof` dan `confirm-payment` masih punya blok fallback ke tabel lama (`donations`, `zakatDonations`, `qurbanOrders`). Blok ini sudah menghasilkan TypeScript errors (tabel tidak diimport) dan mencerminkan dead code untuk donasi baru.

**Plan**: Setelah semua data lama dimigrasikan ke `transactions`, hapus blok `// Fall back to old tables` dari kedua handler. Ini juga akan menghilangkan ~40 pre-existing TS errors di file.

---

#### 6. Tidak Ada Constraint DB untuk paymentStatus

`paymentStatus` adalah kolom `text` — bisa diisi nilai apapun. Admin bisa set via `PUT /transactions/:id` ke status yang tidak valid.

**Solusi**: Tambah `CHECK` constraint di PostgreSQL, atau minimal Zod enum yang lebih ketat di `updateTransactionSchema` (saat ini hanya `["pending", "processing", "partial", "paid", "failed", "expired"]` — missing `"cancelled"`).

---

#### 7. adminFee Nullable Tanpa Alasan

Schema: `adminFee bigint DEFAULT 0` tapi tidak `.notNull()`. Revenue share qurban bergantung `adminFee` — jika null, skip revenue share diam-diam.

**Solusi**: Tambah `.notNull()` di schema (migration diperlukan: `UPDATE transactions SET admin_fee = 0 WHERE admin_fee IS NULL` lalu `ALTER COLUMN admin_fee SET NOT NULL`).

---

#### 8. uniqueCode Bisa Collision

`uniqueCode` di-generate random per transaksi. Tidak ada check bahwa kode unik yang sama tidak sedang aktif untuk rekening bank yang sama.

**Solusi**: Query rekening bank target — jika sudah ada transaksi pending dengan kode yang sama, regenerate. Atau gunakan counter per rekening yang atomic.

---

### 🟢 Fitur Lanjutan (roadmap)

#### 9. Cicilan Terstruktur (Installment Plan)

Saat ini cicilan bersifat ad-hoc — donatur upload berapa saja kapan saja. Tidak ada jadwal, tidak ada reminder, tidak ada tracking "cicilan ke-N dari M".

**Fitur yang diinginkan**:
- Saat create transaksi, bisa tentukan `installmentCount` dan `installmentAmount`
- Sistem generate jadwal cicilan (tabel `installment_schedules`)
- Auto-reminder WA H-3 sebelum jatuh tempo
- Dashboard donatur: lihat sisa cicilan dan tanggal jatuh tempo

**Berlaku untuk**: Campaign, Zakat Maal dengan cicilan, Qurban non-tabungan.

---

#### 10. Migrasi Penuh Legacy ke Universal

Saat ini ada tiga model data:
- **Universal** (`transactions` + `transaction_payments`) — untuk donasi baru
- **Legacy donations** (`donations` + `donation_payments`)
- **Legacy qurban** (`qurban_orders` + `qurban_payments`)

**Target akhir**: Satu model saja. Migrasi data legacy ke `transactions`, hapus tabel lama, hapus fallback path.

**Estimasi effort**: Besar. Perlu migration script, validasi data, dan update semua laporan yang masih query tabel lama.

---

#### 11. Webhook Retry untuk Payment Gateway

WhatsApp notification bersifat fire-and-forget — jika gagal, tidak ada retry. Begitu pula CAPI.

**Solusi**: Job queue (BullMQ/pg-boss) untuk async tasks dengan retry exponential backoff. Atau simpan failed notifications di tabel `notification_queue` dan ada cron yang retry.

---

#### 12. Laporan Real-Time per Produk

Saat ini `campaigns.collected` di-update synchronously di `approve-payment`. Untuk zakat dan qurban, tidak ada agregat serupa — laporan harus SUM dari `transactions`.

**Fitur**: Materialized view atau background job yang recalculate agregat per produk setiap N menit, agar laporan tidak perlu full-scan `transactions` setiap saat.
