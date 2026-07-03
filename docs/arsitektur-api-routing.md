# Arsitektur API Routing

> Terakhir di-sync: 2026-07-02

---

## Overview

API Bantuanku berjalan sebagai **Hono app di Node.js**, bukan Cloudflare Workers runtime production.

Entrypoint runtime:

```text
apps/api/server-node.ts -> apps/api/src/index.ts
```

Semua route aplikasi utama berada di prefix `/v1`. Root-level route hanya untuk health, file lokal, dan cron manual.

Dokumen terkait:

- `arsitektur-platform.md` — stack, port, env, middleware global ringkas.
- `arsitektur-deployment.md` — PM2, process runtime, scheduler.
- `arsitektur-auth.md` — JWT, auth endpoints, middleware auth.
- `arsitektur-permission-rbac.md` — route guard role/permission.
- `arsitektur-security.md` — CORS, security headers, webhook trust boundary, cron secret.
- `arsitektur-cache-performance.md` — compression, API cache middleware, cache headers, performance gap.
- `arsitektur-search-discovery.md` — `/v1/search`, `/v1/autocomplete`, listing discovery, dan sitemap.
- `arsitektur-pages-cms.md` — contract `/v1/pages` dan `/v1/admin/pages`.
- `arsitektur-testing-qa.md` — QA route/API, negative test, dan quality gate.
- `arsitektur-universal-payment.md` — payment webhook dan payment method.
- `arsitektur-media.md` — media upload dan `/uploads`.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Node server | `apps/api/server-node.ts` |
| Hono root app dan mount `/v1/*` | `apps/api/src/index.ts` |
| Admin router dan guard global | `apps/api/src/routes/admin/index.ts` |
| Auth middleware | `apps/api/src/middleware/auth.ts` |
| Security/content-type middleware | `apps/api/src/middleware/security.ts` |
| Rate limit middleware | `apps/api/src/middleware/ratelimit.ts` |
| DB middleware | `apps/api/src/middleware/db.ts` |
| Response helper | `apps/api/src/lib/response.ts` |
| Admin API client | `apps/admin/src/lib/api.ts` |
| Web API client | `apps/web/src/lib/api.ts` |

---

## Runtime Server

`apps/api/server-node.ts`:

- Load `.env` dari folder `apps/api/.env` dan `process.cwd()/.env`.
- Bind host dari `API_HOST`, default `127.0.0.1`.
- Bind port dari `API_PORT`, default `50245`.
- Inject Hono bindings: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ENVIRONMENT`, `API_URL`, `FRONTEND_URL`, `ADMIN_URL`, `RESEND_API_KEY`, `FROM_EMAIL`.
- Membuat folder lokal `uploads/` jika belum ada.
- Menyalakan scheduler jika `DATABASE_URL` tersedia:
  - `startSavingsReminderScheduler`.
  - `startDeveloperAutoDisbursementScheduler`.
- Graceful shutdown pada `SIGINT` dan `SIGTERM`.

Konsekuensi: process API bukan hanya HTTP server, tetapi juga membawa background scheduler. Jika API di-scale multi-instance, scheduler bisa berjalan ganda.

---

## Prefix dan Base URL

Frontend memakai base URL dengan suffix `/v1`:

```ts
process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1"
```

Contoh production:

```text
https://api.bantuanku.org/v1
```

Backend env `API_URL` berbeda fungsi: dipakai untuk membentuk absolute URL file/webhook dan biasanya **tanpa** suffix `/v1`, misalnya `http://127.0.0.1:50245`.

---

## Root-Level Routes

Route berikut tidak memakai prefix `/v1`:

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/` | Info API `{ name, version, status }`. |
| `GET` | `/health` | Health check sederhana dengan timestamp. |
| `GET` | `/uploads/:filename` | Serve file lokal dari memory map atau folder `uploads/`. |
| `GET` | `/cron/savings-reminder` | Trigger manual reminder tabungan qurban dengan query `secret`. |

`/cron/savings-reminder` memakai `JWT_SECRET` sebagai secret query. Ini bukan bagian `/v1` dan tidak memakai Bearer auth.

---

## Global Middleware Order

Semua request melewati middleware di `apps/api/src/index.ts` dengan urutan:

```text
logger
-> cors
-> securityHeaders
-> compressionMiddleware
-> prettyJSON
-> apiRateLimit
-> validateContentType
-> dbMiddleware
-> route handler
```

Catatan:

- `cors` dipasang sebelum middleware lain.
- `dbMiddleware` membuat dan memasang `c.set("db", db)` untuk route handler.
- `validateContentType` hanya memeriksa `POST`, `PUT`, `PATCH`.
- `sanitizeInput` ada di `middleware/security.ts`, tetapi tidak dipasang di root app.

---

## CORS

Implementasi CORS saat ini:

- Mengizinkan origin `http://localhost*`.
- Mengizinkan origin `file://*`.
- Mengizinkan `https://bantuanku.org`.
- Mengizinkan `https://admin.bantuanku.org`.
- Jika origin lain dikirim, fungsi saat ini mengembalikan origin tersebut.
- Jika tidak ada origin, fallback ke `*`.

Jadi perilaku aktual lebih longgar daripada komentar "production domains" karena origin arbitrary tetap dipantulkan.

Header CORS:

```ts
credentials: true
allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
exposeHeaders: ["Content-Length", "Content-Type"]
maxAge: 86400
```

---

## Content-Type Validation

Untuk `POST`, `PUT`, dan `PATCH`, request harus `application/json`, kecuali:

- `multipart/form-data` untuk upload file.
- `application/x-www-form-urlencoded` jika path mengandung `/webhook`.
- Path mengandung `/whatsapp/webhook`.
- `OPTIONS` selalu dilewati untuk CORS preflight.

Jika gagal, API mengembalikan `415`:

```json
{
  "success": false,
  "message": "Content-Type must be application/json"
}
```

---

## Rate Limiting

Rate limit memakai in-memory `Map`, key:

```text
<x-forwarded-for atau x-real-ip atau 127.0.0.1>:<request path>
```

Konfigurasi aktual:

| Limiter | Window | Limit | Dipakai |
|---------|--------|-------|---------|
| `apiRateLimit` | 1 menit | 300 request | Global untuk semua request. |
| `authRateLimit` | 15 menit | 20 request | `/auth/register`, `/auth/login`, forgot-password OTP flow. |
| `paymentRateLimit` | 1 menit | 10 request | `POST /v1/payments/create`. |

Header response:

```http
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

Catatan gap: rate limit in-memory tidak shared antar process dan akan reset saat process restart.

---

## Response Format

Helper resmi:

```ts
success(c, data, message?, status = 200)
error(c, message, status = 400, errors?)
paginated(c, data, { page, limit, total })
```

Format success:

```json
{
  "success": true,
  "message": "optional",
  "data": {}
}
```

Format error:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {}
}
```

Format paginated:

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

Gap: beberapa route legacy masih memakai `c.json()` langsung sehingga response belum sepenuhnya seragam.

Detail error envelope, status code, validasi Zod, dan gap response legacy dicatat di `arsitektur-error-handling.md`.

---

## Public `/v1` Routes

Mount route publik di `apps/api/src/index.ts`:

| Prefix | Route module | Sifat |
|--------|--------------|-------|
| `/v1/auth` | `routes/auth.ts` | Login/register/profile auth. Sebagian endpoint butuh token. |
| `/v1/campaigns` | `routes/campaigns.ts` | Public campaign list/detail/update/donors. |
| `/v1/categories` | `routes/categories.ts` | Public category lookup. |
| `/v1/pillars` | `routes/pillars.ts` | Public pillar lookup. |
| `/v1/donatur` | `routes/donatur.ts` | Public/donatur routes. |
| `/v1/payments` | `routes/payments.ts` | Payment methods, create payment, gateway webhook. |
| `/v1/qurban` | `routes/qurban.ts` | Public qurban, order, savings. Optional auth dipasang di route module. |
| `/v1/account` | `routes/account.ts` | Account routes, semua route memakai auth middleware. |
| `/v1/pages` | `routes/pages.ts` | Public CMS pages. |
| `/v1/settings` | `routes/settings-public.ts` | Public settings. |
| `/v1/search` | `routes/search.ts` | Public search. |
| `/v1/autocomplete` | `routes/autocomplete.ts` | Public autocomplete. |
| `/v1/public-stats` | `routes/public-stats.ts` | Statistik/laporan publik. |
| `/v1/address` | `routes/address-public.ts` | Lookup alamat publik. |
| `/v1/activity-reports` | `routes/activity-reports-public.ts` | Laporan kegiatan publik. |
| `/v1/indonesia` | `routes/indonesia.ts` | Data wilayah Indonesia. |
| `/v1/transactions` | `routes/transactions.ts` | Universal transaction; campuran public/auth/admin route-level guard. |
| `/v1/zakat` | `routes/zakat.ts` | Public zakat config/types/periods/calculator. |
| `/v1/fundraisers` | `routes/fundraisers.ts` | Public dan authenticated fundraiser self-service. |
| `/v1/mitra` | `routes/mitra.ts` | Public mitra routes. |
| `/v1/whatsapp` | `routes/whatsapp.ts` | GOWA webhook. |
| `/v1/testimonials` | `routes/testimonials.ts` | Public testimonials. |
| `/v1/jobs` | `routes/jobs.ts` | Public job/category lookup. |
| `/v1/income-ranges` | `routes/income-ranges.ts` | Public income range lookup. |

Public prefix tidak selalu berarti semua endpoint terbuka. Beberapa module memasang `authMiddleware`, `optionalAuthMiddleware`, atau `requireRole` di endpoint tertentu.

---

## Admin `/v1/admin` Routes

Semua route `/v1/admin/*` melewati:

```ts
admin.use("*", authMiddleware);
admin.use("*", requireRole(
  "super_admin",
  "admin_finance",
  "admin_campaign",
  "program_coordinator",
  "employee",
  "mitra"
));
```

Lalu sebagian besar prefix ditutup dengan `staffOnly` atau guard spesifik. Detail RBAC ada di `arsitektur-permission-rbac.md`.

Mount route admin:

| Prefix | Route module |
|--------|--------------|
| `/v1/admin/dashboard` | `routes/admin/dashboard.ts` |
| `/v1/admin/campaigns` | `routes/admin/campaigns.ts` |
| `/v1/admin/categories` | `routes/admin/categories.ts` |
| `/v1/admin/pillars` | `routes/admin/pillars.ts` |
| `/v1/admin/donatur` | `routes/admin/donatur.ts` |
| `/v1/admin/users` | `routes/admin/users.ts` |
| `/v1/admin/roles` | `routes/admin/roles.ts` |
| `/v1/admin/finance` | `routes/admin/finance.ts` |
| `/v1/admin/ledger/categories` | `routes/admin/ledger-categories.ts` |
| `/v1/admin/ledger` | `routes/admin/ledger.ts` |
| `/v1/admin/coa` | `routes/admin/coa.ts` |
| `/v1/admin/evidences` | `routes/admin/evidences.ts` |
| `/v1/admin/export` | `routes/admin/export.ts` |
| `/v1/admin/reports` | `routes/admin/reports.ts` |
| `/v1/admin/analytics` | `routes/admin/analytics.ts` |
| `/v1/admin/settings` | `routes/admin/settings.ts` |
| `/v1/admin/audit` | `routes/admin/audit.ts` |
| `/v1/admin/media` | `routes/admin/media.ts` |
| `/v1/admin/vendors` | `routes/admin/vendors.ts` |
| `/v1/admin/employees` | `routes/admin/employees.ts` |
| `/v1/admin/mustahiqs` | `routes/admin/mustahiqs.ts` |
| `/v1/admin/activity-reports` | `routes/admin/activity-reports.ts` |
| `/v1/admin/donations` | `routes/admin/donations.ts` |
| `/v1/admin/zakat/types` | `routes/admin/zakat-types.ts` |
| `/v1/admin/zakat/periods` | `routes/admin/zakat-periods.ts` |
| `/v1/admin/zakat/donations` | `routes/admin/zakat-donations.ts` |
| `/v1/admin/zakat/distributions` | `routes/admin/zakat-distributions.ts` |
| `/v1/admin/zakat/stats` | `routes/admin/zakat-stats.ts` |
| `/v1/admin/qurban` | `routes/admin/qurban.ts` |
| `/v1/admin/qurban/savings` | `routes/admin/qurban-savings.ts` |
| `/v1/admin/address` | `routes/admin/address.ts` |
| `/v1/admin/disbursements` | `routes/admin/disbursements.ts` |
| `/v1/admin/bank-accounts` | `routes/admin/bank-accounts.ts` |
| `/v1/admin/fundraisers` | `routes/admin/fundraisers.ts` |
| `/v1/admin/mitra` | `routes/admin/mitra.ts` |
| `/v1/admin/transactions` | `routes/transactions.ts` |
| `/v1/admin/revenue-shares` | `routes/admin/revenue-shares.ts` |
| `/v1/admin/whatsapp` | `routes/admin/whatsapp.ts` |
| `/v1/admin/pages` | `routes/admin/pages.ts` |
| `/v1/admin/income-ranges` | `routes/admin/income-ranges.ts` |
| `/v1/admin/statistics` | `routes/admin/statistics.ts` |

Catatan penting: `/v1/admin/transactions` memakai module yang sama dengan `/v1/transactions`, bukan file khusus `routes/admin/transactions.ts`.

---

## Webhook Routes

Webhook aktual:

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/v1/payments/:gateway/webhook` | Payment gateway webhook untuk `ipaymu`, `flip`, `xendit`, dan adapter lain yang didukung route. |
| `POST` | `/v1/whatsapp/webhook` | GOWA WhatsApp incoming message webhook. |

Content-type middleware memberi pengecualian untuk path yang mengandung `/webhook`, termasuk form-urlencoded Flip.

Gap: service adapter iPaymu masih memiliki contoh notify URL lama `/v1/webhooks/ipaymu`, sedangkan route aktual adalah `/v1/payments/:gateway/webhook`.
Detail iPaymu ada di `docs/arsitektur-payment-gateway-ipaymu.md`.
Detail Flip, termasuk form-urlencoded callback dan risiko ID 19 digit, ada di `docs/arsitektur-payment-gateway-flip.md`.
Detail Xendit, termasuk gap frontend route dan webhook Payments API v3, ada di `docs/arsitektur-payment-gateway-xendit.md`.
Detail Midtrans, termasuk route webhook generic yang belum membaca `signature_key` body, ada di `docs/arsitektur-payment-gateway-midtrans.md`.

---

## Frontend API Client

Admin dan web memakai axios client dengan base URL:

```ts
process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1"
```

Keduanya:

- Default `Content-Type: application/json`.
- Auto attach `Authorization: Bearer <token>` dari localStorage.
- Menghapus `Content-Type` saat body berupa `FormData`.
- Redirect ke `/login` saat response `401`.

Perbedaan:

- `apps/web/src/lib/api.ts` memakai `withCredentials: true`.
- `apps/web/src/lib/api.ts` punya fallback membaca token dari persisted `auth-storage`.
- `apps/admin/src/lib/api.ts` hanya membaca `localStorage["token"]`.

---

## Dokumentasi Lama yang Digantikan

Root `API.md` adalah dokumentasi lama dan digantikan oleh dokumen ini plus dokumen domain terkait.

Koreksi dari `API.md` lama:

- Rate limit bukan `5/15m` untuk auth dan `60/min` global; implementasi aktual adalah `20/15m` auth dan `300/min` global.
- Register membutuhkan `whatsappNumber`, bukan hanya `email`, `password`, `name`, `phone`.
- Login response memakai `accessToken`, bukan `token`.
- Donation flow tidak lagi menggunakan endpoint lama `POST /donations`; source of truth transaksi ada di `arsitektur-transaksi.md` dan `routes/transactions.ts`.
- Postman collection yang disebut `postman_collection.json` tidak ada di repo.
- Payment method berasal dari settings runtime, bukan static master response seperti contoh lama.

---

## Gaps dan Risiko

1. **CORS terlalu longgar.** Origin arbitrary dipantulkan, sehingga whitelist production tidak benar-benar membatasi.
2. **Rate limit in-memory.** Tidak cocok untuk multi-instance dan restart akan menghapus counter.
3. **Response format belum konsisten.** Sebagian route memakai helper, sebagian `c.json()` langsung.
4. **`sanitizeInput` tidak dipakai.** Middleware ada tetapi tidak mounted.
5. **Route comments bisa misleading.** Admin comment menyebut mitra bisa akses activity reports, tetapi handler activity reports tidak mengizinkan `mitra`.
6. **Namespace transaksi campuran.** `routes/transactions.ts` dipakai sebagai public route dan admin route; ini praktis, tetapi perlu disiplin guard per endpoint.
7. **Webhook URL lama masih tersisa di adapter/service.** iPaymu adapter menyebut `/v1/webhooks/ipaymu`, tidak sama dengan route aktual.
8. **API route catalog masih manual.** Tidak ada generator/OpenAPI spec dari Hono route definitions.
9. **Backend `API_URL` dan frontend `NEXT_PUBLIC_API_URL` punya semantik berbeda.** Frontend harus berakhir `/v1`, backend umumnya tidak.
10. **Scheduler berada di process API.** Ini routing/deployment concern karena scaling HTTP bisa ikut menggandakan job background.

---

## Rekomendasi Perbaikan

1. Kunci CORS ke allowlist env-based, misalnya `CORS_ORIGINS`, tanpa fallback memantulkan arbitrary origin.
2. Pindahkan rate limit ke Redis/Postgres-backed limiter jika production multi-instance.
3. Buat `route-manifest.ts` atau OpenAPI generator agar daftar route tidak drift dari kode.
4. Standarkan semua response ke `success`, `error`, dan `paginated`.
5. Putuskan apakah `sanitizeInput` akan dipasang atau dihapus agar tidak menjadi dead code.
6. Pisahkan module `admin/transactions.ts` dari public `transactions.ts` jika guard transaksi makin kompleks.
7. Koreksi URL webhook lama di adapter payment agar hanya ada satu canonical webhook path.
8. Pisahkan scheduler dari API process atau tambahkan distributed lock sebelum scale API.
9. Tambahkan smoke test route: `/health`, CORS preflight, content-type 415, auth 401/403, payment webhook content-type, dan notFound 404.
