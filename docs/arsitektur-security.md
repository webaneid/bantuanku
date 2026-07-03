# Arsitektur Security

> Terakhir di-sync: 2026-07-02

---

## Overview

Security Bantuanku saat ini adalah kombinasi:

- JWT stateless untuk authentication;
- role guard (`requireRole`) untuk authorization;
- middleware CORS, security headers, content-type validation, dan rate limit;
- validasi file upload per endpoint;
- verifikasi signature/token pada payment webhook;
- penyimpanan secret di env dan sebagian di tabel `settings`.

Dokumen ini mencatat **arsitektur security yang benar-benar berjalan di kode**, bukan target ideal. Semua gap di bawah adalah backlog security yang harus diprioritaskan sebelum sistem diperlakukan matang untuk skala production.

Dokumen terkait:

- `arsitektur-auth.md` — JWT, token storage, middleware auth.
- `arsitektur-permission-rbac.md` — role guard, permission table, gap RBAC.
- `arsitektur-api-routing.md` — middleware global, CORS, route publik/root.
- `arsitektur-cache-performance.md` — cache publik, in-memory state, rate limit Map, dan cache safety.
- `arsitektur-search-discovery.md` — public search/autocomplete, exposure user email, dan discovery privacy.
- `arsitektur-pages-cms.md` — CMS HTML rendering, `dangerouslySetInnerHTML`, dan trust boundary admin content.
- `arsitektur-documentation-center.md` — static documentation `bodyHtml` dan trust boundary repo content.
- `arsitektur-error-handling.md` — error envelope dan risiko exposure error.
- `arsitektur-observability-logging.md` — log runtime, PII, secret leakage.
- `arsitektur-settings.md` — penyimpanan konfigurasi dan secret di DB.
- `arsitektur-universal-payment.md` — payment gateway, upload bukti bayar, webhook.
- `arsitektur-media.md` — upload media, GCS/local storage.
- `arsitektur-deployment.md` — PM2, env production, runtime boundary.
- `arsitektur-testing-qa.md` — quality gate, security QA, dan regression test yang belum ada.
- `arsitektur-ci-cd.md` — security gate pipeline, secret handling pipeline, dan release risk.
- `arsitektur-audit-log.md` — audit trail formal yang saat ini belum otomatis.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Hono root app, CORS, middleware order, cron route | `apps/api/src/index.ts` |
| Node runtime dan env injection | `apps/api/server-node.ts` |
| Security headers, content-type validation, input sanitizer | `apps/api/src/middleware/security.ts` |
| Rate limit | `apps/api/src/middleware/ratelimit.ts` |
| Auth middleware dan role guard | `apps/api/src/middleware/auth.ts` |
| JWT sign/verify | `apps/api/src/lib/jwt.ts` |
| Password hash | `apps/api/src/lib/password.ts` |
| Secret encryption helper | `apps/api/src/lib/encryption.ts` |
| Settings admin/public | `apps/api/src/routes/admin/settings.ts`, `apps/api/src/routes/settings-public.ts` |
| Payment webhook dan gateway adapters | `apps/api/src/routes/payments.ts`, `apps/api/src/services/payment/**` |
| WhatsApp webhook | `apps/api/src/routes/whatsapp.ts` |
| Upload transaksi | `apps/api/src/routes/transactions.ts` |
| Media library upload | `apps/api/src/routes/admin/media.ts` |
| Admin/web API client dan token storage | `apps/admin/src/lib/api.ts`, `apps/admin/src/lib/auth.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth.ts` |
| PM2 production config | `ecosystem.config.cjs` |
| Next.js frontend headers | `apps/admin/next.config.ts`, `apps/web/next.config.js` |
| Seed default user/role | `packages/db/src/seed.ts` |

---

## Trust Boundary

| Boundary | Status Aktual |
|----------|---------------|
| Public web/admin browser ke API | Bearer token via `Authorization` header; token disimpan di `localStorage`. |
| Public endpoint tanpa auth | Campaign, settings publik, checkout, payment webhook, WhatsApp webhook, upload bukti transaksi by transaction id. |
| Admin endpoint | Dijaga `authMiddleware` + `requireRole`. Permission table belum enforce runtime. |
| External payment gateway ke API | Webhook diverifikasi oleh adapter gateway, tetapi sebagian log masih mencetak payload/signature. |
| WhatsApp provider/bot ke API | Webhook menerima request tanpa signature verification runtime. |
| File storage | GCS untuk sebagian flow; local `uploads/` untuk media fallback dan beberapa flow lain. |
| Secrets | Env + tabel `settings`; enkripsi settings sensitif belum konsisten. |

---

## Authentication

Auth memakai JWT stateless:

| Komponen | Implementasi |
|----------|---------------|
| Algorithm | `HS256` via `jose`. |
| Secret | `JWT_SECRET`. |
| Access token | Default `15m`, override `JWT_EXPIRES_IN`. |
| Refresh token | `7d`, juga stateless JWT. |
| Session store | Tidak ada. |
| Revocation | Tidak ada revocation list / refresh token table. |
| Logout | Frontend menghapus local storage; API tidak punya endpoint logout. |

JWT payload berisi `sub`, `email`, `name`, `phone`, `whatsappNumber`, `roles`, dan `isDeveloper`.

Konsekuensi:

1. Perubahan role user tidak langsung efektif sampai token lama refresh/expired.
2. Refresh token tidak bisa dicabut per device/session.
3. Bila `localStorage` terkena XSS, access token dan refresh token bisa dicuri.

---

## Password dan OTP

| Area | Implementasi |
|------|--------------|
| Password helper | `bcryptjs` dengan `SALT_ROUNDS = 12`. |
| Employee activation | Ada path yang memakai `bcrypt.hash(password, 10)` langsung di route employee. |
| Forgot password OTP | OTP 6 digit, hash SHA-256 dengan `JWT_SECRET`, TTL 5 menit, max attempts 5. |
| Seed admin | `packages/db/src/seed.ts` membuat `admin@bantuanku.org` dengan password default `admin123`. |
| Seed developer | Default credential developer ada di seed jika env `SEED_DEVELOPER_*` tidak diset. |

Gap:

1. Password default seed tidak boleh hidup di production tanpa rotasi paksa.
2. Cost bcrypt harus konsisten lewat helper, bukan hardcoded per route.
3. OTP hash memakai `JWT_SECRET`; lebih baik memakai secret khusus OTP/password reset.

---

## Authorization dan RBAC

Runtime authorization saat ini role-based:

```text
authMiddleware -> c.set("user") -> requireRole(...)
```

Permission table (`permissions`, `role_permissions`) sudah ada dan bisa dikelola, tetapi belum dipakai oleh middleware enforcement.

Gap security penting:

1. `requireRole` hanya mengecek role slug dari JWT, bukan permission granular.
2. Role stale sampai token refresh/expired.
3. Endpoint role assignment tertentu menerima role slug yang ada di DB tanpa allowlist per aktor. Contoh risiko: `admin_campaign` pada flow employee dapat diberi akses endpoint yang menerima perubahan role, sehingga perlu pembatasan eksplisit role target.
4. Audit trail otomatis untuk perubahan role/permission belum aktif.

Rujukan detail: `arsitektur-permission-rbac.md`.

---

## CORS dan Security Headers

### CORS API

`apps/api/src/index.ts` memasang CORS global dengan `credentials: true`.

Origin yang dikenali:

- localhost development;
- `https://bantuanku.org`;
- `https://www.bantuanku.org`;
- `https://admin.bantuanku.org`.

Namun callback CORS saat ini fallback ke:

```ts
return origin || "*";
```

Konsekuensi: origin yang tidak ada di allowlist tetap direfleksikan. Dengan `credentials: true`, konfigurasi ini terlalu permisif untuk production.

### Security headers API

`securityHeaders` memasang:

| Header | Nilai |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;` |
| `Permissions-Policy` | disable geolocation, microphone, camera, payment |

Catatan:

1. CSP API masih mengizinkan `'unsafe-inline'`.
2. Header ini dipasang di API Hono, bukan otomatis di semua response Next.js.
3. `apps/web/next.config.js` hanya menambahkan `X-DNS-Prefetch-Control` dan `X-Frame-Options: SAMEORIGIN`.
4. `apps/admin/next.config.ts` belum mendefinisikan security headers.

---

## Content-Type dan Input Sanitization

`validateContentType` dipasang global:

- berlaku untuk `POST`, `PUT`, `PATCH`;
- menerima `application/json`;
- menerima `multipart/form-data`;
- menerima `application/x-www-form-urlencoded` untuk path webhook;
- skip untuk `OPTIONS`;
- return `415` jika content-type tidak valid.

`sanitizeInput` tersedia di `apps/api/src/middleware/security.ts`, tetapi **tidak dipasang** di root app. Jadi sanitasi body/query/param yang ada di file itu belum menjadi proteksi runtime.

Validasi input utama dilakukan per route dengan kombinasi manual check dan `zod` di beberapa endpoint.

---

## Rate Limiting dan Abuse Control

Rate limit saat ini in-memory:

| Middleware | Limit |
|------------|-------|
| API global | 300 request / menit |
| Auth | 20 request / 15 menit |
| Payment create | 10 request / menit |

Gap:

1. Rate limit tidak distributed; reset saat process restart.
2. Multi-instance API akan punya counter berbeda.
3. Tidak ada account-based login lockout.
4. Webhook publik, upload, dan endpoint high-cost masih bergantung terutama pada global rate limit.

---

## Secrets dan Encryption

Secret source:

| Lokasi | Contoh |
|--------|--------|
| Env API | `DATABASE_URL`, `JWT_SECRET`, gateway/env runtime. |
| Tabel `settings` | CDN/GCS, WhatsApp, payment gateway, SEO/public settings. |
| Seed/default | Password admin/developer default di seed. |

`apps/api/src/lib/encryption.ts` memakai AES-256-CBC dengan key dari:

```text
ENCRYPTION_KEY || JWT_SECRET || "default_fallback_secret_key_32_bytes"
```

Gap security:

1. AES-CBC tidak memberi integrity/authentication tag seperti AES-GCM.
2. Ada fallback default secret bila env tidak ada.
3. `encrypt()` mengembalikan plaintext saat gagal.
4. `decrypt()` mengembalikan input asli saat gagal.
5. Sensitive key detection hanya berbasis substring `_api_key`, `_secret`, `_access_token`.
6. Key seperti `gcs_private_key` tidak otomatis masuk pola sensitif tersebut.

### Settings encryption inconsistency

Admin settings punya perilaku berbeda per endpoint:

| Endpoint | Perilaku |
|----------|----------|
| `GET /admin/settings` | Mendekripsi value sensitif untuk admin. |
| `PUT /admin/settings/batch` | Mengenkripsi key sensitif berbasis substring tertentu. |
| `PATCH /admin/settings/:key` | Update raw `value`, tidak menjalankan pola enkripsi yang sama. |
| `GET /admin/settings/:key` | Mengambil satu setting tanpa masking/dekripsi konsisten seperti list. |

Konsekuensi:

1. Secret bisa tersimpan plaintext atau ciphertext tergantung endpoint update.
2. Integrasi yang membaca setting langsung dapat menerima ciphertext bila data disimpan via batch encryption.
3. Admin API dapat mengekspos secret penuh kepada role yang boleh membaca settings.

---

## Webhook Security

### Payment webhook

Endpoint:

```http
POST /v1/payments/:gateway/webhook
```

Adapter gateway melakukan verifikasi:

| Gateway | Verifikasi Aktual |
|---------|-------------------|
| Flip | `bcrypt.compare(token, validationTokenHash)`. |
| Xendit | Header callback token dibandingkan dengan token setting. |
| iPaymu | HMAC SHA-256 atas `JSON.stringify(payload)`, base64. |
| Midtrans | Signature SHA-512 berbasis order/status/gross/server key. |

Gap:

1. Flip webhook mencetak payload dan token ke log.
2. Webhook payload disimpan raw di DB; payload bisa berisi PII atau detail pembayaran.
3. Tidak ada replay protection eksplisit.
4. Tidak ada IP allowlist gateway.
5. iPaymu signature memakai re-serialized JSON, bukan raw body; ini bisa bermasalah jika provider menandatangani raw request body.
6. Detail iPaymu dan gap route/settings ada di `docs/arsitektur-payment-gateway-ipaymu.md`.
7. Detail Flip, termasuk bcrypt callback token, logging token, dan risiko ID 19 digit, ada di `docs/arsitektur-payment-gateway-flip.md`.
8. Detail Xendit, termasuk callback token, settings mismatch, dan gap webhook Payments API v3, ada di `docs/arsitektur-payment-gateway-xendit.md`.
9. Detail Midtrans, termasuk gap `signature_key` body, QRIS mapping, dan status dormant, ada di `docs/arsitektur-payment-gateway-midtrans.md`.

### WhatsApp webhook

`POST /v1/whatsapp/webhook` menerima event WhatsApp/bot.

Gap kritis:

1. Komentar kode menyebut `X-Hub-Signature-256`, tetapi implementasi tidak memverifikasi signature HMAC.
2. Body webhook dicetak ke log.
3. Dedup message hanya in-memory selama 60 detik.
4. Endpoint ini dilewati oleh pengecekan form content-type khusus webhook.

### Cron manual

`GET /cron/savings-reminder` memakai query:

```text
?secret=<JWT_SECRET>
```

Gap:

1. Memakai `JWT_SECRET` untuk fungsi cron, bukan `CRON_SECRET` terpisah.
2. Secret dikirim di URL query sehingga rawan muncul di log/proxy/history.
3. Tidak memakai Bearer/header auth.

---

## Upload dan File Security

### Upload bukti transaksi

`POST /v1/transactions/:id/upload-proof`:

- body wajib `file`, `amount`, `paymentDate`;
- file type yang diterima: JPEG, PNG, PDF;
- max size 5MB;
- limit 10 payment proof per transaksi;
- storage GCS/CDN wajib aktif untuk transaksi baru;
- jika CDN tidak aktif atau GCS gagal, endpoint return HTTP 500.

Gap:

1. Validasi tipe file memakai `file.type` dari request, bukan magic-byte sniffing.
2. Endpoint berbasis transaction id; perlu dipastikan threat model akses publik ke upload bukti memang disengaja.
3. Error upload GCS masih dapat mengembalikan `error.message` ke client pada sebagian path.

### Media library admin

Media library:

- validasi category;
- validasi MIME dan size per kategori;
- proses image via `sharp`;
- GCS jika aktif;
- fallback local `uploads/` jika GCS tidak aktif/gagal;
- original local file disimpan sementara untuk rollback/debug.

Gap:

1. Local `/uploads/:filename` bersifat public dan tidak memakai auth.
2. Validasi utama masih MIME request, bukan file signature.
3. Original local retention perlu policy pembersihan yang jelas.
4. Fallback local perlu diputuskan apakah boleh untuk production.

---

## Logging, PII, dan Secret Leakage

Observability saat ini manual `console.*` + `hono/logger`.

Security gap penting:

1. `authMiddleware` mencetak header upload media; ini bisa mencakup `Authorization`.
2. JWT payload, role, dan user object dicetak di beberapa log auth/role.
3. Payment webhook Flip mencetak token.
4. WhatsApp webhook mencetak body lengkap.
5. WhatsApp service/flow bisa mencetak nomor telepon dan potongan pesan user.
6. Payment gateway debug dapat mencetak request/response gateway.
7. Tidak ada structured redaction untuk token, phone, email, rekening, payload pembayaran, atau private key.
8. Root dump database lama pernah ada di workspace (`laznas_be_2026-01-17_09-39-35_pgsql_data.sql`) dan sudah dihapus. Dump semacam ini tidak boleh berada di repository karena dapat memuat admin, transaksi, settings, dan data operasional.
9. File DB lokal/SQLite (`bantuanku.db`, `packages/db/sqlite.db`, `apps/api/bantuanku.db`) juga sudah dihapus agar repo tidak menyimpan artefak database bayangan.

Rujukan detail: `arsitektur-observability-logging.md`.

---

## Frontend Security

| Area | Implementasi |
|------|--------------|
| Token storage | `localStorage` dan persisted auth store. |
| API auth | `Authorization: Bearer <token>`. |
| Cookie/session | Tidak dipakai untuk auth utama. |
| Admin Next headers | Belum ada security headers custom. |
| Web Next headers | `X-DNS-Prefetch-Control`, `X-Frame-Options: SAMEORIGIN`. |
| Image remote patterns | Mengizinkan beberapa domain eksternal dan local uploads. |

Konsekuensi:

1. Risiko utama frontend adalah XSS yang mengambil token dari `localStorage`.
2. Karena auth tidak berbasis cookie, CSRF terhadap endpoint authenticated lebih rendah, tetapi `withCredentials: true` dan CORS permissive tetap perlu dibersihkan.
3. Admin app perlu header security setara web/API.

---

## Deployment Security

`server-node.ts` mengisi binding:

```ts
ENVIRONMENT: process.env.ENVIRONMENT || "development"
```

`ecosystem.config.cjs` mengatur `NODE_ENV=production`, tetapi tidak terlihat mengatur `ENVIRONMENT=production`.

Konsekuensi jika env lain tidak mengisi `ENVIRONMENT`:

1. API berjalan dengan binding `ENVIRONMENT = "development"`.
2. `onError` dapat mengembalikan `err.message` ke client.
3. Payment gateway logic yang mengecek `c.env.ENVIRONMENT === "production"` dapat salah memilih mode sandbox/non-production.

Gap deployment lain:

1. PM2 config belum mendefinisikan log rotation/redaction.
2. Tidak ada config reverse proxy/TLS/HSTS frontend di repo.
3. Scheduler berjalan di process API; multi-instance dapat menjalankan job ganda.

---

## Risk Register

### Critical

| Risiko | Bukti Implementasi | Rekomendasi |
|--------|--------------------|-------------|
| WhatsApp webhook tanpa signature verification | `apps/api/src/routes/whatsapp.ts` tidak memverifikasi `X-Hub-Signature-256`. | Wajib verifikasi HMAC raw body dengan secret khusus, reject 401 jika invalid. |
| CORS terlalu permisif | Fallback `return origin || "*"` dengan `credentials: true`. | Reject origin di luar allowlist; jangan reflect arbitrary origin. |
| Secret/PII bocor ke log | Auth header/JWT/user object, Flip token, WhatsApp body dicetak. | Implement redaction logger dan hapus log sensitif. |
| Env production bisa jatuh ke development | PM2 set `NODE_ENV`, bukan `ENVIRONMENT`; server default development. | Set `ENVIRONMENT=production` di PM2/env dan fail-fast jika env kritis kosong. |
| Settings secret encryption tidak konsisten | Batch encrypt, PATCH raw, GET single tidak konsisten. | Buat service settings tunggal dengan encrypt/decrypt/masking konsisten. |
| Cron memakai `JWT_SECRET` di query URL | `/cron/savings-reminder?secret=...`. | Pakai `CRON_SECRET` terpisah via header, bukan query. |

### High

| Risiko | Bukti Implementasi | Rekomendasi |
|--------|--------------------|-------------|
| Token disimpan di `localStorage` | Admin/web auth store. | Evaluasi httpOnly cookie atau perkuat CSP, XSS hardening, refresh token rotation. |
| Refresh token tidak bisa dicabut | JWT stateless tanpa session table. | Tambah refresh token table, device session, revoke/rotate. |
| Permission table belum enforce | Runtime hanya `requireRole`. | Tambah `requirePermission` dan migrasi guard per modul. |
| Role stale di JWT | Role embedded di token. | Perpendek TTL, cek token version/session, atau fetch authorization runtime untuk aksi sensitif. |
| Role assignment belum cukup dibatasi | Endpoint menerima role slug existing. | Tambah allowlist target role per actor dan blok privilege escalation. |
| Upload validasi MIME saja | `file.type` digunakan sebagai sumber tipe. | Tambah magic-byte sniffing, antivirus scanning bila perlu, dan storage policy. |
| Webhook payment tanpa replay protection | Tidak ada nonce/timestamp/idempotency eksplisit selain status. | Simpan event id/signature/timestamp, reject replay. |
| Rate limit in-memory | Map process-local. | Pindah ke Redis/DB backed limiter untuk production. |
| AES-CBC tanpa auth tag | `lib/encryption.ts`. | Migrasi ke AES-256-GCM atau KMS/secret manager. |

### Medium

| Risiko | Bukti Implementasi | Rekomendasi |
|--------|--------------------|-------------|
| CSP masih `unsafe-inline` | `securityHeaders`. | Perketat CSP bertahap dengan nonce/hash. |
| Admin Next belum punya headers | `apps/admin/next.config.ts`. | Tambah headers minimum untuk admin app. |
| Audit log belum otomatis | `audit_logs` ada, writer belum terpasang luas. | Pasang audit middleware/service untuk aksi sensitif. |
| Tidak ada request id | Logging manual. | Tambah request/correlation id. |
| Tidak ada SAST/dependency audit pipeline | Tidak terlihat di script runtime. | Tambah CI security check. |

---

## SOP Perubahan Security

1. Jangan mengubah policy security hanya di dokumentasi; cek implementasi aktual terlebih dahulu.
2. Setiap endpoint publik baru harus mendefinisikan auth mode: public, optional auth, required auth, webhook-signed, atau cron-signed.
3. Setiap secret baru harus punya lokasi penyimpanan, masking, rotasi, dan audit update.
4. Setiap webhook baru harus memverifikasi signature/token dari raw payload bila provider mensyaratkan raw body.
5. Setiap upload baru harus mendefinisikan MIME allowlist, size limit, storage target, public/private URL, dan validasi file signature.
6. Setiap log baru harus aman dari token, password, OTP, rekening, payload payment sensitif, dan full PII.
7. Setiap role/permission baru harus diuji dari sisi actor dan target, bukan hanya apakah user punya role admin.

---

## Rekomendasi Roadmap Perbaikan

Urutan yang paling aman:

1. Hardening immediate: CORS allowlist strict, matikan log sensitif, set `ENVIRONMENT=production`, ganti cron secret query.
2. Webhook hardening: WhatsApp HMAC verification, payment replay protection, raw body signature support.
3. Secret management: service settings tunggal, AES-GCM/KMS, masking admin UI/API, secret rotation.
4. Auth/session hardening: refresh token store, revoke session, token versioning, role freshness.
5. RBAC hardening: enforce permission table dan target-role allowlist.
6. Upload hardening: magic-byte validation, local storage policy, malware scan untuk dokumen.
7. Observability security: request id, structured logger, PII redaction, audit writer untuk aksi sensitif.
