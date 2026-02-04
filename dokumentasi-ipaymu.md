# Dokumentasi Sistem Pembayaran iPaymu

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [File-File Utama](#file-file-utama)
4. [Flow Pembayaran](#flow-pembayaran)
5. [Konfigurasi](#konfigurasi)
6. [Endpoints & Routes](#endpoints--routes)
7. [Service Layer](#service-layer)
8. [Controller Layer](#controller-layer)
9. [Views & Frontend](#views--frontend)
10. [Webhook & Notifikasi](#webhook--notifikasi)
11. [Security](#security)
12. [Testing](#testing)
13. [Error Handling](#error-handling)

---

## 🎯 Overview

Sistem pembayaran iPaymu adalah integrasi payment gateway yang memungkinkan customer melakukan pembayaran melalui berbagai metode pembayaran seperti:
- **Virtual Account** (BCA, BNI, Mandiri, BRI, dll)
- **QRIS** (Quick Response Indonesian Standard)
- **E-Wallet** (GoPay, OVO, Dana, dll)
- **Credit/Debit Card**
- **Retail Outlet** (Alfamart, Indomaret)

### Fitur Utama
- ✅ Multi-channel payment (VA, QRIS, E-wallet, dll)
- ✅ Automatic payment verification via webhook
- ✅ Real-time payment status update
- ✅ Encrypted credentials storage
- ✅ Sandbox & Production mode
- ✅ QR Code generation untuk QRIS
- ✅ Payment URL untuk redirect ke iPaymu
- ✅ Support untuk DP (Down Payment) dan Full Payment

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER (Browser)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   STOREFRONT ROUTES                          │
│  /customer/payment/{order}/ipaymu                            │
│  /customer/payment/{order}/ipaymu/create                     │
│  /customer/payment/{order}/ipaymu/result                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            CustomerPaymentController                         │
│  - ipaymu()           : Show payment channel selection       │
│  - createIpaymuPayment() : Create payment transaction        │
│  - ipaymuResult()     : Show payment result                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    IPaymuService                             │
│  - getPaymentChannels() : Get available methods              │
│  - createPayment()      : Create transaction                 │
│  - validateSignature()  : Validate webhook                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               iPaymu API (External)                          │
│  Sandbox: https://sandbox.ipaymu.com/api/v2                 │
│  Production: https://app.ipaymu.com/api/v2                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ (Webhook Callback)
┌─────────────────────────────────────────────────────────────┐
│            IPaymuWebhookController                           │
│  - notify() : Handle payment notification                    │
│  - proxyQr() : Proxy QR image to avoid CORS                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Update Order & Payment                          │
│  - Create Payment record                                     │
│  - Update Order status                                       │
│  - Create LedgerEntry                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File-File Utama

### Backend Files

#### 1. Service Layer
**File:** `app/Services/IPaymuService.php`
- Core service untuk komunikasi dengan iPaymu API
- Handle authentication & signature generation
- Manage payment channels & transactions

#### 2. Controllers
**File:** `app/Http/Controllers/Customer/CustomerPaymentController.php`
- `ipaymu()` - Menampilkan halaman pilihan metode pembayaran
- `createIpaymuPayment()` - Membuat transaksi pembayaran
- `ipaymuResult()` - Menampilkan hasil pembayaran

**File:** `app/Http/Controllers/IPaymuWebhookController.php`
- `notify()` - Handle webhook dari iPaymu
- `proxyQr()` - Proxy QR image untuk menghindari CORS

**File:** `app/Http/Controllers/Admin/SettingsController.php`
- Manage iPaymu credentials (VA, API Key, Mode)

#### 3. Routes
**File:** `app/routes/storefront.php`
```php
Route::get('/customer/payment/{order}/ipaymu', [CustomerPaymentController::class, 'ipaymu'])
    ->name('customer.payment.ipaymu');

Route::post('/customer/payment/{order}/ipaymu/create', [CustomerPaymentController::class, 'createIpaymuPayment'])
    ->name('customer.payment.ipaymu.create');

Route::get('/customer/payment/{order}/ipaymu/result', [CustomerPaymentController::class, 'ipaymuResult'])
    ->name('customer.payment.ipaymu-result');
```

**File:** `app/routes/web.php`
```php
Route::get('/ipaymu/proxy-qr', [IPaymuWebhookController::class, 'proxyQr'])
    ->name('ipaymu.proxy-qr');

Route::post('/ipaymu/notify', [IPaymuWebhookController::class, 'notify'])
    ->name('ipaymu.notify');
```

### Frontend Files

#### 1. Views
**File:** `app/resources/views/storefront/customer/payment/ipaymu.blade.php`
- Halaman pilihan metode pembayaran iPaymu
- Menampilkan available payment channels
- Form untuk memilih channel (VA, QRIS, E-wallet, dll)

**File:** `app/resources/views/storefront/customer/payment/ipaymu-result.blade.php`
- Halaman hasil pembayaran
- Menampilkan QR Code untuk QRIS
- Menampilkan Virtual Account number
- Menampilkan Payment URL

#### 2. Styles
**File:** `app/resources/scss/pages/_payment.scss`
- Styling untuk halaman pembayaran iPaymu
- Mobile-first responsive design
- Classes: `.ipaymu-payment`, `.ipaymu-channel-option`, `.ipaymu-result`, dll

---

## 🔄 Flow Pembayaran

### 1. Customer Flow

```
1. Customer memilih metode pembayaran iPaymu
   ↓
2. Sistem menampilkan available payment channels
   (GET /customer/payment/{order}/ipaymu)
   ↓
3. Customer memilih channel (e.g., BCA VA, QRIS, GoPay)
   ↓
4. Customer submit form
   (POST /customer/payment/{order}/ipaymu/create)
   ↓
5. Sistem memanggil IPaymuService->createPayment()
   ↓
6. IPaymuService mengirim request ke iPaymu API
   ↓
7. iPaymu API mengembalikan payment data:
   - Virtual Account number
   - QRIS string/image
   - Payment URL
   - Reference ID
   - Expiry time
   ↓
8. Data disimpan di session
   ↓
9. Redirect ke halaman result
   (GET /customer/payment/{order}/ipaymu/result)
   ↓
10. Tampilkan payment instructions kepada customer
```

### 2. Payment Verification Flow

```
1. Customer melakukan pembayaran di aplikasi/platform yang dipilih
   (Mobile Banking, E-wallet, QRIS Scanner, dll)
   ↓
2. iPaymu memverifikasi pembayaran
   ↓
3. iPaymu mengirim webhook notification ke sistem
   (POST /ipaymu/notify)
   ↓
4. IPaymuWebhookController->notify() menerima webhook
   ↓
5. Validasi signature webhook
   ↓
6. Extract Order ID dari reference ID
   ↓
7. Cek status pembayaran (success/paid)
   ↓
8. Database Transaction:
   a. Create Payment record
   b. Update Order->paid_amount
   c. Update Order->status
   d. Create LedgerEntry (income)
   ↓
9. Return success response ke iPaymu
   ↓
10. Customer dapat melihat status order ter-update
```

### 3. Admin Configuration Flow

```
1. Admin login ke admin panel
   ↓
2. Navigasi ke Settings > Payment Methods
   ↓
3. Enable iPaymu payment method
   ↓
4. Click tab "Pengaturan iPaymu"
   ↓
5. Input credentials:
   - VA Number
   - API Key
   - Mode (Sandbox/Production)
   ↓
6. Submit form (POST /admin/settings/payment)
   ↓
7. Credentials di-encrypt dan disimpan di database (settings table)
```

---

## ⚙️ Konfigurasi

### Database Settings

Konfigurasi iPaymu disimpan di table `settings` dengan keys:

| Key | Type | Description | Encrypted |
|-----|------|-------------|-----------|
| `ipaymu_va` | string | Virtual Account number dari iPaymu | ✅ Yes |
| `ipaymu_api_key` | string | API Key dari iPaymu dashboard | ✅ Yes |
| `ipaymu_mode` | string | `sandbox` atau `production` | ❌ No |
| `payment_method_ipaymu` | boolean | Enable/disable iPaymu payment method | ❌ No |

### Environment Variables

Tidak ada environment variable yang diperlukan. Semua konfigurasi disimpan di database melalui Settings model.

### Mendapatkan Credentials

#### Sandbox (Testing)
1. Daftar di https://sandbox.ipaymu.com
2. Login ke dashboard
3. Dapatkan VA dan API Key di menu API Settings
4. Mode: `sandbox`

#### Production (Live)
1. Daftar merchant di https://ipaymu.com
2. Login ke https://my.ipaymu.com
3. Dapatkan VA dan API Key di menu API Settings
4. Mode: `production`

### API Endpoints

**Sandbox:**
```
Base URL: https://sandbox.ipaymu.com/api/v2
```

**Production:**
```
Base URL: https://app.ipaymu.com/api/v2
```

---

## 🛣️ Endpoints & Routes

### Customer-Facing Routes

#### 1. Payment Selection Page
```
Method: GET
Route:  /customer/payment/{order}/ipaymu
Name:   customer.payment.ipaymu
Auth:   Signed URL or auth:customer
```

**Query Parameters:**
- `expires` - Unix timestamp untuk signed URL
- `signature` - Signature untuk validasi signed URL

**Response:** Blade view dengan available payment channels

**Example URL:**
```
http://127.0.0.1:8080/customer/payment/28/ipaymu?expires=1770686988&signature=f216174f...
```

---

#### 2. Create Payment Transaction
```
Method: POST
Route:  /customer/payment/{order}/ipaymu/create
Name:   customer.payment.ipaymu.create
Auth:   Signed URL or auth:customer
```

**Request Body:**
```php
[
    'payment_channel' => 'va:bca',  // Format: {method}:{channel}
    '_token' => '...'
]
```

**Payment Channel Format:**
- VA BCA: `va:bca`
- VA BNI: `va:bni`
- QRIS: `qris:qris`
- GoPay: `cstore:gopay`
- OVO: `cstore:ovo`

**Response:** Redirect to payment result page

---

#### 3. Payment Result Page
```
Method: GET
Route:  /customer/payment/{order}/ipaymu/result
Name:   customer.payment.ipaymu-result
Auth:   Signed URL or auth:customer
```

**Response:** Blade view dengan payment instructions

**Data Ditampilkan:**
- Payment Number (VA/Code)
- QR Code (untuk QRIS)
- Payment URL
- Expiry time
- Total amount
- Instructions

---

### Webhook Routes

#### 1. Payment Notification Webhook
```
Method: POST
Route:  /ipaymu/notify
Name:   ipaymu.notify
Auth:   None (validated by signature)
```

**Headers:**
```
X-Ipaymu-Signature: {base64_encoded_signature}
Content-Type: application/json
```

**Request Body:**
```json
{
    "referenceId": "ORD-28-1738584988",
    "status": "success",
    "amount": 150000,
    "channel": "BCA",
    "via": "VA",
    "payment_no": "8123456789012345",
    "transactionId": "TRX123456789"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Payment processed"
}
```

---

#### 2. QR Image Proxy
```
Method: GET
Route:  /ipaymu/proxy-qr
Name:   ipaymu.proxy-qr
Auth:   None
```

**Query Parameters:**
- `url` - URL QR image dari iPaymu

**Purpose:** Menghindari CORS error ketika menampilkan QR image dari iPaymu

**Example:**
```
GET /ipaymu/proxy-qr?url=https://sandbox.ipaymu.com/qr/abc123.png
```

---

### Admin Routes

#### Settings Page
```
Method: GET
Route:  /admin/settings
Name:   admin.settings.index
Auth:   auth (admin)
```

#### Update Payment Settings
```
Method: POST
Route:  /admin/settings/payment
Name:   admin.settings.payment.update
Auth:   auth (admin)
```

**Request Body:**
```php
[
    'payment_method_ipaymu' => true,  // checkbox
    'ipaymu_va' => '0000005210626455',
    'ipaymu_api_key' => 'SANDBOXB9C9CCE9-...',
    'ipaymu_mode' => 'sandbox',  // or 'production'
]
```

---

## 🔧 Service Layer

### IPaymuService Class

**Location:** `app/Services/IPaymuService.php`

#### Constructor
```php
public function __construct()
```
- Load credentials dari database (Settings)
- Set base URL based on mode
- Throw exception jika credentials tidak dikonfigurasi

---

#### getPaymentChannels()
```php
public function getPaymentChannels(): array
```

**Purpose:** Mendapatkan daftar payment channels yang tersedia

**API Endpoint:** `GET /payment-channels`

**Signature Generation:**
```php
$bodyHash = strtolower(hash('sha256', '{}'));
$stringToSign = 'GET:' . $va . ':' . $bodyHash . ':' . $apiKey;
$signature = hash_hmac('sha256', $stringToSign, $apiKey);
```

**Response:**
```php
[
    'Success' => true,
    'Data' => [
        [
            'Code' => 'va',
            'Name' => 'Virtual Account',
            'Channels' => [
                [
                    'Code' => 'bca',
                    'Name' => 'BCA Virtual Account',
                    'Logo' => 'https://...',
                    'FeatureStatus' => 'active',
                    'TransactionFee' => [
                        'ActualFee' => 5000,
                        'ActualFeeType' => 'FLAT'
                    ]
                ],
                // ... more channels
            ]
        ],
        // ... more methods
    ]
]
```

---

#### createPayment()
```php
public function createPayment(
    $orderId,
    $amount,
    $customerEmail,
    $customerName,
    $customerPhone = '08123456789',
    $paymentMethod = 'va',
    $paymentChannel = 'bni'
): array
```

**Purpose:** Membuat transaksi pembayaran baru

**API Endpoint:** `POST /payment/direct`

**Request Body:**
```php
[
    'account' => $this->va,
    'name' => $customerName,
    'email' => $customerEmail,
    'phone' => $customerPhone,
    'amount' => (int) $amount,
    'notifyUrl' => route('ipaymu.notify'),
    'expired' => 24, // 24 hours
    'referenceId' => 'ORD-' . $orderId . '-' . time(),
    'paymentMethod' => $paymentMethod,
    'paymentChannel' => $paymentChannel,
    'product' => ['Order #' . $orderId],
    'qty' => [1],
    'price' => [(int) $amount],
]
```

**Signature Generation:**
```php
$bodyJson = json_encode($body, JSON_UNESCAPED_SLASHES);
$bodyHash = strtolower(hash('sha256', $bodyJson));
$stringToSign = 'POST:' . $va . ':' . $bodyHash . ':' . $apiKey;
$signature = hash_hmac('sha256', $stringToSign, $apiKey);
```

**Response:**
```php
[
    'Success' => true,
    'Data' => [
        'ReferenceId' => 'ORD-28-1738584988',
        'PaymentNo' => '8123456789012345',
        'PaymentName' => 'BCA Virtual Account',
        'Via' => 'VA',
        'Channel' => 'BCA',
        'QrImage' => 'https://...',        // untuk QRIS
        'QrString' => '00020101021...',    // untuk QRIS
        'QrTemplate' => 'https://...',     // untuk QRIS
        'PaymentUrl' => 'https://my.ipaymu.com/payment/...',
        'Expired' => '2025-02-04 12:00:00',
        'Fee' => 5000,
        'Total' => 155000,
    ]
]
```

---

#### validateSignature()
```php
public function validateSignature($data, $signature): bool
```

**Purpose:** Validasi signature dari webhook iPaymu

**Algorithm:**
```php
$computedSignature = hash_hmac('sha256', json_encode($data), $apiKey, true);
$encodedSignature = base64_encode($computedSignature);
return hash_equals($encodedSignature, $signature);
```

---

#### checkTransactionStatus()
```php
public function checkTransactionStatus($referenceId): array
```

**Purpose:** Cek status transaksi manual (optional)

**API Endpoint:** `POST /transaction/check`

---

#### getTransactionHistory()
```php
public function getTransactionHistory($limit = 10): array
```

**Purpose:** Get riwayat transaksi (optional, untuk admin)

**API Endpoint:** `GET /transaction/history`

---

## 🎮 Controller Layer

### CustomerPaymentController

**Location:** `app/Http/Controllers/Customer/CustomerPaymentController.php`

#### ipaymu()
```php
public function ipaymu(Order $order): View|RedirectResponse
```

**Flow:**
1. Authorize payment access (signed URL atau auth customer)
2. Check if iPaymu enabled
3. Calculate payment amount (DP atau full)
4. Get available payment channels dari IPaymuService
5. Return view dengan channels data

**View Data:**
```php
[
    'order' => $order,
    'paymentAmount' => $paymentAmount,
    'isDpPayment' => $isDpPayment,
    'channels' => $channels,
    'paymentRoutes' => $this->paymentRoutes($order),
]
```

---

#### createIpaymuPayment()
```php
public function createIpaymuPayment(Order $order): RedirectResponse
```

**Flow:**
1. Authorize payment access
2. Validate iPaymu enabled
3. Calculate payment amount
4. Parse selected payment channel (format: `method:channel`)
5. Call IPaymuService->createPayment()
6. Save result data to session
7. Redirect to result page

**Session Data:**
```php
session([
    'ipaymu_transaction_' . $order->id => [
        'reference_id' => '...',
        'payment_no' => '...',
        'payment_name' => '...',
        'via' => '...',
        'channel' => '...',
        'qr_image' => '...',
        'qr_string' => '...',
        'payment_url' => '...',
        'expired' => '...',
        'amount' => '...',
        'fee' => '...',
        'total' => '...',
    ]
]);
```

---

#### ipaymuResult()
```php
public function ipaymuResult(Order $order): View|RedirectResponse
```

**Flow:**
1. Authorize payment access
2. Get transaction data from session
3. Return view dengan payment instructions

---

### IPaymuWebhookController

**Location:** `app/Http/Controllers/IPaymuWebhookController.php`

#### notify()
```php
public function notify(Request $request): JsonResponse
```

**Flow:**
1. Get signature dari header `X-Ipaymu-Signature`
2. Validate signature menggunakan IPaymuService
3. Extract Order ID dari reference ID
4. Find Order by ID
5. Check payment status (`success` atau `paid`)
6. **Database Transaction:**
   - Create Payment record
   - Update Order paid_amount
   - Update Order status (waiting_dp → dp_paid, atau → paid)
   - Create LedgerEntry
7. Return JSON response

**Status Mapping:**
```php
// For Preorder
if ($order->status === 'waiting_dp' && $totalPaid >= $order->dp_amount) {
    $order->status = 'dp_paid';
}
if ($totalPaid >= $order->total_amount) {
    $order->status = 'paid';
}

// For Regular Order
if ($totalPaid >= $order->total_amount) {
    $order->status = 'paid';
} elseif ($totalPaid > 0) {
    $order->status = 'dp_paid';
}
```

**Error Handling:**
- Invalid signature → 401 Unauthorized
- Invalid reference ID → 400 Bad Request
- Order not found → 404 Not Found
- Exception → 500 Internal Server Error

---

#### proxyQr()
```php
public function proxyQr(Request $request)
```

**Flow:**
1. Get URL dari query parameter
2. Validate URL format
3. Check URL domain (must be ipaymu.com)
4. Fetch image from URL
5. Return image with proper headers

**Security:**
- Only allow iPaymu domains
- Validate URL format
- Set proper cache headers

---

## 🎨 Views & Frontend

### ipaymu.blade.php

**Location:** `app/resources/views/storefront/customer/payment/ipaymu.blade.php`

**Struktur:**

1. **Header Section**
   - Back button ke payment selection
   - Title "Pembayaran iPaymu"

2. **Payment Summary Card**
   - Jumlah yang harus dibayar
   - Order number
   - DP atau full payment indicator

3. **Info Card**
   - Icon payment
   - Description

4. **Payment Channels Selection**
   - Loop through payment methods
   - Radio button untuk setiap channel
   - Logo channel (jika ada)
   - Fee information
   - Hanya tampilkan channel dengan `FeatureStatus: active`

5. **Action Buttons**
   - Submit: "Lanjutkan Pembayaran"
   - Back: "Kembali ke Detail Pesanan"

**Form Structure:**
```html
<form method="POST" action="{{ $paymentRoutes['ipaymuCreate'] }}">
    @csrf
    
    <!-- Loop channels -->
    <input type="radio" 
           name="payment_channel" 
           value="va:bca" 
           required>
    
    <button type="submit">Lanjutkan Pembayaran</button>
</form>
```

---

### ipaymu-result.blade.php

**Location:** `app/resources/views/storefront/customer/payment/ipaymu-result.blade.php`

**Struktur:**

1. **Header Section**
   - Back button
   - Title "Detail Pembayaran"

2. **Success Icon**
   - Checkmark icon
   - "Pembayaran Berhasil Dibuat"
   - Instructions

3. **Order Info Card**
   - Order number
   - Payment method & channel
   - Total amount
   - Expiry time

4. **Payment Details** (Conditional)

   **a. QRIS Payment:**
   ```html
   <div class="ipaymu-qr-card">
       <div id="qrcode-container"></div>
       <script>
           new QRCode(container, {
               text: '{{ $transaction['qr_string'] }}',
               width: 280,
               height: 280
           });
       </script>
   </div>
   ```

   **b. Virtual Account:**
   ```html
   <div class="ipaymu-va-card">
       <div class="ipaymu-va-card__number">
           {{ $transaction['payment_no'] }}
           <button onclick="copyToClipboard(...)">Copy</button>
       </div>
   </div>
   ```

   **c. Payment URL:**
   ```html
   <a href="{{ $transaction['payment_url'] }}" target="_blank">
       Buka Halaman Pembayaran
   </a>
   ```

5. **Instructions**
   - Step-by-step cara pembayaran

6. **Action Buttons**
   - Kembali ke detail pesanan
   - Hubungi CS via WhatsApp

**JavaScript Features:**
- QR Code generation using qrcode.min.js
- Copy to clipboard functionality
- Visual feedback untuk copy action

---

### Styling

**Location:** `app/resources/scss/pages/_payment.scss`

**Key Classes:**

```scss
// Payment page
.ipaymu-payment { }
.ipaymu-payment-header { }
.ipaymu-info-card { }
.ipaymu-methods-card { }
.ipaymu-channel-list { }
.ipaymu-channel-option { }
.ipaymu-actions { }

// Result page
.ipaymu-result { }
.ipaymu-result-header { }
.ipaymu-success-icon { }
.ipaymu-order-info { }
.ipaymu-qr-card { }
.ipaymu-va-card { }
.ipaymu-link-card { }
.ipaymu-instructions { }
```

**Design Principles:**
- Mobile-first responsive
- Touch-friendly buttons (min 44px height)
- Clear visual hierarchy
- Accessible colors & contrast
- Smooth transitions
- Loading states

---

## 🔔 Webhook & Notifikasi

### Webhook URL Configuration

**Webhook URL yang harus di-set di iPaymu dashboard:**

**Sandbox:**
```
https://yourdomain.com/ipaymu/notify
```

**Production:**
```
https://yourdomain.com/ipaymu/notify
```

### Webhook Request Format

**Headers:**
```
X-Ipaymu-Signature: eyJhbGc...
Content-Type: application/json
```

**Body:**
```json
{
    "referenceId": "ORD-28-1738584988",
    "status": "success",
    "amount": 150000,
    "channel": "BCA",
    "via": "VA",
    "payment_no": "8123456789012345",
    "transactionId": "TRX123456789",
    "timestamp": "2025-02-03 15:30:00"
}
```

### Signature Validation

**Algorithm:**
```php
// Compute HMAC-SHA256
$computedSignature = hash_hmac(
    'sha256',
    json_encode($data),
    $apiKey,
    true  // raw binary output
);

// Encode to base64
$encodedSignature = base64_encode($computedSignature);

// Compare
if (hash_equals($encodedSignature, $receivedSignature)) {
    // Valid
}
```

### Webhook Response

**Success:**
```json
{
    "success": true,
    "message": "Payment processed"
}
```

**Error:**
```json
{
    "success": false,
    "message": "Invalid signature"
}
```

### Testing Webhook

**Menggunakan ngrok (untuk local development):**

1. Install ngrok
2. Run ngrok:
   ```bash
   ngrok http 8080
   ```
3. Copy forwarding URL (e.g., `https://abc123.ngrok.io`)
4. Set di iPaymu dashboard: `https://abc123.ngrok.io/ipaymu/notify`

**Manual Testing:**

```bash
curl -X POST http://127.0.0.1:8080/ipaymu/notify \
  -H "Content-Type: application/json" \
  -H "X-Ipaymu-Signature: YOUR_SIGNATURE" \
  -d '{
    "referenceId": "ORD-28-1738584988",
    "status": "success",
    "amount": 150000,
    "channel": "BCA",
    "via": "VA"
  }'
```

### Logging

Semua webhook events di-log ke Laravel log:

```php
Log::info('iPaymu webhook: Payment successful', [
    'order_id' => $order->id,
    'amount' => $amount,
    'reference_id' => $referenceId,
]);

Log::warning('iPaymu webhook: Invalid signature', [
    'data' => $data,
    'signature' => $signature,
]);

Log::error('iPaymu webhook error: ' . $e->getMessage(), [
    'exception' => $e,
    'data' => $request->all(),
]);
```

---

## 🔒 Security

### 1. Credential Encryption

**Storage:** Database table `settings`

**Encryption:** Laravel's built-in encryption

```php
// Setting encrypted value
Setting::setEncrypted('ipaymu_va', '0000005210626455');
Setting::setEncrypted('ipaymu_api_key', 'SANDBOXB9C9CCE9-...');

// Getting decrypted value
$va = Setting::get('ipaymu_va');  // Auto-decrypts
$apiKey = Setting::get('ipaymu_api_key');  // Auto-decrypts
```

**Encryption Key:** `APP_KEY` dalam `.env`

⚠️ **Important:** Jangan ubah `APP_KEY` setelah credentials disimpan!

---

### 2. Signature Validation

**Purpose:** Memastikan webhook benar-benar dari iPaymu

**Algorithm:** HMAC-SHA256

```php
$signature = hash_hmac('sha256', $stringToSign, $apiKey);
```

**Validation:**
```php
if (!$ipaymuService->validateSignature($data, $signature)) {
    return response()->json(['success' => false], 401);
}
```

---

### 3. CSRF Protection

**Forms:** Semua form menggunakan `@csrf` token

```blade
<form method="POST" action="...">
    @csrf
    <!-- form fields -->
</form>
```

**Webhook Route:** Webhook route dikecualikan dari CSRF (karena dari external)

---

### 4. Signed URLs

**Payment URLs:** Menggunakan signed URLs untuk non-authenticated access

```php
$url = URL::temporarySignedRoute(
    'customer.payment.ipaymu',
    now()->addDays(7),
    ['order' => $order->id]
);
```

**Validation:**
```php
if (!request()->hasValidSignature()) {
    abort(403, 'Unauthorized');
}
```

---

### 5. Authorization

**Customer Access Control:**
```php
// Authenticated customer
if (auth('customer')->check()) {
    if ($order->customer_id !== auth('customer')->id()) {
        abort(403);
    }
}

// Guest with signed URL
if (!request()->hasValidSignature()) {
    abort(403);
}
```

---

### 6. Input Validation

**Payment Creation:**
```php
$request->validate([
    'payment_channel' => 'required|string',
]);
```

**Settings:**
```php
$request->validate([
    'ipaymu_va' => 'required|string|max:20',
    'ipaymu_api_key' => 'required|string|max:255',
    'ipaymu_mode' => 'required|in:sandbox,production',
]);
```

---

### 7. XSS Prevention

**Blade Escaping:**
```blade
{{ $transaction['payment_no'] }}  <!-- Auto-escaped -->
{!! $unsafeContent !!}            <!-- Raw output -->
```

---

### 8. SQL Injection Prevention

**Eloquent ORM:** Automatically escapes queries

```php
Order::find($orderId);  // Safe
Payment::create([...]);  // Safe
```

---

## 🧪 Testing

### Manual Testing Flow

#### 1. Setup Sandbox

1. Register at https://sandbox.ipaymu.com
2. Get credentials (VA & API Key)
3. Configure in admin panel (mode: sandbox)

#### 2. Test Payment Creation

1. Create order as customer
2. Go to order detail
3. Click "Bayar Sekarang"
4. Select "iPaymu"
5. Choose payment channel (e.g., BCA VA)
6. Click "Lanjutkan Pembayaran"
7. Verify payment details displayed correctly

#### 3. Test VA Payment

**Sandbox Test Numbers:**
- BCA: Use any amount
- BNI: Use specific test VA numbers
- Mandiri: Use specific test VA numbers

**Webhook akan auto-trigger dalam sandbox environment**

#### 4. Test QRIS Payment

1. Select QRIS channel
2. QR Code should be displayed
3. Screenshot QR or use test QRIS scanner
4. Payment notification should arrive

#### 5. Test Webhook

**Using Postman/curl:**

```bash
curl -X POST http://localhost:8080/ipaymu/notify \
  -H "Content-Type: application/json" \
  -H "X-Ipaymu-Signature: $(echo -n '{"referenceId":"ORD-28-1738584988","status":"success","amount":150000}' | openssl dgst -sha256 -hmac 'YOUR_API_KEY' -binary | base64)" \
  -d '{
    "referenceId": "ORD-28-1738584988",
    "status": "success",
    "amount": 150000,
    "channel": "BCA",
    "via": "VA"
  }'
```

#### 6. Verify Order Status

After webhook:
1. Check order detail
2. Order status should be updated (dp_paid or paid)
3. Payment record should be created
4. Ledger entry should be created

---

### Automated Testing

**PHPUnit Test Cases:**

```php
// tests/Feature/IPaymuPaymentTest.php

public function test_customer_can_view_ipaymu_payment_page()
{
    $order = Order::factory()->create();
    
    $response = $this->actingAs($order->customer, 'customer')
        ->get(route('customer.payment.ipaymu', $order));
    
    $response->assertOk();
    $response->assertViewIs('storefront.customer.payment.ipaymu');
}

public function test_customer_can_create_ipaymu_payment()
{
    $order = Order::factory()->create();
    
    $response = $this->actingAs($order->customer, 'customer')
        ->post(route('customer.payment.ipaymu.create', $order), [
            'payment_channel' => 'va:bca',
        ]);
    
    $response->assertRedirect();
    $this->assertNotNull(session('ipaymu_transaction_' . $order->id));
}

public function test_webhook_updates_order_status()
{
    $order = Order::factory()->create([
        'status' => 'waiting_dp',
        'total_amount' => 150000,
    ]);
    
    $referenceId = 'ORD-' . $order->id . '-' . time();
    
    $data = [
        'referenceId' => $referenceId,
        'status' => 'success',
        'amount' => 150000,
        'channel' => 'BCA',
        'via' => 'VA',
    ];
    
    $signature = $this->generateSignature($data);
    
    $response = $this->postJson(route('ipaymu.notify'), $data, [
        'X-Ipaymu-Signature' => $signature,
    ]);
    
    $response->assertOk();
    $this->assertEquals('paid', $order->fresh()->status);
}
```

---

### Test Data

**Sandbox Test Credentials:**
```
VA: 0000005210626455
API Key: SANDBOXB9C9CCE9-...
Mode: sandbox
```

**Test Order:**
```php
Order ID: 28
Amount: Rp 150,000
Customer: test@example.com
```

**Test Payment Channels:**
- BCA VA: `va:bca`
- BNI VA: `va:bni`
- QRIS: `qris:qris`
- GoPay: `cstore:gopay`

---

## ⚠️ Error Handling

### Common Errors & Solutions

#### 1. Credentials Not Configured

**Error:**
```
iPaymu credentials tidak dikonfigurasi di settings
```

**Solution:**
- Login ke admin panel
- Configure VA & API Key di Settings

---

#### 2. Invalid Signature

**Error:**
```
Invalid signature
```

**Causes:**
- Wrong API Key
- Request body modified
- Webhook dari source tidak valid

**Solution:**
- Verify API Key in settings
- Check webhook logs
- Validate request source

---

#### 3. Payment Channel Not Available

**Error:**
```
Tidak ada metode pembayaran tersedia
```

**Causes:**
- API request failed
- No active channels in iPaymu account
- Network issue

**Solution:**
- Check internet connection
- Verify credentials
- Check iPaymu dashboard for active channels

---

#### 4. Order Not Found

**Error:**
```
Order not found
```

**Causes:**
- Invalid order ID in reference ID
- Order deleted

**Solution:**
- Check reference ID format
- Verify order exists in database

---

#### 5. Payment Already Processed

**Behavior:** Webhook received multiple times

**Solution:**
- Check if payment already exists before creating
- Use idempotency key (reference ID)

```php
$existingPayment = Payment::where('order_id', $order->id)
    ->where('status', 'verified')
    ->where('notes', 'like', '%' . $referenceId . '%')
    ->first();

if ($existingPayment) {
    return response()->json(['success' => true, 'message' => 'Already processed']);
}
```

---

#### 6. CORS Error on QR Image

**Error:**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:** Use proxy endpoint

```blade
<img src="{{ route('ipaymu.proxy-qr', ['url' => $qrImage]) }}">
```

---

### Error Logging

**Lokasi Log:** `storage/logs/laravel.log`

**Log Levels:**
- `Log::info()` - Successful operations
- `Log::warning()` - Invalid requests, signature failures
- `Log::error()` - Exceptions, critical errors

**Log Format:**
```
[2025-02-03 15:30:00] local.INFO: iPaymu webhook: Payment successful
{
    "order_id": 28,
    "amount": 150000,
    "reference_id": "ORD-28-1738584988"
}
```

---

## 📊 Database Schema

### Settings Table

```sql
CREATE TABLE settings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**iPaymu Related Keys:**
```sql
INSERT INTO settings (key, value, is_encrypted) VALUES
('ipaymu_va', 'encrypted:...', 1),
('ipaymu_api_key', 'encrypted:...', 1),
('ipaymu_mode', 'sandbox', 0),
('payment_method_ipaymu', '1', 0);
```

---

### Payments Table

```sql
CREATE TABLE payments (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

**iPaymu Payment Record:**
```sql
INSERT INTO payments (order_id, amount, method, status, notes, paid_at) VALUES
(28, 150000.00, 'ipaymu', 'verified', 'Pembayaran via iPaymu - BCA', NOW());
```

---

### Ledger Entries Table

```sql
CREATE TABLE ledger_entries (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    entry_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    reference_id BIGINT UNSIGNED NULL,
    reference_type VARCHAR(50) NULL,
    source_type VARCHAR(50) NULL,
    source_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**iPaymu Ledger Entry:**
```sql
INSERT INTO ledger_entries (entry_date, type, category_id, description, amount, reference_id, reference_type, source_type, source_id) VALUES
(NOW(), 'income', 1, 'Pembayaran iPaymu order #ORD-000028', 150000.00, 28, 'order', 'payment', 123);
```

---

## 🚀 Deployment Checklist

### Pre-Production

- [ ] Test all payment channels in sandbox
- [ ] Verify webhook receives correctly
- [ ] Test order status updates
- [ ] Test ledger entries creation
- [ ] Verify email notifications
- [ ] Test with various amounts
- [ ] Test expiry scenarios
- [ ] Test concurrent payments

### Production Setup

1. **Get Production Credentials**
   - [ ] Register merchant di ipaymu.com
   - [ ] Verify business documents
   - [ ] Get production VA & API Key

2. **Configure Application**
   - [ ] Update credentials di admin panel
   - [ ] Set mode to `production`
   - [ ] Verify webhook URL in iPaymu dashboard
   - [ ] Update HTTPS certificate (webhook requires HTTPS)

3. **Security**
   - [ ] Verify SSL certificate valid
   - [ ] Check firewall settings
   - [ ] Enable rate limiting
   - [ ] Monitor webhook logs

4. **Testing**
   - [ ] Test with real small amount (e.g., Rp 10,000)
   - [ ] Verify webhook in production
   - [ ] Test multiple payment methods
   - [ ] Verify refund process (if applicable)

5. **Monitoring**
   - [ ] Setup error monitoring (Sentry, etc)
   - [ ] Setup webhook delivery monitoring
   - [ ] Setup payment success rate monitoring
   - [ ] Setup daily reconciliation

---

## 📞 Support & Resources

### iPaymu Resources

**Documentation:**
- API Docs: https://ipaymu.com/dokumentasi-api/
- Sandbox: https://sandbox.ipaymu.com
- Production Dashboard: https://my.ipaymu.com

**Support:**
- Email: support@ipaymu.com
- Phone: +62 21 xxxx xxxx
- Live Chat: Available di dashboard

### Internal Resources

**Code Location:**
```
app/
├── Services/
│   └── IPaymuService.php
├── Http/Controllers/
│   ├── Customer/CustomerPaymentController.php
│   └── IPaymuWebhookController.php
└── resources/views/storefront/customer/payment/
    ├── ipaymu.blade.php
    └── ipaymu-result.blade.php

routes/
├── web.php (webhook routes)
└── storefront.php (customer routes)
```

**Related Documentation:**
- Order System: `STEP3-INTEGRATION-GUIDE.md`
- Payment Methods: Admin Settings Panel
- Ledger System: `03-toko_ambu_financial_ledger_system_blueprint.md`

---

## 🔄 Maintenance & Monitoring

### Daily Checks

1. **Payment Success Rate**
   ```sql
   SELECT 
       COUNT(*) as total_attempts,
       SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as successful,
       (SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
   FROM payments
   WHERE method = 'ipaymu'
   AND DATE(created_at) = CURDATE();
   ```

2. **Webhook Delivery**
   - Check webhook logs for failures
   - Retry failed webhooks manually if needed

3. **Order Status Sync**
   - Check orders stuck in `waiting_payment`
   - Manual check with iPaymu dashboard

### Weekly Tasks

1. **Reconciliation**
   - Compare payment records with iPaymu transaction history
   - Resolve discrepancies

2. **Performance Review**
   - Check average payment completion time
   - Identify slow payment channels

3. **Customer Feedback**
   - Review customer support tickets related to payments
   - Identify common issues

### Monthly Tasks

1. **Security Audit**
   - Review webhook logs for suspicious activity
   - Check for repeated failed signature validations
   - Update API keys if needed (rotation)

2. **Feature Usage**
   - Analyze which payment channels are most popular
   - Consider promoting/removing channels

3. **Cost Analysis**
   - Calculate total payment fees
   - Compare with alternative payment gateways

---

## 🎓 Best Practices

### 1. Always Handle Webhooks Idempotently

```php
// Check if payment already processed
$existingPayment = Payment::where('order_id', $orderId)
    ->where('method', 'ipaymu')
    ->where('status', 'verified')
    ->first();

if ($existingPayment) {
    return response()->json(['success' => true, 'message' => 'Already processed']);
}
```

### 2. Use Database Transactions

```php
DB::transaction(function () use ($order, $amount) {
    // Create payment
    $payment = Payment::create([...]);
    
    // Update order
    $order->update([...]);
    
    // Create ledger entry
    LedgerEntry::create([...]);
});
```

### 3. Log Everything

```php
Log::info('iPaymu payment initiated', [
    'order_id' => $order->id,
    'amount' => $amount,
    'channel' => $paymentChannel,
]);
```

### 4. Validate Before Processing

```php
// Validate payment amount
if ($webhookAmount != $expectedAmount) {
    Log::warning('Amount mismatch', [...]);
    return response()->json(['success' => false], 400);
}
```

### 5. Use Proper Error Messages

```php
// User-friendly messages
return redirect()->back()
    ->with('error', 'Gagal membuat pembayaran. Silakan coba lagi.');

// Detailed logging
Log::error('iPaymu API error', [
    'exception' => $e->getMessage(),
    'order_id' => $order->id,
]);
```

### 6. Keep Credentials Secure

```php
// Never log credentials
Log::info('Payment created', [
    'order_id' => $order->id,
    // Don't log: 'api_key' => $apiKey
]);
```

### 7. Test Before Deploying

- Test with minimum amount
- Test all payment channels
- Test webhook with ngrok
- Test error scenarios

---

## 📝 Changelog

### Version 1.0.0 (2025-02-03)
- ✅ Initial iPaymu integration
- ✅ Support untuk VA, QRIS, E-wallet
- ✅ Webhook notification handling
- ✅ Admin configuration panel
- ✅ Mobile-first responsive UI
- ✅ Encrypted credentials storage
- ✅ Sandbox & Production mode
- ✅ QR Code generation
- ✅ Payment URL support

### Future Improvements
- [ ] Refund support
- [ ] Recurring payments
- [ ] Payment installments
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Customer payment history

---

## 📄 License

Internal documentation untuk Toko Ambu application.

---

**Last Updated:** 3 Februari 2025
**Maintained By:** Development Team
**Version:** 1.0.0
