# Retrofit Gaps — Adopsi Standar dari Template `master-typescript`

> Dihasilkan dari audit read-only (2026-09-13) yang membandingkan kondisi
> nyata kode `bantuanku` terhadap checklist komponen di template
> `master-typescript` (`docs/architecture/*.md`). **Tidak ada kode yang
> diubah** untuk menghasilkan dokumen ini — murni audit + roadmap.
>
> Urutan tabel: risiko tertinggi + effort terendah dulu (quick win), BUKAN
> urutan checklist template. Eksekusi tiap baris sebagai fase terpisah lewat
> SOP normal (`phase-workflow` / diskusi manual), satu per satu, dengan
> konfirmasi eksplisit sebelum ubah kode — jangan borongan.

## Ringkasan Konteks
`bantuanku` sudah punya dokumentasi arsitektur yang **jauh lebih matang**
dari asumsi awal — `docs/arsitektur-*.md` (67 file) sudah cukup jujur
mengakui gap-nya sendiri (mis. `arsitektur-ci-cd.md` sudah bilang "tidak ada
CI", `arsitektur-observability-logging.md` sudah bilang "tidak ada Sentry").
Karena itu dokumen ini **tidak berisi bagian "Ralat Terhadap Dokumen
Lama"** — tidak ditemukan klaim di `docs/arsitektur-*.md` yang bertentangan
dengan kode nyata pada topik-topik yang diaudit. Gap di bawah ini adalah gap
yang memang sudah service ini sendiri sadari (via dokumennya) DITAMBAH
temuan baru dari pembacaan kode langsung (terutama soal keamanan) yang belum
kentara dari nama-nama dokumen yang ada.

## Tabel Gap (Prioritas: Risiko Tinggi + Effort Rendah dulu)

| # | Komponen | Risiko Kalau Dibiarkan | Effort Estimasi | Prioritas |
|---|----------|--------------------------|-------------------|-------------|
| 1 | ~~JWT payload & header di-log penuh ke console tiap request~~ | **Tinggi** | Kecil | ✅ **Selesai** (2026-09-13) — debug `console.log` payload/header/role dihapus dari `apps/api/src/middleware/auth.ts` (`authMiddleware` & `requireRole`) |
| 2 | ~~`ENCRYPTION_KEY` fallback ke string hardcoded kalau env kosong~~ | **Tinggi** | Kecil | ✅ **Selesai** (2026-09-13) — `apps/api/src/lib/encryption.ts` sekarang `throw` saat modul dimuat kalau `ENCRYPTION_KEY`/`JWT_SECRET` tidak diset, fallback hardcoded dihapus. **Prasyarat yang sudah diperbaiki**: `server-node.ts` sebelumnya load `.env` SETELAH `import app from "./src/index"` (transitif butuh env itu duluan untuk `encryption.ts`) — ini akan bikin API gagal boot begitu throw ini deploy. Fix: `apps/api/load-env.ts` (module baru, side-effect-only) di-import PALING AWAL di `server-node.ts`, sebelum `app`. Diverifikasi: boot dengan `env -i` (env bersih total) tetap sukses. |
| 3 | ~~CORS reflect origin apa pun sebagai fallback~~ | **Tinggi** | Kecil | ✅ **Selesai** (2026-09-13) — `apps/api/src/index.ts` origin callback sekarang `return undefined` (ditolak, header `Access-Control-Allow-Origin` tidak diset) untuk origin di luar whitelist, dikonfirmasi lewat pembacaan implementasi runtime `hono/cors` |
| 4 | ~~`GET /uploads/:filename` pakai `path.join` tanpa cek traversal~~ | Sedang | Kecil | ✅ **Selesai** (2026-09-13) — `apps/api/src/index.ts` sekarang menolak filename berisi `/`, `\`, atau `..`, plus verifikasi resolved path tetap di dalam `uploads/` sebelum `readFileSync` |
| 5 | ~~Backup database otomatis tidak ada sama sekali~~ | **Tinggi** | Kecil–Sedang | ✅ **Selesai** (2026-09-13) — `scripts/backup-db.sh` (pg_dump+gzip, retensi lokal, upload rclone opsional) & `scripts/restore-db.sh` dibuat dan diuji end-to-end (dump DB lokal → restore ke DB scratch → verifikasi data cocok persis). **Belum otomatis**: cron di VPS belum dipasang (perlu akses SSH langsung + `rclone config` interaktif untuk Google Drive) — lihat `arsitektur-deployment.md` § Backup Database untuk crontab yang perlu ditambahkan manual |
| 6 | ~~Perbandingan signature webhook pakai `===` biasa~~ | Rendah–Sedang | Kecil | ✅ **Selesai** (2026-09-13) — helper `timingSafeEqualString()` baru di `apps/api/src/lib/security.ts` (pakai `crypto.timingSafeEqual`, aman dari throw kalau panjang beda), dipakai di `midtrans.ts`, `xendit.ts`, DAN `ipaymu.ts` (ditemukan saat audit — sama sekali tidak disebut di baris ini tapi bug identik). `flip.ts` sudah aman dari awal (pakai `bcrypt.compare`). Diverifikasi dengan test langsung: signature valid/salah/kosong pada `MidtransAdapter` dan `XenditAdapter` menghasilkan `true`/`false`/`false` sesuai ekspektasi |
| 7 | ~~Endpoint `POST /v1/auth/refresh` tidak kena rate limit~~ | Sedang | Kecil | ✅ **Selesai** (2026-09-13) — tambah `authRateLimit` di `auth.ts:431`. **Bug tambahan ditemukan & diperbaiki saat verifikasi**: `rateLimitStore` di `middleware/ratelimit.ts` dulu satu Map yang dibagi bareng semua instance `rateLimit()` — karena `apiRateLimit` global (`app.use("*", ...)`) jalan bareng `authRateLimit` di rute yang sama, keduanya menaikkan counter yang sama untuk key (identifier+path) yang sama, jadi limit 20/15menit diam-diam trip di request ke-11 (bukan ke-21). Ini bug LAMA yang sudah mempengaruhi `/login`, `/register`, `/forgot-password`, `/reset-password` sejak awal, bukan cuma `/refresh`. Fix: tiap `rateLimit()` sekarang punya store sendiri (closure, bukan module-level shared). Diverifikasi: hammer `/refresh` 22x → block tepat di request ke-21; hammer `/login` 21x → block tepat di request ke-21 (dihitung dari total termasuk 1 request smoke-test sebelumnya) |
| 8 | Tabel `audit_logs` sudah ada schema-nya tapi **tidak pernah ditulis** (`packages/db/src/schema/audit.ts` — 0 hasil grep `insert(auditLogs`) | Sedang — aksi admin (ubah settings, hapus user, approve donasi) tidak ada jejak akuntabilitas padahal UI baca-nya sudah ada | Sedang — tulis di service layer untuk aksi sensitif (settings, users, roles, finance) sesuai pola `architecture-security.md` §11 template | Tinggi |
| 9 | Belum ada hook lokal pencegah commit secret / audit dependency (bandingkan `.claude/hooks/secret-scan.sh`, `dependency-audit.sh` di template) | Sedang (preventif) — saat ini satu-satunya penjaga adalah kedisiplinan manual | Kecil–Sedang — copy hook dari `master-typescript/.claude/hooks/`, ganti `bun audit`→`npm audit` di `dependency-audit.sh` | Sedang |
| 10 | Tidak ada error tracking (Sentry atau sejenis) — bug produksi cuma ketahuan dari laporan user manual | **Tinggi** — tidak ada visibilitas insiden real-time | Sedang — pasang `@sentry/node` di apps/api (Hono, bukan Elysia — beda sedikit cara init tapi konsepnya sama seperti `architecture-observability.md`), wizard Next.js untuk web+admin | Tinggi |
| 11 | Logging masih 379 `console.*` tersebar (`apps/api/src`), tidak ada structured logger/redaction | Sedang — sulit trace masalah produksi, risiko data sensitif ke-log tanpa sadar | Besar (cicil bertahap) — pasang `pino` + `redact` rules dulu untuk log baru, migrasi lama bertahap per fase | Sedang |
| 12 | Validasi input (`zValidator`/zod) hanya di 21 dari 70 file route — sisanya baca `body` manual tanpa schema | Sedang — endpoint tanpa validasi rentan data tidak terduga masuk DB/logic | Besar (cicil bertahap) — prioritaskan endpoint yang terima input publik dulu (mitra, donatur) | Sedang |
| 13 | ~~Validasi upload file cuma cek `file.type`, bukan magic bytes~~ | Sedang | Kecil–Sedang | ✅ **Selesai** (2026-09-13) — helper `isAllowedFileSignature()`/`detectFileSignature()` baru di `apps/api/src/lib/file-signature.ts` (self-contained, tanpa dependency baru — deteksi JPEG/PNG/GIF/WebP/PDF dari magic bytes). Diterapkan di **5 titik upload** (bukan cuma `mitra.ts` yang disebut di baris ini — ditemukan pola identik juga di `admin/media.ts`, `transactions.ts`, dan 2x di `qurban.ts`). Diverifikasi end-to-end lewat endpoint publik sungguhan: file `.php` dengan Content-Type dipalsukan `image/jpeg` → ditolak `400`; JPEG asli dan PDF asli → berhasil upload ke GCS. **Temuan sampingan (belum diperbaiki, sudah di-flag task terpisah)**: `DELETE /admin/media/:id` ternyata stub kosong, selalu return sukses tanpa hapus apapun — ketahuan saat bersihkan file test yang saya upload |
| 14 | Tidak ada mekanisme consent tracking maupun endpoint self-service "export data saya" / "hapus akun saya" untuk donatur (UU PDP) | **Tinggi** — kewajiban hukum UU PDP (berlaku efektif sejak Okt 2024), platform ini mengumpulkan data pribadi donatur asli | Sedang–Besar — tabel `consents` + endpoint `GET /me/data-export`, `DELETE /me` (anonymize, bukan hard-delete karena ada FK transaksi/ledger) — pola persis di `architecture-data-privacy.md` template | Tinggi |
| 15 | Refresh token disimpan di `localStorage` (web & admin), bukan httpOnly cookie (`apps/web/src/lib/auth.ts:47,74`, `apps/admin/src/lib/auth.ts:43`) | Sedang–Tinggi — token bisa dicuri lewat XSS | **Besar** — breaking change ke seluruh alur auth di 2 frontend sekaligus, perlu rencana migrasi hati-hati (bukan quick fix) | Sedang (karena effort besar, jangan didahulukan sebelum item kecil selesai) |
| 16 | Tidak ada CI/CD (`.github/workflows` dsb — dikonfirmasi `docs/arsitektur-ci-cd.md`) | Sedang — tidak ada gate otomatis sebelum deploy (lint/type-check/test) | Sedang — mulai dari GH Actions minimal (type-check + lint on push), belum perlu full pipeline | Sedang |
| 17 | Tidak ada staging environment nyata (cuma SOP manual "jangan run di production") | Rendah–Sedang — migration/testing production-like belum ada tempat aman | Sedang — karena bantuanku pakai PM2 bare-metal (bukan Docker seperti template), staging perlu didesain versi PM2, bukan copy `docker-compose.staging.yml` mentah | Rendah |
| 18 | Permission granular (`permissions`/`role_permissions`) ada di schema tapi enforcement masih level role saja (`requireRole`, bukan per-permission-key) | Rendah — role-based masih cukup untuk jumlah role saat ini, tapi tidak scalable kalau role bertambah banyak | Besar — refactor middleware ke permission-key seperti `architecture-auth.md` §RBAC template | Rendah |

## Yang SENGAJA Tidak Dimasukkan (Bukan Gap, Cuma Beda Pola — Lihat Laporan Utama)
- Auth pakai custom JWT+bcrypt (bukan Better Auth template) — sudah jalan, tidak direkomendasikan diganti.
- Backend Hono (bukan Elysia template) — hanya beda sintaks middleware, prinsip sama.
- Deployment PM2 bare-metal (bukan Docker Compose template) — arsitektur valid, cukup adaptasi pola bukan ganti total.
- Multi-tenancy, i18n admin, search engine dedicated — tidak relevan/tidak dibutuhkan di skala & kebutuhan bisnis bantuanku saat ini.

## Cara Pakai Dokumen Ini
1. User pilih 1 item dulu (atau beberapa yang saling terkait, mis. #1+#2+#3 sama-sama "quick fix keamanan sepele").
2. Eksekusi lewat SOP normal project ini — bukan langsung edit dari audit ini.
3. Update baris di tabel ini jadi selesai/coret setelah dieksekusi & diverifikasi, supaya dokumen ini tetap jadi living roadmap, bukan snapshot basi.
