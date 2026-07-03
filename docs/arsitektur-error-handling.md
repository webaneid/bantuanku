# Arsitektur Error Handling

> Terakhir di-sync: 2026-07-02

---

## Overview

Error handling API Bantuanku saat ini belum sepenuhnya seragam.

Target konvensi modern memakai helper `success()`, `error()`, dan `paginated()` dari `apps/api/src/lib/response.ts`. Namun beberapa modul legacy masih mengembalikan `c.json()` langsung dengan shape berbeda, terutama `{ error: "..." }`.

Dokumen terkait:

- `arsitektur-api-routing.md` — middleware order, route mount, not found, webhook.
- `arsitektur-observability-logging.md` — runtime logs, request id, metrics, logging gap.
- `arsitektur-auth.md` — error auth 401/403.
- `arsitektur-permission-rbac.md` — guard role dan forbidden.
- `arsitektur-platform.md` — konvensi umum response API.
- `arsitektur-universal-payment.md` — payment webhook dan upload proof.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Response helper | `apps/api/src/lib/response.ts` |
| Root notFound/onError | `apps/api/src/index.ts` |
| Auth dan role errors | `apps/api/src/middleware/auth.ts` |
| Content-type validation | `apps/api/src/middleware/security.ts` |
| Rate limit error | `apps/api/src/middleware/ratelimit.ts` |
| Frontend API interceptors | `apps/admin/src/lib/api.ts`, `apps/web/src/lib/api.ts` |
| Contoh helper modern | `apps/api/src/routes/auth.ts`, `admin/activity-reports.ts`, `admin/reports.ts` |
| Contoh legacy response | `apps/api/src/routes/qurban.ts`, `admin/employees.ts`, `admin/vendors.ts`, `admin/zakat-types.ts` |

---

## Response Helper Resmi

`apps/api/src/lib/response.ts` mendefinisikan tiga helper.

### `success`

```ts
success(c, data, message?, status = 200)
```

Shape:

```json
{
  "success": true,
  "message": "optional",
  "data": {}
}
```

Catatan: field `message` tetap muncul walaupun nilainya `undefined` pada beberapa response JSON.

### `error`

```ts
error(c, message, status = 400, errors?)
```

Shape:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {}
}
```

### `paginated`

```ts
paginated(c, data, { page, limit, total })
```

Shape:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## Root Error Handler

`apps/api/src/index.ts` memiliki dua handler global.

### `notFound`

Semua route tidak dikenal mengembalikan:

```json
{
  "success": false,
  "message": "Not found"
}
```

Status: `404`.

### `onError`

Unhandled exception dicatat ke console:

```ts
console.error("Error:", err);
```

Response:

```json
{
  "success": false,
  "message": "Internal server error"
}
```

Status: `500`.

Jika `ENVIRONMENT !== "production"`, `message` memakai `err.message`, sehingga detail error internal bisa tampil di development.

---

## Middleware-Level Errors

| Middleware | Kondisi | Status | Shape |
|------------|---------|--------|-------|
| `authMiddleware` | Tidak ada Bearer token | `401` | helper `error`: `{ success:false, message:"Unauthorized" }` |
| `authMiddleware` | Token invalid/expired | `401` | helper `error`: `{ success:false, message:"Invalid or expired token" }` |
| `requireRole` | Tidak ada user context | `401` | helper `error`: `{ success:false, message:"Unauthorized" }` |
| `requireRole` | Role tidak cocok | `403` | helper `error`: `{ success:false, message:"Forbidden" }` |
| `requireDeveloper` | Bukan developer | `403` | helper `error`: `{ success:false, message:"Forbidden" }` |
| `validateContentType` | Body non-JSON untuk POST/PUT/PATCH | `415` | manual `{ success:false, message:"Content-Type must be application/json" }` |
| `rateLimit` | Limit terlampaui | `429` | manual `{ success:false, message:"Too many requests, please try again later" }` |

Catatan: `authMiddleware` dan `requireRole` masih mencetak payload/role/header request ke console dalam beberapa kasus. Ini bukan format error response, tetapi penting sebagai risiko logging.

---

## Validation Errors

Ada tiga pola validasi aktual.

### `zValidator` default

Banyak route memakai:

```ts
zValidator("json", schema)
zValidator("query", schema)
```

Jika validasi gagal, response berasal dari `@hono/zod-validator`, bukan helper lokal. Shape error bisa berbeda dari helper `error()`.

### `zValidator` dengan custom callback

Contoh `admin/donatur.ts`:

```json
{
  "success": false,
  "message": "Validation error: field: message",
  "errors": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

Status: `400`.

### Manual `schema.parse()` di `try/catch`

Beberapa route legacy memakai:

```ts
const validated = schema.parse(body);
```

Jika `ZodError`, response biasanya:

```json
{
  "error": "Pesan error pertama"
}
```

Status: `400`.

Contoh pola ini ada di `admin/employees.ts`, `admin/vendors.ts`, `admin/mitra.ts`, dan beberapa endpoint aktivasi user.

---

## Legacy Error Shapes

Sistem saat ini punya dua shape error besar.

### Shape modern

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": {}
}
```

Dipakai oleh helper `error()`.

### Shape legacy

```json
{
  "error": "Employee not found"
}
```

Atau:

```json
{
  "error": "Failed to fetch order",
  "message": "raw error message"
}
```

Dipakai di beberapa route lama, terutama qurban, employees, vendors, mustahiq/zakat distribution UI flows, dan sebagian master data.

Implikasi frontend: UI saat ini sering membaca salah satu dari:

```ts
error.response?.data?.message
error.response?.data?.error
```

Tidak ada satu util standar untuk ekstraksi pesan error.

---

## Status Code Aktual

| Status | Pemakaian aktual |
|--------|------------------|
| `400` | Bad request, validasi manual, business rule gagal, missing required field. |
| `401` | Tidak login, token invalid/expired, refresh token invalid. |
| `403` | Role tidak cukup, akun disabled, forbidden ownership/scope. |
| `404` | Resource tidak ditemukan; kadang dipakai untuk menyembunyikan resource milik user lain. |
| `409` | Conflict slug, misalnya pages slug sudah digunakan. Tidak dipakai konsisten untuk semua duplicate. |
| `410` | Endpoint legacy ledger account balance deprecated. |
| `415` | Content-Type tidak didukung. |
| `422` | Invalid category mapping di beberapa report. |
| `429` | Rate limit. |
| `500` | Unhandled/internal error, konfigurasi corrupt, fetch external gagal. |

Catatan: duplicate resource sering masih memakai `400`, bukan `409`.

---

## Domain Error Patterns

| Domain | Pola dominan |
|--------|--------------|
| Auth | Mayoritas helper `error()`, message user-facing cukup stabil. |
| Admin reports | Helper `error()`, memakai `422` untuk invalid category mapping. |
| Activity reports | Helper `error()` dan `zValidator`. |
| Disbursements | Helper `error()`, banyak business-rule error memakai `400`/`403`. |
| Transactions | Campuran helper dan manual `c.json({ success:false, message })`. |
| Qurban public/admin | Banyak legacy `{ error }`, sebagian endpoint baru sudah helper. |
| Employees/vendors | Banyak legacy `{ error }` dari `try/catch` manual. |
| Zakat types | Banyak legacy `{ error }`. |
| Payments | Mayoritas helper `error()`, webhook catch punya handling sendiri. |

---

## Frontend Error Handling

Admin dan web axios interceptor:

- Menambahkan Bearer token.
- Jika response `401`, hapus `token`, `user`, `auth-storage`, lalu redirect ke `/login`.
- Tidak ada normalisasi global untuk pesan error selain redirect `401`.

Di level komponen, pola yang dipakai campuran:

```ts
error.response?.data?.message || "fallback"
error.response?.data?.error || "fallback"
error.response?.data?.error || error.response?.data?.message || "fallback"
```

Risiko: jika backend mengembalikan shape berbeda dari yang dibaca komponen, user hanya melihat fallback generik.

---

## Logging Error

Pola logging aktual:

- `app.onError` log `console.error("Error:", err)`.
- Banyak `catch` route log `console.error("Error ...:", error)`.
- Auth middleware log token payload, role, dan sebagian request header upload media.
- Beberapa external integration catch log error tetapi tidak menggagalkan flow, misalnya WhatsApp notification.

Gap: belum ada structured logger, request id, correlation id, atau severity level.

---

## Gaps dan Risiko

1. **Shape error belum seragam.** Ada `{ success:false, message }`, `{ error }`, dan kombinasi `{ error, message }`.
2. **Frontend tidak punya extractor standar.** Komponen membaca `message` atau `error` sendiri-sendiri.
3. **`zValidator` default tidak dinormalisasi.** Error validasi bisa berbeda dari helper lokal.
4. **Business rule memakai status code tidak konsisten.** Duplicate kadang `400`, kadang `409`; invalid semantic kadang `400`, kadang `422`.
5. **Unhandled error development bisa mengekspos `err.message`.** Ini benar untuk debug, tetapi harus dipastikan `ENVIRONMENT=production` di production.
6. **Logging auth terlalu sensitif.** Payload JWT, role, dan headers bisa muncul di log.
7. **Tidak ada error code machine-readable.** Frontend sulit membedakan `VALIDATION_ERROR`, `FORBIDDEN`, `DUPLICATE_SLUG`, dan error bisnis lain tanpa parsing string.
8. **Tidak ada request id.** Investigasi error lintas frontend/backend/log sulit.
9. **Catch legacy sering mengembalikan 500 generik.** Detail operasional tidak distandarkan dan kadang hilang.
10. **Response helper memasukkan `message`/`errors` walau undefined.** Ini kecil, tetapi membuat kontrak JSON kurang rapi.

---

## Rekomendasi Perbaikan

1. Tetapkan envelope error tunggal:

```json
{
  "success": false,
  "message": "Human readable message",
  "code": "VALIDATION_ERROR",
  "errors": {}
}
```

2. Buat `ApiError` class atau helper domain:

```ts
throw new ApiError(404, "NOT_FOUND", "Campaign not found")
```

3. Pasang wrapper/custom callback untuk semua `zValidator` agar validasi selalu memakai envelope resmi.
4. Migrasikan route legacy dari `{ error }` ke helper `error()`, mulai dari qurban, employees, vendors, dan zakat-types.
5. Tambahkan frontend helper:

```ts
getApiErrorMessage(error, fallback)
```

yang membaca `message`, `error`, `errors`, dan Axios network error secara konsisten.

6. Standarkan status code:
   - `400` untuk malformed/missing input.
   - `401` untuk tidak terautentikasi.
   - `403` untuk tidak punya akses.
   - `404` untuk resource tidak ada atau sengaja disembunyikan.
   - `409` untuk conflict/duplicate.
   - `422` untuk input valid secara syntax tetapi gagal aturan domain kompleks.
   - `500` untuk kesalahan server atau konfigurasi internal.
7. Kurangi log sensitif auth dan aktifkan debug detail hanya dengan flag env.
8. Tambahkan request id middleware dan masukkan `requestId` ke response error 500.
9. Buat smoke test untuk response shape minimal pada 400/401/403/404/415/429/500.
10. Rapikan helper response agar field optional tidak dikirim saat `undefined`, bila tidak merusak kompatibilitas frontend.

Detail observability dan logging runtime dicatat di `arsitektur-observability-logging.md`.
