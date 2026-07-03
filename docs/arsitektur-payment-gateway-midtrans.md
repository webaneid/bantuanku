# Arsitektur Payment Gateway Midtrans

> Terakhir di-sync: 2026-07-02

---

## Overview

Midtrans adalah adapter payment gateway otomatis yang sudah ada di backend Bantuanku, tetapi pada audit ini **belum usable end-to-end dari UI normal**.

Source of truth implementasi saat ini:

- adapter: `apps/api/src/services/payment/midtrans.ts`;
- adapter factory: `apps/api/src/services/payment/index.ts`;
- API create/webhook: `apps/api/src/routes/payments.ts`;
- gateway seed: `packages/db/src/seed.ts`;
- env example: `.env.example`;
- admin payment settings: `apps/admin/src/app/dashboard/settings/payments/page.tsx`.

Status arsitektur:

1. Adapter Midtrans ada dan terdaftar di adapter factory.
2. Seed DB membuat gateway `midtrans`.
3. `.env.example` punya `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, dan `MIDTRANS_IS_PRODUCTION`.
4. Admin settings payment **tidak** punya konfigurasi Midtrans.
5. `GET /v1/payments/methods` **tidak** menampilkan Midtrans dari settings.
6. `POST /v1/payments/create` **tidak** punya branch settings-based untuk `methodId = "midtrans"`.
7. Midtrans hanya mungkin dipakai jika ada konfigurasi manual di tabel `payment_methods`, `payment_gateways`, dan `payment_gateway_credentials`.
8. Webhook route generic tersedia, tetapi signature Midtrans saat ini kemungkinan gagal karena route membaca signature dari header, sedangkan official Midtrans mengirim `signature_key` di body JSON.
9. Jadi Midtrans harus dianggap **adapter parsial / dormant**, bukan gateway production-ready.

Dokumen terkait:

- `arsitektur-universal-payment.md` — payment methods umum.
- `arsitektur-universal-payment.md` — universal invoice dan checkout frontend.
- `arsitektur-transaksi.md` — status transaksi dan payment status.
- `arsitektur-api-routing.md` — route `/v1/payments/:gateway/webhook`.
- `arsitektur-security.md` — webhook verification dan trust boundary.
- `arsitektur-observability-logging.md` — logging payment gateway.
- `arsitektur-payment-gateway-ipaymu.md` — gateway iPaymu.
- `arsitektur-payment-gateway-flip.md` — gateway Flip.
- `arsitektur-payment-gateway-xendit.md` — gateway Xendit.

---

## Pembanding Official Midtrans Aktif

Dokumen ini membandingkan implementasi terhadap official Midtrans docs aktif:

- main docs: `https://docs.midtrans.com/`;
- Core/Charge API: `https://docs.midtrans.com/reference/charge-api.md`;
- QRIS Core API: `https://docs.midtrans.com/reference/qris.md`;
- HTTP notification/webhooks: `https://docs.midtrans.com/docs/https-notification-webhooks.md`;
- GoPay/Core references tersedia di index official docs: `https://docs.midtrans.com/llms.txt`.

Kontrak official yang relevan:

| Area | Official Midtrans aktif | Implementasi Bantuanku saat ini | Status |
|------|--------------------------|----------------------------------|--------|
| Model integrasi | Midtrans punya Snap dan Core API. Core API cocok bila aplikasi mengontrol UI payment sendiri. | Adapter memakai Core API direct charge. | Selaras secara arah adapter |
| Endpoint Core API | Channel references memakai `/v2/charge` pada host sandbox/production. | Adapter POST ke `/v2/charge`. | Selaras |
| Host sandbox/production | Sandbox `https://api.sandbox.midtrans.com`, production `https://api.midtrans.com`. | Sama. | Selaras |
| Auth | Basic Auth memakai Server Key sebagai username dan password kosong. | `Basic ${btoa(serverKey + ":")}`. | Selaras |
| Bank transfer | `payment_type = "bank_transfer"`, `bank_transfer.bank` berisi bank code. | Jika `methodCode` mengandung `va`, adapter mengirim `bank_transfer.bank`. | Sebagian selaras |
| QRIS | `payment_type = "qris"` dan object `qris.acquirer` direkomendasikan/required di schema QRIS. Response sukses memberi URL QR di `actions`. | Adapter hanya set `payment_type = "qris"`, tidak mengirim `qris.acquirer`, dan membaca `qr_string`. | Gap |
| GoPay | `payment_type = "gopay"` dan response biasanya memakai `actions` untuk deeplink/QR/redirect. | Adapter hanya set `payment_type = "gopay"` dan mengambil `actions[0].url`. | Parsial |
| Webhook body | Midtrans mengirim JSON dengan `signature_key` di body. | Route generic membaca `X-Callback-Token`, `X-Signature`, atau `X-Ipaymu-Signature`. | Gap kritikal |
| Signature formula | `SHA512(order_id + status_code + gross_amount + ServerKey)`. | Adapter menghitung formula yang sama. | Adapter selaras, route tidak |
| Status success | `settlement`, atau `capture` dengan fraud accepted. | Adapter mapping sama. | Selaras |
| Status failure/expired | Official mengenal `expire`, `deny`, `cancel`, dan lain-lain. | Adapter hanya `expire` menjadi expired; selain success/expire menjadi failed. Route failed dikembalikan ke pending. | Gap status mapping |
| Notification URL | Diatur dari Midtrans MAP atau header override/append. URL harus public reachable. | Tidak ada konfigurasi admin untuk URL Midtrans; route aktual adalah `/v1/payments/midtrans/webhook`. | Gap operasional |

Catatan:

1. Adapter Midtrans lebih dekat ke Core API dibanding Snap.
2. Karena frontend Bantuanku belum punya flow pemilihan channel Midtrans, penggunaan Core API sekarang belum lengkap.
3. Jika ingin mengaktifkan Midtrans dengan UX sederhana, Snap bisa menjadi alternatif arsitektur. Jika tetap Core API, aplikasi harus punya channel selector, instruksi VA, QR render, dan redirect/deeplink handling yang lengkap.

---

## Source of Truth Implementasi

| Area | File |
|------|------|
| Midtrans adapter | `apps/api/src/services/payment/midtrans.ts` |
| Adapter factory | `apps/api/src/services/payment/index.ts` |
| Payment adapter types | `apps/api/src/services/payment/types.ts` |
| Payment methods/create/webhook route | `apps/api/src/routes/payments.ts` |
| Transaction payment schema | `packages/db/src/schema/transaction-payments.ts` |
| Gateway/payment method schema | `packages/db/src/schema/payment.ts` |
| Gateway seed | `packages/db/src/seed.ts` |
| Admin payment settings | `apps/admin/src/app/dashboard/settings/payments/page.tsx` |
| Environment example | `.env.example` |

---

## Gateway Registration

Seed gateway di `packages/db/src/seed.ts` membuat:

| Field | Value |
|-------|-------|
| `code` | `midtrans` |
| `name` | `Midtrans` |
| `type` | `auto` |
| `sortOrder` | `1` |

Runtime create payment berbasis DB membutuhkan:

1. `payment_gateways.code = "midtrans"`;
2. `payment_methods.gatewayId` mengarah ke gateway Midtrans;
3. `payment_methods.code` berisi channel seperti `bca_va`, `bni_va`, `permata_va`, `gopay`, atau `qris`;
4. `payment_gateway_credentials.gatewayId` aktif;
5. `payment_gateway_credentials.credentials` JSON berisi `serverKey`.

Tidak ada seed default untuk payment method Midtrans channel. Jadi adapter ada, tetapi channel runtime tidak otomatis tersedia.

---

## Settings dan Credential

`.env.example` mendokumentasikan:

| Env | Status runtime |
|-----|----------------|
| `MIDTRANS_SERVER_KEY` | Ada di contoh env, tetapi tidak dibaca oleh payment route. |
| `MIDTRANS_CLIENT_KEY` | Ada di contoh env, tetapi adapter tidak memakai client key. |
| `MIDTRANS_IS_PRODUCTION` | Ada di contoh env, tetapi route memakai `c.env.ENVIRONMENT === "production"` untuk mode DB-based gateway. |

Admin settings payment saat ini mendukung bank transfer, cash, QRIS manual, Xendit, iPaymu, dan Flip. Midtrans tidak ada dalam provider admin modern.

Credential yang benar untuk adapter saat ini:

```json
{
  "serverKey": "SB-Mid-server-..."
}
```

Jika memakai tabel `payment_gateway_credentials`, field JSON harus berisi `serverKey`; `clientKey` tidak dipakai oleh adapter Core API sekarang.

Gap:

1. Env Midtrans ada di contoh, tetapi tidak menjadi source runtime.
2. Tidak ada UI admin untuk menyimpan `serverKey`, `clientKey`, environment, atau notification URL Midtrans.
3. Tidak ada settings key `payment_midtrans_enabled`, sehingga Midtrans tidak pernah muncul dari `GET /v1/payments/methods`.

---

## Adapter Midtrans

Class:

```ts
MidtransAdapter
```

Constructor:

```ts
constructor(credentials: GatewayCredentials, isProduction = false)
```

Mapping credential:

| Adapter Field | Source |
|---------------|--------|
| `serverKey` | `credentials.serverKey` |
| `isProduction` | parameter factory |

Base URL:

| Mode | URL |
|------|-----|
| sandbox | `https://api.sandbox.midtrans.com` |
| production | `https://api.midtrans.com` |

Auth:

```text
Authorization: Basic Base64(serverKey + ":")
```

---

## Create Payment Flow

Input route:

```http
POST /v1/payments/create
```

Body:

```json
{
  "transactionId": "trx-id",
  "methodId": "payment-method-id",
  "channel": "optional-channel"
}
```

Untuk Midtrans, flow yang mungkin saat ini adalah flow DB-based:

```text
POST /v1/payments/create
  -> cari transactions.id
  -> cari payment_methods.id = methodId
  -> cari payment_gateways.id = method.gatewayId
  -> cari payment_gateway_credentials aktif
  -> JSON.parse(credentials)
  -> createPaymentAdapter("midtrans", credentials, isProduction)
  -> MidtransAdapter.createPayment()
  -> simpan transaction_payments
```

Flow settings-based tidak mendukung Midtrans:

```text
settingsGateways = ["xendit", "ipaymu", "flip"]
```

Jika `methodId = "midtrans"` dikirim dari frontend tanpa DB payment method, API mengembalikan:

```text
Payment method not available
```

---

## Request Body ke Midtrans

Adapter membuat `orderId`:

```text
DNT-{transactionId}-{Date.now()}
```

Payload dasar:

```json
{
  "transaction_details": {
    "order_id": "DNT-...",
    "gross_amount": 100000
  },
  "customer_details": {
    "first_name": "Nama Donatur",
    "email": "optional",
    "phone": "optional"
  },
  "expiry": {
    "unit": "minutes",
    "duration": 1440
  }
}
```

Mapping channel:

| `methodCode` | Payload Midtrans |
|--------------|------------------|
| mengandung `va` | `payment_type = "bank_transfer"`, `bank_transfer.bank = methodCode.replace("_va", "")` |
| `gopay` | `payment_type = "gopay"` |
| `qris` | `payment_type = "qris"` |

Response success jika:

```text
status_code === "201" atau "200"
```

Mapping response:

| Field internal | Source response Midtrans |
|----------------|--------------------------|
| `externalId` | orderId internal `DNT-...` |
| `paymentCode` | `va_numbers[0].va_number` atau `permata_va_number` |
| `paymentUrl` | `actions[0].url` |
| `qrCode` | `qr_string` |
| `expiredAt` | waktu server internal + expiry minutes |

Gap:

1. Jika `methodCode` tidak dikenali, adapter tetap POST ke Midtrans tanpa `payment_type`.
2. QRIS official mengembalikan QR image URL di `actions`, bukan `qr_string`; adapter bisa menyimpan `qrCode` kosong.
3. QRIS official memakai object `qris.acquirer`, tetapi adapter tidak mengirimnya.
4. `expiry_time` dari Midtrans response tidak dipakai; adapter menghitung sendiri.
5. Tidak ada item details, custom fields, notification override, atau metadata untuk memudahkan rekonsiliasi.

---

## Webhook Flow

Route aktual:

```http
POST /v1/payments/midtrans/webhook
```

Route generic melakukan:

```text
find payment_gateways.code = "midtrans"
find active payment_gateway_credentials
parse JSON body
signature = X-Callback-Token || X-Signature || X-Ipaymu-Signature
adapter.verifyWebhook(payload, signature)
adapter.parseWebhook(payload)
find transaction_payments.externalId = parsed.externalId
update transaction/payment status
```

Adapter verify:

```text
SHA512(order_id + status_code + gross_amount + serverKey) === signature
```

Masalah utama:

```text
Midtrans official sends signature_key in JSON body.
Current route does not pass payload.signature_key to adapter.
```

Dampak:

1. Webhook Midtrans real kemungkinan ditolak `401 Invalid signature`.
2. Formula adapter benar, tetapi integrasi route salah mengambil lokasi signature.
3. Jika operator mencoba memakai header `X-Signature` manual, itu bukan kontrak normal official Midtrans.

---

## Status Mapping

Adapter:

| Midtrans `transaction_status` | `fraud_status` | Parsed status |
|-------------------------------|----------------|---------------|
| `capture` | `accept` | `success` |
| `settlement` | apapun | `success` |
| `expire` | apapun | `expired` |
| lainnya | apapun | `failed` |

Route payment:

| Parsed status | `transactions.paymentStatus` | `transaction_payments.status` |
|---------------|-------------------------------|-------------------------------|
| `success` | `paid` | `verified` |
| `expired` | `cancelled` | `rejected` |
| `failed` | `pending` | `pending` |

Gap:

1. `deny`, `cancel`, dan failure lain dari Midtrans menjadi `failed` di adapter, tetapi route mengembalikannya ke `pending`.
2. Tidak ada mapping eksplisit ke `failed` pada transaction untuk Midtrans failure.
3. Tidak ada GET Status reconciliation untuk notifikasi terlambat, gagal, atau out-of-order.

---

## Frontend dan UX

Tidak ditemukan route frontend khusus Midtrans seperti:

```text
/checkout/midtrans-channels
```

Tidak ada branch Midtrans di admin settings payment.

Konsekuensi:

1. Donatur tidak bisa memilih Midtrans dari daftar metode normal.
2. Tidak ada UI untuk memilih channel Midtrans VA/GoPay/QRIS.
3. Tidak ada UI untuk render QRIS Midtrans atau instruksi VA Midtrans.
4. Tidak ada UI Snap jika keputusan arsitektur berubah ke Snap.

Catatan: `apps/admin/src/app/dashboard/donations/page.tsx` mengenali string method yang mengandung `midtrans` untuk label kategori gateway, tetapi itu hanya display helper, bukan flow pembayaran.

---

## Security

Yang sudah benar:

1. Adapter memakai Server Key hanya di backend.
2. Signature formula adapter mengikuti pola official Midtrans.
3. Webhook route menolak request tanpa signature valid.

Gap keamanan:

1. Route tidak memakai `payload.signature_key`, sehingga webhook official gagal validasi.
2. Webhook payload disimpan raw di `transaction_payments.webhookPayload`; payload bisa mengandung PII/payment detail.
3. Tidak ada replay protection.
4. Tidak ada IP allowlist atau allowlist optional dari sumber Midtrans.
5. Tidak ada fallback GET Status API untuk verifikasi tambahan saat status besar seperti `settlement`.
6. Credential `payment_gateway_credentials.credentials` raw JSON perlu dipastikan mengikuti kebijakan secret encryption di `arsitektur-security.md`.

---

## Legacy / File Lama

Audit file lama:

```text
find . -maxdepth 4 -iname '*midtrans*' -o -iname '*MIDTRANS*'
```

Hasil:

1. Tidak ditemukan file dokumentasi lama khusus Midtrans untuk dihapus.
2. Referensi Midtrans masih ada di `README.md`, `.env.example`, dan beberapa dokumen arsitektur.
3. Karena Midtrans belum production-ready, klaim README “Payment gateway integration Midtrans” perlu dikoreksi kelak atau diberi status “adapter dormant” bila README ikut dibersihkan.

Tidak ada file lama yang dihapus dalam batch ini.

---

## Gap Implementasi

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| Midtrans tidak ada di settings admin | Operator tidak bisa mengaktifkan/menyimpan credential dari UI | Tambah provider admin atau hapus klaim Midtrans dari UI/docs publik |
| Midtrans tidak ada di `GET /payments/methods` | Donatur tidak bisa memilih Midtrans | Tambah `payment_midtrans_enabled` atau pakai DB payment method yang terdokumentasi |
| Env `MIDTRANS_*` tidak dibaca runtime | Konfigurasi env menyesatkan | Pilih satu sumber credential: env, settings, atau DB credentials |
| Webhook route tidak memakai `signature_key` body | Webhook official kemungkinan selalu 401 | Untuk `gatewayCode === "midtrans"`, set `signature = payload.signature_key` |
| QRIS tidak mengirim `qris.acquirer` | Request QRIS bisa ditolak atau tidak sesuai schema official | Tambah `qris: { acquirer: "gopay" }` atau channel acquirer eksplisit |
| QRIS response baca `qr_string` | QR tidak tampil jika Midtrans memberi URL di `actions` | Simpan QR action URL sebagai `paymentUrl`/`qrCode` sesuai kontrak UI |
| Unsupported channel tetap dikirim ke Midtrans | Error provider tidak jelas | Reject channel tidak dikenal sebelum `fetch` |
| Failure status kembali pending | Deny/cancel bisa terlihat masih menunggu | Mapping failed gateway ke `paymentStatus = "failed"` jika sudah final |
| Tidak ada frontend Midtrans channel flow | Core API tidak bisa dipakai nyaman | Buat `/checkout/midtrans-channels` atau pindah ke Snap |
| Tidak ada test adapter/webhook | Risiko regresi tinggi | Tambah unit/integration test create VA, QRIS, GoPay, webhook signature, status mapping |

---

## Rekomendasi Arsitektur

1. **Putuskan produk Midtrans: Snap atau Core API.** Untuk UX cepat dan channel luas, Snap lebih sederhana. Untuk kontrol penuh, lanjutkan Core API tetapi wajib membangun channel UI dan instruksi pembayaran sendiri.
2. **Jika lanjut Core API, hidupkan Midtrans secara eksplisit.** Tambah settings admin `payment_midtrans_enabled`, `payment_midtrans_server_key`, `payment_midtrans_client_key`, `payment_midtrans_environment`, dan dokumentasikan notification URL.
3. **Perbaiki webhook lebih dulu sebelum production.** Route harus mengambil `payload.signature_key`, lalu adapter menghitung SHA-512 seperti sekarang.
4. **Tambahkan channel contract.** Minimal: `bca_va`, `bni_va`, `bri_va`, `permata_va`, `gopay`, `qris:gopay`. Jangan menerima channel bebas.
5. **Perbaiki QRIS mapping.** Kirim `qris.acquirer`, simpan QR URL dari `actions`, dan pastikan frontend bisa menampilkan QR image.
6. **Gunakan `expiry_time` provider bila tersedia.** Internal expiry boleh menjadi fallback, tetapi payment instruction sebaiknya memakai expiry provider.
7. **Tambahkan status reconciliation.** Untuk payment sensitif, sediakan job/manual action GET Status API saat webhook terlambat atau signature/processing gagal.
8. **Tambahkan test Midtrans.** Minimal test: auth header, base URL sandbox/production, request VA, request QRIS, response mapping VA/QRIS, `signature_key`, webhook `settlement`, webhook `expire`, webhook `deny/cancel`.
9. **Rapikan klaim publik.** README dan documentation center tidak boleh menyebut Midtrans “terintegrasi” tanpa status parsial/dormant sampai flow end-to-end selesai.

---

## SOP Saat Mengubah Midtrans

1. Jangan mengubah kontrak Midtrans tanpa membandingkan ulang ke official docs aktif.
2. Jangan menambahkan settings baru tanpa update `arsitektur-universal-payment.md`, `arsitektur-security.md`, dan dokumen ini.
3. Jangan mengaktifkan Midtrans di UI sebelum webhook signature valid terhadap payload official.
4. Jangan menyimpan Server Key di frontend.
5. Jangan menerima webhook tanpa signature valid.
6. Jangan menganggap `pending` sebagai final.
7. Jangan menghapus file lama terkait Midtrans kecuali informasinya sudah masuk ke dokumen ini dan sudah diverifikasi ke implementasi.

---

## Kesimpulan Source of Truth

1. Midtrans adapter ada, tetapi statusnya parsial/dormant.
2. Route create payment bisa memakai Midtrans hanya lewat DB payment method manual, bukan settings admin normal.
3. Official Core API host/auth/charge endpoint selaras dengan adapter.
4. Webhook adapter benar secara formula, tetapi route salah mengambil signature karena tidak memakai `payload.signature_key`.
5. QRIS mapping belum sesuai official response/request.
6. Tidak ada file lama Midtrans yang dihapus karena tidak ditemukan duplikat dokumentasi khusus Midtrans.
7. Midtrans tidak boleh dinyatakan production-ready sampai settings, frontend channel flow, webhook signature, QRIS mapping, status mapping, dan test minimal selesai.
