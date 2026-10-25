# Arsitektur Buku Kas dan Hak Bagi Hasil (Rencana)

> **Status: ADR-0016 Accepted; Fase 1 (offline) berjalan.** Keputusan pemilik produk 2026-10-26 sudah masuk (§11); tersisa D3 (cara memasukkan data lama, dari audit produksi) lalu persetujuan ADR-0016. **Pembangunan dilakukan offline (lokal) dulu**; produksi menyusul setelah pelajaran dicatat. Disusun 2026-10-26 sesuai SOP (arsitektur → kode aktual → rencana fase → eksekusi → `tsc` → review keamanan → dokumentasi). Keputusan desain: `docs/decisions/adr-0016-buku-kas-dan-hak-bagi-hasil.md`. Kondisi laporan saat ini: `arsitektur-laporan.md`.

## 1. Tujuan dan prinsip

Pemilik produk ingin laporan keuangan **sederhana** yang menjawab lima hal. Seluruh desain mengikuti prinsip: **satu sumber, satu definisi, setiap angka dapat ditelusuri ke satu baris.**

| # | Kebutuhan pemilik | Dijawab oleh |
|---|---|---|
| 1 | Tahu uang berasal dari mana: zakat (fitrah, maal, …), qurban, campaign, wakaf, fidyah | kolom **dana** + **rincian dana** di buku kas |
| 2 | Tahu uang disimpan di rekening mana dan berapa | **akun kas** (`cash_accounts`) + **Saldo Rekening** |
| 3 | Tahu metode bayar (hanya yang diaktifkan) dan, bila gateway, gateway apa | kolom **metode** + **gateway** |
| 4 | Tahu uang masuk dan keluar | laporan **Arus Kas** |
| 5 | Tahu bagi hasil: amil, developer, mitra, influencer — berapa dan sudah ditransfer atau belum | laporan **Bagi Hasil** (hak − dibayar = sisa) |

Prinsip tambahan: aditif (tidak mengubah tabel/alur lama), append-only (koreksi lewat entri pembalik), paginasi dan agregasi di SQL, tanggal WIB (`utils/timezone.ts`), tidak ada nama tenant yang di-hardcode.

## 2. Kondisi sekarang (ringkas, dengan bukti)

Rinci di `arsitektur-laporan.md`. Fakta yang menentukan desain (data dev 2026-10-26; **produksi harus diaudit**, §7):

| Temuan | Bukti |
|---|---|
| Jurnal kosong, neraca sintetis | `ledger_entries` 0, `ledger_lines` 0; `/financial-statement` = 5 agregat SQL |
| Tiga definisi "uang masuk" | 4.295.000 (`dashboard`) / 4.298.781 (`financial-statement`, +kode unik) / 4.498.001 (pembayaran verified) |
| Pembayaran ganda | TRX-20260224-47273: 3× verified @100.213 untuk tagihan 100.213 |
| `paid_amount` tidak konsisten | transaksi paid dengan `paid_amount` 0 (3 dari 9), atau memuat kode unik, atau tidak |
| Kode unik tidak selalu diterima | Flip: 3 dari 5 transaksi paid tanpa kode unik (nominal Rp 1.206) |
| Rekening tak terhubung | `bank_accounts` 0 baris; `transactions.bank_account_id` terisi 0/17; rekening hanya di JSON `settings` |
| Cicilan tak terbaca | status `partial` tidak ada di laporan manapun |
| Bagi hasil: hak ada, pembayaran tak terlihat | `revenue_shares` 6 baris `calculated`; `disbursement_revenue_share_items` 0 |
| Dana qurban/zakat sebagai "pendapatan" dan "ekuitas" | `/financial-statement`: ekuitas 3.448.781 memuat titipan qurban 3.400.000 |

Sumber dana yang dapat diturunkan **tanpa kolom baru**: `transactions.product_type` + `campaigns.pillar` (di `type_specific_data.pillar`: `sedekah`, `wakaf`, `fidyah`, …) + `type_specific_data.payment_type` (tabungan qurban) + jenis zakat dari nama produk (`getCategoryFromTransaction`).

## 3. Model data (target)

Migrasi baru **123** (`123_create_cash_book.sql`, didaftarkan di `packages/db/scripts/run-production-manifest.ts`), schema Drizzle `packages/db/src/schema/cash-book.ts`. Semua `CREATE TABLE IF NOT EXISTS`, tanpa FK `ON DELETE CASCADE` ke tabel uang (jejak audit tidak boleh hilang).

### 3.1 `cash_accounts` — akun kas (rekening)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK (`createId`) | |
| `kind` | text | `bank` \| `qris` \| `gateway` \| `cash` \| `unmapped` (setiap metode bayar = satu akun kas) |
| `name` | text | tampilan: "BSI 1234…", "QRIS Infaq", "Flip", "Kas Tunai" |
| `ref_key` | text UNIQUE | pemetaan: id di settings (`bank-<ts>`, `qris-<ts>`), kode gateway (`flip`, `ipaymu`, `midtrans`, `xendit`), `cash`, atau `unmapped` |
| `gateway_code` | text null | untuk `kind = gateway` |
| `purpose` | text | `umum` \| `zakat` (turunan `programs` di settings; dipakai peringatan "dana zakat di rekening non-zakat") |
| `is_active` | boolean | |
| `created_at`, `updated_at` | timestamptz | |

Akun dibuat **otomatis (upsert)** saat pertama dipakai atau lewat tombol "Sinkron dari Settings"; admin tidak perlu mengisi saldo (tidak ada saldo awal). Metode bayar yang tak dikenal masuk akun `unmapped` (ditandai di laporan, harus dipetakan).

### 3.2 `cash_entries` — buku kas (append-only)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `entry_date` | timestamptz | `verified_at` pembayaran / `paid_at` pencairan / waktu koreksi (WIB saat ditampilkan) |
| `direction` | text | `in` \| `out` |
| `amount` | bigint > 0 | rupiah |
| `component` | text | `pokok` \| `kode_unik` \| `kelebihan` \| `biaya_transfer` \| `koreksi` |
| `fund` | text | `zakat` \| `qurban` \| `campaign` \| `wakaf` \| `fidyah` \| `operasional` \| `bagi_hasil` \| `lainnya` |
| `fund_detail` | text null | slug jenis zakat (`fitrah`, `maal`, …), id campaign, id periode/paket qurban, kategori operasional |
| `cash_account_id` | text FK `cash_accounts` | |
| `method` | text | `bank_transfer` \| `qris` \| `gateway` \| `cash` \| `other` |
| `gateway_code` | text null | `flip`, `ipaymu`, … |
| `ref_type` | text | `transaction_payment` \| `disbursement` \| `adjustment` |
| `ref_id` | text | id sumber |
| `transaction_id` | text null | untuk drill-down donasi |
| `campaign_id` | text null | untuk rincian per program |
| `reverses_entry_id` | text null | entri ini membalik entri lain |
| `note` | text null | wajib untuk koreksi dan pembalik |
| `created_by` | text null | user (null = sistem) |
| `created_at` | timestamptz | |

Indeks: `(entry_date)`, `(fund, entry_date)`, `(cash_account_id, entry_date)`, `(transaction_id)`, **UNIQUE `(ref_type, ref_id, component)`** (idempotensi posting; pembalik memakai `ref_type = 'adjustment'`). Tidak ada UPDATE/DELETE pada baris; koreksi = baris baru dengan `reverses_entry_id`.

### 3.3 Hak bagi hasil — tanpa tabel baru

| Data | Sumber yang sudah ada |
|---|---|
| Hak per transaksi | `revenue_shares`: `amil_total/amil_net`, `developer_amount`, `fundraiser_amount` (+`fundraiser_id`), `mitra_amount` (+`mitra_id`), `program_amount`, `calculated_at` |
| Pembayaran | `disbursements` bertipe `revenue_share` (`category` = `revenue_share_mitra/fundraiser/developer`), status `paid`, + `disbursement_revenue_share_items` (`share_type`, `allocated_amount`) |
| Saldo berjalan | `fundraisers.current_balance/total_withdrawn`, `mitra.current_balance/total_withdrawn` (hanya untuk pencocokan, bukan sumber) |

Yang dibangun adalah **read model** (service `revenue-share-ledger`): per pihak `hak` (jumlah dari `revenue_shares` pada transaksi `paid`), `dibayar` (pembayaran paid), `sisa = hak − dibayar`, plus daftar per transaksi dan per pencairan. **Amil**: `hak` = `amil_net_amount`; `dipakai` = pencairan paid kategori `operational_*`; `sisa` = hak amil yang belum terpakai (informasi, bukan turunan dari sisa dana program). Pastikan setiap pencairan bagi hasil **selalu** menulis item penghubung (gap saat ini, Fase 2).

## 4. Aturan posting (peristiwa → baris buku kas)

Satu fungsi posting (`services/cash-book.ts`) dipanggil di dalam transaksi DB yang mengubah status. **Keputusan Fase 2:** posting dijalankan di dalam SAVEPOINT (`safePost`) dan kegagalannya **tidak membatalkan** verifikasi pembayaran/pencairan yang sah; kegagalan dicatat `[cashbook]` di log dan celahnya ditutup oleh `npm run cashbook:check` + backfill (idempoten). Alasan: uang yang sudah sah tidak boleh tertahan karena pencatatan.

### 4.1 Pembayaran terverifikasi → `in`

Pemicu: `transaction_payments.status` menjadi `verified` (rute: `routes/transactions.ts` approve-payment ±baris 884; webhook `routes/payments.ts` ±647; `routes/admin/qurban-savings.ts` ±879 dan ±1039; jalur lain ditemukan lewat grep + pemeriksa rekonsiliasi §8).

- **Akun kas**: metode bayar → `cash_accounts.ref_key` (id rekening/QRIS di settings, atau kode gateway, atau `cash`; selain itu `unmapped`).
- **Dana**: `campaign` → `pillar` `wakaf` → `wakaf`, `fidyah` → `fidyah`, selain itu `campaign` (rincian = campaign id); `zakat` → `zakat` (rincian = jenis zakat); `qurban` (termasuk tabungan) → `qurban` (rincian = paket/periode).
- **Alokasi jumlah** ke komponen, **kumulatif per transaksi** (mendukung cicilan): `pokok` sampai `total_amount`, berikutnya `kode_unik` sampai `unique_code`, selebihnya `kelebihan` (pembayaran ganda/lebih bayar). **Ketiganya adalah pemasukan** (D1, D6); label komponen hanya untuk penelusuran dan filter. Kode unik hanya muncul bila memang diterima.
- Pembayaran `rejected`/`pending` tidak diposting. Pembayaran yang kemudian dibatalkan setelah verified → baris pembalik (`reverses_entry_id`).

### 4.1b Transaksi `paid` tanpa pembayaran terverifikasi (D3, kelompok A)

Diputuskan pemilik produk (2026-10-26): **dicatat sebagai uang masuk**. Aturan (`postPaidTransactionWithoutPayment`): transaksi `paid` tanpa satu pun pembayaran `verified` → satu baris `in`, komponen `pokok`, jumlah = `total_amount`, `ref_type = transaction_paid`, tanggal = `paid_at` (atau `created_at`), akun menurut `payment_method_id` (tak dikenal → `unmapped`), catatan "Data eksisting: transaksi paid tanpa pembayaran terverifikasi". Dilewati: transaksi non-tunai (`is_non_cash`, nominal 0, mis. konversi tabungan). Kode unik tidak diasumsikan diterima. Bila kelak transaksi itu mendapat pembayaran terverifikasi, baris sintetis **dibalik otomatis** (`koreksi` keluar) agar tidak dobel. Jalur hidup: `PUT /transactions/:id` yang menyetel `paid` memicu aturan ini; selebihnya ditutup backfill dan `cashbook:check`.

### 4.2 Pencairan `paid` → `out`

Pemicu: `disbursements.status` menjadi `paid` (`services/disbursement.ts` ±556; `routes/admin/zakat-distributions.ts` ±505; jalur lain lewat grep).

- **Akun kas**: `source_bank_id`/`bank_account_id` → akun kas yang sama.
- **Dana**: `zakat_to_*` → `zakat` (rincian = asnaf); `campaign_to_*` → dana campaign tujuan (`wakaf`/`fidyah`/`campaign` menurut pillar `reference_id`); `qurban_*` → `qurban`; `revenue_share_*` → `bagi_hasil` (rincian = `mitra`|`fundraiser`|`developer`; tidak mengurangi dana program karena hak sudah dikurangkan lewat `revenue_shares`); `operational_*` → `operasional` (rincian = kategori).
- **Komponen**: `pokok` = `transferred_amount` (atau `amount`); `additional_fees` (biaya transfer bank pada pencairan) menjadi baris `out` terpisah berkomponen `biaya_transfer`.

### 4.3 Gateway dan koreksi

- **Gateway** (D4): uang yang berhasil lewat gateway langsung dihitung masuk ke akun kas gateway itu. Tidak ada pindah kas ke bank dan tidak ada biaya gateway (ditanggung donatur; Flip `charge_fee: 1`). Penarikan dana gateway → bank berada di luar aplikasi.
- **Koreksi**: entri pembalik atau `koreksi` dengan `note` wajib, hanya `super_admin`/`admin_finance`, selalu masuk `audit_logs`.

## 5. Laporan (5) dan formulir (1)

Semua endpoint baru di `apps/api/src/routes/admin/cashbook.ts`, mount `/admin/cashbook`, role `super_admin` + `admin_finance` (baca) dan hanya keduanya untuk tulis. Agregasi SQL dengan parameter terikat, paginasi server, batas hari WIB (`startOfDayWIB`/`endOfDayWIB`). UI di menu **Keuangan** (menggantikan "Reports").

| # | Laporan | Endpoint | Isi |
|---|---|---|---|
| 1 | **Arus Kas** | `GET /admin/cashbook/entries`, `/summary` | tabel baris + total masuk/keluar/netto; filter: tanggal, dana, akun kas, metode, gateway, arah, komponen (pokok/kode unik/kelebihan), pencarian; ekspor Excel/CSV |
| 2 | **Sirkulasi Rekening** | `GET /admin/cashbook/accounts`, `/accounts/gateways` | per akun kas: masuk − keluar = **uang yang beredar di sistem** (bukan saldo bank; tanpa saldo awal/rekonsiliasi); peringatan dana zakat di rekening non-zakat; akun `unmapped`. **Blok per gateway** (D4): percobaan, **berhasil**, tertunda, gagal/kedaluwarsa, total masuk berhasil (dari `transaction_payments` semua status) + kolom potongan bila payload menyediakannya (iPaymu `Fee`; Flip tidak) |
| 3 | **Dana per Sumber** | `GET /admin/cashbook/funds` | per dana (zakat per jenis, qurban, campaign, wakaf, fidyah): masuk, dikurangi hak bagi hasil non-program (dari `revenue_shares`), dikurangi penyaluran, **sisa dana program** |
| 4 | **Bagi Hasil** | `GET /admin/cashbook/revenue-share`, `/revenue-share/:party` | per pihak (amil, developer, mitra, fundraiser/influencer): hak, sudah ditransfer, belum; drill-down per transaksi dan per pencairan; status "sudah/belum" per baris |
| 5 | **Rincian per Program** | `GET /admin/cashbook/programs`, `/programs/:id` | drill-down dari Dana per Sumber: masuk, bagi hasil, keluar, sisa per campaign/jenis zakat/periode qurban |
| F1 | Koreksi | `POST /admin/cashbook/entries/:id/reverse`, `POST /admin/cashbook/adjustments` | |
| — | Perlu ditinjau (informasi) | `GET /admin/cashbook/review` | paid tanpa pembayaran verified, akun `unmapped`, pembayaran verified tanpa baris buku kas, serta daftar `kelebihan` (hanya informasi, tetap dihitung sebagai pemasukan) |

Dana per Sumber memakai rumus tunggal (D5): `sisa = Σ in (dana) − hak pihak lain (amil, developer, mitra, fundraiser; dari revenue_shares transaksi dana itu) − Σ out program (dana itu)`. **Sisa tetap menjadi sisa program** (contoh pemilik: masuk 3.000.000, disalurkan 2.500.000, hak amil dkk 200.000 → sisa 300.000 tetap "sisa program"). Tidak ada saldo amil turunan dari sisa; hak amil tampil di laporan Bagi Hasil. Laporan lama yang tidak punya padanan (neraca sintetis, liability, consistency-check, ledger-summary, unique-codes sebagai laporan, dll.) dihentikan di Fase 6.

## 6. Hubungan dengan komponen lama

| Komponen | Keputusan |
|---|---|
| `settings` JSON rekening/QRIS (`payment_bank_accounts`, `payment_qris_accounts`) | **Tetap** sebagai konfigurasi checkout; dipetakan ke `cash_accounts` lewat `ref_key` |
| Tabel `bank_accounts` + `updateBankBalance()` | Tidak dipakai (kosong, ber-ID berbeda); **ditandai deprecated**; dihapus lewat ADR/fase terpisah setelah memastikan produksi kosong |
| `revenue_shares`, `disbursements`, `fundraisers/mitra.current_balance` | Dipertahankan; menjadi sumber read model bagi hasil |
| `ledger_entries`, `ledger_lines`, `chart_of_accounts`, `/admin/finance`, `/admin/ledger` (410) | Dibiarkan; **tidak** dipakai laporan baru; nasib lewat ADR terpisah |
| 26 endpoint `/admin/reports/*`, `/admin/analytics`, `/admin/export` | Dipertahankan sampai paritas lolos (Fase 5), lalu menu disembunyikan → 410 → dihapus (Fase 6) |
| Laporan publik web (`public-stats`) | Tidak berubah di rencana ini; kandidat re-source dari buku kas sesudahnya |

### Register Penghapusan (D8)

Komponen berikut **dibiarkan berdiri terpisah**, **tidak boleh dipakai kode baru**, dan **akan dihapus bertahap** mengikuti perbaikan database. Setiap penghapusan wajib lewat ADR/fase tersendiri dan pemeriksaan bahwa produksi tidak lagi memakainya.

| Komponen | Alasan dihapus | Syarat sebelum dihapus |
|---|---|---|
| `ledger_entries`, `ledger_lines`, `chart_of_accounts` (+ seed COA, `routes/admin/coa.ts`, `services/ledger.ts`, halaman `dashboard/ledger/coa`) | jurnal kosong dan tidak jadi sumber laporan | audit produksi: 0 baris jurnal; tak ada konsumen |
| Kolom `transactions.ledger_entry_id`, `transaction_payments.ledger_entry_id`, `disbursements.ledger_entry_id`, `disbursements.expense_account_id` | rujukan ke jurnal yang tidak dipakai | migrasi drop kolom terpisah |
| Tabel `ledger` legacy, `routes/admin/ledger.ts` (selalu 410), `routes/admin/finance.ts` (+ pemakai di halaman master employees/mustahiq) | alur pengeluaran lama | pemakai dialihkan ke `/admin/disbursements` |
| Tabel `bank_accounts`, `entity_bank_accounts` (bagian rekening sumber), `utils/bank-balance.ts` (`updateBankBalance`) | rekening nyata di JSON settings; tabel kosong dan `bank_account_id` tak pernah terisi | ganti ke `cash_accounts`; audit 0 baris |
| Skrip `migrate-to-liability-model.ts` | usang | — |
| `routes/admin/reports.ts` (26 endpoint), `analytics.ts`, `export.ts`, halaman `dashboard/reports/*` | digantikan laporan buku kas | Fase 7 setelah paritas |
| Tabel legacy qurban (`qurban_payments`, `qurban_orders`, `qurban_savings_transactions`, …) dan `zakat_distributions` | model ganda pra-transaksi universal | audit produksi + migrasi data (di luar ADR ini) |

## 7. Audit data produksi dan migrasi data lama

**Langkah 0 (wajib sebelum ADR Accepted):** jalankan audit read-only di VPS:

```bash
cd /var/www/bantuanku/repo
bash scripts/audit/audit-keuangan.sh > audit-keuangan-$(date +%F).txt   # tidak mencetak URL koneksi; sesi dipaksa read-only
```

Skrip: `scripts/audit/audit-keuangan.sh` + `audit-keuangan.sql` (hanya `SELECT`; sesi `default_transaction_read_only=on`; tanpa nama/email/telepon). Memeriksa: inventaris tabel, transaksi per jenis×status, sumber dana turunan, kecocokan paid vs pembayaran verified (kelompok A–E + daftar), pembayaran bukan-paid yang sudah verified, pembayaran ganda, kode unik per metode, rekening dikenal/tak dikenal, pencairan bermasalah, bagi hasil (hak vs dibayar, paid tanpa revenue share), saldo fundraiser/mitra, jejak legacy (`qurban_payments`, `qurban_orders`, `qurban_savings_transactions`, `zakat_distributions`, `ledger`), dan perbandingan enam definisi "uang masuk".

**Aturan backfill** (idempoten, `--dry-run` dulu, laporan selisih; **dikerjakan offline dulu**):
1. Setiap pembayaran `verified` → baris `in` sesuai §4.1 (tanpa mengubah data lama).
2. Setiap pencairan `paid` → baris `out` (§4.2).
3. **Tidak ada cut-off dan tidak ada saldo awal** (D9): buku kas mencatat sirkulasi seluruh riwayat yang ada; yang diaudit adalah *kelengkapan pencatatan*, bukan saldo bank. Pembayaran ganda/kelebihan masuk sebagai pemasukan (D6).
4. Transaksi `paid` tanpa pembayaran verified (mis. diubah manual admin) **tidak** menghasilkan uang masuk; tampil di daftar informasi "Perlu ditinjau" untuk perbaikan data eksisting kelak.
5. Uang di tabel legacy (bila audit menemukan isinya) → diputuskan per kasus (D3).

Hasil audit menentukan D3: cara memasukkan data lama (semua riwayat atau sebagian) dan kebutuhan perbaikan data eksisting; uji dulu pada salinan data offline.

## 8. Rencana eksekusi (fase)

**Prinsip D9: semua dikerjakan offline dulu (lingkungan lokal, boleh memakai salinan data produksi), lalu hasil belajar dicatat di `docs/buku-kas-pelajaran.md` sebagai bekal sebelum menyentuh produksi.** Setiap fase: `tsc` web/admin/api = 0 error → review keamanan (`bantuanku-security-review` bila menyentuh route/DB/webhook) → update dokumen → commit lokal. Satu fase selesai sebelum berikutnya. Tidak ada deploy sebelum Tahap Offline selesai dan ada persetujuan eksplisit.

### Tahap Offline

| Fase | Tujuan | File tersentuh | Migrasi | Verifikasi / kriteria selesai |
|---|---|---|---|---|
| **0** | Audit + keputusan | `scripts/audit/*` (siap), ADR-0016 | — | Hasil audit produksi dinilai; D3, D4, D5 terjawab; ADR → Accepted |
| **1** Fondasi | Skema, service posting, backfill dry-run | `packages/db/migrations/123_create_cash_book.sql`, `packages/db/src/schema/cash-book.ts`, `run-production-manifest.ts`, `apps/api/src/services/cash-book.ts`, `services/cash-book-backfill.ts`, uji `bun:test` | **123** (DB lokal) | Posting idempoten (2× = 0 baris baru); unit test alokasi komponen (cicilan, kode unik, kelebihan, qurban); backfill dry-run pada salinan data: Σ in = Σ verified, Σ out = Σ paid disbursement |
| **2** Hook posting | Pasang posting di setiap jalur bayar/cair + item bagi hasil selalu ditulis | `routes/transactions.ts`, `routes/payments.ts`, `routes/admin/qurban-savings.ts`, `services/disbursement.ts`, `routes/admin/zakat-distributions.ts`, jalur lain hasil grep | — | Pemeriksa rekonsiliasi = 0 (verified tanpa baris, paid tanpa baris) setelah uji manual semua jalur: transfer, QRIS, tiap gateway, tabungan qurban, input admin, pembatalan |
| **3** API baca (SELESAI lokal) | 5 laporan + review | `routes/admin/cashbook.ts`, `routes/admin/index.ts`, `services/revenue-share-ledger.ts`, `scripts/audit/parity.sql` | — | Paritas: tiap selisih terhadap laporan lama terjelaskan (kode unik, kelebihan, cicilan, dll.); uji batas WIB; paginasi server; `EXPLAIN` memakai indeks; review keamanan |
| **4** UI | Menu Keuangan + 5 halaman + 2 formulir | `apps/admin/src/app/dashboard/cashbook/**`, `components/cashbook/*`, `Sidebar.tsx` | — | Cek browser desktop+mobile; `check:colors` 0; ekspor Excel sama dengan layar |
| **5** Pembelajaran offline | Uji menyeluruh pada salinan data produksi; catat temuan | `docs/buku-kas-pelajaran.md`, `arsitektur-buku-kas.md` | — | Semua angka §12 lolos; daftar pelajaran, perbaikan data eksisting yang diperlukan, dan rencana produksi tertulis |

### Tahap Online (hanya setelah persetujuan eksplisit)

| Fase | Tujuan | Catatan |
|---|---|---|
| **6** Produksi | Migrasi 123, backfill sesuai D3, laporan baru berjalan berdampingan dengan laporan lama | Posting dapat dimatikan lewat settings `cashbook_posting_enabled`; laporan lama tetap utuh |
| **7** Pensiun | Sembunyikan → 410 → hapus laporan lama (`reports.ts`, `analytics.ts`, `export.ts`, `/dashboard/reports/*`) | Revert commit sebagai rollback |
| **8** (opsional) | Laporan publik dari buku kas; tampilan PSAK 109 | ADR terpisah |

Urutan dependensi: 0 → 1 → 2 → 3 → 4 → 5 → (persetujuan) → 6 → 7. Fase 3 dan 4 boleh tumpang tindih setelah kontrak API dibekukan.

### Status Fase 1 (2026-10-26, selesai di lokal)

| Item | Hasil |
|---|---|
| Migrasi `123_create_cash_book.sql` (+ manifest) dan schema `packages/db/src/schema/cash-book.ts` | terpasang di DB dev; tabel `cash_accounts`, `cash_entries`, indeks, UNIQUE `(ref_type, ref_id, component)` |
| Aturan murni `apps/api/src/services/cash-book-rules.ts` | `allocatePayment`, `fundForTransaction`, `fundForDisbursement`, `classifyAccount`, `normalizeAccountId` |
| Service `services/cash-book.ts` | `postVerifiedPayment`, `postPaidDisbursement`, `loadAccountCatalog`, `getOrCreateCashAccount` (idempoten) |
| Backfill `services/cash-book-backfill.ts` + `apps/api/scripts/cash-book-backfill.ts` (`npm run cashbook:backfill --`) | dry-run default (rollback), `--apply` untuk menulis; keluar kode 2 bila paritas tak 0 |
| Uji `bun test` (`cash-book-rules.test.ts`, `cash-book.test.ts`) | 15 lulus; paritas, idempoten (2× = 0 baris baru), dry-run tidak meninggalkan baris |
| Hasil dry-run DB dev | masuk 4.498.001 = Σ verified (selisih 0), keluar 100.000 = Σ paid (selisih 0); komponen: pokok 4.295.000, kode_unik 2.575, kelebihan 200.426 |



Menjalankan backfill (lokal):

```bash
set -a; source apps/api/.env; set +a
cd apps/api
npm run cashbook:backfill --            # dry-run: tampil laporan, tidak ada yang ditulis
npm run cashbook:backfill -- --apply    # menulis baris buku kas (idempoten; aman diulang)
```

### Status Fase 2 (2026-10-26, selesai di lokal)

Hook posting (semua lewat `safePost`, idempoten):

| Jalur | File | Pemicu |
|---|---|---|
| Approve pembayaran manual (transfer/QRIS) | `routes/transactions.ts` (`POST /:id/approve-payment`) | setelah pembayaran `pending`→`verified`, di dalam transaksi DB |
| Webhook gateway (Flip/iPaymu/Midtrans/Xendit) | `routes/payments.ts` | pembayaran sukses, di dalam transaksi DB |
| Verifikasi setoran tabungan qurban | `routes/admin/qurban-savings.ts` | setelah `verified` |
| Pencairan paid (status umum dan `markAsPaid`) | `services/disbursement.ts` | setelah status `paid` |
| Penyaluran zakat lama | `routes/admin/zakat-distributions.ts` | setelah baris pencairan `paid` dibuat |

Perubahan perilaku yang **perlu persetujuan sebelum deploy**: webhook gateway kini juga memanggil `RevenueShareService.calculateForPaidTransaction` (idempoten, pasca-commit, gagal tidak membatalkan webhook). Sebelumnya bagi hasil hanya dihitung di approve manual, sehingga transaksi yang dibayar lewat gateway tidak punya `revenue_shares` (dan komisi fundraiser/mitra tidak terhitung). Bagi hasil untuk transaksi lama yang terlewat BELUM dihitung ulang (keputusan terpisah).

Alat: `npm run cashbook:check` (rekonsiliasi read-only; keluar 2 bila ada pembayaran verified/pencairan paid yang belum masuk buku kas) dan `npm run cashbook:backfill`. Uji: 23 tes `bun` (aturan, backfill, hook posting, savepoint `safePost`) + uji end-to-end approve-payment di API lokal (Rp 25.665 → pokok 25.000 + kode unik 665 di akun BSI, dana campaign/sedekah; data uji dibersihkan).

Hook tambahan (D3): `PUT /transactions/:id` yang menyetel `paid` → pemasukan sintetis (§4.1b). Tidak dihook (sengaja): tabel legacy `qurban_payments`/`qurban_orders` (menunggu bagian 9 audit produksi) dan jalur lain yang memaksa `paid` tanpa pembayaran (ditutup backfill + `cashbook:check`).

### Status Fase 3 (2026-10-26, selesai di lokal)

API baca `apps/api/src/routes/admin/cashbook.ts` (mount `/admin/cashbook`, role `super_admin` + `admin_finance`) dengan logika di `services/cash-book-reports.ts`. Semua query: parameter terikat, enum whitelist, tanggal batas hari WIB, paginasi server, tanpa `sql.raw`.

| Endpoint | Laporan | Catatan |
|---|---|---|
| `GET /entries` | 1. Arus Kas | filter: `startDate,endDate,fund,accountId,method,gateway,direction,component,q,page,limit` (limit maks 200); mengembalikan `summary` (masuk/keluar/netto) dan `byComponent` |
| `GET /accounts` | 2. Sirkulasi Rekening | per akun kas (masuk, keluar, sirkulasi) + `gateways` (percobaan, berhasil, tertunda, gagal, total berhasil, tingkat berhasil dari SEMUA status pembayaran) + `peringatan` (zakat keluar dari rekening non-zakat) |
| `GET /funds` | 3. Dana per Sumber | per dana program: `masuk`, `hakPihakLain` (= `donation_amount − program_amount` dari `revenue_shares`), `disalurkan`, `sisa`, + rincian per jenis; `nonProgram` (bagi hasil/operasional/lainnya); `identitas.selisih` harus 0 |
| `GET /revenue-share`, `/revenue-share/:party/recipients`, `/revenue-share/:party/transactions` | 4. Bagi Hasil | pihak: `amil` (hak = amil_net, dipakai = pengeluaran operasional), `developer`, `mitra`, `fundraiser` (hak vs alokasi pada pencairan paid; status belum/sebagian/lunas) |
| `GET /programs` | 5. Rincian per Program | per produk (campaign/jenis zakat/paket qurban): masuk, hak, disalurkan (hanya campaign yang terpetakan), sisa |
| `GET /review` | Perlu ditinjau | belum diposting, akun belum dipetakan, kelebihan, pemasukan sintetis, paid tanpa bagi hasil (+ contoh) |

Alat paritas: `npm run cashbook:parity -- [mulai akhir]` menjelaskan **seluruh** selisih antara laporan lama dan buku kas sebagai identitas (non-tunai, kurang bayar, pokok non-paid, kode unik diterima, kelebihan; keluar: biaya transfer) dan keluar 2 bila tidak cocok. Hasil DB dev: masuk 4.498.001 dan keluar 100.000 terjelaskan penuh.

Uji: 31 tes `bun` (aturan, backfill, hook, laporan dengan pendekatan selisih + rollback, validasi input); uji manual API: tanggal/enum/pihak tak valid → 400, injeksi di `q` aman, `limit` diklamp 200, tanpa token 401.

Temuan: `/review` pada DB dev menunjukkan 2 transaksi campaign yang dibayar lewat Flip **tanpa bagi hasil** (Rp 400.000), bukti nyata bug webhook (diperbaiki di Fase 2 untuk transaksi baru).

### Status Fase 4 (2026-10-26, selesai di lokal)

UI admin di `apps/admin/src/app/dashboard/cashbook/` (menu sidebar **Keuangan**, role `super_admin` + `admin_finance`), semua membaca API Fase 3 tanpa menghitung ulang di klien:

| Halaman | Path | Isi |
|---|---|---|
| Arus Kas | `/dashboard/cashbook` | filter, kartu masuk/keluar, chip komponen, tabel, ekspor Excel, "Penyesuaian manual", aksi "Balik" |
| Sirkulasi Rekening | `/dashboard/cashbook/accounts` | per akun kas + blok per gateway |
| Dana per Sumber | `/dashboard/cashbook/funds` | masuk, hak pihak lain, disalurkan, sisa program |
| Bagi Hasil | `/dashboard/cashbook/revenue-share` | kartu pihak, drill penerima dan transaksi |
| Per Mitra | `/dashboard/cashbook/mitra` | hak, sudah ditransfer, belum per mitra; klik baris → rincian per transaksi + riwayat transfer. Komponen bersama `RecipientsReport` (2026-10-26) |
| Per Influencer | `/dashboard/cashbook/influencer` | sama dengan Per Mitra untuk influencer (nama dari donatur atau karyawan, plus kode). URL lama `/dashboard/reports/{mitra,fundraiser}` hanya me-redirect |
| Per Program | `/dashboard/cashbook/programs` | rincian per produk |
| Perlu Ditinjau | `/dashboard/cashbook/review` | anomali dan contoh |

API tambahan: `GET /admin/cashbook/revenue-share/:party/disbursements?recipientId=` (riwayat pencairan paid; hanya mitra/fundraiser). Per Mitra/Per Influencer memakai `/recipients` + `/transactions` + `/disbursements` (satu sumber dengan Bagi Hasil); endpoint lama `/admin/reports/{mitra,fundraiser}-{summary,detail}` tidak lagi dipakai UI dan dihapus di Fase 7.

Filter tanggal memakai `ReportFilters` dengan `allTimePreset` (tombol **Semua Waktu** mengosongkan tanggal = tanpa batas; API sudah menerima rentang kosong). Bawaan tetap bulan berjalan, jadi bandingkan dengan laporan lama (yang seluruh waktu) lewat Semua Waktu.

Pendukung: `lib/cashbook.ts` (label, rentang tanggal), `components/cashbook/CashbookLayoutNav.tsx`, `CorrectionDialogs.tsx` (`Modal`, bukan `confirm()`). Warna hanya token (`check:colors` 0).

Terverifikasi di browser: semua halaman tampil dan angkanya cocok dengan API; Penyesuaian manual lewat dialog berhasil. **Belum terverifikasi lewat UI: tombol "Balik"** (jalur API diuji `bun`: `cash-book-corrections.test.ts`). Data uji dev sudah dibersihkan.

### Status Fase 5: Metode Wajib (2026-10-26, selesai di lokal)

Keputusan pemilik produk: tidak boleh ada uang masuk tanpa metode pembayaran. Akun `unmapped` kini bernama **"Metode Lain"** dan hanya menampung **data lama**; pembayaran baru tidak bisa memilihnya (tidak ada opsi di UI, ditolak API dan database).

| Lapis | Implementasi |
|---|---|
| API | `paymentMethodError()` (`services/cash-book.ts`) menolak metode kosong, generik (`bank_transfer`, `transfer`, `manual`, `qris`) atau id yang tidak ada di settings. Dipakai di: `POST /transactions/:id/payments`, upload bukti bayar, `approve-payment`, `PUT /transactions/:id` ke `paid` (kecuali non-tunai/nominal 0), setoran tabungan qurban (buat + verifikasi), konfirmasi bayar WA bot. Semua fallback `"bank_transfer"` dihapus. |
| Database | Migrasi **124**: trigger `trg_payment_method_required` (pembayaran menjadi `verified`) dan `trg_transaction_method_required` (transaksi menjadi `paid`, kecuali non-tunai/nominal 0; transaksi gateway lolos bila catatan pembayarannya bergateway). Hanya berlaku pada peristiwa baru; baris lama tetap bisa di-reject/diubah. Metode valid: `gateway_code`, `bank-<angka>`/`qris-<angka>` (juga `bank_bank-…`), `flip|ipaymu|midtrans|xendit`, `cash`. |
| UI | Form setoran tabungan qurban: satu pilihan "Rekening / QRIS Tujuan" dari settings (tanpa "QRIS"/"Transfer" generik). Review buku kas menampilkan "Uang masuk Metode Lain (data lama)". |
| Uji | `cash-book-method.test.ts` (gerbang API + trigger, di transaksi yang di-rollback). |

Gap: pembayaran lama berstatus `pending` dengan metode generik tidak bisa diapprove sampai ditolak dan dimasukkan ulang dengan metode jelas; `PaymentModal` (modul ledger lama, D8) belum disentuh; pembayaran dari tabel legacy `qurban_savings_transactions` tidak diposting ke buku kas.

## 9. Keamanan dan izin

- Semua route `/admin/cashbook/*` di balik `authMiddleware` + `requireRole("super_admin","admin_finance")`; tulis (koreksi) hanya keduanya, **selalu** tercatat di `audit_logs` (siapa, kapan, nilai sebelum/sesudah).
- Input divalidasi Zod; semua query parameter terikat (template `sql`, **tanpa** `sql.raw` berisi nilai request); `limit`/`page` di-clamp; tanggal lewat helper WIB.
- Buku kas tidak menyimpan PII donatur (hanya `transaction_id`); detail donatur tetap lewat izin yang ada. Respons tidak membocorkan `webhook_payload`.
- Posting berjalan di dalam transaksi DB yang sama dengan perubahan status (atomik); endpoint webhook tetap memverifikasi signature sebelum posting (tidak diubah).
- Skrip audit: sesi read-only di tingkat server; tidak mencetak kredensial; keluaran bebas PII.
- Review keamanan wajib di Fase 1–3 (route, query DB, webhook).

## 10. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Jalur bayar/cair yang terlewat tidak diposting | satu fungsi posting + grep sistematis + pemeriksa rekonsiliasi harian + daftar "Perlu ditinjau" + uji manual per jalur |
| Angka baru berbeda dari laporan lama menimbulkan salah paham | laporan paritas yang menjelaskan tiap selisih sebelum laporan lama dimatikan; komunikasikan ke bendahara |
| Metode bayar tak terpetakan | akun `unmapped` yang ditandai + layar pemetaan |
| Disangka saldo bank | label jelas "sirkulasi di sistem, bukan saldo bank" |
| Anomali data lama (ganda, paid tanpa verified) | ganda/kelebihan dicatat sebagai pemasukan (D6); paid tanpa verified tampil informasi; perbaikan data eksisting menyusul |
| Skema DB berbeda antar lingkungan (drift) | migrasi aditif `IF NOT EXISTS`; uji pada salinan DB mirip produksi; audit memakai kolom yang ada di produksi |
| Performa laporan | agregasi SQL + indeks; tanpa paginasi di memori |

## 11. Keputusan

Dijawab pemilik produk 2026-10-26 (ringkas):

| ID | Keputusan | Status |
|---|---|---|
| D1 | Kode unik **dicatat sebagai pemasukan** | ✅ |
| D2 | Hak amil dan pihak lain **sesuai settings** (`revenue_shares`), **tidak boleh hardcode** | ✅ |
| D3 | Data lama: backfill seluruh riwayat (tanpa cut-off); transaksi **paid tanpa pembayaran terverifikasi dicatat sebagai uang masuk** (sintetis, berlabel, dibalik otomatis bila pembayaran asli muncul) — kelompok A produksi: 51 transaksi, Rp 320.231.250 | ✅ (kelompok A); sisa audit (bagian 4b–11) menunggu |
| D4 | Setiap gateway = akun kas; uang lewat gateway dianggap sudah masuk; **biaya ditanggung donatur**, tanpa pindah kas dan tanpa biaya gateway; laporan per gateway: percobaan/berhasil/tertunda/gagal + total masuk | ✅ |
| D5 | **Sisa tetap sisa program**: sisa = masuk − hak pihak lain − disalurkan; tanpa konsep saldo amil dari sisa | ✅ |
| D6 | Pembayaran ganda atau lebih bayar **menjadi pemasukan seperti kode unik** (komponen `kelebihan`) | ✅ |
| D7 | Qurban: **pokok = dana pembelian hewan**; **biaya admin = hak amil** yang dibagi sesuai peruntukan/pengaturan bagi hasil | ✅ |
| D8 | Ledger/COA dan sejenisnya **dibiarkan terpisah, dicatat untuk dihapus bertahap** (Register Penghapusan §6) | ✅ |
| D9 | **Tidak ada cut-off, saldo awal, atau rekonsiliasi bank**; yang dicatat hanya **sirkulasi uang**, hak amil/mitra/developer/influencer. **Dikerjakan offline dulu**, hasil belajar jadi bekal produksi | ✅ |

## 12. Kriteria sukses (uji penerimaan)

1. Σ `in` buku kas periode P = Σ pembayaran `verified` periode P (selisih 0).
2. Σ `out` buku kas periode P = Σ pencairan `paid` periode P + biaya tambahan.
3. Sirkulasi setiap akun kas = Σ in − Σ out (tanpa saldo awal; bukan saldo bank).
4. Identitas sirkulasi: Σ sisa dana program + Σ hak pihak lain (dibayar dan belum) + Σ keluar program = Σ masuk, per dana dan secara total.
5. Bagi Hasil: untuk setiap pihak, hak = Σ `revenue_shares` transaksi paid; dibayar = Σ item pada pencairan paid; sisa tampil dan cocok dengan saldo fundraiser/mitra.
6. Tidak ada pembayaran verified atau pencairan paid tanpa baris buku kas (pemeriksa rekonsiliasi = 0).
7. Laporan responsif pada ≥100.000 baris (waktu respon < 2 dtk dengan indeks).

## 13. Gap yang sengaja ditunda

- Format PSAK 109 (lapisan penyajian di atas buku kas, ADR terpisah).
- Re-source laporan publik web dari buku kas.
- Penghapusan `ledger_*`, `chart_of_accounts`, `bank_accounts`, dan endpoint legacy.
- Pencatatan biaya/pemotongan gateway dan pindah kas gateway → bank (sengaja tidak ada: biaya ditanggung donatur dan laporan resmi di luar aplikasi).
- Perbaikan data eksisting (paid tanpa pembayaran verified, `paid_amount` tak konsisten) setelah pelajaran offline.
