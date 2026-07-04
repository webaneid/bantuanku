# Arsitektur Qurban

> Terakhir di-sync: 2026-07-04  
> Sumber: CLAUDE.md section + schema DB aktual + audit kode komprehensif

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

### Model Reservasi Stok (Reservation at Creation)

Slot/stok di-decrement **saat order dibuat**, bukan saat payment diverifikasi. Ini berlaku untuk SEMUA jalur order (public dan admin).

```
POST /qurban/orders  (public)
POST /admin/qurban/orders  (admin)
  → increment qurbanPackagePeriods.slotsFilled / stockSold
  → increment qurbanSharedGroups.slotsFilled (shared)

POST /admin/qurban/orders/:id/cancel
  → decrement kembali (GREATEST(..., 0) untuk mencegah negatif)
  → qurbanPackagePeriods.slotsFilled atau stockSold
  → qurbanSharedGroups.slotsFilled (jika shared)

POST /admin/qurban/payments/:id/verify
  → TIDAK increment slotsFilled (sudah dihitung saat order dibuat)
  → Hanya update paidAmount (capped ke totalAmount) dan paymentStatus
```

**Penting**: Jangan tambahkan increment slotsFilled/stockSold di tempat lain. Filosofi "deferred to payment" sudah dihapus (menyebabkan double-counting).

---

## Admin Fee

Admin fee dikalkulasi **server-side** dari settings DB saat order dibuat. Tidak boleh dikirim dari client.

| `animalType` | Settings Key | Keterangan |
|---|---|---|
| `"cow"` | `amil_qurban_sapi_fee` | Administrasi Qurban Sapi (Rp) |
| `"goat"`, `"sheep"` | `amil_qurban_perekor_fee` | Administrasi Qurban Kambing/Domba perekor (Rp) |

Settings dikelola di `/dashboard/settings` > seksi Amil. Jika key tidak ada di DB, adminFee default ke 0.

Revenue share qurban menggunakan `qurban_orders.adminFee` sebagai basis (bukan `totalAmount`). Lihat `arsitektur-revenue-share.md`.

---

## Payment Flow — Upload vs Verifikasi

```
User upload bukti bayar (POST /qurban/orders/:id/upload-proof)
  → Blokir jika orderStatus = "cancelled" atau paymentStatus = "paid"
  → Simpan file payment proof
  → paymentStatus order = "pending"
  → paidAmount TIDAK berubah

Admin verifikasi (POST /admin/qurban/payments/:id/verify)
  → paidAmount = min(paidAmount + payment.amount, totalAmount)  ← capped
  → paymentStatus = "paid" jika paidAmount >= totalAmount
  → order.status = "confirmed" jika paid

Admin edit payment (PUT /admin/qurban/payments/:id)
  → Jika status diubah ke "verified" → sync order.paidAmount (sama seperti verify endpoint)
```

**Aturan paidAmount:**
- Hanya update via `POST /verify` atau `PUT /payments/:id` dengan status=verified
- Selalu di-cap ke `totalAmount` (tidak boleh melebihi)
- Upload-proof TIDAK mengubah paidAmount

**Aturan upload-proof:**
- Blokir jika `orderStatus = "cancelled"` atau `paymentStatus = "paid"` (sudah lunas)

---

## Access Control (Public Endpoints)

`GET /qurban/orders/:id` dan `GET /qurban/payments/order/:orderId`:
- Jika order punya `userId` → hanya bisa diakses oleh user yang sama (token harus cocok)
- Jika `userId = null` (guest order) → bisa diakses tanpa token (invoice lookup)
- Guard: `if (orderData[0].userId && orderData[0].userId !== user?.id)` → 403

## Access Control (Admin Endpoints)

Semua GET endpoint admin qurban yang mengekspos data order/donatur memerlukan role eksplisit — **tidak cukup hanya `staffOnly` middleware**.

| Endpoint Group | Required Roles |
|---|---|
| GET orders, payments, shared-groups, donaturs, periods summary, executions | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator`, `employee` |
| POST/PUT/DELETE periods, packages | `super_admin`, `admin_campaign` (+ `mitra` untuk packages) |
| POST executions, verify payments | `super_admin`, `admin_campaign` |

Mitra **tidak boleh** mengakses list order, donatur, atau payment orang lain. Batasi dengan `requireRole()` eksplisit.

---

## Delete Guards

| Target Delete | Guard |
|---|---|
| `/periods/:id` | Cek `qurban_orders` (via `qurban_package_periods.periodId`) AND `qurban_savings` (via `targetPackagePeriodId`). Block jika ada. |
| `/packages/:id` | Cek direct orders (`qurban_orders.packageId = id`) AND indirect orders (`qurban_orders.packagePeriodId` → `qurban_package_periods.packageId = id`). Block jika total > 0. |

Note: `qurban_package_periods` cascade delete dari `packageId` dan `periodId`. Artinya menghapus paket atau periode akan cascade ke `qurban_package_periods`, yang bisa menyebabkan FK violation di `qurban_orders.packagePeriodId` jika tidak di-guard lebih dulu.

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

---

## Perbaikan

| Tanggal | Area | Deskripsi |
|---|---|---|
| 2026-07-04 | Payment | Bug: `paidAmount` diincrement saat upload-proof (double-counting). Fix: hapus increment dari upload-proof, hanya di admin verify. |
| 2026-07-04 | Access Control | Bug: 10 GET endpoint admin tanpa `requireRole` → mitra bisa lihat data order/donatur semua orang. Fix: tambah eksplisit `requireRole` ke semua GET endpoint sensitif. |
| 2026-07-04 | Delete Guard | Bug: DELETE /periods/:id dan DELETE /packages/:id tidak punya guard → bisa hapus periode/paket yang punya order aktif, menyebabkan data orphan. Fix: tambah guard cek orders + savings. |
| 2026-07-04 | Admin Fee | Bug: `adminFee` diterima dari body request (client-controlled). Fix: kalkulasi server-side dari settings DB (`amil_qurban_perekor_fee` / `amil_qurban_sapi_fee`). |
| 2026-07-04 | Stok Shared | Bug: double-counting `slotsFilled` — public order increment di create, admin verify increment lagi. Fix: filosofi reservasi seragam (increment di create, hapus dari verify). Admin order creation juga ikut increment saat dibuat. |
| 2026-07-04 | Stok Cancel | Bug: cancel order tidak rollback `stockSold` (individual) dan `packagePeriods.slotsFilled` (shared). Fix: cancel handler kini decrement keduanya dengan `GREATEST(..., 0)`. |
| 2026-07-04 | Data Leak Public | Bug: `GET /orders/:id` dan `GET /payments/order/:orderId` bisa diakses siapapun tanpa token (guest bisa akses order orang lain). Fix: guard `if (userId && userId !== user?.id) → 403`. |
| 2026-07-04 | Upload Proof Guard | Bug: upload-proof tidak blokir order cancelled/paid. Fix: guard early-return jika `orderStatus=cancelled` atau `paymentStatus=paid`. |
| 2026-07-04 | paidAmount Cap | Bug: verify payment tidak cap paidAmount ke totalAmount — bisa overflow jika admin verify 2 payment. Fix: `Math.min(paidAmount + amount, totalAmount)`. |
| 2026-07-04 | PUT Payment Sync | Bug: `PUT /payments/:id` bisa set status=verified tanpa sync `order.paidAmount`. Fix: tambah sync paidAmount ketika status=verified, konsisten dengan POST /verify. |
