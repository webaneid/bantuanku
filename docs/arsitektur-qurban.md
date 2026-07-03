# Arsitektur Qurban

> Terakhir di-sync: 2026-07-02  
> Sumber: CLAUDE.md section + schema DB aktual

---

## Overview

Modul qurban mencakup: periode qurban, paket hewan, order, tabungan qurban, dan laporan penyembelihan. Mendukung pembelian individual dan patungan (sapi 7 orang).

---

## Entitas Utama

| Entitas | Fungsi |
|---------|--------|
| `qurban_periods` | Satu tahun qurban (hijri/gregorian) |
| `qurban_packages` | Master paket (sapi/kambing/domba, individual/shared) |
| `qurban_package_periods` | Junction paket + periode: harga & stok unik per periode |
| `qurban_shared_groups` | Grup patungan sapi (7 slot per sapi) |
| `qurban_orders` | Pesanan qurban user |
| `qurban_payments` | Pembayaran qurban **(legacy)** |
| `qurban_savings` | Tabungan qurban dengan target paket |
| `qurban_savings_transactions` | Setoran tabungan **(legacy)** |
| `qurban_savings_conversions` | Log konversi savings → order |
| `qurban_executions` | Laporan penyembelihan (foto/video) |

---

## Schema — Kunci

### `qurban_periods`
```
status: "draft" → "active" → "closed" → "executed"
```

### `qurban_packages`
```
animalType: "cow" | "goat" | "sheep"   -- text, tidak ada enum DB
packageType: "individual" | "shared"
maxSlots: integer                       -- untuk shared (sapi = 7)
```

### `qurban_package_periods`
```
packageId       text FK qurban_packages.id NOT NULL   -- kolom: package_id
periodId        text FK qurban_periods.id NOT NULL     -- kolom: period_id
price           bigint NOT NULL
stock           integer DEFAULT 0
stockSold       integer DEFAULT 0
slotsFilled     integer DEFAULT 0    -- total slot terisi (untuk shared packages)
isAvailable     boolean DEFAULT true
-- (adminFee tidak ada di tabel ini; ada di qurban_orders.adminFee)
```

### `qurban_shared_groups`
```
packagePeriodId     FK qurban_package_periods.id  -- kolom: package_period_id
packageId           FK qurban_packages.id          -- kolom: package_id (redundant, untuk query)
slotsFilled         integer DEFAULT 0
maxSlots            integer
status: "open" | "full" | "confirmed" | "executed"  -- bukan "cancelled"
```

### `qurban_orders`
```
packageId           FK qurban_packages.id          -- kolom: package_id
packagePeriodId     FK qurban_package_periods.id   -- kolom: package_period_id
status: "pending" → "confirmed" → "executed" → "cancelled"
paymentMethod: "bank_transfer" | "savings_conversion" | dll.
paymentStatus: "draft" → "processing" → "paid"
confirmedAt, executedAt   timestamptz

-- Order "confirmed" saat paidAmount >= totalAmount (verified payments)
```

### `qurban_savings`
```
targetAmount            bigint          -- harga paket
currentAmount           bigint          -- saldo terkini (sinkron via syncSavingsBalance)
targetPackagePeriodId   FK qurban_package_periods.id  -- paket target
status: "active" | "paused" | "completed" | "converted" | "cancelled"
-- "completed" saat currentAmount >= targetAmount
-- "converted" setelah dikonversi ke order
-- "paused" jika ditunda
```

---

## Stok & Ketersediaan

```
Individual:
  availableSlots = stock - stockSold

Shared (sapi patungan):
  availableSlots = (maxSlots × stock) - slotsFilled
  
  Logic saat order shared:
  1. Cari group dengan slotsFilled < maxSlots
  2. Jika semua penuh → buat group baru
```

---

## Payment Model (Dua Model Coexist)

```
Legacy:     qurban_orders + qurban_payments
Universal:  transactions + transaction_payments
```

Sedang dalam proses migrasi ke universal. Keduanya coexist sampai selesai.

Catatan cleanup: root `run-qurban-migrations.sh` sudah dihapus. Script itu hardcode `postgresql://webane@localhost:5432/bantuanku`, menjalankan migration qurban lama `010` sampai `014`, dan salah satu file targetnya (`010_create_qurban_orders.sql`) tidak ada di repo saat audit. Source of truth migration qurban sekarang adalah `packages/db/scripts/run-production-manifest.ts`, terutama entry `037_create_qurban_tables_new_schema.sql` dan migration lanjutan yang tercatat di `arsitektur-database.md`.

SQLite legacy `apps/api/bantuanku.db` juga sudah dihapus. File itu hanya berisi schema qurban lama dengan seed/master kecil dan tidak ada source runtime yang mengakses SQLite. Source of truth data qurban tetap PostgreSQL melalui schema `packages/db/src/schema/qurban-*` dan migration manifest.

---

## Savings → Order Conversion

```
savings.status = "completed" (currentAmount >= targetAmount)
    │
    POST /v1/qurban/savings/:id/convert
    │
    ├── Buat qurban_orders (paymentMethod = "savings_conversion", paymentStatus = "paid")
    ├── Buat transactions (totalAmount = 0, category = "qurban_savings")
    ├── Buat qurban_savings_conversions (log)
    └── savings.status = "converted"
```

Balance savings = sum(legacy verified) + sum(universal verified) — sinkron via `syncSavingsBalance()`.

---

## API Endpoints

### Public (`/v1/qurban`)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/qurban/periods` | Periode aktif |
| `GET` | `/qurban/periods/:periodId/packages` | Paket per periode |
| `GET` | `/qurban/packages/:packagePeriodId` | Detail paket + SEO |
| `POST` | `/qurban/orders` | Buat order |
| `POST` | `/qurban/orders/:id/upload-proof` | Upload bukti bayar |
| `POST` | `/qurban/savings` | Buat tabungan |
| `POST` | `/qurban/savings/:id/deposit` | Deposit ke tabungan |
| `POST` | `/qurban/savings/:id/convert` | Konversi ke order |

### Admin (`/v1/admin/qurban`)

| Route | Fungsi |
|-------|--------|
| CRUD `/admin/qurban/periods` | Kelola periode |
| CRUD `/admin/qurban/packages` | Kelola paket master |
| POST `/admin/qurban/package-periods` | Link paket ke periode |
| GET/PATCH `/admin/qurban/orders` | List & verifikasi order |
| GET `/admin/qurban/shared-groups` | Manage grup patungan |
| GET `/admin/qurban/savings` | Manage tabungan |
| GET `/admin/qurban/savings/pending-deposits` | Verifikasi setoran |
| POST `/admin/qurban/executions` | Catat penyembelihan |

---

## Jenis Hewan

| Value DB | Label | Keterangan |
|----------|-------|------------|
| `cow` | Sapi | Bisa individual atau shared |
| `goat` | Kambing | Individual |
| `sheep` | Domba | Individual |

Disimpan sebagai `text()` di DB — tidak ada enum. Tambah jenis hewan baru cukup update UI.

---

## Halaman Web

| Route | Fungsi |
|-------|--------|
| `/qurban` | Browse & filter paket |
| `/qurban/[id]` | Detail paket + form order |
| `/qurban/savings` | List tabungan user |
| `/qurban/savings/new` | Buat tabungan baru |
| `/qurban/savings/[id]` | Detail + deposit + konversi |
| `/qurban/laporan` | Laporan penerimaan, penyembelihan, penyaluran |

---

## Halaman Admin

| Route | Fungsi |
|-------|--------|
| `/dashboard/qurban/packages` | CRUD paket master |
| `/dashboard/qurban/periods` | CRUD periode |
| `/dashboard/qurban/orders` | List & verifikasi order |
| `/dashboard/qurban/shared-groups` | Manage grup patungan |
| `/dashboard/qurban/savings` | Manage tabungan |
| `/dashboard/qurban/savings/pending-deposits` | Verifikasi setoran |

---

## Revenue Share Qurban

Revenue share qurban **berbeda** dari campaign/zakat karena basis kalkulasinya adalah `adminFee`, bukan harga paket.

- **Basis amount**: `qurban_orders.adminFee` (bukan `totalAmount`)
- **Mitra qurban**: dapat sisa adminFee setelah bagian amil — bukan persentase kecil
- **Skip jika**: `adminFee = 0` (skip reason: `"qurban_admin_fee_zero"`) atau `is_admin_fee_entry = true` di `typeSpecificData`
- **Resolusi mitra**: `qurbanPackages.createdBy` → lookup `mitra.userId`

> Detail formula lengkap: lihat `arsitektur-revenue-share.md`.

---

## Known Issues

1. **Dual payment model** — legacy + universal coexist, belum selesai migrasi
2. **Racing condition stok** — tidak ada DB-level constraint, concurrent order bisa exceed stock
3. **Balance calculation** — harus sum dua tabel (legacy + universal), sinkron via `syncSavingsBalance()`
4. **Notification** — WhatsApp async, tidak ada retry jika gagal
5. **Installment** — tidak ada auto-billing/reminder, semua manual
