# Gap Analysis & Fix Plan - Sistem Zakat

**Date:** 2026-01-31
**Status:** CRITICAL BUGS FOUND

---

## 🔴 CRITICAL GAPS IDENTIFIED

### GAP #1: Missing `zakatData` in Cart Items
**Location:** All zakat calculator pages
**Severity:** CRITICAL - Checkout will FAIL
**Files Affected:**
- `/apps/web/src/app/zakat/zakat-penghasilan/page.tsx`
- `/apps/web/src/app/zakat/zakat-bisnis/page.tsx`
- `/apps/web/src/app/zakat/zakat-fitrah/page.tsx`
- `/apps/web/src/app/zakat/zakat-maal/page.tsx`
- (All other zakat calculator pages)

**Current Code (BROKEN):**
```typescript
const cartItem = {
  type: 'zakat',
  subType: 'income',
  name: 'Zakat Penghasilan',
  amount: result.zakatAmount,
  quantity: 1,
  pricePerUnit: result.zakatAmount,
  // ❌ MISSING: zakatData
};
```

**What Checkout Expects:**
```typescript
// From checkout/page.tsx line 268-286
const zakatTypeId = zakatTypeMap[item.zakatData?.zakatType || ''];
// If zakatData is undefined → zakatTypeId = undefined → ERROR

calculatorData: item.zakatData ? {
  zakatType: item.zakatData.zakatType,
  quantity: item.zakatData.quantity,
  pricePerUnit: item.zakatData.pricePerUnit,
} : null,
```

**Impact:**
- User menghitung zakat ✅
- User klik "Bayar Zakat" ✅
- Item masuk cart ✅
- User checkout → **ERROR: "Zakat type not found"** ❌
- Zakat donation TIDAK TERBUAT ❌

**Root Cause:**
Cart item tidak memiliki field `zakatData` yang required oleh checkout flow.

---

### GAP #2: Payment Detail Page Tidak Handle Zakat
**Location:** `/apps/web/src/app/checkout/payment-detail/page.tsx`
**Severity:** CRITICAL - Payment upload will FAIL
**Lines:** 76-96

**Current Code:**
```typescript
const fetchPromises = transactionData.map(async (t) => {
  if (t.type === 'donation') {
    // Fetch donation detail
  } else if (t.type === 'qurban') {
    // Fetch qurban detail
  }
  // ❌ MISSING: else if (t.type === 'zakat')
});
```

**Impact:**
- Setelah checkout sukses (jika GAP #1 fixed)
- User redirect ke `/checkout/payment-detail`
- Page mencoba fetch transaction details
- Untuk type === 'zakat' → **TIDAK ADA HANDLING** ❌
- Transaction data tidak ditampilkan
- User tidak bisa upload bukti pembayaran

**What's Needed:**
```typescript
else if (t.type === 'zakat') {
  const response = await fetch(`${API_URL}/admin/zakat/donations/${t.id}`);
  const data = await response.json();
  return {
    id: data.data.id,
    type: 'zakat',
    program: t.program,
    referenceId: data.data.referenceId,
    amount: data.data.amount,
    totalAmount: data.data.amount,
    zakatType: data.data.zakatType,
  };
}
```

---

### GAP #3: Payment Upload Tidak Handle Zakat
**Location:** `/apps/web/src/app/checkout/payment-detail/page.tsx`
**Severity:** HIGH - Cannot upload payment proof
**Lines:** ~180-250 (handleConfirmPayment function)

**Current Upload Logic:**
```typescript
const handleConfirmPayment = async () => {
  // ...
  const uploadPromises = transactions.map(async (transaction) => {
    if (transaction.type === 'donation') {
      // Upload to /donations/:id/upload-proof
    } else if (transaction.type === 'qurban') {
      // Upload to /qurban/payments
    }
    // ❌ MISSING: else if (transaction.type === 'zakat')
  });
};
```

**Impact:**
- User upload bukti transfer
- Klik "Konfirmasi Pembayaran"
- Untuk type === 'zakat' → **TIDAK ADA HANDLING** ❌
- Bukti transfer tidak terupload
- Payment proof tidak tersimpan di zakat_donations

**What's Needed:**
Upload ke endpoint untuk update zakat donation dengan payment proof.

---

### GAP #4: No Payment Upload Endpoint for Zakat
**Location:** Backend API
**Severity:** HIGH
**Missing:** `/v1/admin/zakat/donations/:id/upload-proof`

**Current Situation:**
- Donations have: `POST /v1/donations/:id/upload-proof` ✅
- Qurban have: `POST /v1/qurban/payments` ✅
- Zakat: **NO ENDPOINT** ❌

**What's Needed:**
Either:
1. Create new endpoint: `POST /v1/admin/zakat/donations/:id/upload-proof`
   OR
2. Update existing `PUT /v1/admin/zakat/donations/:id` to accept multipart form data

**Recommended:** Option 2 (use existing PUT endpoint with multipart support)

---

### GAP #5: Zakat Types Mapping Issue
**Location:** `/apps/web/src/app/checkout/page.tsx`
**Severity:** MEDIUM
**Lines:** 262-266

**Current Mapping Logic:**
```typescript
const zakatTypeMap: Record<string, string> = {};
zakatTypes.forEach((type: any) => {
  const slug = type.slug; // e.g., "zakat-fitrah"
  const shortSlug = slug.replace('zakat-', ''); // "fitrah"
  zakatTypeMap[shortSlug] = type.id;
});
```

**Problem:**
Cart stores `subType: 'income'` but mapping expects:
- `zakatData.zakatType` to be "income", "fitrah", "maal", etc.
- But slug from API is "zakat-profesi" NOT "zakat-income"

**Mismatch:**
| Cart subType | Slug in DB | Match? |
|--------------|------------|--------|
| income | zakat-profesi | ❌ NO |
| trade | zakat-perdagangan | ❌ NO |
| maal | zakat-maal | ✅ YES |
| fitrah | zakat-fitrah | ✅ YES |

**Impact:**
- Some zakat types won't find match
- Error: "Zakat type not found"

**Fix Needed:**
Standardize naming between frontend and backend OR add mapping logic.

---

## 📋 COMPREHENSIVE FIX PLAN

### Priority 1: CRITICAL FIXES (Blocking User Flow)

#### Fix 1.1: Add `zakatData` to All Zakat Calculator Cart Items
**Files to Fix:**
- `/apps/web/src/app/zakat/zakat-penghasilan/page.tsx`
- `/apps/web/src/app/zakat/zakat-bisnis/page.tsx`
- `/apps/web/src/app/zakat/zakat-fitrah/page.tsx`
- `/apps/web/src/app/zakat/zakat-maal/page.tsx`
- `/apps/web/src/app/zakat/zakat-profesi/page.tsx`
- `/apps/web/src/app/zakat/zakat-pertanian/page.tsx`
- `/apps/web/src/app/zakat/zakat-peternakan/page.tsx`

**Changes:**
```typescript
// BEFORE (zakat-penghasilan/page.tsx)
const cartItem = {
  type: 'zakat',
  subType: 'income',
  name: 'Zakat Penghasilan',
  amount: result.zakatAmount,
  quantity: 1,
  pricePerUnit: result.zakatAmount,
};

// AFTER
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
  },
};
```

**Mapping Table:**
| Page | subType | zakatType | Slug in DB |
|------|---------|-----------|------------|
| zakat-penghasilan | income | income | zakat-profesi |
| zakat-bisnis | trade | trade | zakat-perdagangan |
| zakat-fitrah | fitrah | fitrah | zakat-fitrah |
| zakat-maal | maal | maal | zakat-maal |
| zakat-profesi | profesi | profesi | zakat-profesi |

#### Fix 1.2: Update Checkout Mapping Logic
**File:** `/apps/web/src/app/checkout/page.tsx`
**Lines:** 260-266

**Add Mapping for Inconsistent Names:**
```typescript
const zakatTypeMap: Record<string, string> = {};
const zakatTypeAliases: Record<string, string> = {
  'income': 'profesi',      // income → zakat-profesi
  'trade': 'perdagangan',   // trade → zakat-perdagangan
};

zakatTypes.forEach((type: any) => {
  const slug = type.slug; // "zakat-fitrah"
  const shortSlug = slug.replace('zakat-', ''); // "fitrah"

  // Direct mapping
  zakatTypeMap[shortSlug] = type.id;

  // Reverse mapping for aliases
  Object.keys(zakatTypeAliases).forEach(alias => {
    if (zakatTypeAliases[alias] === shortSlug) {
      zakatTypeMap[alias] = type.id;
    }
  });
});
```

#### Fix 1.3: Add Zakat Handling to Payment Detail Page
**File:** `/apps/web/src/app/checkout/payment-detail/page.tsx`
**Lines:** 76-96

**Add Zakat Transaction Fetch:**
```typescript
const fetchPromises = transactionData.map(async (t) => {
  if (t.type === 'donation') {
    const response = await fetch(`${API_URL}/donations/${t.id}`);
    const data = await response.json();
    return { ...data.data, type: 'donation', program: t.program };
  } else if (t.type === 'qurban') {
    const response = await fetch(`${API_URL}/qurban/orders/${t.id}`);
    const data = await response.json();
    const order = data.data;
    return {
      id: order.id,
      type: 'qurban',
      program: t.program,
      orderNumber: order.orderNumber,
      referenceId: order.orderNumber,
      amount: order.totalAmount,
      totalAmount: order.totalAmount,
      package: order.package,
    };
  } else if (t.type === 'zakat') {
    // NEW: Handle zakat
    const response = await fetch(`${API_URL}/admin/zakat/donations/${t.id}`);
    const data = await response.json();
    return {
      id: data.data.id,
      type: 'zakat',
      program: t.program,
      referenceId: data.data.referenceId,
      amount: data.data.amount,
      totalAmount: data.data.amount,
      zakatType: {
        name: data.data.zakatTypeName || 'Zakat',
      },
    };
  }
});
```

#### Fix 1.4: Add Zakat Payment Upload Logic
**File:** `/apps/web/src/app/checkout/payment-detail/page.tsx`
**Function:** `handleConfirmPayment`

**Add to Upload Logic:**
```typescript
const uploadPromises = transactions.map(async (transaction) => {
  if (!paymentProof) return null;

  if (transaction.type === 'donation') {
    // Existing donation upload logic
  } else if (transaction.type === 'qurban') {
    // Existing qurban upload logic
  } else if (transaction.type === 'zakat') {
    // NEW: Zakat upload logic
    const formData = new FormData();
    formData.append('paymentReference', `/uploads/${Date.now()}-${paymentProof.name}`);
    formData.append('paymentStatus', 'pending'); // Will be verified by admin

    // If backend supports multipart:
    formData.append('file', paymentProof);

    const response = await fetch(
      `${API_URL}/admin/zakat/donations/${transaction.id}`,
      {
        method: 'PUT',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload zakat payment proof');
    }

    return await response.json();
  }
});
```

### Priority 2: BACKEND FIXES (Support Frontend Changes)

#### Fix 2.1: Update Zakat Donations PUT Endpoint to Accept File Upload
**File:** `/apps/api/src/routes/admin/zakat-donations.ts`
**Function:** `PUT /:id`

**Add Multipart Support:**
```typescript
app.put("/:id", async (c) => {
  const db = c.get("db");
  const { id } = c.req.param();

  // Check content type
  const contentType = c.req.header("content-type");
  let body: any;
  let paymentProofUrl: string | null = null;

  if (contentType?.includes("multipart/form-data")) {
    // Handle file upload (SAME AS QURBAN)
    const parsedBody = await c.req.parseBody();
    const file = parsedBody.file as File;

    if (file) {
      // Validate file
      const allowedTypes = ["image/", "application/pdf"];
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        return c.json({ error: "Only image and PDF files are allowed" }, 400);
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return c.json({ error: "File size must be less than 5MB" }, 400);
      }

      // Upload file (filesystem)
      const sanitizedName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '-');
      const finalFilename = `${Date.now()}-${sanitizedName}`;
      const path = `/uploads/${finalFilename}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadsDir = pathModule.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(pathModule.join(uploadsDir, finalFilename), buffer);

      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      global.uploadedFiles.set(finalFilename, buffer);

      // Save to media table
      await db.insert(media).values({
        filename: finalFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: path,
        path: path,
        folder: "uploads",
        category: "zakat_payment",
      });

      paymentProofUrl = path;
    }

    // Extract other fields
    body = {
      paymentStatus: parsedBody.paymentStatus as string,
      paymentReference: paymentProofUrl,
      // ... other fields
    };
  } else {
    // Handle JSON request
    body = await c.req.json();
  }

  // Update donation
  const updated = await db
    .update(zakatDonations)
    .set({
      paymentStatus: body.paymentStatus ?? existing[0].paymentStatus,
      paymentReference: body.paymentReference ?? existing[0].paymentReference,
      updatedAt: new Date(),
    })
    .where(eq(zakatDonations.id, id))
    .returning();

  return c.json({ success: true, data: updated[0] });
});
```

#### Fix 2.2: Add Missing Imports to zakat-donations.ts
```typescript
import * as fs from "fs";
import * as pathModule from "path";
import { media } from "@bantuanku/db";
```

### Priority 3: TESTING & VALIDATION

#### Test Case 1: Zakat Penghasilan E2E Flow
1. [ ] Buka `/zakat/zakat-penghasilan`
2. [ ] Input: Gaji 10jt, Penghasilan lain 2jt, Pengeluaran 3jt
3. [ ] Klik "Hitung Zakat"
4. [ ] Verify hasil: Rp 225.000
5. [ ] Klik "Bayar Zakat"
6. [ ] Verify cart: item memiliki `zakatData` field ✅
7. [ ] Checkout
8. [ ] Verify: POST /admin/zakat/donations success ✅
9. [ ] Verify redirect ke /checkout/payment-detail ✅
10. [ ] Verify: zakat transaction ditampilkan ✅
11. [ ] Upload bukti transfer
12. [ ] Klik "Konfirmasi Pembayaran"
13. [ ] Verify: file uploaded ✅
14. [ ] Verify: payment_reference updated ✅

#### Test Case 2: Mixed Cart (Donation + Zakat + Qurban)
1. [ ] Add campaign donation to cart
2. [ ] Add zakat fitrah to cart
3. [ ] Add qurban package to cart
4. [ ] Checkout
5. [ ] Verify: All 3 items created ✅
6. [ ] Verify redirect to payment-detail ✅
7. [ ] Verify: All 3 transactions displayed ✅
8. [ ] Upload proof
9. [ ] Verify: All 3 updated ✅

---

## 🎯 IMPLEMENTATION ORDER

### Phase 1: Fix Cart Items (Day 1)
1. Update all 7 zakat calculator pages
2. Add `zakatData` field to cart items
3. Test: cart items have correct structure

### Phase 2: Fix Checkout Mapping (Day 1)
1. Update checkout/page.tsx mapping logic
2. Handle name aliases (income→profesi, trade→perdagangan)
3. Test: checkout creates zakat donations successfully

### Phase 3: Fix Payment Detail (Day 2)
1. Add zakat transaction fetch logic
2. Add zakat upload logic
3. Test: payment detail displays zakat transactions

### Phase 4: Fix Backend Upload (Day 2)
1. Update PUT /admin/zakat/donations/:id
2. Add multipart form-data support
3. Add file upload logic (same as qurban)
4. Test: file upload works

### Phase 5: E2E Testing (Day 3)
1. Test each zakat type individually
2. Test mixed carts
3. Test payment upload
4. Test admin verification
5. Test ledger entries

---

## ⚠️ RISKS & CONSIDERATIONS

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Only modify zakat-related files
- Don't touch donation or qurban flows
- Test existing flows after changes

### Risk 2: Database Migration Needed
**Status:** NOT REQUIRED
- Schema already supports all needed fields
- No new tables/columns needed

### Risk 3: API Changes Breaking Mobile App
**Status:** LOW RISK
- Only modifying existing PUT endpoint to accept multipart
- JSON format still supported (backward compatible)

### Risk 4: Timezone Issues
**Status:** ALREADY HANDLED
- All timestamps use WIB
- No changes needed

---

## ✅ SUCCESS CRITERIA

### User Flow Success:
- [ ] User dapat menghitung zakat
- [ ] User dapat add to cart
- [ ] User dapat checkout (create zakat donation)
- [ ] User redirect ke payment-detail
- [ ] User dapat melihat detail transaksi zakat
- [ ] User dapat upload bukti pembayaran
- [ ] Bukti tersimpan di database
- [ ] Admin dapat verify payment

### Technical Success:
- [ ] No errors in console
- [ ] All API calls return 200/201
- [ ] Data tersimpan di zakat_donations table
- [ ] File tersimpan di uploads/ folder
- [ ] payment_reference updated correctly
- [ ] Ledger entry created saat verify

### Business Success:
- [ ] Complete audit trail (calculator → donation → payment → ledger)
- [ ] Transparent reporting
- [ ] Admin can track all zakat donations
- [ ] Users can see transaction history

---

**Next Steps:**
1. Review this plan with team
2. Get approval
3. Implement Phase 1 (fix cart items)
4. Test before moving to next phase
5. Deploy incrementally

**Last Updated:** 2026-01-31
**Author:** Claude Code
