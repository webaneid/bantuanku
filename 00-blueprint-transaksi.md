# Transaction System Blueprint - Universal Transaction Flow

## Overview

Sistem transaksi universal yang mendukung semua jenis program (Campaigns/Donasi, Zakat, Qurban) dengan satu set komponen dan flow yang konsisten. Sistem ini mendukung baik **guest users** maupun **logged-in users**.

## Architecture

```
┌─────────────────────────┐
│  Create Transaction     │
│  (Guest or Logged-in)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Transaction Detail     │
│  /account/{type}/[id]   │
│  - View order summary   │
│  - Choose payment       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Payment Method        │
│  /[id]/payment-method   │
│  - Bank Transfer        │
│  - QRIS                 │
│  - Payment Gateway      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Payment Detail        │
│  /[id]/payment-detail   │
│  - Show account/QR      │
│  - Upload proof         │
│  - Input amount         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Payment Verification   │
│  (Admin Dashboard)      │
└─────────────────────────┘
```

## Key Components

### 1. PaymentMethodSelector
**Location:** `/apps/web/src/components/PaymentMethodSelector.tsx`

Universal component untuk memilih metode pembayaran.

**Props:**
```typescript
interface PaymentMethodSelectorProps {
  transactionId: string;
  transactionType: 'donation' | 'zakat' | 'qurban';
}
```

**Features:**
- Auto-detect program dari transaction type atau campaign pillar
- Filter payment methods by program
- Support Bank Transfer, QRIS, Payment Gateway
- Works for both guest and logged-in users

**Usage:**
```tsx
<PaymentMethodSelector
  transactionId={params.id as string}
  transactionType="donation"
/>
```

### 2. PaymentDetailSelector
**Location:** `/apps/web/src/components/PaymentDetailSelector.tsx`

Universal component untuk detail pembayaran dan upload bukti.

**Props:**
```typescript
interface PaymentDetailSelectorProps {
  transactionId: string;
  transactionType: 'donation' | 'zakat' | 'qurban';
}
```

**Features:**
- Show payment method details (bank account, QR code)
- Upload payment proof (image/PDF, max 5MB)
- Input transfer amount (support partial payment)
- Auto-validation with smart feedback
- Works for both guest and logged-in users

**Usage:**
```tsx
<PaymentDetailSelector
  transactionId={params.id as string}
  transactionType="zakat"
/>
```

## Transaction Flow by Type

### ⭐ Universal Invoice System (NEW - Recommended for Guest)

**Routes (Type-agnostic):**
- Detail: `/invoice/[id]` - Auto-detect donation/zakat/qurban
- Payment Method: `/invoice/[id]/payment-method`
- Payment Detail: `/invoice/[id]/payment-detail`

**Backend Endpoints (NEW):**
- Get transaction: `GET /transactions/:id` - Auto-detect and normalize
- Confirm payment: `POST /transactions/:id/confirm-payment` - Auto-route
- Upload proof: `POST /transactions/:id/upload-proof` - Auto-route

**How It Works:**
1. Frontend calls `/transactions/:id`
2. Backend checks donations → zakat_donations → qurban_orders
3. Returns normalized structure with `type` field
4. Components auto-adapt based on type

**Benefits:**
- ✅ Single route for all transaction types
- ✅ No need to know transaction type upfront
- ✅ Guest-friendly (no authentication required)
- ✅ Consistent UI/UX across all types
- ✅ Auto-detect and normalize data

---

### Donations (Campaigns) - Legacy Routes

**Routes:**
- Detail: `/account/donations/[id]`
- Payment Method: `/account/donations/[id]/payment-method`
- Payment Detail: `/account/donations/[id]/payment-detail`

**Backend Endpoints:**
- Get donation: `GET /account/donations/:id`
- Confirm payment: `POST /donations/:id/confirm-payment`
- Upload proof: `POST /donations/:id/upload-proof`

### Zakat - Legacy Routes

**Routes:**
- Detail: `/account/zakat/[id]`
- Payment Method: `/account/zakat/[id]/payment-method`
- Payment Detail: `/account/zakat/[id]/payment-detail`

**Backend Endpoints:**
- Get zakat: `GET /account/donations/:id` (unified endpoint)
- Confirm payment: `POST /zakat/donations/:id/confirm-payment`
- Upload proof: `POST /zakat/donations/:id/upload-proof`

### Qurban - Legacy Routes

**Routes:**
- Detail: `/account/qurban/[id]`
- Payment Method: `/account/qurban/[id]/payment-method`
- Payment Detail: `/account/qurban/[id]/payment-detail`

**Backend Endpoints:**
- Get order: `GET /qurban/orders/:id`
- Confirm payment: `POST /qurban/orders/:id/confirm-payment`
- Upload proof: `POST /qurban/orders/:id/upload-proof`

## Guest Access Implementation

### Layout Configuration

**File:** `/apps/web/src/app/account/layout.tsx`

The layout detects transaction pages and allows guest access:

```typescript
// Detect if current path is a guest-accessible transaction page
const isTransactionPage = pathname?.match(
  /^\/(account\/)?(qurban|donations|zakat)\/[^/]+(\/(payment-method|payment-detail))?$/
);

// Only require authentication for non-transaction pages
if (!user && !isTransactionPage) {
  router.push("/login");
}
```

**Conditional UI:**
- Sidebar: Only shown for logged-in users
- User avatar: Shows "Login" button for guests
- Main content: Full width for guests (no sidebar offset)

### Page-level Implementation

Each transaction page allows guest access:

**Example - Payment Method Page:**
```tsx
export default function PaymentMethodPage() {
  const params = useParams();
  // No auth check - component works for both guest and logged-in users

  return (
    <PaymentMethodSelector
      transactionId={params.id as string}
      transactionType="donation"
    />
  );
}
```

**Example - Payment Detail Page:**
```tsx
export default function PaymentDetailPage() {
  const params = useParams();
  // No auth check - component works for both guest and logged-in users

  return (
    <PaymentDetailSelector
      transactionId={params.id as string}
      transactionType="zakat"
    />
  );
}
```

**Example - Transaction Detail Page:**
```tsx
export default function DonationDetailPage() {
  const { user, isHydrated } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    // Load data - backend handles authorization
    loadData();
  }, [isHydrated, params.id]);

  // No redirect to login
  // Backend will return 403 if user doesn't own the transaction
}
```

## Backend Authorization

Backend uses **order ownership** instead of user authentication:

```typescript
// Example from /qurban/orders/:id endpoint
app.get("/qurban/orders/:id", async (c) => {
  const orderId = c.req.param("id");
  const userId = c.get("userId"); // May be null for guests

  const order = await db
    .select()
    .from(qurbanOrders)
    .where(eq(qurbanOrders.id, orderId))
    .limit(1);

  if (!order[0]) {
    return c.json({ success: false, message: "Order not found" }, 404);
  }

  // Allow guest access - order contains customer info
  // Backend doesn't check if userId matches

  return c.json({ success: true, data: order[0] });
});
```

## Payment Tracking System

### Database Schema

**Donations:**
```sql
CREATE TABLE donation_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  donation_id TEXT REFERENCES donations(id),
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  payment_method TEXT NOT NULL,
  payment_channel TEXT,
  payment_proof TEXT,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Zakat:**
```sql
CREATE TABLE zakat_payments (
  -- Same structure as donation_payments
  zakat_donation_id TEXT REFERENCES zakat_donations(id),
  ...
);
```

**Qurban:**
```sql
-- Qurban uses direct payment fields in qurban_orders table
ALTER TABLE qurban_orders
  ADD COLUMN payment_method_id TEXT,
  ADD COLUMN payment_proof_url TEXT,
  ADD COLUMN paid_amount BIGINT,
  ADD COLUMN paid_at TIMESTAMP;
```

### Payment Amount Handling

All payment uploads now include the **transfer amount**:

```typescript
// Frontend - PaymentDetailSelector.tsx
const formData = new FormData();
formData.append('file', paymentProof);
formData.append('amount', transferAmount.toString());

await api.post(getEndpoint('upload-proof'), formData);
```

```typescript
// Backend - upload-proof endpoint
app.post("/donations/:id/upload-proof", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  const amount = Number(body.amount); // Transfer amount

  // Upload to GCS
  const fileUrl = await uploadToGCS(file);

  // Create payment record
  await db.insert(donationPayments).values({
    donationId: donation.id,
    amount: amount, // Store actual transfer amount
    paymentProof: fileUrl,
    status: 'pending',
    // ...
  });
});
```

### Smart Amount Validation

The UI provides intelligent feedback for transfer amounts:

```tsx
// Full payment
transferAmount === totalAmount
→ "✓ Sesuai dengan total pembayaran"

// Over payment
transferAmount > totalAmount
→ "Transfer lebih Rp X (kelebihan akan dikembalikan)"

// Partial payment
transferAmount < totalAmount
→ "⚠ Transfer kurang Rp X (pembayaran sebagian)"
```

## Session Storage Flow

Payment flow uses sessionStorage to pass data between pages:

```typescript
// 1. Payment Method Selection
sessionStorage.setItem('selectedMethodType', methodType);
router.push(`/account/donations/${id}/payment-detail`);

// 2. Payment Detail Page
const methodType = sessionStorage.getItem('selectedMethodType');
// Load payment methods of this type

// 3. After Success
sessionStorage.removeItem('selectedMethodType');
```

## File Structure

```
apps/web/src/
├── app/
│   ├── invoice/[id]/                # ⭐ NEW - Universal Invoice (Guest-friendly)
│   │   ├── layout.tsx               # Simple layout, no sidebar
│   │   ├── page.tsx                 # Uses UniversalInvoice
│   │   ├── payment-method/page.tsx  # Uses UniversalPaymentMethodSelector
│   │   └── payment-detail/page.tsx  # Uses UniversalPaymentDetailSelector
│   └── account/                     # Legacy routes (still supported)
│       ├── layout.tsx               # Auth layout with guest support
│       ├── donations/[id]/
│       │   ├── page.tsx
│       │   ├── payment-method/page.tsx
│       │   └── payment-detail/page.tsx
│       ├── zakat/[id]/
│       │   ├── page.tsx
│       │   ├── payment-method/page.tsx
│       │   └── payment-detail/page.tsx
│       └── qurban/[id]/
│           ├── page.tsx
│           ├── payment-method/page.tsx
│           └── payment-detail/page.tsx
└── components/
    ├── UniversalInvoice.tsx                    # ⭐ NEW - Auto-detect transaction type
    ├── UniversalPaymentMethodSelector.tsx      # ⭐ NEW - Auto-detect & route
    ├── UniversalPaymentDetailSelector.tsx      # ⭐ NEW - Auto-detect & upload
    ├── PaymentMethodSelector.tsx               # Legacy (type-specific)
    └── PaymentDetailSelector.tsx               # Legacy (type-specific)

packages/db/src/schema/
├── donation.ts                      # Donations table
├── donation-payments.ts             # Payment tracking for donations
├── zakat-donations.ts               # Zakat donations table
├── zakat-payments.ts                # Payment tracking for zakat
├── qurban-orders.ts                 # Qurban orders table
└── qurban-payments.ts               # Payment tracking for qurban

apps/api/src/routes/
├── transactions.ts                  # ⭐ NEW - Universal transaction endpoints
├── donations.ts                     # Legacy (type-specific)
├── zakat.ts                         # Legacy (type-specific)
└── qurban.ts                        # Legacy (type-specific)
```

## Migration Guide

### Converting a Transaction Type to Use Universal Components

#### Step 1: Update Page to Use PaymentMethodSelector

**Before:**
```tsx
export default function PaymentMethodPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState([]);

  // Custom implementation...

  return <div>...</div>;
}
```

**After:**
```tsx
import PaymentMethodSelector from '@/components/PaymentMethodSelector';

export default function PaymentMethodPage() {
  const params = useParams();

  return (
    <PaymentMethodSelector
      transactionId={params.id as string}
      transactionType="donation"
    />
  );
}
```

#### Step 2: Update Page to Use PaymentDetailSelector

**Before:**
```tsx
export default function PaymentDetailPage() {
  // Custom implementation with own state management...

  return <div>...</div>;
}
```

**After:**
```tsx
import PaymentDetailSelector from '@/components/PaymentDetailSelector';

export default function PaymentDetailPage() {
  const params = useParams();

  return (
    <PaymentDetailSelector
      transactionId={params.id as string}
      transactionType="donation"
    />
  );
}
```

#### Step 3: Remove Auth Checks

```tsx
// Remove this:
const { user, isHydrated } = useAuth();

if (!isHydrated || !user) {
  router.push('/login');
  return;
}

// Component now works for both guest and logged-in users
```

#### Step 4: Update Backend to Accept Transfer Amount

```typescript
// Add amount to upload-proof endpoint
app.post("/:id/upload-proof", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  const amount = Number(body.amount); // Add this

  // Store amount in payment record
  await db.insert(payments).values({
    amount: amount, // Add this
    // ...
  });
});
```

## Best Practices

### ✅ DO

1. **Use universal components** - PaymentMethodSelector & PaymentDetailSelector
2. **Allow guest access** - Don't require authentication for transaction pages
3. **Store transfer amount** - Always capture actual transfer amount from user
4. **Use sessionStorage** - For passing data between payment pages
5. **Validate on backend** - Check order ownership, not user authentication
6. **Provide feedback** - Show smart validation for payment amounts
7. **Clean up session** - Remove sessionStorage after successful payment

### ❌ DON'T

1. **Don't block guests** - Transaction pages should be accessible without login
2. **Don't use user context** - Components should work without user object
3. **Don't assume payment = totalAmount** - Support partial and over payments
4. **Don't create custom implementations** - Use universal components
5. **Don't require sidebar** - Guest users don't have account navigation
6. **Don't check userId in backend** - Use order ownership instead
7. **Don't skip amount input** - Always ask user to input transfer amount

## Guest Checkout Flow

### Complete User Journey

1. **User browses campaigns/qurban/zakat** (no login required)
2. **User fills donation form** with name, email, phone
3. **System creates order** with guest information
4. **User gets order ID** and is redirected to detail page
5. **User selects payment method** (bank transfer, QRIS, etc)
6. **User views payment details** (account number, QR code)
7. **User makes transfer** via their bank/e-wallet
8. **User uploads proof** with transfer amount
9. **System creates payment record** status: pending
10. **Admin verifies payment** in dashboard
11. **Payment status updated** to verified/rejected
12. **User can check status** using their order ID (no login needed)

### Creating Guest-Friendly Order

```typescript
// Frontend - Donation form
const createDonation = async (data) => {
  const response = await api.post('/donations', {
    campaignId: campaign.id,
    amount: selectedAmount,
    donorName: data.name,
    donorEmail: data.email,
    donorPhone: data.phone,
    message: data.message,
    isAnonymous: data.isAnonymous,
    // No userId required for guest
  });

  // Redirect to order detail
  router.push(`/account/donations/${response.data.data.id}`);
};
```

## Payment Method Configuration

Payment methods are filtered by program:

```typescript
// Database - payment_methods table
{
  code: 'bca_bantuanku',
  type: 'bank_transfer',
  programs: ['zakat', 'qurban'], // Only for zakat & qurban
}

{
  code: 'qris_general',
  type: 'qris',
  programs: ['general'], // Available for all programs
}
```

The `PaymentMethodSelector` auto-filters based on transaction program:

```typescript
// Auto-detect program from transaction
let program = 'sedekah';
if (transaction.type === 'zakat') program = 'zakat';
if (transaction.type === 'qurban') program = 'qurban';

// Filter methods
const filtered = methods.filter(method =>
  method.programs.includes(program) ||
  method.programs.includes('general')
);
```

## Image Upload & Storage

All payment proofs are uploaded to **Google Cloud Storage (GCS)**:

```typescript
// Backend - GCS upload helper
import { uploadToGCS } from '@/lib/gcs';

const fileUrl = await uploadToGCS(
  file,
  `payment-proofs/${orderId}/${timestamp}-${filename}`
);

// Returns public URL: https://storage.googleapis.com/bucket/path/file.jpg
```

**File restrictions:**
- Types: JPG, PNG, PDF
- Max size: 5MB
- Auto-validation in frontend

## Admin Dashboard Integration

Admin can view and verify payments:

**Dashboard Routes:**
- `/dashboard/donations` - View donation payments
- `/dashboard/donations/:id` - Verify donation payment
- `/dashboard/zakat/donations` - View zakat payments
- `/dashboard/qurban/orders` - View qurban orders

**Payment Verification:**
```typescript
// Admin verifies payment
await api.post(`/admin/donations/${id}/verify-payment`, {
  status: 'verified', // or 'rejected'
  notes: 'Pembayaran sesuai',
  verifiedAt: new Date(),
});

// Update donation status
await db.update(donations)
  .set({ paymentStatus: 'success' })
  .where(eq(donations.id, donationId));
```

## Error Handling

### Common Issues & Solutions

**Issue: "Data pembayaran tidak ditemukan"**
- Cause: sessionStorage cleared before reaching payment detail
- Solution: Validate sessionStorage on payment-detail page load

**Issue: Guest redirected to /login**
- Cause: Layout auth check blocking transaction page
- Solution: Check `isTransactionPage` regex in layout

**Issue: Upload fails without error**
- Cause: File size > 5MB or wrong file type
- Solution: Validate file before upload in frontend

**Issue: Amount doesn't match**
- Cause: User transferred different amount than total
- Solution: Accept any amount, let admin verify

## Testing Checklist

### Guest Checkout
- [ ] Can create order without login
- [ ] Can view order detail without login
- [ ] Can select payment method
- [ ] Can view payment details (bank account/QR)
- [ ] Can upload payment proof
- [ ] Can input any transfer amount
- [ ] Gets proper validation feedback
- [ ] Redirects correctly after upload
- [ ] No sidebar shown for guests
- [ ] "Login" button visible in header

### Logged-in User
- [ ] Can create order while logged in
- [ ] Can view order in history
- [ ] Can complete payment flow
- [ ] Sidebar shows for logged-in users
- [ ] User avatar shows in header
- [ ] Can logout from sidebar

### Payment Flow
- [ ] Bank transfer method works
- [ ] QRIS method works
- [ ] Payment gateway works
- [ ] File upload validates size (max 5MB)
- [ ] File upload validates type (JPG/PNG/PDF)
- [ ] Amount input validates (must be > 0)
- [ ] Smart feedback shows for amounts
- [ ] sessionStorage cleared after success

### Admin Verification
- [ ] Payment appears in admin dashboard
- [ ] Can view payment proof
- [ ] Can see transfer amount
- [ ] Can verify payment
- [ ] Can reject payment
- [ ] Status updates correctly

## Future Improvements

### Potential Enhancements

1. **Real-time Payment Status**
   - Add WebSocket for live payment updates
   - Notify user when admin verifies payment

2. **Payment Reminders**
   - Send email/SMS reminder for pending payments
   - Auto-expire unpaid orders after X days

3. **Payment History**
   - Allow guests to view order history using email/phone
   - Send magic link for guest order access

4. **Multiple Payment Methods**
   - Allow split payment (e.g., 50% bank transfer + 50% later)
   - Support installment for qurban

5. **Auto-Verification**
   - Integrate with bank API for auto-verification
   - OCR for payment proof validation

6. **Receipt Generation**
   - Auto-generate PDF receipt after verification
   - Send receipt via email

## Support

For implementation help:
- Components: `/apps/web/src/components/PaymentMethodSelector.tsx`
- Layout: `/apps/web/src/app/account/layout.tsx`
- Backend: `/apps/api/src/routes/donations.ts`
- Database: `/packages/db/src/schema/donation-payments.ts`

For questions or issues, refer to this blueprint or check the implementation in existing pages.
