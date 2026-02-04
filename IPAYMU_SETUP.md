# iPaymu Integration Setup

## ✅ Implementasi Lengkap

### 1. Backend - Payment Adapter
**File**: `/apps/api/src/services/payment/ipaymu.ts`
- HMAC SHA256 signature generation untuk autentikasi API
- Payment creation untuk multiple methods (VA, QRIS, E-wallet, Credit Card, dll)
- Webhook signature verification
- Webhook payload parsing
- Support sandbox dan production mode
- Handle format channel "method:channel" (e.g., "va:bca", "qris:qris")

### 2. Backend - API Routes
**File**: `/apps/api/src/routes/payments.ts`
- Updated `/create` endpoint untuk terima parameter `channel`
- Support settings-based payment gateways (ipaymu, xendit, flip)
- Webhook endpoint dengan support `X-Ipaymu-Signature` header
- Automatic payment verification dan status update

### 3. Frontend - Payment Flow
**Halaman 1**: `/checkout/payment-method`
- Menampilkan 3 kategori payment: Transfer Bank, QRIS, Pembayaran Cepat
- Redirect ke `/checkout/payment-gateway` ketika pilih Pembayaran Cepat

**Halaman 2**: `/checkout/payment-gateway` ⭐ NEW
- Menampilkan daftar payment gateway yang tersedia (iPaymu, Flip, Xendit)
- User memilih gateway yang diinginkan
- Klik "Lanjutkan" untuk proceed ke channel selection

**Halaman 3**: `/checkout/ipaymu-channels`
- Menampilkan semua channel iPaymu yang tersedia:
  - QRIS
  - Virtual Account (BCA, BNI, Mandiri, CIMB, Permata)
  - E-wallet & Convenience Store (GoPay, ShopeePay, Alfamart, Indomaret)
  - Credit Card
  - Debit Online
- User memilih channel yang diinginkan
- Klik "Lanjutkan Pembayaran" untuk create payment

**Halaman 4**: `/checkout/payment-result`
- Menampilkan detail pembayaran berhasil dibuat
- QR Code untuk QRIS (auto-generated dari qrCode string)
- Virtual Account number dengan tombol copy
- Payment URL untuk redirect ke iPaymu
- Instruksi cara pembayaran step-by-step
- Expired time countdown

### 4. Database Updates
**File**: `/packages/db/src/seed.ts`
- Added iPaymu gateway ke seed data

## 🎯 Alur Pembayaran

```
1. User pilih "Pembayaran Cepat" (payment_gateway)
   ↓
2. Redirect ke /checkout/payment-gateway
   ↓
3. Tampilkan daftar payment gateway:
   - iPaymu (general)
   - Flip (general)
   - Xendit (general)
   ↓
4. User pilih gateway (e.g., iPaymu)
   ↓
5. Redirect ke /checkout/ipaymu-channels
   ↓
6. Tampilkan semua channel iPaymu:
   - QRIS
   - Virtual Account (BCA, BNI, Mandiri, CIMB, Permata)
   - E-wallet (GoPay, ShopeePay)
   - Convenience Store (Alfamart, Indomaret)
   - Credit Card
   - Debit Online
   ↓
7. User pilih channel (e.g., "va:bca")
   ↓
8. User klik "Lanjutkan Pembayaran"
   ↓
9. API POST /v1/payments/create
   {
     "donationId": "xxx",
     "methodId": "ipaymu",
     "channel": "va:bca"
   }
   ↓
10. Backend create payment ke iPaymu API
   ↓
11. iPaymu return payment data:
    - Payment Code (VA number)
    - QR String (untuk QRIS)
    - Payment URL
    - Expired time
   ↓
12. Redirect ke /checkout/payment-result
   ↓
13. Tampilkan:
    - QR Code (jika QRIS)
    - VA Number dengan tombol copy (jika VA)
    - Payment URL (semua channel)
    - Instruksi pembayaran
    - Expired time
   ↓
14. User bayar melalui channel yang dipilih
   ↓
15. iPaymu kirim webhook ke /v1/payments/ipaymu/webhook
   ↓
16. Backend verify signature dan update donation status
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
  "methodId": "ipaymu",
  "channel": "va:bca"  // Format: "method:channel"
}
```

**Channel Format**:
- QRIS: `"qris:qris"`
- VA BCA: `"va:bca"`
- VA BNI: `"va:bni"`
- VA Mandiri: `"va:mandiri"`
- VA CIMB: `"va:cimb"`
- VA Permata: `"va:permata"`
- GoPay: `"cstore:gopay"`
- ShopeePay: `"cstore:shopeepay"`
- Alfamart: `"cstore:alfamart"`
- Indomaret: `"cstore:indomaret"`
- Credit Card: `"cc:cc"`
- Debit Online: `"online:online"`

### Webhook
```http
POST /v1/payments/ipaymu/webhook
X-Ipaymu-Signature: base64_encoded_signature
Content-Type: application/json

{
  "referenceId": "DNT-xxx-timestamp",
  "status": "success",
  "amount": 100000,
  "channel": "BCA",
  "via": "VA"
}
```

## ⚙️ Required Settings

Pastikan settings ini ada di database:
```sql
-- Enable iPaymu
payment_ipaymu_enabled = "true"

-- Credentials (dari iPaymu dashboard)
ipaymu_va = "0000005210626455"
ipaymu_api_key = "SANDBOXB9C9CCE9-..."
ipaymu_mode = "sandbox"  -- atau "production"
```

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd apps/web
npm install qrcode @types/qrcode
```

### 2. Add iPaymu Gateway ke Database
```bash
cd packages/db
npm run seed
```

Atau manual via SQL:
```sql
INSERT INTO payment_gateways (id, code, name, type, is_active, sort_order, created_at, updated_at)
VALUES (
  'ipaymu_' || substr(md5(random()::text), 1, 20),
  'ipaymu',
  'iPaymu',
  'auto',
  true,
  3,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;
```

### 3. Configure Webhook di iPaymu Dashboard
1. Login ke https://sandbox.ipaymu.com (atau production)
2. Menu: API Settings > Webhook
3. Set webhook URL:
   - Development: `https://your-ngrok-url/v1/payments/ipaymu/webhook`
   - Production: `https://api.bantuanku.org/v1/payments/ipaymu/webhook`

### 4. Test Payment Flow
1. Buat donasi baru
2. Pilih "Pembayaran Cepat"
3. Pilih payment gateway (misal: iPaymu)
4. Pilih channel (misal: VA BCA atau QRIS)
5. Klik "Lanjutkan Pembayaran"
6. Akan muncul halaman dengan VA number/QR Code dan instruksi
7. Test pembayaran di iPaymu sandbox
8. Webhook akan auto-update status donasi

## 🔧 Troubleshooting

### Payment creation gagal
```bash
# Check settings
SELECT * FROM settings WHERE key LIKE 'ipaymu%';

# Check if enabled
SELECT * FROM settings WHERE key = 'payment_ipaymu_enabled';

# Check gateway exists
SELECT * FROM payment_gateways WHERE code = 'ipaymu';
```

### Webhook tidak jalan
1. Verify webhook URL di iPaymu dashboard
2. Check server logs untuk incoming webhook
3. Verify signature validation logic
4. Test dengan curl:
```bash
curl -X POST https://your-api.com/v1/payments/ipaymu/webhook \
  -H "Content-Type: application/json" \
  -H "X-Ipaymu-Signature: test_signature" \
  -d '{"referenceId": "test", "status": "success"}'
```

### QR Code tidak muncul
1. Check if `qrCode` field ada di payment result
2. Verify QRCode package terinstall
3. Check browser console untuk error

## 📁 File Reference

| File | Purpose |
|------|---------|
| [ipaymu.ts](/apps/api/src/services/payment/ipaymu.ts) | Payment adapter dengan signature generation |
| [payments.ts](/apps/api/src/routes/payments.ts) | API routes untuk create payment dan webhook |
| [payment-method/page.tsx](/apps/web/src/app/checkout/payment-method/page.tsx) | Halaman pilih metode pembayaran (Bank/QRIS/Gateway) |
| [payment-gateway/page.tsx](/apps/web/src/app/checkout/payment-gateway/page.tsx) | ⭐ Halaman pilih payment gateway (iPaymu/Flip/Xendit) |
| [ipaymu-channels/page.tsx](/apps/web/src/app/checkout/ipaymu-channels/page.tsx) | Halaman pilih channel iPaymu (VA/QRIS/E-wallet) |
| [payment-result/page.tsx](/apps/web/src/app/checkout/payment-result/page.tsx) | Halaman hasil pembayaran dengan QR/VA |
| [seed.ts](/packages/db/src/seed.ts) | Database seed dengan iPaymu gateway |

## 🎨 UI Components

### Payment Method Card
- Icon: 💳 untuk Pembayaran Cepat
- Title: "Pembayaran Cepat"
- Description: "Virtual Account / E-wallet / QRIS"

### Channel Selection
- Grouped by category (QRIS, VA, E-wallet, etc.)
- Radio button selection
- Show fee information per channel
- Loading state saat create payment

### Payment Result
- Success checkmark icon ✅
- Order number dan expired time
- QR Code (auto-generated, 300x300px)
- VA number dengan copy button
- Payment URL button
- Step-by-step instructions
- Action buttons: Kembali ke Beranda, Lihat Status Donasi

## 🌐 Production Deployment

1. Update settings ke production:
```sql
UPDATE settings SET value = 'production' WHERE key = 'ipaymu_mode';
UPDATE settings SET value = 'YOUR_PROD_VA' WHERE key = 'ipaymu_va';
UPDATE settings SET value = 'YOUR_PROD_API_KEY' WHERE key = 'ipaymu_api_key';
```

2. Update webhook URL di iPaymu production dashboard

3. Test dengan real payment

4. Monitor webhook logs dan payment status updates

## 📊 Testing Checklist

- [ ] iPaymu gateway ada di database
- [ ] Settings configured (VA, API Key, Mode)
- [ ] Payment method "Pembayaran Cepat" muncul di checkout
- [ ] Channel selection page tampil dengan semua options
- [ ] Create payment berhasil (check API response)
- [ ] Payment result page tampil dengan benar
- [ ] QR Code muncul untuk QRIS
- [ ] VA number muncul untuk Virtual Account
- [ ] Copy button berfungsi
- [ ] Payment URL redirect ke iPaymu
- [ ] Webhook signature verification berhasil
- [ ] Donation status update otomatis setelah payment
- [ ] Email notification terkirim (jika configured)
