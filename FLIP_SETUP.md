# Flip Integration Setup

## ✅ Implementasi Lengkap

### 1. Backend - Payment Adapter
**File**: [flip.ts](apps/api/src/services/payment/flip.ts)
- Basic Authentication dengan Base64 encoding (SecretKey + ":")
- Payment creation menggunakan Flip PWF (Payment Without Form) API
- Webhook token validation
- Webhook payload parsing
- Support sandbox dan production mode
- Virtual Account untuk multiple banks (BCA, BNI, BRI, Mandiri, Permata, CIMB)

### 2. Backend - API Routes
**File**: [payments.ts](apps/api/src/routes/payments.ts)
- Updated `/create` endpoint untuk support Flip dengan parameter `channel`
- Settings-based payment gateway credentials (flip_secret_key, flip_validation_token, flip_mode)
- Webhook endpoint dengan support token validation
- Automatic payment verification dan status update

### 3. Frontend - Payment Flow
**Halaman 1**: [payment-method/page.tsx](apps/web/src/app/checkout/payment-method/page.tsx)
- Menampilkan 3 kategori payment: Transfer Bank, QRIS, Pembayaran Cepat
- Redirect ke `/checkout/payment-gateway` ketika pilih Pembayaran Cepat

**Halaman 2**: [payment-gateway/page.tsx](apps/web/src/app/checkout/payment-gateway/page.tsx)
- Menampilkan daftar payment gateway yang tersedia (iPaymu, Flip, Xendit)
- User memilih gateway yang diinginkan
- Klik "Lanjutkan" untuk proceed ke channel selection

**Halaman 3**: [flip-channels/page.tsx](apps/web/src/app/checkout/flip-channels/page.tsx) ⭐ NEW
- Menampilkan semua Virtual Account banks yang tersedia:
  - BCA Virtual Account
  - BNI Virtual Account
  - BRI Virtual Account
  - Mandiri Virtual Account
  - Permata Virtual Account
  - CIMB Niaga Virtual Account
- User memilih channel yang diinginkan
- Klik "Lanjutkan Pembayaran" untuk create payment

**Halaman 4**: [payment-result/page.tsx](apps/web/src/app/checkout/payment-result/page.tsx)
- Menampilkan detail pembayaran berhasil dibuat
- Virtual Account number dengan tombol copy
- Payment URL untuk redirect ke Flip payment page
- Instruksi cara pembayaran step-by-step
- Expired time countdown

### 4. Database Updates
**File**: [seed.ts](packages/db/src/seed.ts)
- Added Flip gateway ke seed data

## 🎯 Alur Pembayaran

```
1. User pilih "Pembayaran Cepat" (payment_gateway)
   ↓
2. Redirect ke /checkout/payment-gateway
   ↓
3. Tampilkan daftar payment gateway:
   - iPaymu (general)
   - Flip (general) ⭐
   - Xendit (general)
   ↓
4. User pilih gateway (e.g., Flip)
   ↓
5. Redirect ke /checkout/flip-channels
   ↓
6. Tampilkan semua channel Flip:
   - BCA Virtual Account
   - BNI Virtual Account
   - BRI Virtual Account
   - Mandiri Virtual Account
   - Permata Virtual Account
   - CIMB Niaga Virtual Account
   ↓
7. User pilih channel (e.g., "va:bca")
   ↓
8. User klik "Lanjutkan Pembayaran"
   ↓
9. API POST /v1/payments/create
   {
     "donationId": "xxx",
     "methodId": "flip",
     "channel": "va:bca"
   }
   ↓
10. Backend create payment ke Flip API
   ↓
11. Flip return payment data:
    - Link ID (unique payment identifier)
    - Link URL (payment page)
    - Expired date
   ↓
12. Redirect ke /checkout/payment-result
   ↓
13. Tampilkan:
    - VA Number dengan tombol copy (jika VA)
    - Payment URL (semua channel)
    - Instruksi pembayaran
    - Expired time
   ↓
14. User bayar melalui channel yang dipilih
   ↓
15. Flip kirim webhook ke /v1/payments/flip/webhook
   ↓
16. Backend verify token dan update donation status
   ↓
17. Status donasi otomatis berubah jadi "paid"
```

## 📡 API Endpoints

### Payment Creation
```http
POST /v1/payments/create
Content-Type: application/json

{
  "donationId": "donation_id",
  "methodId": "flip",
  "channel": "va:bca"  // Format: "method:channel"
}
```

**Channel Format**:
- VA BCA: `"va:bca"`
- VA BNI: `"va:bni"`
- VA BRI: `"va:bri"`
- VA Mandiri: `"va:mandiri"`
- VA Permata: `"va:permata"`
- VA CIMB: `"va:cimb"`

**API Response**:
```json
{
  "success": true,
  "data": {
    "externalId": "12345",
    "paymentCode": "12345",
    "paymentUrl": "https://flip.id/pwf-sandbox/...",
    "expiredAt": "2026-02-04T10:00:00.000Z"
  }
}
```

### Webhook
```http
POST /v1/payments/flip/webhook
Content-Type: application/json

{
  "id": "12345",
  "bill_link_id": "12345",
  "status": "SUCCESSFUL",
  "amount": 100000,
  "sender_name": "Donor Name",
  "token": "your_validation_token"
}
```

## ⚙️ Required Settings

Pastikan settings ini ada di database:
```sql
-- Enable Flip
payment_flip_enabled = "true"

-- Credentials (dari Flip dashboard)
flip_secret_key = "YOUR_SECRET_KEY"
flip_validation_token = "YOUR_VALIDATION_TOKEN"
flip_mode = "sandbox"  -- atau "production"
```

## 🚀 Setup Instructions

### 1. Add Flip Gateway ke Database
```bash
cd packages/db
DATABASE_URL=your_db_url npx tsx insert-flip-gateway.ts
```

Atau manual via SQL:
```sql
INSERT INTO payment_gateways (id, code, name, description, type, is_active, sort_order, created_at, updated_at)
VALUES (
  'flip_' || substr(md5(random()::text), 1, 20),
  'flip',
  'Flip',
  'Payment gateway Flip - Virtual Account dan Payment Link',
  'auto',
  true,
  4,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;
```

### 2. Configure Settings
Tambahkan settings ke database via Admin Dashboard atau SQL:
```sql
-- Enable Flip
INSERT INTO settings (id, key, value, type, label, category, sort_order, is_public)
VALUES
  ('flip_enabled_id', 'payment_flip_enabled', 'true', 'boolean', 'Enable Flip', 'payment', 40, false),
  ('flip_secret_id', 'flip_secret_key', 'YOUR_SECRET_KEY', 'password', 'Flip Secret Key', 'payment', 41, false),
  ('flip_token_id', 'flip_validation_token', 'YOUR_VALIDATION_TOKEN', 'text', 'Flip Validation Token', 'payment', 42, false),
  ('flip_mode_id', 'flip_mode', 'sandbox', 'select', 'Flip Mode', 'payment', 43, false);
```

### 3. Get Flip Credentials
1. Login ke [Flip Business Dashboard](https://flip.id/business)
2. Untuk **Sandbox**: https://flip.id/business/sandbox
3. Untuk **Production**: https://flip.id/business
4. Menu: Settings > API
5. Copy:
   - **Secret Key**: untuk authentication
   - **Validation Token**: untuk webhook verification

### 4. Configure Webhook di Flip Dashboard
1. Login ke Flip dashboard
2. Menu: Settings > Webhook
3. Set webhook URL:
   - Development: `https://your-ngrok-url/v1/payments/flip/webhook`
   - Production: `https://api.bantuanku.org/v1/payments/flip/webhook`
4. Copy validation token dan paste ke settings

### 5. Test Payment Flow
1. Buat donasi baru
2. Pilih "Pembayaran Cepat"
3. Pilih payment gateway "Flip"
4. Pilih channel (misal: VA BCA)
5. Klik "Lanjutkan Pembayaran"
6. Akan muncul halaman dengan VA number dan payment link
7. Test pembayaran di Flip sandbox
8. Webhook akan auto-update status donasi

## 🔧 Troubleshooting

### Payment creation gagal
```bash
# Check settings
SELECT * FROM settings WHERE key LIKE '%flip%';

# Check if enabled
SELECT * FROM settings WHERE key = 'payment_flip_enabled';

# Check gateway exists
SELECT * FROM payment_gateways WHERE code = 'flip';
```

### Webhook tidak jalan
1. Verify webhook URL di Flip dashboard
2. Check server logs untuk incoming webhook
3. Verify token validation logic
4. Test dengan curl:
```bash
curl -X POST https://your-api.com/v1/payments/flip/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "12345", "status": "SUCCESSFUL", "token": "your_token"}'
```

### Credentials tidak valid
1. Pastikan secret key sudah benar (check di Flip dashboard)
2. Verify secret key format: harus string tanpa spasi
3. Check mode sandbox/production sesuai dengan credentials yang digunakan

## 📁 File Reference

| File | Purpose |
|------|---------|
| [flip.ts](apps/api/src/services/payment/flip.ts) | Payment adapter dengan Basic Auth |
| [payments.ts](apps/api/src/routes/payments.ts) | API routes untuk create payment dan webhook |
| [payment-method/page.tsx](apps/web/src/app/checkout/payment-method/page.tsx) | Halaman pilih metode pembayaran |
| [payment-gateway/page.tsx](apps/web/src/app/checkout/payment-gateway/page.tsx) | Halaman pilih payment gateway |
| [flip-channels/page.tsx](apps/web/src/app/checkout/flip-channels/page.tsx) | ⭐ Halaman pilih channel Flip |
| [payment-result/page.tsx](apps/web/src/app/checkout/payment-result/page.tsx) | Halaman hasil pembayaran |
| [seed.ts](packages/db/src/seed.ts) | Database seed dengan Flip gateway |

## 🎨 UI Components

### Payment Method Card
- Icon: 💳 untuk Pembayaran Cepat
- Title: "Pembayaran Cepat"
- Description: "Virtual Account / E-wallet / QRIS"

### Channel Selection
- Grouped by bank
- Radio button selection
- Show fee information per channel (Rp 4.000 flat)
- Loading state saat create payment

### Payment Result
- Success checkmark icon ✅
- Payment link URL
- VA number dengan copy button (if applicable)
- Step-by-step instructions
- Expired time countdown
- Action buttons: Kembali ke Beranda, Lihat Status Donasi

## 🌐 Production Deployment

1. Update settings ke production:
```sql
UPDATE settings SET value = 'production' WHERE key = 'flip_mode';
UPDATE settings SET value = 'YOUR_PROD_SECRET_KEY' WHERE key = 'flip_secret_key';
UPDATE settings SET value = 'YOUR_PROD_TOKEN' WHERE key = 'flip_validation_token';
```

2. Update webhook URL di Flip production dashboard

3. Test dengan real payment

4. Monitor webhook logs dan payment status updates

## 📊 Testing Checklist

- [ ] Flip gateway ada di database
- [ ] Settings configured (Secret Key, Validation Token, Mode)
- [ ] Payment method "Pembayaran Cepat" muncul di checkout
- [ ] Gateway selection page tampil Flip
- [ ] Channel selection page tampil dengan semua VA banks
- [ ] Create payment berhasil (check API response)
- [ ] Payment result page tampil dengan benar
- [ ] Payment URL redirect ke Flip
- [ ] VA number muncul (if applicable)
- [ ] Copy button berfungsi
- [ ] Webhook token verification berhasil
- [ ] Donation status update otomatis setelah payment
- [ ] Email notification terkirim (jika configured)

## 🔗 API Documentation References

- [Flip Official Documentation](https://docs.flip.id/)
- [Flip Direct API - Virtual Account](https://docs.flip.id/docs/accept-payment/direct-api/va-integration/)
- [Big Flip API v2](https://bigflip.id/big_sandbox_api/v2)

**Sources:**
- [Flip API Documentation](https://docs.flip.id/)
- [Flip Direct API - QRIS](https://docs.flip.id/docs/accept-payment/direct-api/qris-integration/)
- [Flip GitHub Organization](https://github.com/flip-id)
