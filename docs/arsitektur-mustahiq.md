# Arsitektur Mustahiq

## Ringkasan

Mustahiq adalah master data penerima manfaat zakat. Data ini dipakai terutama oleh modul distribusi zakat, tetapi juga membawa profil sosial-ekonomi, alamat Indonesia, dan rekening penerima.

## Implementasi Terkait

| Area | File |
|------|------|
| Schema | `packages/db/src/schema/mustahiq.ts` |
| Admin API | `apps/api/src/routes/admin/mustahiqs.ts` |
| Admin UI | `apps/admin/src/app/dashboard/master/mustahiqs/**` |
| Distribusi zakat | `packages/db/src/schema/zakat-distributions.ts` |
| Job title | `packages/db/src/schema/job-categories.ts` |
| Income range | `packages/db/src/schema/income-ranges.ts` |
| Bank account schema | `packages/db/src/schema/bank-accounts.ts` |

## Model Data

Tabel utama: `mustahiqs`.

| Area | Kolom penting |
|------|---------------|
| Identitas | `name`, `mustahiqId` |
| Asnaf | `asnafCategory` wajib |
| Kontak | `email`, `phone`, `whatsappNumber`, `website` |
| Alamat | `provinceCode`, `regencyCode`, `districtCode`, `villageCode`, `detailAddress` |
| Legacy alamat | `address` |
| Personal | `nationalId`, `dateOfBirth`, `birthPlace`, `gender`, `motherName`, `maritalStatus`, `dependents` |
| Sosial-ekonomi | `jobTitleId`, `incomeRangeId` |
| Legacy bank | `bankName`, `bankAccount`, `bankAccountName` |
| Status | `isActive`, `notes` |

Kategori asnaf tidak dibuat sebagai enum DB. Validasi API hanya memastikan `asnafCategory` tidak kosong.

Rekening aktif mustahiq disimpan di `entity_bank_accounts`:

| Kolom | Nilai untuk mustahiq |
|-------|----------------------|
| `entityType` | `mustahiq` |
| `entityId` | `mustahiqs.id` |
| `bankName`, `accountNumber`, `accountHolderName` | Data rekening |

## Endpoint

Base path: `/admin/mustahiqs`.

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/` | Tidak ada guard role eksplisit di route file | List dengan pagination, search, asnafCategory, status. |
| `GET` | `/:id` | Tidak ada guard role eksplisit di route file | Detail mustahiq + relasi wilayah/job/income/rekening. |
| `POST` | `/` | `super_admin`, `admin_campaign` | Buat mustahiq. |
| `PUT` | `/:id` | `super_admin`, `admin_campaign` | Update mustahiq dan replace rekening bila dikirim. |
| `DELETE` | `/:id` | `super_admin`, `admin_campaign` | Hapus mustahiq dan rekening terkait. |

## Relasi Dengan Zakat

`mustahiqs` direlasikan ke `zakatDistributions`. Distribusi zakat menyimpan referensi mustahiq untuk pencatatan penyaluran dana zakat per kategori asnaf.

## Catatan Kritis

1. `asnafCategory` wajib tetapi belum dibatasi enum di schema/API. UI harus menjaga nilai agar tetap salah satu 8 asnaf.
2. List mustahiq memakai `or(...conditions)` ketika banyak filter, sehingga `search + asnafCategory + status` berlaku OR, bukan AND. Ini harus diperhatikan sebelum mengandalkan filter sebagai query presisi.
3. Kolom bank dan alamat legacy masih ada, tetapi rekening baru memakai `entity_bank_accounts`.
4. Delete mustahiq adalah hard delete dan menghapus rekening terkait.
5. Beberapa response masih memakai `c.json` langsung.
