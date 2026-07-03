# Arsitektur Alamat Indonesia

Dokumen ini adalah source of truth untuk sistem alamat Indonesia di Bantuanku: tabel referensi wilayah, endpoint lookup, form cascading di Admin Web, dan cara modul domain menyimpan kode wilayah.

Dokumen ini menyerap dan mengoreksi `docs/00-helper-alamat.md` dan root `00-helper-address-system.md`. Beberapa contoh lama memakai kode bertitik, mengklaim kode pos lengkap, dan menyatakan semua endpoint address butuh auth admin. Implementasi aktual memakai kode compact dari `idn-area-data`, seed saat ini mengisi `postalCode` village dengan `null`, dan ada endpoint public `/v1/address` serta `/v1/indonesia`.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Tabel referensi wilayah | `packages/db/src/schema/indonesia-*.ts` |
| Migration tabel wilayah | `packages/db/migrations/002-indonesia-address.sql` |
| Seed data wilayah | `packages/db/scripts/seed-indonesia-address.ts` |
| Endpoint admin lookup | `apps/api/src/routes/admin/address.ts` |
| Endpoint public lookup | `apps/api/src/routes/address-public.ts`, `apps/api/src/routes/indonesia.ts` |
| Admin hooks | `apps/admin/src/lib/hooks/use-indonesia-address.ts` |
| Admin form | `apps/admin/src/components/forms/AddressForm.tsx` |
| Web formatter/fetcher | `apps/web/src/services/address.ts` |
| Entity pemakai | Donatur, employees, vendors, mustahiqs, mitra, activity reports, organization settings |

## Model Data

Sistem alamat memakai empat tabel referensi:

| Tabel | PK | Parent | Field |
|-------|----|--------|-------|
| `indonesia_provinces` | `code` | — | `name`, timestamps |
| `indonesia_regencies` | `code` | `province_code` -> `indonesia_provinces.code` | `name`, timestamps |
| `indonesia_districts` | `code` | `regency_code` -> `indonesia_regencies.code` | `name`, timestamps |
| `indonesia_villages` | `code` | `district_code` -> `indonesia_districts.code` | `name`, `postal_code`, timestamps |

Format kode aktual mengikuti `idn-area-data`, bukan format bertitik.

| Level | Contoh dari komentar schema | Catatan |
|-------|-----------------------------|---------|
| Province | `11` | Aceh |
| Regency | `1101` | Kabupaten Simeulue |
| District | `1101010` | Teupah Selatan |
| Village | `1101010001` | Latiung |

Index utama:

| Index | Fungsi |
|-------|--------|
| `idx_regencies_province` | Lookup kabupaten/kota per provinsi |
| `idx_districts_regency` | Lookup kecamatan per kabupaten/kota |
| `idx_villages_district` | Lookup desa/kelurahan per kecamatan |
| `idx_villages_postal` | Lookup/filter kode pos jika ada |

## Seed Data

Seed dijalankan dari package DB:

```bash
pnpm --filter @bantuanku/db db:seed:address
```

Script:

```text
packages/db/scripts/seed-indonesia-address.ts
  -> getProvinces()
  -> getRegencies()
  -> getDistricts()
  -> getVillages()
  -> insert onConflictDoNothing()
```

Sumber data adalah package `idn-area-data`.

Catatan penting:

- Insert regencies, districts, dan villages dilakukan batch 500.
- `postalCode` untuk village diset `null` karena package `idn-area-data` yang dipakai tidak menyediakan kode pos.
- Helper lama menyebut jumlah data statis seperti 38/514/7.266/83.762. Dokumen ini tidak mengunci jumlah tersebut karena jumlah aktual mengikuti versi `idn-area-data` dan hasil seed.

## Pola Penyimpanan Entity

Entity domain tidak menyimpan nama wilayah. Entity menyimpan kode referensi:

| Field | Fungsi |
|-------|--------|
| `detailAddress` / `detail_address` | Jalan, nomor rumah, RT/RW, detail lokal |
| `provinceCode` / `province_code` | FK ke `indonesia_provinces.code` |
| `regencyCode` / `regency_code` | FK ke `indonesia_regencies.code` |
| `districtCode` / `district_code` | FK ke `indonesia_districts.code` |
| `villageCode` / `village_code` | FK ke `indonesia_villages.code` |

Kode pos tidak disimpan di entity domain. Jika tersedia, kode pos dibaca dari `indonesia_villages.postal_code` saat read/join/complete lookup.

Entity yang sudah membawa field alamat terstruktur:

| Entity | Schema |
|--------|--------|
| Donatur | `packages/db/src/schema/donatur.ts` |
| Employee | `packages/db/src/schema/employee.ts` |
| Vendor | `packages/db/src/schema/vendor.ts` |
| Mustahiq | `packages/db/src/schema/mustahiq.ts` |
| Mitra | `packages/db/src/schema/mitra.ts` |
| Activity Report | `packages/db/src/schema/activity-report.ts` |

Organization address bukan entity table khusus; nilainya disimpan sebagai settings:

| Key |
|-----|
| `organization_detail_address` |
| `organization_province_code` |
| `organization_regency_code` |
| `organization_district_code` |
| `organization_village_code` |

## Migration Domain

Migration alamat utama:

| Migration | Fungsi |
|-----------|--------|
| `002-indonesia-address.sql` | Membuat tabel referensi wilayah dan index parent |
| `016_update_donatur_address.sql` | Tambah field/FK alamat donatur |
| `017_update_employees_address.sql` | Tambah field/FK alamat employees |
| `020_update_mustahiq_address.sql` | Tambah field/FK alamat mustahiqs dan salin legacy `address` ke `detail_address` |
| `022_update_vendors_address.sql` | Tambah field/FK alamat vendors |
| `106_update_activity_reports_address.sql` | Tambah field/FK alamat activity reports |

Migration cleanup legacy:

| Migration | Fungsi |
|-----------|--------|
| `018_cleanup_donatur_legacy_address.sql` | Drop `address`, `city`, `province`, `postal_code` dari `donatur` |
| `019_cleanup_employees_legacy_address.sql` | Drop `address` dari `employees` |
| `021_cleanup_mustahiq_legacy_address.sql` | Drop `address` dari `mustahiqs` |
| `023_cleanup_vendors_legacy_address.sql` | Drop `address` dari `vendors` |

Gap: schema `vendor.ts` dan `mustahiq.ts` masih mendefinisikan legacy `address`, walaupun migration cleanup sudah ada untuk drop kolom tersebut. Ini perlu diverifikasi terhadap database aktual dan diselaraskan agar Drizzle schema tidak drift dari hasil migration.

## Endpoint API

### Admin Address

Mounted di `/v1/admin/address`.

| Endpoint | Response |
|----------|----------|
| `GET /provinces` | `{ code, name }[]` |
| `GET /regencies/:provinceCode` | `{ code, name, provinceCode }[]` |
| `GET /districts/:regencyCode` | `{ code, name, regencyCode }[]` |
| `GET /villages/:districtCode` | `{ code, name, districtCode, postalCode }[]` |
| `GET /complete/:villageCode` | Nested `village`, `district`, `regency`, `province` |

Admin hooks memakai endpoint ini.

### Public Address

Mounted di `/v1/address`.

| Endpoint | Fungsi |
|----------|--------|
| `GET /complete/:villageCode` | Public complete address lookup untuk frontend web |

Mounted di `/v1/indonesia`.

| Endpoint | Response |
|----------|----------|
| `GET /provinces` | `{ code, name }[]` |
| `GET /regencies/:provinceCode` | `{ code, name, provinceCode }[]` |
| `GET /districts/:regencyCode` | `{ code, name, regencyCode }[]` |
| `GET /villages/:districtCode` | `{ code, name, districtCode }[]` |

Catatan: `/v1/indonesia/villages/:districtCode` tidak mengembalikan `postalCode`, sedangkan `/v1/admin/address/villages/:districtCode` mengembalikan `postalCode`.

## Admin Hooks dan Form

Admin hooks:

| Hook | Query Key | Endpoint |
|------|-----------|----------|
| `useProvinces()` | `["provinces"]` | `/admin/address/provinces` |
| `useRegencies(provinceCode)` | `["regencies", provinceCode]` | `/admin/address/regencies/:provinceCode` |
| `useDistricts(regencyCode)` | `["districts", regencyCode]` | `/admin/address/districts/:regencyCode` |
| `useVillages(districtCode)` | `["villages", districtCode]` | `/admin/address/villages/:districtCode` |
| `useCompleteAddress(villageCode)` | `["complete-address", villageCode]` | `/admin/address/complete/:villageCode` |

Semua hook memakai `staleTime: Infinity` karena data wilayah dianggap jarang berubah.

`AddressForm` menyediakan cascading selection:

```text
Detail Address
  -> Province
    -> Regency
      -> District
        -> Village
          -> Postal Code readonly
```

Perilaku form:

- Saat province berubah, regency/district/village/postalCode direset.
- Saat regency berubah, district/village/postalCode direset.
- Saat district berubah, village/postalCode direset.
- Saat village berubah, postalCode diambil dari selected village.
- `onChange` mengirim `{ detailAddress, provinceCode, regencyCode, districtCode, villageCode, postalCode }`.
- `postalCode` boleh ikut payload form, tetapi tidak disimpan ke entity domain.

Pemakai `AddressForm` yang ditemukan:

| Area | Source |
|------|--------|
| Donor modal | `apps/admin/src/components/modals/DonorModal.tsx` |
| Employee modal | `apps/admin/src/components/modals/EmployeeModal.tsx` |
| Vendor modal | `apps/admin/src/components/modals/VendorModal.tsx` |
| Mustahiq modal | `apps/admin/src/components/modals/MustahiqModal.tsx` |
| Mitra create/edit | `apps/admin/src/app/dashboard/mitra/*` |
| Activity report create/edit | `apps/admin/src/app/dashboard/activity-reports/*` |
| Profile | `apps/admin/src/app/dashboard/profile/page.tsx` |
| General settings | `apps/admin/src/app/dashboard/settings/general/page.tsx` |

### Cascading Address di Web Publik

Form registrasi mitra (`apps/web/src/app/daftar-mitra/page.tsx`) mengimplementasikan cascading address selector secara mandiri (tidak menggunakan `AddressForm` admin karena komponen tersebut ada di `apps/admin`).

**Komponen UI:** Setiap level alamat menggunakan `<Autocomplete>` dari `apps/web/src/components/Autocomplete.tsx` (bukan `<select>` biasa). Ini memungkinkan user mengetik dan menyaring pilihan — penting karena kecamatan bisa ribuan pilihan.

Data di-map dari `{ code, name }` (response API) ke `{ value, label }` (format `AutocompleteOption`):

```tsx
<Autocomplete
  options={provinces.map((p) => ({ value: p.code, label: p.name }))}
  value={selectedProvinceCode}
  onChange={setSelectedProvinceCode}
  placeholder="Cari provinsi..."
/>
```

Pola cascade:

- Fetch `/v1/indonesia/provinces` saat mount
- Fetch `/v1/indonesia/regencies/:provinceCode` saat province dipilih; reset regency/district/village
- Fetch `/v1/indonesia/districts/:regencyCode` saat regency dipilih; reset district/village
- Fetch `/v1/indonesia/villages/:districtCode` saat district dipilih; reset village
- Clear pada `Autocomplete` (tombol ✕) memicu reset cascade via `useEffect`
- Payload dikirim ke `POST /mitra/register`: `detailAddress`, `provinceCode`, `regencyCode`, `districtCode`, `villageCode`

Pola ini ekuivalen dengan `AddressForm` admin tetapi tidak menggunakan komponen/hook yang sama. Jika di masa depan dibutuhkan address selector di halaman publik lain, pola ini bisa diekstrak menjadi hook di `apps/web`.

## Read/JOIN Pattern

API domain yang menampilkan nama alamat melakukan `leftJoin` ke tabel referensi dan mengembalikan field read-only:

| Field Read | Sumber |
|------------|--------|
| `provinceName` | `indonesia_provinces.name` |
| `regencyName` | `indonesia_regencies.name` |
| `districtName` | `indonesia_districts.name` |
| `villageName` | `indonesia_villages.name` |
| `villagePostalCode` | `indonesia_villages.postal_code` |

Pattern ini terlihat di route admin donatur, employees, vendors, mitra, activity reports, auth profile, dan statistik.

## Frontend Web Usage

Frontend web hanya memakai complete address public lookup:

| Source | Fungsi |
|--------|--------|
| `apps/web/src/services/address.ts` | Fetch `/v1/address/complete/:villageCode` |
| `formatCompleteAddress()` | Gabungkan `detailAddress`, village, district, regency, province |

Contoh pemakaian: halaman program mengambil `organization_village_code` dari settings lalu fetch complete address untuk menampilkan alamat organisasi yang lengkap.

## Gap dan Rekomendasi

1. **Selaraskan format contoh kode.** Komentar `AddressForm` dan helper lama masih memakai contoh kode bertitik. Dokumen resmi harus memakai kode compact seperti schema/seed aktual.
2. **Perbaiki klaim kode pos.** Seed saat ini mengisi `postalCode: null`; jangan klaim kode pos otomatis lengkap sampai ada sumber data kode pos yang benar.
3. **Audit schema vs migration cleanup.** `vendor.ts` dan `mustahiq.ts` masih mendefinisikan legacy `address`, sementara migration cleanup sudah drop kolomnya. Pastikan DB production dan schema Drizzle sejalan.
4. **Tambahkan migration Mitra address ke manifest jika belum ada.** Schema mitra sudah punya field alamat, tetapi file migration address khusus mitra tidak terlihat dalam audit ini; perlu pastikan kolom dibuat oleh migration awal/manifest.
5. **Hilangkan debug log dari `AddressForm`.** Saat ini ada `console.log` untuk value dan provinces loaded; ini bising di production admin.
6. **Samakan endpoint public.** `/v1/indonesia/villages` tidak menyertakan `postalCode`, sedangkan admin endpoint menyertakan. Putuskan apakah perlu konsisten.
7. **Validasi hirarki kode.** API domain menerima kode wilayah, tetapi validasi relasi parent-child umumnya bergantung FK masing-masing kode, bukan validasi bahwa regency milik province dan district milik regency dalam satu payload.
8. **Tambahkan source kode pos jika dibutuhkan.** Jika kode pos adalah kebutuhan bisnis, gunakan dataset postal code yang valid dan update seed.

## Keputusan Arsitektur Saat Ini

- Data wilayah adalah master reference terpusat.
- Entity domain menyimpan kode wilayah, bukan nama wilayah.
- Nama wilayah dan kode pos adalah data hasil join/lookup, bukan input manual entity.
- `detailAddress` tetap free text untuk detail jalan/rumah/RT/RW.
- `postalCode` di `AddressForm` adalah display/derived field, bukan field persistent entity.
- Cleanup file lama boleh dilakukan setelah dokumen ini dibuat karena substansi helper sudah diserap dan dikoreksi.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `docs/00-helper-alamat.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
| `00-helper-address-system.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
