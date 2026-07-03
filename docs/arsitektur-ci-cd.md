# Arsitektur CI CD

> Terakhir di-sync: 2026-07-02

---

## Overview

CI/CD Bantuanku saat ini **belum terotomasi di repo**. Tidak ditemukan workflow GitHub Actions, GitLab CI, Jenkinsfile, Dockerfile, Vercel/Netlify/Railway/Render config, Husky hook, atau lint-staged config.

Yang tersedia saat ini:

- remote GitHub: `https://github.com/webaneid/bantuanku.git`;
- branch kerja saat audit: `release/vps-initial`;
- script npm workspace untuk build/start/migrasi;
- PM2 config untuk runtime production;
- production migration manifest runner;
- env template;
- quality gate manual yang terdokumentasi di `arsitektur-testing-qa.md`.

Dokumen ini mencatat kondisi CI/CD aktual dan target pipeline yang disarankan. Detail cara deploy process runtime tetap berada di `arsitektur-deployment.md`.

Dokumen terkait:

- `arsitektur-platform.md` — struktur monorepo dan script workspace.
- `arsitektur-deployment.md` — PM2, runtime production, env, smoke test.
- `arsitektur-testing-qa.md` — quality gate, test gap, dan SOP QA.
- `arsitektur-security.md` — secret handling, security checks, dan risk register.
- `arsitektur-database.md` — migration manifest dan prinsip migrasi.
- `arsitektur-observability-logging.md` — log deploy/runtime dan gap monitoring.

---

## Source of Truth Implementasi

| Area | File / Sumber |
|------|---------------|
| Remote Git | `origin -> https://github.com/webaneid/bantuanku.git` |
| Branch audit | `release/vps-initial` |
| Root scripts | `package.json` |
| PM2 production process | `ecosystem.config.cjs` |
| Production migration runner | `packages/db/scripts/run-production-manifest.ts` |
| API runtime | `apps/api/server-node.ts` |
| API env template | `.env.example`, `apps/api/.dev.vars.example` |
| Admin env template | `apps/admin/.env.example` |
| Git ignore policy | `.gitignore` |
| QA gate | `docs/arsitektur-testing-qa.md` |
| Deployment runtime docs | `docs/arsitektur-deployment.md` |

---

## Status CI Aktual

Tidak ditemukan file konfigurasi CI aktif:

| Mekanisme | Status |
|-----------|--------|
| GitHub Actions `.github/workflows/*` | Tidak ada. |
| GitLab CI `.gitlab-ci.yml` | Tidak ada. |
| Jenkins `Jenkinsfile` | Tidak ada. |
| Docker build/deploy | Tidak ada `Dockerfile` / `docker-compose.yml`. |
| Vercel/Netlify/Railway/Render/Fly config | Tidak ada. |
| Husky / pre-commit / pre-push | Tidak ada. |
| lint-staged | Tidak ada. |
| Root `npm test` | Tidak ada. |
| Root `npm run lint` | Tidak ada. |
| Root `npm run type-check` | Tidak ada. |
| Security audit pipeline | Tidak ada. |

Konsekuensi:

1. Build, lint, type-check, migration dry-run, dan security checks tidak otomatis berjalan saat push/PR.
2. Kualitas perubahan bergantung pada eksekusi manual.
3. Tidak ada status check yang bisa memblokir merge.
4. Tidak ada artifact build atau release note otomatis.

---

## Status CD Aktual

CD juga belum terotomasi di repo.

Production runtime yang terdokumentasi di kode:

| Komponen | Source of Truth |
|----------|-----------------|
| Process manager | `ecosystem.config.cjs` |
| API command | `npm run start -w apps/api` |
| Admin command | `npm run start -w apps/admin` |
| Web command | `npm run start -w apps/web` |
| API host/port PM2 | `127.0.0.1:3001` |
| Admin port | `3002` |
| Web port | `3003` |
| Reverse proxy config | Tidak ada di repo. |
| Deployment script | Tidak ada di repo. |
| Rollback script | Tidak ada di repo. |

`ecosystem.config.cjs` hanya mendefinisikan process PM2. File ini tidak melakukan:

- pull code;
- install dependency;
- build app;
- migration;
- backup database;
- health check;
- rollback;
- log rotation;
- secret injection.

---

## Build, QA, dan Migration Gate

Script yang tersedia untuk gate manual:

| Gate | Command |
|------|---------|
| Build workspace | `npm run build` |
| Web lint | `npm run lint -w apps/web` |
| Admin lint | `npm run lint -w apps/admin` |
| Web type-check | `npm run type-check -w apps/web` |
| DB production dry-run | `npm run db:manifest:run:dry` |
| DB production run | `npm run db:manifest:run` |
| DB fresh manifest | `npm run db:manifest:run:fresh` |

Gap:

1. Gate ini belum menjadi CI job.
2. API/DB/shared/admin belum punya script type-check eksplisit.
3. Tidak ada test suite formal yang wajib.
4. Tidak ada migration dry-run otomatis pada PR.
5. Tidak ada smoke test otomatis setelah deploy.

Rujukan detail QA: `arsitektur-testing-qa.md`.

---

## Secret dan Environment di Pipeline

`.gitignore` mengabaikan:

- `.env*`, kecuali `*.env.example`;
- `.dev.vars`;
- log;
- build output;
- `uploads/`;
- root `*.md`, `*.sql`, `*.html`, `*.db` kecuali `README.md`.

Env template yang tersedia:

| File | Fungsi |
|------|--------|
| `.env.example` | Template DB, JWT, email, payment gateway, `ENVIRONMENT`. |
| `apps/admin/.env.example` | Template `NEXT_PUBLIC_API_URL` dan `NEXT_PUBLIC_WEB_URL`. |
| `apps/api/.dev.vars.example` | Template dev lama; masih menyebut Cloudflare Workers secret. |

Gap CI/CD:

1. Tidak ada secret manager pipeline di repo.
2. Tidak ada validasi env wajib sebelum build/deploy.
3. `ecosystem.config.cjs` tidak set `ENVIRONMENT=production`.
4. Deployment production bergantung pada env file lokal/server yang tidak terlihat di repo.
5. Tidak ada policy rotasi secret atau masking secret di pipeline log.

Rujukan security: `arsitektur-security.md`.

---

## Database Migration dalam Release

Source of truth production migration adalah:

```text
packages/db/scripts/run-production-manifest.ts
```

Runner mendukung:

| Opsi | Fungsi |
|------|--------|
| `--dry-run` | Preview tanpa eksekusi SQL. |
| `--fresh` | Jalankan baseline fresh + manifest existing. |
| `--include-optional` | Sertakan migration optional. |
| `--from <file>` | Mulai dari migration tertentu. |
| `--to <file>` | Berhenti di migration tertentu. |
| `--continue-on-error` | Lanjut walau ada error. |
| `--log-file <path>` | Custom log file. |

Gap release:

1. Tidak ada backup DB otomatis sebelum migration.
2. Tidak ada migration lock/advisory lock.
3. Tidak ada rollback migration otomatis.
4. Tidak ada CI check yang memastikan migration baru sudah masuk manifest.
5. Log migration ditulis ke `packages/db/logs/`, tetapi tidak ada retention/centralized log.

Release production yang menyentuh DB harus minimal:

1. backup DB;
2. `npm run db:manifest:run:dry`;
3. review daftar migration;
4. `npm run db:manifest:run`;
5. smoke test domain terdampak.

---

## Branch dan Release

Fakta repo saat audit:

| Item | Nilai |
|------|-------|
| Remote | `origin` GitHub `webaneid/bantuanku` |
| Branch aktif | `release/vps-initial` |

Tidak ditemukan aturan branch/release di repo:

- tidak ada branch protection config;
- tidak ada PR template;
- tidak ada release workflow;
- tidak ada changelog generator;
- tidak ada tag/release policy;
- tidak ada conventional commit config.

Gap:

1. Tidak ada standar branch mana yang boleh deploy.
2. Tidak ada mapping commit/tag ke deployment production.
3. Tidak ada catatan release otomatis.
4. Tidak ada approval gate sebelum deploy.

---

## Manual Deployment Flow Aktual

Berdasarkan script dan PM2 config yang ada, flow deploy manual yang realistis adalah:

1. Ambil kode terbaru dari branch release yang dipilih.
2. Pastikan env production sudah ada di server.
3. Install/update dependency.
4. Jalankan QA gate manual dari `arsitektur-testing-qa.md`.
5. Backup database.
6. Jalankan `npm run db:manifest:run:dry`.
7. Jika aman, jalankan `npm run db:manifest:run`.
8. Jalankan `npm run build`.
9. Restart/reload PM2 process berdasarkan `ecosystem.config.cjs`.
10. Jalankan smoke test production dari `arsitektur-deployment.md`.
11. Cek log PM2/API/admin/web.

Catatan: urutan build vs migration bisa berbeda tergantung jenis perubahan. Jika migration backward-compatible, migration bisa dijalankan sebelum restart. Jika breaking, perlu release plan khusus.

---

## Rollback Aktual

Rollback belum terotomasi.

Yang tidak tersedia:

- script rollback app;
- script rollback DB;
- artifact build versi sebelumnya;
- PM2 reload strategy terdokumentasi;
- backup/restore command di repo;
- feature flag untuk mematikan fitur baru;
- migration down.

Rollback realistis saat ini:

1. checkout commit/tag sebelumnya;
2. install dependency bila perlu;
3. build ulang;
4. restart PM2;
5. restore DB dari backup jika migration sudah merusak kompatibilitas;
6. smoke test ulang.

Gap terbesar: rollback DB bergantung pada backup manual karena migration SQL tidak punya pasangan `down`.

---

## Target CI yang Disarankan

Pipeline minimal untuk PR/push:

1. Install dependency dengan `npm ci`.
2. Validasi lockfile.
3. `npm run build`.
4. `npm run lint -w apps/web`.
5. `npm run lint -w apps/admin`.
6. `npm run type-check -w apps/web`.
7. Setelah script tersedia: type-check API/admin/db/shared.
8. Setelah test runner distandardkan: `npm test`.
9. Security baseline: dependency audit + secret scan.
10. Migration check: pastikan file migration baru terdaftar di production manifest.

Quality gate ini harus mengacu ke `arsitektur-testing-qa.md`, bukan mendefinisikan ulang test policy di banyak tempat.

---

## Target CD yang Disarankan

CD sebaiknya bertahap, bukan langsung full auto deploy.

### Tahap 1 — Assisted Deploy

1. Buat script deploy manual yang idempotent.
2. Script menjalankan:
   - dependency install;
   - build;
   - migration dry-run;
   - optional migration run dengan konfirmasi manual;
   - PM2 reload;
   - health check.
3. Simpan log deploy.
4. Catat commit SHA yang sedang live.

### Tahap 2 — CI-Gated Deploy

1. Deploy hanya dari branch/tag release.
2. Deploy hanya jika CI hijau.
3. Manual approval sebelum production.
4. Backup database otomatis sebelum migration.
5. Smoke test otomatis setelah reload.

### Tahap 3 — Safer Release

1. Blue/green atau rolling deploy untuk frontend/API jika infrastruktur mendukung.
2. Migration backward-compatible wajib.
3. Feature flag untuk fitur berisiko.
4. Rollback app cepat ke artifact sebelumnya.
5. Restore DB terdokumentasi dan diuji.

---

## CI/CD Risk Register

| Risiko | Dampak | Rekomendasi |
|--------|--------|-------------|
| Tidak ada CI otomatis | Bug build/lint/type/test baru bisa ketahuan saat manual deploy. | Tambah workflow CI minimal. |
| Tidak ada CD/deploy script | Deploy bergantung pada ingatan operator. | Buat script deploy bertahap dengan checklist. |
| Tidak ada migration gate otomatis | Migration bisa lupa masuk manifest atau dijalankan tanpa dry-run. | Tambah CI check manifest + dry-run staging/test DB. |
| Tidak ada rollback artifact | Rollback lambat dan rawan salah commit. | Simpan commit SHA/artifact release. |
| Tidak ada backup otomatis sebelum migration | Data production berisiko saat migration gagal. | Backup wajib sebelum DB change. |
| Secret hanya dari env server manual | Drift antar environment sulit dilacak. | Gunakan secret manager pipeline/server dengan validasi env. |
| `ENVIRONMENT=production` belum diset PM2 | Runtime bisa jatuh ke mode development. | Set env production di PM2/deploy script. |
| Tidak ada smoke test otomatis | Deploy bisa dianggap selesai walau endpoint utama rusak. | Tambah health/smoke test post-deploy. |

---

## SOP Perubahan CI/CD

1. Jangan menambahkan deploy otomatis production sebelum CI gate minimal stabil.
2. Setiap pipeline baru harus mencatat trigger: PR, push branch, tag, schedule, atau manual.
3. Setiap secret pipeline harus lewat secret store, bukan hardcoded YAML/script.
4. Migration production wajib dry-run dan backup sebelum eksekusi.
5. Deploy production harus mencatat commit SHA, waktu deploy, operator, dan hasil smoke test.
6. Rollback plan wajib ada sebelum perubahan DB breaking.
7. CI/CD config adalah source of truth operasional; jika dibuat, dokumentasi ini harus diupdate pada commit yang sama.
8. Contoh workflow di file README/script bukan pipeline aktif sampai file config benar-benar ada di repo.

---

## File Lama / Dokumen Lama

Tidak ditemukan dokumen lama khusus CI/CD di root atau `docs/` yang bisa dihapus.

Catatan: `apps/api/scripts/README.md` memuat contoh GitHub Actions untuk update harga emas, tetapi workflow tersebut tidak ada di repo. Karena file itu mendokumentasikan script API spesifik, bukan source-of-truth CI/CD proyek, file tersebut tidak dihapus.
