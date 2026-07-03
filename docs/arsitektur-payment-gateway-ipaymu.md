# Arsitektur Payment Gateway iPaymu

> Terakhir di-sync: 2026-07-02

---

## Overview

iPaymu adalah salah satu adapter payment gateway otomatis di Bantuanku. Implementasi aktual berada di backend Hono/TypeScript, bukan Laravel/PHP.

Source of truth implementasi saat ini:

- adapter: `apps/api/src/services/payment/ipaymu.ts`;
- API create/webhook: `apps/api/src/routes/payments.ts`;
- admin settings: `apps/admin/src/app/dashboard/settings/payments/page.tsx`;
- legacy checkout channel UI: `apps/web/src/app/checkout/ipaymu-channels/page.tsx`;
- gateway selection UI lama: `apps/web/src/app/checkout/payment-gateway/page.tsx`;
- seed gateway: `packages/db/src/seed.ts`.

Dokumen lama berikut sudah diserap dan dikoreksi:

- `dokumentasi-ipaymu.md`;
- `IPAYMU_SETUP.md`.
- `CHECK_IPAYMU_SETTINGS.sql`;
- `INSERT_IPAYMU_GATEWAY.sql`.

Catatan penting:

1. `dokumentasi-ipaymu.md` mayoritas salah untuk repo sekarang karena berisi arsitektur Laravel lama: controller PHP, Blade view, Laravel route, session Laravel, dan webhook `/ipaymu/notify`.
2. `IPAYMU_SETUP.md` lebih dekat dengan implementasi Next/Hono, tetapi masih punya beberapa klaim yang tidak sinkron dengan kode aktual.
3. Implementasi iPaymu saat ini ada, tetapi **flow checkout lama iPaymu belum sehat end-to-end** karena mismatch request body frontend vs API dan mismatch key environment admin vs API.

Dokumen terkait:

- `arsitektur-universal-payment.md` — payment methods umum, upload proof, transaksi pembayaran.
- `arsitektur-universal-payment.md` — invoice/universal payment route dan legacy checkout route.
- `arsitektur-transaksi.md` — transaction status dan payment status.
- `arsitektur-api-routing.md` — route `/v1/payments/:gateway/webhook`.
- `arsitektur-security.md` — signature webhook dan gap raw body.
- `arsitektur-observability-logging.md` — log verbose iPaymu.
- `arsitektur-frontend-ux-quality.md` — legacy checkout UX dan inline style.
- `arsitektur-payment-gateway-flip.md` — arsitektur gateway Flip terpisah.
- `arsitektur-payment-gateway-xendit.md` — arsitektur gateway Xendit terpisah.
- `arsitektur-payment-gateway-midtrans.md` — arsitektur gateway Midtrans terpisah.

---

## Pembanding Official iPaymu Aktif

Selain implementasi kode, dokumen ini juga membandingkan adapter terhadap dokumentasi resmi iPaymu yang aktif pada saat audit:

- halaman official: `https://ipaymu.com/dokumentasi-api/`;
- Postman official aktif: `https://documenter.getpostman.com/view/40296808/2sB3WtseBT?version=latest`;
- collection name: `iPaymu Public API v2`.

Kontrak official yang relevan:

| Area | Official iPaymu aktif | Implementasi Bantuanku saat ini | Status |
|------|------------------------|----------------------------------|--------|
| Production base URL | `https://my.ipaymu.com` | `https://app.ipaymu.com/api/v2` | Gap |
| Sandbox base URL | `https://sandbox.ipaymu.com` | `https://sandbox.ipaymu.com/api/v2` | Selaras secara host |
| Direct payment endpoint | `/api/v2/payment/direct` | `/api/v2/payment/direct` | Selaras |
| Payment channels endpoint | `GET /api/v2/payment-channels` | Belum ada endpoint internal; frontend memakai mock hardcoded | Gap |
| Request signature | SHA-256 payload, lalu HMAC SHA-256 atas `METHOD:VA:bodyHash:apiKey` dengan output hex | Sama untuk create payment JSON body | Selaras untuk create payment |
| Header request | `Content-Type`, `signature`, `va`, `timestamp` pada contoh official | `Content-Type`, `signature`, `va`; belum kirim `timestamp` | Gap |
| Direct payment notify URL | `notifyUrl` dikirim agar iPaymu mengirim callback/payment notification | Adapter mengirim `/v1/webhooks/ipaymu`, tetapi route aktual `/v1/payments/ipaymu/webhook` | Gap |
| Direct payment required buyer fields | `name`, `phone`, `email`, `amount`, `notifyUrl`, `referenceId`, `paymentMethod`, `paymentChannel` | Semua field utama dikirim, dengan fallback email/phone dummy jika kosong | Perlu kebijakan data |

Catatan:

1. Official collection memakai `https://my.ipaymu.com` sebagai production base URL dan `https://sandbox.ipaymu.com` sebagai sandbox base URL. Adapter sekarang memakai host production `app.ipaymu.com`, sehingga production readiness belum boleh dianggap valid tanpa verifikasi.
2. Official collection menampilkan header `timestamp` untuk direct payment dan payment channels. Adapter sekarang tidak mengirim header ini.
3. Official collection menyediakan endpoint `GET /api/v2/payment-channels`; ini membuktikan channel list hardcoded di frontend bukan source of truth provider.
4. Skema signature create payment adapter cocok dengan pola official untuk request JSON direct payment, tetapi signature webhook/callback belum terbukti sama dari collection yang diaudit. Webhook signature tetap perlu audit khusus terhadap dokumentasi callback iPaymu.

---

## Source of Truth Implementasi

| Area | File |
|------|------|
| iPaymu adapter | `apps/api/src/services/payment/ipaymu.ts` |
| Adapter factory | `apps/api/src/services/payment/index.ts` |
| Payment adapter types | `apps/api/src/services/payment/types.ts` |
| Payment methods/create/webhook route | `apps/api/src/routes/payments.ts` |
| Transaction payment schema | `packages/db/src/schema/transaction-payments.ts` |
| Gateway seed | `packages/db/src/seed.ts` |
| Insert helper lama | `packages/db/insert-ipaymu-gateway.ts` |
| Admin payment settings | `apps/admin/src/app/dashboard/settings/payments/page.tsx` |
| Legacy gateway selector | `apps/web/src/app/checkout/payment-gateway/page.tsx` |
| Legacy iPaymu channel page | `apps/web/src/app/checkout/ipaymu-channels/page.tsx` |
| Payment result legacy | `apps/web/src/app/checkout/payment-result/page.tsx` |
| i18n labels | `apps/web/src/lib/i18n/locales/id.ts`, `apps/web/src/lib/i18n/locales/en.ts` |

---

## Gateway Registration

Seed gateway ada di:

```text
packages/db/src/seed.ts
```

Seed membuat record:

| Field | Value |
|-------|-------|
| `code` | `ipaymu` |
| `name` | `iPaymu` |
| `type` | `auto` |
| `sortOrder` | `3` |

Ada script helper:

```text
packages/db/insert-ipaymu-gateway.ts
```

Script ini hanya insert gateway `ipaymu` ke tabel `payment_gateways` jika belum ada. Ini bukan flow runtime utama.

Root SQL lama `INSERT_IPAYMU_GATEWAY.sql` melakukan insert manual yang sama ke `payment_gateways`. File itu sudah tidak menjadi source of truth karena seed resmi ada di `packages/db/src/seed.ts` dan helper manual yang masih relevan ada di `packages/db/insert-ipaymu-gateway.ts`. Root SQL lama dihapus setelah mapping ini dicatat.

Root SQL lama `CHECK_IPAYMU_SETTINGS.sql` hanya query inspeksi `settings` dengan `key LIKE '%ipaymu%'`. Informasi expected key yang masih benar sudah diringkas di bagian Settings iPaymu dokumen ini; file SQL itu dihapus agar root tidak menjadi dokumentasi/operasional paralel.

Catatan penting:

1. `GET /v1/payments/methods` menampilkan iPaymu dari `settings.payment_ipaymu_enabled`, bukan dari tabel `payment_methods`.
2. `POST /v1/payments/create` tetap membutuhkan record `payment_gateways.code = "ipaymu"` untuk validasi gateway dan adapter creation.
3. Jadi klaim “payment gateways table tidak dipakai” tidak sepenuhnya benar untuk create/webhook gateway.

---

## Settings iPaymu

### Enable Provider

Admin toggle menyimpan:

```text
payment_ipaymu_enabled
```

Lokasi:

```text
apps/admin/src/app/dashboard/settings/payments/page.tsx
```

API `GET /v1/payments/methods` membaca key yang sama:

```ts
payment_ipaymu_enabled === "true"
```

Jika aktif, API mengembalikan metode:

```json
{
  "id": "ipaymu",
  "code": "ipaymu",
  "name": "iPaymu",
  "type": "payment_gateway",
  "programs": ["general"]
}
```

### Credentials

Admin form iPaymu menyimpan:

| Admin Key | Fungsi |
|-----------|--------|
| `payment_ipaymu_api_key` | API key iPaymu |
| `payment_ipaymu_va` | Virtual Account iPaymu |
| `payment_ipaymu_environment` | `production` atau `sandbox` |

API create/webhook membaca:

| API Key Dibaca | Fallback |
|----------------|----------|
| `payment_ipaymu_api_key` | `ipaymu_api_key` |
| `payment_ipaymu_va` | `ipaymu_va` |
| `payment_ipaymu_mode` | `ipaymu_mode`, default `sandbox` |

Gap kritikal:

```text
Admin menyimpan payment_ipaymu_environment
API membaca payment_ipaymu_mode / ipaymu_mode
```

Dampak:

1. Environment yang disimpan dari admin tidak dipakai oleh API.
2. iPaymu API akan default ke sandbox jika hanya memakai konfigurasi admin saat ini.
3. Production iPaymu membutuhkan key `payment_ipaymu_mode = "production"` atau `ipaymu_mode = "production"` dibuat manual, kecuali implementasi diperbaiki.

---

## Adapter iPaymu

Class:

```ts
IPaymuAdapter
```

Constructor:

```ts
constructor(credentials: GatewayCredentials, isProduction = false)
```

Mapping credential:

| Adapter Field | Source |
|---------------|--------|
| `va` | `credentials.merchantId` |
| `apiKey` | `credentials.secretKey` |
| `isProduction` | argumen factory dari route |

Base URL:

| Mode | Base URL |
|------|----------|
| production | `https://app.ipaymu.com/api/v2` |
| sandbox | `https://sandbox.ipaymu.com/api/v2` |

Gap official:

```text
Official iPaymu aktif memakai production base https://my.ipaymu.com
adapter memakai production base https://app.ipaymu.com/api/v2
```

Sebelum production, base URL adapter harus diverifikasi dan kemungkinan besar diubah menjadi:

```text
https://my.ipaymu.com/api/v2
```

Endpoint create payment:

```http
POST {baseUrl}/payment/direct
```

Header:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `va` | VA iPaymu |
| `signature` | HMAC signature dari adapter |

Gap official:

Official collection iPaymu mengirim header `timestamp`. Adapter belum mengirim `timestamp`, baik untuk direct payment maupun untuk endpoint lain yang nanti memakai signature.

---

## Signature Create Payment

Adapter membuat signature dengan langkah:

1. `bodyJson = JSON.stringify(body)`;
2. SHA-256 hash atas `bodyJson`;
3. string to sign:

```text
{method}:{va}:{bodyHash}:{apiKey}
```

4. HMAC SHA-256 dengan key `apiKey`;
5. output hex string.

Untuk create payment, method yang dipakai:

```text
POST
```

---

## Create Payment Request Body ke iPaymu

Adapter membuat `referenceId`:

```ts
`DNT-${request.donationId}-${Date.now()}`
```

Body yang dikirim ke iPaymu:

| Field | Source |
|-------|--------|
| `account` | VA iPaymu |
| `name` | `request.donorName` |
| `email` | `request.donorEmail || "donor@bantuanku.org"` |
| `phone` | `request.donorPhone || "08123456789"` |
| `amount` | `Number(request.amount)` |
| `notifyUrl` | `${APP_URL || "http://localhost:50245"}/v1/webhooks/ipaymu` |
| `expired` | `ceil(expiryMinutes / 60)`, default 24 jam |
| `referenceId` | `DNT-{transactionId}-{timestamp}` |
| `paymentMethod` | hasil parse channel |
| `paymentChannel` | hasil parse channel |
| `product` | `["Donation #{transactionId}"]` |
| `qty` | `[1]` |
| `price` | `[amount]` |

Gap kritikal:

```text
notifyUrl adapter masih /v1/webhooks/ipaymu
route aktual webhook adalah /v1/payments/ipaymu/webhook
```

Dampak:

1. Jika iPaymu memakai `notifyUrl` dari request create payment, webhook akan dikirim ke route yang tidak ada.
2. Jika webhook dikonfigurasi manual di dashboard iPaymu ke route aktual, masalah ini bisa tertutup.
3. Source of truth route aplikasi tetap `/v1/payments/ipaymu/webhook`.
4. Berdasarkan official docs, `notifyUrl` adalah jalur yang dipakai iPaymu untuk mengirim notifikasi pembayaran; jadi mismatch ini production blocker.

---

## Channel Mapping

Adapter menerima `methodCode` dan memetakan ke `paymentMethod` + `paymentChannel`.

Format utama:

```text
method:channel
```

Contoh:

| Input | paymentMethod | paymentChannel |
|-------|---------------|----------------|
| `qris:qris` | `qris` | `qris` |
| `va:bca` | `va` | `bca` |
| `va:bni` | `va` | `bni` |
| `cstore:gopay` | `cstore` | `gopay` |
| `cc:cc` | `cc` | `cc` |
| `online:online` | `online` | `online` |

Legacy mapping:

| Input | Output |
|-------|--------|
| `bca_va` | `va:bca` |
| `qris` | `qris:qris` |
| `gopay`, `ovo`, `dana`, `linkaja`, `shopeepay`, `alfamart`, `indomaret` | `cstore:{input}` |
| `credit_card`, `cc` | `cc:cc` |
| `online` | `online:online` |
| `cod` | `cod:cod` |
| unknown | fallback `qris:qris` |

Catatan official:

Official iPaymu aktif menyediakan endpoint `GET /api/v2/payment-channels`. Channel hardcoded di frontend legacy harus dianggap fallback sementara, bukan source of truth provider.

---

## API Create Payment

Endpoint:

```http
POST /v1/payments/create
```

Validasi body aktual:

```ts
{
  transactionId: string,
  methodId: string,
  channel?: string
}
```

Flow untuk `methodId = "ipaymu"`:

1. cari transaction by `transactionId`;
2. wajib `transactions.paymentStatus === "pending"`;
3. cari `paymentMethods.id = methodId`;
4. jika tidak ada, masuk settings-based gateway;
5. validasi `methodId` termasuk `xendit | ipaymu | flip`;
6. cek `payment_ipaymu_enabled === "true"`;
7. ambil credential dari settings;
8. cari `payment_gateways.code = "ipaymu"`;
9. buat adapter `createPaymentAdapter("ipaymu", credentials, isProduction)`;
10. panggil `adapter.createPayment()`;
11. insert `transaction_payments`;
12. update `transactions.paymentMethodId = "ipaymu"` dan `paymentStatus = "pending"`;
13. return `paymentId`, `paymentCode`, `paymentUrl`, `qrCode`, `expiredAt`.

Nominal yang dikirim:

```ts
txn.totalAmount + (txn.uniqueCode || 0)
```

Payment record:

| Field | Value |
|-------|-------|
| `transactionId` | transaction id |
| `amount` | total + unique code |
| `paymentMethod` | method name atau gateway code |
| `paymentChannel` | channel/methodCode |
| `externalId` | `result.externalId` |
| `paymentCode` | payment number/VA dari iPaymu |
| `paymentUrl` | URL pembayaran dari iPaymu |
| `qrCode` | QR string/image dari iPaymu |
| `gatewayCode` | `ipaymu` |
| `expiredAt` | expiry dari iPaymu |
| `status` | `pending` |

---

## Legacy Checkout iPaymu UI

Route:

```text
/checkout/ipaymu-channels
```

File:

```text
apps/web/src/app/checkout/ipaymu-channels/page.tsx
```

Behavior:

1. membaca `sessionStorage.pendingTransactions`;
2. memakai daftar channel mock hardcoded, bukan API iPaymu;
3. user memilih channel;
4. menyimpan `selectedPaymentChannel`;
5. memanggil `POST /v1/payments/create`;
6. menyimpan response ke `sessionStorage.paymentResult`;
7. redirect ke `/checkout/payment-result`.

Daftar channel UI saat ini:

- QRIS;
- Virtual Account: BCA, BNI, Mandiri, CIMB, Permata;
- E-wallet/convenience store: GoPay, ShopeePay, Alfamart, Indomaret;
- Credit Card;
- Debit Online.

Gap kritikal:

```ts
// frontend sekarang
{
  donationId: donationData[0].id,
  methodId: "ipaymu",
  channel: selectedChannel
}

// API sekarang mengharapkan
{
  transactionId: string,
  methodId: string,
  channel?: string
}
```

Dampak:

1. Request frontend legacy akan gagal validasi zod karena `transactionId` tidak dikirim.
2. Klaim lama “flow iPaymu lengkap” tidak benar terhadap implementasi saat ini.
3. Universal invoice flow perlu diaudit sebelum iPaymu dinyatakan production-ready.

---

## Gateway Selection UI Lama

Route:

```text
/checkout/payment-gateway
```

Behavior:

1. membaca `sessionStorage.pendingTransactions`;
2. fetch `GET /v1/payments/methods`;
3. filter `type === "payment_gateway"`;
4. jika user pilih `ipaymu`, route ke `/checkout/ipaymu-channels`;
5. jika pilih `flip`, route ke `/checkout/flip-channels`;
6. xendit menampilkan unavailable.

Route `/checkout/payment-method` juga bisa langsung skip ke `/checkout/ipaymu-channels` jika hanya satu gateway aktif dan gateway itu `ipaymu`.

Catatan:

1. Flow ini disebut legacy di `arsitektur-universal-payment.md`.
2. Checkout utama baru sudah mengarah ke route invoice `/invoice/{id}/payment-method`.
3. Jangan hapus route lama tanpa audit entry point/link lama.

---

## Webhook iPaymu

Route aktual:

```http
POST /v1/payments/ipaymu/webhook
```

Handler generic:

```text
apps/api/src/routes/payments.ts
paymentsRoute.post("/:gateway/webhook")
```

Untuk iPaymu:

1. cari `payment_gateways.code = "ipaymu"`;
2. baca settings credential;
3. parse JSON body;
4. ambil signature dari header:

```text
X-Callback-Token
X-Signature
X-Ipaymu-Signature
```

5. panggil `adapter.verifyWebhook(payload, signature)`;
6. parse webhook ke `externalId`, `status`, `paidAt`;
7. cari `transaction_payments.externalId = externalId`;
8. update payment dan transaction dalam DB transaction;
9. jalankan efek domain untuk campaign/qurban/qurban savings;
10. return success `{ received: true }`.

### Signature Webhook

Adapter iPaymu saat ini:

1. `bodyJson = JSON.stringify(payload)`;
2. HMAC SHA-256 dengan key `apiKey`;
3. convert binary HMAC ke base64;
4. compare dengan header signature.

Gap security:

1. Verifikasi memakai re-serialized JSON, bukan raw body.
2. Jika provider menandatangani raw body yang formatting/order-nya berbeda, signature valid bisa gagal.
3. Jika provider memakai skema signature berbeda dari implementasi ini, webhook akan selalu 401.
4. Official request signature untuk outbound API sudah terverifikasi sebagai hex HMAC, tetapi dokumen ini belum menemukan bukti official yang cukup untuk menyatakan signature callback sama dengan implementasi base64 HMAC saat ini.

### Webhook Status Mapping

Adapter `parseWebhook()`:

| Payload status | Parsed status |
|----------------|---------------|
| `success` | `success` |
| `paid` | `success` |
| `berhasil` | `success` |
| `expired` | `expired` |
| `kadaluarsa` | `expired` |
| lainnya | `failed` |

Route payment mapping:

| Parsed status | `transactions.paymentStatus` | `transaction_payments.status` |
|---------------|------------------------------|-------------------------------|
| `success` | `paid` | `verified` |
| `expired` | `cancelled` | `rejected` |
| `failed` | `pending` | `pending` |

Catatan: `failed` tidak mengubah transaction menjadi failed; tetap pending.

---

## Efek Domain Saat Webhook Success

Jika parsed status `success`:

| Domain | Efek |
|--------|------|
| Campaign | update `campaigns.collected += txn.subtotal`, `donorCount += 1` |
| Email | kirim email payment success jika `txn.donorEmail` dan `RESEND_API_KEY` ada |
| Qurban savings | jika `category = qurban_savings`, sync balance |
| Qurban shared group | jika `productType = qurban`, confirm shared group slot |
| Meta CAPI | kirim event `Purchase` async |

Gap:

1. Efek campaign memakai `txn.subtotal`, bukan amount paid penuh.
2. Tidak ada ledger/accounting posting khusus iPaymu di handler ini yang terlihat di kode route.
3. Email gagal tidak menggagalkan webhook.

---

## Logging dan Observability

Adapter iPaymu mencetak debug verbose:

- donation ID;
- amount original dan converted;
- payment method/channel;
- request body ke iPaymu;
- response iPaymu;
- fee/total;
- error message.

Gap:

1. Request/response gateway bisa mengandung data sensitif.
2. Tidak ada redaction formal untuk API key/VA/request data.
3. Tidak ada structured metric untuk success/failure/latency iPaymu.

Detail umum ada di `arsitektur-observability-logging.md`.

---

## Dokumen Lama yang Dikoreksi

### `dokumentasi-ipaymu.md`

Status: dihapus setelah dokumen ini dibuat.

Alasan:

1. Mengacu Laravel/PHP, bukan implementasi Next/Hono.
2. Menyebut route `/customer/payment/{order}/ipaymu`, `/ipaymu/notify`, `/ipaymu/proxy-qr`; route ini tidak ada di repo sekarang.
3. Menyebut controller `CustomerPaymentController`, `IPaymuWebhookController`, Blade view, dan Laravel session; tidak relevan dengan kode aktual.
4. Menyebut settings `payment_method_ipaymu`, `ipaymu_mode`; implementasi admin modern memakai `payment_ipaymu_enabled` dan `payment_ipaymu_environment`, sementara API membaca `payment_ipaymu_mode`.

### `IPAYMU_SETUP.md`

Status: dihapus setelah dokumen ini dibuat.

Alasan:

1. Lebih dekat ke implementasi modern, tetapi masih klaim “implementasi lengkap” padahal ada gap `donationId` vs `transactionId`.
2. Menyebut webhook flow benar `/v1/payments/ipaymu/webhook`, tetapi adapter create payment masih mengirim notify URL lama `/v1/webhooks/ipaymu`.
3. Menyebut required setting `ipaymu_mode`, sementara admin modern menyimpan `payment_ipaymu_environment`.
4. Isinya sudah dikompresi dan dikoreksi di dokumen ini.

---

## Gap Implementasi yang Tercatat

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| Production base URL adapter memakai `app.ipaymu.com`, official aktif memakai `my.ipaymu.com` | Payment production bisa gagal atau memakai endpoint lama/tidak resmi | Verifikasi ke iPaymu dan ubah adapter production base ke `https://my.ipaymu.com/api/v2` jika sesuai official |
| Adapter tidak mengirim header `timestamp` | Request bisa ditolak jika iPaymu mewajibkan timestamp sesuai official collection | Tambahkan timestamp generator dan masukkan ke signed request header |
| Frontend `/checkout/ipaymu-channels` kirim `donationId`, API wajib `transactionId` | Create payment gagal validasi | Samakan payload frontend ke `transactionId` atau ubah API schema dengan migrasi hati-hati |
| Admin simpan `payment_ipaymu_environment`, API baca `payment_ipaymu_mode`/`ipaymu_mode` | Mode admin tidak dipakai; API default sandbox | Samakan key environment/mode di admin dan API |
| Adapter `notifyUrl` memakai `/v1/webhooks/ipaymu` | Webhook dari iPaymu bisa masuk route tidak ada | Ubah notifyUrl ke `/v1/payments/ipaymu/webhook` |
| Channel list frontend mock hardcoded padahal official ada `GET /api/v2/payment-channels` | Tidak mencerminkan channel aktif merchant iPaymu | Tambah endpoint backend untuk proxy/cache payment channels iPaymu |
| Webhook signature memakai `JSON.stringify(payload)` dan base64 HMAC | Signature callback provider bisa gagal jika official callback berbeda | Verifikasi callback signature official iPaymu, lalu simpan raw body jika signature berbasis raw payload |
| `failed` webhook dipetakan ke pending | Payment gagal tidak tampak sebagai failed | Putuskan status mapping failed secara eksplisit |
| Debug log iPaymu terlalu verbose | Risiko PII/payment data bocor di log | Redact request/response dan matikan debug di production |
| Tidak ada test gateway iPaymu | Risiko flow rusak tidak terdeteksi | Tambah unit test adapter parse/signature dan integration test route |
| Universal invoice flow belum jelas memakai iPaymu end-to-end | iPaymu mungkin hanya aktif di legacy checkout | Audit dan sambungkan ke universal payment jika gateway ingin production |

---

## Rekomendasi Arsitektur

1. **Selaraskan adapter dengan official iPaymu aktif**: production base URL harus mengikuti `my.ipaymu.com` jika hasil verifikasi final sama dengan collection resmi.
2. **Tambahkan header `timestamp`** pada request signed iPaymu.
3. **Perbaiki contract create payment** sebelum iPaymu dianggap usable: frontend harus mengirim `transactionId`.
4. **Samakan settings key**: pilih `payment_ipaymu_mode` atau `payment_ipaymu_environment`, lalu update admin dan API.
5. **Ubah adapter notifyUrl** ke route webhook aktual.
6. **Ganti channel mock dengan endpoint provider**: backend perlu mengambil/proxy/cache `GET /api/v2/payment-channels`.
7. **Tambahkan test adapter iPaymu** untuk `parseMethodCode`, status mapping, signature outbound, signature webhook, response mapping, dan URL mode.
8. **Audit callback/webhook signature** terhadap dokumentasi resmi iPaymu sebelum production.
9. **Reduksi log sensitif** di adapter.
10. **Sambungkan gateway flow ke universal invoice route** atau tandai legacy checkout gateway sebagai deprecated.

---

## Contract yang Harus Dijaga

1. Gateway code iPaymu adalah `ipaymu`.
2. Route webhook aplikasi adalah `/v1/payments/ipaymu/webhook`.
3. `POST /v1/payments/create` saat ini berbasis `transactionId`, bukan `donationId`.
4. Record payment gateway `ipaymu` harus ada di `payment_gateways`.
5. Enable provider memakai `payment_ipaymu_enabled`.
6. Credential utama adalah VA dan API key.
7. `expired` dari webhook dipetakan ke transaction `cancelled`.
8. Dokumentasi Laravel/PHP lama tidak boleh dipakai sebagai referensi implementasi repo sekarang.
9. Pembanding eksternal iPaymu harus memakai official docs aktif, bukan catatan lama internal.
