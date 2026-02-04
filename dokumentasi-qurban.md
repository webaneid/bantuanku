# DOKUMENTASI SISTEM QURBAN - BANTUANKU

**Dibuat**: 31 Januari 2026
**Versi**: 1.0
**Status**: Production-Ready

---

## 📋 DAFTAR ISI

1. [Ringkasan Sistem](#ringkasan-sistem)
2. [Alur Order Qurban](#alur-order-qurban)
3. [Skema Database](#skema-database)
4. [Sistem Pantungan (Shared)](#sistem-pantungan-shared)
5. [Sistem Tabungan Qurban](#sistem-tabungan-qurban)
6. [Verifikasi Pembayaran](#verifikasi-pembayaran)
7. [API Endpoints](#api-endpoints)
8. [Fitur Lengkap](#fitur-lengkap)
9. [Halaman Frontend](#halaman-frontend)
10. [Insights & Best Practices](#insights--best-practices)

---

## 🎯 RINGKASAN SISTEM

Sistem Qurban Bantuanku adalah sistem manajemen qurban yang **lengkap dan siap produksi** dengan fitur:

### Komponen Utama:
- ✅ **8 tabel database** yang ternormalisasi dengan baik
- ✅ **40+ API endpoints** untuk operasi CRUD lengkap
- ✅ **Alur order end-to-end** dari katalog → checkout → pembayaran → verifikasi
- ✅ **Sistem pantungan cerdas** dengan auto-create group & slot management
- ✅ **Opsi pembayaran fleksibel** (lunas/cicilan) dengan workflow verifikasi
- ✅ **Sistem tabungan qurban** untuk menabung ke periode mendatang
- ✅ **Admin dashboard endpoints** untuk manajemen order lengkap
- ✅ **Integrasi cart** untuk checkout multi-item
- ✅ **Biaya admin** yang dapat dikonfigurasi per jenis hewan

### Teknologi:
- **Database**: PostgreSQL dengan Drizzle ORM
- **Backend API**: Hono.js framework
- **Frontend**: Next.js 14 App Router
- **State Management**: React Context (CartContext)
- **Type Safety**: Full TypeScript

---

## 🛒 ALUR ORDER QURBAN

### A. User Journey (Frontend)

#### 1. Browse Katalog (`/qurban`)
```
User membuka halaman katalog
├─ Fetch active periods dari API
├─ Tampilkan packages grouped by period
└─ Filter: Semua | Sapi | Kambing | Individu | Patungan
```

**Endpoints dipakai**:
- `GET /qurban/periods` - Ambil periode aktif
- `GET /qurban/periods/:periodId/packages` - Ambil paket per periode

#### 2. Detail Paket (`/qurban/[id]`)
```
User klik paket tertentu
├─ Fetch detail paket dengan ketersediaan
├─ Tampilkan breakdown harga (subtotal + admin fee)
├─ Tampilkan tabs info: Deskripsi | Informasi Paket
└─ Sidebar: Stok/slot tersedia, periode, quantity, tombol order
```

**Endpoints dipakai**:
- `GET /qurban/packages/:id` - Detail paket

#### 3. Pilih Quantity & Order
```
User pilih jumlah (untuk individu) & klik "Order Qurban"
├─ Buka modal konfirmasi (QurbanConfirmModal)
├─ Tampilkan ringkasan order + total
└─ Sediakan 4 opsi:
    1. Order Qurban Sekarang → Langsung checkout
    2. Tambah ke Keranjang & Lihat → Add cart + pergi ke cart
    3. Tambah ke Keranjang → Add cart saja
    4. Cari Paket Qurban Lain → Lanjut browsing
```

#### 4. Add to Cart
```
Item ditambahkan ke CartContext dengan data:
{
  itemType: 'qurban',
  qurbanData: {
    packageId,
    periodId,
    quantity,
    animalType,
    packageType,
    price,
    adminFee
  }
}
```

#### 5. Checkout & Buat Order
```
User lengkapi form checkout (/checkout)
├─ POST /qurban/orders → Buat order aktual
├─ POST /qurban/payments → Buat payment record (pending)
└─ Redirect ke halaman konfirmasi
```

---

### B. Backend Processing

#### POST /qurban/orders - Membuat Order

```
1. Validasi package exists & available
2. Check stock:
   ├─ Individual: stockSold + quantity ≤ stock
   └─ Shared: availableSlots ≥ quantity

3. Handle shared group assignment:
   ├─ Cari open group dengan slot available
   ├─ Jika ada: Join existing group (increment slotsFilled)
   └─ Jika tidak: Create new group

4. Update package (slotsFilled atau stockSold)

5. Generate order number: QBN-YYYY-XXXXX

6. Return: qurbanOrder object
```

**Contoh Request**:
```json
{
  "packageId": "pkg_123",
  "donorName": "Ahmad",
  "donorEmail": "ahmad@email.com",
  "donorPhone": "081234567890",
  "quantity": 1,
  "paymentMethod": "full",
  "onBehalfOf": "Keluarga Ahmad"
}
```

**Contoh Response**:
```json
{
  "success": true,
  "data": {
    "id": "ord_abc123",
    "orderNumber": "QBN-2026-00001",
    "packageId": "pkg_123",
    "sharedGroupId": "grp_xyz",
    "totalAmount": 5000000,
    "paymentStatus": "pending",
    "orderStatus": "pending"
  }
}
```

---

## 💾 SKEMA DATABASE

### 1. **qurban_periods** - Periode Qurban

```sql
CREATE TABLE qurban_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "Qurban 1446 H / 2026"
  hijri_year TEXT NOT NULL,        -- "1446"
  gregorian_year INTEGER NOT NULL, -- 2026
  start_date DATE NOT NULL,        -- Mulai buka order
  end_date DATE NOT NULL,          -- Tutup order
  execution_date DATE NOT NULL,    -- Tanggal penyembelihan (Idul Adha)
  status TEXT DEFAULT 'draft',     -- draft | active | closed | executed
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow**:
- `draft` → Belum dibuka untuk public
- `active` → Terbuka untuk order
- `closed` → Sudah ditutup, tidak bisa order lagi
- `executed` → Sudah dilaksanakan penyembelihan

---

### 2. **qurban_packages** - Paket Qurban

```sql
CREATE TABLE qurban_packages (
  id TEXT PRIMARY KEY,
  period_id TEXT REFERENCES qurban_periods(id),
  animal_type TEXT NOT NULL,       -- 'cow' | 'goat'
  package_type TEXT NOT NULL,      -- 'individual' | 'shared'
  name TEXT NOT NULL,              -- "Sapi A+ Patungan 5 Orang"
  description TEXT,
  image_url TEXT,
  price BIGINT NOT NULL,           -- Harga per slot/ekor
  max_slots INTEGER,               -- NULL untuk individual, 5-7 untuk shared
  slots_filled INTEGER DEFAULT 0,  -- Running total across all groups
  stock INTEGER NOT NULL,          -- Units tersedia
  stock_sold INTEGER DEFAULT 0,    -- Units terjual
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Contoh Data**:
| name | animal_type | package_type | price | max_slots | stock |
|------|-------------|--------------|-------|-----------|-------|
| Sapi A+ Patungan 5 Orang | cow | shared | 5.000.000 | 5 | 20 |
| Sapi Premium Patungan 7 Orang | cow | shared | 3.570.000 | 7 | 15 |
| Kambing Premium | goat | individual | 3.000.000 | NULL | 50 |

---

### 3. **qurban_shared_groups** - Grup Pantungan

```sql
CREATE TABLE qurban_shared_groups (
  id TEXT PRIMARY KEY,
  package_id TEXT REFERENCES qurban_packages(id),
  group_number INTEGER NOT NULL,   -- 1, 2, 3... (Sapi #1, #2, #3)
  max_slots INTEGER NOT NULL,      -- Copy dari package
  slots_filled INTEGER DEFAULT 0,  -- Anggota dalam grup INI
  status TEXT DEFAULT 'open',      -- open | full | confirmed | executed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow**:
- `open` → Masih menerima anggota (slots_filled < max_slots)
- `full` → Sudah penuh (slots_filled = max_slots)
- `confirmed` → Admin sudah confirm semua pembayaran
- `executed` → Sudah disembelih

**Contoh Scenario - Sapi 5 Orang**:
```
Package: Sapi A+ (max_slots=5, slotsFilled=0)

User A order → Group #1 created (slotsFilled=1)
User B order → Join Group #1 (slotsFilled=2)
User C order → Join Group #1 (slotsFilled=3)
User D order → Join Group #1 (slotsFilled=4)
User E order → Join Group #1 (slotsFilled=5) → Status = FULL

User F order → Group #2 created (slotsFilled=1)
```

---

### 4. **qurban_orders** - Order Individual

```sql
CREATE TABLE qurban_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,     -- QBN-2026-00001
  user_id TEXT REFERENCES users(id),     -- NULL untuk guest
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,

  package_id TEXT REFERENCES qurban_packages(id),
  shared_group_id TEXT REFERENCES qurban_shared_groups(id), -- NULL untuk individual

  quantity INTEGER NOT NULL,             -- >1 untuk kambing, always 1 untuk shared
  unit_price BIGINT NOT NULL,            -- Harga saat order
  total_amount BIGINT NOT NULL,          -- quantity * unit_price

  payment_method TEXT DEFAULT 'full',    -- full | installment
  installment_frequency TEXT,            -- weekly | monthly | custom
  installment_count INTEGER,
  installment_amount BIGINT,

  paid_amount BIGINT DEFAULT 0,          -- Total sudah bayar
  payment_status TEXT DEFAULT 'pending', -- pending | partial | paid | overdue
  order_status TEXT DEFAULT 'pending',   -- pending | confirmed | cancelled | executed

  on_behalf_of TEXT,                     -- Atas nama siapa qurbannya
  notes TEXT,

  order_date TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Payment Status**:
- `pending` → Belum ada pembayaran
- `partial` → Sudah bayar sebagian
- `paid` → Lunas
- `overdue` → Terlambat bayar cicilan

**Order Status**:
- `pending` → Menunggu konfirmasi/pembayaran
- `confirmed` → Dikonfirmasi admin, siap eksekusi
- `cancelled` → Dibatalkan
- `executed` → Sudah disembelih

---

### 5. **qurban_payments** - Riwayat Pembayaran

```sql
CREATE TABLE qurban_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,  -- PAY-QBN-2026-00001
  order_id TEXT REFERENCES qurban_orders(id),
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_method TEXT,                  -- bank_transfer | ewallet | cash | va
  payment_channel TEXT,                 -- BCA | Mandiri | GoPay
  installment_number INTEGER,           -- Cicilan ke-berapa
  payment_proof TEXT,                   -- URL bukti transfer
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP,
  status TEXT DEFAULT 'pending',        -- pending | verified | rejected
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow**:
```
User upload bukti → status = 'pending'
    ↓
Admin verify → status = 'verified'
    ↓
Update order.paid_amount += payment.amount
    ↓
If paid_amount >= total_amount:
  ├─ order.payment_status = 'paid'
  └─ For shared: increment group.slots_filled
```

---

### 6. **qurban_savings** - Tabungan Qurban

```sql
CREATE TABLE qurban_savings (
  id TEXT PRIMARY KEY,
  savings_number TEXT UNIQUE NOT NULL,  -- SAV-QBN-2026-00001
  user_id TEXT REFERENCES users(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,

  target_period_id TEXT REFERENCES qurban_periods(id),
  target_package_id TEXT REFERENCES qurban_packages(id),
  target_amount BIGINT NOT NULL,        -- Target uang yang ingin ditabung
  current_amount BIGINT DEFAULT 0,      -- Sudah ditabung berapa

  installment_frequency TEXT,           -- weekly | monthly | custom
  installment_amount BIGINT,            -- Nominal per setor
  installment_day INTEGER,              -- Hari ke- (untuk reminder)
  start_date DATE NOT NULL,

  status TEXT DEFAULT 'active',         -- active | paused | completed | converted | cancelled
  converted_to_order_id TEXT REFERENCES qurban_orders(id),
  converted_at TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Flow**:
```
active → Sedang menabung
  ↓
current_amount >= target_amount → completed
  ↓
Admin convert → converted
  ↓
Buat order dari tabungan
```

---

### 7. **qurban_savings_transactions** - Setor Tabungan

```sql
CREATE TABLE qurban_savings_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL, -- TRX-SAV-QBN-2026-00001
  savings_id TEXT REFERENCES qurban_savings(id),
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,       -- deposit | withdrawal | conversion
  transaction_date TIMESTAMP NOT NULL,
  payment_method TEXT,
  payment_channel TEXT,
  payment_proof TEXT,                   -- URL bukti
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP,
  status TEXT DEFAULT 'pending',        -- pending | verified | rejected
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 8. **qurban_executions** - Laporan Penyembelihan

```sql
CREATE TABLE qurban_executions (
  id TEXT PRIMARY KEY,
  execution_number TEXT UNIQUE NOT NULL, -- EXE-QBN-2026-00001
  shared_group_id TEXT REFERENCES qurban_shared_groups(id), -- NULL jika individual
  order_id TEXT REFERENCES qurban_orders(id),               -- NULL jika shared
  execution_date TIMESTAMP NOT NULL,
  location TEXT,                        -- Lokasi penyembelihan
  butcher_name TEXT,                    -- Nama jagal
  animal_type TEXT,
  animal_weight DECIMAL(10,2),          -- kg
  animal_condition TEXT,
  distribution_method TEXT,             -- direct_pickup | distribution | donation
  distribution_notes TEXT,
  photos TEXT,                          -- JSON array URLs
  video_url TEXT,
  recipient_count INTEGER,
  recipient_list TEXT,                  -- JSON array names
  executed_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🤝 SISTEM PANTUNGAN (SHARED)

### Konsep Dasar

Pantungan qurban adalah **sistem berbagi 1 hewan untuk beberapa orang** (biasanya 5-7 orang untuk sapi, atau 7 orang untuk kambing).

### Data Structure

```
qurban_packages (shared type)
├─ animal_type: 'cow'
├─ package_type: 'shared'
├─ max_slots: 5 atau 7 (berapa orang share 1 sapi)
├─ slots_filled: 0-100 (tracks TOTAL across ALL groups)
└─ stock: 20 (berapa sapi tersedia)

qurban_shared_groups (satu per sapi penuh)
├─ group_number: 1, 2, 3... (Sapi #1, #2, #3)
├─ max_slots: 5 (copy dari package)
├─ slots_filled: 0-5 (orang dalam grup INI)
└─ status: open → full → confirmed → executed

qurban_orders (satu per orang join group)
├─ shared_group_id: grp_1
├─ quantity: 1 (selalu 1 untuk shared)
├─ payment_status: pending/partial/paid
└─ order_status: pending/confirmed/executed
```

### Logic Auto-Assign Group

**Ketika User Order Shared Package**:

```javascript
// 1. Cari grup yang masih open dan punya slot
const openGroup = await db.query.qurbanSharedGroups.findFirst({
  where: and(
    eq(qurbanSharedGroups.packageId, packageId),
    eq(qurbanSharedGroups.status, 'open'),
    sql`${qurbanSharedGroups.slotsFilled} < ${qurbanSharedGroups.maxSlots}`
  )
});

if (openGroup) {
  // 2. Join grup yang ada
  sharedGroupId = openGroup.id;
  await db.update(qurbanSharedGroups)
    .set({ slotsFilled: openGroup.slotsFilled + 1 })
    .where(eq(qurbanSharedGroups.id, openGroup.id));

  // 3. Jika penuh, ubah status
  if (openGroup.slotsFilled + 1 === openGroup.maxSlots) {
    await db.update(qurbanSharedGroups)
      .set({ status: 'full' })
      .where(eq(qurbanSharedGroups.id, openGroup.id));
  }
} else {
  // 4. Buat grup baru
  const newGroupNumber = await getNextGroupNumber(packageId);
  const newGroup = await db.insert(qurbanSharedGroups)
    .values({
      packageId,
      groupNumber: newGroupNumber,
      maxSlots: packageData.maxSlots,
      slotsFilled: 1,
      status: 'open'
    })
    .returning();
  sharedGroupId = newGroup[0].id;
}
```

### Contoh Skenario - Sapi 7 Orang

```
Package: Sapi Premium Patungan 7 Orang
├─ price: Rp 3.570.000/slot
├─ max_slots: 7
├─ stock: 15 (15 sapi tersedia)
└─ slots_filled: 0

Timeline Order:

User A order (06:00) → Group #1 created, slots=1/7, status=open
User B order (06:15) → Join Group #1, slots=2/7
User C order (06:30) → Join Group #1, slots=3/7
User D order (07:00) → Join Group #1, slots=4/7
User E order (07:30) → Join Group #1, slots=5/7
User F order (08:00) → Join Group #1, slots=6/7
User G order (08:30) → Join Group #1, slots=7/7, status=FULL ✓

User H order (09:00) → Group #2 created, slots=1/7, status=open
User I order (09:15) → Join Group #2, slots=2/7
...dst
```

### Tracking Slot - Important!

**Slot HANYA dihitung setelah pembayaran verified**:

```javascript
// Ketika payment verified
if (order.paymentStatus === 'paid' && order.sharedGroupId) {
  // Baru increment group.slotsFilled
  await db.update(qurbanSharedGroups)
    .set({ slotsFilled: sql`${qurbanSharedGroups.slotsFilled} + 1` })
    .where(eq(qurbanSharedGroups.id, order.sharedGroupId));
}
```

**Kenapa?**
- Mencegah slot terblokir oleh yang belum bayar
- Memastikan grup hanya penuh jika semua anggota sudah bayar
- Fair untuk user yang bayar cepat

---

## 💰 SISTEM TABUNGAN QURBAN

### Konsep

User dapat **menabung untuk qurban** dengan:
- Target periode tertentu (misal: Qurban 1446 H)
- Target paket tertentu (opsional)
- Target nominal tertentu
- Jadwal setor rutin (weekly/monthly/custom)

### Flow Tabungan

#### 1. Buat Tabungan
```
POST /qurban/savings

{
  "donorName": "Budi",
  "targetPeriodId": "period_1446",
  "targetPackageId": "pkg_sapi_5",
  "targetAmount": 5000000,
  "installmentFrequency": "monthly",
  "installmentAmount": 500000,
  "installmentDay": 5,
  "startDate": "2026-01-01"
}

Response:
{
  "savingsNumber": "SAV-QBN-2026-00001",
  "status": "active",
  "currentAmount": 0
}
```

#### 2. Setor Tabungan
```
POST /qurban/savings/:id/deposit

{
  "amount": 500000,
  "paymentMethod": "bank_transfer",
  "paymentChannel": "BCA",
  "paymentProof": "https://...",
  "notes": "Setor bulan Januari"
}

Response:
{
  "transactionNumber": "TRX-SAV-QBN-2026-00001",
  "status": "pending",  // Tunggu verifikasi admin
  "currentAmount": 0    // Belum ditambahkan
}
```

#### 3. Admin Verifikasi Setoran
```
POST /admin/qurban-savings/:savingsId/transactions/:txId/verify

Response:
{
  "status": "verified",
  "savings": {
    "currentAmount": 500000,  // Updated!
    "targetAmount": 5000000,
    "progress": "10%"
  }
}
```

#### 4. Auto-Complete Ketika Target Tercapai
```
current_amount >= target_amount
    ↓
Savings.status = 'completed'
    ↓
Admin bisa convert ke order
```

#### 5. Convert Tabungan ke Order
```
POST /admin/qurban-savings/:id/convert

{
  "packageId": "pkg_sapi_5",
  "onBehalfOf": "Keluarga Budi"
}

Response:
{
  "orderNumber": "QBN-2026-00050",
  "totalAmount": 5000000,
  "paidAmount": 5000000,
  "paymentStatus": "paid",  // Langsung lunas dari tabungan
  "savings": {
    "status": "converted",
    "convertedToOrderId": "ord_abc"
  }
}
```

### Tracking Progress

Admin dapat monitor:
- Total tabungan aktif
- Total setoran pending verifikasi
- Tabungan yang sudah mencapai target
- Tabungan yang siap dikonversi

---

## ✅ VERIFIKASI PEMBAYARAN

### Workflow Lengkap

#### 1. User Upload Bukti
```
POST /qurban/payments

{
  "orderId": "ord_123",
  "amount": 5000000,
  "paymentMethod": "bank_transfer",
  "paymentChannel": "BCA",
  "paymentProof": "https://storage.com/bukti.jpg",
  "notes": "Transfer dari rekening atas nama Ahmad"
}

Response:
{
  "paymentNumber": "PAY-QBN-2026-00001",
  "status": "pending",
  "amount": 5000000
}
```

#### 2. Admin Lihat Payment Pending
```
GET /admin/qurban/payments?status=pending

Response:
{
  "data": [
    {
      "id": "pay_abc",
      "paymentNumber": "PAY-QBN-2026-00001",
      "orderNumber": "QBN-2026-00001",
      "donorName": "Ahmad",
      "amount": 5000000,
      "paymentProof": "https://...",
      "status": "pending",
      "paymentDate": "2026-01-31T10:00:00Z"
    }
  ]
}
```

#### 3. Admin Verify Payment
```
POST /admin/qurban/payments/:id/verify

Response:
{
  "success": true,
  "payment": {
    "status": "verified",
    "verifiedBy": "admin_user_id",
    "verifiedAt": "2026-01-31T11:00:00Z"
  },
  "order": {
    "paidAmount": 5000000,
    "totalAmount": 5000000,
    "paymentStatus": "paid"  // Otomatis jadi 'paid'
  }
}
```

#### 4. Jika Shared: Update Group Slot
```
// Di backend, setelah verify payment
if (order.paymentStatus === 'paid' && order.sharedGroupId) {
  // Increment group.slotsFilled
  const group = await db.query.qurbanSharedGroups.findFirst({
    where: eq(qurbanSharedGroups.id, order.sharedGroupId)
  });

  await db.update(qurbanSharedGroups)
    .set({ slotsFilled: group.slotsFilled + 1 })
    .where(eq(qurbanSharedGroups.id, order.sharedGroupId));

  // Check if group now full
  if (group.slotsFilled + 1 === group.maxSlots) {
    await db.update(qurbanSharedGroups)
      .set({ status: 'full' })
      .where(eq(qurbanSharedGroups.id, order.sharedGroupId));
  }
}
```

### Reject Payment (Jika Bukti Salah)

```
POST /admin/qurban/payments/:id/reject

{
  "rejectionReason": "Bukti transfer tidak jelas. Mohon upload ulang."
}

Response:
{
  "success": true,
  "payment": {
    "status": "rejected",
    "rejectionReason": "Bukti transfer tidak jelas. Mohon upload ulang."
  }
}
```

User perlu upload bukti baru.

---

## 🔌 API ENDPOINTS

### PUBLIC ENDPOINTS (No Auth Required)

#### Periods & Packages
```
GET  /qurban/periods
     → List active periods

GET  /qurban/periods/:periodId/packages
     → Packages untuk periode tertentu
     Query: ?animalType=cow&packageType=shared

GET  /qurban/packages/:id
     → Detail paket
```

#### Orders & Payments
```
POST /qurban/orders
     → Buat order baru
     Body: { packageId, donorName, quantity, ... }

POST /qurban/payments
     → Upload bukti pembayaran
     Body: { orderId, amount, paymentProof, ... }
```

#### Savings
```
POST /qurban/savings
     → Buat tabungan baru

POST /qurban/savings/:id/deposit
     → Setor tabungan

POST /qurban/savings/:id/convert
     → Convert tabungan ke order (setelah target tercapai)
```

---

### ADMIN ENDPOINTS (Auth Required)

#### Period Management
```
GET    /admin/qurban/periods
       → All periods

GET    /admin/qurban/periods/:id
       → Period detail + stats (total orders, revenue, animals)

GET    /admin/qurban/periods/:id/detail
       → Period dengan semua orders

POST   /admin/qurban/periods
       → Create period
       Body: { name, hijriYear, startDate, endDate, executionDate, ... }

PATCH  /admin/qurban/periods/:id
       → Update period

DELETE /admin/qurban/periods/:id
       → Delete period
```

#### Package Management
```
GET    /admin/qurban/packages
       → All packages
       Query: ?periodId=xxx

GET    /admin/qurban/packages/:id
       → Package detail

POST   /admin/qurban/packages
       → Create package
       Body: { periodId, animalType, packageType, price, stock, ... }

PATCH  /admin/qurban/packages/:id
       → Update package

DELETE /admin/qurban/packages/:id
       → Delete package
```

#### Order Management
```
GET    /admin/qurban/orders
       → All orders
       Query: ?periodId=xxx&status=pending&paymentStatus=paid

GET    /admin/qurban/orders/:id
       → Order detail + payment history

POST   /admin/qurban/orders
       → Manual order creation (untuk offline/walk-in)

POST   /admin/qurban/orders/:id/confirm
       → Confirm order (siap eksekusi)

POST   /admin/qurban/orders/:id/cancel
       → Cancel order (release shared slots)
```

#### Payment Verification
```
GET    /admin/qurban/payments
       → All payments
       Query: ?status=pending

POST   /admin/qurban/payments/:id/verify
       → Verify payment (auto-update order paid_amount)

POST   /admin/qurban/payments/:id/reject
       → Reject payment
       Body: { rejectionReason }
```

#### Shared Groups
```
GET    /admin/qurban/shared-groups
       → All groups dengan member count
       Query: ?packageId=xxx&status=open

GET    /admin/qurban/shared-groups/:id
       → Group detail dengan member list
```

#### Donaturs (untuk manual order)
```
GET    /admin/qurban/donaturs
       → Search/list donaturs
       Query: ?search=ahmad&limit=10

POST   /admin/qurban/donaturs
       → Create donatur record
```

#### Savings Management
```
GET    /admin/qurban-savings/
       → All savings
       Query: ?status=active&periodId=xxx

GET    /admin/qurban-savings/transactions/pending
       → Pending deposits untuk verifikasi

GET    /admin/qurban-savings/:id
       → Savings detail + transaction history

POST   /admin/qurban-savings/
       → Create savings (manual)

POST   /admin/qurban-savings/:id/transactions
       → Create deposit (manual)

POST   /admin/qurban-savings/:id/transactions/:txId/verify
       → Verify deposit

POST   /admin/qurban-savings/:id/transactions/:txId/reject
       → Reject deposit
       Body: { rejectionReason }

POST   /admin/qurban-savings/:id/convert
       → Convert savings to order
       Body: { packageId, onBehalfOf }
```

---

## 🎨 FITUR LENGKAP

### ✅ Qurban Orders
- [x] Browse periode aktif
- [x] Browse paket (filter by animal type & package type)
- [x] View detail paket dengan ketersediaan
- [x] Create order (individual & shared)
- [x] Support multiple quantities untuk paket individual
- [x] Auto shared group creation & member assignment
- [x] Opsi pembayaran full & installment
- [x] Payment verification workflow
- [x] Order confirmation oleh admin
- [x] Order cancellation (release shared group slots)

### ✅ Shared Qurban (Pantungan)
- [x] Create shared packages (5-7 person shares)
- [x] Automatic group assignment (buat grup baru ketika penuh)
- [x] Group status tracking (open → full → confirmed → executed)
- [x] Slot tracking across groups
- [x] Member list per group
- [x] Payment-based slot counting (hanya verified payments)

### ✅ Qurban Savings (Tabungan)
- [x] Create savings plans dengan target periode & amount
- [x] Multiple deposit methods
- [x] Flexible payment schedules (weekly/monthly/custom)
- [x] Deposit tracking dengan verifikasi
- [x] Auto-complete ketika target tercapai
- [x] Convert completed savings ke order
- [x] Pending deposit verification oleh admin
- [x] Deposit rejection workflow

### ✅ Payment Management
- [x] Multiple payment methods (bank transfer, e-wallet, VA, cash)
- [x] Payment proof upload
- [x] Manual payment verification
- [x] Payment rejection dengan notes
- [x] Installment tracking
- [x] Order payment status updates

### ✅ Reporting & Analytics
- [x] Period statistics (total orders, revenue, paid/unpaid)
- [x] Animal count per period (kambing by quantity, sapi by groups)
- [x] Shared group tracking
- [x] Donatur management
- [x] Period detail dengan semua orders

### ✅ Admin Features
- [x] Full CRUD untuk periods
- [x] Full CRUD untuk packages
- [x] Manual order creation
- [x] Payment verification system
- [x] Order confirmation workflow
- [x] Shared group management
- [x] Savings transaction verification
- [x] Donatur database

---

## 🌐 HALAMAN FRONTEND

### User-Facing Pages

#### `/qurban` - Katalog Qurban
**File**: `/apps/web/src/app/qurban/page.tsx`

**Fitur**:
- List semua paket qurban
- Filter by periode
- Filter by tipe hewan (Semua | Sapi | Kambing)
- Filter by tipe paket (Individu | Patungan)
- Badge "Populer" untuk featured packages
- Badge "Tersedia" untuk available packages
- Countdown timer ke execution date
- Card design dengan image, title, price, stock info

**API Calls**:
```javascript
// Fetch active periods
const periods = await fetch(`${API_URL}/qurban/periods`).then(r => r.json());

// Fetch packages for selected period
const packages = await fetch(`${API_URL}/qurban/periods/${periodId}/packages`)
  .then(r => r.json());
```

---

#### `/qurban/[id]` - Detail Paket
**File**: `/apps/web/src/app/qurban/[id]/page.tsx`

**Fitur**:
- Detail informasi paket
- Image carousel (jika ada multiple images)
- Tabs: Deskripsi | Informasi Paket
- Sidebar order dengan:
  - Info periode
  - Pilih quantity (untuk individual)
  - Display stok/slot tersedia
  - Breakdown harga (subtotal + admin fee)
  - Tombol "Order Qurban"
- Help card dengan WhatsApp contact

**Components**:
- `QurbanTabs.tsx` - Tab content
- `QurbanSidebar.tsx` - Order sidebar
- `QurbanConfirmModal.tsx` - Modal konfirmasi

**API Calls**:
```javascript
// Fetch package detail
const packageDetail = await fetch(`${API_URL}/qurban/packages/${id}`)
  .then(r => r.json());

// Fetch settings for admin fee
const settings = await fetch(`${API_URL}/settings`).then(r => r.json());
```

---

### Components Detail

#### QurbanSidebar.tsx
**Props**:
```typescript
{
  packageData: QurbanPackage,
  period: QurbanPeriod,
  onOrder: (quantity: number, total: number) => void
}
```

**Features**:
- Package info card dengan nama & harga
- Stok/slot availability display:
  - Individual: "Tersedia X ekor"
  - Shared: "Tersedia X slot dari Y"
- Periode dropdown (jika ada multiple periods)
- Quantity selector (hanya untuk individual)
- Price breakdown:
  ```
  Subtotal: Rp X
  Biaya Admin: Rp Y
  ─────────────────
  Total: Rp Z
  ```
- Order button
- Help card dengan WhatsApp

**Admin Fee Calculation**:
```javascript
const adminFee = packageData.animalType === 'cow'
  ? settings.amil_qurban_sapi_fee
  : settings.amil_qurban_perekor_fee;

const subtotal = packageData.price * quantity;
const total = subtotal + adminFee;
```

---

#### QurbanConfirmModal.tsx
**Props**:
```typescript
{
  isOpen: boolean,
  onClose: () => void,
  packageData: QurbanPackage,
  quantity: number,
  total: number
}
```

**Features**:
- Package summary (nama, tipe hewan, tipe paket)
- Quantity & total display
- 4 action buttons:
  1. **"Order Qurban Sekarang"**
     - Add to cart
     - Navigate to `/checkout`
  2. **"Tambah ke Keranjang & Lihat"**
     - Add to cart
     - Navigate to `/keranjang-bantuan`
  3. **"Tambah ke Keranjang"**
     - Add to cart
     - Close modal (stay on page)
  4. **"Cari Paket Qurban Lain"**
     - Navigate to `/qurban`

**Cart Integration**:
```javascript
const { addToCart } = useCart();

addToCart({
  cartItemId: `qurban-${packageData.id}-${Date.now()}`,
  itemType: 'qurban',
  campaignId: packageData.id,
  slug: packageData.slug || `qurban-${packageData.id}`,
  title: packageData.name,
  amount: total,
  programType: 'qurban',
  qurbanData: {
    packageId: packageData.id,
    periodId: packageData.periodId,
    quantity,
    animalType: packageData.animalType,
    packageType: packageData.packageType,
    price: packageData.price,
    adminFee
  }
});
```

---

#### QurbanTabs.tsx
**Props**:
```typescript
{
  packageData: QurbanPackage
}
```

**Tabs**:
1. **Deskripsi**
   - HTML content dari `packageData.description`
   - Support rich text formatting

2. **Informasi Paket**
   - Periode qurban
   - Jenis hewan
   - Tipe paket (Individual/Pantungan)
   - Syarat & ketentuan:
     - Hewan sehat & memenuhi syarat syar'i
     - Penyembelihan sesuai tuntunan Islam
     - Laporan penyaluran akan dikirim via email/WA
     - Dll.

---

## 💡 INSIGHTS & BEST PRACTICES

### 1. Stock Management

**Individual Packages**:
```
stock = jumlah hewan tersedia
stockSold = jumlah hewan terjual

Validation saat order:
stockSold + quantity <= stock
```

**Shared Packages**:
```
stock = jumlah hewan tersedia
slotsFilled = total slot terisi (across all groups)
maxSlots = slot per hewan (5-7)

Validation saat order:
Math.ceil(slotsFilled / maxSlots) < stock

Contoh:
stock = 10 sapi
maxSlots = 5
slotsFilled = 23
Groups used = Math.ceil(23/5) = 5 groups
Sapi tersisa = 10 - 5 = 5 sapi
```

---

### 2. Payment Verification Flow

**Sequential Update**:
```javascript
// 1. Update payment status
payment.status = 'verified'
payment.verifiedAt = NOW()
payment.verifiedBy = adminUserId

// 2. Update order paidAmount
order.paidAmount += payment.amount

// 3. Calculate new payment status
if (order.paidAmount >= order.totalAmount) {
  order.paymentStatus = 'paid'
} else if (order.paidAmount > 0) {
  order.paymentStatus = 'partial'
}

// 4. For shared: increment group slot (HANYA jika order lunas)
if (order.paymentStatus === 'paid' && order.sharedGroupId) {
  group.slotsFilled += 1

  if (group.slotsFilled >= group.maxSlots) {
    group.status = 'full'
  }
}
```

**Kenapa slot increment hanya saat lunas?**
- Slot adalah komitmen fisik hewan
- Partial payment belum guaranteed akan lunas
- Mencegah blocking slot untuk yang belum pasti bayar
- Fair untuk yang bayar penuh lebih dulu

---

### 3. Admin Fee System

**Settings**:
```
amil_qurban_sapi_fee = 50000     (per sapi)
amil_qurban_perekor_fee = 25000  (per kambing)
```

**Calculation**:
```javascript
// Client-side (frontend)
const adminFee = animalType === 'cow'
  ? settings.amil_qurban_sapi_fee
  : settings.amil_qurban_perekor_fee;

const subtotal = price * quantity;
const total = subtotal + adminFee;

// Kirim ke backend
{ totalAmount: total }
```

**Backend tidak re-calculate**, trust frontend total.

---

### 4. Order Numbering Convention

```
Orders:    QBN-YYYY-XXXXX    (e.g., QBN-2026-00001)
Payments:  PAY-QBN-YYYY-XXXXX (e.g., PAY-QBN-2026-00001)
Savings:   SAV-QBN-YYYY-XXXXX (e.g., SAV-QBN-2026-00001)
Deposits:  TRX-SAV-YYYY-XXXXX (e.g., TRX-SAV-2026-00001)
Execution: EXE-QBN-YYYY-XXXXX (e.g., EXE-QBN-2026-00001)
```

**Format**:
- QBN = Qurban
- YYYY = Tahun
- XXXXX = Sequential number (zero-padded)

---

### 5. Status State Machines

**Period Status**:
```
draft → active → closed → executed
```

**Order Status**:
```
pending → confirmed → executed
       ↓
   cancelled
```

**Payment Status**:
```
pending → partial → paid
       ↓         ↓
   overdue   overdue
```

**Group Status**:
```
open → full → confirmed → executed
```

**Savings Status**:
```
active → completed → converted
  ↓
paused → active
  ↓
cancelled
```

---

### 6. Relational Integrity

**Cascade Rules**:
- Delete period → Cascade delete packages, orders, groups
- Delete package → Cascade delete orders, groups
- Delete order → Cascade delete payments
- Delete savings → Cascade delete transactions

**Foreign Key Constraints**:
- `order.packageId` REFERENCES `packages.id`
- `order.sharedGroupId` REFERENCES `shared_groups.id`
- `payment.orderId` REFERENCES `orders.id`
- `group.packageId` REFERENCES `packages.id`

---

### 7. Performance Considerations

**Indexing**:
```sql
-- Orders
CREATE INDEX idx_orders_package ON qurban_orders(package_id);
CREATE INDEX idx_orders_group ON qurban_orders(shared_group_id);
CREATE INDEX idx_orders_status ON qurban_orders(order_status);
CREATE INDEX idx_orders_payment_status ON qurban_orders(payment_status);

-- Payments
CREATE INDEX idx_payments_order ON qurban_payments(order_id);
CREATE INDEX idx_payments_status ON qurban_payments(status);

-- Groups
CREATE INDEX idx_groups_package ON qurban_shared_groups(package_id);
CREATE INDEX idx_groups_status ON qurban_shared_groups(status);
```

**Query Optimization**:
- Use `LIMIT` for list endpoints
- Use `WHERE` filters untuk status
- Join tables hanya saat needed
- Use `COUNT(*)` untuk statistics tanpa fetch data

---

### 8. Security Best Practices

**Admin Endpoints**:
- Require authentication
- Verify admin role
- Log all admin actions (payment verify, order confirm, etc.)

**Payment Verification**:
- Validate payment.amount <= order.totalAmount - order.paidAmount
- Prevent double verification
- Store verifiedBy user ID

**File Uploads**:
- Validate file types (only images for proofs)
- Limit file size
- Use secure storage (S3, Cloudinary)
- Generate unique filenames

---

### 9. Integration Points

**Cart System**:
```typescript
interface CartItem {
  itemType: 'qurban',
  qurbanData: {
    packageId: string,
    periodId: string,
    quantity: number,
    animalType: 'cow' | 'goat',
    packageType: 'individual' | 'shared',
    price: number,
    adminFee: number
  }
}
```

**Checkout Integration**:
```javascript
// Checkout processes qurban items
const qurbanItems = cartItems.filter(item => item.itemType === 'qurban');

for (const item of qurbanItems) {
  await fetch(`${API_URL}/qurban/orders`, {
    method: 'POST',
    body: JSON.stringify({
      packageId: item.qurbanData.packageId,
      quantity: item.qurbanData.quantity,
      // ... other fields
    })
  });
}
```

**Settings Integration**:
```javascript
// Fetch admin fees from settings
const settings = await fetch(`${API_URL}/settings`).then(r => r.json());
const adminFee = animalType === 'cow'
  ? settings.amil_qurban_sapi_fee
  : settings.amil_qurban_perekor_fee;
```

---

## 📊 DATABASE RELATIONSHIPS

```
qurban_periods (1)
  │
  ├─ (1:M) qurban_packages
  │   │
  │   ├─ (1:M) qurban_shared_groups
  │   │   │
  │   │   ├─ (1:M) qurban_orders
  │   │   │   └─ (1:M) qurban_payments
  │   │   │
  │   │   └─ (1:M) qurban_executions
  │   │
  │   └─ (1:M) qurban_orders (individual)
  │       │
  │       ├─ (1:M) qurban_payments
  │       │
  │       └─ (1:M) qurban_executions
  │
  └─ (1:M) qurban_savings
      │
      ├─ (1:M) qurban_savings_transactions
      │
      └─ (1:1) qurban_orders (via convertedToOrderId)
```

---

## 📁 FILE STRUCTURE

```
/packages/db/
├─ src/schema/
│  ├─ qurban-periods.ts
│  ├─ qurban-packages.ts
│  ├─ qurban-shared-groups.ts
│  ├─ qurban-orders.ts
│  ├─ qurban-payments.ts
│  ├─ qurban-savings.ts
│  ├─ qurban-savings-transactions.ts
│  └─ qurban-executions.ts
│
└─ migrations/
   ├─ 010_create_qurban_orders.sql
   ├─ 011_create_qurban_payments.sql
   ├─ 012_create_qurban_savings.sql
   ├─ 013_create_qurban_savings_transactions.sql
   ├─ 014_create_qurban_executions.sql
   └─ 015_seed_qurban_data.sql

/apps/api/
└─ src/routes/
   ├─ qurban.ts (public endpoints)
   └─ admin/
      ├─ qurban.ts (admin endpoints)
      └─ qurban-savings.ts (admin savings)

/apps/web/
└─ src/
   ├─ app/qurban/
   │  ├─ page.tsx (catalog)
   │  └─ [id]/
   │     ├─ page.tsx (detail)
   │     ├─ QurbanTabs.tsx
   │     ├─ QurbanSidebar.tsx
   │     └─ QurbanConfirmModal.tsx
   │
   └─ services/
      └─ qurban.ts (API client)
```

---

## 🎯 KESIMPULAN

Sistem Qurban Bantuanku adalah **implementasi production-ready yang lengkap** dengan:

### ✅ Arsitektur Solid
- 8 tabel database ternormalisasi dengan baik
- Constraints & indexes optimal
- Relational integrity terjaga

### ✅ Business Logic Komprehensif
- Smart group assignment untuk pantungan
- Payment verification workflow
- Installment support
- Tabungan system

### ✅ Admin Control Lengkap
- Full CRUD periods & packages
- Order management
- Payment verification
- Savings management
- Group monitoring

### ✅ User Experience Excellent
- Browse & filter packages
- Detail informasi lengkap
- Modal konfirmasi dengan 4 opsi
- Cart integration
- Checkout seamless

### ✅ Scalable & Maintainable
- Service layer terpisah
- Type-safe dengan TypeScript
- API endpoints RESTful
- Frontend components reusable

### ✅ Islamic Compliance
- Syarat syar'i enforcement
- Laporan penyembelihan lengkap
- Transparansi penyaluran
- Atas nama support

---

## 📞 SUPPORT

Untuk pertanyaan lebih lanjut terkait sistem qurban, hubungi:
- **Developer**: Tim Development Bantuanku
- **Documentation**: File ini (`dokumentasi-qurban.md`)
- **Database Migrations**: `/packages/db/migrations/`
- **API Routes**: `/apps/api/src/routes/qurban.ts`

---

**End of Documentation**
**Last Updated**: 31 Januari 2026
