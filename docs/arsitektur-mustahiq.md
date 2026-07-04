# Arsitektur Mustahiq

> Terakhir di-sync: 2026-07-03

## Ringkasan

Mustahiq adalah master data penerima manfaat zakat. Data ini dipakai terutama oleh modul distribusi zakat, tetapi juga membawa profil sosial-ekonomi, alamat Indonesia, dan rekening penerima. Mustahiq juga bisa menjadi penerima disbursement langsung.

---

## Implementasi Terkait

| Area | File |
|------|------|
| Schema | `packages/db/src/schema/mustahiq.ts` |
| Admin API CRUD | `apps/api/src/routes/admin/mustahiqs.ts` |
| Admin API Statistik | `apps/api/src/routes/admin/statistics.ts` (baris 220–336) |
| Admin UI List & Detail | `apps/admin/src/app/dashboard/master/mustahiqs/**` |
| Admin UI Statistik | `apps/admin/src/app/dashboard/statistics/mustahiq/page.tsx` |
| Modal Form | `apps/admin/src/components/modals/MustahiqModal.tsx` |
| Distribusi zakat | `packages/db/src/schema/zakat-distributions.ts` |
| Disbursement | `packages/db/src/schema/disbursements.ts` (`recipientType = "mustahiq"`) |
| Job title | `packages/db/src/schema/job-categories.ts` |
| Income range | `packages/db/src/schema/income-ranges.ts` |
| Entity bank accounts | `packages/db/src/schema/entity-bank-accounts.ts` |

---

## Model Data

Tabel utama: `mustahiqs`.

| Area | Kolom |
|------|-------|
| Identitas | `name`, `mustahiqId` |
| Asnaf | `asnafCategory` (wajib) |
| Kontak | `email`, `phone`, `whatsappNumber`, `website` |
| Alamat | `provinceCode`, `regencyCode`, `districtCode`, `villageCode`, `detailAddress` |
| Alamat legacy | `address` — **DEPRECATED**, belum dihapus, tidak diisi di data baru |
| Personal | `nationalId`, `dateOfBirth`, `birthPlace`, `gender`, `motherName`, `maritalStatus`, `dependents` |
| Sosial-ekonomi | `jobTitleId` FK job_categories, `incomeRangeId` FK income_ranges |
| Bank legacy | `bankName`, `bankAccount`, `bankAccountName` — legacy, data baru pakai `entity_bank_accounts` |
| Status | `isActive`, `notes` |
| Timestamps | `createdAt`, `updatedAt` |

Kategori asnaf tidak dibuat sebagai enum DB — hanya divalidasi tidak kosong di API. UI bertanggung jawab memastikan nilai adalah salah satu dari 8 asnaf yang valid.

### Rekening Bank

Rekening aktif mustahiq disimpan di `entity_bank_accounts`:

| Kolom | Nilai untuk mustahiq |
|-------|----------------------|
| `entityType` | `"mustahiq"` |
| `entityId` | `mustahiqs.id` |
| `bankName`, `accountNumber`, `accountHolderName` | Data rekening |

Response list (`GET /`) **sudah menyertakan `bankAccounts[]`** untuk setiap mustahiq — bukan hanya di endpoint detail.

---

## Endpoint

### CRUD (`/admin/mustahiqs`)

Access control: semua endpoint dilindungi `staffOnly` middleware di `apps/api/src/index.ts` (bukan di route file). GET endpoints bisa diakses semua role staff; POST/PUT/DELETE mensyaratkan `super_admin` atau `admin_campaign`.

| Method | Path | Role Tambahan | Fungsi |
|--------|------|---------------|--------|
| `GET` | `/` | — | List + pagination, search (name/mustahiqId/phone/email), filter asnafCategory, filter isActive |
| `GET` | `/:id` | — | Detail mustahiq + relasi wilayah/job/income/rekening |
| `POST` | `/` | `super_admin`, `admin_campaign` | Buat mustahiq baru |
| `PUT` | `/:id` | `super_admin`, `admin_campaign` | Update mustahiq; jika `bankAccounts[]` dikirim → replace semua rekening |
| `DELETE` | `/:id` | `super_admin`, `admin_campaign` | Hard delete mustahiq + hapus semua rekening terkait |

Kontak (`phone`, `whatsappNumber`) dinormalisasi via `normalizeContactData()` sebelum disimpan.

### Statistik (`/admin/statistics/mustahiq`)

Role: `super_admin`, `admin_finance`, `admin_campaign`.

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/admin/statistics/mustahiq` | KPI: `totalMustahiq`, `mustahiqBeneficiary`; breakdown: `asnafStats`, `provinceStats`, `genderStats` |
| `GET` | `/admin/statistics/mustahiq/export` | Export CSV semua mustahiq, filter `startDate`/`endDate` |

CSV export mencakup: mustahiqId, name, asnafCategory, nationalId, gender, birthPlace, dateOfBirth, motherName, maritalStatus, dependents, jobTitleName, jobCategoryName, incomeRangeLabel, email, phone, whatsappNumber, website, provinceName, **regencyName**, **districtName**, **villageName**, detailAddress, bankName, bankAccount, bankAccountName, notes, isActive, createdAt.

Rekening bank di export: prioritas `entity_bank_accounts` (rekening pertama per mustahiq), fallback ke kolom legacy `bankName/bankAccount/bankAccountName` di tabel mustahiqs jika tidak ada data di entity_bank_accounts.

---

## Relasi Dengan Modul Lain

### Zakat Distributions

`zakatDistributions.mustahiqId` menyimpan referensi ke `mustahiqs.id`. Distribusi zakat mencatat penyaluran dana per mustahiq per kategori asnaf.

> **Gap integritas referensial**: kolom `mustahiqId` di `zakat_distributions` adalah plain `text` tanpa FK constraint ke `mustahiqs`. Jika mustahiq dihapus, baris distribusi historis tetap ada dengan `mustahiqId` yang tidak bisa di-resolve (orphan). Tidak ada delete guard di API saat ini.

### Disbursement

`disbursements.recipientType = "mustahiq"` adalah nilai yang valid — mustahiq bisa menjadi penerima disbursement langsung (misal: penyaluran dana tunai langsung ke rekening mustahiq). Detail alur: lihat `arsitektur-disbursement.md`.

### Qurban Executions

Saat eksekusi qurban, daftar penerima mustahiq disimpan di `qurbanExecutions.recipientList` sebagai JSON string — **bukan FK ke tabel mustahiqs**. Ini loose coupling: nama mustahiq dicatat tapi tidak dapat di-trace ke record mustahiq.

---

## Halaman Admin

| Route | Fungsi |
|-------|--------|
| `/dashboard/master/mustahiqs` | List mustahiq, search, filter, create via `MustahiqModal` |
| `/dashboard/master/mustahiqs/[id]` | Detail mustahiq + riwayat distribusi zakat terkait |
| `/dashboard/statistics/mustahiq` | KPI, pie chart asnaf & gender, bar chart provinsi (top 20), export CSV |

---

## Catatan Kritis

1. `asnafCategory` wajib tetapi **tidak dibatasi enum** di schema/API — UI harus menjaga nilainya tetap salah satu dari 8 asnaf.

2. Filter antar kondisi (`search`, `asnafCategory`, `status`) menggunakan **AND** — sudah diperbaiki. Search internal (`name` OR `mustahiqId` OR `phone` OR `email`) tetap OR seperti yang diharapkan.

3. Kolom bank legacy (`bankName`, `bankAccount`, `bankAccountName`) dan `address` legacy masih ada di schema. Data baru harus selalu menggunakan `entity_bank_accounts` dan kolom alamat terstruktur.

4. Delete mustahiq adalah **hard delete** — menghapus mustahiq dan semua rekenningnya. Ada **delete guard**: jika mustahiq sudah punya riwayat distribusi zakat, delete diblokir dengan pesan error. Admin disarankan nonaktifkan (`isActive = false`) jika tidak lagi digunakan.

5. GET endpoints tidak punya guard role di route file, tapi tetap terlindungi oleh `staffOnly` middleware dari `index.ts` — tidak bisa diakses publik.

---

## Gap Implementasi

| Gap | Risiko | Prioritas | Status |
|-----|--------|-----------|--------|
| ~~Tidak ada delete guard untuk mustahiq yang sudah punya distribusi~~ | Orphan data distribusi historis | P2 | ✅ Diperbaiki 2026-07-03 |
| ~~FK constraint `mustahiqId` di `zakat_distributions` tidak ada~~ | Orphan jika mustahiq terhapus | P2 | ✅ Diperbaiki via migration 115 |
| ~~Filter list menggunakan OR antar kondisi~~ | Query multi-filter tidak presisi | P3 | ✅ Diperbaiki 2026-07-03 |
| ~~Export CSV hanya sertakan provinceName, bukan alamat lengkap~~ | Data alamat tidak lengkap di laporan | P2 | ✅ Diperbaiki 2026-07-04 |
| ~~Export CSV tidak sertakan website dan rekening dari entity_bank_accounts~~ | Data rekening baru (non-legacy) tidak masuk export | P2 | ✅ Diperbaiki 2026-07-04 |
| Kolom `address` legacy belum di-migrate/dihapus | Schema bloat | P3 | Open |
| Qurban executions menyimpan mustahiq sebagai JSON bukan FK | Tidak bisa trace penerima qurban ke profil mustahiq | P3 | Open |
