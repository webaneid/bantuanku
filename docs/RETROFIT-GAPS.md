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
| 9 | Belum ada hook lokal pencegah commit secret / audit dependency (bandingkan `.claude/hooks/secret-scan.sh`, `dependency-audit.sh` di template) | Sedang (preventif) — saat ini satu-satunya penjaga adalah kedisiplinan manual | Kecil–Sedang — copy hook dari `master-typescript/.claude/hooks/`, ganti `bun audit`→`npm audit` di `dependency-audit.sh` | Sedang | ◐ **Sebagian selesai** (2026-10-22) — hook `secret-scan`, `dependency-audit` (npm), `adr-guard`, `pre-commit-guard` terpasang di `.claude/hooks/` (gitignored, lokal). **Belum**: gitleaks sebagai git pre-commit hook (butuh `brew install gitleaks`, lihat `.claude/hooks/README.md`) dan di CI (menunggu #16) |
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

## Temuan Tambahan (di luar checklist template)

| # | Temuan | Status |
|---|--------|--------|
| A | SQL injection di `GET /admin/reports/rekening-detail` — `bankAccountId` diinterpolasi mentah ke `sql.raw` (`apps/api/src/routes/admin/reports.ts`) | ✅ **Selesai** (2026-09-22) — diganti template `sql` dengan parameter terikat; diverifikasi payload `x' OR '1'='1` kini menghasilkan hasil kosong. Dua `sql.raw` lain (`/financial-statement`, `/cash-flow`) hanya menginterpolasi tanggal yang divalidasi regex — aman, tapi sebaiknya dimigrasikan ke parameter terikat. |
| B | Laporan rekening tidak menghitung transaksi checkout publik (mismatch prefix `bank-` vs `bank_`) | ✅ **Selesai** (2026-09-22) — kedua bentuk `payment_method_id` dicocokkan. Lihat `arsitektur-laporan.md` § Perbaikan. |
| C | `/admin/dashboard/*` tanpa `requireRole` lokal dan tanpa `coordinatorFilter` — `program_coordinator`/`employee` bisa membaca total income & jumlah donatur seluruh lembaga | ✅ **Diputuskan OK** (2026-09-22, oleh pemilik) — home dashboard memang boleh dilihat semua staf; tidak ada perubahan kode. |

## Adopsi Proses dari Template (2026-10-22)

| Item | Status |
|------|--------|
| ADR (`docs/decisions/`, template + `scripts/next-adr-number.sh`, hook `adr-guard`) | ✅ 7 ADR awal ditulis dari keputusan yang sebelumnya terkubur di lesson learned |
| Lesson learned dipindah dari `CLAUDE.md` (gitignored) ke `docs/lessons-learned.md` (tracked) | ✅ |
| Hook secret-scan / dependency-audit / pre-commit-guard | ◐ lihat baris #9 |
| Subagent `security-auditor` (read-only) + skill `bantuanku-security-review`, dijadikan Langkah 6b SOP | ✅ checklist diisi dengan pola bug nyata repo ini (sql.raw, ownership guest, webhook, cron, upload, WA opt-out, dst). Berada di `.claude/` (gitignored, lokal) |
| CI minimal, konvensi commit/branch + branch protection, `PROGRESS.md`/`phases/` | ⏳ belum — kandidat fase berikutnya |

## Temuan Audit `security-auditor` — WA & Account (2026-10-22)

| # | Temuan | Status |
|---|--------|--------|
| D | Webhook WhatsApp tanpa verifikasi signature (Critical) | ✅ **Selesai & deployed (2026-10-22)** — HMAC-SHA256 wajib, fail-closed; diuji 7 kasus runtime (401/200/400/503). Di produksi: tanpa signature → 401, pesan WA asli via GOWA diterima (bot normal). ADR-0008 |
| E | SSRF + kebocoran kredensial GOWA pada unduhan media (Critical) | ✅ **Selesai** — `lib/gowa-media.ts`; 31 kasus uji (host di query, userinfo, traversal, IP privat, non-gambar, batas ukuran) |
| F | Tool bot tanpa pengecekan kepemilikan: `check_transaction_status`, `confirm_payment`, `send_qris` (High) + `get_payment_link`, `get_bank_details` (tidak disebut auditor, ditemukan saat verifikasi) | ✅ **Selesai** — 15 kasus uji dengan data dev. `send_qris` tidak diuji runtime (mengirim WA sungguhan) |
| G | Log menulis payload webhook utuh | ◐ Payload webhook dihapus dari log. `console.log` di `whatsapp-ai.ts`/`whatsapp-flow.ts` masih memuat nomor HP + potongan teks → menunggu structured logger (#11) |
| H | Token confusion: access token → refresh token; token unsubscribe lolos `verifyToken` (Medium; menurut verifikasi layak High) | ✅ **Selesai** — claim `typ`/`purpose`, kompatibel dengan token lama; 15 kasus uji + uji API. ADR-0009. Kelonggaran token tanpa `typ` dihapus setelah ≥7 hari sejak deploy |
| I | `GET /wa/unsubscribe` mengubah state | ⏸ **Ditunda, risiko lebih kecil dari laporan**: dipanggil dari JS halaman `/berhenti`, link belum dikirim ke donatur. Saat link dipasang, ubah ke klik konfirmasi (POST) |
| J | Map dedup dan percakapan tanpa batas | ✅ **Selesai** — 5.000 / 2.000 entri, buang yang tertua |
| K | `limit` tanpa batas di `account.ts` | ✅ **Selesai** — `clampInt` (1–100); diuji `limit=100000/abc/0` |
| M | (Re-audit) `register_donatur` menerima nomor dari argumen LLM + membocorkan nama/email donatur existing → penyerobotan identitas (High) | ✅ **Selesai** — nomor dari `context.phone`, jawaban generik, sanitasi nama, validasi email; 8 kasus uji dengan DB dev |
| N | (Re-audit) Webhook membaca body tanpa batas sebelum verifikasi (Low) | ✅ **Selesai** — `bodyLimit` 1 MB (413); diuji 1,6 MB dengan/ tanpa signature |
| O | (Re-audit) `account.ts` detail: `normalizedPhone` kosong cocok ke `donorPhone` tanpa digit (Low) | ✅ **Selesai** — guard `!!normalizedX` seperti endpoint list |
| P | ✅ **Selesai di kode (2026-10-22, belum deployed; ADR-0010 Fase 1)** — (Re-audit, High) **Kepemilikan transaksi di akun web berbasis klaim email/telepon yang tidak diverifikasi**: `POST /auth/register` menautkan seluruh transaksi guest ber-email/telepon sama ke akun baru, dan `account.ts` memakai klaim yang sama sebagai bukti kepemilikan. Siapa pun yang mendaftar dengan email/WA korban melihat transaksi korban (termasuk `donorPhone`) | Register tidak lagi mengambil alih donatur/transaksi; penautan hanya setelah email terverifikasi (link Resend); `account.ts` tidak memakai klaim telepon; `check-registration` tanpa PII. Diuji termasuk simulasi pre-hijack (28 kasus API + alur browser). **Prasyarat deploy:** jalankan migrasi 121 DAHULU (backfill staf), pastikan `RESEND_API_KEY`/`FROM_EMAIL` + domain terverifikasi di produksi |
| Q | (Re-audit, Medium) `confirm_payment` tidak atomik + `paidAmount` naik sebelum verifikasi; `amount`/`unit_price` dari LLM tanpa validasi di `start_donation_flow` & `TransactionService.create` | ⏳ **Belum** — daftar lengkap di `arsitektur-wa-bot.md` § Gap |
| R | (Re-audit, Low) hardening media GOWA, `get_campaign_detail` tanpa filter status, kunci Gemini di query string, kode mati menerima identitas, `phoneMatches` hanya 10 digit terakhir (`sendSavingsDepositInfo` di `whatsapp-flow.ts` masih `ilike`) | ⏳ **Belum** — Low |
| L | `signUnsubscribeToken` tanpa pemanggil — link unsubscribe tidak ada di pesan broadcast/birthday/re-engagement (gap kepatuhan, bukan kerentanan) | ⏳ **Belum** — butuh fitur: sisipkan `{unsubscribe_url}` ke template + `buildSharedVars` |

> Seluruh perbaikan D–O (kecuali P–R dan L yang masih terbuka) di-deploy ke VPS pada 2026-10-22 (commit `fe15011`); bot WA diverifikasi normal setelah `WHATSAPP_WEBHOOK_SECRET` dipasang di GOWA dan API.

## Auth: Verifikasi Email, Reset Email, Login Google (ADR-0010, 2026-10-22)

| # | Item | Status |
|---|------|--------|
| S | **Rate limit bisa dilewati dengan memalsukan `X-Forwarded-For`** (brute force `/auth/login`, OTP, reset). Terbukti: 30/30 percobaan lolos dengan header berbeda | ◐ Kode siap, **opt-in**: set env `TRUSTED_PROXY_HOPS` di VPS setelah memeriksa konfigurasi Nginx/Cloudflare (Nginx saja = 1, Cloudflare + Nginx = 2). Diuji: dengan nilai 1, pemalsuan sisi kiri tidak lagi lolos dan klien lain tidak ikut terkunci. **Perlu keputusan/konfirmasi topologi proxy** |
| T | Verifikasi email (Fase 1), lupa password via email (Fase 2), login/daftar Google (Fase 3), frontend (Fase 4) | ✅ di kode; belum deployed. Prasyarat deploy: migrasi 121 → env Resend → env Google (opsional) |
| U | Refresh token tidak dicabut saat reset password (tidak ada revocation) | ⏳ Gap lama (token 7 hari), kini lebih relevan karena ada reset via email; kandidat: tabel sesi/token version |

## Audit `security-auditor` atas ADR-0010 (2026-10-22) — diperbaiki di ADR-0011

| # | Temuan audit | Status |
|---|--------------|--------|
| V | **(High)** `GET /v1/donatur/search` publik membuka nama, email, telepon, WA donatur (autofill checkout) | ◐ `userId` diganti `hasAccount` + rate limit 30/15 menit. **PII-nya masih terbuka — butuh keputusan produk:** hanya `exists` tanpa autofill, atau autofill setelah OTP/login, atau masking |
| W | **(High)** Pre-registration hijack belum tertutup: link verifikasi yang diklik pemilik email mengesahkan akun ber-password penyerang | ✅ Verifikasi butuh token + password; daftar ulang akun belum terverifikasi menimpa password; Google meng-klaim akun (hapus password). 54 + 53 kasus uji |
| X | **(Medium)** Tidak ada pencabutan sesi; `/refresh` tidak cek verifikasi | ✅ `users.sessions_valid_after` (migrasi 122) + cek verifikasi. Gap #U selesai |
| Y | **(Medium)** Admin bisa memberi peran staf ke user belum terverifikasi (`admin/employees.ts`, 2 jalur) | ✅ Ditolak bila `email_verified_at` NULL. Tidak diuji runtime (butuh fixture admin+employee), terverifikasi lewat tsc dan baca kode |
| Z | **(Medium)** Nama pendaftar tak di-escape di HTML email | ✅ `esc()` di semua template `email.ts` (termasuk donasi/campaign/penyaluran) |
| AA | **(Medium)** Open redirect `returnTo`/`next` lewat TAB | ✅ Validasi `new URL()` + tolak karakter kontrol, API dan web |
| AB | **(Low)** Enumerasi akun (`register` 400, `check-registration`, waktu login) | ◐ Sebagian: tetap ada (diterima, rate limit). Dummy bcrypt untuk email tak dikenal belum dibuat |
| AC | **(Low)** Email tak dinormalisasi lowercase | ◐ Lookup case-insensitive + simpan lowercase. **Belum** ada unique index `lower(email)`: cek data duplikat produksi dulu |
| AD | **(Low)** WA selamat datang ke nomor tak terverifikasi | ✅ Dikirim setelah email terverifikasi. `POST /v1/donatur` publik masih membuat record dengan nomor/nama sembarang (belum ditangani) |
| AE | **(Low)** Override URL OAuth lewat env di production | ✅ Diabaikan bila `ENVIRONMENT=production` |
| AF | **(Medium)** Rate limit via XFF palsu → email-bombing/brute force | ⏳ = item S: set `TRUSTED_PROXY_HOPS` di VPS. Limiter per-akun belum ada |

> **Prasyarat deploy bertambah:** jalankan migrasi **121 dan 122** sebelum restart API.

