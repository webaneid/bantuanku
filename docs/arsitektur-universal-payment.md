# Arsitektur Universal Payment

> Terakhir di-sync: 2026-07-02

---

## Status Source of Truth

Dokumen ini adalah **satu-satunya source of truth untuk metodologi pembayaran Bantuanku**.

Dokumen lama yang diserap dan tidak boleh dipakai lagi:

- `docs/arsitektur-pembayaran.md` — dihapus setelah seluruh isi pentingnya dipindahkan ke dokumen ini;
- `03-qris-autonominal-blueprint.md` — dihapus karena QRIS static/dynamic sudah terimplementasi dan didokumentasikan di sini.

Keputusan arsitektur:

1. Satu dokumen ini mencakup payment method, settings, frontend invoice/payment flow, manual bank, cash, QRIS manual/static/dynamic, upload bukti, admin approval, gateway create, gateway webhook, dan gap implementasi.
2. Payment gateway spesifik tetap punya dokumen sendiri karena kontrak provider berbeda-beda. Dokumen ini hanya mencatat entry point dan merujuk ke gateway docs.
3. `payment_gateways` dan `payment_methods` tetap bagian schema, tetapi public method list aktual dibangun dari `settings`.
4. Universal payment resmi untuk donatur adalah route invoice `/invoice/[id]`, `/invoice/[id]/payment-method`, dan `/invoice/[id]/payment-detail`.

Dokumen terkait:

- `arsitektur-transaksi.md` — model transaksi universal dan status pembayaran.
- `arsitektur-settings.md` — storage setting payment/frontend/CDN.
- `arsitektur-security.md` — upload proof, webhook, secret gateway.
- `arsitektur-media.md` — media library berbeda dari upload bukti bayar.
- `arsitektur-timezone.md` — `paymentDate`, expiry, dan WIB.
- `arsitektur-payment-gateway-ipaymu.md` — iPaymu.
- `arsitektur-payment-gateway-flip.md` — Flip.
- `arsitektur-payment-gateway-xendit.md` — Xendit.
- `arsitektur-payment-gateway-midtrans.md` — Midtrans.

---

## Source of Truth Implementasi

| Area | File |
|------|------|
| Payment methods/create/webhook API | `apps/api/src/routes/payments.ts` |
| Transaction confirm/upload/qris API | `apps/api/src/routes/transactions.ts` |
| QRIS generator | `apps/api/src/services/qris-generator.ts` |
| Transaction service | `apps/api/src/services/transaction.ts` |
| Payment adapter factory | `apps/api/src/services/payment/index.ts` |
| Payment adapters | `apps/api/src/services/payment/*` |
| Transaction payment schema | `packages/db/src/schema/transaction-payments.ts` |
| Payment gateway schema | `packages/db/src/schema/payment.ts` |
| Gateway seed | `packages/db/src/seed.ts` |
| Admin payment settings | `apps/admin/src/app/dashboard/settings/payments/page.tsx` |
| Invoice route | `apps/web/src/app/invoice/[id]/page.tsx` |
| Payment method route | `apps/web/src/app/invoice/[id]/payment-method/page.tsx` |
| Payment detail route | `apps/web/src/app/invoice/[id]/payment-detail/page.tsx` |
| Universal invoice | `apps/web/src/components/UniversalInvoice.tsx` |
| Payment method selector | `apps/web/src/components/UniversalPaymentMethodSelector.tsx` |
| Payment detail selector | `apps/web/src/components/UniversalPaymentDetailSelector.tsx` |
| Legacy checkout route | `apps/web/src/app/checkout/**` |

---

## Metodologi Pembayaran

Universal payment saat ini punya empat kelompok metode:

| Kelompok | `type` API | Flow aktual | Verifikasi |
|----------|------------|-------------|------------|
| Transfer bank manual | `bank_transfer` | Donatur pilih rekening, transfer, upload proof | Admin approve/reject |
| Cash/tunai | `cash` | API bisa mengembalikan method, tetapi UI universal belum render cash | Belum usable di universal UI |
| QRIS manual | `qris` | Static image atau dynamic QRIS amount-locked, tetap upload proof | Admin approve/reject |
| Payment gateway | `payment_gateway` | `POST /v1/payments/create`, redirect/payment code, webhook provider | Gateway webhook dan/atau admin handling |

Catatan:

1. QRIS manual di sini berarti **QRIS non-gateway callback**. QR bisa static atau dynamic amount-locked, tetapi sistem tetap tidak menerima callback otomatis dari QRIS issuer.
2. Gateway QRIS seperti Xendit/Midtrans/iPaymu adalah flow berbeda dan didokumentasikan di gateway docs masing-masing.
3. Semua flow manual proof memakai endpoint upload proof yang GCS/CDN-required.

---

## Database Model

### `transaction_payments`

Tabel ini menyimpan record pembayaran per transaksi:

```text
transactionId
paymentNumber
amount
paymentMethod
paymentChannel
paymentProof
externalId
paymentCode
paymentUrl
qrCode
gatewayCode
expiredAt
status
verifiedAt
webhookPayload
```

Status `transaction_payments.status` umum:

```text
pending | verified | rejected
```

Detail status transaksi utama ada di `arsitektur-transaksi.md`.

### `payment_gateways`

Master gateway:

```text
id
code        -- "midtrans", "xendit", "ipaymu", "flip", "manual"
name
type        -- "auto" | "manual" dalam seed aktual
isActive
sortOrder
config
```

Seed resmi ada di `packages/db/src/seed.ts`:

```text
midtrans sortOrder 1
xendit   sortOrder 2
ipaymu   sortOrder 3
flip     sortOrder 4
manual   sortOrder 10
```

### `payment_gateway_credentials`

Kredensial gateway DB-based:

```text
gatewayId
environment
credentials
isActive
```

Catatan security:

1. Credential harus mengikuti kebijakan secret di `arsitektur-security.md`.
2. Gateway settings-based modern banyak membaca credential dari tabel `settings`, bukan tabel ini.

### `payment_methods`

Tabel `payment_methods` ada, tetapi bukan sumber utama method publik modern.

`POST /v1/payments/create` masih punya jalur DB-first:

```text
cari payment_methods.id = methodId
  -> gateway dari payment_methods.gatewayId
  -> credential dari payment_gateway_credentials
  -> adapter createPayment
```

Jika method DB tidak ditemukan, route fallback ke settings gateway:

```text
xendit | ipaymu | flip
```

### `bank_accounts`

Rekening organisasi untuk disbursement/bank account domain ada di schema terpisah. Untuk public payment method, transfer bank modern dibangun dari JSON setting:

```text
payment_bank_accounts
```

---

## Settings Payment

`GET /v1/payments/methods` membaca `settings` dengan `category = "payment"`.

| Setting | Fungsi |
|---------|--------|
| `payment_bank_transfer_enabled` | Aktifkan transfer bank manual |
| `payment_bank_accounts` | JSON array rekening bank penerima |
| `payment_cash_enabled` | Aktifkan cash/tunai di API |
| `payment_qris_enabled` | Aktifkan QRIS manual |
| `payment_qris_accounts` | JSON array akun QRIS manual |
| `payment_qris_name` | Legacy fallback single QRIS name |
| `payment_qris_image` | Legacy fallback single QRIS image |
| `payment_xendit_enabled` | Aktifkan Xendit di method list |
| `payment_ipaymu_enabled` | Aktifkan iPaymu di method list |
| `payment_flip_enabled` | Aktifkan Flip di method list |

Gateway settings detail:

- iPaymu: lihat `arsitektur-payment-gateway-ipaymu.md`.
- Flip: lihat `arsitektur-payment-gateway-flip.md`.
- Xendit: lihat `arsitektur-payment-gateway-xendit.md`.
- Midtrans: adapter ada tetapi tidak masuk settings-based provider modern; lihat `arsitektur-payment-gateway-midtrans.md`.

---

## API Payment Methods

Endpoint:

```http
GET /v1/payments/methods
```

Shape method:

```json
{
  "id": "method-id",
  "code": "method-code",
  "name": "Method Name",
  "type": "bank_transfer | cash | qris | payment_gateway",
  "details": {},
  "programs": ["general"]
}
```

### Transfer Bank

Jika `payment_bank_transfer_enabled = "true"`, API parse `payment_bank_accounts`.

Method shape:

```json
{
  "id": "bank-account-id",
  "code": "bank-account-id",
  "name": "BCA - 123456",
  "type": "bank_transfer",
  "details": {
    "bankName": "BCA",
    "accountNumber": "123456",
    "accountName": "Yayasan"
  },
  "programs": ["general"]
}
```

### Cash

Jika `payment_cash_enabled = "true"`, API mengembalikan:

```json
{
  "id": "cash",
  "code": "cash",
  "name": "Tunai / Cash",
  "type": "cash",
  "programs": ["general"]
}
```

Gap: `UniversalPaymentMethodSelector` belum merender `cash`.

### QRIS Manual

Jika `payment_qris_enabled = "true"`, API parse `payment_qris_accounts`.

Method shape:

```json
{
  "id": "qris-account-id",
  "code": "qris-account-id",
  "name": "QRIS",
  "type": "qris",
  "details": {
    "name": "QRIS",
    "imageUrl": "https://...",
    "isDynamic": true
  },
  "programs": ["general", "zakat"]
}
```

Catatan penting:

1. `GET /payments/methods` saat ini tidak mengirim `emvPayload` ke frontend. Ini benar dari sisi security/encapsulation; endpoint QRIS transaksi yang akan generate QR.
2. Jika `payment_qris_accounts` kosong, API fallback ke legacy `payment_qris_name` dan `payment_qris_image`.

### QRIS Dynamic — `GET /transactions/:id/qris`

File generator: `apps/api/src/services/qris-generator.ts`

Endpoint ini men-generate QR code QRIS dengan nominal terkunci sesuai `transaction.totalAmount`.

**Alur:**
```
1. Ambil transaksi → wajib status "pending"
2. Load setting "payment_qris_accounts" → pilih akun dengan isDynamic=true
3. Ambil EMV payload (field emvPayload) dari akun QRIS yang dipilih
4. Inject nominal ke Tag 54 (Transaction Amount):
   - Ubah Tag 01 dari "11" (static) → "12" (dynamic)
   - Hapus Tag 54 lama (jika ada)
   - Sisipkan Tag 54 baru dengan amount sebagai string integer IDR
5. Inject reference (transactionNumber) ke Tag 62 subtag 05
6. Recalculate CRC16-CCITT (Tag 63)
7. Generate SVG QR → base64 data URL
```

**Format response:**
```json
{
  "qrDataUrl": "data:image/svg+xml;base64,..."
  "amount": 150000,
  "transactionNumber": "TRX-20260703-12345",
  "accountName": "LAZ Darunnajah",
  "expiresAt": "..."
}
```

**Syarat penggunaan:**
- Transaksi harus `paymentStatus = "pending"` (bukan partial/paid/expired)
- Minimal satu akun QRIS dengan `isDynamic = true` di settings `payment_qris_accounts`
- Field `emvPayload` wajib ada di akun tersebut

### Payment Gateway

Jika enabled, API mengembalikan provider sebagai method type `payment_gateway`:

```text
xendit
ipaymu
flip
```

Midtrans tidak ditampilkan dari settings modern.

---

## Universal Invoice Route

Route resmi:

| Route | Component |
|-------|-----------|
| `/invoice/[id]` | `UniversalInvoice` |
| `/invoice/[id]/payment-method` | `UniversalPaymentMethodSelector` |
| `/invoice/[id]/payment-detail` | `UniversalPaymentDetailSelector` |

Checkout utama sudah redirect ke:

```text
/invoice/{firstTransaction.id}/payment-method
```

---

## UniversalPaymentMethodSelector

File:

```text
apps/web/src/components/UniversalPaymentMethodSelector.tsx
```

Tanggung jawab:

1. fetch transaksi: `GET /v1/transactions/:id`;
2. tentukan program transaksi;
3. fetch method: `GET /v1/payments/methods`;
4. filter method berdasarkan program;
5. render kartu tingkat type: bank transfer, QRIS, gateway;
6. trigger Meta Pixel `AddPaymentInfo`;
7. simpan `selectedMethodType` ke `sessionStorage`;
8. redirect ke payment detail atau create gateway payment.

Type yang dirender:

| Type | Perilaku |
|------|----------|
| `bank_transfer` | simpan type, redirect ke `/invoice/:id/payment-detail` |
| `qris` | simpan type, redirect ke `/invoice/:id/payment-detail` |
| `payment_gateway` | jika satu gateway langsung create payment; jika banyak redirect ke detail |
| `cash` | belum dirender |

### Program Detection

Untuk transaksi universal:

| `productType` | Program |
|---------------|---------|
| `zakat` | `zakat` |
| `qurban` | `qurban` |
| `campaign` | `typeSpecificData.pillar || "infaq"` |

Untuk legacy fallback:

| Kondisi | Program |
|---------|---------|
| `type === "zakat"` atau ada `zakatType` | `zakat` |
| `type === "qurban"` atau ada `package` | `qurban` |
| `campaign.pillar` ada | nilai `campaign.pillar` |
| fallback | `infaq` |

### Filter Method

Untuk method selain gateway:

```text
group by type
  -> specific program match jika ada
  -> general jika ada
  -> semua method type tersebut jika tidak ada general
```

Program kosong dianggap:

```text
["general"]
```

---

## UniversalPaymentDetailSelector

File:

```text
apps/web/src/components/UniversalPaymentDetailSelector.tsx
```

Tanggung jawab:

1. baca `sessionStorage.selectedMethodType`;
2. redirect balik ke method selector jika belum ada type;
3. fetch transaksi;
4. hitung default transfer amount;
5. fetch payment methods;
6. filter method sesuai type dan program;
7. auto-select method pertama;
8. tampilkan detail bank/QRIS;
9. validasi file bukti bayar;
10. confirm payment method;
11. upload proof;
12. hapus `selectedMethodType` setelah sukses;
13. redirect ke invoice.

Default amount:

```text
universal transaction: totalAmount + uniqueCode
legacy fallback: amount || totalAmount
```

---

## Flow Transfer Bank Manual

```text
1. Transaksi dibuat
2. User masuk /invoice/{id}/payment-method
3. User pilih Transfer Bank
4. UI simpan selectedMethodType = "bank_transfer"
5. Redirect /invoice/{id}/payment-detail
6. User pilih rekening
7. UI tampilkan bankName, accountNumber, accountName
8. User transfer manual
9. UI POST /transactions/{id}/confirm-payment
10. UI POST /transactions/{id}/upload-proof
11. API insert transaction_payments pending
12. API update transaction paymentStatus = processing
13. Admin approve/reject
```

Detail rekening berasal dari:

```text
PaymentMethod.details.bankName
PaymentMethod.details.accountNumber
PaymentMethod.details.accountName
```

Admin approve:

```http
POST /v1/admin/transactions/:id/approve-payment
```

Admin reject:

```http
POST /v1/admin/transactions/:id/reject-payment
```

Catatan:

1. Upload proof tidak memverifikasi bank transfer otomatis.
2. Admin approval yang mengubah transaksi menjadi `paid` atau `partial`.
3. Unique code tiga digit ditambahkan ke amount untuk identifikasi.

---

## Flow Cash

API method `cash` ada jika `payment_cash_enabled = "true"`, tetapi universal frontend belum menampilkan opsi cash.

Status:

| Area | Status |
|------|--------|
| API method list | Ada |
| Universal selector | Belum render |
| Detail/upload flow | Belum jelas |
| Admin verification | Bisa dibuat manual/admin-side, tetapi belum menjadi flow donor resmi |

Gap ini harus ditutup sebelum cash diklaim usable di public payment flow.

---

## QRIS Manual

QRIS manual adalah QRIS tanpa callback otomatis ke aplikasi. User tetap upload bukti, admin tetap verifikasi.

Ada dua mode:

| Mode | Syarat | Perilaku |
|------|--------|----------|
| Static QRIS | `isDynamic=false` atau tidak ada `emvPayload` | UI tampilkan `imageUrl` dari settings |
| Dynamic amount-locked QRIS | `isDynamic=true` dan `emvPayload` ada | API generate QR per transaksi dengan nominal `totalAmount + uniqueCode` |

### Struktur QRIS Account

`payment_qris_accounts` menyimpan array JSON.

Field yang dipakai:

```json
{
  "id": "qris-abc123",
  "name": "QRIS Yayasan",
  "imageUrl": "https://...",
  "programs": ["general", "zakat"],
  "isDynamic": true,
  "emvPayload": "00020101021126...",
  "merchantName": "YAYASAN",
  "merchantCity": "JAKARTA"
}
```

Catatan:

1. `GET /payments/methods` hanya mengirim `isDynamic`, `imageUrl`, dan metadata tampilan.
2. `emvPayload` dibaca server dari settings saat `GET /transactions/:id/qris`.
3. `emvPayload` tidak perlu dikirim ke frontend.

### Dynamic QRIS Generator

File:

```text
apps/api/src/services/qris-generator.ts
```

Fungsi:

| Fungsi | Peran |
|--------|-------|
| `parseTlv()` | Parse EMV TLV payload |
| `injectAmount()` | Hapus Tag 54 lama, ubah Tag 01 static ke dynamic bila perlu, inject amount |
| `injectReference()` | Inject reference ke Tag 62 subtag 05 |
| `calculateCrc()` | CRC16-CCITT |
| `generatePayload()` | Compose amount + optional reference |
| `generateQrDataUrl()` | Render QR SVG data URL via `qrcode` |
| `parseMerchantInfo()` | Parse Tag 59/60 |
| `validateCrc()` | Validasi CRC payload |

Dynamic amount:

```text
transaction.totalAmount + (transaction.uniqueCode || 0)
```

Reference:

```text
transaction.transactionNumber
```

### Endpoint QRIS Transaksi

```http
GET /v1/transactions/:id/qris
```

Syarat:

1. transaksi ada;
2. `paymentStatus` harus `pending` atau `partial`;
3. `paymentMethodId` sudah diset via `confirm-payment`;
4. `payment_qris_accounts` valid.

Resolusi akun QRIS:

```text
match by paymentMethodId
  -> jika tidak ada, match program spesifik
  -> jika tidak ada, fallback general
```

Response dynamic:

```json
{
  "success": true,
  "data": {
    "qrDataUrl": "data:image/svg+xml;base64,...",
    "payload": "000201...",
    "amount": 500740,
    "merchantName": "YAYASAN",
    "isDynamic": true,
    "expiresAt": null
  }
}
```

Response static:

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://...",
    "amount": 500740,
    "merchantName": "QRIS",
    "isDynamic": false,
    "expiresAt": null
  }
}
```

### Frontend QRIS

`UniversalPaymentDetailSelector`:

1. jika selected method QRIS dynamic:
   - `POST /transactions/:id/confirm-payment`;
   - `GET /transactions/:id/qris`;
   - render `qrisData.qrDataUrl`;
2. jika static:
   - render `qrisData.imageUrl` atau `selectedMethod.details.imageUrl`;
3. semua mode tetap tampilkan upload proof.

Gap QRIS:

1. Tidak ada expiry dynamic QRIS.
2. Tidak ada validasi CRC di admin settings saat menyimpan `emvPayload` yang terdokumentasi sebagai kontrak UI; service punya `validateCrc()`, tetapi perlu dipastikan dipakai di admin flow.
3. Tidak ada auto-confirm pembayaran karena ini bukan gateway callback.
4. Jika QRIS dynamic gagal fetch, UI fallback ke state kosong/static tergantung data; pesan error perlu dibuat lebih operasional.

---

## Upload Proof

Endpoint:

```http
POST /v1/transactions/:id/upload-proof
Content-Type: multipart/form-data
```

Fields wajib:

| Field | Rule |
|-------|------|
| `file` | wajib |
| `amount` | wajib dan `> 0` |
| `paymentDate` | wajib |

Validasi frontend:

| Field | Rule |
|-------|------|
| proof file | wajib |
| file type | `image/jpeg`, `image/jpg`, `image/png`, `application/pdf` |
| file size | max 5 MB |

Validasi/behavior API:

1. upload limit max 10 payment records;
2. GCS/CDN wajib aktif;
3. jika CDN off, HTTP 500 `Storage service not available`;
4. upload ke GCS;
5. insert `transaction_payments` status `pending`;
6. update `transactions.paidAmount += amount`;
7. update `transactions.paymentStatus = "processing"`;
8. kirim WhatsApp notification donor/admin jika memungkinkan;
9. fallback legacy masih ada untuk beberapa path lama.

CDN settings:

| Setting | Peran |
|---------|-------|
| `cdn_enabled` | harus `"true"` |
| `gcs_bucket_name` | bucket |
| `gcs_project_id` | project |
| `gcs_client_email` | service account |
| `gcs_private_key` | private key |

Tidak ada fallback lokal untuk upload proof transaksi.

---

## Confirm Payment

Endpoint:

```http
POST /v1/transactions/:id/confirm-payment
```

Body:

```json
{
  "paymentMethodId": "method-id",
  "metadata": {}
}
```

Untuk transaksi universal:

```text
transactions.paymentMethodId = paymentMethodId
transactions.updatedAt = now
```

Untuk QRIS dynamic, `confirm-payment` dipanggil sebelum `GET /transactions/:id/qris` agar backend tahu QRIS account mana yang dipilih.

---

## Payment Gateway Create

Endpoint:

```http
POST /v1/payments/create
```

Body:

```json
{
  "transactionId": "transaction-id",
  "methodId": "flip",
  "channel": "optional-channel"
}
```

Flow:

1. cari transaksi universal;
2. tolak jika `paymentStatus !== "pending"`;
3. coba cari DB `payment_methods.id = methodId`;
4. jika DB method ada, pakai gateway/credential DB;
5. jika DB method tidak ada, validasi settings gateway `xendit | ipaymu | flip`;
6. ambil credential dari settings;
7. cari `payment_gateways.code`;
8. buat adapter;
9. panggil `adapter.createPayment()`;
10. insert `transaction_payments`;
11. update `transactions.paymentMethodId` dan `paymentStatus`;
12. return `paymentUrl`, `paymentCode`, `qrCode`, `expiredAt`.

Gateway status ringkas:

| Gateway | Status |
|---------|--------|
| Flip | Flow paling sehat, tetapi ada risiko ID 19 digit; lihat dokumen Flip |
| iPaymu | Adapter ada, tetapi ada gap official base URL, notifyUrl, settings mode, legacy checkout payload |
| Xendit | Adapter parsial/dormant karena settings mismatch/frontend route gap |
| Midtrans | Adapter dormant; tidak ada settings admin normal dan webhook signature route belum sesuai official |

---

## Payment Webhook

Route:

```http
POST /v1/payments/:gateway/webhook
```

Peran:

1. menerima callback gateway;
2. ambil credential settings/DB;
3. verifikasi signature/token;
4. parse status provider;
5. cari `transaction_payments.externalId`;
6. update payment dan transaction;
7. trigger side effects seperti campaign collected, qurban savings sync, shared group slot confirmation, email, Meta CAPI.

Webhook bukan bagian QRIS manual. QRIS manual tetap upload proof.

Detail verification per gateway ada di:

- `arsitektur-security.md`;
- dokumen gateway masing-masing.

---

## UniversalInvoice

File:

```text
apps/web/src/components/UniversalInvoice.tsx
```

Tanggung jawab:

1. fetch transaksi `GET /v1/transactions/:id`;
2. render invoice universal dan legacy;
3. render logo/contact/footer invoice dari settings;
4. tampilkan status pembayaran;
5. tampilkan tombol pilih/bayar berdasarkan status;
6. generate PDF client-side dengan `html2canvas` + `jsPDF`.

Status label/color lokal:

| Status | Color |
|--------|-------|
| `pending` | yellow |
| `processing` | blue |
| `paid` | green |
| `verified` | green |
| `partial` | amber |
| `expired` | red |
| `cancelled` | gray |

Settings invoice:

| Setting | Peran |
|---------|-------|
| `organization_institution_logo` | logo |
| `organization_logo` | fallback logo |
| `organization_name` | nama |
| organization address/contact settings | kontak |
| `utilities_invoice_footer` | footer HTML invoice |

Catatan cleanup:

Audit root `hardcode-audit-frontend.md` pernah mencatat dummy address/phone/email langsung di `UniversalInvoice`. Audit ulang kode menunjukkan dummy address itu tidak lagi ada di komponen runtime; invoice sekarang menampilkan `organization_email` dan `organization_phone` dari settings jika tersedia. Yang masih ada adalah default `utilities_invoice_footer` di admin frontend settings dengan teks fallback umum dan email `info@bantuanku.id`; ini harus dianggap default seed/form value, bukan source kontak final.

---

## Admin Payment

Admin settings payment:

```text
apps/admin/src/app/dashboard/settings/payments/page.tsx
```

Mengatur:

1. bank transfer accounts;
2. cash enabled;
3. QRIS accounts;
4. Xendit/iPaymu/Flip settings;
5. upload QRIS image via MediaLibrary.

Admin transaction verification:

| Endpoint | Fungsi |
|----------|--------|
| `POST /v1/admin/transactions/:id/approve-payment` | approve payment manual |
| `POST /v1/admin/transactions/:id/reject-payment` | reject payment manual |
| `POST /v1/admin/transactions/:id/payments` | buat payment record manual |

Reject payment mengubah `paymentStatus` ke `failed`.

---

## Legacy Checkout Payment Routes

Selain invoice universal, route lama masih ada:

| Route | Catatan |
|-------|---------|
| `/checkout/payment-method` | Flow checkout lama |
| `/checkout/payment-detail` | Masih upload ke endpoint legacy seperti `/donations/:id/upload-proof` dan `/admin/zakat/donations/:id/upload-proof` |
| `/checkout/payment-gateway` | Flow gateway lama |
| `/checkout/ipaymu-channels` | Channel iPaymu lama |
| `/checkout/flip-channels` | Route Flip lama; membuat payment link dan redirect ke Flip |
| `/checkout/xendit-channels` | Dirujuk oleh payment-method jika Xendit satu-satunya gateway, tetapi route belum ada |

Keputusan:

1. Route resmi baru adalah invoice universal.
2. Legacy checkout route belum boleh dihapus sampai entry point lama diaudit.
3. Gateway legacy detail tetap dirujuk dari dokumen gateway masing-masing.

---

## Gap Implementasi

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| `cash` dikembalikan API tetapi tidak dirender universal selector | Cash terlihat aktif di settings/API tetapi tidak usable untuk donor | Tambah UI cash atau jangan tampilkan cash dari public methods |
| Multiple gateway masuk ke payment detail manual | User bisa diarahkan ke halaman yang meminta upload proof untuk gateway | Buat gateway selection flow khusus atau disable multi-gateway path sampai matang |
| State payment type bergantung `sessionStorage` | Refresh detail route tidak bookmarkable | Simpan method type di URL/query atau transaction state |
| Filter method/program diduplikasi | Risiko drift antara selector/detail/API QRIS | Buat helper shared |
| Program detection diduplikasi | Risiko QRIS/rekening salah fallback | Buat helper canonical program resolver |
| QRIS dynamic belum punya expiry | QR per transaksi tidak punya batas waktu eksplisit | Tambah expiry display dan policy |
| Validasi EMV/CRC admin belum menjadi kontrak kuat | QRIS dynamic bisa gagal jika payload invalid | Pakai `validateCrc()` saat save settings |
| Upload proof error kurang operasional | User tidak tahu jika storage/CDN off | Tampilkan pesan API dari `error.response.data.message` |
| Hardcoded warna payment masih ada | Theme payment tidak konsisten | Rujuk `arsitektur-color.md` |
| Legacy checkout masih ada | Dua flow payment bisa membingungkan | Audit entry point lalu migrasi/hapus bertahap |

---

## SOP Perubahan Payment

1. Setiap perubahan payment method harus update dokumen ini.
2. Setiap perubahan gateway provider harus update dokumen gateway spesifik dan rujukan di dokumen ini.
3. QRIS manual/dynamic tidak boleh diklaim auto-verified karena tidak punya webhook.
4. Upload proof harus tetap GCS/CDN-required kecuali arsitektur storage diubah dan didokumentasikan.
5. Jangan membuat dokumen payment paralel baru tanpa alasan domain kuat.
6. Jika QRIS manual kelak dibuat reusable package/guide, baru pertimbangkan `arsitektur-qris-manual.md`; untuk saat ini section dalam dokumen ini adalah sumber resmi.
7. Root blueprint/helper lama yang sudah diserap harus dihapus dari root agar tidak menjadi source of truth bayangan.

---

## Kesimpulan

1. `docs/arsitektur-universal-payment.md` adalah dokumen resmi tunggal untuk metodologi pembayaran.
2. `docs/arsitektur-universal-payment.md` sudah dihapus agar tidak terjadi duplikasi.
3. QRIS manual/static/dynamic masuk dokumen ini dan tetap berbeda dari QRIS gateway.
4. Gateway spesifik tetap dipisahkan karena kontrak provider berbeda.
5. Universal payment frontend resmi adalah invoice route, bukan legacy checkout payment route.
