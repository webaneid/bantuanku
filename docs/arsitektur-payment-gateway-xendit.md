# Arsitektur Payment Gateway Xendit

> Terakhir di-sync: 2026-07-02

---

## Overview

Xendit adalah adapter payment gateway otomatis yang sudah ada di backend Bantuanku, tetapi pada audit ini **belum terbukti usable end-to-end dari frontend**.

Source of truth implementasi saat ini:

- adapter: `apps/api/src/services/payment/xendit.ts`;
- API create/webhook: `apps/api/src/routes/payments.ts`;
- admin settings: `apps/admin/src/app/dashboard/settings/payments/page.tsx`;
- gateway seed: `packages/db/src/seed.ts`;
- frontend gateway selector: `apps/web/src/app/checkout/payment-method/page.tsx`, `apps/web/src/app/checkout/payment-gateway/page.tsx`.

Status arsitektur:

1. Adapter Xendit ada dan didaftarkan di adapter factory.
2. `GET /v1/payments/methods` bisa menampilkan Xendit jika `payment_xendit_enabled = "true"`.
3. `POST /v1/payments/create` punya branch `methodId = "xendit"`, tetapi membaca key settings yang berbeda dari key yang disimpan admin modern.
4. Frontend single-gateway path bisa redirect ke `/checkout/xendit-channels`, tetapi route itu tidak ada.
5. Frontend multi-gateway path eksplisit menampilkan toast “Xendit belum tersedia”.
6. Jadi Xendit harus dianggap **adapter parsial / dormant**, bukan gateway production-ready.

Dokumen terkait:

- `arsitektur-universal-payment.md` — payment methods umum.
- `arsitektur-universal-payment.md` — universal invoice dan legacy checkout.
- `arsitektur-transaksi.md` — payment status dan transaction status.
- `arsitektur-api-routing.md` — route `/v1/payments/:gateway/webhook`.
- `arsitektur-security.md` — webhook token, secret leakage, dan replay/IP allowlist.
- `arsitektur-observability-logging.md` — logging payment gateway.
- `arsitektur-payment-gateway-ipaymu.md` — gateway iPaymu.
- `arsitektur-payment-gateway-flip.md` — gateway Flip.
- `arsitektur-payment-gateway-midtrans.md` — gateway Midtrans.

---

## Pembanding Official Xendit Aktif

Dokumen ini membandingkan implementasi terhadap official Xendit docs aktif:

- main docs: `https://docs.xendit.co/`;
- API quick setup: `https://docs.xendit.co/apidocs`;
- Payments API overview: `https://docs.xendit.co/docs/payments-via-api-overview.md`;
- One-off payment: `https://docs.xendit.co/docs/pay-one-off-payment.md`;
- Payments API webhooks: `https://docs.xendit.co/docs/payments-api-webhooks.md`;
- BCA Virtual Account: `https://docs.xendit.co/docs/bca-virtual-account.md`;
- QRIS: `https://docs.xendit.co/docs/qris.md`.

Kontrak official yang relevan:

| Area | Official Xendit aktif | Implementasi Bantuanku saat ini | Status |
|------|------------------------|----------------------------------|--------|
| API auth | Basic Auth, secret key sebagai username, password kosong, tetap pakai colon sebelum Base64 | `Basic ${btoa(secretKey + ":")}` | Selaras |
| HTTPS | Semua request API harus HTTPS | Semua endpoint adapter memakai `https://api.xendit.co` | Selaras |
| Test/live key | Secret key test/live dikelola di dashboard | Admin punya environment, tetapi API tidak membaca key environment modern | Gap |
| Recommended guest checkout | Payments API `/payment_requests` type `PAY` | Adapter memakai product-specific endpoints legacy/separate: VA, e-wallet charge, QR code | Gap arsitektur |
| Payment action handling | `actions` bisa `REDIRECT_CUSTOMER` atau `PRESENT_TO_CUSTOMER` | Adapter e-wallet baca `actions.mobile_deeplink_checkout_url` / `desktop_web_checkout_url`; QRIS baca `qr_string`; VA baca account number | Sebagian selaras |
| Webhook v3 | event seperti `payment.capture`, `payment.failure`; payload utama di `data` | Adapter parse status flat di root payload | Gap untuk Payments API v3 |
| VA min amount | BCA VA min Rp10.000, max Rp50.000.000 | Adapter tidak guard min/max per channel | Gap guard |
| QRIS amount | QRIS min 1, max Rp10.000.000, expiry request 48 jam di docs channel | Adapter membuat dynamic QR dengan `expires_at` dari internal expiry default 24 jam | Perlu verifikasi endpoint legacy |
| Callback token | Xendit memakai callback token untuk memverifikasi webhook | Adapter compare header token dengan setting | Selaras untuk legacy callback-token model |

Catatan:

1. Official Xendit docs aktif mengarahkan integrasi guest checkout ke Payments API `/payment_requests`. Adapter Bantuanku belum mengikuti kontrak ini.
2. Endpoint yang dipakai adapter (`/callback_virtual_accounts`, `/ewallets/charges`, `/qr_codes`) terlihat sebagai integrasi product-specific lama/terpisah. Dokumen ini tidak menghapus fakta implementasi, tetapi menandainya sebagai gap terhadap arsitektur official aktif.
3. Jika Xendit ingin diaktifkan lagi, keputusan pertama adalah: lanjutkan adapter legacy product-specific dengan test, atau migrasi ke Payments API v3.

---

## Source of Truth Implementasi

| Area | File |
|------|------|
| Xendit adapter | `apps/api/src/services/payment/xendit.ts` |
| Adapter factory | `apps/api/src/services/payment/index.ts` |
| Payment adapter types | `apps/api/src/services/payment/types.ts` |
| Payment methods/create/webhook route | `apps/api/src/routes/payments.ts` |
| Transaction payment schema | `packages/db/src/schema/transaction-payments.ts` |
| Gateway seed | `packages/db/src/seed.ts` |
| Admin payment settings | `apps/admin/src/app/dashboard/settings/payments/page.tsx` |
| Legacy payment method route | `apps/web/src/app/checkout/payment-method/page.tsx` |
| Legacy payment gateway route | `apps/web/src/app/checkout/payment-gateway/page.tsx` |
| Environment example | `.env.example` |

---

## Gateway Registration

Seed gateway di `packages/db/src/seed.ts` membuat:

| Field | Value |
|-------|-------|
| `code` | `xendit` |
| `name` | `Xendit` |
| `type` | `auto` |
| `sortOrder` | `2` |

Runtime create payment tetap membutuhkan record `payment_gateways.code = "xendit"`.

---

## Settings Xendit

Admin UI menyimpan:

| Setting | Fungsi |
|---------|--------|
| `payment_xendit_enabled` | enable Xendit di daftar payment methods |
| `payment_xendit_api_key` | API key / secret key Xendit menurut UI |
| `payment_xendit_webhook` | webhook token menurut UI |
| `payment_xendit_environment` | `production` atau `sandbox` |

API membaca:

| Kebutuhan API | Key yang dibaca |
|---------------|-----------------|
| Secret key | `payment_xendit_secret_key` atau `xendit_secret_key` |
| Callback token | `payment_xendit_callback_token` atau `xendit_callback_token` |
| Environment | tidak dibaca untuk Xendit |

Gap kritikal:

```text
Admin simpan payment_xendit_api_key
API baca payment_xendit_secret_key

Admin simpan payment_xendit_webhook
API baca payment_xendit_callback_token

Admin simpan payment_xendit_environment
API tidak memakai environment untuk Xendit
```

Dampak:

1. Xendit yang dikonfigurasi dari admin modern tetap dianggap belum punya credential oleh API.
2. Toggle `payment_xendit_enabled` bisa membuat Xendit tampil di payment methods, tetapi create payment gagal 500.
3. Environment production/sandbox di admin tidak punya efek runtime.
4. Placeholder admin `xnd_public_...` juga membingungkan karena adapter membutuhkan secret key untuk Basic Auth.

---

## Adapter Xendit

Class:

```ts
XenditAdapter
```

Constructor:

```ts
constructor(credentials: GatewayCredentials)
```

Mapping credential:

| Adapter Field | Source |
|---------------|--------|
| `secretKey` | `credentials.secretKey` |
| `callbackToken` | `credentials.callbackToken` |

Auth header:

```text
Basic Base64(secretKey + ":")
```

Base URL:

```text
https://api.xendit.co
```

Catatan:

1. Tidak ada pemisahan sandbox/production URL di adapter. Xendit membedakan test/live melalui API key, bukan base URL berbeda pada implementasi ini.
2. `.env.example` masih punya `XENDIT_SECRET_KEY` dan `XENDIT_IS_PRODUCTION`, tetapi runtime payment route membaca settings table, bukan env var tersebut.

---

## Create Payment Routing

Adapter memilih endpoint dari `request.methodCode`:

| methodCode | Flow |
|------------|------|
| mengandung `va` | `createVA()` |
| `ovo`, `dana`, `linkaja`, `shopeepay` | `createEwallet()` |
| `qris` | `createQris()` |
| selain itu | unsupported |

Gap:

1. `GET /v1/payments/methods` hanya mengembalikan gateway `xendit`, bukan channel-level method seperti `bca_va`, `qris`, atau `dana`.
2. Tidak ada frontend Xendit channel page yang memilih `methodCode`.
3. Jika frontend mengirim `methodId = "xendit"` tanpa `channel`, route memakai `methodCode = methodId`, lalu adapter mengembalikan `Unsupported payment method`.

---

## Virtual Account Flow

Endpoint adapter:

```http
POST https://api.xendit.co/callback_virtual_accounts
```

Request body:

| Field | Value |
|-------|-------|
| `external_id` | `DNT-{transactionId}-{timestamp}` |
| `bank_code` | `methodCode.replace("_va", "").toUpperCase()` |
| `name` | donor name dipotong 50 karakter |
| `expected_amount` | amount |
| `expiration_date` | ISO timestamp |
| `is_single_use` | `true` |

Response mapping:

| Response | Simpan |
|----------|--------|
| `id` | `externalId` |
| `account_number` | `paymentCode` |
| internal `expiredAt` | `expiredAt` |

Gap official:

1. Official channel docs menyebut BCA VA channel code `BCA_VIRTUAL_ACCOUNT`, sementara adapter menerima pola legacy seperti `bca_va`.
2. Official Xendit Payments API v3 memakai `channel_code` dan `channel_properties` dalam `/payment_requests`, bukan endpoint `callback_virtual_accounts`.
3. Adapter tidak guard min/max amount per bank.

---

## E-Wallet Flow

Endpoint adapter:

```http
POST https://api.xendit.co/ewallets/charges
```

Request body:

| Field | Value |
|-------|-------|
| `reference_id` | `DNT-{transactionId}-{timestamp}` |
| `currency` | `IDR` |
| `amount` | amount |
| `checkout_method` | `ONE_TIME_PAYMENT` |
| `channel_code` | `ID_{METHODCODE}` |
| `channel_properties.mobile_number` | donor phone |
| `success_redirect_url` | hardcoded `https://bantuanku.org/donation/success` |
| `failure_redirect_url` | hardcoded `https://bantuanku.org/donation/failed` |

Response mapping:

| Response | Simpan |
|----------|--------|
| `id` | `externalId` |
| `actions.mobile_deeplink_checkout_url` atau `actions.desktop_web_checkout_url` | `paymentUrl` |
| internal `expiredAt` | `expiredAt` |

Gap:

1. Redirect URL hardcoded ke `bantuanku.org`, tidak memakai `FRONTEND_URL`, tenant setting, atau current domain.
2. Tidak ada validasi donor phone, padahal e-wallet channel sering membutuhkan nomor HP valid.
3. Official Payments API v3 juga memakai actions, tetapi dengan kontrak `/payment_requests`, bukan endpoint e-wallet legacy ini.

---

## QRIS Flow

Endpoint adapter:

```http
POST https://api.xendit.co/qr_codes
```

Request body:

| Field | Value |
|-------|-------|
| `reference_id` | `DNT-{transactionId}-{timestamp}` |
| `type` | `DYNAMIC` |
| `currency` | `IDR` |
| `amount` | amount |
| `expires_at` | ISO timestamp |

Response mapping:

| Response | Simpan |
|----------|--------|
| `id` | `externalId` |
| `qr_string` | `qrCode` |
| internal `expiredAt` | `expiredAt` |

Gap official:

1. Official QRIS docs menyebut min amount 1 dan max Rp10.000.000; adapter tidak guard limit.
2. Official docs channel menyebut payment request expiry 48 jam; adapter default internal expiry 24 jam.
3. Perlu verifikasi apakah endpoint `/qr_codes` legacy masih sesuai dengan account Xendit yang dipakai.

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

Flow untuk `methodId = "xendit"`:

1. cari transaction by `transactionId`;
2. wajib `transactions.paymentStatus === "pending"`;
3. cari `paymentMethods.id = methodId`;
4. jika tidak ada, masuk settings-based gateway;
5. validasi `methodId` termasuk `xendit | ipaymu | flip`;
6. ambil credential Xendit dari settings legacy;
7. cari `payment_gateways.code = "xendit"`;
8. buat adapter `createPaymentAdapter("xendit", credentials)`;
9. panggil adapter dengan `methodCode = channel || methodId`;
10. insert `transaction_payments` status `pending`;
11. update transaction `paymentStatus = "pending"`;
12. return `paymentId`, `paymentCode`, `paymentUrl`, `qrCode`, `expiredAt`.

Status aktual:

1. Flow ini bisa bekerja hanya jika settings legacy diisi manual dan frontend/API mengirim channel yang cocok.
2. Flow ini tidak usable dari admin + web UI modern tanpa perbaikan.

---

## Frontend Flow

`apps/web/src/app/checkout/payment-method/page.tsx`:

1. jika hanya ada satu gateway dan gateway itu Xendit, route ke `/checkout/xendit-channels`;
2. route `/checkout/xendit-channels` tidak ada.

`apps/web/src/app/checkout/payment-gateway/page.tsx`:

1. jika user pilih Xendit, kode tidak membuat payment;
2. UI menampilkan toast `checkout.common.xenditUnavailable`.

Kesimpulan:

```text
Xendit bisa muncul sebagai pilihan payment_gateway,
tetapi frontend tidak punya flow untuk menyelesaikan payment Xendit.
```

---

## Webhook Xendit

Route aktual:

```http
POST /v1/payments/xendit/webhook
```

Handler generic:

```text
apps/api/src/routes/payments.ts
paymentsRoute.post("/:gateway/webhook")
```

Untuk Xendit:

1. cari `payment_gateways.code = "xendit"`;
2. baca settings legacy credential;
3. parse JSON body;
4. ambil signature dari header:

```text
X-Callback-Token
X-Signature
X-Ipaymu-Signature
```

5. adapter membandingkan signature/header dengan `callbackToken`;
6. parse webhook menjadi `externalId`, `status`, `paidAt`;
7. cari `transaction_payments.externalId = externalId`;
8. update payment dan transaction seperti gateway lain.

Gap:

1. Header fallback `X-Ipaymu-Signature` tidak relevan untuk Xendit, meskipun tidak fatal.
2. Tidak ada support eksplisit untuk Payments API v3 webhook shape `{ event, data: { ... } }`.
3. Jika Xendit webhook v3 mengirim `data.payment_request_id` atau `data.reference_id`, parser sekarang tidak mengambilnya karena hanya membaca root `external_id | reference_id | id`.

---

## Webhook Status Mapping

Adapter `parseWebhook()`:

| Payload status | Parsed status |
|----------------|---------------|
| `PAID` | `success` |
| `SETTLED` | `success` |
| `SUCCEEDED` | `success` |
| `COMPLETED` | `success` |
| `EXPIRED` | `expired` |
| lainnya | `failed` |

Route payment mapping:

| Parsed status | `transactions.paymentStatus` | `transaction_payments.status` |
|---------------|------------------------------|-------------------------------|
| `success` | `paid` | `verified` |
| `expired` | `cancelled` | `rejected` |
| `failed` | `pending` | `pending` |

Gap official:

1. Payments API v3 event `payment.capture` berisi status `SUCCEEDED` di dalam `data`.
2. Payments API v3 event `payment.failure` berisi status `FAILED` di dalam `data`.
3. Parser flat-root saat ini tidak kompatibel dengan bentuk nested v3.

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

Gap sama seperti gateway lain:

1. Efek campaign memakai `txn.subtotal`, bukan amount paid penuh.
2. Tidak ada ledger/accounting posting khusus Xendit yang terlihat di route payment.
3. Email gagal tidak menggagalkan webhook.

---

## Security dan Observability

Yang sudah benar:

1. Secret key tidak dikirim ke frontend.
2. Auth adapter sesuai Basic Auth Xendit.
3. Webhook callback token diverifikasi.

Gap:

1. Settings key mismatch membuat admin user bisa menyangka Xendit sudah terkonfigurasi padahal API tidak membaca key itu.
2. Tidak ada IP allowlist/replay protection eksplisit.
3. Tidak ada parser/mapper webhook khusus Payments API v3.
4. Error provider dikembalikan sebagai string dari adapter dan route create mengubahnya menjadi HTTP 400; detail provider bisa bocor ke client.
5. Tidak ada test gateway Xendit.

Rujukan detail:

- `arsitektur-security.md`;
- `arsitektur-observability-logging.md`.

---

## Gap Implementasi yang Tercatat

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| Admin simpan `payment_xendit_api_key`, API baca `payment_xendit_secret_key` | Create payment gagal walau admin sudah mengisi API key | Samakan key admin/API; gunakan nama `secret_key` jika memang secret |
| Admin simpan `payment_xendit_webhook`, API baca `payment_xendit_callback_token` | Webhook token tidak terbaca | Samakan key callback token |
| Admin environment tidak dipakai API | Toggle sandbox/production tidak berefek | Dokumentasikan bahwa Xendit environment ditentukan oleh API key, atau pakai key berbeda per environment |
| Placeholder admin `xnd_public_...` untuk API key | User bisa memasukkan public key, padahal adapter butuh secret key | Ubah label/placeholder menjadi Secret Key |
| Tidak ada `/checkout/xendit-channels` | Single gateway Xendit redirect ke 404 | Buat route atau jangan route ke path ini |
| Multi gateway Xendit ditandai unavailable | Xendit tidak usable dari UI | Putuskan: disable Xendit dari methods atau implement channel flow |
| Adapter memakai endpoint product-specific, official aktif mengarahkan guest checkout ke `/payment_requests` | Kontrak arsitektur tertinggal dari official docs | Putuskan migrasi Payments API v3 atau pertahankan legacy dengan test |
| `methodCode` butuh channel tetapi frontend tidak mengirim channel | Adapter return unsupported | Tambah channel selector atau gunakan Payment Request unified action model |
| Webhook parser belum support nested v3 `{ event, data }` | Webhook Payments API v3 tidak akan match payment | Tambah parser v3 jika migrasi |
| Redirect URL e-wallet hardcoded `bantuanku.org` | Tenant/domain salah, flow redirect rusak | Pakai frontend URL dari settings/env |
| Limit amount per channel tidak dijaga | Request bisa ditolak provider | Tambah guard min/max per channel |
| Tidak ada test gateway Xendit | Risiko regresi tidak terdeteksi | Tambah unit/integration tests |

---

## Rekomendasi Arsitektur

1. **Jangan anggap Xendit aktif production.** Saat ini lebih tepat disebut dormant adapter.
2. **Tentukan arah integrasi.** Jika ingin mengikuti official aktif, desain ulang ke Payments API v3 `/payment_requests`; jika ingin cepat menghidupkan adapter lama, perbaiki key mismatch + channel UI + webhook legacy.
3. **Samakan settings admin/API lebih dulu.** Ini blocker paling dasar.
4. **Disable Xendit dari frontend jika belum siap.** Jangan biarkan method tampil lalu gagal/404.
5. **Buat Xendit channel/flow yang eksplisit.** Untuk legacy adapter, UI harus mengirim `bca_va`, `qris`, `dana`, dll.; untuk Payments API v3, UI harus menangani `actions`.
6. **Tambah parser webhook v3 jika migrasi.** Parser harus baca `event` dan `data`.
7. **Hapus hardcoded redirect URL.** Gunakan `FRONTEND_URL`, tenant setting, atau invoice route aktual.
8. **Tambah test Xendit.** Minimal auth header, settings key, unsupported method, VA/e-wallet/QRIS request body, webhook token, status mapping.

---

## Contract yang Harus Dijaga

1. Gateway code Xendit adalah `xendit`.
2. Route webhook aplikasi adalah `/v1/payments/xendit/webhook`.
3. `POST /v1/payments/create` berbasis `transactionId`.
4. Record payment gateway `xendit` harus ada di `payment_gateways`.
5. Enable provider memakai `payment_xendit_enabled`.
6. Xendit API auth memakai Basic Auth dari `Base64(secretKey + ":")`.
7. Jika memakai adapter legacy saat ini, frontend/API harus mengirim `channel` yang bisa dipetakan ke VA/e-wallet/QRIS.
8. Jika memakai Payments API v3, adapter harus berubah ke `/payment_requests` dan webhook parser harus berubah ke event/data model.
9. Xendit tidak boleh dinyatakan production-ready sampai settings, frontend route, channel flow, webhook shape, dan test minimal selesai.
