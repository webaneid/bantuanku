# Dokumentasi Sistem Zakat - Bantuanku

## 📋 Table of Contents
1. [Overview](#overview)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Database Schema](#database-schema)
4. [Flow Diagram](#flow-diagram)
5. [Frontend User Flow](#frontend-user-flow)
6. [Backend API](#backend-api)
7. [Admin Dashboard](#admin-dashboard)
8. [Payment & Verification](#payment--verification)
9. [Distribution Flow](#distribution-flow)
10. [Testing Checklist](#testing-checklist)

---

## Overview

Sistem Zakat di Bantuanku adalah sistem yang menangani:
- **Perhitungan Zakat** (Kalkulator multi-jenis)
- **Pembayaran Zakat** oleh Muzaki
- **Verifikasi Pembayaran** oleh Admin
- **Penyaluran Zakat** kepada 8 Asnaf
- **Pelaporan & Transparansi**

### Jenis-jenis Zakat yang Didukung
1. **Zakat Fitrah** - Wajib dikeluarkan saat Ramadan
2. **Zakat Maal** - Zakat harta (tabungan, deposito, saham, dll)
3. **Zakat Penghasilan** (Profesi) - Zakat dari gaji/penghasilan bulanan
4. **Zakat Perdagangan** (Bisnis) - Zakat dari usaha/inventory
5. **Zakat Pertanian** - Zakat dari hasil pertanian
6. **Zakat Peternakan** - Zakat dari hasil ternak
7. **Zakat Emas & Perak** - Zakat dari logam mulia

---

## Arsitektur Sistem

```
┌─────────────────┐
│  User/Muzaki    │
│  (Public Web)   │
└────────┬────────┘
         │
         │ 1. Calculate Zakat
         ↓
┌─────────────────┐
│  Calculator     │
│  /zakat/...     │
└────────┬────────┘
         │
         │ 2. Add to Cart
         ↓
┌─────────────────┐
│  Checkout       │
│  /checkout      │
└────────┬────────┘
         │
         │ 3. Create Donation
         ↓
┌─────────────────────────────┐
│  API: POST /admin/zakat/donations │
└────────┬────────────────────┘
         │
         │ 4. Status: pending
         ↓
┌─────────────────┐
│  Admin          │
│  Dashboard      │
└────────┬────────┘
         │
         │ 5. Verify Payment
         ↓
┌─────────────────┐
│  Update Status  │
│  → success      │
└────────┬────────┘
         │
         │ 6. Create Ledger Entry
         ↓
┌─────────────────┐
│  Distribution   │
│  (8 Asnaf)      │
└─────────────────┘
```

---

## Database Schema

### 1. `zakat_types` - Jenis-jenis Zakat
```sql
CREATE TABLE zakat_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "Zakat Fitrah", "Zakat Maal", dst
  slug TEXT UNIQUE NOT NULL,       -- "zakat-fitrah", "zakat-maal"
  description TEXT,
  image_url TEXT,
  icon TEXT,
  has_calculator BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `zakat_donations` - Pembayaran Zakat
```sql
CREATE TABLE zakat_donations (
  id TEXT PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,      -- ZKT-timestamp-random
  zakat_type_id TEXT NOT NULL REFERENCES zakat_types(id),

  -- Donatur Info
  donatur_id TEXT REFERENCES donatur(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Amount
  amount BIGINT NOT NULL,

  -- Calculator Data (JSON)
  calculator_data JSONB,                   -- Input kalkulator
  calculated_zakat BIGINT,                 -- Hasil perhitungan zakat

  -- Payment
  payment_method_id TEXT,
  payment_status TEXT DEFAULT 'pending',   -- pending, success, failed, expired
  payment_gateway TEXT,
  payment_reference TEXT,                  -- Bukti transfer/proof
  paid_at TIMESTAMP,

  -- Metadata
  notes TEXT,
  message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Payment Status Flow:**
- `pending` → Baru dibuat, menunggu pembayaran/verifikasi
- `success` → Sudah dibayar dan diverifikasi admin
- `failed` → Pembayaran gagal
- `expired` → Kedaluwarsa (jika pakai payment gateway)

### 3. `zakat_distributions` - Penyaluran Zakat
```sql
CREATE TABLE zakat_distributions (
  id TEXT PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,      -- ZKD-timestamp-random
  zakat_type_id TEXT NOT NULL REFERENCES zakat_types(id),

  -- Penerima (8 Asnaf)
  recipient_type TEXT,                     -- "coordinator" atau "direct"
  coordinator_id TEXT,                     -- employee ID (coordinator)
  mustahiq_id TEXT,                        -- mustahiq ID (direct)
  recipient_category TEXT NOT NULL,        -- fakir, miskin, amil, mualaf, riqab, gharim, fisabilillah, ibnus_sabil
  recipient_name TEXT NOT NULL,
  recipient_contact TEXT,

  -- For coordinator type
  distribution_location TEXT,
  recipient_count BIGINT,

  -- Amount
  amount BIGINT NOT NULL,

  -- Detail
  purpose TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'draft',             -- draft, approved, disbursed

  -- Transfer Info
  source_bank_id TEXT,
  source_bank_name TEXT,
  source_bank_account TEXT,
  target_bank_name TEXT,
  target_bank_account TEXT,
  target_bank_account_name TEXT,
  transfer_proof TEXT,

  -- Workflow
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP,
  disbursed_by TEXT REFERENCES users(id),
  disbursed_at TIMESTAMP,

  -- Activity Report (untuk coordinator type)
  report_date TIMESTAMP,
  report_description TEXT,
  report_photos TEXT,                      -- JSON array
  report_added_by TEXT REFERENCES users(id),
  report_added_at TIMESTAMP,

  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Distribution Status Flow:**
- `draft` → Baru dibuat, belum disetujui
- `approved` → Sudah disetujui, siap disalurkan
- `disbursed` → Sudah disalurkan kepada penerima

### 4. `zakat_calculator_logs` - Log Perhitungan
```sql
CREATE TABLE zakat_calculation_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),      -- Nullable jika guest
  zakat_type TEXT NOT NULL,                -- "income", "maal", "fitrah", dst
  input_data JSONB NOT NULL,               -- Input dari user
  result_data JSONB NOT NULL,              -- Hasil perhitungan
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. `settings` - Konfigurasi Zakat
Settings yang digunakan:
- `gold_price_per_gram` → Harga emas per gram (untuk nisab)
- `zakat_fitrah_amount` → Nominal zakat fitrah per orang (default: Rp 45.000)
- `rice_price_per_kg` → Harga beras per kg
- `fidyah_amount_per_day` → Nominal fidyah per hari

---

## Flow Diagram

### A. User Flow - Bayar Zakat

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER MENGUNJUNGI HALAMAN ZAKAT                            │
│    URL: /zakat                                                │
│    - Menampilkan card semua jenis zakat (dari API)           │
│    - GET /v1/zakat/types                                      │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. USER PILIH JENIS ZAKAT & HITUNG                           │
│    Contoh: /zakat/zakat-penghasilan                           │
│    - User input: gaji, penghasilan lain, pengeluaran         │
│    - POST /v1/zakat/calculate/income                          │
│    - Response: { zakatAmount, isWajib, nisabValue, ... }     │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. ADD TO CART                                                │
│    - Simpan ke localStorage:                                  │
│      {                                                         │
│        type: 'zakat',                                         │
│        subType: 'income',                                     │
│        name: 'Zakat Penghasilan',                            │
│        amount: 125000,                                        │
│        zakatData: { zakatType: 'income', ... }               │
│      }                                                         │
│    - Redirect ke /checkout                                    │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. CHECKOUT                                                   │
│    URL: /checkout                                             │
│    - User isi form: nama, email, phone, pesan                │
│    - Submit checkout                                          │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. CREATE ZAKAT DONATION (Backend)                           │
│    POST /v1/admin/zakat/donations                             │
│    Body: {                                                    │
│      zakatTypeId: "...",                                      │
│      donorName: "Ahmad Zaki",                                │
│      donorEmail: "ahmad@example.com",                        │
│      donorPhone: "081234567890",                             │
│      amount: 125000,                                          │
│      calculatorData: { ... },                                │
│      paymentStatus: "pending"                                 │
│    }                                                           │
│    Response: {                                                │
│      success: true,                                           │
│      data: { id, referenceId: "ZKT-...", ... }               │
│    }                                                           │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. REDIRECT KE PAYMENT DETAIL                                 │
│    URL: /checkout/payment-detail                              │
│    - Tampilkan detail pembayaran                              │
│    - User upload bukti transfer                               │
│    - Update payment_reference di zakat_donations             │
└───────────────────────────────────────────────────────────────┘
```

### B. Admin Flow - Verifikasi Pembayaran

```
┌──────────────────────────────────────────────────────────────┐
│ 1. ADMIN LOGIN & AKSES DASHBOARD                             │
│    URL: /dashboard/zakat/donations                            │
│    GET /v1/admin/zakat/donations?page=1&limit=10             │
│    - List semua zakat donations                               │
│    - Filter by: zakatTypeId, paymentStatus                    │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. ADMIN KLIK DETAIL DONATION                                 │
│    URL: /dashboard/zakat/donations/[id]                       │
│    GET /v1/admin/zakat/donations/[id]                         │
│    - Tampilkan detail lengkap                                 │
│    - Tampilkan bukti transfer (payment_reference)            │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. ADMIN VERIFIKASI & UPDATE STATUS                          │
│    PUT /v1/admin/zakat/donations/[id]                         │
│    Body: {                                                    │
│      paymentStatus: "success",                                │
│      paidAt: "2026-01-31T10:00:00Z"                          │
│    }                                                           │
│                                                                │
│    Backend Logic:                                             │
│    - Update zakat_donations.payment_status = 'success'       │
│    - Update zakat_donations.paid_at = NOW()                  │
│    - CREATE LEDGER ENTRY (Credit COA Zakat)                  │
│                                                                │
│    COA Mapping:                                               │
│    - zakat-maal → 6201                                        │
│    - zakat-fitrah → 6202                                      │
│    - zakat-profesi → 6203                                     │
│    - zakat-pertanian → 6204                                   │
│    - zakat-peternakan → 6205                                  │
└───────────────────────────────────────────────────────────────┘
```

### C. Admin Flow - Penyaluran Zakat

```
┌──────────────────────────────────────────────────────────────┐
│ 1. ADMIN CREATE DISTRIBUTION                                  │
│    URL: /dashboard/zakat/distributions/new                    │
│    POST /v1/admin/zakat/distributions                         │
│    Body: {                                                    │
│      zakatTypeId: "...",                                      │
│      recipientType: "coordinator" | "direct",                │
│      recipientCategory: "fakir" | "miskin" | "amil" | ...,   │
│      recipientName: "...",                                    │
│      amount: 1000000,                                         │
│      purpose: "...",                                          │
│      status: "draft"                                          │
│    }                                                           │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. ADMIN APPROVE DISTRIBUTION                                 │
│    - Status: draft → approved                                 │
│    - Fill transfer info (bank account, etc)                   │
│    - Upload transfer proof                                    │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. ADMIN DISBURSE (Salurkan)                                  │
│    - Status: approved → disbursed                             │
│    - CREATE LEDGER ENTRY (Debit COA Zakat)                   │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. COORDINATOR ADD ACTIVITY REPORT (Optional)                 │
│    - Untuk recipient_type = "coordinator"                     │
│    - Upload foto kegiatan penyaluran                          │
│    - Isi deskripsi kegiatan                                   │
└───────────────────────────────────────────────────────────────┘
```

---

## Frontend User Flow

### 1. Halaman Utama Zakat
**Path:** `/zakat`
**File:** `apps/web/src/app/zakat/page.tsx`

**Features:**
- Fetch zakat types dari API: `GET /v1/zakat/types`
- Display cards untuk setiap jenis zakat
- Fallback data jika API gagal

### 2. Kalkulator Zakat Penghasilan
**Path:** `/zakat/zakat-penghasilan`
**File:** `apps/web/src/app/zakat/zakat-penghasilan/page.tsx`

**Input Fields:**
- Penghasilan Bulanan (required)
- Penghasilan Lain (optional)
- Pengeluaran Bulanan (optional)

**API Call:**
```typescript
POST /v1/zakat/calculate/income
{
  monthlyIncome: 5000000,
  otherIncome: 1000000,
  monthlyExpenses: 2000000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "income",
    "isWajib": true,
    "nisabValue": 7200000,
    "netIncome": 4000000,
    "zakatAmount": 100000,
    "details": {
      "zakatRate": 0.025
    }
  }
}
```

**Add to Cart:**
```javascript
const cartItem = {
  type: 'zakat',
  subType: 'income',
  name: 'Zakat Penghasilan',
  amount: result.zakatAmount,
  quantity: 1,
  pricePerUnit: result.zakatAmount,
  zakatData: {
    zakatType: 'income',
    quantity: 1,
    pricePerUnit: result.zakatAmount,
  }
};
localStorage.setItem('cart', JSON.stringify([...cart, cartItem]));
router.push('/checkout');
```

### 3. Kalkulator Lainnya
**Zakat Maal:** `/zakat/zakat-maal`
- Input: tabungan, deposito, saham, aset lain, hutang
- API: `POST /v1/zakat/calculate/maal`

**Zakat Fitrah:** `/zakat/zakat-fitrah`
- Input: jumlah jiwa, harga per orang (optional)
- API: `POST /v1/zakat/calculate/fitrah`

**Zakat Bisnis:** `/zakat/zakat-bisnis`
- Input: inventory, piutang, kas, hutang
- API: `POST /v1/zakat/calculate/trade`

### 4. Checkout
**Path:** `/checkout`
**File:** `apps/web/src/app/checkout/page.tsx`

**Flow:**
1. User isi form checkout (nama, email, phone, pesan)
2. Submit form
3. Backend create zakat donation via `POST /v1/admin/zakat/donations`
4. Redirect ke `/checkout/payment-detail`

**Code Snippet (Line 253-314):**
```typescript
// Create donations for zakat items
if (zakatItems.length > 0) {
  // Fetch zakat types untuk mapping
  const zakatTypesResponse = await fetch(`${API_URL}/admin/zakat/types?isActive=true&limit=100`);
  const zakatTypesData = await zakatTypesResponse.json();
  const zakatTypes = zakatTypesData?.data || [];

  // Mapping zakatType → zakatTypeId
  const zakatTypeMap: Record<string, string> = {};
  zakatTypes.forEach((type: any) => {
    const slug = type.slug; // "zakat-fitrah"
    const shortSlug = slug.replace('zakat-', ''); // "fitrah"
    zakatTypeMap[shortSlug] = type.id;
  });

  const zakatPromises = zakatItems.map(async (item) => {
    const zakatTypeId = zakatTypeMap[item.zakatData?.zakatType || ''];

    const donationData = {
      zakatTypeId,
      donorName: formData.name.trim(),
      donorEmail: normalizedEmail,
      donorPhone: normalizedPhone,
      isAnonymous: formData.hideMyName,
      amount: item.amount,
      calculatorData: item.zakatData,
      message: formData.message.trim(),
      paymentStatus: 'pending',
    };

    const response = await fetch(`${API_URL}/admin/zakat/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donationData),
    });

    return await response.json();
  });

  await Promise.all(zakatPromises);
}
```

---

## Backend API

### Public Endpoints

#### 1. Get Zakat Types
```
GET /v1/zakat/types
Response: {
  success: true,
  data: [
    {
      id: "...",
      name: "Zakat Fitrah",
      slug: "zakat-fitrah",
      description: null,
      imageUrl: "http://localhost:50245/uploads/...",
      icon: null,
      hasCalculator: true,
      isActive: true,
      displayOrder: 1
    },
    ...
  ]
}
```

#### 2. Get Zakat Config
```
GET /v1/zakat/config
Response: {
  success: true,
  data: {
    calculators: [...],
    goldPricePerGram: 1200000,
    zakatFitrahPerPerson: 45000,
    ricePricePerKg: 20000,
    fidyahPerDay: 45000
  }
}
```

#### 3. Calculate Zakat Income
```
POST /v1/zakat/calculate/income
Headers: Authorization: Bearer <token> (optional)
Body: {
  monthlyIncome: 5000000,
  otherIncome: 1000000,
  monthlyExpenses: 2000000
}
Response: {
  success: true,
  data: {
    type: "income",
    isWajib: true,
    nisabValue: 7200000,
    totalAssets: 4000000,
    zakatAmount: 100000,
    details: { zakatRate: 0.025 }
  }
}
```

**Backend Logic (`apps/api/src/services/zakat.ts`):**
```typescript
export async function calculateZakatIncome(db: any, params: any) {
  const goldPrice = await getGoldPrice(db);
  const nisabValue = goldPrice * 85; // 85 gram emas

  const netIncome = (params.monthlyIncome || 0) +
                    (params.otherIncome || 0) -
                    (params.monthlyExpenses || 0);

  const isWajib = netIncome >= nisabValue;
  const zakatAmount = isWajib ? Math.floor(netIncome * 0.025) : 0;

  return {
    type: "income",
    isWajib,
    nisabValue,
    totalAssets: netIncome,
    zakatAmount,
    details: {
      monthlyIncome: params.monthlyIncome,
      otherIncome: params.otherIncome,
      monthlyExpenses: params.monthlyExpenses,
      netIncome,
      zakatRate: 0.025,
    },
  };
}
```

#### 4. Calculate Zakat Maal
```
POST /v1/zakat/calculate/maal
Body: {
  savings: 10000000,
  deposits: 5000000,
  stocks: 2000000,
  otherAssets: 1000000,
  debts: 3000000
}
```

#### 5. Calculate Zakat Fitrah
```
POST /v1/zakat/calculate/fitrah
Body: {
  numberOfPeople: 4,
  pricePerPerson: 50000  // optional
}
```

#### 6. Calculate Zakat Trade (Bisnis)
```
POST /v1/zakat/calculate/trade
Body: {
  inventory: 50000000,
  receivables: 10000000,
  cash: 5000000,
  payables: 15000000
}
```

### Admin Endpoints

#### 1. List Zakat Donations
```
GET /v1/admin/zakat/donations?page=1&limit=10&paymentStatus=pending
Headers: Authorization: Bearer <admin-token>
Response: {
  success: true,
  data: [
    {
      id: "...",
      referenceId: "ZKT-1738320000-ABC123",
      zakatTypeId: "...",
      zakatTypeName: "Zakat Penghasilan",
      zakatTypeSlug: "zakat-profesi",
      donaturId: null,
      donorName: "Ahmad Zaki",
      donorEmail: "ahmad@example.com",
      donorPhone: "081234567890",
      isAnonymous: false,
      amount: 125000,
      calculatorData: {...},
      calculatedZakat: 125000,
      paymentMethodId: null,
      paymentStatus: "pending",
      paymentGateway: null,
      paymentReference: null,
      paidAt: null,
      notes: null,
      message: "Semoga bermanfaat",
      createdAt: "2026-01-31T10:00:00Z",
      updatedAt: "2026-01-31T10:00:00Z"
    },
    ...
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 45
  }
}
```

#### 2. Get Single Zakat Donation
```
GET /v1/admin/zakat/donations/:id
Headers: Authorization: Bearer <admin-token>
```

#### 3. Create Zakat Donation (Manual Entry)
```
POST /v1/admin/zakat/donations
Headers: Authorization: Bearer <admin-token>
Body: {
  zakatTypeId: "...",
  donaturId: "...",  // optional
  donorName: "Ahmad Zaki",
  donorEmail: "ahmad@example.com",
  donorPhone: "081234567890",
  isAnonymous: false,
  amount: 125000,
  calculatorData: {...},
  calculatedZakat: 125000,
  paymentMethodId: "...",
  paymentStatus: "pending",
  paymentReference: "/uploads/bukti-transfer.jpg",
  notes: "Catatan internal",
  message: "Pesan dari donatur"
}
```

**Backend Logic:**
- Generate `referenceId`: `ZKT-${Date.now()}-${random}`
- Insert ke `zakat_donations`
- **TIDAK** create ledger entry (akan dibuat saat verifikasi)

#### 4. Update Zakat Donation (Verifikasi)
```
PUT /v1/admin/zakat/donations/:id
Headers: Authorization: Bearer <admin-token>
Body: {
  paymentStatus: "success",
  paidAt: "2026-01-31T10:30:00Z"
}
```

**Backend Logic:**
- Update `zakat_donations.payment_status = 'success'`
- Update `zakat_donations.paid_at`
- **CREATE LEDGER ENTRY** jika status berubah dari non-success → success:
  ```typescript
  if (paymentStatus === "success" && existing[0].paymentStatus !== "success") {
    // Get zakat type
    const zakatType = await db.select().from(zakatTypes)
      .where(eq(zakatTypes.id, existing[0].zakatTypeId));

    // COA Mapping
    const coaMapping = {
      "zakat-maal": "6201",
      "zakat-fitrah": "6202",
      "zakat-profesi": "6203",
      "zakat-pertanian": "6204",
      "zakat-peternakan": "6205",
    };

    const coaCode = coaMapping[zakatType[0].slug];
    const coaAccount = await db.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.code, coaCode));

    // Insert ledger entry
    await db.insert(ledger).values({
      date: new Date(),
      description: `Donasi ${zakatType[0].name} dari ${updated[0].donorName}`,
      reference: updated[0].referenceId,
      referenceType: "zakat_donation",
      referenceId: updated[0].id,
      coaId: coaAccount[0].id,
      debit: 0,
      credit: updated[0].amount,  // CREDIT (income)
      status: "paid",
    });
  }
  ```

#### 5. Delete Zakat Donation
```
DELETE /v1/admin/zakat/donations/:id
Headers: Authorization: Bearer <admin-token>
```

### Zakat Distributions Endpoints

#### 1. List Distributions
```
GET /v1/admin/zakat/distributions?page=1&limit=10&status=draft
Headers: Authorization: Bearer <admin-token>
```

#### 2. Get Single Distribution
```
GET /v1/admin/zakat/distributions/:id
Headers: Authorization: Bearer <admin-token>
```

#### 3. Create Distribution
```
POST /v1/admin/zakat/distributions
Headers: Authorization: Bearer <admin-token>
Body: {
  zakatTypeId: "...",
  recipientType: "coordinator",  // or "direct"
  coordinatorId: "...",          // employee ID
  recipientCategory: "fakir",    // 8 asnaf
  recipientName: "Budi Santoso",
  amount: 1000000,
  purpose: "Bantuan untuk fakir miskin",
  description: "Deskripsi lengkap",
  status: "draft"
}
```

#### 4. Update Distribution (Approve)
```
PUT /v1/admin/zakat/distributions/:id
Headers: Authorization: Bearer <admin-token>
Body: {
  status: "approved",
  sourceBankId: "...",
  sourceBankName: "Bank BCA",
  sourceBankAccount: "1234567890",
  targetBankName: "Bank Mandiri",
  targetBankAccount: "9876543210",
  targetBankAccountName: "Budi Santoso",
  transferProof: "/uploads/transfer-proof.jpg"
}
```

#### 5. Disburse Distribution
```
PUT /v1/admin/zakat/distributions/:id
Headers: Authorization: Bearer <admin-token>
Body: {
  status: "disbursed"
}
```

**Backend Logic:**
- Update status → disbursed
- **CREATE LEDGER ENTRY** (Debit COA Zakat):
  ```typescript
  await db.insert(ledger).values({
    date: new Date(),
    description: `Penyaluran ${zakatType.name} kepada ${distribution.recipientName}`,
    reference: distribution.referenceId,
    referenceType: "zakat_distribution",
    referenceId: distribution.id,
    coaId: coaAccount.id,
    debit: distribution.amount,  // DEBIT (expense)
    credit: 0,
    status: "paid",
  });
  ```

---

## Admin Dashboard

### 1. Dashboard Zakat Utama
**Path:** `/dashboard/zakat`
**File:** `apps/admin/src/app/dashboard/zakat/page.tsx`

**Metrics:**
- Total Penerimaan Zakat (bulan ini)
- Total Penyaluran Zakat (bulan ini)
- Saldo Zakat Tersedia
- Grafik penerimaan & penyaluran per jenis zakat

### 2. Daftar Zakat Donations
**Path:** `/dashboard/zakat/donations`
**File:** `apps/admin/src/app/dashboard/zakat/donations/page.tsx`

**Features:**
- List all zakat donations dengan pagination
- Filter by: zakat type, payment status, donatur
- Search by: donor name, reference ID
- Actions: View Detail, Edit, Delete

**Kolom Table:**
- Reference ID
- Jenis Zakat
- Nama Donatur
- Jumlah
- Status Pembayaran
- Tanggal Dibayar
- Actions

### 3. Detail Zakat Donation
**Path:** `/dashboard/zakat/donations/[id]`
**File:** `apps/admin/src/app/dashboard/zakat/donations/[id]/page.tsx`

**Info Ditampilkan:**
- Reference ID
- Jenis Zakat
- Data Donatur (nama, email, phone)
- Jumlah Pembayaran
- Calculator Data (JSON)
- Payment Status
- Payment Method
- Bukti Transfer (Image/PDF)
- Tanggal Dibayar
- Catatan

**Actions:**
- Edit Status Pembayaran
- Update Payment Info
- Upload/Update Bukti Transfer
- Delete Donation

### 4. Catat Pembayaran Zakat Baru (Manual Entry)
**Path:** `/dashboard/zakat/donations/new`
**File:** `apps/admin/src/app/dashboard/zakat/donations/new/page.tsx`

**Form Fields:**
- Pilih Muzaki/Donatur (Autocomplete)
- Jenis Zakat (Select)
- Jumlah Pembayaran (Number)
- Status Pembayaran (Select: pending, success)
- Metode Pembayaran (Select)
- Upload Bukti Transfer (Media Library)
- Catatan (Textarea)

**Flow:**
1. Admin pilih donatur (atau create new donatur)
2. Pilih jenis zakat
3. Input jumlah
4. Pilih status & metode pembayaran
5. Upload bukti transfer (optional)
6. Submit → `POST /v1/admin/zakat/donations`
7. Redirect ke list donations

### 5. Daftar Penyaluran Zakat
**Path:** `/dashboard/zakat/distributions`
**File:** `apps/admin/src/app/dashboard/zakat/distributions/page.tsx`

**Features:**
- List all distributions
- Filter by: zakat type, status, recipient category
- Actions: View Detail, Edit, Approve, Disburse, Delete

### 6. Create Penyaluran Zakat
**Path:** `/dashboard/zakat/distributions/new`
**File:** `apps/admin/src/app/dashboard/zakat/distributions/new/page.tsx`

**Form Fields:**
- Jenis Zakat
- Tipe Penerima: Coordinator / Direct
- Kategori Penerima (8 Asnaf): Fakir, Miskin, Amil, Mualaf, Riqab, Gharim, Fisabilillah, Ibnus Sabil
- Nama Penerima
- Jumlah
- Tujuan Penyaluran
- Deskripsi
- Status (Draft/Approved)

### 7. Kelola Jenis Zakat
**Path:** `/dashboard/zakat/types`
**File:** `apps/admin/src/app/dashboard/zakat/types/page.tsx`

**Features:**
- CRUD zakat types
- Set active/inactive
- Upload image
- Reorder (display order)

---

## Payment & Verification

### Payment Status Lifecycle

```
┌─────────┐
│ pending │ ← Initial state saat donation dibuat
└────┬────┘
     │
     │ Admin verify (manual) atau Payment Gateway callback
     ↓
┌─────────┐
│ success │ → Create Ledger Entry (Credit COA)
└─────────┘

Alternative:
┌─────────┐
│ pending │
└────┬────┘
     │
     │ Payment gagal atau expired
     ↓
┌─────────┐     ┌─────────┐
│ failed  │ or  │ expired │
└─────────┘     └─────────┘
```

### Verifikasi Manual oleh Admin

**Scenario:** User transfer manual ke rekening bank

1. User upload bukti transfer di `/checkout/payment-detail`
2. Bukti disimpan di `zakat_donations.payment_reference`
3. Admin buka `/dashboard/zakat/donations`
4. Admin filter by `paymentStatus=pending`
5. Admin klik detail donation
6. Admin lihat bukti transfer
7. Admin verify:
   - Jika valid: Update status → `success`
   - Jika invalid: Update status → `failed` atau tambah notes

**Backend saat update status → success:**
- Update `payment_status` dan `paid_at`
- **Create Ledger Entry:**
  ```sql
  INSERT INTO ledger (
    date, description, reference, reference_type, reference_id,
    coa_id, debit, credit, status
  ) VALUES (
    NOW(),
    'Donasi Zakat Penghasilan dari Ahmad Zaki',
    'ZKT-1738320000-ABC123',
    'zakat_donation',
    'donation-id-...',
    'coa-id-for-6203',
    0,
    125000,
    'paid'
  );
  ```

### Ledger & Chart of Accounts (COA)

**COA Mapping untuk Zakat:**
- `6201` - Zakat Maal (Income)
- `6202` - Zakat Fitrah (Income)
- `6203` - Zakat Profesi/Penghasilan (Income)
- `6204` - Zakat Pertanian (Income)
- `6205` - Zakat Peternakan (Income)

**Entry Type:**
- **Penerimaan Zakat** → CREDIT (Income)
- **Penyaluran Zakat** → DEBIT (Expense/Distribution)

**Example Ledger Entries:**

| Date       | Description                  | Reference          | Type              | COA  | Debit | Credit  | Balance |
|------------|------------------------------|--------------------|-------------------|------|-------|---------|---------|
| 2026-01-31 | Donasi Zakat Penghasilan     | ZKT-...-ABC123     | zakat_donation    | 6203 | 0     | 125,000 | +125K   |
| 2026-02-01 | Penyaluran kepada Fakir      | ZKD-...-DEF456     | zakat_distribution| 6203 | 50,000| 0       | +75K    |

---

## Distribution Flow

### 8 Asnaf (Penerima Zakat)
1. **Fakir** - Orang yang tidak memiliki harta dan tenaga untuk memenuhi kebutuhan hidup
2. **Miskin** - Orang yang memiliki harta/pekerjaan tetapi tidak cukup untuk kebutuhan hidup
3. **Amil** - Orang yang bertugas mengumpulkan dan mendistribusikan zakat
4. **Mualaf** - Orang yang baru masuk Islam dan memerlukan bantuan
5. **Riqab** - Budak yang ingin memerdekakan diri
6. **Gharim** - Orang yang berhutang untuk kepentingan yang bukan maksiat
7. **Fisabilillah** - Orang yang berjuang di jalan Allah (dakwah, pendidikan, dll)
8. **Ibnus Sabil** - Musafir yang kehabisan bekal

### Distribution Types

#### 1. Coordinator Type
- **Target:** Program Coordinator (Employee) yang bertanggung jawab menyalurkan zakat
- **Flow:**
  1. Admin create distribution dengan `recipientType: "coordinator"`
  2. Pilih coordinator dari employee list
  3. Approve → Transfer dana ke rekening coordinator
  4. Coordinator salurkan ke penerima di lapangan
  5. Coordinator upload activity report (foto, deskripsi, jumlah penerima)

**Fields:**
- `coordinatorId` → Employee ID
- `distributionLocation` → Lokasi kegiatan
- `recipientCount` → Jumlah penerima
- `reportPhotos` → JSON array foto kegiatan

#### 2. Direct Type
- **Target:** Mustahiq individual yang terdaftar di sistem
- **Flow:**
  1. Admin create distribution dengan `recipientType: "direct"`
  2. Pilih mustahiq dari database
  3. Approve → Transfer langsung ke rekening mustahiq
  4. Disburse → Selesai

**Fields:**
- `mustahiqId` → Mustahiq ID
- `targetBankName` → Nama bank penerima
- `targetBankAccount` → No rekening penerima

### Distribution Status Flow

```
┌───────┐
│ draft │ ← Admin create distribution
└───┬───┘
    │
    │ Admin review & approve
    │ Fill bank transfer info
    ↓
┌──────────┐
│ approved │
└─────┬────┘
      │
      │ Admin upload transfer proof
      │ Admin mark as disbursed
      ↓
┌───────────┐
│ disbursed │ → Create Ledger Entry (Debit COA)
└───────────┘
      │
      │ (Optional) Coordinator add activity report
      ↓
┌─────────────────┐
│ Report Complete │
└─────────────────┘
```

---

## Testing Checklist

### A. User Flow Testing

#### 1. Zakat Fitrah Flow
- [ ] Buka `/zakat`
- [ ] Klik "Zakat Fitrah"
- [ ] Input jumlah jiwa: 4
- [ ] Klik "Hitung Zakat"
- [ ] Verify hasil: `4 × Rp 45.000 = Rp 180.000`
- [ ] Klik "Bayar Zakat"
- [ ] Verify cart: ada item zakat fitrah Rp 180.000
- [ ] Checkout: isi form (nama, email, phone)
- [ ] Submit checkout
- [ ] Verify redirect ke `/checkout/payment-detail`
- [ ] Verify API: `POST /admin/zakat/donations` dengan `paymentStatus: "pending"`

#### 2. Zakat Penghasilan Flow
- [ ] Buka `/zakat/zakat-penghasilan`
- [ ] Input:
  - Penghasilan bulanan: Rp 5.000.000
  - Penghasilan lain: Rp 1.000.000
  - Pengeluaran bulanan: Rp 2.000.000
- [ ] Klik "Hitung Zakat"
- [ ] Verify hasil:
  - Net income: Rp 4.000.000
  - Nisab: ~Rp 7.200.000 (85 gram emas)
  - Tidak wajib zakat (net income < nisab)
- [ ] Adjust input: Penghasilan bulanan = Rp 10.000.000
- [ ] Verify hasil:
  - Net income: Rp 9.000.000
  - Wajib zakat
  - Zakat: Rp 225.000 (2,5% × 9.000.000)
- [ ] Add to cart & checkout

#### 3. Zakat Maal Flow
- [ ] Buka `/zakat/zakat-maal`
- [ ] Input:
  - Tabungan: Rp 10.000.000
  - Deposito: Rp 5.000.000
  - Saham: Rp 2.000.000
  - Hutang: Rp 3.000.000
- [ ] Verify hasil:
  - Total aset: Rp 14.000.000
  - Wajib zakat
  - Zakat: Rp 350.000 (2,5% × 14.000.000)

#### 4. Payment Upload Flow
- [ ] Setelah checkout, redirect ke `/checkout/payment-detail`
- [ ] Upload bukti transfer (JPG/PNG/PDF max 5MB)
- [ ] Klik "Konfirmasi Pembayaran"
- [ ] Verify API call success
- [ ] Verify `zakat_donations.payment_reference` updated

### B. Admin Verification Testing

#### 1. List Zakat Donations
- [ ] Login sebagai admin
- [ ] Buka `/dashboard/zakat/donations`
- [ ] Verify list tampil dengan pagination
- [ ] Test filter by `paymentStatus: pending`
- [ ] Test search by donor name

#### 2. Verify Payment
- [ ] Klik detail donation
- [ ] Verify info lengkap (donatur, jumlah, dll)
- [ ] Lihat bukti transfer
- [ ] Klik "Verify Payment" atau Edit
- [ ] Update status → `success`
- [ ] Submit
- [ ] Verify:
  - [ ] `zakat_donations.payment_status = 'success'`
  - [ ] `zakat_donations.paid_at` filled
  - [ ] Ledger entry created (Credit COA Zakat)

#### 3. Create Manual Entry
- [ ] Buka `/dashboard/zakat/donations/new`
- [ ] Pilih muzaki (autocomplete)
- [ ] Pilih jenis zakat
- [ ] Input jumlah: Rp 500.000
- [ ] Status: success
- [ ] Upload bukti
- [ ] Submit
- [ ] Verify donation created
- [ ] Verify ledger entry created (karena status = success)

### C. Distribution Testing

#### 1. Create Distribution (Coordinator Type)
- [ ] Buka `/dashboard/zakat/distributions/new`
- [ ] Pilih jenis zakat: Zakat Maal
- [ ] Tipe penerima: Coordinator
- [ ] Pilih coordinator (employee)
- [ ] Kategori: Fakir
- [ ] Jumlah: Rp 1.000.000
- [ ] Tujuan: "Bantuan untuk fakir miskin di wilayah X"
- [ ] Status: Draft
- [ ] Submit
- [ ] Verify distribution created

#### 2. Approve Distribution
- [ ] Buka detail distribution
- [ ] Klik "Approve" atau Edit
- [ ] Fill transfer info:
  - Source bank: Bank BCA - 1234567890
  - Target bank: Bank Mandiri - 9876543210
  - Target name: Budi Santoso (Coordinator)
- [ ] Upload transfer proof
- [ ] Update status → `approved`
- [ ] Submit
- [ ] Verify status updated

#### 3. Disburse Distribution
- [ ] Buka detail distribution
- [ ] Klik "Mark as Disbursed"
- [ ] Update status → `disbursed`
- [ ] Verify:
  - [ ] Status = disbursed
  - [ ] `disbursedBy` = current user ID
  - [ ] `disbursedAt` = NOW()
  - [ ] Ledger entry created (Debit COA Zakat)

#### 4. Add Activity Report
- [ ] (Coordinator login)
- [ ] Buka distribution detail
- [ ] Klik "Add Activity Report"
- [ ] Fill:
  - Tanggal kegiatan
  - Deskripsi kegiatan
  - Upload foto kegiatan (multiple)
- [ ] Submit
- [ ] Verify report saved

### D. Calculator Logic Testing

#### Test Case 1: Zakat Income - Below Nisab
```javascript
Input: {
  monthlyIncome: 3000000,
  otherIncome: 0,
  monthlyExpenses: 1000000
}
Expected: {
  netIncome: 2000000,
  nisabValue: ~7200000,
  isWajib: false,
  zakatAmount: 0
}
```

#### Test Case 2: Zakat Income - Above Nisab
```javascript
Input: {
  monthlyIncome: 10000000,
  otherIncome: 2000000,
  monthlyExpenses: 3000000
}
Expected: {
  netIncome: 9000000,
  nisabValue: ~7200000,
  isWajib: true,
  zakatAmount: 225000  // 2.5% × 9000000
}
```

#### Test Case 3: Zakat Maal
```javascript
Input: {
  savings: 10000000,
  deposits: 5000000,
  stocks: 3000000,
  otherAssets: 2000000,
  debts: 5000000
}
Expected: {
  totalAssets: 15000000,  // 20M - 5M debts
  nisabValue: ~7200000,
  isWajib: true,
  zakatAmount: 375000  // 2.5% × 15000000
}
```

#### Test Case 4: Zakat Fitrah
```javascript
Input: {
  numberOfPeople: 5,
  pricePerPerson: 50000  // override default 45000
}
Expected: {
  totalAmount: 250000,  // 5 × 50000
  zakatAmount: 250000
}
```

### E. Ledger Testing

#### Scenario: Complete Flow
1. **User bayar zakat Rp 500.000**
   - Donation created, status = pending
   - No ledger entry yet

2. **Admin verify pembayaran**
   - Update status = success
   - **Ledger entry created:**
     ```
     Date: 2026-01-31
     Description: Donasi Zakat Penghasilan dari Ahmad
     Reference: ZKT-...
     Type: zakat_donation
     COA: 6203 (Zakat Profesi)
     Debit: 0
     Credit: 500,000
     ```

3. **Admin create distribution Rp 300.000**
   - Distribution created, status = draft
   - No ledger entry yet

4. **Admin approve & disburse**
   - Update status = disbursed
   - **Ledger entry created:**
     ```
     Date: 2026-02-01
     Description: Penyaluran kepada Fakir
     Reference: ZKD-...
     Type: zakat_distribution
     COA: 6203
     Debit: 300,000
     Credit: 0
     ```

5. **Check Saldo Zakat Profesi (COA 6203)**
   - Total Credit: Rp 500.000
   - Total Debit: Rp 300.000
   - **Saldo: Rp 200.000**

### F. Error Handling Testing

#### 1. Invalid Calculator Input
- [ ] Input negative values → Error
- [ ] Input non-numeric values → Error
- [ ] Empty required fields → Error

#### 2. Checkout Errors
- [ ] Empty cart → Cannot checkout
- [ ] Missing required fields → Validation error
- [ ] Invalid email format → Error
- [ ] Invalid phone format → Error

#### 3. Upload Errors
- [ ] File too large (>5MB) → Error
- [ ] Invalid file type (not image/PDF) → Error
- [ ] No file selected → Skip upload

#### 4. Admin Errors
- [ ] Non-admin try to access → 401 Unauthorized
- [ ] Update non-existent donation → 404 Not Found
- [ ] Delete donation with existing ledger → Confirm deletion

### G. Timezone Testing
- [ ] Verify `createdAt`, `updatedAt`, `paidAt` menggunakan WIB (Asia/Jakarta)
- [ ] Verify display format di dashboard: "31 Januari 2026, 10:30 WIB"
- [ ] Verify filter by date range works correctly

---

## Summary Fitur & Status

### ✅ Implemented Features
1. **Kalkulator Zakat** (5 jenis)
   - Zakat Fitrah ✅
   - Zakat Maal ✅
   - Zakat Penghasilan/Profesi ✅
   - Zakat Perdagangan/Bisnis ✅
   - Zakat Emas ✅

2. **User Flow**
   - Calculate zakat ✅
   - Add to cart ✅
   - Checkout ✅
   - Create donation ✅
   - Upload payment proof ✅

3. **Admin Dashboard**
   - List donations ✅
   - Detail donation ✅
   - Verify payment ✅
   - Manual entry ✅
   - CRUD zakat types ✅

4. **Distribution**
   - Create distribution ✅
   - Approve & disburse ✅
   - Coordinator type ✅
   - Direct type ✅
   - Activity report ✅

5. **Accounting Integration**
   - Ledger entry on payment verified ✅
   - Ledger entry on distribution disbursed ✅
   - COA mapping ✅

6. **Timezone Support**
   - All timestamps use WIB ✅

### 🔧 Configuration Required
1. **Settings** (via Admin Dashboard)
   - `gold_price_per_gram` → Set harga emas terkini
   - `zakat_fitrah_amount` → Set nominal zakat fitrah
   - `rice_price_per_kg` → Set harga beras
   - `fidyah_amount_per_day` → Set nominal fidyah

2. **Chart of Accounts (COA)**
   - Ensure COA codes exist: 6201, 6202, 6203, 6204, 6205

3. **Payment Methods**
   - Configure bank accounts untuk zakat
   - Set `programs: ["zakat"]` di payment methods

4. **Zakat Types**
   - Ensure zakat types seeded di database
   - Upload images untuk setiap jenis zakat

### 📊 Metrics & Reports
- Total penerimaan zakat per jenis
- Total penyaluran zakat per asnaf
- Saldo zakat tersedia
- Grafik tren penerimaan & penyaluran
- Laporan bulanan/tahunan

---

## API Endpoints Summary

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/zakat/types` | List zakat types |
| GET | `/v1/zakat/config` | Get calculator config |
| POST | `/v1/zakat/calculate/income` | Calculate zakat penghasilan |
| POST | `/v1/zakat/calculate/maal` | Calculate zakat maal |
| POST | `/v1/zakat/calculate/fitrah` | Calculate zakat fitrah |
| POST | `/v1/zakat/calculate/trade` | Calculate zakat bisnis |
| POST | `/v1/zakat/calculate/gold` | Calculate zakat emas |

### Admin - Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/zakat/donations` | List donations |
| GET | `/v1/admin/zakat/donations/:id` | Get donation detail |
| POST | `/v1/admin/zakat/donations` | Create donation (manual) |
| PUT | `/v1/admin/zakat/donations/:id` | Update donation (verify) |
| DELETE | `/v1/admin/zakat/donations/:id` | Delete donation |

### Admin - Distributions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/zakat/distributions` | List distributions |
| GET | `/v1/admin/zakat/distributions/:id` | Get distribution detail |
| POST | `/v1/admin/zakat/distributions` | Create distribution |
| PUT | `/v1/admin/zakat/distributions/:id` | Update distribution |
| DELETE | `/v1/admin/zakat/distributions/:id` | Delete distribution |

### Admin - Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/zakat/types` | List zakat types |
| GET | `/v1/admin/zakat/types/:id` | Get type detail |
| POST | `/v1/admin/zakat/types` | Create type |
| PUT | `/v1/admin/zakat/types/:id` | Update type |
| DELETE | `/v1/admin/zakat/types/:id` | Delete type |

---

## Kontak & Support
Jika ada pertanyaan atau bug, hubungi:
- **Developer:** [Your Name]
- **Email:** [your-email@example.com]
- **GitHub Issues:** [repo-url/issues]

---

**Last Updated:** 2026-01-31
**Version:** 1.0.0
