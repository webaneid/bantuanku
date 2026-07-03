# Arsitektur Donatur Modal

Dokumen ini adalah source of truth untuk `DonorModal` di Admin Web. Komponen ini dipakai untuk membuat, mengubah, melihat ringkas, dan mengaktifkan akun login donatur dari beberapa halaman admin.

Dokumen ini menyerap dan mengoreksi `docs/01-helper-donor-modal.md`. Helper lama benar bahwa `DonorModal` memakai contact, address, dan bank account helper, tetapi klaim "web & admin" terlalu luas: implementasi modal ini hanya ada di Admin Web. Frontend web checkout membuat donatur lewat API public, bukan memakai `DonorModal`.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Modal admin | `apps/admin/src/components/modals/DonorModal.tsx` |
| Page donatur | `apps/admin/src/app/dashboard/donatur/page.tsx` |
| Transaksi manual | `apps/admin/src/app/dashboard/transactions/create/page.tsx` |
| Tabungan qurban admin | `apps/admin/src/app/dashboard/qurban/savings/page.tsx` |
| API admin donatur | `apps/api/src/routes/admin/donatur.ts` |
| API public donatur guest | `apps/api/src/routes/donatur.ts` |
| Schema donatur | `packages/db/src/schema/donatur.ts` |
| Rekening universal | `packages/db/src/schema/bank-accounts.ts` |
| Helper form | `ContactForm`, `AddressForm`, `BankAccountForm` |

## Komponen

`DonorModal` menerima props:

| Prop | Fungsi |
|------|--------|
| `isOpen` | Menentukan modal tampil/tidak |
| `onClose` | Handler tutup modal |
| `onSuccess(createdId?: string)` | Callback setelah create/update/activate berhasil |
| `donatur` | Data edit; `null/undefined` berarti create mode |
| `isViewMode` | Mode baca saja; form disabled dan tombol submit disembunyikan |
| `zIndex` | Override z-index untuk modal bertumpuk, dipakai di qurban savings |

Mode:

| Mode | Kondisi | Perilaku |
|------|---------|----------|
| Create | `donatur` kosong | POST `/admin/donatur` |
| Edit | `donatur` ada | PUT `/admin/donatur/:id` |
| View | `isViewMode=true` | Field disabled, tidak ada submit |
| Activate user | `donatur` ada dan `donatur.userId` kosong | POST `/admin/donatur/:id/activate-user` |
| Change password | `donatur.userId` ada | PUT `/admin/donatur/:id` dengan `password` jika diisi |

## Struktur Form

`DonorModal` terdiri dari beberapa section:

| Section | Field/Komponen |
|---------|----------------|
| Informasi Dasar | `name`, `jobTitleId`, `incomeRangeId` |
| Data Pribadi | `nik`, `npwp`, `birthPlace`, `birthDate`, `gender` |
| Informasi Kontak | `ContactForm` untuk `email`, `phone`, `whatsappNumber`, `website` |
| Alamat | `AddressForm` untuk `detailAddress`, kode wilayah, dan `postalCode` derived |
| Rekening Bank | `BankAccountForm` untuk array rekening |
| Akun Login | Activate user atau change password |

Lookup:

| Data | Query |
|------|-------|
| Pekerjaan | `GET /jobs/categories` |
| Penghasilan | `GET /income-ranges` |
| Alamat | Hooks dari `use-indonesia-address.ts` |

Feedback memakai `FeedbackDialog`, bukan toast.

## Payload Admin

Sebelum submit, contact data dinormalisasi oleh `normalizeContactData()`:

| Field | Normalisasi |
|-------|-------------|
| `email` | lowercase |
| `phone` | format lokal `08...` |
| `whatsappNumber` | format lokal `08...` |
| `website` | tambah `https://` jika belum ada protocol |

Payload create/update:

```text
formData
  + normalizedContact
  + addressFormData
  + bankAccountsFormData
  + password jika edit dan field password diisi
```

`postalCode` boleh ikut dari `AddressForm`, tetapi API admin memisahkannya dan tidak menyimpan ke tabel `donatur`.

## API Admin

Mounted di `/v1/admin/donatur`.

| Endpoint | Role | Fungsi |
|----------|------|--------|
| `GET /` | staff/admin route parent | List paginated + search |
| `GET /:id` | staff/admin route parent | Detail donatur |
| `POST /` | `super_admin`, `admin_campaign` | Buat donatur |
| `PUT /:id` | `super_admin`, `admin_campaign` | Update donatur |
| `DELETE /:id` | `super_admin` | Hapus donatur jika belum punya transaksi |
| `GET /:id/donations` | staff/admin route parent | Riwayat transaksi by email |
| `POST /:id/activate-user` | `super_admin` | Buat akun `users` dan assign role `user` |

List/detail melakukan join ke:

- `indonesia_provinces`, `indonesia_regencies`, `indonesia_districts`, `indonesia_villages`
- `job_titles`, `job_categories`
- `income_ranges`
- `entity_bank_accounts` dengan `entityType = "donatur"`

## Rekening Donatur

Rekening donatur tidak disimpan di tabel `donatur`. Rekening memakai tabel universal `entity_bank_accounts`.

| Field | Nilai untuk donatur |
|-------|---------------------|
| `entityType` | `"donatur"` |
| `entityId` | `donatur.id` |
| `bankName` | Nama bank |
| `accountNumber` | Nomor rekening |
| `accountHolderName` | Nama pemilik rekening |

Pada update admin, API melakukan replace penuh:

```text
if bankAccounts !== undefined:
  delete semua rekening entityType=donatur + entityId=id
  insert ulang array bankAccounts jika ada
```

Catatan: dokumen lama dan kode API memakai `entityType = "donatur"`. Jika ada dokumen lain menyebut `"donor"`, itu tidak sesuai implementasi aktual.

## Akun Login Donatur

Donatur bisa berdiri sendiri tanpa akun login (`userId = null`), atau terhubung ke tabel `users`.

Aktivasi akun login:

```text
POST /admin/donatur/:id/activate-user
  -> validasi password minimal 8
  -> cek donatur belum punya userId
  -> cek email belum dipakai users
  -> cari role slug "user"
  -> create users
  -> insert user_roles
  -> update donatur.userId
```

Update password dari modal hanya efektif untuk donatur yang sudah punya `userId`. API menyimpan hash ke `donatur.passwordHash`, lalu jika `userId` ada, sinkron ke `users.passwordHash`.

## Pemakai Aktual

| Pemakai | Pola |
|---------|------|
| `dashboard/donatur/page.tsx` | Create/edit donatur dari halaman master donatur |
| `dashboard/transactions/create/page.tsx` | Create donatur cepat saat membuat transaksi manual; menerima `createdId` dan set donorId |
| `dashboard/qurban/savings/page.tsx` | Create donatur dari modal bertumpuk saat membuat tabungan qurban |

Tidak ditemukan pemakaian `DonorModal` di frontend web.

## Guest Checkout Web

Checkout web tidak memakai `DonorModal`.

Alur aktual:

```text
Checkout web
  -> buat transaksi per item via POST /v1/transactions
  -> jika donaturId belum ada:
       POST /v1/donatur
       { name, email, phone, whatsappNumber }
```

Public API `/v1/donatur` hanya mendukung field dasar: `name`, `email`, `phone`, `whatsappNumber`, `password`. Tidak mengelola alamat, pekerjaan, penghasilan, personal data, atau rekening.

## Gap dan Rekomendasi

1. **Fix `BankAccountForm` state di edit mode.** `DonorModal` selalu mengirim `bankAccounts: bankAccountsFormData`, sementara `bankAccountsFormData` default `[]` dan `BankAccountForm` tidak memanggil `onChange` saat mount. Edit donatur tanpa menyentuh rekening berisiko menghapus semua rekening.
2. **Fix callback qurban savings.** `DonorModal.onSuccess` mengirim `createdId?: string`, tetapi `qurban/savings/page.tsx` memperlakukan argumen sebagai object donor (`donor.id`, `donor.name`). Ini harus diselaraskan: callback menerima ID lalu refetch, atau modal mengirim object lengkap.
3. **Tambahkan validasi frontend phone.** API admin create mewajibkan `phone` minimal 10, tetapi `ContactForm` hanya memberi label required pada email. Validasi phone sebaiknya jelas di UI jika `required=true`.
4. **Rapikan password create mode.** Schema admin menerima `password` saat create, tetapi UI create mode tidak menampilkan field password. Saat ini akun login lebih jelas dibuat lewat activate-user setelah donatur ada.
5. **Kurangi debug log.** API admin donatur masih `console.log` validation/body create. Ini sebaiknya dihapus atau diganti structured debug yang aman.
6. **Samakan query invalidation.** Page donatur invalidate `["donatur"]`; transaksi manual invalidate `["donatur-list"]`. Pastikan query key sesuai source list yang dipakai.
7. **Dokumentasi arsitektur donatur perlu diselaraskan.** Source of truth rekening adalah `entityType = "donatur"`, bukan `"donor"`.
8. **Pertimbangkan create response lebih kaya.** Untuk pemakai modal nested, response object `{ id, name, email, phone }` akan mengurangi kebutuhan refetch setelah create.

## Keputusan Arsitektur Saat Ini

- `DonorModal` adalah komponen Admin Web, bukan komponen frontend web.
- Modal menggabungkan helper `ContactForm`, `AddressForm`, dan `BankAccountForm`.
- Rekening memakai `entity_bank_accounts` dengan `entityType = "donatur"`.
- Alamat memakai Indonesia Address System; `postalCode` tidak disimpan di donatur.
- Donatur bisa tanpa akun login; akun login dibuat terpisah melalui activate-user.
- Guest checkout tetap memakai API public, bukan modal admin.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `docs/01-helper-donor-modal.md` | Diserap dan dikoreksi di dokumen ini; sudah dihapus |
