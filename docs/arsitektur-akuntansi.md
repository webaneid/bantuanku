# Arsitektur Akuntansi

## Ringkasan

Akuntansi di Bantuanku memiliki dua lapisan yang coexist:

1. Chart of Accounts dan double-entry journal: `chart_of_accounts`, `ledger_entries`, `ledger_lines`.
2. Workflow pengeluaran legacy-operasional: tabel `ledger`, tetapi endpoint `/admin/ledger` sudah deprecated dan selalu mengembalikan HTTP 410.

Untuk pencairan dan laporan operasional modern, sumber utama adalah `transactions`, `disbursements`, dan `revenue_shares`. Double-entry dipakai oleh service ledger untuk jurnal akuntansi ketika dipanggil.

> Detail skema dan kalkulasi `revenue_shares`: lihat `arsitektur-revenue-share.md`.

## Implementasi Terkait

| Area | File |
|------|------|
| COA schema | `packages/db/src/schema/coa.ts` |
| Journal schema | `packages/db/src/schema/accounting.ts` |
| Legacy ledger schema | `packages/db/src/schema/ledger.ts` |
| COA API | `apps/api/src/routes/admin/coa.ts` |
| Ledger category API | `apps/api/src/routes/admin/ledger-categories.ts` |
| Deprecated ledger API | `apps/api/src/routes/admin/ledger.ts` |
| Ledger service | `apps/api/src/services/ledger.ts` |
| COA UI | `apps/admin/src/app/dashboard/ledger/coa/page.tsx` |
| Liability migration script lama | `packages/db/src/migrations/migrate-to-liability-model.ts` |

## Chart of Accounts

Tabel: `chart_of_accounts`.

| Kolom | Catatan |
|-------|---------|
| `code` | Unik. |
| `name` | Nama akun. |
| `type` | `asset`, `liability`, `equity`, `income`, `expense`. |
| `category` | Klasifikasi tambahan. |
| `normalBalance` | `debit` atau `credit`. |
| `parentId`, `level` | Struktur hierarki. |
| `isActive` | Delete API melakukan soft delete menjadi inactive. |
| `isSystem` | Akun sistem tidak boleh dihapus dan update-nya dibatasi. |

Normal balance divalidasi:

- `asset`, `expense` harus `debit`;
- `liability`, `equity`, `income` harus `credit`.

Endpoint COA:

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/admin/coa` | List COA dengan filter type/category/active/level/search. |
| `GET` | `/admin/coa/tree` | Tree COA aktif. |
| `GET` | `/admin/coa/:id` | Detail COA. |
| `POST` | `/admin/coa` | Buat akun. |
| `PATCH` | `/admin/coa/:id` | Update akun. |
| `DELETE` | `/admin/coa/:id` | Soft delete akun non-system tanpa child. |

## Double-Entry Journal

Tabel:

- `ledger_entries`: header jurnal.
- `ledger_lines`: baris debit/kredit.

`createLedgerEntry()` memastikan total debit sama dengan total credit. Jika tidak balance, service melempar error.

Fungsi service penting:

| Fungsi | Kegunaan |
|--------|----------|
| `createLedgerEntry` | Membuat journal entry generic. |
| `createDonationLedgerEntry` | Jurnal penerimaan donasi. |
| `createDisbursementLedgerEntry` | Jurnal pencairan/pengeluaran. |
| `getAccountBalance` | Hitung saldo akun dari `ledger_lines`. |

Mapping default:

- bank/payment gateway: kode `6206`;
- income default: kode `4300`;
- kategori `qurban_admin_fee`, `wakaf`, dan `fidyah` punya mapping income khusus.

Catatan penting: service ledger aktif saat ini bukan liability model murni. `createDonationLedgerEntry()` melakukan debit ke `6206` dan credit ke akun income, default `4300`. `createDisbursementLedgerEntry()` juga memakai akun hasil `mapCategoryToIncomeAccount()` sebagai sisi debit lalu credit ke `6206`. Jadi klaim lama bahwa kode runtime sudah sepenuhnya memakai `2010` sebagai titipan dana tidak sesuai dengan implementasi aktif.

## Liability Model Migration Lama

Ada script historis:

```bash
npm run migrate:liability -- migrate
```

File: `packages/db/src/migrations/migrate-to-liability-model.ts`.

Tujuan script tersebut adalah memindahkan histori journal lama dari model income/expense ke model liability:

| Akun Lama | Akun Baru |
|-----------|-----------|
| `1010` Kas legacy | `1020` Bank Operasional |
| `4010` Pendapatan Donasi | `2010` Titipan Dana Campaign |
| `5010` Beban Program | `2010` Titipan Dana Campaign |

Jurnal yang ditargetkan script:

| Peristiwa | Debit | Credit |
|-----------|-------|--------|
| Donasi masuk | `1020` Bank Operasional | `2010` Titipan Dana Campaign |
| Penyaluran | `2010` Titipan Dana Campaign | `1020` Bank Operasional |

Fitur script:

- cek `DATABASE_URL`;
- cek akun legacy `1010`, `4010`, `5010`;
- cek akun target `1010`, `1020`, `2010`;
- update `ledger_lines.account_id`;
- verifikasi total debit = total credit;
- menandai akun legacy dengan suffix `(LEGACY - DO NOT USE)`;
- rollback tidak benar-benar diimplementasikan dan rekomendasi aman tetap restore dari backup.

Namun status implementasi aktual harus dibaca kritis:

1. Script ini tidak ada di production migration manifest `packages/db/scripts/run-production-manifest.ts`.
2. Script memakai SQL raw ke tabel `ledger_accounts`, sementara schema Drizzle aktif mengekspor `ledgerAccounts` sebagai alias ke `chart_of_accounts`. Ini indikasi kuat bahwa script berasal dari fase migrasi lama dan perlu diuji ulang sebelum dipakai.
3. Seed COA aktif hanya membuat akun `6201` sampai `6210` dan `4300` sampai `4312`, bukan `2010` atau `1020`.
4. Laporan modern seperti cash-flow dan liability balance banyak membaca `transactions` dan `disbursements`, bukan hanya `ledger_entries`/`ledger_lines`.
5. Endpoint `/admin/reports/account-balance/:code` sudah deprecated dengan HTTP 410.

Kesimpulan arsitektur: liability model adalah arah konseptual untuk dana titipan, tetapi implementasi runtime sekarang masih hybrid. Source of truth operasional laporan modern adalah `transactions`, `disbursements`, dan sebagian COA minimal `620x/43xx`; script liability lama tidak boleh dijalankan di production tanpa audit DB aktual, backup, dan dry-run manual.

## Ledger Categories

Endpoint `/admin/ledger/categories` masih aktif walaupun route `/admin/ledger` deprecated. Endpoint ini memberi kategori income/expense untuk sistem disbursement baru.

| Path | Fungsi |
|------|--------|
| `/admin/ledger/categories` | Income dan expense grouped. |
| `/admin/ledger/categories/income` | Income categories. |
| `/admin/ledger/categories/expense` | Expense categories. |
| `/admin/ledger/categories/flat` | Flat array kategori. |

Role: `super_admin`, `admin_finance`.

## Legacy Ledger

Tabel `ledger` masih ada dan punya relasi ke campaign, vendor, employee, user, evidence, dan COA. Namun route `/admin/ledger` memasang middleware global yang langsung return HTTP 410:

`Legacy ledger endpoint is deprecated. Use /admin/disbursements and /admin/reports endpoints (universal transactions + disbursements).`

Artinya dokumentasi baru tidak boleh mengarahkan workflow pengeluaran baru ke `/admin/ledger`.

## Catatan Kritis

1. Jangan menyamakan tabel `ledger` dengan double-entry journal. Journal aktual adalah `ledger_entries` dan `ledger_lines`.
2. `/admin/ledger` sudah deprecated secara runtime walaupun kode handler lama masih tersisa di bawah middleware 410.
3. COA API belum memakai `requireRole` eksplisit di file route, sehingga keamanan bergantung pada mounting/middleware parent bila ada.
4. Delete COA bukan hard delete; hanya set `isActive = false`.
5. Laporan finansial modern banyak membaca `transactions` dan `disbursements`, bukan hanya `ledger_entries`.
6. Liability migration lama belum selaras dengan seed COA dan service ledger aktif; jangan jadikan root summary lama sebagai SOP.
