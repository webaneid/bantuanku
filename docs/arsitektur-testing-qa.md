# Arsitektur Testing QA

> Terakhir di-sync: 2026-07-02

---

## Overview

Testing dan QA Bantuanku saat ini belum berupa pipeline test formal yang lengkap. Implementasi aktual lebih banyak mengandalkan:

- `build` Next.js/workspace;
- `lint` pada aplikasi frontend;
- `type-check` hanya tersedia eksplisit di web;
- script verifikasi manual berbasis `tsx`;
- satu file test Bun untuk `TransactionService`, tetapi belum terdaftar di `package.json`;
- verifikasi manual/e2e ad-hoc saat pengembangan.

Dokumen ini mencatat **quality gate yang benar-benar tersedia di repo**, gap test automation, dan SOP verifikasi yang harus dipakai sebelum perubahan besar terutama security, pembayaran, transaksi, dan database.

Dokumen terkait:

- `arsitektur-platform.md` — monorepo, workspace, package manager, runtime.
- `arsitektur-deployment.md` — build/start production, PM2, migrasi production.
- `arsitektur-ci-cd.md` — pipeline, release gate, dan integrasi QA ke deploy.
- `arsitektur-database.md` — migrasi, schema, production manifest.
- `arsitektur-security.md` — security risk register yang butuh regression/security test.
- `arsitektur-api-routing.md` — route API dan middleware global.
- `arsitektur-error-handling.md` — response envelope dan status code.
- `arsitektur-transaksi.md`, `arsitektur-universal-payment.md`, `arsitektur-qurban.md`, `arsitektur-zakat.md` — domain bisnis yang perlu test regression.

---

## Source of Truth Implementasi

| Area | File |
|------|------|
| Root workspace scripts | `package.json` |
| API scripts | `apps/api/package.json` |
| Admin scripts | `apps/admin/package.json` |
| Web scripts | `apps/web/package.json` |
| DB scripts | `packages/db/package.json` |
| Root TypeScript config | `tsconfig.json` |
| API TypeScript config | `apps/api/tsconfig.json` |
| Admin TypeScript config | `apps/admin/tsconfig.json` |
| Web TypeScript config | `apps/web/tsconfig.json` |
| Transaction Bun test | `apps/api/src/services/__tests__/transaction.test.ts` |
| Transaction service manual verification | `apps/api/src/services/__tests__/verify-transaction-service.ts` |
| Transaction API manual verification | `apps/api/src/routes/__tests__/verify-transactions-api.ts` |
| DB verification scripts | `packages/db/scripts/verify-*.ts`, `packages/db/scripts/check-*.ts` |
| API maintenance/check scripts | `apps/api/scripts/check-*.ts`, `apps/api/scripts/sync-*.ts` |
| Lockfile | `package-lock.json` |

---

## Script QA yang Tersedia

### Root workspace

| Command | Fungsi Aktual |
|---------|---------------|
| `npm run build` | Menjalankan `build` semua workspace yang punya script build. |
| `npm run dev` | Menjalankan `dev` semua workspace yang punya script dev. |
| `npm run dev:api` | API dev. |
| `npm run dev:web` | Web dev. |
| `npm run dev:admin` | Admin dev. |
| `npm run db:generate` | Generate migration Drizzle. |
| `npm run db:migrate` | Jalankan migration Drizzle. |
| `npm run db:manifest:run` | Jalankan manifest migrasi production existing DB. |
| `npm run db:manifest:run:fresh` | Jalankan manifest production fresh baseline. |
| `npm run db:manifest:run:dry` | Dry-run manifest production. |

Tidak ada root script `test`, `lint`, `type-check`, `e2e`, `coverage`, atau `audit` di `package.json`.

### API

`apps/api/package.json`:

| Command | Fungsi Aktual |
|---------|---------------|
| `npm run dev -w apps/api` | `tsx watch server-node.ts`. |
| `npm run start -w apps/api` | `tsx server-node.ts`. |
| `npm run check-media-consistency -w apps/api` | Cek konsistensi media. |
| `npm run cleanup-local-originals -w apps/api` | Cleanup original local media. |
| `npm run backfill-qurban-savings-universal -w apps/api` | Backfill qurban savings. |
| `npm run migrate-shared-orders -w apps/api` | Migrasi shared orders. |
| `npm run sync-group-slots -w apps/api` | Sinkronisasi slot qurban group. |
| `npm run sync-payment-status -w apps/api` | Sinkronisasi status payment. |

Tidak ada script API `build`, `lint`, `type-check`, atau `test`.

### Admin

`apps/admin/package.json`:

| Command | Fungsi Aktual |
|---------|---------------|
| `npm run build -w apps/admin` | `next build`. |
| `npm run lint -w apps/admin` | `next lint`. |
| `npm run dev -w apps/admin` | `next dev -p 3001`. |
| `npm run start -w apps/admin` | `next start -p 3002`. |

Tidak ada script admin `test`, `type-check`, atau `e2e`.

### Web

`apps/web/package.json`:

| Command | Fungsi Aktual |
|---------|---------------|
| `npm run build -w apps/web` | `next build`. |
| `npm run lint -w apps/web` | `next lint`. |
| `npm run type-check -w apps/web` | `tsc --noEmit`. |
| `npm run dev -w apps/web` | `next dev -p 3002`. |
| `npm run start -w apps/web` | `next start -p 3003`. |

Tidak ada script web `test` atau `e2e`.

### Database

`packages/db/package.json`:

| Command | Fungsi Aktual |
|---------|---------------|
| `npm run db:generate -w packages/db` | Generate migration. |
| `npm run db:migrate -w packages/db` | Jalankan migration. |
| `npm run db:push -w packages/db` | Push schema. |
| `npm run db:seed -w packages/db` | Seed utama. |
| `npm run db:seed:zakat -w packages/db` | Seed zakat. |
| `npm run db:seed:zakat-coa -w packages/db` | Seed COA zakat. |
| `npm run manifest:run -w packages/db` | Production manifest existing DB. |
| `npm run manifest:run:fresh -w packages/db` | Production manifest fresh DB. |
| `npm run manifest:run:dry -w packages/db` | Dry-run production manifest. |

Tidak ada script DB `test` atau `type-check`.

---

## Test dan Verifikasi Aktual

### Automated-ish test

`apps/api/src/services/__tests__/transaction.test.ts` memakai:

```ts
import { describe, it, expect, beforeAll } from "bun:test";
```

Cakupan:

- create campaign transaction;
- create zakat transaction;
- create qurban transaction dengan admin fee;
- list transactions;
- get transaction by id.

Catatan penting:

1. Test ini memakai DB nyata dari `@bantuanku/db/client`.
2. Test membuat data transaksi baru.
3. Test skip secara manual bila seed data campaign/zakat/qurban tidak ada.
4. Tidak ada script package untuk menjalankannya.
5. Tidak ada setup test database/transaction rollback/fixture isolation.

### Manual verification scripts

| File | Fungsi |
|------|--------|
| `apps/api/src/services/__tests__/verify-transaction-service.ts` | Verifikasi manual `TransactionService`, membuat campaign/zakat/qurban transaction jika data tersedia. |
| `apps/api/src/routes/__tests__/verify-transactions-api.ts` | Verifikasi manual endpoint `/v1/transactions` dan `/v1/campaigns`; butuh API server berjalan. |
| `packages/db/scripts/verify-transactions-tables.ts` | Verifikasi tabel transaksi. |
| `packages/db/scripts/verify-employees-table.ts` | Verifikasi tabel employees. |
| `packages/db/scripts/verify-vendors-table.ts` | Verifikasi tabel vendors. |
| `packages/db/scripts/verify-migration.ts` | Verifikasi migrasi DB tertentu. |
| `packages/db/scripts/check-api-response-format.ts` | Simulasi format response address/employee dari query DB. |
| `apps/api/scripts/check-media-consistency.ts` | Cek konsistensi media DB/storage. |
| `apps/api/scripts/check-transactions.ts` | Cek transaksi. |
| `apps/api/scripts/check-savings.ts` | Cek qurban savings. |

Script di atas bersifat operasional/manual. Beberapa membutuhkan `DATABASE_URL`, data seed tertentu, atau API server hidup. Tidak semuanya aman untuk dijalankan pada production karena bisa membuat data atau membaca data nyata.

Root test/debug artifact lama yang sudah dihapus:

| File | Alasan |
|------|--------|
| `test-login.html` | Test browser ad-hoc dengan port/endpoint/credential contoh lama; bukan bagian QA resmi. |
| `test-query.ts` | Query ledger lama dan tidak sesuai model akuntansi/runtime modern. |
| `test-gcs-debug.ts` | Membaca setting CDN dan melakukan upload GCS nyata; juga mencetak detail konfigurasi sensitif. |
| `test-upload-direct.ts` | Melakukan upload GCS dan insert row media manual; tidak punya guard test/staging. |

Jika butuh test serupa lagi, buat sebagai script terkontrol di workspace yang relevan, dengan guard environment test/staging dan tanpa mencetak secret.

---

## Lint, Type Check, dan Build

| Area | Status Aktual |
|------|---------------|
| Root build | Ada, menjalankan workspace build yang tersedia. |
| API build | Tidak ada script build; API dijalankan via `tsx`. |
| Admin build | Ada `next build`. |
| Web build | Ada `next build`. |
| Admin lint | Ada `next lint`, tetapi memakai Next 15/ESLint 9 sehingga perlu diverifikasi kompatibilitas command. |
| Web lint | Ada `next lint`, Next 14. |
| API lint | Tidak ada. |
| DB lint | Tidak ada. |
| Root type-check | Tidak ada. |
| Web type-check | Ada. |
| Admin type-check | Tidak ada script eksplisit, tetapi `next build` biasanya menjalankan type checking. |
| API type-check | Tidak ada script eksplisit walau `tsconfig` tersedia. |
| Shared type-check | Tidak ada script eksplisit walau `tsconfig` tersedia. |

Gap:

1. TypeScript strict aktif di config, tetapi tidak ada command root yang memaksa semua workspace type-check.
2. API dan DB TypeScript dapat rusak tanpa terdeteksi oleh script standar kecuali runtime/build lain menyentuhnya.
3. `next lint` sudah deprecated/berubah perilaku pada Next modern; command admin perlu diverifikasi.

---

## E2E dan Browser QA

Tidak ditemukan konfigurasi Playwright/Cypress aktif:

- tidak ada `playwright.config.*`;
- tidak ada `cypress.config.*`;
- tidak ada script `e2e`;
- `@playwright/test` hanya muncul sebagai optional peer dependency Next di lockfile, bukan dependency test suite aplikasi.

Konsekuensi:

1. Checkout, cart, payment proof upload, admin approve payment, qurban savings, zakat calculator, dan activity report belum punya regression e2e otomatis.
2. Perubahan frontend radikal tidak punya visual regression baseline.
3. Verifikasi UI saat ini harus dilakukan manual lewat browser/dev server.

---

## Security QA

Belum ada pipeline security test formal:

| Area | Status Aktual |
|------|---------------|
| Dependency audit | Tidak ada script `npm audit`/SCA di repo. |
| SAST | Tidak ada Semgrep/CodeQL config di repo. |
| Secret scan | Tidak ada Gitleaks/TruffleHog config di repo. |
| DAST/API scan | Tidak ada ZAP/Newman/Bruno/Postman suite di repo. |
| Webhook signature test | Tidak ada automated test. |
| CORS/header test | Tidak ada automated test. |
| Auth/RBAC negative test | Tidak ada automated test. |
| Upload malicious file test | Tidak ada automated test. |

Risiko security yang sudah dicatat di `arsitektur-security.md` harus menjadi prioritas test pertama sebelum hardening dilakukan.

---

## Data dan Environment QA

Testing saat ini belum punya environment yang terisolasi.

Gap:

1. Tidak ada `DATABASE_URL_TEST`.
2. Tidak ada test database lifecycle: create, migrate, seed, truncate, rollback.
3. Test transaksi saat ini menulis ke DB aktif.
4. Manual verification scripts bisa memakai data nyata jika env menunjuk ke production/staging.
5. Tidak ada fixture factory standar untuk campaign, zakat type, qurban package period, donatur, user/admin, payment method, dan settings.

SOP minimal: script yang bisa menulis data harus menolak jalan jika `NODE_ENV=production` atau jika database URL tidak secara eksplisit bertanda test/staging.

---

## Coverage Berdasarkan Domain

| Domain | Coverage Aktual | Gap |
|--------|-----------------|-----|
| Transaksi | Ada test/service manual terbatas. | Tidak ada isolated DB test, idempotency, status flow, cart multi-item, gateway mapping. |
| Pembayaran | Belum ada test formal. | Upload proof, approve payment, gateway webhook signature/status mapping belum otomatis. |
| Auth | Belum ada test formal. | Login, refresh, OTP, role stale, invalid token, rate limit belum otomatis. |
| RBAC | Belum ada negative test formal. | Role/permission denial matrix belum otomatis. |
| Security headers/CORS | Belum ada test. | Origin allow/reject, header baseline belum otomatis. |
| Upload/media | Ada check media consistency. | MIME spoofing, size limit, GCS failure/local fallback belum otomatis. |
| Zakat | Belum ada test formal. | Calculator, type/period, distribution flow belum otomatis. |
| Qurban | Belum ada test formal. | Savings, shared group, slot sync, execution belum otomatis. |
| Disbursement | Belum ada test formal. | Status transition, role constraint, ledger side effects belum otomatis. |
| Activity reports | Belum ada test formal. | Public/admin flow, media link, SEO integration belum otomatis. |
| Timezone | Belum ada test formal. | WIB date input, filename UTC, report periods belum otomatis. |
| Export/import | Belum ada test formal. | CSV headers, role access, PII export, timezone filename belum otomatis. |

---

## Recommended Quality Gate

Untuk kondisi repo saat ini, quality gate realistis sebelum merge/deploy:

1. `npm run build`
2. `npm run lint -w apps/web`
3. `npm run lint -w apps/admin`
4. `npm run type-check -w apps/web`
5. Jalankan manual verification yang relevan dengan domain yang berubah.
6. Untuk perubahan DB: `npm run db:manifest:run:dry`
7. Untuk perubahan security/API: jalankan curl/manual negative checks untuk 401/403/415/429/CORS/header sesuai area.

Catatan: command di atas adalah rekomendasi berbasis script yang tersedia. Karena belum ada CI formal, hasilnya harus dicatat manual di PR/catatan perubahan.

---

## Target Arsitektur QA yang Disarankan

### Tahap 1 — Foundation

1. Tambah script root:
   - `test`;
   - `lint`;
   - `type-check`;
   - `qa`;
   - `security:audit`.
2. Tambah type-check API, DB, shared, admin.
3. Pilih satu test runner untuk Node/TS. Karena sudah ada `bun:test`, pilihannya:
   - standarkan ke Bun untuk service-level test; atau
   - migrasi ke Vitest agar selaras ekosistem Node/Next.
4. Tambah test DB lifecycle dengan `DATABASE_URL_TEST`.

### Tahap 2 — API dan Domain Regression

Prioritas test API:

1. Auth: login, refresh, invalid token, expired token, OTP attempts.
2. RBAC: allow/deny matrix role admin.
3. Transaksi: create, status flow, category mapping, proof upload.
4. Pembayaran: manual approve/reject, webhook signature, expired-to-cancelled mapping.
5. Qurban: order, savings deposit, shared group slots.
6. Zakat: calculator dan payment transaction.
7. Disbursement: status transition role constraint.

### Tahap 3 — E2E dan Visual Regression

Prioritas e2e:

1. Public donation checkout.
2. Cart multi-item checkout.
3. Payment proof upload.
4. Admin approve payment.
5. Zakat calculator to checkout.
6. Qurban savings flow.
7. Admin activity report create/edit/public view.

Visual regression perlu minimal untuk:

- checkout;
- payment result;
- admin dashboard critical tables;
- activity report detail;
- campaign/zakat/qurban detail public pages.

### Tahap 4 — Security QA

Tambahkan automated checks untuk:

1. CORS allowlist dan reject unknown origin.
2. Security headers API/admin/web.
3. Webhook signature valid/invalid/replay.
4. Auth/RBAC negative tests.
5. Upload MIME spoofing dan size limit.
6. Secret redaction log snapshot.
7. Dependency audit dan secret scan.

---

## SOP Penambahan Test

1. Test yang menulis DB wajib memakai database test terpisah.
2. Test tidak boleh bergantung pada data production/staging kecuali diberi label manual read-only.
3. Test harus membuat fixture sendiri atau memakai seed test eksplisit.
4. Test yang membuat transaksi/payment harus membersihkan data atau berjalan dalam transaction rollback.
5. Manual verification script harus punya guard environment agar tidak menulis ke production.
6. Setiap bug security critical/high wajib punya regression test sebelum dianggap selesai.
7. Setiap arsitektur baru yang mencatat gap implementasi harus menyebut apakah gap itu sudah punya test atau belum.
8. Jangan menambahkan blueprint test di luar `docs/arsitektur-testing-qa.md`; source of truth QA hanya dokumen ini.

---

## File Lama / Dokumen Lama

Tidak ditemukan dokumen lama khusus testing/QA di root atau `docs/` yang bisa dihapus.

`apps/admin/docs/00-blueprint-front-end.md` memuat contoh testing lama, tetapi file itu adalah blueprint frontend luas dan belum dipetakan penuh ke arsitektur baru. Karena tidak seluruh substansinya terserap oleh dokumen ini, file tersebut **tidak dihapus**.
