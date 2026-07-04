# Arsitektur Qurban Discount & Voucher

> Status: IMPLEMENTED — 2026-07-04  
> Dibuat: 2026-07-04  
> Bergantung pada: `arsitektur-qurban.md`, `arsitektur-timezone.md`

---

## Overview

Fitur discount qurban memungkinkan LAZ memberikan potongan harga pada pembelian hewan qurban — baik secara otomatis (semua transaksi paket tertentu) maupun via kode voucher (user memasukkan kode). Potongan **hanya berlaku pada harga hewan** (`unitPrice`), bukan `adminFee`.

---

## Aturan Bisnis Utama

1. **Dua mode discount:**
   - `automatic` — berlaku otomatis untuk semua order yang match scope-nya, tanpa kode
   - `voucher` — user harus memasukkan kode; proses validasi sebelum order dibuat

2. **Mutual exclusivity:** Jika paket sudah punya `automatic` discount aktif → voucher **ditolak** server-side. Tidak bisa kombinasi.

3. **1 user / 1 HP → 1 discount → 1 kali pakai:**
   - User login: dicek via `userId`
   - Guest: dicek via `donorPhone`
   - Berlaku juga untuk tabungan yang dikonversi ke order

4. **Yang dipotong:** `unitPrice × quantity` (harga hewan). `adminFee` tidak berubah.

5. **Formula totalAmount:**
   ```
   subtotal      = unitPrice × quantity
   discountAmount = min(calculated_discount, subtotal)  -- tidak boleh > harga hewan
   totalAmount    = subtotal - discountAmount + adminFee
   ```

6. **Tabungan qurban:** Discount diterapkan saat **buat tabungan** — bukan saat konversi. `targetAmount` yang disimpan adalah **harga setelah discount**, sehingga cicilan dihitung dari harga final. Voucher dianggap sudah terpakai (usage dicatat) saat tabungan dibuat. Saat konversi ke order, `totalAmount` order mengikuti `savings.targetAmount` (sudah discounted).

7. **Masa berlaku:** `startDate` s/d `endDate` dalam WIB (UTC+7). Start = 00:00:00 WIB, End = 23:59:59 WIB. Simpan sebagai `timestamptz`.

8. **Scope berlaku (dari paling spesifik ke paling luas):**
   - `package_period` → satu package-period junction tertentu
   - `package` → satu paket master (berlaku semua periodenya)
   - `animal_type` → jenis hewan (`cow` / `goat` / `sheep`)
   - `all` → semua paket qurban

   Jika ada lebih dari satu automatic discount yang match, pakai yang **paling spesifik** (urutan di atas). Jika sama level, pakai yang **nilai discount-nya lebih besar**.

---

## Database

### Tabel Baru: `qurban_discounts`

```sql
CREATE TABLE qurban_discounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,           -- nama program, ex: "Promo Idul Adha 2026"
  type            TEXT NOT NULL,           -- 'automatic' | 'voucher'
  discount_type   TEXT NOT NULL,           -- 'percentage' | 'nominal'
  discount_value  BIGINT NOT NULL,         -- nilai: 10 (untuk 10%) atau 50000 (Rp 50rb)
  max_discount    BIGINT,                  -- cap untuk percentage, null = no cap
  scope_type      TEXT NOT NULL DEFAULT 'all',  -- 'all' | 'package' | 'package_period' | 'animal_type'
  scope_id        TEXT,                    -- packageId / packagePeriodId / 'cow'/'goat'/'sheep'
  code            TEXT UNIQUE,             -- hanya untuk type=voucher, uppercase, null untuk automatic
  start_date      TIMESTAMPTZ NOT NULL,    -- WIB 00:00:00
  end_date        TIMESTAMPTZ NOT NULL,    -- WIB 23:59:59
  max_usage       INTEGER,                 -- batas total pakai, null = unlimited
  usage_count     INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,                    -- catatan internal admin
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON qurban_discounts (type, is_active);
CREATE INDEX ON qurban_discounts (scope_type, scope_id);
CREATE INDEX ON qurban_discounts (code) WHERE code IS NOT NULL;
```

**Constraint validasi (aplikasi, bukan DB):**
- `type = 'voucher'` → `code` wajib tidak null
- `type = 'automatic'` → `code` harus null
- `discount_value > 0`
- `start_date < end_date`
- Jika `discount_type = 'percentage'` → `discount_value` antara 1–100

---

### Tabel Baru: `qurban_discount_usages`

```sql
CREATE TABLE qurban_discount_usages (
  id               TEXT PRIMARY KEY,
  discount_id      TEXT NOT NULL REFERENCES qurban_discounts(id) ON DELETE RESTRICT,
  order_id         TEXT REFERENCES qurban_orders(id) ON DELETE RESTRICT,   -- null jika applied via savings
  savings_id       TEXT REFERENCES qurban_savings(id) ON DELETE RESTRICT,  -- null jika applied via order langsung
  user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  donor_phone      TEXT,                  -- untuk guest / backup identifier
  discount_amount  BIGINT NOT NULL,       -- nominal yang benar-benar dipotong
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tepat salah satu dari order_id atau savings_id harus terisi (CHECK di aplikasi)
  UNIQUE (order_id)    -- 1 order hanya bisa dapat 1 discount
  -- savings_id tidak perlu UNIQUE di DB karena sudah di-guard aplikasi
);

CREATE INDEX ON qurban_discount_usages (discount_id);
CREATE INDEX ON qurban_discount_usages (user_id);
CREATE INDEX ON qurban_discount_usages (donor_phone);
CREATE INDEX ON qurban_discount_usages (savings_id);
```

**Catatan:** Guard double-use (1 user / 1 HP per discount) dilakukan di **application level** sebelum insert — karena `user_id` bisa null untuk guest dan kolom berbeda (`userId` vs `donorPhone`).

**Alur savings + discount:**
- Buat tabungan + discount → insert `qurban_discount_usages` dengan `savings_id` (order_id null)
- Konversi savings → order → insert `qurban_discount_usages` baru dengan `order_id`, ATAU update baris savings dengan menambah `order_id`
- Guard double-use cek kedua tabel (usages via order DAN via savings)

---

### Modifikasi Tabel: `qurban_orders`

Tambah 2 kolom:

```sql
ALTER TABLE qurban_orders
  ADD COLUMN discount_id     TEXT REFERENCES qurban_discounts(id) ON DELETE SET NULL,
  ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0;
```

`totalAmount` di DB tetap menyimpan nilai final setelah discount. Formula kalkulasi ada di aplikasi.

### Modifikasi Tabel: `qurban_savings`

Tambah 2 kolom:

```sql
ALTER TABLE qurban_savings
  ADD COLUMN discount_id     TEXT REFERENCES qurban_discounts(id) ON DELETE SET NULL,
  ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0;
```

`targetAmount` menyimpan harga **setelah discount** (harga final yang harus ditabung). `installmentAmount` dihitung dari `targetAmount` yang sudah discounted.

---

### Drizzle Schema (TypeScript)

**File baru:** `packages/db/src/schema/qurban-discounts.ts`
**File baru:** `packages/db/src/schema/qurban-discount-usages.ts`
**File modifikasi:** `packages/db/src/schema/qurban-orders.ts` (tambah `discountId`, `discountAmount` + relasi)
**File modifikasi:** `packages/db/src/schema/qurban-savings.ts` (tambah `discountId`, `discountAmount` + relasi)

Export baru wajib didaftarkan di `packages/db/src/index.ts`.

---

## Migration

**File:** `packages/db/migrations/118_create_qurban_discounts.sql`  
**Urutan:** Setelah `117_add_on_delete_set_null_donatur_user_id.sql`

Isi migration:
1. CREATE TABLE `qurban_discounts`
2. CREATE TABLE `qurban_discount_usages`
3. ALTER TABLE `qurban_orders` ADD COLUMN `discount_id`, `discount_amount`
4. ALTER TABLE `qurban_savings` ADD COLUMN `discount_id`, `discount_amount`

---

## Logika Kalkulasi Discount

```typescript
function calculateDiscount(
  discount: QurbanDiscount,
  subtotal: number  // unitPrice × quantity
): number {
  let amount = 0;

  if (discount.discountType === "percentage") {
    amount = Math.floor(subtotal * discount.discountValue / 100);
    if (discount.maxDiscount) {
      amount = Math.min(amount, discount.maxDiscount);
    }
  } else {
    // nominal
    amount = discount.discountValue;
  }

  // Tidak boleh melebihi subtotal (harga hewan)
  return Math.min(amount, subtotal);
}
```

---

## Logika Validasi Discount

### Untuk `automatic` discount (saat load halaman paket / saat order dibuat):

```
1. Query qurban_discounts WHERE:
   - type = 'automatic'
   - is_active = true
   - NOW() BETWEEN start_date AND end_date
   - usage_count < max_usage (jika max_usage tidak null)
   - scope match dengan packagePeriodId yang diminta
     (urutan cek: package_period > package > animal_type > all)
2. Jika ditemukan → terapkan, simpan discountId ke order
3. Jika tidak → order tanpa discount
```

### Untuk `voucher` (saat user submit kode):

```
1. Cari discount WHERE code = inputCode (case-insensitive)
2. Validasi:
   a. Exists? → jika tidak: "Kode voucher tidak valid"
   b. is_active = true? → jika tidak: "Voucher tidak aktif"
   c. NOW() >= start_date? → jika tidak: "Voucher belum berlaku"
   d. NOW() <= end_date? → jika tidak: "Voucher sudah kadaluarsa"
   e. usage_count < max_usage (jika ada)? → jika tidak: "Voucher sudah habis"
   f. Scope match packagePeriodId? → jika tidak: "Voucher tidak berlaku untuk paket ini"
   g. Cek double-use:
      - Jika user login: SELECT FROM qurban_discount_usages WHERE discount_id = X AND user_id = userId
      - Jika guest: SELECT FROM qurban_discount_usages WHERE discount_id = X AND donor_phone = phone
      → jika ditemukan: "Kode voucher sudah pernah digunakan"
   h. Cek apakah paket sudah punya automatic discount aktif?
      → jika ya: "Paket ini sudah mendapat discount otomatis, voucher tidak bisa digabung"
3. Jika semua valid → return discount info ke frontend (untuk preview harga)
4. Voucher baru benar-benar "terpakai" saat POST /orders berhasil (insert usage)
```

### Scope matching logic:

```typescript
function isDiscountApplicable(discount: QurbanDiscount, context: {
  packagePeriodId: string,
  packageId: string,
  animalType: string,
}): boolean {
  switch (discount.scopeType) {
    case "all":          return true;
    case "package":      return discount.scopeId === context.packageId;
    case "package_period": return discount.scopeId === context.packagePeriodId;
    case "animal_type":  return discount.scopeId === context.animalType;
  }
}
```

---

## API Endpoints

### Public (`/v1/qurban`)

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/discounts/validate` | Validasi kode voucher (tidak apply, hanya preview) |
| `GET` | `/packages/:packagePeriodId` | Sudah ada — **tambahkan** field `activeDiscount` di response |

**`POST /discounts/validate`** — body:
```json
{
  "code": "QURBAN10",
  "packagePeriodId": "abc123",
  "userId": "xyz",          // optional
  "donorPhone": "0812..."   // untuk guest
}
```

Response sukses:
```json
{
  "success": true,
  "data": {
    "discountId": "...",
    "name": "Promo Idul Adha",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 300000,   // nominal yang akan dipotong
    "finalPrice": 2700000
  }
}
```

**`GET /packages/:packagePeriodId`** — tambahan di response:
```json
{
  "activeDiscount": {
    "id": "...",
    "name": "Promo Idul Adha",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 300000,
    "finalPrice": 2700000
  } // null jika tidak ada
}
```

**`POST /orders`** — tambahan di body:
```json
{
  "packagePeriodId": "...",
  "voucherCode": "QURBAN10",  // optional, hanya jika tidak ada auto discount
  ...
}
```

Server **re-validasi** voucher/discount saat order dibuat (jangan hanya percaya frontend).

---

### Admin (`/v1/admin/qurban/discounts`)

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/` | staff | List semua discount + filter |
| `POST` | `/` | `super_admin`, `admin_campaign` | Buat discount/voucher baru |
| `GET` | `/:id` | staff | Detail discount |
| `PUT` | `/:id` | `super_admin`, `admin_campaign` | Edit (hanya jika usage_count = 0 untuk field krusial) |
| `DELETE` | `/:id` | `super_admin` | Hapus (blokir jika ada usage) |
| `GET` | `/:id/usages` | staff | Riwayat penggunaan |
| `POST` | `/:id/deactivate` | `super_admin`, `admin_campaign` | Nonaktifkan tanpa hapus |

**Filter list:**
- `type` (automatic/voucher)
- `status` (active/expired/inactive/exhausted)
- `scopeType`
- `search` (name, code)

---

## Frontend

### Web — Halaman Order (`/qurban/[id]`)

**Kondisi A — Auto discount aktif:**
- Tampil badge "Diskon 10%" di samping nama paket
- Harga coret: ~~Rp 3.000.000~~ → **Rp 2.700.000**
- Field input voucher **disembunyikan**
- Keterangan: "Harga sudah termasuk diskon otomatis"

**Kondisi B — Tidak ada auto discount:**
- Tampil section "Punya Kode Voucher?"
- Input + tombol "Terapkan"
- Setelah apply: preview harga baru (via `POST /discounts/validate`)
- Tombol "Hapus" untuk membatalkan voucher

**Kondisi C — Tidak ada discount sama sekali:**
- Tampil harga normal

### Admin — Menu Baru

Tambah item di sidebar Qurban: **"Diskon & Voucher"**  
Route: `/dashboard/qurban/discounts`

Sub-halaman:
- `/dashboard/qurban/discounts` — list dengan badge status
- `/dashboard/qurban/discounts/new` — form buat baru
- `/dashboard/qurban/discounts/[id]` — detail + usage history
- `/dashboard/qurban/discounts/[id]/edit` — edit

**Form create/edit:**
- Nama program
- Tipe: Automatic / Voucher (toggle — jika voucher, tampil field kode)
- Tipe discount: Persentase / Nominal (toggle)
- Nilai + Max Discount (jika persentase)
- Scope: dropdown All / Paket / Package-Period / Jenis Hewan
  - Jika Paket → autocomplete pilih paket
  - Jika Package-Period → autocomplete pilih kombinasi paket+periode
  - Jika Jenis Hewan → dropdown Sapi/Kambing/Domba
- Tanggal Mulai & Berakhir (date picker, timezone WIB)
- Maksimal penggunaan (optional)
- Deskripsi internal

---

## Perubahan di Flow yang Sudah Ada

### `POST /qurban/orders` (public)

Tambahkan setelah fetch `pkgPeriod`:
1. Cek automatic discount aktif → simpan ke `activeDiscount`
2. Jika tidak ada auto discount dan ada `body.voucherCode` → validasi voucher
3. Hitung `discountAmount`
4. Hitung ulang `totalAmount = subtotal - discountAmount + adminFee`
5. Insert order dengan `discountId`, `discountAmount`
6. Insert ke `qurban_discount_usages`
7. Increment `qurban_discounts.usage_count`

### `POST /admin/qurban/orders` (admin)

Logika yang sama. Admin bisa juga memilih discount/voucher saat buat order manual.

### `POST /qurban/savings` (buat tabungan)

1. Cek automatic discount aktif untuk `packagePeriodId`
2. Jika ada `body.voucherCode` dan tidak ada auto discount → validasi voucher
3. Hitung `discountAmount`, hitung `targetAmount = packagePrice - discountAmount`
4. Hitung `installmentAmount` dari `targetAmount` yang sudah discounted
5. Insert savings dengan `discountId`, `discountAmount`, `targetAmount` (final)
6. Insert `qurban_discount_usages` dengan `savings_id` (voucher dianggap terpakai)
7. Increment `qurban_discounts.usage_count`

### `POST /qurban/savings/:id/convert` (konversi tabungan)

Discount sudah diterapkan saat savings dibuat:
1. `order.totalAmount = savings.targetAmount` (sudah discounted)
2. `order.discountId = savings.discountId`
3. `order.discountAmount = savings.discountAmount`
4. `order.unitPrice` tetap harga asli (dari packagePeriod.price) untuk audit
5. `paidAmount = totalAmount` (langsung lunas dari savings)
6. Insert `qurban_discount_usages` baru dengan `order_id` (untuk traceability di order)

### `GET /qurban/packages/:packagePeriodId`

Tambah query untuk cek automatic discount aktif, sertakan di response.

---

## Hal yang TIDAK Berubah

- `adminFee` tidak dipotong — tetap dari settings `amil_qurban_perekor_fee` / `amil_qurban_sapi_fee`
- `unitPrice` di `qurban_orders` tetap menyimpan harga **sebelum** discount (untuk audit)
- `discountAmount` menyimpan nilai potongan yang aktual diterapkan
- Revenue share qurban tetap berbasis `adminFee` (tidak terpengaruh discount)

---

## Urutan Implementasi (Rencana Eksekusi)

| Fase | Area | File |
|------|------|------|
| 1 | Schema DB + Migration | `packages/db/src/schema/qurban-discounts.ts`, `qurban-discount-usages.ts`, modifikasi `qurban-orders.ts`, modifikasi `qurban-savings.ts`, migration `118_...` |
| 2 | API public: validate voucher + apply di POST /orders | `apps/api/src/routes/qurban.ts` |
| 3 | API admin CRUD discount | `apps/api/src/routes/admin/qurban.ts` (tambah sub-router) atau file baru |
| 4 | Web UI: order page (conditional voucher/auto-discount) | `apps/web/src/app/qurban/[id]/page.tsx` atau komponen terkait |
| 5 | Admin UI: halaman CRUD Diskon & Voucher | `apps/admin/src/app/dashboard/qurban/discounts/` |
| 6 | TS check 0 error, update arsitektur-qurban.md |  |
| 7 | Commit + deploy |  |

---

## Gap & Rencana Masa Depan

| Item | Keterangan |
|------|------------|
| Bulk generate voucher | Generate N kode sekaligus — belum diperlukan saat ini |
| Notifikasi WhatsApp discount | Kirim info discount ke donatur saat voucher sukses diterapkan |
| Stacking discount | Saat ini tidak diizinkan (1 discount per order) — desain sudah prevent ini |
| Audit log discount changes | Siapa yang edit/hapus discount |
| Export usage report | Laporan berapa total discount yang diberikan per periode |
