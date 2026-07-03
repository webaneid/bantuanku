# Arsitektur Vendor

## Ringkasan

Vendor adalah master data penyedia barang/jasa untuk kebutuhan operasional, program, qurban, dan pengeluaran. Vendor dapat dipilih dalam workflow pengeluaran, tetapi bukan akun login dan tidak memiliki lifecycle verifikasi seperti mitra.

Dokumen ini menggantikan `00-helper-vendors.md` dan `00-helper-vendors-usage-example.md`.

## Implementasi Terkait

| Area | File |
|------|------|
| Schema | `packages/db/src/schema/vendor.ts` |
| Admin API | `apps/api/src/routes/admin/vendors.ts` |
| Admin UI | `apps/admin/src/app/dashboard/master/vendors/page.tsx` |
| Bank account schema | `packages/db/src/schema/bank-accounts.ts` |
| Relasi pengeluaran legacy | `packages/db/src/schema/ledger.ts` |

## Model Data

Tabel utama: `vendors`.

| Area | Kolom penting |
|------|---------------|
| Identitas | `name`, `type`, `category` |
| Kontak | `contactPerson`, `email`, `phone`, `whatsappNumber`, `website` |
| Alamat | `detailAddress`, `provinceCode`, `regencyCode`, `districtCode`, `villageCode` |
| Legacy alamat | `address` |
| Legal | `taxId`, `businessLicense` |
| Status | `isActive`, `notes` |
| Legacy bank | `bankName`, `bankAccount`, `bankAccountName` |

Rekening aktif vendor disimpan di `entity_bank_accounts`:

| Kolom | Nilai untuk vendor |
|-------|--------------------|
| `entityType` | `vendor` |
| `entityId` | `vendors.id` |
| `bankName`, `accountNumber`, `accountHolderName` | Data rekening |

## Endpoint

Base path: `/admin/vendors`.

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/` | Tidak ada guard role eksplisit di route file | List dengan pagination, search, type, status. |
| `GET` | `/:id` | Tidak ada guard role eksplisit di route file | Detail vendor + rekening. |
| `POST` | `/` | `super_admin`, `admin_campaign` | Buat vendor. |
| `PUT` | `/:id` | `super_admin`, `admin_campaign` | Update vendor dan replace rekening bila dikirim. |
| `DELETE` | `/:id` | `super_admin`, `admin_campaign` | Hapus vendor dan rekening terkait. |

## Filter dan Select Option

List vendor mendukung:

- `page`, `limit`,
- `search` pada nama, PIC, email,
- `type`,
- `status=active|inactive`.

Pola helper lama yang mengambil `/admin/vendors?status=active&type=supplier` masih sesuai sebagai penggunaan, tetapi bukan dokumentasi arsitektur utama.

## Catatan Kritis

1. Vendor bukan mitra. Vendor tidak punya `userId`, status verifikasi, public profile, atau ownership program.
2. Kolom bank dan alamat legacy masih ada untuk kompatibilitas, tetapi rekening baru memakai `entity_bank_accounts`.
3. Delete vendor adalah hard delete dan juga menghapus rekening vendor.
4. Count list vendor saat ini memakai fetch seluruh row lalu `length`, bukan `count(*)`.
5. Beberapa response vendor masih memakai `c.json` langsung.
