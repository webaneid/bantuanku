# Arsitektur Qurban Discount & Voucher

> Status: IMPLEMENTED — 2026-07-04 (listing UI: 2026-07-05)
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
   subtotal       = unitPrice × quantity
   discountAmount = min(calculated_discount, subtotal)  -- tidak boleh > harga hewan
   totalAmount    = subtotal - discountAmount + adminFee
   ```

6. **Tabungan qurban:** Discount diterapkan saat **buat tabungan** — bukan saat konversi. `targetAmount` yang disimpan adalah **harga setelah discount**. `installmentAmount` dihitung dari `targetAmount` yang sudah discounted (server-side recalculate). Voucher dianggap sudah terpakai (usage dicatat) saat tabungan dibuat. Saat konversi ke order, `totalAmount` order mengikuti `savings.targetAmount` (sudah discounted).

7. **Masa berlaku:** `startDate` s/d `endDate` dalam WIB (UTC+7). Start = 00:00:00 WIB, End = 23:59:59 WIB. Simpan sebagai `timestamptz`.

8. **Scope berlaku (dari paling spesifik ke paling luas):**
   - `package_period` → satu package-period junction tertentu
   - `package` → satu paket master (berlaku semua periodenya)
   - `animal_type` → jenis hewan (`cow` / `goat` / `sheep`)
   - `all` → semua paket qurban

   Jika ada lebih dari satu automatic discount yang match, pakai yang **paling spesifik**. Jika sama level, pakai yang **nilai discount-nya lebih besar**.

---

## Database

### Tabel Baru: `qurban_discounts` (migration 118)

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
```

**Constraint validasi (aplikasi, bukan DB):**
- `type = 'voucher'` → `code` wajib tidak null
- `type = 'automatic'` → `code` harus null
- `discount_value > 0`
- `start_date < end_date`
- Jika `discount_type = 'percentage'` → `discount_value` antara 1–100

---

### Tabel Baru: `qurban_discount_usages` (migration 118)

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

  UNIQUE (order_id)    -- 1 order hanya bisa dapat 1 discount
  -- savings_id tidak perlu UNIQUE di DB karena sudah di-guard aplikasi
);
```

**Alur savings + discount:**
- Buat tabungan + discount → insert `qurban_discount_usages` dengan `savings_id` (order_id null)
- Konversi savings → order → insert `qurban_discount_usages` baru dengan `order_id` (untuk traceability)
- Guard double-use cek: existing usage by `userId` OR `donorPhone` untuk discount yang sama

---

### Modifikasi Tabel: `qurban_orders` (migration 118)

```sql
ALTER TABLE qurban_orders
  ADD COLUMN discount_id     TEXT REFERENCES qurban_discounts(id) ON DELETE SET NULL,
  ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0;
```

`totalAmount` menyimpan nilai final setelah discount. `unitPrice` tetap harga asli (audit trail).

### Modifikasi Tabel: `qurban_savings` (migration 118)

```sql
ALTER TABLE qurban_savings
  ADD COLUMN discount_id     TEXT REFERENCES qurban_discounts(id) ON DELETE SET NULL,
  ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0;
```

`targetAmount` menyimpan harga **setelah discount**. `installmentAmount` = `ceil(targetAmount / installmentCount)`.

---

## Logika Kalkulasi Discount

```typescript
// apps/api/src/routes/qurban.ts — fungsi calculateDiscountAmount()
function calculateDiscountAmount(discount: DiscountRecord, subtotal: number): number {
  let amount = 0;
  if (discount.discountType === "percentage") {
    amount = Math.floor(subtotal * discount.discountValue / 100);
    if (discount.maxDiscount) amount = Math.min(amount, discount.maxDiscount);
  } else {
    amount = discount.discountValue;
  }
  return Math.min(amount, subtotal); // tidak boleh melebihi harga hewan
}
```

---

## Logika Scope Matching & Prioritas

Diimplementasikan di fungsi `findActiveAutoDiscount()` dan bulk query di list endpoint:

```typescript
const priority: Record<string, number> = { package_period: 4, package: 3, animal_type: 2, all: 1 };

applicable.sort((a, b) => {
  const pa = priority[a.scopeType] || 0;
  const pb = priority[b.scopeType] || 0;
  if (pa !== pb) return pb - pa;
  return b.discountValue - a.discountValue; // nilai lebih besar menang jika sama level
});

const bestDiscount = applicable[0]; // null jika tidak ada
```

---

## API Endpoints — Aktual

### Public (`/v1/qurban`)

| Method | Path | Status | Fungsi |
|--------|------|--------|--------|
| `POST` | `/discounts/validate` | ✅ | Validasi kode voucher (tidak apply, hanya preview) |
| `GET` | `/packages/:packagePeriodId` | ✅ | Detail paket + field `activeDiscount` di response |
| `GET` | `/periods/:periodId/packages` | ✅ | List paket + field `activeDiscount` per paket (bulk query, bukan N+1) |
| `POST` | `/orders` | ✅ | Buat order — discount diterapkan dan usage dicatat |
| `POST` | `/savings` | ✅ | Buat tabungan — discount diterapkan saat create |
| `POST` | `/savings/:id/convert` | ✅ | Konversi — carry `discountId`/`discountAmount` dari savings |

**`POST /discounts/validate`** — body:
```json
{
  "code": "QURBAN10",
  "packagePeriodId": "abc123",
  "donorPhone": "0812..."
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
    "discountAmount": 300000,
    "finalPrice": 2700000
  }
}
```

**`GET /packages/:packagePeriodId` dan `GET /periods/:id/packages`** — tambahan di response per paket:
```json
{
  "activeDiscount": {
    "id": "...",
    "name": "Promo Idul Adha",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 300000
  }
}
```
`activeDiscount: null` jika tidak ada discount aktif.

---

### Admin (`/v1/admin/qurban/discounts`)

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/` | staff | List semua discount + filter (type, status, scopeType, search) |
| `POST` | `/` | `super_admin`, `admin_campaign` | Buat discount/voucher baru |
| `GET` | `/:id` | staff | Detail discount |
| `PUT` | `/:id` | `super_admin`, `admin_campaign` | Edit — field krusial dikunci jika `usageCount > 0` |
| `DELETE` | `/:id` | `super_admin` | Hapus — diblokir jika ada usage |
| `GET` | `/:id/usages` | staff | Riwayat penggunaan (join orders + savings) |
| `POST` | `/:id/deactivate` | `super_admin`, `admin_campaign` | Nonaktifkan tanpa hapus |

**Field yang dikunci jika sudah dipakai (`usageCount > 0`):** `type`, `discountType`, `discountValue`, `code`.

---

## Frontend — Aktual

### Listing Paket (Home + `/qurban`)

**Komponen:** `QurbanCard` (`apps/web/src/components/organisms/QurbanCard/`)

- Jika `activeDiscount` ada: harga asli tampil **di-strikethrough**, badge merah "Diskon X%" atau "Diskon Rp Y" muncul di samping, harga utama menampilkan harga setelah diskon
- `GET /periods/:id/packages` sekarang include `activeDiscount` per paket — satu batch query, bukan per-item
- Voucher **tidak ditampilkan** di listing — hanya muncul saat checkout detail

### Halaman Order (`/qurban/[id]` — `QurbanSidebar`)

**Kondisi A — Auto discount aktif:**
- Badge "Diskon X%" di sidebar
- Harga coret + harga baru
- Section input voucher **disembunyikan**
- Banner: "Diskon otomatis aktif: [nama]"

**Kondisi B — Tidak ada auto discount:**
- Section "Punya Kode Voucher?" tampil
- Input + tombol "Terapkan" → panggil `POST /discounts/validate`
- Setelah apply: preview harga baru + tombol "Hapus"

**Kondisi C — Tidak ada discount sama sekali:**
- Harga normal, tidak ada input voucher

Saat konfirmasi order, `discountAmount` dan `voucherCode` masuk ke `CartContext` → diteruskan ke checkout page.

### Checkout Page (`/checkout`)

- Membaca `item.qurbanData.discountAmount` dari CartContext
- Menghitung `totalAmount = (unitPrice × quantity) - discountAmount + (adminFee × quantity)` untuk **display**
- Mengirim `type_specific_data.discount_amount` dan `type_specific_data.voucher_code` ke `POST /transactions`

> ⚠️ **Gap**: Lihat bagian "Gap Implementasi" di bawah.

### Admin — Menu Diskon & Voucher

Di sidebar Admin → submenu Qurban → **"Diskon & Voucher"** (role: `super_admin`, `admin_campaign`):
- `/dashboard/qurban/discounts` — list dengan badge status
- `/dashboard/qurban/discounts/new` — form buat baru
- `/dashboard/qurban/discounts/[id]` — detail + usage history
- `/dashboard/qurban/discounts/[id]/edit` — edit

---

## Hal yang TIDAK Berubah

- `adminFee` tidak dipotong — tetap dari settings `amil_qurban_perekor_fee` / `amil_qurban_sapi_fee`
- `unitPrice` di `qurban_orders` tetap menyimpan harga **sebelum** discount (untuk audit)
- Revenue share qurban tetap berbasis `adminFee` (tidak terpengaruh discount)

---

## Gap Implementasi

### 1. Universal Checkout (`POST /transactions`) tidak terapkan discount

**Status:** BELUM DIFIX

`TransactionService.create()` di `apps/api/src/services/transaction.ts` tidak punya `discount_amount` di `CreateTransactionDTO`. Kalkulasi:
```typescript
const totalAmount = subtotal + adminFee; // tidak membaca discount!
```

Akibatnya untuk flow web checkout (via keranjang → checkout page → `POST /transactions`):
- `transactions.totalAmount` di DB = harga penuh (tanpa potongan)
- `qurban_discount_usages` tidak terbuat
- `qurban_discounts.usage_count` tidak terupdate
- Double-use guard tidak bekerja

`discount_amount` dan `voucher_code` hanya tersimpan di `transactions.typeSpecificData` (JSON), tidak di kolom terstruktur.

**Fix yang diperlukan:**
1. Tambah `discount_amount?: number` dan `voucher_code?: string` ke `CreateTransactionDTO`
2. Di `TransactionService.create()`: `const totalAmount = subtotal - discountAmount + adminFee`
3. Panggil `findActiveAutoDiscount` atau re-validasi voucher server-side
4. Insert ke `qurban_discount_usages` dan increment `usage_count`

### 2. Admin order creation (`POST /admin/qurban/orders`) tidak terapkan discount

**Status:** BELUM DIFIX

Route admin qurban tidak menangani discount saat admin buat order manual.

### 3. Savings new page (`/qurban/savings/new`) tidak ada voucher UI

**Status:** BELUM DIIMPLEMENTASI

Halaman `apps/web/src/app/qurban/savings/new/page.tsx` tidak punya input voucher. User yang membuat tabungan via web tidak bisa menerapkan voucher. Auto discount tetap diterapkan server-side saat `POST /qurban/savings` dipanggil, tapi user tidak tahu sebelum submit.

---

## Gap & Rencana Masa Depan

| Item | Status | Keterangan |
|------|--------|------------|
| Fix TransactionService discount | ⚠️ Gap aktif | Paling krusial — semua web checkout tidak rekam discount dengan benar |
| Discount UI di savings new page | ⚠️ Gap UI | User tidak bisa lihat/apply voucher saat buat tabungan |
| Admin order creation + discount | ⚠️ Gap minor | Admin buat order manual, discount tidak diterapkan |
| Bulk generate voucher | Belum diperlukan | Generate N kode sekaligus |
| Notifikasi WhatsApp discount | Belum diperlukan | Kirim info discount ke donatur saat voucher sukses |
| Stacking discount | Tidak diizinkan | 1 discount per order — desain sudah prevent ini |
| Export usage report | Belum diperlukan | Laporan total discount per periode |
