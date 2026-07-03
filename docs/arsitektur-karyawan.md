# Arsitektur Karyawan

## Ringkasan

Karyawan adalah master data internal untuk staf, relawan, koordinator, atau pihak operasional yang dapat dihubungkan ke akun user. Data rekening aktif karyawan tidak lagi mengandalkan kolom legacy di tabel `employees`, tetapi memakai `entity_bank_accounts` dengan `entityType = "employee"`.

Dokumen ini menggantikan `00-helper-employees.md` dan `02-helper-employee-modal.md`.

## Implementasi Terkait

| Area | File |
|------|------|
| Schema | `packages/db/src/schema/employee.ts` |
| Admin API | `apps/api/src/routes/admin/employees.ts` |
| Admin UI list/detail | `apps/admin/src/app/dashboard/master/employees/**` |
| Settings UI karyawan | `apps/admin/src/app/dashboard/settings/employees/page.tsx` |
| Bank account schema | `packages/db/src/schema/bank-accounts.ts` |

## Model Data

Tabel utama: `employees`.

| Area | Kolom penting |
|------|---------------|
| Identitas | `employeeId`, `name`, `position`, `department`, `employmentType` |
| Kontak | `email`, `phone`, `whatsappNumber`, `website` |
| Alamat | `detailAddress`, `provinceCode`, `regencyCode`, `districtCode`, `villageCode` |
| Darurat | `emergencyContact`, `emergencyPhone` |
| Employment | `joinDate`, `endDate`, `salary`, `allowance` |
| Legal | `taxId`, `nationalId` |
| Status | `isActive`, `notes` |
| User link | `userId` |
| Legacy bank | `bankName`, `bankAccount`, `bankAccountName` |

Rekening aktif disimpan di `entity_bank_accounts`:

| Kolom | Nilai untuk karyawan |
|-------|----------------------|
| `entityType` | `employee` |
| `entityId` | `employees.id` |
| `bankName`, `accountNumber`, `accountHolderName` | Data rekening |

## Endpoint

Base path: `/admin/employees`. Seluruh route memakai `requireAuth`.

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/` | Authenticated | List dengan pagination, search, department, status. |
| `GET` | `/:id` | Authenticated | Detail karyawan + rekening. |
| `POST` | `/` | `super_admin`, `admin_campaign` | Buat karyawan. |
| `PUT` | `/:id` | `super_admin`, `admin_campaign` | Update karyawan dan replace rekening bila dikirim. |
| `DELETE` | `/:id` | `super_admin`, `admin_campaign` | Hapus karyawan dan rekening terkait. |
| `POST` | `/from-donatur` | `super_admin`, `admin_campaign` | Buat karyawan dari data donatur. |
| `POST` | `/:id/activate-user` | `super_admin` | Buat/aktifkan akun user untuk karyawan. |
| `GET` | `/unactivated/list` | `super_admin` | List karyawan tanpa akun aktif. |
| `PUT` | `/:id/change-role` | `super_admin`, `admin_campaign` | Ubah role user karyawan. |

Detail aktivasi employee sebagai `program_coordinator`, scoped access campaign/laporan/disbursement, dan gap guard lintas modul dicatat di `arsitektur-program-coordinator.md`.

## Sinkronisasi Dengan Donatur dan User

Saat karyawan dibuat:

- jika email belum ada di `donatur`, sistem membuat record donatur baru dari data karyawan;
- jika dibuat dari donatur, data kontak, alamat, NIK/NPWP, userId, dan rekening disalin;
- jika karyawan memiliki `userId`, role `employee` ditambahkan ketika aktif dan dihapus ketika dinonaktifkan;
- saat update, data bersama juga disinkronkan ke `donatur` dan `users` bila terhubung lewat `userId`.

## Catatan Kritis

1. Kolom `bankName`, `bankAccount`, dan `bankAccountName` masih ada tetapi legacy. Sumber rekening baru adalah `entity_bank_accounts`.
2. `postalCode` diterima dari form alamat tetapi tidak disimpan di tabel `employees`; kode pos diambil dari data desa.
3. Beberapa response route employee masih memakai `c.json` langsung, bukan helper response standar.
4. Delete adalah hard delete pada `employees` dan rekening terkait, bukan soft delete.
5. `GET /admin/employees` tidak dibatasi role selain authenticated user di implementasi saat ini.
