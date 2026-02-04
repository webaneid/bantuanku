# PERENCANAAN PERBAIKAN ALUR QURBAN - BANTUANKU

**Dibuat**: 31 Januari 2026
**Status**: Planning Phase
**Tujuan**: Menyesuaikan implementasi frontend/backend qurban dengan SOP yang terdokumentasi

---

## 📋 EXECUTIVE SUMMARY

Berdasarkan analisis mendalam terhadap dokumentasi qurban ([dokumentasi-qurban.md](dokumentasi-qurban.md)) dan implementasi aktual di frontend/backend, ditemukan **12 gap** antara SOP terdokumentasi dengan implementasi, termasuk **1 URGENT timezone issue** yang baru ditemukan.

### Status Implementasi Saat Ini:
- ✅ **70% Sesuai SOP** - Core flow berjalan dengan baik
- 🚨 **URGENT: Timezone Issue** - System menggunakan UTC, harus WIB (Asia/Jakarta)
- ⚠️ **30% Gap** - Ada gap kritis terkait admin fee tracking, payment flow, dan fitur tabungan belum ada

### Gap URGENT yang Harus Diperbaiki SEKARANG:
0. **🚨 TIMEZONE ISSUE** → Order numbers salah 7 jam/hari, timestamps UTC bukan WIB

### Gap Kritis Lainnya:
1. **Admin fee tidak tersimpan di database** → Audit trail hilang
2. **Payment record tidak dibuat saat checkout** → Workflow tidak sesuai SOP
3. **Backend tidak validate admin fee** → Risk manipulasi dari frontend
4. **🔴 FITUR TABUNGAN QURBAN BELUM ADA DI FRONTEND** → Backend ready, frontend missing

---

## 🎯 GAP ANALYSIS

### GAP #0: TIMEZONE HANDLING - UTC vs WIB (URGENT 🚨)
**Severity**: 🔴 CRITICAL/URGENT
**Impact**: Order numbers salah, timestamps salah, business logic error

#### Masalah:
**ENTIRE SYSTEM MENGGUNAKAN UTC, SEHARUSNYA WIB (Asia/Jakarta GMT+7)**

1. **Order Number Generation - WRONG 7 JAM/HARI**
   - File: `/apps/api/src/routes/qurban.ts` (Line 232, 293, 343, 398, 463)
   - Code: `QBN-${new Date().getFullYear()}-${orderCount}`
   - Problem: `new Date()` returns UTC time dari Node.js

   **Skenario Bugnya**:
   ```
   Waktu: 1 Jan 2026 jam 01:00 WIB (Jakarta)
   Server UTC: 31 Des 2025 jam 18:00
   getFullYear(): 2025 ← SALAH! Harusnya 2026

   Generated: QBN-2025-00001 (WRONG)
   Expected:  QBN-2026-00001
   ```

2. **Payment Expiration Salah**
   - File: `/apps/api/src/routes/donations.ts` (Line 45-46)
   - Code: `expiredAt.setHours(expiredAt.getHours() + 24)`
   - Problem: Menambah 24 jam dari UTC time, bukan WIB
   - Impact: Expiration time tidak align dengan jam operasional Indonesia

3. **Database Timestamps - Implicit UTC**
   - All schemas: `timestamp("created_at", { precision: 3, mode: "date" })`
   - PostgreSQL: `timestamp (3)` WITHOUT `WITH TIME ZONE`
   - Storage: UTC (implicit)
   - Display: Browser timezone (varies per user)
   - No conversion logic to WIB

4. **Payment Verification Timestamp**
   - File: `/apps/api/src/routes/admin/qurban.ts` (Line 782)
   - Code: `verifiedAt: new Date()`
   - Problem: UTC timestamp, seharusnya WIB untuk konsistensi

#### Impact:
- ❌ **Order numbers SALAH** setiap hari jam 00:00-07:00 WIB (tahun kemarin)
- ❌ **Potential duplicate order numbers** saat tahun ganti
- ❌ **Payment expiration salah** (business hour mismatch)
- ❌ **Laporan harian salah cut-off** (UTC midnight vs WIB midnight)
- ❌ **Admin verification timestamps confusing** (UTC vs WIB)
- ❌ **User-facing dates wrong** (depends on browser timezone)

#### File Terdampak:
**Backend API** (143 instances of `new Date()` found):
- `/apps/api/src/routes/qurban.ts` - Order/payment/savings number generation
- `/apps/api/src/routes/donations.ts` - Payment expiration
- `/apps/api/src/routes/admin/qurban.ts` - Payment verification
- ALL routes with timestamp generation

**Database Schema** (40+ schema files):
- `/packages/db/src/schema/qurban-orders.ts`
- `/packages/db/src/schema/qurban-payments.ts`
- `/packages/db/src/schema/payment.ts`
- `/packages/db/src/schema/donation.ts`
- `/packages/db/src/schema/user.ts`
- And 35+ more schema files

**Environment**:
- No `TZ` environment variable configured
- No timezone library installed (date-fns-tz, luxon, moment-timezone)

#### Solusi:

**PHASE 0: IMMEDIATE FIX (TODAY/URGENT)**

1. **Install Timezone Library**
   ```bash
   cd apps/api
   npm install date-fns-tz
   ```

2. **Create Timezone Utility**
   - File: `/apps/api/src/utils/timezone.ts` (NEW)
   ```typescript
   import { formatInTimeZone, toDate, fromZonedTime } from 'date-fns-tz';

   const INDONESIA_TZ = 'Asia/Jakarta';

   // Get current date/time in WIB
   export function nowWIB(): Date {
     return new Date(); // Date object in WIB context
   }

   // Get current year in WIB (for order numbers)
   export function getCurrentYearWIB(): number {
     return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'yyyy'));
   }

   // Format date to WIB string
   export function formatWIB(date: Date, format: string): string {
     return formatInTimeZone(date, INDONESIA_TZ, format);
   }

   // Convert WIB date to UTC for database storage
   export function toUTC(wibDate: Date): Date {
     return fromZonedTime(wibDate, INDONESIA_TZ);
   }

   // Add hours in WIB context
   export function addHoursWIB(date: Date, hours: number): Date {
     const wibTime = toDate(date, { timeZone: INDONESIA_TZ });
     wibTime.setHours(wibTime.getHours() + hours);
     return wibTime;
   }
   ```

3. **Fix Order Number Generation**
   - File: `/apps/api/src/routes/qurban.ts`
   ```typescript
   // BEFORE (Line 232):
   const orderNumber = `QBN-${new Date().getFullYear()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;

   // AFTER:
   import { getCurrentYearWIB } from '../utils/timezone';
   const orderNumber = `QBN-${getCurrentYearWIB()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;
   ```

4. **Fix Payment Number** (Line 293)
5. **Fix Savings Number** (Line 343)
6. **Fix Savings Transaction Number** (Line 398)
7. **Fix Savings Conversion Order Number** (Line 463)

8. **Fix Payment Expiration**
   - File: `/apps/api/src/routes/donations.ts` (Line 45-46)
   ```typescript
   // BEFORE:
   const expiredAt = new Date();
   expiredAt.setHours(expiredAt.getHours() + 24);

   // AFTER:
   import { addHoursWIB } from '../utils/timezone';
   const expiredAt = addHoursWIB(new Date(), 24);
   ```

9. **Set TZ Environment Variable**
   - File: `.env` (ALL: api, web, admin, db)
   ```
   TZ=Asia/Jakarta
   ```

   - File: `Dockerfile` or deployment config
   ```dockerfile
   ENV TZ=Asia/Jakarta
   RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
   ```

**PHASE 0B: DATABASE SCHEMA UPDATE (Optional, for explicit timezone)**

1. **Update Schema Definitions** to use `WITH TIME ZONE`
   - Impact: Requires migration for all timestamp columns
   - Benefit: Explicit timezone storage (stores as timestamptz)
   - Decision: **SKIP FOR NOW** - keep implicit UTC, convert on read/write

**PHASE 0C: FRONTEND DISPLAY (Lower priority)**
1. Install date-fns-tz in web/admin
2. Add formatWIB helper
3. Display all dates in WIB to users

---

### GAP #1: Admin Fee Tidak Tersimpan di Order (CRITICAL)
**Severity**: 🔴 HIGH
**Impact**: Audit trail, reporting, transparansi biaya

#### Masalah:
- Admin fee dihitung di frontend (QurbanSidebar.tsx:40-45)
- Total amount di cart sudah include admin fee
- Tapi saat POST `/qurban/orders`, admin fee tidak dikirim
- Database `qurban_orders` tidak punya field `admin_fee`
- Order hanya simpan: `unit_price` (harga paket) dan `total_amount` (quantity × unit_price)
- **Admin fee hilang dari record order**

#### File Terdampak:
- `/packages/db/src/schema/qurban-orders.ts` - Schema
- `/apps/api/src/routes/qurban.ts` - POST /qurban/orders endpoint
- `/apps/web/src/app/checkout/page.tsx` - Checkout logic
- Database migration diperlukan

#### Solusi:
1. Tambah field `admin_fee BIGINT` di tabel `qurban_orders`
2. Update schema Drizzle
3. Backend POST /qurban/orders menerima `adminFee` dari request
4. Backend recalculate `totalAmount = (unitPrice × quantity) + adminFee`
5. Simpan admin_fee di database
6. Frontend kirim adminFee dari cart.qurbanData.adminFee

---

### GAP #2: Payment Record Tidak Dibuat Saat Checkout (CRITICAL)
**Severity**: 🔴 HIGH
**Impact**: Workflow payment tracking, status order

#### Masalah:
**SOP Dokumentasi** (dokumentasi-qurban.md:105-110):
```
5. Checkout & Buat Order
User lengkapi form checkout (/checkout)
├─ POST /qurban/orders → Buat order aktual
├─ POST /qurban/payments → Buat payment record (pending)
└─ Redirect ke halaman konfirmasi
```

**Implementasi Aktual**:
- Checkout hanya POST `/qurban/orders`
- Tidak POST `/qurban/payments`
- Payment record dibuat nanti (kapan? unclear)

#### Konsekuensi:
- Order dibuat dengan `payment_status = 'pending'`
- Tidak ada payment record tracking
- Admin tidak bisa lihat pending payments untuk qurban orders baru
- Workflow berbeda dengan dokumentasi

#### File Terdampak:
- `/apps/web/src/app/checkout/page.tsx`
- `/apps/api/src/routes/qurban.ts` - POST /qurban/payments

#### Solusi:
1. Setelah berhasil POST `/qurban/orders`, langsung POST `/qurban/payments`
2. Payment record dengan status `'pending'`
3. Payment data:
   ```json
   {
     "orderId": "order.id",
     "amount": 0,  // Belum bayar, atau DP
     "paymentMethod": "bank_transfer",
     "paymentDate": "NOW()",
     "status": "pending",
     "notes": "Initial payment record for order QBN-YYYY-XXXXX"
   }
   ```
4. Atau: Skip initial payment record, create only when user uploads bukti
   - **Pilihan ini lebih make sense**
   - Payment record baru dibuat ketika user upload bukti
   - Order tetap `payment_status = 'pending'` sampai ada payment verified

**Rekomendasi**: **Pilih opsi #4** - Jangan buat payment record di checkout, buat hanya saat user upload bukti. Update dokumentasi untuk reflect ini.

---

### GAP #3: Backend Tidak Validate/Recalculate Admin Fee (HIGH)
**Severity**: 🟠 MEDIUM-HIGH
**Impact**: Security, data integrity

#### Masalah:
- Admin fee dihitung 100% di frontend
- Frontend kirim `totalAmount` yang sudah include admin fee
- Backend terima `totalAmount` tanpa validate
- **User bisa manipulasi admin fee** via browser DevTools sebelum checkout

#### Skenario Attack:
```javascript
// User edit cart di localStorage
const cart = JSON.parse(localStorage.getItem('bantuanku_cart'));
cart[0].qurbanData.adminFee = 0;  // Hapus admin fee
cart[0].amount = 5000000;  // Total tanpa admin fee
localStorage.setItem('bantuanku_cart', JSON.stringify(cart));
// Checkout → Backend terima totalAmount = 5000000 (no fee)
```

#### File Terdampak:
- `/apps/api/src/routes/qurban.ts` - POST /qurban/orders (Line ~150-250)

#### Solusi:
1. Backend fetch package detail: `qurbanPackages.findFirst({ where: eq(id, packageId) })`
2. Backend fetch settings: `amil_qurban_sapi_fee` atau `amil_qurban_perekor_fee`
3. Backend calculate expected admin fee:
   ```javascript
   const adminFee = pkg.animalType === 'cow'
     ? settings.amil_qurban_sapi_fee
     : settings.amil_qurban_perekor_fee;
   ```
4. Backend calculate expected total:
   ```javascript
   const expectedTotal = (pkg.price * quantity) + adminFee;
   ```
5. Validate request.totalAmount === expectedTotal
6. Jika tidak match, reject dengan error
7. Save calculated adminFee to database (see Gap #1)

---

### GAP #4: Period Validation Tidak Ada (MEDIUM)
**Severity**: 🟡 MEDIUM
**Impact**: Data consistency

#### Masalah:
**QurbanSidebar.tsx** punya period dropdown (Lines 107-125):
- User bisa ganti periode
- Tidak ada validasi bahwa package belongs to selected period
- Risk: User pilih Package A (period 2025) tapi select Period 2026

#### File Terdampak:
- `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx`

#### Solusi:
**Opsi 1: Disable Period Selection**
- Package sudah tied to 1 period
- Dropdown tidak perlu, tampilkan period sebagai read-only info
- Paling simple

**Opsi 2: Validate on Change**
- Ketika user ganti period, fetch `/qurban/packages/${packageId}`
- Check if package.periodId === selectedPeriodId
- Jika tidak match, show error + reset to original period

**Rekomendasi**: **Opsi 1** - Remove period dropdown, show as info only.

---

### GAP #5: Navigation "Cari Paket Qurban Lain" Salah (LOW)
**Severity**: 🟢 LOW
**Impact**: User experience

#### Masalah:
**QurbanConfirmModal.tsx** (Line 212):
```typescript
<button onClick={() => router.push('/')}>
  Cari Paket Qurban Lain
</button>
```

Navigasi ke homepage `/` bukan ke katalog qurban `/qurban`.

#### File Terdampak:
- `/apps/web/src/app/qurban/[id]/QurbanConfirmModal.tsx`

#### Solusi:
```typescript
<button onClick={() => router.push('/qurban')}>
  Cari Paket Qurban Lain
</button>
```

---

### GAP #6: Error Handling Settings Loading (MEDIUM)
**Severity**: 🟡 MEDIUM
**Impact**: User experience, bug prevention

#### Masalah:
**Detail Page** (page.tsx:76-85):
- Fetch settings untuk admin fee
- Jika fetch gagal, settings = undefined
- QurbanSidebar terima adminFeeCow/adminFeeGoat sebagai props
- Jika undefined → adminFee = 0 (silent failure)
- User bayar tanpa admin fee

#### File Terdampak:
- `/apps/web/src/app/qurban/[id]/page.tsx`
- `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx`

#### Solusi:
1. Default fallback values untuk admin fee:
   ```typescript
   const adminFeeCow = settings?.amil_qurban_sapi_fee ?? 50000;
   const adminFeeGoat = settings?.amil_qurban_perekor_fee ?? 25000;
   ```
2. Log warning jika settings tidak load:
   ```typescript
   if (!settings) {
     console.warn('Settings not loaded, using default admin fees');
   }
   ```
3. Atau: Block order jika settings tidak load (terlalu strict)

**Rekomendasi**: Fallback dengan default values + warning log.

---

### GAP #7: Payment Date Handling Unclear (LOW)
**Severity**: 🟢 LOW
**Impact**: Documentation clarity

#### Masalah:
API endpoint `POST /qurban/payments` expects `paymentDate` dari client (qurban.ts:296-314).

Tapi unclear:
- Apakah client harus kirim `paymentDate`?
- Atau server set `paymentDate = NOW()`?
- Dokumentasi tidak jelas

#### File Terdampak:
- `/apps/api/src/routes/qurban.ts`
- Dokumentasi API

#### Solusi:
**Best Practice**: Server-side timestamp
```javascript
paymentDate: body.paymentDate || new Date(),  // Fallback to NOW()
```

Atau enforce server-side only:
```javascript
paymentDate: new Date(),  // Ignore client timestamp
```

**Rekomendasi**: Server-side timestamp only untuk consistency.

---

### GAP #8: Admin Fee Multiplication Logic Unclear (LOW)
**Severity**: 🟢 LOW
**Impact**: Documentation clarity

#### Masalah:
**QurbanSidebar.tsx** (Line 44):
```typescript
const totalAdminFee = adminFee * quantity;
```

Untuk individual packages (quantity > 1):
- User order 3 kambing → admin fee × 3
- Apakah ini benar?

**Dokumentasi tidak specify** apakah admin fee:
- Per order (fixed)
- Per hewan (multiply by quantity)

#### Saat Ini:
- Individual: adminFee × quantity ✓ (reasonable)
- Shared: adminFee × 1 ✓ (always 1)

#### Solusi:
Dokumentasikan dengan jelas di SOP:
```
Admin Fee Calculation:
- Individual Package: adminFee × quantity
  Example: 3 kambing → Rp 25.000 × 3 = Rp 75.000
- Shared Package: adminFee × 1 (fixed)
  Example: 1 slot sapi → Rp 50.000 × 1 = Rp 50.000
```

---

### GAP #9: Availability Calculation (INFORMATIONAL)
**Severity**: ℹ️ INFO
**Impact**: None (working correctly)

#### Current Implementation:
**QurbanSidebar.tsx** (Lines 47-50):
```typescript
const isAvailable = qurbanPackage.packageType === 'individual'
  ? qurbanPackage.stock > qurbanPackage.stockSold
  : qurbanPackage.availableSlots > 0;
```

**Status**: ✅ Correct, follows documentation

`availableSlots` dihitung di backend (SQL query) dan sudah include logic shared groups.

No action needed.

---

### GAP #10: Extra Field `periodName` di Cart (INFORMATIONAL)
**Severity**: ℹ️ INFO
**Impact**: None (actually helpful)

#### Dokumentasi Says:
```typescript
qurbanData: {
  packageId, periodId, quantity, animalType,
  packageType, price, adminFee
}
```

#### Implementasi Adds:
```typescript
qurbanData: {
  ...,
  periodName: string  // EXTRA field
}
```

**Status**: ✅ Acceptable enhancement
**Benefit**: Display-friendly period name in cart/checkout

No action needed, update documentation to include `periodName` as optional field.

---

### GAP #11: Fitur Tabungan Qurban Belum Ada di Frontend (CRITICAL)
**Severity**: 🔴 HIGH
**Impact**: Missing major feature, user tidak bisa menabung untuk qurban

#### Masalah:
**Backend API sudah complete untuk tabungan qurban, tapi frontend belum ada sama sekali**

**Backend Ready** (dokumentasi-qurban.md:576-675):
- ✅ `POST /qurban/savings` - Buat tabungan
- ✅ `POST /qurban/savings/:id/deposit` - Setor tabungan
- ✅ `POST /admin/qurban-savings/:savingsId/transactions/:txId/verify` - Verifikasi setoran
- ✅ `POST /admin/qurban-savings/:id/convert` - Convert ke order
- ✅ Database: `qurban_savings`, `qurban_savings_transactions`
- ✅ Auto-complete ketika target tercapai

**Frontend Missing**:
- ❌ Tidak ada halaman `/qurban/savings`
- ❌ Tidak ada UI untuk buat tabungan
- ❌ Tidak ada tracking progress tabungan
- ❌ Tidak ada UI untuk setor/deposit
- ❌ User tidak bisa akses fitur tabungan sama sekali

#### Konsekuensi:
- Fitur tabungan qurban tidak bisa digunakan user
- Backend API idle (sudah ada tapi tidak terpakai)
- Missing revenue opportunity (user yang ingin nabung tapi belum mampu bayar penuh)
- Dokumentasi tidak sync dengan implementasi

#### File yang Perlu Dibuat:
**Frontend Pages**:
- `/apps/web/src/app/qurban/savings/page.tsx` - List tabungan user
- `/apps/web/src/app/qurban/savings/new/page.tsx` - Buat tabungan baru
- `/apps/web/src/app/qurban/savings/[id]/page.tsx` - Detail tabungan & deposit

**Frontend Components**:
- `/apps/web/src/app/qurban/savings/SavingsCard.tsx` - Card component
- `/apps/web/src/app/qurban/savings/DepositForm.tsx` - Form setor
- `/apps/web/src/app/qurban/savings/ProgressBar.tsx` - Progress indicator

**Services**:
- `/apps/web/src/services/qurban-savings.ts` - API client

#### Solusi:

**Phase 1: Basic Tabungan UI (Week 1)**
1. Create page `/qurban/savings` - List all savings
   - Fetch `GET /qurban/savings?userId={userId}`
   - Display cards: savings number, target, progress, status
   - Button "Buat Tabungan Baru"

2. Create page `/qurban/savings/new` - Create new savings
   - Form: pilih package, target amount, installment plan
   - POST `/qurban/savings`
   - Redirect ke detail page

3. Create page `/qurban/savings/[id]` - Detail & deposit
   - Show progress: currentAmount / targetAmount
   - List transactions (verified, pending, rejected)
   - Form deposit: amount, upload bukti
   - POST `/qurban/savings/:id/deposit`

**Phase 2: Admin Integration (Week 2)**
4. Admin verification UI (already exists in backend)
   - Admin dashboard list pending deposits
   - Verify/reject buttons
   - Updates savings progress

**Phase 3: Navigation Integration (Week 2)**
5. Add "Tabungan Qurban" to navigation menu
6. Add CTA button di qurban detail page: "Nabung untuk paket ini"
7. Link from savings detail to convert when complete

#### UI/UX Flow:

```
User Flow:
1. Browse qurban packages → See "Nabung" button
2. Click "Nabung" → Form: target amount, installment plan
3. Create savings → Success, redirect to savings detail
4. Savings detail → Show progress 0%, button "Setor"
5. Click "Setor" → Form: amount, upload bukti
6. Submit deposit → Status "Menunggu Verifikasi"
7. Admin verify → Progress updated (e.g., 10%, 20%...)
8. Repeat until 100% → Status "Selesai, siap dikonversi"
9. Admin convert → Order created, payment_status = 'paid'
```

#### File Terdampak:
- `/apps/web/src/app/qurban/savings/**/*` (NEW - entire folder)
- `/apps/web/src/services/qurban-savings.ts` (NEW)
- `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx` (ADD button "Nabung")
- Navigation menu (ADD link "Tabungan Saya")

#### Effort Estimation:
- Page `/qurban/savings`: 4 hours
- Page `/qurban/savings/new`: 3 hours
- Page `/qurban/savings/[id]`: 5 hours
- Components (Card, Form, Progress): 3 hours
- Services & API integration: 2 hours
- Navigation & linking: 1 hour
- Testing: 2 hours
- **Total**: ~20 hours (2.5 days)

---

## 📊 PRIORITY MATRIX

| Gap # | Issue | Severity | Effort | Priority |
|-------|-------|----------|--------|----------|
| **#0** | **🚨 TIMEZONE - UTC vs WIB** | **CRITICAL** | **Medium** | **🚨 URGENT** |
| #1 | Admin fee tidak tersimpan | HIGH | Medium | 🔴 P0 |
| #2 | Payment record timing | HIGH | Low | 🔴 P0 |
| #3 | Backend tidak validate fee | MEDIUM-HIGH | Medium | 🟠 P1 |
| #4 | Period validation | MEDIUM | Low | 🟡 P2 |
| #5 | Navigation salah | LOW | Very Low | 🟢 P3 |
| #6 | Error handling settings | MEDIUM | Low | 🟡 P2 |
| #7 | Payment date unclear | LOW | Very Low | 🟢 P3 |
| #8 | Admin fee multiplication | LOW | Very Low | 🟢 P3 |
| #9 | Availability calc | INFO | N/A | ℹ️ N/A |
| #10 | Extra periodName field | INFO | N/A | ℹ️ N/A |
| **#11** | **Fitur Tabungan belum ada di frontend** | **HIGH** | **High (20h)** | **🔴 P0** |

---

## 🛠️ IMPLEMENTATION PLAN

### PHASE 0: URGENT Timezone Fix (SEKARANG/HARI INI)

#### Task 0.1: Install Timezone Library
**Estimated Time**: 5 minutes

**Steps**:
```bash
cd apps/api
npm install date-fns-tz
```

**Files Changed**:
- `/apps/api/package.json` (dependencies)

---

#### Task 0.2: Create Timezone Utility
**Estimated Time**: 30 minutes

**Steps**:
1. Create file: `/apps/api/src/utils/timezone.ts`

```typescript
import { formatInTimeZone, toDate, fromZonedTime } from 'date-fns-tz';

const INDONESIA_TZ = 'Asia/Jakarta';

/**
 * Get current year in WIB timezone
 * Use for order/payment/savings number generation
 */
export function getCurrentYearWIB(): number {
  return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'yyyy'));
}

/**
 * Get current month in WIB timezone (1-12)
 */
export function getCurrentMonthWIB(): number {
  return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'M'));
}

/**
 * Get current date in WIB timezone
 */
export function getCurrentDateWIB(): number {
  return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'd'));
}

/**
 * Format date to WIB string
 */
export function formatWIB(date: Date, format: string): string {
  return formatInTimeZone(date, INDONESIA_TZ, format);
}

/**
 * Convert WIB date to UTC for database storage
 */
export function toUTC(wibDate: Date): Date {
  return fromZonedTime(wibDate, INDONESIA_TZ);
}

/**
 * Add hours in WIB context
 * Use for payment expiration, etc.
 */
export function addHoursWIB(date: Date, hours: number): Date {
  const wibTime = toDate(date, { timeZone: INDONESIA_TZ });
  wibTime.setHours(wibTime.getHours() + hours);
  return wibTime;
}

/**
 * Get current timestamp in WIB
 * Returns Date object representing current time in WIB
 */
export function nowWIB(): Date {
  return toDate(new Date(), { timeZone: INDONESIA_TZ });
}
```

**Files Changed**:
- `/apps/api/src/utils/timezone.ts` (NEW)

---

#### Task 0.3: Fix Order Number Generation (CRITICAL)
**Estimated Time**: 15 minutes

**Steps**:
1. Update `/apps/api/src/routes/qurban.ts`

**Line 232 - Order Number**:
```typescript
// BEFORE:
const orderNumber = `QBN-${new Date().getFullYear()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;

// AFTER:
import { getCurrentYearWIB } from '../utils/timezone';
const orderNumber = `QBN-${getCurrentYearWIB()}-${String(Number(orderCount[0].count) + 1).padStart(5, "0")}`;
```

**Line 293 - Payment Number**:
```typescript
// BEFORE:
const paymentNumber = `PAY-QBN-${new Date().getFullYear()}-${String(Number(paymentCount[0].count) + 1).padStart(5, "0")}`;

// AFTER:
import { getCurrentYearWIB } from '../utils/timezone';
const paymentNumber = `PAY-QBN-${getCurrentYearWIB()}-${String(Number(paymentCount[0].count) + 1).padStart(5, "0")}`;
```

**Line 343 - Savings Number**:
```typescript
// BEFORE:
const savingsNumber = `SAV-QBN-${new Date().getFullYear()}-${String(Number(savingsCount[0].count) + 1).padStart(5, "0")}`;

// AFTER:
import { getCurrentYearWIB } from '../utils/timezone';
const savingsNumber = `SAV-QBN-${getCurrentYearWIB()}-${String(Number(savingsCount[0].count) + 1).padStart(5, "0")}`;
```

**Line 398 - Savings Transaction Number**:
```typescript
// BEFORE:
const transactionNumber = `TRX-SAV-QBN-${new Date().getFullYear()}-${String(Number(transactionCount[0].count) + 1).padStart(5, "0")}`;

// AFTER:
import { getCurrentYearWIB } from '../utils/timezone';
const transactionNumber = `TRX-SAV-QBN-${getCurrentYearWIB()}-${String(Number(transactionCount[0].count) + 1).padStart(5, "0")}`;
```

**Line 463 - Savings Conversion Order Number** (calls order creation, already fixed above)

**Files Changed**:
- `/apps/api/src/routes/qurban.ts` (5 locations)

---

#### Task 0.4: Fix Payment Expiration Calculation
**Estimated Time**: 10 minutes

**Steps**:
1. Update `/apps/api/src/routes/donations.ts` (Line 45-46)

```typescript
// BEFORE:
const expiredAt = new Date();
expiredAt.setHours(expiredAt.getHours() + 24);

// AFTER:
import { addHoursWIB } from '../utils/timezone';
const expiredAt = addHoursWIB(new Date(), 24);
```

**Files Changed**:
- `/apps/api/src/routes/donations.ts`

---

#### Task 0.5: Set TZ Environment Variable
**Estimated Time**: 10 minutes

**Steps**:
1. Update all `.env` files:

**`.env` (root)**:
```
TZ=Asia/Jakarta
```

**`apps/api/.env`**:
```
TZ=Asia/Jakarta
```

**`apps/web/.env.local`**:
```
TZ=Asia/Jakarta
```

**`apps/admin/.env.local`**:
```
TZ=Asia/Jakarta
```

2. Update deployment configs if using Docker:

**`Dockerfile`** (if exists):
```dockerfile
ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

**`docker-compose.yml`** (if exists):
```yaml
environment:
  - TZ=Asia/Jakarta
```

**Files Changed**:
- `.env` files
- Deployment configs

---

#### Task 0.6: Testing Timezone Fix
**Estimated Time**: 30 minutes

**Test Case 1: Order Number at Midnight**
1. Set server time to 2026-01-01 00:30 WIB (manually or via date mock)
2. Create qurban order
3. Expected: Order number = `QBN-2026-00001`
4. Verify order number uses WIB year, not UTC year

**Test Case 2: Order Number Before 7 AM**
1. Set server time to 2026-01-01 06:00 WIB (23:00 UTC previous day)
2. Create qurban order
3. Expected: Order number = `QBN-2026-00002`
4. NOT `QBN-2025-XXXXX`

**Test Case 3: Payment Expiration**
1. Create donation at 23:00 WIB
2. Check expiredAt timestamp
3. Expected: Next day 23:00 WIB (24 hours later in WIB)
4. NOT affected by UTC day boundary

---

### PHASE 1: Critical Fixes (P0) - Week 1

#### Task 1.1: Tambah Admin Fee Field ke Database
**Estimated Time**: 2 hours

**Steps**:
1. Create migration file: `032_add_admin_fee_to_qurban_orders.sql`
   ```sql
   ALTER TABLE qurban_orders
   ADD COLUMN admin_fee BIGINT DEFAULT 0 NOT NULL;

   COMMENT ON COLUMN qurban_orders.admin_fee IS 'Admin fee charged at time of order';
   ```

2. Update schema: `/packages/db/src/schema/qurban-orders.ts`
   ```typescript
   export const qurbanOrders = pgTable("qurban_orders", {
     // ... existing fields
     adminFee: bigint("admin_fee", { mode: "number" }).default(0).notNull(),
     // ... rest
   });
   ```

3. Run migration:
   ```bash
   cd packages/db
   npm run migrate:qurban-admin-fee
   ```

4. Update types: `QurbanOrder` type auto-updated by Drizzle

**Files Changed**:
- `/packages/db/migrations/032_add_admin_fee_to_qurban_orders.sql` (NEW)
- `/packages/db/src/schema/qurban-orders.ts` (EDIT)
- `/packages/db/package.json` (ADD script)

---

#### Task 1.2: Update Backend API to Accept & Validate Admin Fee
**Estimated Time**: 3 hours

**Steps**:
1. Update POST `/qurban/orders` endpoint
   **File**: `/apps/api/src/routes/qurban.ts` (~Line 150-250)

2. Add to request validation:
   ```typescript
   const {
     packageId,
     donorName,
     quantity,
     adminFee,  // NEW: Accept from frontend
     // ... other fields
   } = body;
   ```

3. Fetch package & settings:
   ```typescript
   const pkg = await db.query.qurbanPackages.findFirst({
     where: eq(qurbanPackages.id, packageId)
   });

   const settingsResult = await db.query.settings.findMany();
   const settings = settingsResult.reduce((acc, s) => {
     acc[s.key] = s.value;
     return acc;
   }, {});
   ```

4. Calculate expected admin fee:
   ```typescript
   const expectedAdminFee = pkg.animalType === 'cow'
     ? parseInt(settings.amil_qurban_sapi_fee || '50000')
     : parseInt(settings.amil_qurban_perekor_fee || '25000');

   // For individual packages, multiply by quantity
   const totalExpectedAdminFee = pkg.packageType === 'individual'
     ? expectedAdminFee * quantity
     : expectedAdminFee;
   ```

5. Validate admin fee from request:
   ```typescript
   if (adminFee !== totalExpectedAdminFee) {
     return c.json({
       error: `Invalid admin fee. Expected: ${totalExpectedAdminFee}, Received: ${adminFee}`
     }, 400);
   }
   ```

6. Recalculate total amount:
   ```typescript
   const unitPrice = pkg.price;
   const subtotal = unitPrice * quantity;
   const totalAmount = subtotal + adminFee;  // Include validated admin fee
   ```

7. Save to database:
   ```typescript
   const newOrder = await db.insert(qurbanOrders).values({
     // ... existing fields
     unitPrice,
     totalAmount,
     adminFee,  // NEW: Save admin fee
     // ... rest
   }).returning();
   ```

**Files Changed**:
- `/apps/api/src/routes/qurban.ts` (EDIT)

---

#### Task 1.3: Update Frontend Checkout to Send Admin Fee
**Estimated Time**: 2 hours

**Steps**:
1. Update checkout page
   **File**: `/apps/web/src/app/checkout/page.tsx` (~Line 316-358)

2. Extract admin fee from cart:
   ```typescript
   const qurbanPromises = qurbanItems.map(async (item) => {
     const orderData = {
       packageId: item.qurbanData.packageId,
       quantity: item.qurbanData.quantity,
       adminFee: item.qurbanData.adminFee,  // NEW: Send admin fee
       donorName: formData.name.trim(),
       // ... other fields
     };

     const response = await fetch(`${API_URL}/qurban/orders`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(orderData),
     });
     // ... handle response
   });
   ```

**Files Changed**:
- `/apps/web/src/app/checkout/page.tsx` (EDIT)

**Testing**:
1. Add qurban to cart with adminFee
2. Go to checkout
3. Complete checkout
4. Verify database: `qurban_orders.admin_fee` has correct value
5. Verify backend validated adminFee (try manipulating in DevTools)

---

#### Task 1.4: Clarify Payment Record Creation Flow
**Estimated Time**: 1 hour

**Decision**:
- **Do NOT create payment record at checkout**
- Payment record only created when user uploads payment proof
- Update documentation to reflect this

**Steps**:
1. Update dokumentasi-qurban.md
   **Section**: "Alur Order Qurban" (Line 105-110)

   **Before**:
   ```
   5. Checkout & Buat Order
   ├─ POST /qurban/orders → Buat order aktual
   ├─ POST /qurban/payments → Buat payment record (pending)
   └─ Redirect ke halaman konfirmasi
   ```

   **After**:
   ```
   5. Checkout & Buat Order
   ├─ POST /qurban/orders → Buat order aktual
   └─ Redirect ke halaman konfirmasi order

   6. Upload Bukti Pembayaran (Nanti)
   ├─ User upload bukti transfer
   ├─ POST /qurban/payments → Buat payment record (pending verification)
   └─ Admin verify/reject
   ```

2. No code changes needed
3. Update flow diagram di dokumentasi

**Files Changed**:
- `/dokumentasi-qurban.md` (EDIT)

---

### PHASE 2: Important Fixes (P1) - Week 2

#### Task 2.1: Add Admin Fee Validation in Backend
**Estimated Time**: 3 hours

Already covered in Task 1.2 above.

---

### PHASE 3: Nice-to-Have Fixes (P2-P3) - Week 3

#### Task 3.1: Fix Period Selection in Sidebar
**Estimated Time**: 1 hour

**Decision**: Remove period dropdown, show as read-only info

**Steps**:
1. Update QurbanSidebar.tsx
   **File**: `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx`

2. Replace period dropdown (Lines 107-125) with read-only display:
   ```typescript
   {/* Period Info - Read Only */}
   <div className="mb-4">
     <label className="block text-sm font-medium text-gray-700 mb-2">
       Periode Qurban
     </label>
     <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
       <p className="text-sm font-medium text-gray-900">
         {selectedPeriod?.name || 'Periode tidak tersedia'}
       </p>
       <p className="text-xs text-gray-500 mt-1">
         Penyembelihan: {selectedPeriod?.executionDate
           ? new Date(selectedPeriod.executionDate).toLocaleDateString('id-ID')
           : '-'}
       </p>
     </div>
   </div>
   ```

3. Remove `selectedPeriod` state and dropdown handler

**Files Changed**:
- `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx` (EDIT)

---

#### Task 3.2: Fix Navigation Button
**Estimated Time**: 5 minutes

**Steps**:
1. Update QurbanConfirmModal.tsx
   **File**: `/apps/web/src/app/qurban/[id]/QurbanConfirmModal.tsx` (Line 212)

2. Change:
   ```typescript
   // Before
   onClick={() => router.push('/')}

   // After
   onClick={() => router.push('/qurban')}
   ```

**Files Changed**:
- `/apps/web/src/app/qurban/[id]/QurbanConfirmModal.tsx` (EDIT)

---

#### Task 3.3: Add Error Handling for Settings
**Estimated Time**: 1 hour

**Steps**:
1. Update detail page
   **File**: `/apps/web/src/app/qurban/[id]/page.tsx` (Lines 76-85)

2. Add fallback values:
   ```typescript
   // Fetch settings with fallback
   let adminFeeCow = 50000;  // Default fallback
   let adminFeeGoat = 25000; // Default fallback

   try {
     const settingsResponse = await fetch(`${API_URL}/settings`);
     if (settingsResponse.ok) {
       const settingsData = await settingsResponse.json();
       adminFeeCow = settingsData.amil_qurban_sapi_fee || 50000;
       adminFeeGoat = settingsData.amil_qurban_perekor_fee || 25000;
     } else {
       console.warn('Failed to load settings, using defaults');
     }
   } catch (error) {
     console.error('Error loading settings:', error);
     console.warn('Using default admin fees');
   }
   ```

**Files Changed**:
- `/apps/web/src/app/qurban/[id]/page.tsx` (EDIT)

---

#### Task 3.4: Clarify Payment Date Handling
**Estimated Time**: 30 minutes

**Steps**:
1. Update backend to use server-side timestamp
   **File**: `/apps/api/src/routes/qurban.ts` (POST /qurban/payments endpoint)

2. Change:
   ```typescript
   // Before
   paymentDate: body.paymentDate,

   // After
   paymentDate: new Date(),  // Always server-side timestamp
   ```

3. Update API documentation

**Files Changed**:
- `/apps/api/src/routes/qurban.ts` (EDIT)
- API documentation (EDIT)

---

#### Task 3.5: Document Admin Fee Multiplication Logic
**Estimated Time**: 15 minutes

**Steps**:
1. Update dokumentasi-qurban.md
2. Add section "Admin Fee Calculation Rules"
3. Clarify:
   ```
   ### Admin Fee Calculation

   **Individual Packages**:
   - Admin fee dikalikan dengan quantity
   - Formula: `adminFee × quantity`
   - Example: 3 kambing → Rp 25.000 × 3 = Rp 75.000

   **Shared Packages**:
   - Admin fee tetap (tidak dikalikan)
   - Formula: `adminFee × 1`
   - Example: 1 slot sapi → Rp 50.000 × 1 = Rp 50.000

   **Alasan**:
   - Individual: User beli beberapa hewan → admin handling banyak
   - Shared: User beli 1 slot (quantity selalu 1) → admin handling 1x
   ```

**Files Changed**:
- `/dokumentasi-qurban.md` (EDIT)

---

#### Task 3.6: Update Documentation for periodName Field
**Estimated Time**: 10 minutes

**Steps**:
1. Update dokumentasi-qurban.md
2. Section "Cart Integration" (Line 1413-1426)
3. Add `periodName` to documented structure:
   ```typescript
   qurbanData: {
     packageId: string,
     periodId: string,
     periodName: string,  // NEW: For display purposes
     quantity: number,
     animalType: 'cow' | 'goat',
     packageType: 'individual' | 'shared',
     price: number,
     adminFee: number
   }
   ```

**Files Changed**:
- `/dokumentasi-qurban.md` (EDIT)

---

### PHASE 4: Fitur Tabungan Qurban Frontend (Week 3-4)

#### Task 4.1: Create Tabungan Service Layer
**Estimated Time**: 2 hours

**Steps**:
1. Create file: `/apps/web/src/services/qurban-savings.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface QurbanSavings {
  id: string;
  savingsNumber: string;
  donorName: string;
  targetPeriodId: string;
  targetPackageId: string;
  targetAmount: number;
  currentAmount: number;
  installmentFrequency: 'weekly' | 'monthly' | 'custom';
  installmentAmount: number;
  installmentDay: number;
  startDate: string;
  status: 'active' | 'completed' | 'converted' | 'cancelled';
  convertedToOrderId?: string;
  createdAt: string;
}

export interface SavingsTransaction {
  id: string;
  savingsId: string;
  transactionNumber: string;
  amount: number;
  paymentMethod: string;
  paymentChannel: string;
  paymentProof?: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}

export async function getSavingsList(userId: string): Promise<QurbanSavings[]> {
  const response = await fetch(`${API_URL}/qurban/savings?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch savings');
  return response.json();
}

export async function getSavingsDetail(id: string): Promise<QurbanSavings> {
  const response = await fetch(`${API_URL}/qurban/savings/${id}`);
  if (!response.ok) throw new Error('Failed to fetch savings detail');
  return response.json();
}

export async function createSavings(data: {
  donorName: string;
  targetPeriodId: string;
  targetPackageId: string;
  targetAmount: number;
  installmentFrequency: string;
  installmentAmount: number;
  installmentDay: number;
  startDate: string;
}): Promise<QurbanSavings> {
  const response = await fetch(`${API_URL}/qurban/savings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create savings');
  return response.json();
}

export async function depositSavings(savingsId: string, data: {
  amount: number;
  paymentMethod: string;
  paymentChannel: string;
  paymentProof?: string;
  notes?: string;
}): Promise<SavingsTransaction> {
  const response = await fetch(`${API_URL}/qurban/savings/${savingsId}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to deposit');
  return response.json();
}

export async function getSavingsTransactions(savingsId: string): Promise<SavingsTransaction[]> {
  const response = await fetch(`${API_URL}/qurban/savings/${savingsId}/transactions`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}
```

**Files Changed**:
- `/apps/web/src/services/qurban-savings.ts` (NEW)

---

#### Task 4.2: Create Savings List Page
**Estimated Time**: 4 hours

**Steps**:
1. Create file: `/apps/web/src/app/qurban/savings/page.tsx`

```typescript
import { getSavingsList } from '@/services/qurban-savings';
import SavingsCard from './SavingsCard';
import Link from 'next/link';

export default async function SavingsListPage() {
  const userId = 'current-user-id'; // TODO: Get from auth
  const savingsList = await getSavingsList(userId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tabungan Qurban Saya</h1>
        <Link
          href="/qurban/savings/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Buat Tabungan Baru
        </Link>
      </div>

      {savingsList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Belum ada tabungan qurban</p>
          <Link
            href="/qurban/savings/new"
            className="text-green-600 hover:underline"
          >
            Buat tabungan pertama Anda
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsList.map((savings) => (
            <SavingsCard key={savings.id} savings={savings} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Files Changed**:
- `/apps/web/src/app/qurban/savings/page.tsx` (NEW)

---

#### Task 4.3: Create Savings Card Component
**Estimated Time**: 2 hours

**Steps**:
1. Create file: `/apps/web/src/app/qurban/savings/SavingsCard.tsx`

```typescript
'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { QurbanSavings } from '@/services/qurban-savings';

export default function SavingsCard({ savings }: { savings: QurbanSavings }) {
  const progress = (savings.currentAmount / savings.targetAmount) * 100;

  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    converted: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    active: 'Aktif',
    completed: 'Selesai',
    converted: 'Terkonversi',
    cancelled: 'Dibatalkan',
  };

  return (
    <Link href={`/qurban/savings/${savings.id}`}>
      <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-500">No. Tabungan</p>
            <p className="font-semibold">{savings.savingsNumber}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${statusColors[savings.status]}`}>
            {statusLabels[savings.status]}
          </span>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Progress</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">
            {formatCurrency(savings.currentAmount)} / {formatCurrency(savings.targetAmount)}
            <span className="ml-2 font-semibold">{progress.toFixed(1)}%</span>
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <p>Target: {formatCurrency(savings.targetAmount)}</p>
          <p>Kurang: {formatCurrency(savings.targetAmount - savings.currentAmount)}</p>
        </div>
      </div>
    </Link>
  );
}
```

**Files Changed**:
- `/apps/web/src/app/qurban/savings/SavingsCard.tsx` (NEW)

---

#### Task 4.4: Create New Savings Page
**Estimated Time**: 3 hours

**Steps**:
1. Create file: `/apps/web/src/app/qurban/savings/new/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSavings } from '@/services/qurban-savings';

export default function NewSavingsPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    donorName: '',
    targetAmount: 0,
    installmentFrequency: 'monthly',
    installmentAmount: 0,
    installmentDay: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savings = await createSavings({
        ...formData,
        targetPeriodId: 'period-id', // TODO: Select from dropdown
        targetPackageId: 'package-id', // TODO: Select from dropdown
        startDate: new Date().toISOString(),
      });
      router.push(`/qurban/savings/${savings.id}`);
    } catch (error) {
      console.error('Failed to create savings:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Buat Tabungan Qurban Baru</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form fields here */}
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
        >
          Buat Tabungan
        </button>
      </form>
    </div>
  );
}
```

**Files Changed**:
- `/apps/web/src/app/qurban/savings/new/page.tsx` (NEW)

---

#### Task 4.5: Create Savings Detail & Deposit Page
**Estimated Time**: 5 hours

**Steps**:
1. Create file: `/apps/web/src/app/qurban/savings/[id]/page.tsx`

```typescript
import { getSavingsDetail, getSavingsTransactions } from '@/services/qurban-savings';
import DepositForm from './DepositForm';
import TransactionList from './TransactionList';
import ProgressBar from './ProgressBar';

export default async function SavingsDetailPage({ params }: { params: { id: string } }) {
  const savings = await getSavingsDetail(params.id);
  const transactions = await getSavingsTransactions(params.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Detail Tabungan</h1>
      <p className="text-gray-600 mb-6">{savings.savingsNumber}</p>

      <ProgressBar
        current={savings.currentAmount}
        target={savings.targetAmount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Riwayat Setoran</h2>
          <TransactionList transactions={transactions} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Setor Baru</h2>
          <DepositForm savingsId={savings.id} />
        </div>
      </div>
    </div>
  );
}
```

**Files Changed**:
- `/apps/web/src/app/qurban/savings/[id]/page.tsx` (NEW)

---

#### Task 4.6: Create Deposit Form Component
**Estimated Time**: 3 hours

**Steps**:
1. Create file: `/apps/web/src/app/qurban/savings/[id]/DepositForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { depositSavings } from '@/services/qurban-savings';

export default function DepositForm({ savingsId }: { savingsId: string }) {
  const [amount, setAmount] = useState(0);
  const [paymentProof, setPaymentProof] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await depositSavings(savingsId, {
        amount,
        paymentMethod: 'bank_transfer',
        paymentChannel: 'BCA',
        paymentProof,
      });
      alert('Setoran berhasil, menunggu verifikasi admin');
      window.location.reload();
    } catch (error) {
      console.error('Failed to deposit:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
      >
        Setor Sekarang
      </button>
    </form>
  );
}
```

**Files Changed**:
- `/apps/web/src/app/qurban/savings/[id]/DepositForm.tsx` (NEW)

---

#### Task 4.7: Add Navigation Links
**Estimated Time**: 1 hour

**Steps**:
1. Update navigation menu to add "Tabungan Qurban" link
2. Update `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx`
   - Add button "Nabung untuk Paket Ini"
   - Links to `/qurban/savings/new?packageId={id}`

**Files Changed**:
- Navigation component (EDIT)
- `/apps/web/src/app/qurban/[id]/QurbanSidebar.tsx` (EDIT)

---

## 📝 MIGRATION SCRIPTS

### Migration 032: Add Admin Fee Field

**File**: `/packages/db/migrations/032_add_admin_fee_to_qurban_orders.sql`

```sql
-- Migration: Add admin_fee field to qurban_orders
-- This enables tracking of admin fees charged at time of order
-- Needed for auditing, reporting, and transparency

-- Add admin_fee column
ALTER TABLE qurban_orders
ADD COLUMN admin_fee BIGINT DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN qurban_orders.admin_fee IS
  'Admin fee (biaya amil) charged at time of order. For individual packages, this is adminFee × quantity.';

-- Backfill existing orders with estimated admin fee
-- Based on animal type (cow = 50000, goat = 25000)
UPDATE qurban_orders o
SET admin_fee = (
  CASE
    WHEN p.animal_type = 'cow' THEN 50000
    WHEN p.animal_type = 'goat' THEN 25000 * o.quantity
    ELSE 0
  END
)
FROM qurban_packages p
WHERE o.package_id = p.id;
```

**Package.json Script**:
```json
"migrate:qurban-admin-fee": "tsx scripts/run-migration.ts migrations/032_add_admin_fee_to_qurban_orders.sql"
```

**Run Migration**:
```bash
cd packages/db
npm run migrate:qurban-admin-fee
```

---

## 🧪 TESTING PLAN

### Test Case 1: Admin Fee Individual Package
**Steps**:
1. Browse ke `/qurban`
2. Pilih paket individual (kambing)
3. Set quantity = 3
4. Verify sidebar shows: Admin Fee = Rp 25.000 × 3 = Rp 75.000
5. Add to cart
6. Go to checkout
7. Complete checkout
8. Verify database:
   ```sql
   SELECT order_number, quantity, unit_price, admin_fee, total_amount
   FROM qurban_orders
   WHERE order_number = 'QBN-2026-XXXXX';

   -- Expected:
   -- quantity: 3
   -- unit_price: 3000000 (example kambing price)
   -- admin_fee: 75000
   -- total_amount: 9075000
   ```

---

### Test Case 2: Admin Fee Shared Package
**Steps**:
1. Browse ke `/qurban`
2. Pilih paket shared (sapi 5 orang)
3. Quantity auto = 1 (disabled)
4. Verify sidebar shows: Admin Fee = Rp 50.000
5. Add to cart
6. Go to checkout
7. Complete checkout
8. Verify database:
   ```sql
   SELECT order_number, quantity, unit_price, admin_fee, total_amount, shared_group_id
   FROM qurban_orders
   WHERE order_number = 'QBN-2026-XXXXX';

   -- Expected:
   -- quantity: 1
   -- unit_price: 5000000
   -- admin_fee: 50000
   -- total_amount: 5050000
   -- shared_group_id: NOT NULL
   ```

---

### Test Case 3: Admin Fee Validation (Security Test)
**Steps**:
1. Add qurban to cart (kambing, quantity=2)
2. Open DevTools console
3. Manipulate cart:
   ```javascript
   const cart = JSON.parse(localStorage.getItem('bantuanku_cart'));
   cart[0].qurbanData.adminFee = 0;  // Try to remove admin fee
   cart[0].amount = 6000000;  // 2 kambing without fee
   localStorage.setItem('bantuanku_cart', JSON.stringify(cart));
   ```
4. Go to checkout
5. Complete checkout
6. **Expected Result**: Backend returns 400 error
   ```json
   {
     "error": "Invalid admin fee. Expected: 50000, Received: 0"
   }
   ```

---

### Test Case 4: Settings Loading Failure
**Steps**:
1. Stop backend or block `/settings` endpoint
2. Browse to `/qurban/[id]` detail page
3. **Expected**: Page loads with default admin fees (50000/25000)
4. **Expected**: Console shows warning: "Failed to load settings, using defaults"
5. Verify sidebar calculates with default fees
6. Add to cart and checkout works

---

### Test Case 5: Navigation Fix
**Steps**:
1. Add qurban to cart via modal
2. Click "Cari Paket Qurban Lain" button
3. **Expected**: Navigate to `/qurban` catalog page (NOT `/` homepage)

---

### Test Case 6: Period Display (After Fix)
**Steps**:
1. Go to qurban detail page
2. **Expected**: Period shown as read-only info (no dropdown)
3. Verify period name and execution date displayed correctly

---

## 📦 DELIVERABLES

### Phase 0 (URGENT - TODAY):
- [ ] ✅ date-fns-tz installed
- [ ] ✅ Timezone utility created (timezone.ts)
- [ ] ✅ Order number generation fixed (5 locations)
- [ ] ✅ Payment expiration calculation fixed
- [ ] ✅ TZ environment variable set
- [ ] ✅ Timezone test cases pass
- [ ] ✅ Deploy ASAP to prevent wrong order numbers

### Phase 1 (Week 1):
- [ ] Migration 032 executed
- [ ] Schema updated with admin_fee field
- [ ] Backend validates admin fee
- [ ] Frontend sends admin fee
- [ ] Documentation updated (payment flow)
- [ ] Test cases 1-3 pass

### Phase 2 (Week 2):
- [ ] Backend admin fee validation complete
- [ ] All security tests pass

### Phase 3 (Week 3):
- [ ] Period dropdown removed
- [ ] Navigation button fixed
- [ ] Settings error handling added
- [ ] Payment date server-side
- [ ] Documentation updates (admin fee calc, periodName)
- [ ] Test cases 4-6 pass

### Phase 4 (Week 3-4):
- [ ] Tabungan service layer created (qurban-savings.ts)
- [ ] Savings list page implemented (/qurban/savings)
- [ ] Savings card component created
- [ ] New savings page implemented (/qurban/savings/new)
- [ ] Savings detail & deposit page implemented
- [ ] Deposit form component created
- [ ] Progress bar component created
- [ ] Transaction list component created
- [ ] Navigation links added ("Tabungan Qurban")
- [ ] "Nabung" button added to package detail page
- [ ] End-to-end tabungan flow tested
- [ ] Integration with backend API verified

---

## 🔄 ROLLBACK PLAN

### Phase 0 Timezone - If Breaks:
1. Uninstall date-fns-tz: `npm uninstall date-fns-tz`
2. Revert qurban.ts to use `new Date().getFullYear()`
3. Revert donations.ts payment expiration
4. Remove timezone.ts
5. Remove TZ environment variable

**Risk**: Very low - timezone functions are pure utility, no database changes

### If Migration Fails:
```sql
-- Rollback migration 032
ALTER TABLE qurban_orders DROP COLUMN admin_fee;
```

### If Backend Changes Break:
1. Revert `/apps/api/src/routes/qurban.ts` to previous commit
2. Revert `/apps/web/src/app/checkout/page.tsx` to previous commit
3. Keep migration (admin_fee field safe to keep)

### If Frontend Breaks:
1. Revert checkout page changes
2. Backend will ignore adminFee if not sent (optional field)

---

## 📈 SUCCESS METRICS

### Before Fix:
- ❌ **TIMEZONE**: Order numbers salah 7 jam/hari
- ❌ **TIMEZONE**: Payment expiration tidak align dengan business hours
- ❌ **TIMEZONE**: Timestamps confusing (UTC vs WIB)
- ❌ Admin fee tidak tercatat di database
- ❌ Tidak ada audit trail untuk biaya amil
- ❌ Risk manipulasi admin fee dari frontend
- ❌ **FITUR TABUNGAN**: Backend ready tapi frontend tidak ada
- ❌ User tidak bisa menabung untuk qurban
- ⚠️ Payment flow tidak sesuai dokumentasi

### After Fix:
- ✅ **TIMEZONE**: Order numbers selalu benar (WIB timezone)
- ✅ **TIMEZONE**: Payment expiration align dengan jam operasional Indonesia
- ✅ **TIMEZONE**: Timestamps konsisten dan jelas
- ✅ Admin fee tersimpan di setiap order
- ✅ Audit trail lengkap untuk transparansi
- ✅ Backend validate admin fee → secure
- ✅ **FITUR TABUNGAN**: Complete end-to-end flow
- ✅ User bisa buat tabungan, setor, track progress
- ✅ Admin bisa verify deposits
- ✅ Auto-convert when target reached
- ✅ Documentation accurate
- ✅ All test cases pass
- ✅ Zero critical bugs

---

## 🎯 CONCLUSION

Total effort estimation:
- **Phase 0 (URGENT Timezone)**: ~2 hours ⚡
- **Phase 1 (Critical)**: ~8 hours
- **Phase 2 (Important)**: ~3 hours
- **Phase 3 (Nice-to-have)**: ~3 hours
- **Phase 4 (Fitur Tabungan Frontend)**: ~20 hours
- **Total**: ~36 hours (~4.5 days developer time)

**ROI**: Very High
- **Fixes CRITICAL timezone bug** (order numbers wrong 7 hrs/day)
- Fixes critical audit trail gap
- Improves security
- **Unlocks tabungan feature** (backend ready, frontend missing)
- New revenue stream (users who can't afford full payment can save)
- Better documentation alignment
- Enhanced user experience

**Risk Level**: Very Low
- Phase 0: Pure utility functions, no database changes, easy rollback
- Phase 1: Mostly additive changes (new field)
- Backward compatible (existing orders backfilled)
- Easy rollback plan

**Recommendation**: ✅ Proceed with implementation in priority order (P0 → P1 → P2/P3)

---

**Next Steps**:
1. Review dan approve planning ini
2. Create tasks di project management tool
3. **PRIORITY 1**: Execute Phase 0 (Timezone) - URGENT
4. Execute Phase 1 (Admin Fee) - Week 1
5. Execute Phase 2 & 3 (Validation & UX) - Week 2-3
6. Execute Phase 4 (Fitur Tabungan) - Week 3-4
7. QA testing end-to-end
8. Deploy to staging
9. Production deployment

---

## 📝 QUICK REFERENCE: TIMEZONE FIX IMPLEMENTATION

### ⚡ IMMEDIATE ACTION CHECKLIST (PHASE 0)

```bash
# 1. Install timezone library
cd apps/api
npm install date-fns-tz

# 2. Create timezone utility file
# Copy code from Task 0.2 above to /apps/api/src/utils/timezone.ts

# 3. Update order number generation (5 locations in qurban.ts)
# Lines: 232, 293, 343, 398, 463
# Change: new Date().getFullYear() → getCurrentYearWIB()

# 4. Update payment expiration (donations.ts line 45-46)
# Change to use addHoursWIB(new Date(), 24)

# 5. Set environment variable in all .env files
echo "TZ=Asia/Jakarta" >> .env
echo "TZ=Asia/Jakarta" >> apps/api/.env
echo "TZ=Asia/Jakarta" >> apps/web/.env.local
echo "TZ=Asia/Jakarta" >> apps/admin/.env.local

# 6. Restart all services
npm run dev  # or however you run the app

# 7. Test order creation
# Verify order number has correct year
```

### 🔍 WHERE TO CHANGE

| File | Line(s) | Change | Priority |
|------|---------|--------|----------|
| `apps/api/src/utils/timezone.ts` | ALL | Create new file | 🚨 URGENT |
| `apps/api/src/routes/qurban.ts` | 232 | Order number year | 🚨 URGENT |
| `apps/api/src/routes/qurban.ts` | 293 | Payment number year | 🚨 URGENT |
| `apps/api/src/routes/qurban.ts` | 343 | Savings number year | 🚨 URGENT |
| `apps/api/src/routes/qurban.ts` | 398 | Transaction number year | 🚨 URGENT |
| `apps/api/src/routes/qurban.ts` | 463 | Conversion order year | 🚨 URGENT |
| `apps/api/src/routes/donations.ts` | 45-46 | Payment expiration | 🔴 HIGH |
| `.env` files | N/A | Add TZ=Asia/Jakarta | 🟡 MEDIUM |

### ⚠️ WHAT WILL BREAK IF NOT FIXED

**Scenario**: Today is January 1, 2026 at 02:00 WIB

**Without Fix**:
- Server time (UTC): December 31, 2025 at 19:00
- Order created → `QBN-2025-00001` ❌ WRONG!
- Expected: `QBN-2026-00001`

**Impact**:
- Orders between 00:00-07:00 WIB EVERY DAY get wrong year
- ~25-30% of daily orders affected (assuming even distribution)
- Potential duplicate order numbers when year changes
- Confusion in reports and admin dashboard
- Payment expiration times don't align with business hours

**With Fix**:
- Order created → `QBN-2026-00001` ✅ CORRECT!
- Payment expiration aligned with WIB business hours ✅
- All timestamps consistent ✅

### 🧪 HOW TO TEST

```bash
# Quick test after deployment
curl -X POST http://localhost:3000/api/qurban/orders \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "test-pkg-id",
    "donorName": "Test User",
    "quantity": 1
  }'

# Check response order number format
# Expected: QBN-2026-XXXXX (current WIB year)
# NOT: QBN-2025-XXXXX if testing after midnight WIB
```

### 💡 BEST PRACTICES GOING FORWARD

1. **Always use timezone utilities** when:
   - Generating order/payment/savings numbers
   - Calculating expiration dates
   - Creating scheduled tasks
   - Generating reports with date ranges

2. **Store UTC in database** (current approach OK):
   - Keep timestamps as UTC in PostgreSQL
   - Convert to WIB only for display/business logic
   - Easier for international expansion later

3. **Display WIB to users**:
   - Frontend should format dates in WIB for Indonesian users
   - Use `formatWIB()` helper consistently

4. **Document timezone assumptions**:
   - Comment where WIB timezone is critical
   - Note any UTC conversions

---

**End of Planning Document**
**Last Updated**: 31 Januari 2026 - Added URGENT Timezone Fix (GAP #0)
