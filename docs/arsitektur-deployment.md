# Arsitektur Deployment

## Ringkasan

Deployment Bantuanku saat ini berbasis monorepo Node.js, bukan Cloudflare Workers. API berjalan sebagai Hono Node server lewat `apps/api/server-node.ts`; admin dan web berjalan sebagai aplikasi Next.js terpisah. Production process manager yang tersedia di repo adalah PM2 melalui `ecosystem.config.cjs`.

Dokumen ini menggantikan instruksi lama yang masih mengarah ke Wrangler/Cloudflare Workers dan manifest migrasi statis di root repository.

## Implementasi Terkait

| Area | File |
|------|------|
| Root workspace scripts | `package.json` |
| PM2 process config | `ecosystem.config.cjs` |
| API Node runtime | `apps/api/server-node.ts` |
| API scripts | `apps/api/package.json` |
| Admin scripts | `apps/admin/package.json` |
| Web scripts | `apps/web/package.json` |
| DB scripts | `packages/db/package.json` |
| Production migration runner | `packages/db/scripts/run-production-manifest.ts` |
| API env template | `.env.example` |
| Admin env template | `apps/admin/.env.example` |

## Runtime Production

Production process didefinisikan di `ecosystem.config.cjs`:

| Process | Command | Port/Host Aktual |
|---------|---------|------------------|
| `bantuanku-api` | `npm run start -w apps/api` | `API_HOST=127.0.0.1`, `API_PORT=3001` dari PM2 env |
| `bantuanku-admin` | `npm run start -w apps/admin` | Next start default script admin: port `3002` |
| `bantuanku-web` | `npm run start -w apps/web` | Next start default script web: port `3003` |

API default tanpa PM2 memakai `API_PORT=50245` dan `API_HOST=127.0.0.1`.

## API Node Server

File `apps/api/server-node.ts` melakukan:

1. load env dari `apps/api/.env` dan root `.env`;
2. menjalankan Hono app dengan `@hono/node-server`;
3. inject env ke Hono bindings (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ENVIRONMENT`, `API_URL`, `FRONTEND_URL`, `ADMIN_URL`, `RESEND_API_KEY`, `FROM_EMAIL`);
4. membuat folder `uploads/` di `process.cwd()` bila belum ada;
5. menjalankan scheduler Node process:
   - `startSavingsReminderScheduler()`;
   - `startDeveloperAutoDisbursementScheduler()`;
6. menangani graceful shutdown untuk `SIGINT` dan `SIGTERM`.

Konsekuensi deployment: API process juga membawa scheduler. Jika API dijalankan lebih dari satu instance, scheduler bisa berjalan ganda kecuali dipisah atau diberi locking.

Detail logging runtime, PM2 stdout/stderr, scheduler logs, dan gap observability dicatat di `arsitektur-observability-logging.md`.
Gap security deployment seperti `ENVIRONMENT=production`, secret cron, dan hardening runtime dicatat di `arsitektur-security.md`.
Quality gate build, lint, type-check, dry-run migrasi, dan verifikasi manual dicatat di `arsitektur-testing-qa.md`.
Pipeline CI/CD, release gate, deploy automation gap, dan rollback automation gap dicatat di `arsitektur-ci-cd.md`.

## API Routing

API root:

| Path | Fungsi |
|------|--------|
| `/` | Info API. |
| `/health` | Health check sederhana. |
| `/uploads/:filename` | Serve file lokal dari folder `uploads`. |
| `/cron/savings-reminder` | Trigger manual scheduler reminder dengan secret. |
| `/v1/*` | Semua route aplikasi. |

Frontend harus memakai base API dengan suffix `/v1`, misalnya `https://api.bantuanku.org/v1`.

## Build dan Start

Root script:

| Script | Fungsi |
|--------|--------|
| `npm run build` | Build semua workspace yang punya script build. |
| `npm run start:api` | Start API workspace. |
| `npm run start:admin` | Start admin workspace. |
| `npm run start:web` | Start web workspace. |
| `npm run db:manifest:run` | Jalankan migration manifest existing DB. |
| `npm run db:manifest:run:fresh` | Jalankan baseline fresh + manifest existing. |
| `npm run db:manifest:run:dry` | Simulasi migration manifest. |

Admin Next:

- dev: `next dev -p 3001`;
- start: `next start -p 3002`.

Web Next:

- dev: `next dev -p 3002`;
- start: `next start -p 3003`.

Catatan: dev port admin dan web bisa overlap dengan port production/API jika dijalankan bersamaan tanpa override. Untuk development paralel, gunakan port eksplisit bila perlu.

## Environment Variables

Env API utama:

| Env | Fungsi |
|-----|--------|
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Secret JWT dan juga dipakai sebagai secret cron savings reminder. |
| `JWT_EXPIRES_IN` | Masa berlaku access token. |
| `ENVIRONMENT` | `development` atau `production`. |
| `API_HOST` | Host bind Node server. |
| `API_PORT` | Port API Node server. |
| `API_URL` | URL publik API tanpa `/v1` untuk generate URL file/webhook. |
| `FRONTEND_URL` | URL web publik. |
| `ADMIN_URL` | URL admin publik. |
| `RESEND_API_KEY`, `FROM_EMAIL` | Email notification. |
| `ENCRYPTION_KEY` | Opsional; fallback ke `JWT_SECRET` untuk enkripsi setting sensitif. |

Env frontend:

| Env | Dipakai oleh |
|-----|--------------|
| `NEXT_PUBLIC_API_URL` | Admin dan web. Harus mengarah ke API `/v1`. |
| `NEXT_PUBLIC_WEB_URL` | Admin untuk link publik/invoice/fundraiser. |
| `NEXT_PUBLIC_APP_URL` | Web untuk canonical URL, sitemap, dan metadata. |

Payment gateway, CDN, WhatsApp, dan SEO runtime sebagian besar disimpan di tabel `settings`, bukan env file. Lihat `arsitektur-settings.md` dan `arsitektur-universal-payment.md`.

## Database Migration Production

Source of truth migration production adalah kode runner `packages/db/scripts/run-production-manifest.ts`, bukan file manifest statis di root.

Mode runner:

| Command | Arti |
|---------|------|
| `npm run db:manifest:run` | Existing DB, menjalankan daftar `CORE_EXISTING`. |
| `npm run db:manifest:run:fresh` | Fresh DB, menjalankan baseline drizzle lalu `CORE_EXISTING`. |
| `npm run db:manifest:run:dry` | Dry-run tanpa eksekusi SQL. |

Opsi runner:

| Opsi | Arti |
|------|------|
| `--include-optional` | Sertakan migrasi optional/data migration. |
| `--from <file>` | Mulai dari file tertentu. |
| `--to <file>` | Berhenti di file tertentu. |
| `--continue-on-error` | Lanjut setelah error. |
| `--log-file <path>` | Custom log file. |

Log default ditulis ke `packages/db/logs/production-manifest-*.log`, dan folder log diabaikan Git.

## Prinsip Migrasi

1. Jangan menjalankan migrasi dengan scan folder seperti `ls *.sql | sort`.
2. Jalankan migration hanya lewat runner manifest atau file SQL eksplisit yang sudah diaudit.
3. Backup database sebelum migration production.
4. Gunakan `--dry-run` sebelum eksekusi.
5. Migrasi optional hanya dijalankan bila data historisnya memang perlu.
6. File migrasi lama yang drop kolom/tabel legacy harus dicek ke schema runtime sebelum dipakai.
7. Jangan memakai script root legacy seperti `setup-db.sh` atau `run-qurban-migrations.sh`; keduanya sudah dihapus karena tidak sesuai manifest migration.

## Fresh DB vs Existing DB

Fresh DB:

1. jalankan `npm run db:manifest:run:fresh`;
2. jalankan seed standar;
3. cek login, transaksi, disbursement, qurban, zakat, dan laporan.

Existing DB:

1. backup penuh;
2. jalankan `npm run db:manifest:run:dry`;
3. jalankan `npm run db:manifest:run`;
4. jalankan seed/update data yang memang dibutuhkan;
5. smoke test.

## Seed

Script seed utama ada di `packages/db/package.json`:

| Script | Fungsi |
|--------|--------|
| `npm run db:seed -w packages/db` | Seed utama. |
| `npm run db:seed:zakat -w packages/db` | Seed zakat. |
| `npm run db:seed:zakat-coa -w packages/db` | Seed COA zakat. |
| `npm run db:seed:address -w packages/db` | Seed data alamat Indonesia. |

Seed developer memakai env:

- `SEED_DEVELOPER_EMAIL`;
- `SEED_DEVELOPER_NAME`;
- `SEED_DEVELOPER_PASSWORD`.

Jika env ini tidak diisi, implementasi seed masih punya default credential. Untuk production, env seed wajib diisi manual dan password harus diganti setelah seed pertama.

## Storage dan Uploads

Runtime Node membuat folder `uploads/` di root process. Beberapa modul masih bisa fallback ke local uploads, sedangkan beberapa flow pembayaran universal mewajibkan GCS/CDN. Karena itu production harus:

1. menyiapkan persistent storage untuk `uploads/` jika local fallback masih dipakai;
2. mengonfigurasi CDN/GCS di settings bila ingin semua media keluar lewat bucket;
3. menjalankan cleanup media lokal hanya lewat script yang relevan dan setelah audit.

## Reverse Proxy

Repo tidak menyimpan konfigurasi Nginx/Apache. Deployment production perlu reverse proxy eksternal yang mengarah ke process berikut:

| Domain contoh | Upstream |
|---------------|----------|
| `api.bantuanku.org` | `127.0.0.1:3001` |
| `admin.bantuanku.org` | `127.0.0.1:3002` |
| `bantuanku.org` | `127.0.0.1:3003` |

CORS API saat ini mengizinkan `https://bantuanku.org`, `https://admin.bantuanku.org`, localhost, dan origin lain melalui fallback `origin || "*"`. Jika domain production berubah, audit CORS di `apps/api/src/index.ts`.

## Smoke Test Production

Minimal setelah deploy:

1. `GET /health`;
2. login admin;
3. buka admin dashboard;
4. buka web publik;
5. create transaction campaign;
6. upload payment proof atau gateway create payment;
7. approve/mark paid;
8. create/submit disbursement;
9. cek qurban, zakat, dan reports;
10. cek scheduler log tidak error.

## Dokumen Lama yang Diserap

| File Lama | Status |
|-----------|--------|
| `DEPLOYMENT.md` | Diserap sebagian. Instruksi Cloudflare/Wrangler sudah tidak sesuai runtime aktual. |
| `SETUP.md` | Diserap sebagian untuk setup dev lama; detail Neon/Wrangler tidak jadi arsitektur production. |
| `QUICKSTART.md` | Diserap sebagian; credential default dan port lama tidak dijadikan source-of-truth. |
| `03-deploy-production-blueprint.md` | Diserap dan dikoreksi ke implementasi aktual. |
| `03-manifest-production.md` | Diganti oleh dokumentasi runner aktual `run-production-manifest.ts`. |
| `01-migrasi-wrangler.md` | Diserap sebagai riwayat migrasi; runtime aktual sudah Node. |

`docs/bsi.md` tidak dihapus dalam batch ini karena berisi data operasional VPN eksternal, bukan implementasi kode deployment umum. File itu perlu review domain terpisah sebelum diputuskan apakah masuk arsitektur integrasi bank atau tetap sebagai dokumen operasional terbatas.

## Catatan Kritis

1. Jangan memakai instruksi Wrangler/Cloudflare Workers lama untuk production saat ini.
2. `apps/api/server-node.ts` load env dari dua lokasi: `apps/api/.env` dan root `.env`.
3. `ecosystem.config.cjs` override API port ke `3001`, berbeda dari default server Node `50245`.
4. Runner manifest kode lebih baru daripada file manifest production lama di root.
5. Scheduler berjalan di process API, jadi scaling multi-instance perlu desain scheduler terpisah atau locking.
6. Root `.md`, `.sql`, `.html`, dan `.db` di-ignore oleh Git; jangan jadikan file root ignored sebagai source-of-truth production.
7. Dump database dan file DB lokal tidak boleh ditaruh di root repo. `bantuanku.db` dan `laznas_be_2026-01-17_09-39-35_pgsql_data.sql` sudah dihapus; backup harus berada di storage backup terkontrol, bukan workspace source code.
