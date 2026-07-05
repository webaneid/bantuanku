# Rencana Arsitektur Dokumentasi

> Dokumen ini adalah **master plan** dokumentasi teknis proyek Bantuanku.
> Setiap modul mendapat satu file `arsitektur-***.md`.
> Status di-update saat sync dilakukan.
> Source of truth arsitektur hanya file `docs/arsitektur-*.md`.

---

## Kebijakan Source of Truth

1. Dokumentasi arsitektur resmi hanya boleh berada di `docs/arsitektur-*.md`.
2. File helper, blueprint, SOP lama, atau catatan migrasi hanya boleh dihapus jika substansinya sudah dipindahkan, dikompresi, dan diverifikasi terhadap implementasi kode aktual di file arsitektur yang benar.
3. Setiap penghapusan file lama harus punya mapping eksplisit: file lama, file arsitektur pengganti, dan area kode yang sudah dicek.
4. File lama yang tidak terkait langsung dengan implementasi kode atau belum tercakup oleh arsitektur baru tidak boleh dihapus.
5. Root repository tidak boleh menjadi lokasi source-of-truth arsitektur, tetapi file root lama tetap dibiarkan sampai jelas apakah perlu dibuatkan dokumen arsitektur baru atau memang sudah terserap ke arsitektur yang ada.
6. File root yang diabaikan `.gitignore` seperti `/*.md`, `/*.sql`, `/*.html`, dan `/*.db` diperlakukan sebagai bahan audit/staging, bukan dokumentasi resmi, sampai dilakukan review dan mapping.
7. Cleanup dilakukan bertahap per domain arsitektur, bukan sapu bersih berdasarkan nama file.

---

## Status Legenda

| Status | Arti |
|--------|------|
| 🔴 Belum ada | File dokumen belum dibuat |
| 🟡 Draft / Lama | Ada file lama, belum di-sync ke format baru |
| 🟢 Selesai | Dokumen baru sudah dibuat + di-sync dengan implementasi aktual |

---

## Kelompok 1 — Infrastruktur & Platform

| Dokumen | File Target | Status | File Lama |
|---------|-------------|--------|-----------|
| Infrastruktur monorepo, stack, port, env | `arsitektur-platform.md` | 🟢 Selesai | — |
| Deployment VPS + PM2 | `arsitektur-deployment.md` | 🟢 Selesai | `DEPLOYMENT.md`, `SETUP.md`, `QUICKSTART.md`, `03-deploy-production-blueprint.md`, `03-manifest-production.md`, `01-migrasi-wrangler.md` ✅ Dihapus; `bsi.md` ditahan |
| Database: schema umum, migrasi, konvensi ID | `arsitektur-database.md` | 🟢 Selesai | — |
| Auth & roles (JWT, middleware, guards) | `arsitektur-auth.md` | 🟢 Selesai | — |
| Permission RBAC (role, permission, guard) | `arsitektur-permission-rbac.md` | 🟢 Selesai | — |
| Program Coordinator (employee user, scoped campaign/report/disbursement) | `arsitektur-program-coordinator.md` | 🟢 Selesai | `05-program-coordinator.md` ✅ Dihapus |
| API routing (prefix, middleware, route mount) | `arsitektur-api-routing.md` | 🟢 Selesai | `API.md` ✅ Dihapus |
| Error handling (response envelope, status code, validation) | `arsitektur-error-handling.md` | 🟢 Selesai | — |
| Observability & logging (runtime log, metrics gap) | `arsitektur-observability-logging.md` | 🟢 Selesai | — |
| Cache & performance (API cache, ISR, React Query, media, query gap) | `arsitektur-cache-performance.md` | 🟢 Selesai | — |
| Search & discovery (search, autocomplete, listing, sitemap, AI discovery) | `arsitektur-search-discovery.md` | 🟢 Selesai | — |
| Pages CMS (static content page, admin CRUD, public rendering) | `arsitektur-pages-cms.md` | 🟢 Selesai | — |
| Documentation Center (`/documentation`, static TS content) | `arsitektur-documentation-center.md` | 🟢 Selesai | `03-dokumentasi-blueprint.md` ✅ Dihapus |
| Security (trust boundary, secret, webhook, upload, risk register) | `arsitektur-security.md` | 🟢 Selesai | — |
| Testing QA (quality gate, test gap, verification SOP) | `arsitektur-testing-qa.md` | 🟢 Selesai | — |
| CI/CD (pipeline, release gate, deploy automation gap) | `arsitektur-ci-cd.md` | 🟢 Selesai | — |
| Timezone (WIB, timestamptz, date input) | `arsitektur-timezone.md` | 🟢 Selesai | `dokumentasi-timezone-system-wide.md`, `TIMEZONE-FRONTEND-FIX.md`, `TIMEZONE-FIX-COMPLETED.md` ✅ Dihapus |
| Audit log (audit trail user action) | `arsitektur-audit-log.md` | 🟢 Selesai | — |
| Notifikasi WhatsApp, bot, account notification | `arsitektur-notifikasi.md` | 🟢 Selesai | `03-Notifikasi-Whatsapp-Blueprint.md` ✅ Dihapus |
| WhatsApp Community Care (broadcast, re-engagement, ulang tahun) | `arsitektur-wa-community-care.md` | 🟡 Perencanaan | — |
| Tracking: Meta Pixel + GTM + CAPI | `arsitektur-tracking.md` | 🟢 Selesai | `analisa-pixel.md`, `tutorial-pixel-standard-spesifik-peristiwa.md` ✅ Dihapus |

---

## Kelompok 2 — Modul Bisnis Utama

| Dokumen | File Target | Status | File Lama |
|---------|-------------|--------|-----------|
| Donasi & Kampanye (create, checkout, cart) | `arsitektur-donasi.md` | 🟢 Selesai | — |
| Donatur (profil, CRUD, OTP, password) | `arsitektur-donatur.md` | 🟢 Selesai | — |
| Transaksi (universal transaction model) | `arsitektur-transaksi.md` | 🟢 Selesai | — |
| Universal Payment: seluruh metodologi pembayaran (manual bank/cash, QRIS manual/static/dynamic, upload proof, gateway entrypoint, webhook, invoice) | `arsitektur-universal-payment.md` | 🟢 Selesai | `arsitektur-pembayaran.md`, `03-qris-autonominal-blueprint.md` ✅ Dihapus |
| Payment Gateway iPaymu | `arsitektur-payment-gateway-ipaymu.md` | 🟢 Selesai | `dokumentasi-ipaymu.md`, `IPAYMU_SETUP.md`, `CHECK_IPAYMU_SETTINGS.sql`, `INSERT_IPAYMU_GATEWAY.sql` ✅ Dihapus; sudah dibandingkan dengan official iPaymu aktif |
| Payment Gateway Flip | `arsitektur-payment-gateway-flip.md` | 🟢 Selesai | `03-Flip-Blueprint.md`, `FLIP_SETUP.md`, `CHECK_FLIP_SETTINGS.sql`, `INSERT_FLIP_GATEWAY.sql` ✅ Dihapus; sudah dibandingkan dengan official Flip aktif |
| Payment Gateway Xendit | `arsitektur-payment-gateway-xendit.md` | 🟢 Selesai | —; sudah dibandingkan dengan official Xendit aktif |
| Payment Gateway Midtrans | `arsitektur-payment-gateway-midtrans.md` | 🟢 Selesai | —; sudah dibandingkan dengan official Midtrans aktif |
| Disbursement (gaji, transfer, rekening) | `arsitektur-disbursement.md` | 🟢 Selesai | `00-helper-rekening.md` ✅ Dihapus |
| Qurban (full flow: order, savings, execution) | `arsitektur-qurban.md` | 🟢 Selesai | — |
| Zakat (jenis, periode, kalkulator, distribusi) | `arsitektur-zakat.md` | 🟢 Selesai | `arsitektur-kalkulator-zakat-maal.md` ✅ Dihapus |
| Wakaf | `arsitektur-wakaf.md` | 🟢 Selesai | — |
| Fundraiser / Influencer (referral, komisi) | `arsitektur-fundraiser.md` | 🟢 Selesai | — |

---

## Kelompok 3 — Master Data & Konfigurasi

| Dokumen | File Target | Status | File Lama |
|---------|-------------|--------|-----------|
| Master data: Kategori & Pilar | `arsitektur-master-data.md` | 🟢 Selesai | — |
| Karyawan (employee + bank account) | `arsitektur-karyawan.md` | 🟢 Selesai | `00-helper-employees.md`, `02-helper-employee-modal.md` ✅ Dihapus |
| Mustahiq (penerima manfaat) | `arsitektur-mustahiq.md` | 🟢 Selesai | — |
| Mitra (lembaga partner, profil, slug) | `arsitektur-mitra.md` | 🟢 Selesai | — |
| Vendor (penyedia layanan) | `arsitektur-vendor.md` | 🟢 Selesai | `00-helper-vendors.md`, `00-helper-vendors-usage-example.md` ✅ Dihapus |
| Konfigurasi & Settings (admin panel) | `arsitektur-settings.md` | 🟢 Selesai | `CONFIGURATION.md` ✅ Dihapus |
| Akuntansi: COA + Ledger (double-entry) | `arsitektur-akuntansi.md` | 🟢 Selesai | — |
| Laporan & Statistik | `arsitektur-laporan.md` | 🟢 Selesai | — |
| Statistik admin (donatur, mustahiq) | `arsitektur-statistik.md` | 🟢 Selesai | — |
| Export & Import (CSV, Excel, laporan) | `arsitektur-export-import.md` | 🟢 Selesai | — |

---

## Kelompok 4 — Frontend Komponen

| Dokumen | File Target | Status | File Lama |
|---------|-------------|--------|-----------|
| Komponen web: atom/molecule/organism | `arsitektur-komponen-web.md` | 🟢 Selesai | — |
| Komponen admin: Sidebar, Modal, Form, dll. | `arsitektur-komponen-admin.md` | 🟢 Selesai | `SOP-notifikasi.md` ✅ Dihapus |
| Frontend UX quality (feedback, responsive, inline style, a11y gap) | `arsitektur-frontend-ux-quality.md` | 🟢 Selesai | `dokumentasi-front-end.md`, `apps/admin/docs/00-blueprint-front-end.md`, `00-frontend-developement.md`, `hardcode-front-end.md`, `hardcode-audit-frontend.md`, `hardcode-status-checklist.md` ✅ Dihapus |
| Alamat Indonesia (provinsi/kab/kec/kel) | `arsitektur-alamat.md` | 🟢 Selesai | `00-helper-alamat.md` ✅ Dihapus, `00-helper-address-system.md` ✅ Dihapus |
| Kontak terpusat (email, phone, WhatsApp, website) | `arsitektur-kontak.md` | 🟢 Selesai | `00-helper-kontak.md` ✅ Dihapus |
| Donatur modal helper admin | `arsitektur-donatur-modal.md` | 🟢 Selesai | `01-helper-donor-modal.md` ✅ Dihapus |
| Media Library (upload, admin) | `arsitektur-media.md` | 🟢 Selesai | `00-helper-media-library.md`, `03-autocrop-image-blueprint.md` ✅ Dihapus |
| Rich Text Editor (Tiptap, admin + render web) | `arsitektur-text-editor.md` | 🟢 Selesai | — |
| SEO panel + meta tags | `arsitektur-seo.md` | 🟢 Selesai | `03-SEO-blueprint.md` ✅ Dihapus |
| Cart (CartContext, checkout flow) | `arsitektur-cart.md` | 🟢 Selesai | — |
| i18n (id/en locales, nested keys) | `arsitektur-i18n.md` | 🟢 Selesai | `03-Translate-Safe-Text-blueprint.md` ✅ Dihapus |
| Color system & tema | `arsitektur-color.md` | 🟢 Selesai | `color-harmony.md` ✅ Dihapus, `color-harmony-override.md` ✅ Dihapus, `COLORS.md` ✅ Dihapus |
| Activity Reports (laporan kegiatan program) | `arsitektur-activity-reports.md` | 🟢 Selesai | — |

---

## File Lama yang Perlu Ditangani

| File Lama | Aksi |
|-----------|------|
| `00-helper-alamat.md` | Dipindahkan dan dikoreksi di `arsitektur-alamat.md`, ✅ Dihapus |
| `00-helper-address-system.md` | Dipindahkan dan dikoreksi di `arsitektur-alamat.md`, ✅ Dihapus |
| `00-helper-kontak.md` | Dipindahkan dan dikoreksi di `arsitektur-kontak.md`, ✅ Dihapus |
| `00-helper-SOP.md` | Dipindahkan dan dikoreksi di `arsitektur-komponen-admin.md`, ✅ Dihapus |
| `00-helper-employees.md` | Dipindahkan ke `arsitektur-karyawan.md`, ✅ Dihapus |
| `05-program-coordinator.md` | Dipindahkan dan dikoreksi di `arsitektur-program-coordinator.md`, ✅ Dihapus |
| `00-helper-rekening.md` | Pindahkan ke `arsitektur-disbursement.md`, hapus |
| `00-helper-vendors.md` | Dipindahkan ke `arsitektur-vendor.md`, ✅ Dihapus |
| `00-helper-vendors-usage-example.md` | Dimerge ke `arsitektur-vendor.md`, ✅ Dihapus |
| `01-helper-donor-modal.md` | Dipindahkan dan dikoreksi di `arsitektur-donatur-modal.md`, ✅ Dihapus |
| `02-helper-employee-modal.md` | Dimerge ke `arsitektur-karyawan.md`, ✅ Dihapus |
| `CONFIGURATION.md` | Dimerge ke `arsitektur-settings.md`, ✅ Dihapus |
| `SOP-notifikasi.md` | Dipindahkan dan dikoreksi di `arsitektur-komponen-admin.md`, ✅ Dihapus |
| `analisa-pixel.md` | Dipindahkan dan dikoreksi di `arsitektur-tracking.md`, ✅ Dihapus |
| `tutorial-pixel-standard-spesifik-peristiwa.md` | Dikompresi ke mapping event standar di `arsitektur-tracking.md`, ✅ Dihapus |
| `arsitektur-kalkulator-zakat-maal.md` | Merge ke `arsitektur-zakat.md`, hapus |
| `bsi.md` | Ditahan; berisi data operasional VPN eksternal, belum diputuskan sebagai arsitektur integrasi bank |
| `color-harmony.md` | Dipindahkan dan dikoreksi di `arsitektur-color.md`, ✅ Dihapus |
| `color-harmony-override.md` | Dipindahkan dan dikoreksi di `arsitektur-color.md`, ✅ Dihapus |
| `COLORS.md` | Dipindahkan dan dikoreksi di `arsitektur-color.md`, ✅ Dihapus |
| `dokumentasi-timezone-system-wide.md` | Dipindahkan dan dikoreksi di `arsitektur-timezone.md`, ✅ Dihapus |
| `TIMEZONE-FRONTEND-FIX.md` | Dipindahkan dan dikoreksi di `arsitektur-timezone.md`, ✅ Dihapus |
| `TIMEZONE-FIX-COMPLETED.md` | Dipindahkan dan dikoreksi di `arsitektur-timezone.md`, ✅ Dihapus |

---

## Cleanup Root Repository

File root berikut sudah dihapus karena topiknya sudah tercakup oleh Batch A/B/C:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `00-blueprint-bantuanku-planning.md` | `arsitektur-platform.md`, `arsitektur-dokumentasi.md` |
| `00-blueprint-bantuanku.md` | `arsitektur-platform.md`, `arsitektur-database.md`, modul Batch B/C |
| `00-blueprint-pengeluaran-unifikasi.md` | `arsitektur-disbursement.md` |
| `00-blueprint-transaksi.md` | `arsitektur-transaksi.md` |
| `00-cara-migrasi-database.md` | `arsitektur-database.md` |
| `00-coa-explanation-and-recommendations.md` | `arsitektur-akuntansi.md` |
| `01-ledger-blueprint.md` | `arsitektur-akuntansi.md`, `arsitektur-disbursement.md` |
| `01-ledger-perbaikan.md` | `arsitektur-akuntansi.md` |
| `01-ledger-philosofi.md` | `arsitektur-akuntansi.md` |
| `02-bank-data.md` | `arsitektur-universal-payment.md`, `arsitektur-disbursement.md`, `arsitektur-settings.md` |
| `03-Amil-Blueprint.md` | `arsitektur-fundraiser.md`, `arsitektur-disbursement.md`, `arsitektur-laporan.md` |
| `03-Mitra-Lembaga-Blueprint.md` | `arsitektur-mitra.md` |
| `03-Payment-Methode*.md` | `arsitektur-universal-payment.md`, `arsitektur-settings.md` |
| `03-Revenue-Share-Disbursement-Blueprint.md` | `arsitektur-disbursement.md`, `arsitektur-laporan.md` |
| `03-Tabungan-Qurban-Blueprint.md` | `arsitektur-qurban.md` |
| `03-Universal-Disbursements-Blueprint.md` | `arsitektur-disbursement.md` |
| `03-Universal-Reports-Blueprint.md` | `arsitektur-laporan.md` |
| `03-Universal-Transactions-Blueprint.md` | `arsitektur-transaksi.md` |
| `03-Users-Role-Data-Blueprint.md` | `arsitektur-auth.md` |
| `03-blueprint-COA.md`, `03-blueprint-COA.md.bak` | `arsitektur-akuntansi.md` |
| `03-fundraiser-blueprint.md` | `arsitektur-fundraiser.md` |
| `03-kode-unik-blueprint.md` | `arsitektur-transaksi.md`, `arsitektur-laporan.md` |
| `03-laporan-cash-flow-blueprint.md` | `arsitektur-laporan.md` |
| `03-dokumentasi-blueprint.md` | `arsitektur-documentation-center.md` |
| `03-pages-static-blueprint.md` | `arsitektur-pages-cms.md` |
| `dokumentasi-front-end.md` | `arsitektur-frontend-ux-quality.md` |
| `apps/admin/docs/00-blueprint-front-end.md` | `arsitektur-frontend-ux-quality.md` |
| `00-frontend-developement.md` | `arsitektur-frontend-ux-quality.md`, `arsitektur-komponen-web.md`, `arsitektur-color.md`, `arsitektur-seo.md`, `arsitektur-universal-payment.md`, dan dokumen payment gateway spesifik |
| `hardcode-front-end.md` | `arsitektur-i18n.md`, `arsitektur-settings.md`, `arsitektur-frontend-ux-quality.md` |
| `hardcode-audit-frontend.md` | `arsitektur-i18n.md`, `arsitektur-universal-payment.md`, `arsitektur-frontend-ux-quality.md` |
| `hardcode-status-checklist.md` | `arsitektur-i18n.md`, `arsitektur-settings.md`, `arsitektur-frontend-ux-quality.md` |
| `03-reports-page.md` | `arsitektur-laporan.md` |
| `05-kelengkapan-transactions.md` | `arsitektur-transaksi.md` |
| `07-konsep-qurban.md` | `arsitektur-qurban.md` |
| `QURBAN_DOCUMENTATION.md` | `arsitektur-qurban.md` |
| `TRANSACTION-SYSTEM-MIGRATION.md` | `arsitektur-transaksi.md` |
| `dokumentasi-qurban-planning.md`, `dokumentasi-qurban.md` | `arsitektur-qurban.md` |
| `GOLD-PRICE-AUTO-UPDATE.md` | `arsitektur-zakat.md`, `arsitektur-settings.md`, `apps/api/scripts/README.md` |
| `02-scraping-harga-emas.md` | `arsitektur-zakat.md`; tutorial scraper lama tidak dipertahankan sebagai source of truth |
| `test-zakat-query.sql` | `arsitektur-zakat.md`; query lama salah karena memakai `zakat_donations` dan status `success` |
| `cleanup-zakat-donations.sql` | `arsitektur-zakat.md`, `arsitektur-transaksi.md`, `arsitektur-akuntansi.md`; destructive helper lama tidak dipertahankan |
| `03-migration-summary.md` | `arsitektur-akuntansi.md`; ringkasan liability migration lama dikoreksi sebagai script historis, bukan SOP production |
| `packages/db/src/migrations/README.md` | `arsitektur-akuntansi.md`; dokumentasi liability migration lama dihapus agar tidak menjadi source of truth kedua |
| `00-helper-SOP.md` | `arsitektur-komponen-admin.md`, dengan detail domain dirujuk ke `arsitektur-kontak.md`, `arsitektur-alamat.md`, `arsitektur-disbursement.md`, dan `arsitektur-media.md` |
| `test-login.html` | Dihapus; test manual lama memakai port `8787`, endpoint legacy `/donations`, dan credential contoh di HTML |
| `test-query.ts` | Dihapus; query ledger lama memakai `ledger_accounts` dan akun `1010/1020`, sudah tidak sesuai arsitektur akuntansi modern |
| `test-gcs-debug.ts` | Dihapus; script debug GCS root mencetak konfigurasi sensitif dan melakukan upload nyata, risiko dicatat di `arsitektur-security.md`/`arsitektur-observability-logging.md` |
| `test-upload-direct.ts` | Dihapus; script test GCS root melakukan upload nyata dan insert DB manual, bukan QA resmi |
| `fix-zakat-routes.js` | Dihapus; codemod sekali pakai untuk route zakat lama, bukan bagian implementasi runtime atau SOP migrasi |
| `run-qurban-migrations.sh` | Dihapus; hardcode DB lokal dan merujuk migration qurban lama/tidak lengkap, digantikan production manifest di `arsitektur-database.md` |
| `setup-db.sh` | Dihapus; setup Neon + `db:push` lama, bertentangan dengan SOP manifest migration di `arsitektur-deployment.md` |
| `bantuanku.db` | Dihapus; file SQLite/root DB kosong 0 byte, bukan runtime dependency |
| `laznas_be_2026-01-17_09-39-35_pgsql_data.sql` | Dihapus; dump PostgreSQL lama berisi blok data `COPY` untuk admin/transaksi/settings, bukan migration resmi dan berisiko data leakage |
| `packages/db/sqlite.db` | Dihapus; file SQLite kosong 0 byte dan tidak ada runtime source yang memakai SQLite |
| `apps/api/bantuanku.db` | Dihapus; SQLite qurban legacy berisi seed/master qurban kecil dan tidak ada runtime source yang memakai SQLite |

File root berikut dihapus setelah `arsitektur-deployment.md` dibuat dan diverifikasi terhadap kode/config runtime:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `DEPLOYMENT.md` | `arsitektur-deployment.md` |
| `SETUP.md` | `arsitektur-deployment.md` untuk setup runtime; detail non-arsitektur tidak dipertahankan |
| `QUICKSTART.md` | `arsitektur-deployment.md` untuk command runtime; credential/port lama tidak dipertahankan |
| `03-deploy-production-blueprint.md` | `arsitektur-deployment.md` |
| `03-manifest-production.md` | `arsitektur-deployment.md` + `packages/db/scripts/run-production-manifest.ts` sebagai source-of-truth daftar migrasi |
| `01-migrasi-wrangler.md` | `arsitektur-deployment.md` |

File root berikut dihapus setelah `arsitektur-notifikasi.md` dibuat dan diverifikasi terhadap kode runtime:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `03-Notifikasi-Whatsapp-Blueprint.md` | `arsitektur-notifikasi.md` |

File root berikut dihapus setelah `arsitektur-i18n.md` dibuat dan diverifikasi terhadap kode runtime:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `03-Translate-Safe-Text-blueprint.md` | `arsitektur-i18n.md` |

File root berikut dihapus setelah `arsitektur-seo.md` dibuat dan diverifikasi terhadap kode runtime:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `03-SEO-blueprint.md` | `arsitektur-seo.md` |

File root berikut dihapus setelah `arsitektur-media.md` dibuat dan diverifikasi terhadap kode runtime:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `00-helper-media-library.md` | `arsitektur-media.md` |
| `03-autocrop-image-blueprint.md` | `arsitektur-media.md` |

File root berikut dihapus setelah `arsitektur-timezone.md` dibuat dan diverifikasi terhadap kode runtime:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `dokumentasi-timezone-system-wide.md` | `arsitektur-timezone.md` |
| `TIMEZONE-FRONTEND-FIX.md` | `arsitektur-timezone.md` |
| `TIMEZONE-FIX-COMPLETED.md` | `arsitektur-timezone.md` |

File root berikut dihapus setelah `arsitektur-api-routing.md` dibuat dan diverifikasi terhadap kode routing aktual:

| File Lama Root | Pengganti Source of Truth |
|----------------|---------------------------|
| `API.md` | `arsitektur-api-routing.md`, dengan detail domain dirujuk ke arsitektur modul masing-masing |

---

## Urutan Pengerjaan (Prioritas)

### Batch A — Fondasi (kerjakan duluan, sering dirujuk)
1. `arsitektur-platform.md` — stack, port, konvensi
2. `arsitektur-database.md` — schema, migrasi, ID
3. `arsitektur-auth.md` — JWT, roles, middleware
4. `arsitektur-permission-rbac.md` — role, permission, guard, matrix akses
5. `arsitektur-api-routing.md` — prefix API, middleware, route mount, webhook
6. `arsitektur-error-handling.md` — response envelope, status code, validasi
7. `arsitektur-observability-logging.md` — runtime log, request id, metrics, tracing gap
8. `arsitektur-cache-performance.md` — API cache, ISR, React Query, media, query gap
9. `arsitektur-search-discovery.md` — search, autocomplete, listing, sitemap, AI discovery
10. `arsitektur-security.md` — trust boundary, secret, webhook, upload, risk register
11. `arsitektur-testing-qa.md` — quality gate, test gap, verification SOP
12. `arsitektur-ci-cd.md` — pipeline, release gate, deploy automation gap

### Batch B — Modul Bisnis Inti
13. `arsitektur-donasi.md`
14. `arsitektur-transaksi.md`
15. `arsitektur-universal-payment.md`
16. `arsitektur-donatur.md`
17. `arsitektur-zakat.md` (sync dari file lama)
18. `arsitektur-qurban.md` (sync dari CLAUDE.md)
19. `arsitektur-fundraiser.md` (sync dari CLAUDE.md)
20. `arsitektur-wakaf.md`
21. `arsitektur-disbursement.md`

### Batch C — Master Data
22. `arsitektur-master-data.md`
23. `arsitektur-karyawan.md`
24. `arsitektur-mustahiq.md`
25. `arsitektur-mitra.md`
26. `arsitektur-vendor.md`
27. `arsitektur-settings.md`
28. `arsitektur-akuntansi.md`
29. `arsitektur-laporan.md`

### Batch D — Frontend & Infrastruktur
30. `arsitektur-komponen-web.md`
31. `arsitektur-komponen-admin.md`
32. `arsitektur-tracking.md`
33. `arsitektur-notifikasi.md`
34. `arsitektur-deployment.md`
35. `arsitektur-cart.md`
36. `arsitektur-universal-payment.md`
37. `arsitektur-media.md`
38. `arsitektur-seo.md`
39. `arsitektur-i18n.md`
40. `arsitektur-alamat.md`
41. `arsitektur-donatur-modal.md`
42. `arsitektur-color.md`
43. `arsitektur-activity-reports.md`
44. `arsitektur-timezone.md`
45. `arsitektur-export-import.md`
46. `arsitektur-statistik.md`
47. `arsitektur-audit-log.md`
