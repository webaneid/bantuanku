# Perencanaan Fitur Zakat - Bantuanku

## 1. Executive Summary

Fitur Zakat akan menjadi menu khusus terpisah dari Campaign. Fitur ini akan menyediakan kalkulator zakat untuk berbagai jenis zakat dan sistem pengumpulan dana zakat yang dapat dikelola oleh admin.

**Perbedaan dengan Campaign:**
- ❌ Tidak ada target dana
- ✅ Hanya tracking dana terkumpul
- ✅ Ada kalkulator zakat untuk setiap jenis
- ✅ Dapat diaktifkan/nonaktifkan per jenis zakat
- ✅ Penyaluran per jenis zakat

---

## 2. Jenis-Jenis Zakat yang Didukung

Berdasarkan referensi zakatcalc dan praktik umum, sistem akan mendukung:

### 2.1 Zakat Maal (Harta)
Zakat atas harta yang disimpan minimal 1 tahun hijriyah.

**Sub-kategori:**
1. **Zakat Uang (Tunai & Tabungan)**
2. **Zakat Emas & Perak**
3. **Zakat Perdagangan**
4. **Zakat Saham & Surat Berharga**

### 2.2 Zakat Fitrah
Zakat yang wajib dikeluarkan sebelum Idul Fitri.

### 2.3 Zakat Pertanian
Zakat atas hasil pertanian dan perkebunan.

### 2.4 Zakat Profesi/Penghasilan
Zakat atas pendapatan profesi (gaji, honorarium, dll).

### 2.5 Zakat Peternakan
Zakat atas ternak (kambing, sapi, unta).

---

## 3. Formula Perhitungan

### 3.1 Zakat Maal (Uang, Emas, Perak, Perdagangan, Saham)

**Nisab:**
- Emas: 85 gram
- Perak: 595 gram
- Menggunakan nilai emas atau perak (pilih yang lebih rendah untuk kemudahan muzakki)

**Syarat:**
- Harta mencapai nisab
- Tersimpan selama 1 tahun hijriyah (haul)
- Bukan kebutuhan pokok

**Perhitungan:**
```
Total Harta = Uang Tunai + Tabungan + Deposito + Emas + Perak + Saham + Piutang

Harta Bersih = Total Harta - Hutang yang Jatuh Tempo

Nisab (Rupiah) = 85 gram × Harga Emas per Gram
              atau
              = 595 gram × Harga Perak per Gram

Jika Harta Bersih ≥ Nisab:
  Zakat = Harta Bersih × 2.5%
```

### 3.2 Zakat Fitrah

**Kadar:**
- 2.5 kg atau 3.5 liter beras per jiwa
- Atau setara uang sesuai harga beras di pasaran

**Syarat:**
- Muslim yang hidup pada malam dan hari Idul Fitri
- Memiliki kelebihan dari kebutuhan pokok pada hari raya

**Perhitungan:**
```
Jumlah Jiwa = Diri Sendiri + Tanggungan

Zakat Fitrah (Beras) = 2.5 kg × Jumlah Jiwa
                     atau
                     = 3.5 liter × Jumlah Jiwa

Zakat Fitrah (Uang) = Harga Beras per Kg × 2.5 kg × Jumlah Jiwa
```

### 3.3 Zakat Pertanian

**Nisab:**
- 653 kg (5 wasaq) hasil panen

**Kadar:**
- 10% jika diairi hujan (tanpa biaya)
- 5% jika diairi dengan biaya (pompa, irigasi)

**Perhitungan:**
```
Hasil Panen (kg) ≥ 653 kg

Jika diairi hujan:
  Zakat = Hasil Panen × 10%

Jika diairi dengan biaya:
  Zakat = Hasil Panen × 5%
```

### 3.4 Zakat Profesi/Penghasilan

**Nisab:**
- Setara 85 gram emas
- Dihitung per bulan atau per tahun

**Kadar:**
- 2.5% dari penghasilan bruto (sebelum pajak)

**Perhitungan:**
```
Penghasilan Bulanan ≥ (85 gram × Harga Emas) / 12

Zakat = Penghasilan Bulanan × 2.5%
```

### 3.5 Zakat Peternakan

**Nisab:**
- Kambing/Domba: 40 ekor
- Sapi/Kerbau: 30 ekor
- Unta: 5 ekor

**Syarat:**
- Digembalakan (tidak diberi pakan tambahan)
- Mencapai nisab
- Haul 1 tahun

**Kadar:**
Berdasarkan jumlah dan jenis hewan (lihat tabel syariat).

---

## 4. Struktur Database

### 4.1 Tabel: `zakat_types`
Kategori zakat yang tersedia.

```sql
CREATE TABLE zakat_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "Zakat Maal", "Zakat Fitrah", dst
  slug TEXT UNIQUE NOT NULL,       -- "zakat-maal", "zakat-fitrah"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  has_calculator BOOLEAN DEFAULT true,
  icon TEXT,                       -- Icon untuk UI
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Tabel: `zakat_donations`
Donasi zakat yang masuk.

```sql
CREATE TABLE zakat_donations (
  id TEXT PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,
  zakat_type_id TEXT REFERENCES zakat_types(id),

  -- Donatur
  donatur_id TEXT REFERENCES donatur(id),  -- NULL jika anonim
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Jumlah
  amount BIGINT NOT NULL,

  -- Kalkulator data (JSON untuk menyimpan input kalkulator)
  calculator_data JSONB,           -- {"gold_weight": 100, "gold_price": 1000000}
  calculated_zakat BIGINT,         -- Hasil kalkulasi dari kalkulator

  -- Payment
  payment_method_id TEXT,
  payment_status TEXT DEFAULT 'pending',  -- pending, success, failed, expired
  payment_gateway TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMP,

  -- Metadata
  notes TEXT,
  message TEXT,                    -- Pesan dari donatur

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Tabel: `zakat_distributions`
Penyaluran dana zakat.

```sql
CREATE TABLE zakat_distributions (
  id TEXT PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,
  zakat_type_id TEXT REFERENCES zakat_types(id),

  -- Penerima
  recipient_category TEXT NOT NULL, -- "fakir", "miskin", "amil", "mualaf", dll (8 asnaf)
  recipient_name TEXT NOT NULL,
  recipient_contact TEXT,

  -- Jumlah
  amount BIGINT NOT NULL,

  -- Detail
  purpose TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'draft',     -- draft, approved, disbursed

  -- Workflow
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP,
  disbursed_by TEXT REFERENCES users(id),
  disbursed_at TIMESTAMP,

  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 Tabel: `zakat_calculators`
Menyimpan konfigurasi kalkulator untuk setiap jenis zakat.

```sql
CREATE TABLE zakat_calculators (
  id TEXT PRIMARY KEY,
  zakat_type_id TEXT REFERENCES zakat_types(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Konfigurasi
  nisab_type TEXT,                 -- "gold", "silver", "harvest", "custom"
  nisab_value TEXT,                -- Nilai nisab (bisa formula)
  zakat_rate DECIMAL,              -- Persentase zakat (2.5, 5, 10)

  -- Fields untuk input
  input_fields JSONB,              -- Array of field configurations

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Fitur-Fitur Utama

### 5.1 Admin Panel

#### A. Manajemen Jenis Zakat
- **Path:** `/dashboard/zakat/types`
- CRUD jenis zakat
- Toggle aktif/nonaktif per jenis
- Konfigurasi kalkulator per jenis

#### B. Dashboard Zakat
- **Path:** `/dashboard/zakat`
- Overview dana terkumpul per jenis zakat
- Total penyaluran
- Saldo per jenis zakat
- Grafik trend donasi zakat (bulanan)

#### C. Donasi Zakat Masuk
- **Path:** `/dashboard/zakat/donations`
- List semua donasi zakat
- Filter by jenis zakat, status, tanggal
- Export data donasi
- Detail donasi (termasuk data kalkulator jika ada)

#### D. Penyaluran Zakat
- **Path:** `/dashboard/zakat/distributions`
- List penyaluran
- Tambah penyaluran baru
- Approval workflow
- Filter by jenis zakat, asnaf, status
- Export data penyaluran

#### E. Laporan Zakat
- **Path:** `/dashboard/zakat/reports`
- Laporan per jenis zakat
- Laporan per asnaf (8 golongan penerima zakat)
- Laporan periode (bulanan, tahunan)
- Export to PDF/Excel

### 5.2 Frontend (Website Donatur)

#### A. Halaman Zakat
- **Path:** `/zakat`
- Penjelasan tentang zakat
- List jenis-jenis zakat yang tersedia
- Link ke masing-masing kalkulator

#### B. Kalkulator Zakat
- **Path:** `/zakat/calculator/[type]`
- Form input sesuai jenis zakat
- Auto-calculate hasil zakat
- Opsi langsung donasi hasil kalkulasi
- Save hasil kalkulasi (untuk login user)

Contoh:
- `/zakat/calculator/maal` - Kalkulator Zakat Maal
- `/zakat/calculator/fitrah` - Kalkulator Zakat Fitrah
- `/zakat/calculator/profesi` - Kalkulator Zakat Profesi

#### C. Donasi Zakat
- **Path:** `/zakat/donate/[type]`
- Form donasi zakat
- Pilih metode pembayaran
- Input jumlah (bisa dari hasil kalkulator atau manual)
- Konfirmasi dan pembayaran

#### D. Riwayat Zakat (untuk login user)
- **Path:** `/profile/zakat-history`
- List semua donasi zakat yang pernah dilakukan
- Hasil kalkulasi yang pernah disimpan
- Reminder zakat tahun depan

---

## 6. Konfigurasi Kalkulator

### 6.1 Zakat Maal (Uang & Harta)

**Input Fields:**
```json
{
  "fields": [
    {
      "name": "cash",
      "label": "Uang Tunai",
      "type": "currency",
      "required": false,
      "helpText": "Uang tunai yang Anda miliki"
    },
    {
      "name": "savings",
      "label": "Tabungan & Deposito",
      "type": "currency",
      "required": false
    },
    {
      "name": "gold",
      "label": "Emas (gram)",
      "type": "number",
      "required": false
    },
    {
      "name": "gold_price",
      "label": "Harga Emas per Gram",
      "type": "currency",
      "required": false,
      "default": "auto",
      "helpText": "Otomatis dari harga emas saat ini"
    },
    {
      "name": "silver",
      "label": "Perak (gram)",
      "type": "number",
      "required": false
    },
    {
      "name": "silver_price",
      "label": "Harga Perak per Gram",
      "type": "currency",
      "required": false,
      "default": "auto"
    },
    {
      "name": "stocks",
      "label": "Saham & Surat Berharga",
      "type": "currency",
      "required": false
    },
    {
      "name": "receivables",
      "label": "Piutang yang Dapat Ditagih",
      "type": "currency",
      "required": false
    },
    {
      "name": "debts",
      "label": "Hutang yang Jatuh Tempo",
      "type": "currency",
      "required": false,
      "helpText": "Hutang yang harus dibayar dalam waktu dekat"
    },
    {
      "name": "nisab_reference",
      "label": "Referensi Nisab",
      "type": "select",
      "options": ["gold", "silver"],
      "default": "gold",
      "required": true
    }
  ]
}
```

**Calculation Logic:**
```javascript
function calculateZakatMaal(input) {
  const goldValue = input.gold * input.gold_price;
  const silverValue = input.silver * input.silver_price;

  const totalAssets =
    (input.cash || 0) +
    (input.savings || 0) +
    goldValue +
    silverValue +
    (input.stocks || 0) +
    (input.receivables || 0);

  const netAssets = totalAssets - (input.debts || 0);

  // Nisab calculation
  const nisabGold = 85 * input.gold_price;
  const nisabSilver = 595 * input.silver_price;
  const nisab = input.nisab_reference === 'gold' ? nisabGold : nisabSilver;

  if (netAssets >= nisab) {
    return {
      zakatable: true,
      netAssets: netAssets,
      nisab: nisab,
      zakat: Math.floor(netAssets * 0.025),
      rate: 2.5
    };
  }

  return {
    zakatable: false,
    netAssets: netAssets,
    nisab: nisab,
    shortage: nisab - netAssets,
    zakat: 0
  };
}
```

### 6.2 Zakat Fitrah

**Input Fields:**
```json
{
  "fields": [
    {
      "name": "family_members",
      "label": "Jumlah Jiwa",
      "type": "number",
      "required": true,
      "min": 1,
      "helpText": "Termasuk diri sendiri dan tanggungan"
    },
    {
      "name": "rice_price",
      "label": "Harga Beras per Kg",
      "type": "currency",
      "required": true,
      "helpText": "Harga beras yang biasa dikonsumsi"
    },
    {
      "name": "measurement_type",
      "label": "Jenis Takaran",
      "type": "select",
      "options": [
        {"value": "kg", "label": "Kilogram (2.5 kg)"},
        {"value": "liter", "label": "Liter (3.5 liter)"}
      ],
      "default": "kg",
      "required": true
    }
  ]
}
```

**Calculation Logic:**
```javascript
function calculateZakatFitrah(input) {
  const amountPerPerson = input.measurement_type === 'kg' ? 2.5 : 3.5;
  const totalAmount = amountPerPerson * input.family_members;
  const zakatInMoney = input.rice_price * 2.5 * input.family_members;

  return {
    family_members: input.family_members,
    amount_per_person: amountPerPerson,
    total_amount: totalAmount,
    unit: input.measurement_type,
    rice_price: input.rice_price,
    zakat: zakatInMoney
  };
}
```

### 6.3 Zakat Profesi/Penghasilan

**Input Fields:**
```json
{
  "fields": [
    {
      "name": "monthly_income",
      "label": "Penghasilan per Bulan",
      "type": "currency",
      "required": true,
      "helpText": "Gaji, honorarium, atau penghasilan rutin lainnya"
    },
    {
      "name": "gold_price",
      "label": "Harga Emas per Gram",
      "type": "currency",
      "required": false,
      "default": "auto"
    },
    {
      "name": "calculation_type",
      "label": "Jenis Perhitungan",
      "type": "select",
      "options": [
        {"value": "monthly", "label": "Per Bulan"},
        {"value": "annually", "label": "Per Tahun"}
      ],
      "default": "monthly",
      "required": true
    }
  ]
}
```

**Calculation Logic:**
```javascript
function calculateZakatProfesi(input) {
  const nisabMonthly = (85 * input.gold_price) / 12;
  const nisabAnnually = 85 * input.gold_price;

  if (input.calculation_type === 'monthly') {
    if (input.monthly_income >= nisabMonthly) {
      return {
        zakatable: true,
        income: input.monthly_income,
        nisab: nisabMonthly,
        zakat: Math.floor(input.monthly_income * 0.025),
        rate: 2.5
      };
    }
  } else {
    const annualIncome = input.monthly_income * 12;
    if (annualIncome >= nisabAnnually) {
      return {
        zakatable: true,
        income: annualIncome,
        nisab: nisabAnnually,
        zakat: Math.floor(annualIncome * 0.025),
        rate: 2.5
      };
    }
  }

  return {
    zakatable: false,
    income: input.monthly_income,
    nisab: input.calculation_type === 'monthly' ? nisabMonthly : nisabAnnually,
    zakat: 0
  };
}
```

---

## 7. 8 Asnaf (Golongan Penerima Zakat)

Sesuai Al-Quran (At-Taubah: 60), zakat disalurkan kepada 8 golongan:

1. **Fakir** - Orang yang tidak memiliki harta dan tidak mampu berusaha
2. **Miskin** - Orang yang memiliki harta namun tidak mencukupi kebutuhan dasar
3. **Amil** - Pengelola zakat
4. **Mualaf** - Orang yang baru masuk Islam atau yang perlu dikuatkan imannya
5. **Riqab** - Budak yang ingin memerdekakan diri (konteks modern: orang terlilit hutang)
6. **Gharim** - Orang yang berutang untuk kepentingan baik
7. **Fisabilillah** - Orang yang berjuang di jalan Allah
8. **Ibnus Sabil** - Musafir yang kehabisan bekal

**Implementasi:**
- Setiap penyaluran harus memilih salah satu asnaf
- Laporan penyaluran dikelompokkan per asnaf
- Statistik distribusi per asnaf

---

## 8. UI/UX Considerations

### 8.1 Kalkulator Interface
- **Clean & Simple**: Fokus pada kemudahan penggunaan
- **Progressive Disclosure**: Tampilkan field bertahap, tidak semua sekaligus
- **Real-time Calculation**: Update hasil saat user mengetik
- **Visual Feedback**:
  - Hijau jika sudah wajib zakat
  - Abu-abu jika belum mencapai nisab
  - Progress bar menuju nisab
- **Educational Content**: Penjelasan singkat di setiap field
- **Responsive**: Mobile-first design

### 8.2 Donation Flow
1. Pilih jenis zakat
2. (Optional) Gunakan kalkulator
3. Konfirmasi jumlah
4. Isi data donatur
5. Pilih metode pembayaran
6. Pembayaran
7. Konfirmasi & Receipt

### 8.3 Admin Dashboard
- Card untuk setiap jenis zakat dengan:
  - Total terkumpul
  - Total tersalurkan
  - Saldo
- Filter dan export data
- Visual charts untuk trend

---

## 9. Technical Implementation Plan

### Phase 1: Database & Backend (Week 1-2) ✅ COMPLETED

#### Database Schema ✅
- [x] **Create migration untuk tabel zakat**
  - File: `packages/db/src/schema/zakat-types.ts`
  - File: `packages/db/src/schema/zakat-donations.ts`
  - File: `packages/db/src/schema/zakat-distributions.ts`
  - Exported in: `packages/db/src/schema/index.ts`

- [x] **Seed data untuk zakat types**
  - File: `packages/db/src/seed/zakat-types.ts`
  - 5 jenis zakat: Maal, Fitrah, Profesi, Pertanian, Peternakan
  - 3 aktif (Maal, Fitrah, Profesi), 2 non-aktif (Pertanian, Peternakan)

#### API Endpoints ✅

##### 1. Zakat Types API
File: `apps/api/src/routes/admin/zakat-types.ts`
- [x] `GET /admin/zakat/types` - List all types (pagination, filter by isActive)
- [x] `GET /admin/zakat/types/:id` - Get single type detail
- [x] `POST /admin/zakat/types` - Create new type (admin only)
- [x] `PUT /admin/zakat/types/:id` - Update type (admin only)
- [x] `DELETE /admin/zakat/types/:id` - Delete type (admin only)

##### 2. Zakat Donations API
File: `apps/api/src/routes/admin/zakat-donations.ts`
- [x] `GET /admin/zakat/donations` - List donations
  - Filters: `zakatTypeId`, `donaturId`, `paymentStatus`
  - Pagination support
  - Enriched with: zakatTypeName, zakatTypeSlug, donaturName, donaturEmail
- [x] `GET /admin/zakat/donations/:id` - Get donation detail with full relations
- [x] `POST /admin/zakat/donations` - Create new donation
  - Auto-generate reference ID: `ZKT-{timestamp}-{random}`
  - Support calculator data (JSONB)
- [x] `PUT /admin/zakat/donations/:id` - Update donation
- [x] `DELETE /admin/zakat/donations/:id` - Delete donation (admin only)

##### 3. Zakat Distributions API
File: `apps/api/src/routes/admin/zakat-distributions.ts`
- [x] `GET /admin/zakat/distributions` - List distributions
  - Filters: `zakatTypeId`, `recipientCategory`, `status`
  - Pagination support
  - Enriched with: zakatTypeName, creatorName
- [x] `GET /admin/zakat/distributions/:id` - Get distribution detail
  - Include: zakatType, creator, approver, disburser info
- [x] `POST /admin/zakat/distributions` - Create distribution
  - Auto-generate reference ID: `DIST-{timestamp}-{random}`
  - Validate 8 Asnaf categories
  - Status: draft (default)
- [x] `PUT /admin/zakat/distributions/:id` - Update distribution (only if draft)
- [x] `POST /admin/zakat/distributions/:id/approve` - Approve distribution (admin only)
  - Change status: draft → approved
  - Record approvedBy and approvedAt
- [x] `POST /admin/zakat/distributions/:id/disburse` - Mark as disbursed (admin only)
  - Change status: approved → disbursed
  - Record disbursedBy and disbursedAt
- [x] `DELETE /admin/zakat/distributions/:id` - Delete distribution (admin only, draft only)

##### 4. Zakat Statistics/Dashboard API
File: `apps/api/src/routes/admin/zakat-stats.ts`
- [x] `GET /admin/zakat/stats` - Comprehensive dashboard statistics
  - Filter by `zakatTypeId` (optional)
  - Returns:
    - **Donations stats**: total count, total amount, paid amount, pending amount
    - **Distributions stats**: total count, disbursed amount, approved amount, draft amount
    - **Balance**: paid donations - disbursed distributions
    - **Distribution by category**: breakdown by 8 Asnaf
    - **Donations by type**: per zakat type
    - **Distributions by type**: per zakat type
- [x] `GET /admin/zakat/stats/recent-donations` - Last 10 successful donations
  - Default limit: 10 (customizable via query param)
- [x] `GET /admin/zakat/stats/recent-distributions` - Last 10 disbursed distributions
  - Default limit: 10 (customizable via query param)

#### Router Registration ✅
File: `apps/api/src/routes/admin/index.ts`
- [x] Imported all zakat routes
- [x] Registered routes:
  - `admin.route("/zakat/types", zakatTypesRoute)`
  - `admin.route("/zakat/donations", zakatDonationsRoute)`
  - `admin.route("/zakat/distributions", zakatDistributionsRoute)`
  - `admin.route("/zakat/stats", zakatStatsRoute)`

#### Features Implemented ✅
- [x] Auto-generated reference IDs (ZKT-xxx, DIST-xxx)
- [x] 8 Asnaf validation (fakir, miskin, amil, mualaf, riqab, gharim, fisabilillah, ibnus_sabil)
- [x] Distribution workflow (draft → approved → disbursed)
- [x] Role-based access control (admin/super_admin)
- [x] Data enrichment with relations
- [x] Comprehensive filtering and pagination
- [x] Balance calculation

#### Database Setup Instructions ✅

##### 1. Push Schema to Database
```bash
cd packages/db
npm run db:push
```
**Manual Action Required:**
- Akan muncul prompt: "Is zakat_types table created or renamed?"
- Pilih: `+ zakat_types` (create table)
- Akan muncul prompt untuk `zakat_donations` dan `zakat_distributions`
- Pilih: `+ [table_name]` (create table) untuk semua

##### 2. Run Seed Data
```bash
cd packages/db
npm run db:seed:zakat
```
**Output:**
- ✓ Seeded: Zakat Maal
- ✓ Seeded: Zakat Fitrah
- ✓ Seeded: Zakat Profesi
- ✓ Seeded: Zakat Pertanian (inactive)
- ✓ Seeded: Zakat Peternakan (inactive)

Total: 5 types (3 active, 2 inactive)

File created: `packages/db/src/seed-zakat.ts`

##### 3. Seed Zakat COA
```bash
cd packages/db
npm run db:seed:zakat-coa
```
**Output:**
- ✓ 6200 - Pendapatan Zakat
- ✓ 6201 - Pendapatan Zakat Maal
- ✓ 6202 - Pendapatan Zakat Fitrah
- ✓ 6203 - Pendapatan Zakat Profesi
- ✓ 6204 - Pendapatan Zakat Pertanian
- ✓ 6205 - Pendapatan Zakat Peternakan
- ✓ 7200 - Penyaluran Zakat
- ✓ 7201 - Penyaluran Zakat Maal
- ✓ 7202 - Penyaluran Zakat Fitrah
- ✓ 7203 - Penyaluran Zakat Profesi
- ✓ 7204 - Penyaluran Zakat Pertanian
- ✓ 7205 - Penyaluran Zakat Peternakan

Total: 12 COA accounts (6 income + 6 expense)

File created: `packages/db/src/seed-zakat-coa.ts`

#### Ledger Integration ✅

**PRINSIP PENTING:**
🔒 **SEMUA pencatatan zakat HARUS melewati SATU PINTU: LEDGER**
- ✅ Tidak ada pencatatan ganda (double booking)
- ✅ Semua transaksi zakat otomatis masuk ledger dengan COA khusus
- ✅ Report cash flow otomatis include data zakat
- ✅ Setiap jenis zakat punya COA sendiri untuk tracking terpisah

##### COA Structure - Zakat Accounts

**Income (Pendapatan) - 62xx Series:**
- 6200: Pendapatan Zakat (Header)
- 6201: Pendapatan Zakat Maal
- 6202: Pendapatan Zakat Fitrah
- 6203: Pendapatan Zakat Profesi
- 6204: Pendapatan Zakat Pertanian
- 6205: Pendapatan Zakat Peternakan

**Expense (Penyaluran) - 72xx Series:**
- 7200: Penyaluran Zakat (Header)
- 7201: Penyaluran Zakat Maal
- 7202: Penyaluran Zakat Fitrah
- 7203: Penyaluran Zakat Profesi
- 7204: Penyaluran Zakat Pertanian
- 7205: Penyaluran Zakat Peternakan

##### Auto Ledger Entry - Donations
File: `apps/api/src/routes/admin/zakat-donations.ts`

**Trigger Points:**
- [x] **POST** - Create donation with paymentStatus="success"
- [x] **PUT** - Update donation, status changed to "success"

**Ledger Entry Created:**
```
Date: Transaction date
Description: "Donasi [Zakat Type Name] dari [Donor Name]"
Reference: referenceId (ZKT-xxx)
Reference Type: "zakat_donation"
Reference ID: donation.id
COA: Mapped by slug (6201-6205)
Debit: 0
Credit: donation.amount
Status: "paid"
```

**Slug to COA Mapping:**
- zakat-maal → 6201
- zakat-fitrah → 6202
- zakat-profesi → 6203
- zakat-pertanian → 6204
- zakat-peternakan → 6205

##### Auto Ledger Entry - Distributions
File: `apps/api/src/routes/admin/zakat-distributions.ts`

**Trigger Point:**
- [x] **POST /disburse** - Mark distribution as disbursed (approved → disbursed)

**Ledger Entry Created:**
```
Date: Disbursement date
Description: "Penyaluran [Zakat Type] kepada [Recipient] ([Asnaf])"
Reference: referenceId (DIST-xxx)
Reference Type: "zakat_distribution"
Reference ID: distribution.id
COA: Mapped by slug (7201-7205)
Debit: distribution.amount
Credit: 0
Status: "paid"
```

**Slug to COA Mapping:**
- zakat-maal → 7201
- zakat-fitrah → 7202
- zakat-profesi → 7203
- zakat-pertanian → 7204
- zakat-peternakan → 7205

##### Integration with Cash Flow Report

**Automatic Integration:**
- ✅ All zakat transactions appear in existing cash flow report
- ✅ Filter by COA 62xx untuk lihat income zakat saja
- ✅ Filter by COA 72xx untuk lihat penyaluran zakat saja
- ✅ No need separate zakat report - gunakan report ledger yang ada
- ✅ Export CSV/PDF dari report ledger include data zakat

**Report Filtering:**
- COA Code: 6200-6299 → All zakat income
- COA Code: 7200-7299 → All zakat distributions
- Reference Type: "zakat_donation" → Donations only
- Reference Type: "zakat_distribution" → Distributions only

##### No Double Booking

**Guaranteed Single Entry:**
- ❌ NO separate zakat_transactions table
- ❌ NO manual journal entries for zakat
- ✅ ONE ledger entry per transaction via auto-creation
- ✅ ALL zakat data queryable from ledger table
- ✅ Consistent with campaign donations flow

#### Pending ⏳
- [ ] Integrasi dengan payment gateway (Phase 4)

### Phase 2: Admin Panel (Week 3-4) ✅ IN PROGRESS

#### Admin Pages Created ✅

##### 1. Dashboard Zakat Overview
File: `apps/admin/src/app/dashboard/zakat/page.tsx`
- [x] **Summary Cards**
  - Total Dana Masuk (Terbayar)
  - Total Dana Tersalurkan
  - Saldo Zakat
  - Dana Pending
- [x] **Jenis Zakat Aktif** - Grid view dengan stats per jenis
- [x] **Penyaluran per Asnaf** - Breakdown 8 golongan penerima
- [x] **Recent Activity** - Donasi & penyaluran terbaru (5 items)
- [x] **Quick Actions** - Link ke donasi, penyaluran baru, laporan

##### 2. CRUD Zakat Types
File: `apps/admin/src/app/dashboard/zakat/types/page.tsx`
- [x] **List zakat types** - Sortable by displayOrder
- [x] **Create new type** - Dialog form with validation
- [x] **Edit type** - Dialog form pre-filled
- [x] **Delete type** - With confirmation
- [x] **Toggle active/inactive** - Switch component
- [x] **Auto-generate slug** - From name input
- [x] Features:
  - Icon emoji support
  - Display order management
  - Calculator toggle
  - Active/inactive status

##### 3. List & Detail Zakat Donations
Files:
- `apps/admin/src/app/dashboard/zakat/donations/page.tsx` (List)
- `apps/admin/src/app/dashboard/zakat/donations/[id]/page.tsx` (Detail)

**List Page:**
- [x] Pagination (20 items per page)
- [x] Filters:
  - Search (name, email, reference ID)
  - Zakat type dropdown
  - Payment status dropdown
- [x] Display columns:
  - Donatur info (name, email, anonymous badge)
  - Zakat type
  - Amount
  - Status badge
  - Created date
- [x] View detail button

**Detail Page:**
- [x] Donatur Information card
  - Name, email, phone
  - Link to donatur profile (if registered)
  - Donor message (if any)
- [x] Donation Information card
  - Zakat type with icon
  - Amount (large display)
  - Calculator result (if available)
  - Notes
- [x] Payment Information card
  - Payment status
  - Gateway
  - Payment reference
  - Paid timestamp
- [x] Timeline card
  - Created date
  - Last updated date
- [x] Calculator Data display (JSON)

##### 4. CRUD Zakat Distributions
File: `apps/admin/src/app/dashboard/zakat/distributions/page.tsx`
- [x] **List distributions** - Pagination enabled
- [x] **Filters:**
  - Search (recipient name, purpose, reference ID)
  - Zakat type dropdown
  - Asnaf category dropdown (8 categories)
  - Status dropdown (draft, approved, disbursed)
- [x] **Display columns:**
  - Recipient name & purpose
  - Asnaf category
  - Zakat type
  - Amount
  - Status badge
  - Created date
- [x] **View detail button**
- [x] **Create new button** (link to /new)

##### 5. Distribution Detail & Workflow
File: `apps/admin/src/app/dashboard/zakat/distributions/[id]/page.tsx`
- [x] **Distribution detail** - Full information display
- [x] **Workflow status progress** - Visual progress (draft → approved → disbursed)
- [x] **Approve button** - Admin can approve draft (status: draft → approved)
- [x] **Disburse button** - Admin can mark as disbursed (status: approved → disbursed)
- [x] **Edit button** - Only for draft status
- [x] **Delete button** - Only for draft status
- [x] **Information cards:**
  - Recipient info (name, asnaf category, contact)
  - Distribution info (zakat type, amount, purpose, description, notes)
  - Workflow history (creator, approver, disburser with timestamps)
  - Timeline (created, updated)

##### 6. Create Distribution Form
File: `apps/admin/src/app/dashboard/zakat/distributions/new/page.tsx`
- [x] **Form with validation**
- [x] **Fields:**
  - Asnaf category dropdown (8 categories with descriptions)
  - Recipient name (required)
  - Recipient contact (optional)
  - Zakat type dropdown (from active types)
  - Amount (required, number validation)
  - Purpose (required)
  - Description (optional textarea)
  - Notes (optional textarea)
- [x] **Save as draft** - Creates with status="draft"
- [x] **Form validation** - Client-side validation before submit
- [x] **Redirect to detail** - After successful creation

##### 7. Navigation Menu
File: `apps/admin/src/components/Sidebar.tsx`
- [x] **Added "Zakat" menu** with Sparkles icon
- [x] **Submenu items:**
  - Dashboard Zakat
  - Jenis Zakat
  - Donasi Zakat
  - Penyaluran
- [x] **Auto-expand** - Menu expands when on zakat routes

##### 8. Manual Zakat Donation Input
File: `apps/admin/src/app/dashboard/zakat/donations/new/page.tsx`
- [x] **Form untuk input manual donasi zakat**
- [x] **Fields:**
  - Donor info (name, email, phone, isAnonymous, message)
  - Zakat type dropdown
  - Amount (required)
  - Payment status (pending, success, failed, expired)
  - Payment gateway & reference
  - Notes (internal)
- [x] **Auto paidAt** - Set when status=success
- [x] **Validation** - Client-side validation
- [x] **Redirect to detail** - After successful creation
- [x] **Button "Catat Donasi Baru"** - Added to donations list page

#### Phase 2 Summary ✅ COMPLETED
**Files Created:** 9 pages
- Dashboard overview (1)
- Zakat types CRUD (1)
- Donations list & detail (2)
- Donations manual input (1) ← NEW
- Distributions list, detail & create (3)
- Navigation menu update (1)

**Features Implemented:**
- ✅ Complete CRUD for zakat types
- ✅ View donations with filters & pagination
- ✅ Manual input donations from admin ← NEW
- ✅ View distribution with filters & pagination
- ✅ Create distribution form
- ✅ Approval workflow (draft → approved → disbursed)
- ✅ Role-based access (admin only for approve/disburse/delete)
- ✅ Navigation menu integration
- ✅ Comprehensive dashboard with stats

#### Pending for Future Phases ⏳
- [ ] Edit zakat donation form
- [ ] Reports & export functionality (CSV/PDF)
- [ ] Edit distribution form (can reuse create form)
- [ ] Bulk actions
- [ ] Advanced filters & search

---

### Phase 3: Frontend - Kalkulator (Week 5-6) ⏸️ PENDING
**Note:** Public frontend belum ada. Halaman kalkulator dibuat sementara di `/apps/admin/src/app/(public)/zakat/` untuk struktur, akan dipindahkan ke frontend public nanti.

#### Public Pages Created ✅

##### 1. Halaman Utama Zakat (Landing Page)
File: `apps/admin/src/app/(public)/zakat/page.tsx`
- [x] **Hero section** - Judul, deskripsi, badge
- [x] **Calculator cards** - Grid view untuk setiap jenis zakat aktif
  - Dynamic dari zakat types yang hasCalculator=true
  - Icon, nama, deskripsi
  - Hover effects & transitions
  - Link ke halaman kalkulator masing-masing
- [x] **Info section** - Penjelasan tentang zakat
  - Nisab & Haul explanation
- [x] **8 Asnaf section** - Grid 8 golongan penerima zakat
  - Fakir, Miskin, Amil, Mualaf, Riqab, Gharim, Fisabilillah, Ibnus Sabil

##### 2. Kalkulator Zakat Maal
File: `apps/admin/src/app/(public)/zakat/zakat-maal/page.tsx`
- [x] **Form input harta:**
  - Uang tunai
  - Tabungan & deposito
  - Emas (nilai Rp)
  - Perak (nilai Rp)
  - Saham & investasi
  - Modal usaha/dagang
  - Piutang yang dapat ditagih
- [x] **Form hutang:**
  - Total hutang jatuh tempo (dikurangkan dari harta)
- [x] **Nisab info card:**
  - Fetch harga emas dari API
  - Hitung nisab: 85 gram × harga emas
  - Display nisab amount
- [x] **Kalkulasi:**
  - Total harta - hutang = harta bersih
  - Cek nisab (≥ nisab amount)
  - Zakat = 2.5% dari harta bersih
- [x] **Result card:**
  - Show zakat amount jika ≥ nisab
  - Show "belum wajib" jika < nisab
  - Button "Bayar Zakat Sekarang"
- [x] **Catatan penting** - 4 poin penjelasan

##### 3. Kalkulator Zakat Fitrah
File: `apps/admin/src/app/(public)/zakat/zakat-fitrah/page.tsx`
- [x] **Form input:**
  - Jumlah anggota keluarga (input number)
  - Jenis pembayaran (beras / uang)
  - Harga beras per kg (jika pilih uang)
- [x] **Ketentuan:**
  - 2.5 kg beras per jiwa
  - Default harga beras: Rp 15,000/kg
- [x] **Kalkulasi:**
  - Total = jumlah jiwa × 2.5 kg
  - Jika uang: total kg × harga beras
- [x] **Result card:**
  - Display total kg beras ATAU total uang
  - Equivalensi (jika bayar beras, show juga nilai uang)
  - Button "Bayar Zakat Fitrah Sekarang"
- [x] **Info cards:**
  - Siapa yang wajib bayar (4 kriteria)
  - Ketentuan zakat fitrah (kadar, waktu)
  - Catatan penting (4 poin)

##### 4. Kalkulator Zakat Profesi
File: `apps/admin/src/app/(public)/zakat/zakat-profesi/page.tsx`
- [x] **Form input:**
  - Gaji/pendapatan utama per bulan
  - Pendapatan lain-lain (bonus, THR)
  - Metode perhitungan (Nett / Gross)
  - Pengeluaran kebutuhan pokok (jika pilih Nett)
- [x] **Nisab info:**
  - Fetch harga emas dari API
  - Nisab per tahun: 85 gram × harga emas
  - Nisab per bulan: nisab tahunan ÷ 12
- [x] **Kalkulasi:**
  - Total pendapatan = gaji + pendapatan lain
  - Jika Nett: penghasilan bersih = total - pengeluaran
  - Jika Gross: penghasilan = total pendapatan
  - Cek nisab (≥ nisab bulanan)
  - Zakat = 2.5% dari penghasilan yang dizakati
- [x] **Result card:**
  - Show breakdown: total, pengeluaran (jika nett), bersih
  - Zakat per bulan
  - Estimasi zakat per tahun (× 12)
  - Button "Bayar Zakat Sekarang"
- [x] **Info cards:**
  - Tentang zakat profesi (2 metode)
  - Nisab per tahun & per bulan
  - Catatan penting (4 poin)

#### Features Implemented ✅
- [x] **Dynamic zakat types** - Fetch dari API zakat/types
- [x] **Gold price integration** - Fetch dari settings API
- [x] **Responsive design** - Mobile-first approach
- [x] **Form validation** - Client-side validation
- [x] **Real-time calculation** - Calculate on button click
- [x] **Result display** - Conditional rendering based on nisab
- [x] **Info cards** - Educational content
- [x] **CTA buttons** - "Bayar Zakat Sekarang" for payment flow

#### Phase 3 Summary ✅ COMPLETED
**Files Created:** 4 pages
- Landing page (1)
- Kalkulator Maal (1)
- Kalkulator Fitrah (1)
- Kalkulator Profesi (1)

**Calculators Features:**
- ✅ Zakat Maal: 7 jenis harta + hutang, nisab check
- ✅ Zakat Fitrah: Per jiwa, beras/uang, harga beras custom
- ✅ Zakat Profesi: Nett/Gross method, monthly/annual estimation

**UI/UX:**
- ✅ Card-based layout
- ✅ Color-coded results (success/gray)
- ✅ Responsive grid system
- ✅ Icons & emojis for visual appeal
- ✅ Info sections & educational content

#### Pending ⏳
- [ ] Create (public) layout with navigation
- [ ] Integration save calculator results (Phase 5)
- [ ] Link payment flow (Phase 4)

### Phase 4: Frontend - Donation Flow (Week 7)
- [ ] Form donasi zakat
- [ ] Payment integration
- [ ] Thank you page & receipt
- [ ] Email notification

### Phase 5: User Profile & History (Week 8)
- [ ] Riwayat donasi zakat
- [ ] Saved calculator results
- [ ] Reminder system

### Phase 6: Testing & Launch (Week 9-10)
- [ ] Unit testing
- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Launch

---

## 10. Integration dengan Fitur Existing

### 10.1 Harga Emas & Perak Auto-Update
- Menggunakan existing scraper dari Pluang.com
- Update harga setiap hari
- Tampilkan di kalkulator dengan timestamp update terakhir

### 10.2 Payment Gateway
- Gunakan payment gateway yang sama dengan donations
- Support multiple payment methods

### 10.3 User Management
- Donatur bisa login untuk melihat history
- Admin dengan role tertentu bisa kelola zakat

### 10.4 Reporting
- Integrasi dengan sistem reporting yang ada
- Export format yang sama (PDF, Excel)

---

## 11. Referensi & Resources

### Sumber Hukum:
- Al-Quran: At-Taubah (9): 60, 103
- Al-Quran: Al-Baqarah (2): 267
- Hadits Shahih tentang nisab dan kadar zakat

### Referensi Teknis:
- Repository: https://github.com/alfarisi/zakatcalc
- BAZNAS Guidelines
- Fatwa MUI tentang Zakat

### Learning Resources:
- Panduan Zakat BAZNAS
- Buku Fiqih Zakat kontemporer
- Artikel zakat profesi dari ulama terpercaya

---

## 12. Success Metrics

### KPI untuk Fitur Zakat:
1. **Adoption Rate**: % user yang menggunakan kalkulator
2. **Conversion Rate**: % dari kalkulator ke donasi
3. **Average Donation**: Rata-rata nilai donasi zakat
4. **Calculator Accuracy**: Feedback positif tentang kalkulasi
5. **Distribution Rate**: % dana yang tersalurkan vs terkumpul
6. **Asnaf Coverage**: Distribusi merata ke 8 asnaf

---

## 13. Future Enhancements

### Possible Future Features:
1. **Zakat Reminder**: Notifikasi otomatis saat haul (1 tahun)
2. **Zakat Subscription**: Auto-debit bulanan untuk zakat profesi
3. **Multi-language**: Support Bahasa Inggris dan Arab
4. **Mobile App**: Native app untuk kalkulator zakat
5. **AI Assistant**: Chatbot untuk membantu penghitungan zakat
6. **Blockchain**: Transparency tracking untuk penyaluran
7. **Zakat Certificate**: Digital certificate untuk keperluan pajak
8. **Community Features**: Forum diskusi tentang zakat

---

## 14. Notes & Considerations

### Important Notes:
1. **Konsultasi Ulama**: Pastikan formula sesuai dengan fatwa terkini
2. **Localisation**: Nisab dan kadar bisa berbeda antar mazhab
3. **Privacy**: Data kalkulator user harus dijaga kerahasiaannya
4. **Transparency**: Penyaluran harus transparan dan akuntabel
5. **Education**: Sediakan konten edukatif tentang zakat
6. **Accessibility**: Mudah digunakan oleh semua kalangan

### Risk Mitigation:
- **Legal**: Pastikan compliance dengan regulasi BAZNAS
- **Security**: Enkripsi data sensitif
- **Accuracy**: Validasi formula dengan ahli fiqih
- **Scalability**: Siapkan infrastruktur untuk traffic tinggi (Ramadan, dll)

---

**Document Version:** 1.0
**Created:** January 21, 2026
**Author:** Claude & Webane
**Status:** Planning Phase
