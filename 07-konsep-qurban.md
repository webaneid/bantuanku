# Konsep Fitur Qurban - Database & Logic Design

## 📋 Ringkasan Kebutuhan

### Fitur Utama
1. **Produk Qurban**: Sapi dan Kambing dengan harga bervariasi per periode
2. **Periode**: Qurban tahunan (misal: Qurban 2026) dengan durasi tertentu
3. **Pembelian**:
   - **Kambing**: 1 orang = 1 kambing (tidak bisa dibagi)
   - **Sapi**: Bisa dibeli utuh (1 orang) atau dibagi (5-7 orang tergantung setting)
4. **Pembayaran**:
   - Lunas langsung
   - Cicilan/Tabungan (mingguan/bulanan sesuai pilihan user)
5. **Tabungan Qurban**: Nabung untuk periode mendatang (misal nabung 2026 untuk qurban 2027)
6. **Slot Sharing**: Tracking berapa orang sudah join untuk 1 sapi yang dibagi
7. **Laporan**: Total hewan yang akan diqurbankan per periode

---

## 🗄️ Database Schema

### 1. `qurban_periods` - Periode Qurban
Periode aktif untuk penerimaan qurban (misal: Qurban 1446 H / 2026 M)

```sql
CREATE TABLE qurban_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                        -- "Qurban 1446 H / 2026"
  hijri_year TEXT NOT NULL,                  -- "1446"
  gregorian_year INTEGER NOT NULL,           -- 2026
  start_date DATE NOT NULL,                  -- Mulai penerimaan (misal: 1 Jan 2026)
  end_date DATE NOT NULL,                    -- Tutup penerimaan (misal: 5 Dzulhijjah 1446 / 5 Juni 2026)
  execution_date DATE NOT NULL,              -- Tanggal penyembelihan (10 Dzulhijjah / Idul Adha)
  status TEXT NOT NULL DEFAULT 'draft',      -- draft, active, closed, executed
  description TEXT,                          -- Deskripsi periode
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL
);
```

**Status Flow**:
- `draft`: Belum dibuka untuk umum (admin sedang setup)
- `active`: Terbuka untuk penerimaan order
- `closed`: Tutup penerimaan (sudah deadline)
- `executed`: Sudah dilaksanakan penyembelihan

---

### 2. `qurban_packages` - Paket Qurban
Produk qurban yang tersedia per periode

```sql
CREATE TABLE qurban_packages (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES qurban_periods(id),
  
  -- Detail Hewan
  animal_type TEXT NOT NULL,                 -- 'cow' (sapi) atau 'goat' (kambing)
  package_type TEXT NOT NULL,                -- 'individual' (kambing atau sapi utuh) atau 'shared' (sapi patungan)
  name TEXT NOT NULL,                        -- "Sapi A+" atau "Kambing Premium"
  description TEXT,
  image_url TEXT,
  
  -- Pricing
  price BIGINT NOT NULL,                     -- Harga (untuk individual = full price, untuk shared = price per slot)
  
  -- Sharing Configuration (untuk sapi patungan)
  max_slots INTEGER,                         -- Maksimal pembagi (misal: 5 atau 7). NULL jika individual
  slots_filled INTEGER DEFAULT 0,            -- Berapa slot sudah terisi
  
  -- Stock
  stock INTEGER NOT NULL DEFAULT 0,          -- Jumlah hewan tersedia
  stock_sold INTEGER DEFAULT 0,              -- Jumlah hewan terjual (untuk individual) atau hewan terpenuhi (untuk shared)
  
  -- Status
  is_available BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_animal_type CHECK (animal_type IN ('cow', 'goat')),
  CONSTRAINT valid_package_type CHECK (package_type IN ('individual', 'shared')),
  CONSTRAINT valid_slots CHECK (
    (package_type = 'individual' AND max_slots IS NULL) OR 
    (package_type = 'shared' AND max_slots > 1)
  )
);
```

**Contoh Data**:
```
| name              | animal_type | package_type | price      | max_slots | stock |
|-------------------|-------------|--------------|------------|-----------|-------|
| Sapi A+ Utuh      | cow         | individual   | 25000000   | NULL      | 10    |
| Sapi A+ Patungan  | cow         | shared       | 5000000    | 5         | 20    |
| Sapi Premium 7    | cow         | shared       | 3571428    | 7         | 15    |
| Kambing Premium   | goat        | individual   | 3000000    | NULL      | 50    |
| Kambing Reguler   | goat        | individual   | 2500000    | NULL      | 100   |
```

---

### 3. `qurban_shared_groups` - Grup Patungan Sapi
Untuk tracking siapa saja yang patungan dalam 1 sapi

```sql
CREATE TABLE qurban_shared_groups (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES qurban_packages(id),
  group_number INTEGER NOT NULL,             -- Sapi ke-berapa (misal: Sapi #1, #2, dst)
  max_slots INTEGER NOT NULL,                -- Copy dari package.max_slots
  slots_filled INTEGER DEFAULT 0 NOT NULL,   -- Berapa orang sudah join
  status TEXT DEFAULT 'open' NOT NULL,       -- open, full, confirmed, executed
  
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_group_status CHECK (status IN ('open', 'full', 'confirmed', 'executed')),
  UNIQUE(package_id, group_number)
);
```

**Status Flow**:
- `open`: Masih terima pendaftar
- `full`: Slot sudah penuh (slots_filled = max_slots)
- `confirmed`: Sudah dikonfirmasi admin, siap eksekusi
- `executed`: Sudah disembelih

**Logic**:
- Ketika user beli shared package, sistem cari group dengan status='open' dan slots_filled < max_slots
- Jika tidak ada, buat group baru
- Jika slots_filled mencapai max_slots → update status ke 'full'

---

### 4. `qurban_orders` - Order Qurban
Pembelian qurban oleh user

```sql
CREATE TABLE qurban_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,         -- QBN-2026-00001
  
  -- User Info
  user_id TEXT REFERENCES users(id),         -- NULL jika guest/manual entry by admin
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT NOT NULL,
  
  -- Package Info
  package_id TEXT NOT NULL REFERENCES qurban_packages(id),
  shared_group_id TEXT REFERENCES qurban_shared_groups(id), -- NULL jika individual
  
  -- Pricing
  quantity INTEGER DEFAULT 1 NOT NULL,       -- Untuk individual bisa > 1 (misal: beli 2 kambing)
  unit_price BIGINT NOT NULL,                -- Harga satuan saat order
  total_amount BIGINT NOT NULL,              -- quantity * unit_price
  
  -- Pembayaran
  payment_method TEXT NOT NULL,              -- 'full' (lunas) atau 'installment' (cicilan)
  installment_frequency TEXT,                -- 'weekly', 'monthly', 'custom' (jika payment_method = installment)
  installment_count INTEGER,                 -- Berapa kali cicilan (jika payment_method = installment)
  installment_amount BIGINT,                 -- Nominal per cicilan
  paid_amount BIGINT DEFAULT 0 NOT NULL,     -- Total yang sudah dibayar
  
  -- Status
  payment_status TEXT DEFAULT 'pending' NOT NULL, -- pending, partial, paid, overdue
  order_status TEXT DEFAULT 'pending' NOT NULL,   -- pending, confirmed, cancelled, executed
  
  -- Atas Nama (penyembelihan)
  on_behalf_of TEXT NOT NULL,                -- Atas nama siapa qurban ini
  
  -- Timestamps
  order_date TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMP(3),                 -- Kapan dikonfirmasi admin
  executed_at TIMESTAMP(3),                  -- Kapan disembelih
  
  notes TEXT,
  created_by TEXT REFERENCES users(id),      -- Admin yang input (jika manual)
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('full', 'installment')),
  CONSTRAINT valid_installment_freq CHECK (installment_frequency IN ('weekly', 'monthly', 'custom') OR installment_frequency IS NULL),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  CONSTRAINT valid_order_status CHECK (order_status IN ('pending', 'confirmed', 'cancelled', 'executed'))
);
```

**Payment Status Logic**:
- `pending`: Belum ada pembayaran sama sekali (paid_amount = 0)
- `partial`: Sudah bayar sebagian (0 < paid_amount < total_amount)
- `paid`: Lunas (paid_amount >= total_amount)
- `overdue`: Melebihi deadline tapi belum lunas

**Order Status Logic**:
- `pending`: Menunggu pembayaran atau konfirmasi
- `confirmed`: Dikonfirmasi admin, masuk antrian penyembelihan
- `cancelled`: Dibatalkan (user/admin)
- `executed`: Sudah disembelih

---

### 5. `qurban_payments` - Pembayaran Qurban
History pembayaran untuk setiap order

```sql
CREATE TABLE qurban_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,       -- PAY-QBN-2026-00001
  order_id TEXT NOT NULL REFERENCES qurban_orders(id),
  
  -- Payment Details
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  payment_method TEXT NOT NULL,              -- 'bank_transfer', 'ewallet', 'cash', 'va'
  payment_channel TEXT,                      -- 'BCA', 'Mandiri', 'GoPay', dst
  
  -- Installment Info (jika ini pembayaran cicilan)
  installment_number INTEGER,                -- Cicilan ke-berapa (1, 2, 3, dst)
  
  -- Proof & Verification
  payment_proof TEXT,                        -- URL bukti transfer (jika manual)
  verified_by TEXT REFERENCES users(id),     -- Admin yang verifikasi
  verified_at TIMESTAMP(3),
  
  -- Status
  status TEXT DEFAULT 'pending' NOT NULL,    -- pending, verified, rejected
  
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'verified', 'rejected'))
);
```

---

### 6. `qurban_savings` - Tabungan Qurban
Untuk user yang ingin menabung qurban (bisa untuk periode mendatang)

```sql
CREATE TABLE qurban_savings (
  id TEXT PRIMARY KEY,
  savings_number TEXT UNIQUE NOT NULL,       -- SAV-QBN-2026-00001
  
  -- User Info
  user_id TEXT REFERENCES users(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT NOT NULL,
  
  -- Target
  target_period_id TEXT NOT NULL REFERENCES qurban_periods(id), -- Untuk qurban periode mana
  target_package_id TEXT REFERENCES qurban_packages(id),        -- (Optional) Target paket tertentu
  target_amount BIGINT NOT NULL,             -- Target uang yang ingin ditabung
  current_amount BIGINT DEFAULT 0 NOT NULL,  -- Total yang sudah ditabung
  
  -- Schedule
  installment_frequency TEXT NOT NULL,       -- 'weekly', 'monthly', 'custom'
  installment_amount BIGINT NOT NULL,        -- Nominal per tabungan
  installment_day INTEGER,                   -- Hari ke- (jika monthly: 1-31, weekly: 1-7/Mon-Sun)
  start_date DATE NOT NULL,                  -- Mulai nabung
  
  -- Status
  status TEXT DEFAULT 'active' NOT NULL,     -- active, paused, completed, converted, cancelled
  
  -- Conversion (ketika tabungan dikonversi jadi order)
  converted_to_order_id TEXT REFERENCES qurban_orders(id),
  converted_at TIMESTAMP(3),
  
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_savings_frequency CHECK (installment_frequency IN ('weekly', 'monthly', 'custom')),
  CONSTRAINT valid_savings_status CHECK (status IN ('active', 'paused', 'completed', 'converted', 'cancelled'))
);
```

**Status Flow**:
- `active`: Sedang berjalan, terima setoran
- `paused`: Ditunda sementara
- `completed`: Target tercapai, siap dikonversi
- `converted`: Sudah dikonversi jadi order
- `cancelled`: Dibatalkan (dana dikembalikan atau dipindah ke donasi)

---

### 7. `qurban_savings_transactions` - Transaksi Tabungan
History setoran tabungan

```sql
CREATE TABLE qurban_savings_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL,   -- TRX-SAV-QBN-2026-00001
  savings_id TEXT NOT NULL REFERENCES qurban_savings(id),
  
  -- Transaction Details
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,            -- 'deposit' (setor), 'withdrawal' (tarik), 'conversion' (konversi ke order)
  transaction_date TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  payment_method TEXT,                       -- 'bank_transfer', 'ewallet', 'va', dst
  payment_channel TEXT,
  
  -- Proof & Verification
  payment_proof TEXT,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP(3),
  status TEXT DEFAULT 'pending' NOT NULL,    -- pending, verified, rejected
  
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('deposit', 'withdrawal', 'conversion')),
  CONSTRAINT valid_transaction_status CHECK (status IN ('pending', 'verified', 'rejected'))
);
```

---

### 8. `qurban_executions` - Laporan Penyembelihan
Detail penyembelihan yang sudah dilakukan

```sql
CREATE TABLE qurban_executions (
  id TEXT PRIMARY KEY,
  execution_number TEXT UNIQUE NOT NULL,     -- EXE-QBN-2026-00001
  
  -- Grup Info (jika shared) atau Order Info (jika individual)
  shared_group_id TEXT REFERENCES qurban_shared_groups(id),  -- Jika sapi patungan
  order_id TEXT REFERENCES qurban_orders(id),                -- Jika individual (kambing atau sapi utuh)
  
  -- Execution Details
  execution_date TIMESTAMP(3) NOT NULL,      -- Tanggal penyembelihan
  location TEXT NOT NULL,                    -- Lokasi penyembelihan
  butcher_name TEXT,                         -- Nama jagal/panitia
  
  -- Animal Details
  animal_type TEXT NOT NULL,                 -- cow/goat
  animal_weight DECIMAL(10,2),               -- Berat hewan (kg)
  animal_condition TEXT,                     -- Kondisi hewan (sehat, dll)
  
  -- Distribution
  distribution_method TEXT,                  -- 'direct_pickup', 'distribution', 'donation'
  distribution_notes TEXT,
  
  -- Media
  photos TEXT,                               -- JSON array of photo URLs
  video_url TEXT,
  
  -- Recipients (jika distribusi ke mustahiq)
  recipient_count INTEGER,                   -- Berapa orang penerima
  recipient_list TEXT,                       -- JSON array of recipient names
  
  executed_by TEXT REFERENCES users(id),     -- Admin yang input laporan
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_animal_type CHECK (animal_type IN ('cow', 'goat')),
  CONSTRAINT valid_distribution CHECK (distribution_method IN ('direct_pickup', 'distribution', 'donation'))
);
```

---

## 🔄 Flow & Logic

### Flow 1: Setup Periode Qurban (Admin)

**Step 1**: Admin buat periode baru
```
POST /admin/qurban/periods
Body:
{
  name: "Qurban 1446 H / 2026",
  hijri_year: "1446",
  gregorian_year: 2026,
  start_date: "2026-01-01",
  end_date: "2026-06-05",
  execution_date: "2026-06-07",
  status: "draft"
}
```

**Step 2**: Admin setup paket qurban
```
POST /admin/qurban/packages
Body:
[
  {
    period_id: "period_id",
    animal_type: "cow",
    package_type: "shared",
    name: "Sapi A+ Patungan 5 Orang",
    price: 5000000,
    max_slots: 5,
    stock: 20
  },
  {
    period_id: "period_id",
    animal_type: "goat",
    package_type: "individual",
    name: "Kambing Premium",
    price: 3000000,
    stock: 50
  }
]
```

**Step 3**: Admin aktifkan periode
```
PATCH /admin/qurban/periods/:id
Body: { status: "active" }
```

---

### Flow 2: User Beli Qurban Lunas (Website)

**Step 1**: User pilih paket di katalog
```
GET /qurban/packages?period_id=xxx
Response:
[
  {
    id: "pkg_1",
    name: "Sapi A+ Patungan 5 Orang",
    animal_type: "cow",
    package_type: "shared",
    price: 5000000,
    max_slots: 5,
    available_slots: 3, // 5 - slots_filled
    stock_available: 15
  }
]
```

**Step 2**: User checkout
```
POST /qurban/orders
Body:
{
  package_id: "pkg_1",
  quantity: 1,
  payment_method: "full",
  donor_name: "Ahmad",
  donor_phone: "08123456789",
  on_behalf_of: "Keluarga Ahmad"
}

Logic Backend:
1. Cek stock package
2. Jika shared:
   - Cari shared_group dengan status='open' dan slots < max_slots
   - Jika tidak ada, buat group baru
   - Assign order ke group tersebut
   - Increment group.slots_filled
   - Jika slots_filled == max_slots, update group.status = 'full'
3. Jika individual:
   - Decrement package.stock
   - Increment package.stock_sold
4. Create order dengan status pending
5. Generate payment (VA/QRIS/manual)
```

**Step 3**: User bayar
```
POST /qurban/payments
Body:
{
  order_id: "order_id",
  amount: 5000000,
  payment_method: "bank_transfer",
  payment_channel: "BCA",
  payment_proof: "url_to_image"
}

Logic:
1. Create payment record
2. Jika auto-verify (e.g., payment gateway callback):
   - Update payment.status = 'verified'
   - Update order.paid_amount += amount
   - Jika paid_amount >= total_amount:
     - Update order.payment_status = 'paid'
3. Jika manual:
   - Payment.status = 'pending' → tunggu admin verifikasi
```

---

### Flow 3: User Beli Qurban Cicilan

**Step 1**: User checkout dengan cicilan
```
POST /qurban/orders
Body:
{
  package_id: "pkg_1",
  quantity: 1,
  payment_method: "installment",
  installment_frequency: "monthly",
  installment_count: 5,
  installment_amount: 1000000, // 5jt / 5 bulan
  donor_name: "Ahmad",
  donor_phone: "08123456789",
  on_behalf_of: "Keluarga Ahmad"
}

Logic:
- Sama seperti lunas, tapi:
  - Order.payment_status = 'pending'
  - Order tetap assigned ke shared_group (slot tetap terisi)
  - Create reminder untuk pembayaran cicilan
```

**Step 2**: User bayar cicilan pertama
```
POST /qurban/payments
Body:
{
  order_id: "order_id",
  amount: 1000000,
  installment_number: 1,
  payment_method: "bank_transfer"
}

Logic:
- Update order.paid_amount += 1000000
- Update order.payment_status = 'partial'
```

**Step 3**: Ulangi sampai lunas
- Cicilan ke-2, ke-3, dst sampai paid_amount >= total_amount
- Jika lunas, payment_status = 'paid'

**Edge Case - Overdue**:
```
Cron Job harian:
- Cek order dengan payment_status != 'paid'
- Jika order.created_at + grace_period > now:
  - Update order.payment_status = 'overdue'
  - Kirim notifikasi reminder
  - Jika melebihi batas maksimal overdue:
    - Cancel order
    - Release slot di shared_group
```

---

### Flow 4: User Nabung Qurban

**Step 1**: User buat tabungan
```
POST /qurban/savings
Body:
{
  target_period_id: "period_2027", // Nabung untuk qurban 2027
  target_package_id: "pkg_sapi_2027",
  target_amount: 5000000,
  installment_frequency: "monthly",
  installment_amount: 500000, // 500rb per bulan
  installment_day: 1, // Tanggal 1 setiap bulan
  start_date: "2026-01-01",
  donor_name: "Ahmad",
  donor_phone: "08123456789"
}

Logic:
- Create savings record dengan status='active'
- Setup reminder/notifikasi per periode (monthly tanggal 1)
```

**Step 2**: User setor tabungan
```
POST /qurban/savings/:id/deposit
Body:
{
  amount: 500000,
  payment_method: "bank_transfer",
  payment_channel: "BCA"
}

Logic:
1. Create savings_transaction dengan type='deposit'
2. Update savings.current_amount += amount
3. Jika current_amount >= target_amount:
   - Update savings.status = 'completed'
   - Kirim notifikasi ke user bahwa tabungan cukup
```

**Step 3**: Konversi tabungan ke order
```
POST /qurban/savings/:id/convert-to-order
Body:
{
  package_id: "pkg_sapi_2027", // Paket yang dipilih (bisa beda dari target awal)
  on_behalf_of: "Keluarga Ahmad"
}

Logic:
1. Validasi:
   - savings.status = 'completed'
   - current_amount >= package.price
2. Create order dari savings:
   - total_amount = package.price
   - paid_amount = package.price (langsung lunas)
   - payment_status = 'paid'
3. Create savings_transaction dengan type='conversion'
4. Update savings:
   - status = 'converted'
   - converted_to_order_id = new_order.id
   - converted_at = now
5. Jika ada sisa dana (current_amount > package.price):
   - Bisa dikembalikan atau simpan untuk periode berikutnya
```

---

### Flow 5: Admin Kelola & Konfirmasi Order

**Dashboard Admin**:
```
GET /admin/qurban/orders?period_id=xxx&status=pending

View:
- List order pending
- Filter: payment_status, order_status, package
- Bulk action: confirm, cancel
```

**Verifikasi Pembayaran Manual**:
```
PATCH /admin/qurban/payments/:id/verify
Body: { status: "verified" }

Logic:
1. Update payment.status = 'verified'
2. Update payment.verified_by = admin.id
3. Update order.paid_amount += payment.amount
4. Jika paid_amount >= total_amount:
   - Update order.payment_status = 'paid'
```

**Konfirmasi Order**:
```
PATCH /admin/qurban/orders/:id/confirm

Logic:
- Update order.order_status = 'confirmed'
- Update order.confirmed_at = now
- Kirim notifikasi ke user (confirmed)
```

---

### Flow 6: Laporan Penyembelihan

**Step 1**: Admin lihat grup yang siap eksekusi
```
GET /admin/qurban/shared-groups?status=full&period_id=xxx

Response:
[
  {
    id: "group_1",
    package_name: "Sapi A+ Patungan 5 Orang",
    group_number: 1,
    slots_filled: 5,
    orders: [
      { donor_name: "Ahmad", on_behalf_of: "Keluarga Ahmad" },
      { donor_name: "Budi", on_behalf_of: "Keluarga Budi" },
      ...
    ]
  }
]
```

**Step 2**: Admin input laporan eksekusi
```
POST /admin/qurban/executions
Body:
{
  shared_group_id: "group_1", // atau order_id jika individual
  execution_date: "2026-06-07",
  location: "Masjid Al-Ikhlas",
  butcher_name: "Panitia Qurban Masjid",
  animal_type: "cow",
  animal_weight: 450.5,
  distribution_method: "distribution",
  recipient_count: 50,
  photos: ["url1", "url2", "url3"]
}

Logic:
1. Create execution record
2. Update shared_group.status = 'executed' (atau order.order_status = 'executed')
3. Update semua order dalam group:
   - order_status = 'executed'
   - executed_at = execution_date
4. Kirim notifikasi ke semua donor dalam group
```

---

## 📊 Reporting & Dashboard

### Dashboard Admin

**Statistik Periode**:
```sql
-- Total order per periode
SELECT 
  p.name as period_name,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) as total_revenue,
  SUM(o.paid_amount) as total_paid,
  COUNT(DISTINCT CASE WHEN o.payment_status = 'paid' THEN o.id END) as paid_orders,
  COUNT(DISTINCT CASE WHEN o.payment_status = 'overdue' THEN o.id END) as overdue_orders
FROM qurban_periods p
LEFT JOIN qurban_packages pkg ON pkg.period_id = p.id
LEFT JOIN qurban_orders o ON o.package_id = pkg.id
WHERE p.id = 'period_id'
GROUP BY p.id;
```

**Total Hewan per Periode**:
```sql
-- Sapi
SELECT 
  COUNT(DISTINCT sg.id) as total_cows_shared, -- Dari patungan
  (SELECT COUNT(*) FROM qurban_orders o 
   JOIN qurban_packages pkg ON o.package_id = pkg.id
   WHERE pkg.animal_type = 'cow' AND pkg.package_type = 'individual' 
   AND pkg.period_id = 'period_id' AND o.payment_status = 'paid'
  ) as total_cows_individual
FROM qurban_shared_groups sg
JOIN qurban_packages pkg ON sg.package_id = pkg.id
WHERE pkg.period_id = 'period_id' AND sg.status = 'full';

-- Kambing
SELECT 
  SUM(o.quantity) as total_goats
FROM qurban_orders o
JOIN qurban_packages pkg ON o.package_id = pkg.id
WHERE pkg.animal_type = 'goat' 
AND pkg.period_id = 'period_id' 
AND o.payment_status = 'paid';
```

**Slot Tracking Sapi Patungan**:
```sql
SELECT 
  pkg.name,
  sg.group_number,
  sg.max_slots,
  sg.slots_filled,
  sg.status,
  (sg.max_slots - sg.slots_filled) as available_slots
FROM qurban_shared_groups sg
JOIN qurban_packages pkg ON sg.package_id = pkg.id
WHERE pkg.period_id = 'period_id'
ORDER BY pkg.name, sg.group_number;
```

---

### Dashboard User

**My Orders**:
```sql
SELECT 
  o.order_number,
  pkg.name as package_name,
  o.total_amount,
  o.paid_amount,
  o.payment_status,
  o.order_status,
  CASE 
    WHEN o.shared_group_id IS NOT NULL THEN sg.group_number
    ELSE NULL
  END as group_number
FROM qurban_orders o
JOIN qurban_packages pkg ON o.package_id = pkg.id
LEFT JOIN qurban_shared_groups sg ON o.shared_group_id = sg.id
WHERE o.user_id = 'user_id'
ORDER BY o.order_date DESC;
```

**My Savings**:
```sql
SELECT 
  s.savings_number,
  p.name as target_period,
  s.target_amount,
  s.current_amount,
  (s.target_amount - s.current_amount) as remaining,
  s.status,
  (SELECT COUNT(*) FROM qurban_savings_transactions WHERE savings_id = s.id AND status = 'verified') as total_deposits
FROM qurban_savings s
JOIN qurban_periods p ON s.target_period_id = p.id
WHERE s.user_id = 'user_id'
ORDER BY s.created_at DESC;
```

---

## 🎨 UI/UX Flow

### Halaman Katalog Qurban (Public)
```
/qurban
/qurban/2026

Layout:
- Hero: "Qurban 1446 H / 2026"
- Info: Deadline pendaftaran
- Filter: Semua | Sapi | Kambing | Patungan
- Card per paket:
  - Image hewan
  - Nama paket
  - Harga
  - Badge: "Sisa 3 slot" (untuk patungan) atau "Stok: 45" (individual)
  - Button: "Pesan Sekarang" | "Nabung Qurban"
```

### Halaman Detail Paket
```
/qurban/packages/:id

Sections:
- Image gallery
- Info paket (hewan, berat estimasi, dll)
- Harga
- Untuk patungan: "Bergabung dengan X orang lainnya"
- Form order:
  - Quantity (untuk kambing bisa > 1)
  - Atas nama
  - Metode bayar: Lunas | Cicilan
  - Jika cicilan: pilih periode (bulanan/mingguan), jumlah cicilan
- Button: "Lanjut Pembayaran"
```

### Halaman Tabungan Qurban
```
/qurban/savings/new

Form:
- Target periode (dropdown periode aktif)
- Target paket (dropdown)
- Target jumlah (bisa custom atau otomatis dari harga paket)
- Frekuensi: Bulanan | Mingguan
- Nominal per setor
- Tanggal mulai
- Button: "Buat Tabungan"
```

### Dashboard User
```
/profile/qurban

Tabs:
1. Order Saya
   - List order dengan status
   - Button bayar cicilan (jika partial)
   - Button lihat detail
   
2. Tabungan Saya
   - List tabungan
   - Progress bar (current/target)
   - Button setor
   - Button konversi (jika completed)
   
3. Riwayat
   - History pembayaran
   - History penyembelihan (jika executed)
```

---

## 🔐 Permissions & Roles

### Roles
- **Super Admin**: Full access
- **Admin Qurban**: Kelola periode, paket, verifikasi payment, input laporan eksekusi
- **User**: Pesan, bayar, lihat order sendiri

### Endpoints Permissions
```
Public:
- GET /qurban/periods (hanya yang active)
- GET /qurban/packages
- GET /qurban/packages/:id

Authenticated User:
- POST /qurban/orders
- POST /qurban/payments
- GET /qurban/orders/my-orders
- POST /qurban/savings
- POST /qurban/savings/:id/deposit
- POST /qurban/savings/:id/convert-to-order
- GET /qurban/savings/my-savings

Admin Qurban:
- POST /admin/qurban/periods
- PATCH /admin/qurban/periods/:id
- POST /admin/qurban/packages
- PATCH /admin/qurban/packages/:id
- GET /admin/qurban/orders (all)
- PATCH /admin/qurban/orders/:id/confirm
- PATCH /admin/qurban/orders/:id/cancel
- PATCH /admin/qurban/payments/:id/verify
- GET /admin/qurban/shared-groups
- POST /admin/qurban/executions
- GET /admin/qurban/reports/*
```

---

## ⚙️ Cron Jobs & Automation

### 1. Reminder Cicilan (Daily)
```javascript
// Setiap hari jam 08:00
// Cari order dengan payment_method='installment' dan payment_status != 'paid'
// Cek jadwal cicilan berikutnya
// Kirim reminder via email/WA jika H-3, H-1, atau H+0

SELECT o.* FROM qurban_orders o
WHERE o.payment_method = 'installment'
AND o.payment_status != 'paid'
AND (next_installment_due_date - CURRENT_DATE) <= 3;
```

### 2. Check Overdue (Daily)
```javascript
// Setiap hari jam 00:00
// Cari order yang melebihi grace period tapi belum lunas
// Update status jadi overdue
// Kirim notifikasi

UPDATE qurban_orders 
SET payment_status = 'overdue'
WHERE payment_status IN ('pending', 'partial')
AND created_at + INTERVAL '30 days' < NOW(); -- grace period 30 hari
```

### 3. Reminder Tabungan (Daily/Weekly/Monthly)
```javascript
// Sesuai schedule di qurban_savings.installment_frequency
// Kirim reminder setor tabungan

SELECT s.* FROM qurban_savings s
WHERE s.status = 'active'
AND (
  (s.installment_frequency = 'monthly' AND EXTRACT(DAY FROM CURRENT_DATE) = s.installment_day) OR
  (s.installment_frequency = 'weekly' AND EXTRACT(DOW FROM CURRENT_DATE) = s.installment_day)
);
```

### 4. Auto Close Period (Daily)
```javascript
// Setiap hari jam 23:59
// Tutup periode yang sudah melewati end_date

UPDATE qurban_periods
SET status = 'closed'
WHERE status = 'active'
AND end_date < CURRENT_DATE;
```

---

## 🧪 Test Cases

### Test Case 1: Beli Sapi Patungan
```
Scenario: 5 user beli sapi patungan 5 slot
1. User A order → create group #1, slots_filled = 1
2. User B order → join group #1, slots_filled = 2
3. User C order → join group #1, slots_filled = 3
4. User D order → join group #1, slots_filled = 4
5. User E order → join group #1, slots_filled = 5, status = 'full'
6. User F order → create group #2, slots_filled = 1

Expected:
- Total groups: 2
- Group #1: full (5 orang)
- Group #2: open (1 orang)
```

### Test Case 2: Tabungan Konversi
```
Scenario: User nabung 10 bulan, konversi ke order
1. User create savings: target 5jt, 500rb/bulan
2. User setor 10x: current_amount = 5jt, status = 'completed'
3. User convert to order
4. Order created: paid_amount = 5jt, payment_status = 'paid'
5. Savings: status = 'converted'

Expected:
- Order langsung lunas
- Assigned ke shared group
- Savings tidak bisa digunakan lagi
```

### Test Case 3: Cicilan Overdue
```
Scenario: User cicilan tapi tidak bayar tepat waktu
1. User order dengan cicilan 5x, 1jt/bulan
2. User bayar cicilan 1: paid_amount = 1jt
3. 30 hari berlalu, tidak ada pembayaran
4. Cron job running: payment_status = 'overdue'
5. 60 hari berlalu: order cancelled, slot released

Expected:
- Notifikasi overdue terkirim
- Order cancelled
- Slot di shared_group -1
```

---

## 📋 Implementation Checklist

### Phase 1: Database (2 jam) ✅ COMPLETED
- [x] Create all 8 tables with proper constraints
- [x] Create indexes for performance
- [x] Seed initial data (periods, packages)
- [x] Write migration files

### Phase 2: Backend API (8 jam) ✅ COMPLETED
- [x] Period CRUD endpoints
- [x] Package CRUD endpoints
- [x] Order creation & payment flow
- [x] Savings creation & deposit flow
- [x] Shared group logic
- [x] Payment verification endpoints
- [ ] Execution report endpoints
- [ ] Dashboard/reporting queries

### Phase 3: Frontend Admin (8 jam) ✅ COMPLETED
- [x] Period management
- [x] Package management
- [x] Order list & verification
- [x] Payment verification
- [x] Shared group tracking
- [ ] Execution report form
- [ ] Dashboard & statistics

### Phase 4: Frontend Public (6 jam) ⏸️ PENDING - Lanjutkan saat bikin frontend public
**📌 IMPORTANT: Harus dikerjakan saat develop frontend public untuk donatur**
- [ ] Katalog qurban page (/qurban)
- [ ] Detail paket page (/qurban/packages/:id)
- [ ] Checkout flow (lunas/cicilan)
- [ ] Tabungan qurban form
- [ ] Payment confirmation page

### Phase 5: Frontend User Dashboard (4 jam) ⏸️ PENDING - Lanjutkan saat bikin frontend public
**📌 IMPORTANT: Harus dikerjakan saat develop frontend public untuk donatur**
- [ ] My orders list & detail
- [ ] My savings list & management
- [ ] Payment history
- [ ] Deposit tabungan form
- [ ] Convert savings to order

### Phase 6: Automation (4 jam) ⏸️ PENDING
- [ ] Setup cron jobs
- [ ] Email/WA notification system
- [ ] Payment gateway integration
- [ ] Auto-verify payment callback

### Phase 7: Testing (4 jam) ⏸️ PENDING
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Load testing (simulate ramai order)

---

## 📊 Progress Summary

**STATUS**: Phase 3 Complete - Ready for Public Frontend Development

**Completed**:
✅ Phase 1: Database (8 tables, migrations, seed data)  
✅ Phase 2: Backend API (admin + public routes, shared group logic)  
✅ Phase 3: Frontend Admin (5 pages: periods, packages, orders, payments, groups)

**Pending** (Lanjutkan saat develop frontend public):
⏸️ Phase 4: Frontend Public (katalog, checkout, tabungan untuk donatur)  
⏸️ Phase 5: Frontend User Dashboard (my orders, my savings, payment history)  
⏸️ Phase 6: Automation (cron jobs, notifications)  
⏸️ Phase 7: Testing

**Last Updated**: 2026-01-24

---

**Total Estimasi**: 36 jam (~1 minggu development)

---

## 💡 Additional Features (Future)

1. **Qurban Kolektif**: Perusahaan/organisasi beli banyak sekaligus
2. **Qurban Aqiqah**: Extend untuk aqiqah (kambing untuk kelahiran)
3. **Daging Kurban Delivery**: User bisa pilih terima daging atau donasi
4. **Certificate**: Generate sertifikat qurban digital
5. **Live Tracking**: User bisa lihat real-time proses penyembelihan (live video/foto)
6. **Referral**: User dapat diskon jika ajak teman
7. **Qurban Berjamaah**: Komunitas/masjid buka slot qurban jamaah
8. **Multi-currency**: Support USD/lainnya untuk diaspora

---

## 🎯 Success Metrics

1. **Conversion Rate**: % visitor yang checkout
2. **Payment Success Rate**: % order yang lunas
3. **Savings Completion Rate**: % savings yang dikonversi
4. **Shared Group Fill Rate**: % grup sapi yang terisi penuh
5. **NPS Score**: Kepuasan donor
6. **Execution On-Time**: % qurban yang tepat waktu

---

**Status**: Konsep Design Complete ✅  
**Next Step**: Review & approval → Start Phase 1 (Database)  
**Created**: 2026-01-23
