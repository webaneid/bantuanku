# Blueprint: Unified Transaction & Invoice System

## Executive Summary

Redesign sistem transaksi agar **semua order dilakukan di 1 form universal** untuk 3 module (Campaign/Donasi, Zakat, Qurban). Keep existing modules untuk management, build new transaction system parallel, migrate when stable.

**Key Goals:**
- ✅ **1 Universal Transaction Form** - Admin create semua tipe transaksi dari 1 form
- ✅ **Unified Invoice & Payment System** - 1 tabel invoice & payment untuk semua
- ✅ **Keep Existing Modules** - campaigns/zakat_types/qurban_packages tetap untuk management
- ✅ **Build Parallel** - Jangan touch existing, buat baru sampai stable
- ✅ **Incremental Migration** - Gradual rollout, easy rollback

---

## 1) Current State Analysis

### Existing Product Management (KEEP AS-IS ✅)
```
campaigns              - Campaign management (title, pillar, target)
zakat_types            - Zakat types + calculator config
qurban_periods         - Hijri year periods
qurban_packages        - Package definitions (kambing/sapi)
qurban_package_periods - Price & stock per period
qurban_shared_groups   - Patungan groups
```
**Role**: Product catalog management (admin kelola products disini)

### Existing Transaction Tables (WILL BE REPLACED)
```
donations          - Donasi transactions
zakat_donations    - Zakat transactions
qurban_orders      - Qurban transactions
```
**Problem**: 3 tables terpisah, 3 forms berbeda, reporting susah

### Existing Payment Tables (WILL BE UNIFIED)
```
donation_payments  - Payment tracking
zakat_payments     - Payment tracking
qurban_payments    - Payment tracking
```
**Problem**: Fragmented, sulit unified verification

### Supporting Infrastructure
```
invoices           - Hanya donation_id (not generic)
payment_methods    - Metode pembayaran
ledger_entries     - Double-entry accounting
ledger_lines       - Journal lines
```

---

## 2) Gap Analysis - Unique Features

### ✅ COMMONALITIES (Same for All):
```
• Donor: name, email, phone, anonymous
• Amount: bigint
• Quantity: integer (default 1)
• Payment Method: FK payment_methods
• Payment Status: pending/partial/paid
• Message/Notes
• Payment Proof Upload
• Admin Verification
```

### Qurban Unique Features:
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `period_id` | FK → qurban_periods | ✅ Yes | Hijri year (1446H, 1447H) |
| `package_id` | FK → qurban_packages | ✅ Yes | Kambing/Sapi, Individual/Patungan |
| `admin_fee` | bigint | ✅ Yes | Biaya admin tambahan |
| `shared_group_id` | FK → qurban_shared_groups | ⚠️ Optional | Jika ikut patungan |
| `on_behalf_of` | string | ⚠️ Optional | Atas nama (bisa beda dari donor) |
| `installment_enabled` | boolean | ⚠️ Optional | Support cicilan |
| `installment_frequency` | enum | ⚠️ If enabled | monthly/biweekly |
| `installment_count` | integer | ⚠️ If enabled | Jumlah cicilan |

### Zakat Unique Features:
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `zakat_type_id` | FK → zakat_types | ✅ Yes | Fitrah, Maal, Penghasilan |
| `calculator_data` | JSONB | ⚠️ Optional | Input aset (gold, savings, business) |
| `calculated_zakat` | bigint | ⚠️ Optional | Result dari calculator |

### Campaign Unique Features:
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `campaign_id` | FK → campaigns | ✅ Yes | Specific campaign |
| `pillar` | string | ℹ️ Info only | From campaign (infaq/wakaf/fidyah) |

### Current Problems:
1. ❌ **3 Forms Terpisah** - Admin belajar 3 UX berbeda
2. ❌ **3 Transaction Tables** - Reporting perlu UNION
3. ❌ **3 Payment Tables** - Verification fragmented
4. ❌ **No Unified Invoice** - Tidak ada abstraction layer
5. ❌ **Manual Accounting** - Ledger entry manual

---

## 3) Target Architecture

### Core Principles
1. **Transaction-centric** - 1 tabel universal untuk semua order
2. **Product-agnostic** - Support campaigns/zakat/qurban
3. **Keep Modules** - Domain tables untuk management saja
4. **Conditional Fields** - JSONB untuk type-specific data
5. **Ledger Integrated** - Auto journal entry on verification
6. **Build Parallel** - Existing untouched sampai stable

### New Database Schema

#### A. `transactions` (NEW - Core Table)
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL, -- TRX-20260208-0001

  -- Product Reference (Polymorphic)
  product_type TEXT NOT NULL CHECK (product_type IN ('campaign', 'zakat', 'qurban')),
  product_id TEXT NOT NULL,

  -- Product Snapshot (Denormalized for display)
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image TEXT,

  -- Order Details
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price BIGINT NOT NULL, -- Price per unit
  subtotal BIGINT NOT NULL, -- quantity * unit_price
  admin_fee BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL, -- subtotal + admin_fee

  -- Donor Information
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,

  -- Payment
  payment_method_id TEXT, -- Selected payment method
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled')),
  paid_amount BIGINT DEFAULT 0,
  paid_at TIMESTAMP,

  -- Type-Specific Data (Conditional Fields as JSON)
  type_specific_data JSONB,
  /*
    Qurban: {
      period_id, package_id, shared_group_id?,
      on_behalf_of?, installment_enabled?,
      installment_frequency?, installment_count?
    }
    Zakat: {
      zakat_type_id, calculator_data?, calculated_zakat?
    }
    Campaign: {
      campaign_id, pillar?
    }
  */

  message TEXT, -- User message/doa
  notes TEXT, -- Admin internal notes

  -- Ledger Integration
  ledger_entry_id TEXT, -- FK to ledger_entries

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_product ON transactions(product_type, product_id);
CREATE INDEX idx_transactions_status ON transactions(payment_status);
CREATE INDEX idx_transactions_donor ON transactions(donor_email);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
```

#### B. `transaction_payments` (NEW - Unified Payments)
```sql
CREATE TABLE transaction_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL, -- PAY-20260208-0001
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  -- Payment Details
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  payment_method TEXT NOT NULL, -- bank_transfer/qris/gateway
  payment_channel TEXT, -- Bank code, QRIS provider

  -- Installment Support
  installment_number INTEGER, -- 1, 2, 3... (NULL if not installment)

  -- Proof & Verification
  payment_proof TEXT, -- GCS URL
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,

  -- Ledger Integration
  ledger_entry_id TEXT, -- Journal entry for this payment

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_transaction ON transaction_payments(transaction_id);
CREATE INDEX idx_payments_status ON transaction_payments(status);
CREATE INDEX idx_payments_created ON transaction_payments(created_at DESC);
```

#### C. Module Tables (EXISTING - Keep for Management)
```sql
-- These remain UNCHANGED for product management
campaigns { ... }
zakat_types { ... }
qurban_periods { ... }
qurban_packages { ... }
qurban_package_periods { ... }
qurban_shared_groups { ... }
```

#### D. Legacy Tables (EXISTING - Read-only setelah migration)
```sql
-- Keep for historical data, mark as deprecated
donations { ... }
zakat_donations { ... }
qurban_orders { ... }
donation_payments { ... }
zakat_payments { ... }
qurban_payments { ... }
```

### Conditional Fields Matrix

| Field | Campaign | Zakat | Qurban | Stored In |
|-------|----------|-------|--------|-----------|
| **Common** |
| donor_name, email, phone | ✅ | ✅ | ✅ | transactions (direct) |
| quantity | ✅ (=1) | ✅ (=1) | ✅ (editable) | transactions (direct) |
| unit_price | ✅ | ✅ | ✅ | transactions (direct) |
| admin_fee | ❌ (0) | ❌ (0) | ✅ | transactions (direct) |
| **Type-Specific** |
| campaign_id | ✅ | ❌ | ❌ | type_specific_data |
| pillar | ℹ️ | ❌ | ❌ | type_specific_data |
| zakat_type_id | ❌ | ✅ | ❌ | type_specific_data |
| calculator_data | ❌ | ⚠️ | ❌ | type_specific_data |
| calculated_zakat | ❌ | ⚠️ | ❌ | type_specific_data |
| period_id | ❌ | ❌ | ✅ | type_specific_data |
| package_id | ❌ | ❌ | ✅ | type_specific_data |
| shared_group_id | ❌ | ❌ | ⚠️ | type_specific_data |
| on_behalf_of | ❌ | ❌ | ⚠️ | type_specific_data |
| installment_* | ❌ | ❌ | ⚠️ | type_specific_data |

---

## 4) User Flow - Universal Transaction Form

### Admin: Create New Transaction

```
┌────────────────────────────────────┐
│ /dashboard/transactions/create     │
└────────────────────────────────────┘

STEP 1: Select Product Type
┌────────────────────────────────────┐
│ ○ Campaign/Donasi                  │
│   (Infaq, Wakaf, Fidyah)           │
│                                    │
│ ○ Zakat                            │
│   (Fitrah, Maal, Penghasilan)      │
│                                    │
│ ○ Qurban                           │
│   (Kambing, Sapi, Patungan)        │
└────────────────────────────────────┘
              ↓

STEP 2: Select Product (Conditional)
┌────────────────────────────────────┐
│ IF Campaign:                       │
│   Search/Select Campaign           │
│   Show: title, pillar, target      │
│                                    │
│ IF Zakat:                          │
│   Select Zakat Type                │
│   [Optional] Use Calculator        │
│   → Input assets                   │
│   → Show calculated amount         │
│                                    │
│ IF Qurban:                         │
│   Select Period (2026/1446H)       │
│   Select Package (Kambing Rp 2jt)  │
│   [Optional] Join Shared Group     │
└────────────────────────────────────┘
              ↓

STEP 3: Order Details (Conditional)
┌────────────────────────────────────┐
│ Quantity: [1] (editable for qurban)│
│ Unit Price: Rp 2.000.000           │
│   • Campaign: manual input         │
│   • Zakat: from calculator         │
│   • Qurban: from package.price     │
│                                    │
│ IF Qurban:                         │
│   Admin Fee: Rp 50.000             │
│   On Behalf Of: [________]         │
│   ☐ Enable Installment             │
│     Frequency: [Monthly ▼]         │
│     Count: [3] times               │
│                                    │
│ Subtotal: Rp 2.000.000             │
│ Admin Fee: Rp 50.000               │
│ ───────────────────                │
│ Total: Rp 2.050.000                │
└────────────────────────────────────┘
              ↓

STEP 4: Donor Information
┌────────────────────────────────────┐
│ Name: [________________] *         │
│ Email: [_______________]           │
│ Phone: [_______________] *         │
│ ☐ Anonymous Donation               │
│ Message/Doa: [________]            │
└────────────────────────────────────┘
              ↓

STEP 5: Payment (Optional)
┌────────────────────────────────────┐
│ ○ Mark as Paid                     │
│   → Select Payment Method          │
│   → Upload Proof                   │
│                                    │
│ ○ Send Invoice (Pay Later)         │
│   → Status: pending                │
│   → Send link to donor             │
└────────────────────────────────────┘
              ↓

✅ Transaction Created
┌────────────────────────────────────┐
│ TRX-20260208-0001                  │
│                                    │
│ [View Transaction]                 │
│ [Send Invoice Link]                │
│ [Create Another]                   │
└────────────────────────────────────┘
```

### Public: Payment Flow (Reuse Existing ✅)
```
Guest receives: https://bantuanku.com/invoice/TRX-XXX
  ↓
View Invoice → Select Payment Method → Upload Proof
  ↓
Admin Verify → Auto Ledger Entry → Status: Paid
```

---

## 5) API Design

### New Unified Endpoints

```typescript
// ============================================
// TRANSACTIONS API (NEW)
// ============================================

// Create transaction
POST /v1/transactions
Body: {
  product_type: 'campaign' | 'zakat' | 'qurban',
  product_id: string,
  quantity?: number,
  unit_price?: number, // Override for custom amount
  admin_fee?: number,

  donor_name: string,
  donor_email?: string,
  donor_phone: string,
  is_anonymous?: boolean,
  message?: string,

  type_specific_data?: Record<string, any>
}

// List transactions
GET /v1/transactions
Query: ?product_type=&status=&donor_email=&page=&limit=

// Get detail
GET /v1/transactions/:id

// Upload payment proof (reuse existing unified endpoint)
POST /v1/transactions/:id/payments
Body: FormData { file, amount, payment_method, notes }

// Verify payment (admin)
POST /v1/transactions/:id/payments/:paymentId/verify
Body: { status: 'verified' | 'rejected', rejection_reason?, notes }

// ============================================
// MODULE MANAGEMENT (Keep Existing)
// ============================================

GET /v1/campaigns
GET /v1/zakat/types
GET /v1/qurban/periods
GET /v1/qurban/packages
```

---

## 6) Implementation Phases

### FASE 0: Foundation & Design ✅
**Duration**: 1 day

**Tasks:**
- [x] Gap analysis
- [x] Architecture design
- [x] Document unique fields
- [x] Stakeholder approval

**Deliverable**: This blueprint

---

### FASE 1: Database Schema Migration ✅
**Duration**: 2 days

**Tasks:**

1. **Create transactions table**
   - Migration: `050_create_transactions_table.sql`
   - Includes all core fields + type_specific_data JSONB

2. **Create transaction_payments table**
   - Migration: `051_create_transaction_payments_table.sql`
   - Unified payment tracking

3. **Create indexes**
   - Migration: `052_create_transaction_indexes.sql`
   - Index on product_type, product_id, status, donor_email, created_at

**Testing:**
- Run migrations locally
- Verify schema with Drizzle
- No data changes yet

**Deliverable**: Database ready for new system

---

### FASE 2: Service Layer ✅
**Duration**: 3 days

**Goal**: Build TransactionService (don't touch existing)

```typescript
// apps/api/src/services/transaction.ts
export class TransactionService {
  // Get product based on type
  async getProduct(productType, productId) {
    switch(productType) {
      case 'campaign': return getCampaign(productId);
      case 'zakat': return getZakatType(productId);
      case 'qurban': return getQurbanPackagePeriod(productId);
    }
  }

  // Create transaction
  async create(data: CreateTransactionDTO) {
    const product = await this.getProduct(data.product_type, data.product_id);

    const quantity = data.quantity || 1;
    const unitPrice = data.unit_price || product.price;
    const subtotal = quantity * unitPrice;
    const adminFee = data.admin_fee || 0;
    const totalAmount = subtotal + adminFee;

    return await db.insert(transactions).values({
      transaction_number: generateNumber(),
      product_type: data.product_type,
      product_id: data.product_id,
      product_name: product.name || product.title,
      quantity,
      unit_price: unitPrice,
      subtotal,
      admin_fee: adminFee,
      total_amount: totalAmount,
      donor_name: data.donor_name,
      donor_email: data.donor_email,
      donor_phone: data.donor_phone,
      is_anonymous: data.is_anonymous || false,
      type_specific_data: data.type_specific_data || {},
      message: data.message,
      payment_status: 'pending',
      created_at: new Date()
    });
  }

  // List & query
  async list(filters) { ... }
  async getById(id) { ... }
}
```

**Testing:**
- Unit tests for service
- Test all product types
- Test amount calculations

**Deliverable**: TransactionService ready

---

### FASE 3: API Routes ✅
**Duration**: 2 days

**Goal**: Expose new endpoints (parallel to existing)

```typescript
// apps/api/src/routes/transactions.ts (NEW)
import { TransactionService } from '../services/transaction';

const app = new Hono();

app.post('/', async (c) => {
  const data = await c.req.json();
  const transaction = await transactionService.create(data);
  return c.json({ success: true, data: transaction }, 201);
});

app.get('/', async (c) => {
  const filters = c.req.query();
  const transactions = await transactionService.list(filters);
  return c.json({ success: true, data: transactions });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const transaction = await transactionService.getById(id);
  return c.json({ success: true, data: transaction });
});

export default app;
```

**Testing:**
- E2E tests for create
- Test all product types
- Test validation

**Deliverable**: API endpoints working

---

### FASE 4: Admin UI - Universal Form ✅
**Duration**: 5 days

**Goal**: Build 1 form dengan conditional fields

```typescript
// apps/admin/src/app/dashboard/transactions/create/page.tsx
export default function CreateTransactionPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    product_type: null,
    product_id: null,
    quantity: 1,
    type_specific_data: {}
  });

  return (
    <div>
      {step === 1 && <SelectProductType onChange={...} />}
      {step === 2 && <SelectProduct productType={...} />}
      {step === 3 && <OrderDetails productType={...} />}
      {step === 4 && <DonorInformation />}
      {step === 5 && <PaymentOptions />}
    </div>
  );
}
```

**Components:**
- `SelectProductType` - Radio campaign/zakat/qurban
- `SelectProduct` - Conditional: campaign selector, zakat selector, qurban selector
- `OrderDetails` - Conditional fields based on product_type
- `DonorInformation` - Standard fields
- `PaymentOptions` - Mark paid atau send invoice

**Testing:**
- Test all product types
- Test conditional rendering
- Test validation

**Deliverable**: Universal form working

---

### FASE 5: Payment Integration ✅
**Duration**: 2 days

**Goal**: Connect to existing payment flow

Payment flow already universal (invoice/[id] routes), just ensure new transactions work with existing UniversalPaymentMethodSelector & UniversalPaymentDetailSelector.

**Testing:**
- Upload payment proof
- Admin verification
- Ledger entry creation

**Deliverable**: Payment flow integrated

---

### FASE 6: Data Migration ✅
**Duration**: 3 days

**Goal**: Migrate historical data

```typescript
// packages/db/scripts/migrate-to-transactions.ts
async function migrate() {
  // Migrate donations
  for (const donation of allDonations) {
    await createTransactionFromDonation(donation);
  }

  // Migrate zakat
  for (const zakat of allZakat) {
    await createTransactionFromZakat(zakat);
  }

  // Migrate qurban
  for (const qurban of allQurban) {
    await createTransactionFromQurban(qurban);
  }
}
```

**Validation:**
- Compare totals
- Verify all payments migrated

**Deliverable**: Historical data in new system

---

### FASE 7: Cleanup & Deprecation ✅
**Duration**: 2 days

**Goal**: Remove old system

- [x] Mark old forms as deprecated
- [x] Update admin dashboard
- [x] Keep legacy tables read-only
- [x] Documentation

**Deliverable**: Clean production system

---

## 7) Benefits

### For Admin:
- ✅ **1 form** untuk semua transaksi
- ✅ **1 dashboard** unified view
- ✅ **Faster** transaction creation
- ✅ **Consistent UX**

### For Developer:
- ✅ **Less code** duplication
- ✅ **Easy to add** new product types
- ✅ **Unified payment** logic
- ✅ **Better maintainability**

### For System:
- ✅ **Scalable** architecture
- ✅ **Auto ledger** integration
- ✅ **Consistent data** model
- ✅ **Future-proof**

---

## 8) Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 0. Foundation | 1 day | 1 day |
| 1. Schema | 2 days | 3 days |
| 2. Service Layer | 3 days | 6 days |
| 3. API Routes | 2 days | 8 days |
| 4. Admin UI | 5 days | 13 days |
| 5. Payment | 2 days | 15 days |
| 6. Migration | 3 days | 18 days |
| 7. Cleanup | 2 days | 20 days |
| **TOTAL** | **~3 weeks** | **20 days** |

---

## 9) Decision Log

### Why Universal Form vs Keep 3 Forms?
**Decision**: Build 1 universal form

**Rationale**:
- ✅ Simpler untuk admin (1 UX to learn)
- ✅ Less code to maintain
- ✅ Easy to add new product types
- ✅ Consistent experience

### Why JSONB for type_specific_data?
**Decision**: Use JSONB for flexibility

**Rationale**:
- ✅ Schema flexibility
- ✅ No NULL columns
- ✅ Easy to extend
- ⚠️ Trade-off: No DB constraints

### Why Keep Legacy Tables?
**Decision**: Keep as read-only

**Rationale**:
- ✅ Historical reference
- ✅ Easy rollback
- ✅ Audit trail

---

## 10) Next Steps

1. **Review & Approval** ← You are here
2. **Start Fase 1** - Schema migration
3. **Weekly check-ins**

---

**Document Version**: 4.0
**Last Updated**: 2026-02-08
**Author**: Claude + Development Team
**Status**: ✅ Implementation Complete - Ready for Production ✅
