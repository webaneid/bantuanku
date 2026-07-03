# Arsitektur Payment Gateway Flip

> Terakhir di-sync: 2026-07-02

---

## Overview

Flip adalah adapter payment gateway otomatis di Bantuanku untuk membuat payment link Accept Payment / PWF dan menerima webhook status pembayaran.

Source of truth implementasi saat ini:

- adapter: `apps/api/src/services/payment/flip.ts`;
- API create/webhook: `apps/api/src/routes/payments.ts`;
- admin settings: `apps/admin/src/app/dashboard/settings/payments/page.tsx`;
- legacy checkout UI: `apps/web/src/app/checkout/flip-channels/page.tsx`;
- gateway seed/helper: `packages/db/src/seed.ts`, `packages/db/insert-flip-gateway.ts`.

Dokumen/helper root lama berikut sudah diserap dan dikoreksi:

- `CHECK_FLIP_SETTINGS.sql`;
- `INSERT_FLIP_GATEWAY.sql`.

Status arsitektur:

1. Flow Flip jauh lebih sehat dibanding iPaymu saat audit ini: frontend mengirim `transactionId`, settings key admin sudah dibaca API, webhook form-urlencoded sudah diparse, dan token webhook sudah diverifikasi dengan bcrypt.
2. Namun “sudah dipakai dan aman” tidak berarti tanpa gap. Official Flip mengubah format `link_id` / `bill_link_id` menjadi 19 digit mulai 10 April 2026; pada 2 Juli 2026 implementasi masih memakai `JSON.parse()` biasa untuk response/webhook, sehingga ada risiko rounding angka besar di Node/JavaScript.
3. Dokumen lama `03-Flip-Blueprint.md` dan `FLIP_SETUP.md` sudah diserap, dikoreksi, lalu dihapus setelah dokumen ini dibuat.

Dokumen terkait:

- `arsitektur-universal-payment.md` — payment methods umum.
- `arsitektur-universal-payment.md` — universal invoice dan legacy checkout route.
- `arsitektur-transaksi.md` — payment status dan transaction status.
- `arsitektur-api-routing.md` — route `/v1/payments/:gateway/webhook`.
- `arsitektur-security.md` — webhook security, secret leakage, dan IP allowlist.
- `arsitektur-observability-logging.md` — logging payment gateway.
- `arsitektur-payment-gateway-ipaymu.md` — gateway iPaymu dipisah.
- `arsitektur-payment-gateway-xendit.md` — gateway Xendit dipisah.
- `arsitektur-payment-gateway-midtrans.md` — gateway Midtrans dipisah.

---

## Pembanding Official Flip Aktif

Dokumen ini membandingkan implementasi terhadap official Flip docs aktif:

- main docs: `https://docs.flip.id/`;
- API reference: `https://docs.flip.id/docs/api/flip-for-business-api-documentation`;
- Create Bill: `https://docs.flip.id/docs/api/create-bill`;
- Handling Notification: `https://docs.flip.id/docs/handling-notification`;
- Security Best Practice: `https://docs.flip.id/docs/security-best-practice`;
- changelog perubahan ID: `https://docs.flip.id/changelog/accept-payment-link-id-format-change`.

Kontrak official yang relevan:

| Area | Official Flip aktif | Implementasi Bantuanku saat ini | Status |
|------|---------------------|----------------------------------|--------|
| Production base URL | `https://bigflip.id/api/v2` | `https://bigflip.id/api/v2` | Selaras |
| Sandbox base URL | `https://bigflip.id/big_sandbox_api/v2` | `https://bigflip.id/big_sandbox_api/v2` | Selaras |
| Create bill endpoint | `POST /v2/pwf/bill` | `POST {baseUrl}/pwf/bill` dengan base URL sudah mencakup `/v2` | Selaras |
| Content-Type create bill | `application/x-www-form-urlencoded` | `application/x-www-form-urlencoded` | Selaras |
| Auth | Basic Auth dari Secret Key + `:` dalam Base64 | `Basic ${Base64(secretKey + ":")}` | Selaras |
| Required body | `title`, `type`, `step`; amount wajib untuk step 2/3 | `title`, `type`, `amount`, `step`, sender data, `expired_date` | Selaras untuk step 2 |
| Step flow | `1` input data, `2` payment method, `3` payment confirmation | `step = "2"` agar pemilihan channel terjadi di halaman Flip | Selaras |
| Payment minimum | `amount` minimum Rp10.000 | Bergantung validasi upstream `minimum_donation`; adapter tidak guard sendiri | Perlu guard eksplisit |
| Callback body | form-urlencoded berisi `data` dan `token` | route Flip parse `data` dan `token` | Selaras |
| Callback validation | validasi token dari Flip dashboard | `bcrypt.compare(validationToken, token)` | Selaras |
| Callback status | Accept Payment callback status `SUCCESSFUL`, `CANCELLED`, `FAILED` | `SUCCESSFUL` -> success, `EXPIRED` -> expired, lainnya failed | Gap status mapping |
| `link_id` / `bill_link_id` | berubah ke 19 digit mulai 10 April 2026 | response/webhook diparse `JSON.parse()` biasa | Gap kritikal JavaScript number rounding |
| Notification best practice | idempotent handling, validate token, check status | verified webhook idempotent, token validated; tidak ada replay/IP allowlist eksplisit | Sebagian selaras |
| Security best practice | TLS, secret rotation, IP whitelisting, validate callbacks | TLS tergantung deployment; IP allowlist belum terdokumentasi di kode | Gap operasional |

Catatan penting:

1. Karena tanggal audit adalah 2 Juli 2026, perubahan `link_id` / `bill_link_id` 19 digit dari Flip harus diperlakukan sudah berlaku.
2. Official docs menyarankan penyimpanan ID besar sebagai string/BigInt-safe. Implementasi menyimpan `externalId` sebagai text, tetapi parsing awal masih bisa merusak nilai bila provider mengirim angka JSON 19 digit.
3. `link_url` official berupa host/path tanpa skema pada beberapa response; adapter sudah menambahkan `https://`.

---

## Source of Truth Implementasi

| Area | File |
|------|------|
| Flip adapter | `apps/api/src/services/payment/flip.ts` |
| Adapter factory | `apps/api/src/services/payment/index.ts` |
| Payment adapter types | `apps/api/src/services/payment/types.ts` |
| Payment methods/create/webhook route | `apps/api/src/routes/payments.ts` |
| Transaction payment schema | `packages/db/src/schema/transaction-payments.ts` |
| Gateway seed | `packages/db/src/seed.ts` |
| Insert helper lama | `packages/db/insert-flip-gateway.ts` |
| Admin payment settings | `apps/admin/src/app/dashboard/settings/payments/page.tsx` |
| Legacy gateway selector | `apps/web/src/app/checkout/payment-gateway/page.tsx` |
| Legacy Flip checkout page | `apps/web/src/app/checkout/flip-channels/page.tsx` |
| Payment result legacy | `apps/web/src/app/checkout/payment-result/page.tsx` |
| User-facing docs lama | `apps/web/src/content/documentation/pages/flip-payment.ts` |

---

## Gateway Registration

Seed gateway di `packages/db/src/seed.ts` membuat:

| Field | Value |
|-------|-------|
| `code` | `flip` |
| `name` | `Flip` |
| `type` | `auto` |
| `sortOrder` | `4` |

Ada helper `packages/db/insert-flip-gateway.ts` untuk insert manual jika seed belum jalan. Runtime create payment tetap membutuhkan record `payment_gateways.code = "flip"`.

Root SQL lama `INSERT_FLIP_GATEWAY.sql` melakukan insert manual yang sama ke `payment_gateways`. File itu sudah tidak menjadi source of truth karena seed resmi ada di `packages/db/src/seed.ts` dan helper manual yang masih relevan ada di `packages/db/insert-flip-gateway.ts`. Root SQL lama dihapus setelah mapping ini dicatat.

Root SQL lama `CHECK_FLIP_SETTINGS.sql` hanya query inspeksi `settings` dengan `key LIKE '%flip%'`. File itu juga memuat expected key legacy `payment_flip_secret_key`, `payment_flip_validation_token`, dan `payment_flip_mode`. API memang masih membaca key legacy sebagai fallback, tetapi key utama admin modern adalah `payment_flip_api_key`, `payment_flip_webhook`, dan `payment_flip_environment`. Karena informasi yang benar sudah ada di bagian Settings Flip, root SQL itu dihapus.

---

## Settings Flip

Admin UI menyimpan:

| Setting | Fungsi |
|---------|--------|
| `payment_flip_enabled` | enable Flip di daftar payment methods |
| `payment_flip_api_key` | Secret Key / API key Flip |
| `payment_flip_webhook` | Validation Token callback Flip |
| `payment_flip_environment` | `production` atau `sandbox` |

API membaca key modern dan fallback legacy:

| Kebutuhan API | Key yang dibaca |
|---------------|-----------------|
| Secret key | `payment_flip_api_key` atau `payment_flip_secret_key` |
| Validation token | `payment_flip_webhook` atau `payment_flip_validation_token` |
| Environment | `payment_flip_environment` atau `payment_flip_mode`, default `sandbox` |

Catatan:

1. Klaim lama bahwa settings key mismatch masih terjadi sudah tidak benar. Kode saat ini sudah membaca key admin modern.
2. Jika secret key kosong, `POST /v1/payments/create` dan webhook route mengembalikan error 500.
3. Validation token tidak diwajibkan saat create payment, tetapi wajib efektif untuk webhook valid. Jika kosong, adapter menolak webhook.

---

## Adapter Flip

Class:

```ts
FlipAdapter
```

Constructor:

```ts
constructor(credentials: GatewayCredentials, isProduction = false)
```

Mapping credential:

| Adapter Field | Source |
|---------------|--------|
| `secretKey` | `credentials.secretKey` |
| `validationToken` | `credentials.merchantId` |
| `isProduction` | argumen factory dari route |

Base URL:

| Mode | Base URL |
|------|----------|
| production | `https://bigflip.id/api/v2` |
| sandbox | `https://bigflip.id/big_sandbox_api/v2` |

Endpoint create payment:

```http
POST {baseUrl}/pwf/bill
```

Header:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/x-www-form-urlencoded` |
| `Accept` | `application/json` |
| `Authorization` | `Basic ${Base64(secretKey + ":")}` |

---

## Create Bill Request Body

Adapter membuat form-urlencoded body:

| Field | Value |
|-------|-------|
| `title` | `Donasi #{transactionId}` dipotong 55 karakter |
| `type` | `SINGLE` |
| `amount` | `request.amount` |
| `step` | `2` |
| `sender_name` | `request.donorName || "Donor"` |
| `sender_email` | `request.donorEmail || "donor@bantuanku.org"` |
| `sender_phone_number` | `request.donorPhone || "08123456789"` |
| `expired_date` | `YYYY-MM-DD HH:mm` dari waktu lokal server |
| `charge_fee` | `1` |

Implikasi:

1. `step = 2` berarti user diarahkan ke halaman Flip untuk memilih metode pembayaran, bukan memilih VA/e-wallet di Bantuanku.
2. `apps/web/src/app/checkout/flip-channels/page.tsx` sebenarnya bukan channel selector lagi. Halaman itu hanya tombol “Bayar via Flip”.
3. `charge_fee = 1` berarti fee dibebankan ke customer/donatur. Ini keputusan bisnis yang harus tetap eksplisit.
4. Fallback email/phone dummy bisa membuat data donor di Flip tidak akurat. Ini perlu kebijakan data, tetapi bukan blocker teknis.

Gap:

1. Adapter tidak guard minimum Rp10.000 secara lokal. Jika validasi upstream berubah, Flip bisa menolak request.
2. `expired_date` dibuat dari timezone server tanpa helper timezone proyek. Detail timezone umum ada di `arsitektur-timezone.md`.

---

## Response Mapping

Adapter menganggap create payment sukses jika response punya:

| Field Response | Pemakaian |
|----------------|-----------|
| `link_id` | `externalId`, `paymentCode` |
| `link_url` | `paymentUrl = https://{link_url}` |
| `status` | harus `ACTIVE` |
| `expired_date` | `expiredAt` |

Gap kritikal:

```text
Official Flip: link_id / bill_link_id berubah menjadi 19 digit mulai 2026-04-10.
Kode: result.link_id diparse sebagai number oleh JSON.parse() bawaan fetch response.json().
```

Dampak:

1. Jika Flip mengirim `link_id` sebagai JSON number 19 digit, JavaScript bisa membulatkan nilai sebelum `.toString()`.
2. `transaction_payments.externalId` bisa menyimpan ID yang sudah salah.
3. Webhook lookup `externalId` bisa gagal walaupun pembayaran sukses.

Rekomendasi:

1. Ambil response sebagai text dan parse dengan parser BigInt-safe, atau pastikan field ID diperlakukan string sebelum kehilangan presisi.
2. Simpan `externalId` tetap text.
3. Tambahkan unit test untuk `link_id` 19 digit.

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

Flow untuk `methodId = "flip"`:

1. cari transaction by `transactionId`;
2. wajib `transactions.paymentStatus === "pending"`;
3. cari `payment_methods.id = methodId`;
4. jika tidak ada, masuk settings-based gateway;
5. validasi `methodId` termasuk `xendit | ipaymu | flip`;
6. cek `payment_flip_enabled === "true"`;
7. ambil secret key, validation token, environment dari settings;
8. cari `payment_gateways.code = "flip"`;
9. buat adapter `createPaymentAdapter("flip", credentials, isProduction)`;
10. panggil adapter dengan `donationId: txn.id`, `amount: txn.totalAmount + uniqueCode`;
11. insert `transaction_payments` status `pending`;
12. update transaction `paymentStatus = "pending"`;
13. return `paymentId`, `paymentCode`, `paymentUrl`, `expiredAt`.

Catatan:

1. Nama field adapter masih `donationId`, tetapi isinya transaction ID. Ini warisan interface payment adapter, bukan donation table.
2. `methodCode` tidak dipakai oleh Flip karena pemilihan channel dilakukan di halaman Flip.
3. Response API tidak mengembalikan `externalId` ke frontend; external ID disimpan di DB.

---

## Frontend Flow

Legacy flow:

```text
/checkout/payment-method
  -> /checkout/payment-gateway
  -> /checkout/flip-channels
  -> POST /v1/payments/create
  -> redirect ke paymentUrl Flip
```

`/checkout/flip-channels`:

1. membaca `sessionStorage.pendingTransactions`;
2. menghitung total amount lokal;
3. mengirim:

```json
{
  "transactionId": "firstTransactionId",
  "methodId": "flip"
}
```

4. jika API mengembalikan `paymentUrl`, user langsung diarahkan ke halaman Flip.

Status:

1. Flow ini lebih benar daripada iPaymu legacy karena memakai `transactionId`.
2. Nama halaman `flip-channels` menyesatkan karena tidak ada channel selection. Secara UX/arsitektur sebaiknya diganti menjadi route intent seperti `/checkout/flip` atau disambungkan ke universal invoice payment.
3. Jika `pendingTransactions` berisi lebih dari satu transaksi, hanya transaksi pertama yang dibuatkan payment link. Ini selaras dengan model transaksi satu produk per POST, tetapi UI total amount menjumlahkan semua item sehingga bisa membingungkan.

Rujukan universal payment ada di `arsitektur-universal-payment.md`.

---

## Webhook Flip

Route aktual:

```http
POST /v1/payments/flip/webhook
```

Handler generic:

```text
apps/api/src/routes/payments.ts
paymentsRoute.post("/:gateway/webhook")
```

Untuk Flip:

1. cari `payment_gateways.code = "flip"`;
2. baca settings credential;
3. parse body sebagai form-urlencoded;
4. ambil `data` sebagai JSON string;
5. ambil `token`;
6. `payload = JSON.parse(dataStr)`;
7. `signature = token`;
8. panggil `adapter.verifyWebhook(payload, signature)`;
9. `bcrypt.compare(validationToken, token)`;
10. parse webhook menjadi `externalId`, `status`, `paidAt`;
11. cari `transaction_payments.externalId = externalId`;
12. update payment dan transaction;
13. jalankan efek domain campaign/qurban/email/Meta CAPI;
14. return `{ received: true }`.

Gap kritikal:

```text
payload = JSON.parse(dataStr)
```

Jika `bill_link_id` dikirim sebagai number 19 digit, nilai bisa rusak sebelum `payload.bill_link_id?.toString()`.

---

## Webhook Status Mapping

Adapter `parseWebhook()`:

| Payload status | Parsed status |
|----------------|---------------|
| `SUCCESSFUL` | `success` |
| `EXPIRED` | `expired` |
| lainnya | `failed` |

Route payment mapping:

| Parsed status | `transactions.paymentStatus` | `transaction_payments.status` |
|---------------|------------------------------|-------------------------------|
| `success` | `paid` | `verified` |
| `expired` | `cancelled` | `rejected` |
| `failed` | `pending` | `pending` |

Gap official:

1. Official Accept Payment callback yang diaudit menyebut status berubah ke `SUCCESSFUL`, `CANCELLED`, atau `FAILED`.
2. Adapter tidak memetakan `CANCELLED` ke `expired/cancelled`; status itu jatuh ke `failed`, lalu route membuat transaction tetap `pending`.
3. Adapter memetakan `EXPIRED`, tetapi status ini tidak muncul sebagai status utama di potongan official Accept Payment callback yang diaudit.

Rekomendasi:

1. Petakan `CANCELLED` ke `expired` atau status domain lain yang disepakati.
2. Putuskan apakah `FAILED` harus membuat transaction `failed` atau tetap `pending`.
3. Tambahkan test untuk `SUCCESSFUL`, `CANCELLED`, `FAILED`, `EXPIRED`.

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
2. Tidak ada ledger/accounting posting khusus Flip yang terlihat di route payment.
3. Email gagal tidak menggagalkan webhook.

---

## Security dan Observability

Yang sudah benar:

1. Secret key tidak dikirim ke frontend.
2. Create bill memakai Basic Auth sesuai official.
3. Callback token diverifikasi dengan bcrypt compare.
4. Webhook route menerima form-urlencoded karena middleware security mengecualikan path `/webhook`.

Gap:

1. Route webhook mencetak payload dan token Flip ke log:

```ts
console.log("[Flip Webhook] payload:", JSON.stringify(payload));
console.log("[Flip Webhook] token:", token);
```

2. Tidak ada IP allowlist eksplisit untuk Flip webhook.
3. Tidak ada replay protection eksplisit.
4. Tidak ada parser BigInt-safe untuk callback IDs.
5. Secret rotation hanya operasional manual via dashboard/settings, belum ada SOP teknis di repo.

Rujukan detail:

- `arsitektur-security.md`;
- `arsitektur-observability-logging.md`.

---

## Dokumen Lama yang Dikoreksi

### `03-Flip-Blueprint.md`

Status: dihapus setelah dokumen ini dibuat.

Yang masih relevan dan sudah diserap:

1. base URL production/sandbox;
2. Basic Auth `SecretKey + ":"`;
3. create bill `/pwf/bill`;
4. webhook form-urlencoded `data` + `token`;
5. token validation dengan bcrypt;
6. settings admin untuk API key, webhook token, environment.

Yang sudah tidak benar:

1. klaim settings key mismatch masih terjadi. Kode sekarang sudah membaca key admin modern dan fallback legacy.
2. klaim payments route masih perlu migrasi dari `donations/payments`; route sekarang memakai `transactions` dan `transaction_payments`.
3. klaim schema belum punya gateway fields; schema sekarang punya `externalId`, `paymentCode`, `paymentUrl`, `expiredAt`, `gatewayCode`, `webhookPayload`.
4. klaim adapter belum verify bcrypt; adapter sekarang memakai `bcrypt.compare`.
5. klaim route belum parse form-urlencoded; route sekarang sudah parse khusus Flip.

### `FLIP_SETUP.md`

Status: dihapus setelah dokumen ini dibuat.

Yang masih relevan dan sudah diserap:

1. Flip gateway seed/helper;
2. required settings;
3. webhook URL `/v1/payments/flip/webhook`;
4. production/sandbox mode;
5. redirect ke Flip payment link.

Yang sudah tidak benar:

1. endpoint create lama memakai `donationId`; API sekarang wajib `transactionId`.
2. webhook lama ditulis JSON; implementasi dan official memakai form-urlencoded.
3. settings lama `flip_secret_key`, `flip_validation_token`, `flip_mode` bukan key utama admin modern.
4. channel selection VA di aplikasi tidak lagi sesuai implementasi aktual; Flip PWF step 2 memilih channel di halaman Flip.

---

## Gap Implementasi yang Tercatat

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| `link_id` / `bill_link_id` 19 digit diparse dengan `JSON.parse()` biasa | External ID bisa rounded, webhook lookup gagal | Gunakan parser BigInt-safe atau raw-text extraction untuk ID Flip; simpan sebagai string |
| `CANCELLED` official jatuh ke parsed `failed`, lalu transaction tetap pending | Pembayaran batal bisa menggantung pending | Petakan `CANCELLED` ke `cancelled` domain atau status eksplisit |
| `FAILED` route tetap pending | Payment gagal tidak tampak sebagai failed | Putuskan status failed domain secara eksplisit |
| Webhook log mencetak payload dan token | Risiko token/PII bocor ke log | Hapus log token/payload atau redaction logger |
| Tidak ada IP allowlist/replay protection | Webhook endpoint hanya bergantung token | Tambah SOP/deployment allowlist dan idempotency/replay guard |
| Adapter tidak guard minimum Rp10.000 | Jika validasi upstream berubah, request ditolak Flip | Tambahkan guard minimum di adapter/API |
| Route `/checkout/flip-channels` menyesatkan | UX/maintenance bingung karena tidak memilih channel | Rename/simplify atau pindah ke universal invoice payment |
| UI total menjumlahkan multi pending transaction tapi API hanya proses item pertama | Donatur bisa melihat nominal berbeda dari transaksi yang dibuat | Samakan UI dengan model satu transaksi per create |
| Tidak ada test gateway Flip | Risiko regresi pada flow yang sudah dipakai | Tambah unit/integration test create/webhook/status/BigInt ID |

---

## Rekomendasi Arsitektur

1. **Prioritaskan BigInt-safe ID Flip.** Karena deadline official 10 April 2026 sudah lewat pada tanggal audit ini, ini bukan nice-to-have.
2. **Perbaiki status mapping `CANCELLED` dan `FAILED`.** Jangan biarkan payment batal/gagal menggantung sebagai pending tanpa keputusan domain.
3. **Hapus logging token Flip.** Ini gap security yang sederhana tetapi sensitif.
4. **Tambahkan test Flip.** Minimal test untuk auth header, create bill body, response `link_id` 19 digit, webhook `bill_link_id` 19 digit, bcrypt token, dan status mapping.
5. **Rapikan UX route.** `flip-channels` sebaiknya tidak diperlakukan sebagai channel selector; Flip PWF step 2 sudah memindahkan channel selection ke Flip.
6. **Dokumentasikan operational security.** IP allowlist, TLS, secret rotation, callback URL production/sandbox, dan replay/idempotency harus masuk SOP deployment/security.
7. **Jangan gabungkan Flip dengan iPaymu.** Keduanya berbeda kontrak: Flip PWF menggunakan Basic Auth + form-urlencoded + bcrypt callback token; iPaymu memakai signature HMAC dan direct payment method/channel.

---

## Contract yang Harus Dijaga

1. Gateway code Flip adalah `flip`.
2. Route webhook aplikasi adalah `/v1/payments/flip/webhook`.
3. `POST /v1/payments/create` berbasis `transactionId`, bukan `donationId`.
4. Record payment gateway `flip` harus ada di `payment_gateways`.
5. Enable provider memakai `payment_flip_enabled`.
6. Key utama admin adalah `payment_flip_api_key`, `payment_flip_webhook`, `payment_flip_environment`.
7. Create bill memakai `application/x-www-form-urlencoded`.
8. Auth memakai Basic Auth dari `Base64(secretKey + ":")`.
9. Callback Flip memakai form-urlencoded `data` + `token`.
10. Callback token diverifikasi dengan bcrypt compare terhadap validation token.
11. `link_id` dan `bill_link_id` harus diperlakukan sebagai string/BigInt-safe.
12. Dokumentasi lama root tidak boleh dipakai sebagai source of truth setelah dokumen ini dibuat.
