# Arsitektur Observability Logging

> Terakhir di-sync: 2026-07-02

---

## Overview

Observability Bantuanku saat ini masih berbasis **stdout/stderr logging manual**.

Belum ada structured logger, request id, tracing, metrics endpoint, alerting, Sentry, OpenTelemetry, Prometheus, atau log aggregation yang didefinisikan di kode. Runtime production memakai PM2, sehingga log aplikasi mengikuti mekanisme log PM2/default stdout-stderr.

Dokumen terkait:

- `arsitektur-api-routing.md` — middleware `hono/logger`, `/health`, route mount.
- `arsitektur-cache-performance.md` — cache hit/miss gap, metrics performance, dan slow query observability.
- `arsitektur-security.md` — log redaction, PII, token, webhook payload, dan risk register security.
- `arsitektur-error-handling.md` — `onError`, error envelope, status code.
- `arsitektur-deployment.md` — PM2 process, scheduler, production runtime.
- `arsitektur-audit-log.md` — audit trail formal di DB, berbeda dari runtime log.
- `arsitektur-notifikasi.md` — WhatsApp/GOWA dan notification logs.
- `arsitektur-tracking.md` — Meta Pixel/CAPI event logging.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Hono root logger | `apps/api/src/index.ts` |
| Node server startup/shutdown logs | `apps/api/server-node.ts` |
| PM2 process config | `ecosystem.config.cjs` |
| Error handler global | `apps/api/src/index.ts` |
| Auth/role debug logs | `apps/api/src/middleware/auth.ts` |
| GCS upload logs | `apps/api/src/lib/gcs.ts` |
| Meta CAPI logs | `apps/api/src/lib/meta-capi.ts` |
| WhatsApp service logs | `apps/api/src/services/whatsapp.ts`, `whatsapp-ai.ts`, `whatsapp-flow.ts` |
| Scheduler logs | `apps/api/src/services/savings-reminder.ts`, `developer-auto-disbursement.ts` |
| Audit log DB/API | `packages/db/src/schema/audit.ts`, `apps/api/src/routes/admin/audit.ts` |
| Frontend console logs | `apps/admin/src/**`, `apps/web/src/**` |

---

## Runtime Log Pipeline Aktual

API:

```text
Hono request -> hono/logger + console.* -> stdout/stderr -> PM2/default process logs
```

Admin dan web:

```text
Next.js app -> console.* server/client -> browser console atau process stdout/stderr
```

PM2 config di `ecosystem.config.cjs` hanya mendefinisikan process name, cwd, command, dan env dasar. Tidak ada `out_file`, `error_file`, `log_date_format`, `merge_logs`, atau rotation policy di repo.

---

## HTTP Request Logging

`apps/api/src/index.ts` memasang:

```ts
app.use("*", logger());
```

Ini adalah `hono/logger`, bukan logger custom.

Konsekuensi:

- Log request bersifat text/plain human-readable.
- Tidak ada request id.
- Tidak ada correlation id yang diteruskan ke response.
- Tidak ada field JSON standar seperti `method`, `path`, `status`, `duration`, `userId`.
- Tidak ada sampling atau log level per environment.

---

## Startup dan Scheduler Logs

`apps/api/server-node.ts` mencetak:

- host/port API;
- database URL dengan password dimasking regex;
- folder `uploads/` dibuat;
- server running;
- scheduler start failure;
- shutdown.

Scheduler yang berjalan di process API:

| Scheduler | Log prefix |
|-----------|------------|
| Savings reminder | `[SavingsReminder]` |
| Developer auto-disbursement | `[DeveloperAutoDisbursement]` |

Catatan penting: scheduler berjalan di process API. Jika API di-scale multi-instance, log scheduler dan job execution bisa muncul ganda, dan job juga bisa berjalan ganda.

---

## Integration Logs

| Integrasi | Pola log aktual | Catatan |
|-----------|-----------------|---------|
| GCS upload | `[GCS] Starting upload`, bucket, destination, file size, upload success/error | Tidak mencetak private key/access token, tetapi mencetak URL/path object. |
| Meta CAPI | success, retry, error, skipped config | Error body dari Graph API dicetak. |
| WhatsApp notification | `[WA] sending`, result, skipped template/config, admin send error | Nomor telepon bisa muncul di log. |
| WhatsApp AI/flow | `[Flow] ...`, text substring, phone, step/state, AI API errors | Bisa mencetak nomor telepon dan potongan pesan user. |
| Payment gateways | iPaymu debug mencetak request/response, amount, method/channel | Berisiko terlalu verbose di production. |
| Gold/silver price update | Harga, exchange rate, fetch external error | Dipakai di settings auto-update. |
| Ledger/disbursement | Error ledger transaction/reconciliation | Log manual untuk investigasi. |

---

## WhatsApp Bot Logs

WhatsApp AI memiliki conversation context in-memory:

```ts
const conversations = new Map<string, ConversationContext>();
const CONVERSATION_TTL = 30 * 60 * 1000;
```

Admin endpoint:

```text
GET /v1/admin/whatsapp/bot-logs
```

Guard:

- `requireRole("super_admin")`
- `requireDeveloper`

Endpoint ini mengembalikan conversation history non-expired dari memory process. Ini bukan persistent log:

- hilang saat process restart;
- tidak shared antar instance;
- tidak punya request id;
- tidak tersimpan di database;
- berisi phone/profileName/history sehingga perlu diperlakukan sebagai data sensitif.

---

## Audit Log vs Runtime Log

`audit_logs` adalah model audit trail formal di database, bukan observability log runtime.

Status audit log saat ini:

- Tabel dan endpoint baca tersedia.
- Tidak ditemukan writer aktif untuk menulis event audit aplikasi.
- Tidak ada middleware audit umum.
- Tidak ada event audit untuk export, role changes, payment approval, settings changes, dan mutasi penting lain.

Jadi observability runtime saat ini bergantung pada console logs, bukan audit log DB.

Detail audit formal ada di `arsitektur-audit-log.md`.

---

## Health dan Metrics

Health endpoint aktual:

```text
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "ISO string"
}
```

Belum ada:

- readiness check DB;
- liveness vs readiness terpisah;
- metrics endpoint;
- latency histogram;
- request counter;
- error-rate counter;
- queue/scheduler metrics;
- webhook success/failure metrics.

---

## Frontend Logging

Admin dan web banyak memakai `console.error` untuk fetch failure, parsing JSON, export, settings, invoice, sitemap, dan payment flow.

Beberapa area masih memakai `console.log` debug:

- admin campaign form submit/payload;
- admin frontend settings payload;
- qurban savings create payload;
- web account profile debug;
- web `fbPixel` tracking log;
- beberapa test/dev pages.

Belum ada frontend error tracking seperti Sentry. Error UI ditampilkan via toast/FeedbackDialog/alert sesuai modul, tetapi tidak dikirim ke monitoring backend.

---

## Logging Data Sensitif

Log yang berisiko memuat data sensitif:

| Area | Risiko |
|------|--------|
| Auth middleware | JWT payload, user object, roles, Authorization header debug untuk upload media. |
| Admin employee/donatur/campaign debug | Body request bisa memuat email, phone, alamat, rekening, NIK/NPWP, atau konten panjang. |
| WhatsApp AI/flow | Nomor telepon dan potongan pesan user. |
| WhatsApp notification | Nomor tujuan dan template. |
| Payment/iPaymu debug | Body request/response payment gateway. |
| GCS | Object path/public URL. |
| Frontend profile/settings debug | Response/profile/payload bisa berisi PII/settings operasional. |

Tidak ada redaction helper terpusat.

---

## Gaps dan Risiko

1. **Tidak ada structured logger.** Log sulit difilter dan diproses mesin.
2. **Tidak ada request id/correlation id.** Sulit menghubungkan frontend error, API request, DB mutation, webhook, dan scheduler log.
3. **Log sensitif terlalu banyak.** Auth payload, request body, phone, profile, dan payment debug bisa masuk log production.
4. **Tidak ada log level.** Debug/info/warn/error tidak dikontrol env.
5. **PM2 log policy tidak terdokumentasi di config.** Tidak ada rotation, path, retention, atau merge policy di repo.
6. **Tidak ada metrics.** Tidak ada visibility ke request rate, latency, error rate, webhook failure, atau scheduler success.
7. **`/health` terlalu dangkal.** Tidak mengecek database atau dependency kritikal.
8. **Audit log DB belum aktif sebagai writer.** Event penting tidak tercatat permanen.
9. **WhatsApp bot logs in-memory.** Tidak durable dan tidak multi-instance safe.
10. **External integration logs tidak punya standar.** Retry/error/success gateway, GCS, CAPI, WhatsApp, scraper, dan email tidak memakai event schema yang sama.
11. **Frontend error tidak dikirim ke backend/monitoring.** Browser-only errors hilang kecuali user melaporkan.
12. **Scheduler tidak punya distributed lock/metric.** Scaling API bisa menggandakan job tanpa indikator yang jelas.

---

## Rekomendasi Perbaikan

1. Buat logger terpusat, minimal wrapper `logger.info/warn/error/debug` dengan output JSON di production.
2. Tambahkan request id middleware:

```text
X-Request-Id incoming -> c.set("requestId") -> response header -> semua log route/service
```

3. Tambahkan redaction helper untuk field sensitif:

```text
authorization, token, password, privateKey, secret, accessToken,
phone, whatsappNumber, email, nik, npwp, accountNumber
```

4. Matikan debug verbose di production dengan env flag, misalnya `LOG_LEVEL` dan `DEBUG_AUTH`.
5. Standarkan log event untuk integrasi:

```json
{
  "level": "info",
  "event": "payment.webhook.received",
  "requestId": "...",
  "gateway": "flip",
  "transactionId": "...",
  "status": "success"
}
```

6. Tambahkan metrics minimal:
   - request count by method/path/status;
   - latency p50/p95/p99;
   - error rate 4xx/5xx;
   - payment webhook success/failure;
   - scheduler last run/success/failure;
   - GCS upload failure count;
   - WhatsApp send failure count.
7. Tingkatkan `/health` menjadi readiness opsional, misalnya `/health` ringan dan `/ready` cek DB.
8. Konfigurasi PM2 log retention/rotation secara eksplisit atau gunakan logrotate.
9. Aktifkan audit writer untuk event penting sesuai `arsitektur-audit-log.md`.
10. Untuk frontend, tambahkan error tracking atau endpoint client error minimal dengan sampling dan redaction.
11. Persist WhatsApp bot logs hanya jika memang dibutuhkan, dengan masking/retention ketat.
12. Pisahkan scheduler dari API process atau tambahkan distributed lock dan metric last-run.

---

## Prioritas Implementasi Observability

Urutan pragmatis:

1. Hapus/matikan log sensitif auth dan request body production.
2. Tambahkan request id + response header.
3. Buat logger wrapper dengan redaction.
4. Standarkan integration logs untuk payment webhook, GCS, WhatsApp, CAPI, dan scheduler.
5. Tambahkan `/ready` DB check.
6. Tambahkan PM2 log rotation/retention.
7. Tambahkan audit writer untuk event high-risk.
8. Tambahkan metrics/error tracking.
