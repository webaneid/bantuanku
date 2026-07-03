# Arsitektur Master Data

## Ringkasan

Master data Batch C saat ini terutama mencakup `categories`, `pillars`, dan beberapa daftar referensi pendukung seperti job title, income range, dan wilayah Indonesia. File ini fokus pada master data umum yang dipakai lintas modul; domain khusus seperti karyawan, mustahiq, vendor, mitra, settings, akuntansi, dan laporan memiliki file arsitektur sendiri.

## Implementasi Terkait

| Area | File |
|------|------|
| Category schema | `packages/db/src/schema/category.ts` |
| Pillar schema | `packages/db/src/schema/pillar.ts` |
| Public category API | `apps/api/src/routes/categories.ts` |
| Public pillar API | `apps/api/src/routes/pillars.ts` |
| Admin category API | `apps/api/src/routes/admin/categories.ts` |
| Admin pillar API | `apps/api/src/routes/admin/pillars.ts` |
| Admin UI kategori | `apps/admin/src/app/dashboard/campaigns/categories/page.tsx` |
| Admin UI pilar | `apps/admin/src/app/dashboard/campaigns/pillars/page.tsx` |
| Constants kategori | `packages/db/src/constants/categories.ts`, `apps/admin/src/lib/constants/categories.ts` |

## Category

Tabel: `categories`.

| Kolom | Catatan |
|-------|---------|
| `slug` | Unik, dibuat dari nama saat create/update. |
| `name` | Nama kategori. |
| `description`, `icon`, `color` | Metadata tampilan. |
| `sortOrder` | Urutan tampil. |
| `isActive` | Public API hanya membaca kategori aktif. |
| SEO fields | `metaTitle`, `metaDescription`, `focusKeyphrase`, `canonicalUrl`, `noIndex`, `noFollow`, `ogTitle`, `ogDescription`, `ogImageUrl`, `seoScore`. |

Endpoint:

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/categories` | Public list kategori aktif. |
| `GET` | `/admin/categories` | Admin list semua kategori. |
| `GET` | `/admin/categories/:id` | Detail kategori. |
| `POST` | `/admin/categories` | Buat kategori, role `super_admin`. |
| `PUT` | `/admin/categories/:id` | Update kategori, role `super_admin`. |
| `DELETE` | `/admin/categories/:id` | Hapus kategori, role `super_admin`. |

## Pillar

Tabel: `pillars`.

| Kolom | Catatan |
|-------|---------|
| `slug` | Unik, dibuat dari nama saat create/update. |
| `name` | Nama pilar. |
| `description`, `icon`, `color` | Metadata tampilan. |
| `sortOrder` | Urutan tampil. |
| `isActive` | Public API hanya membaca pilar aktif. |
| `isDefault` | Pilar default tidak boleh diubah atau dihapus lewat admin API. |
| SEO fields | Sama seperti kategori. |

Endpoint:

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/pillars` | Public list pilar aktif. |
| `GET` | `/admin/pillars` | Admin list semua pilar. |
| `GET` | `/admin/pillars/:id` | Detail pilar. |
| `POST` | `/admin/pillars` | Buat pilar, role `super_admin`. |
| `PUT` | `/admin/pillars/:id` | Update pilar non-default, role `super_admin`. |
| `DELETE` | `/admin/pillars/:id` | Hapus pilar non-default, role `super_admin`. |

## Catatan Kritis

1. Nama dokumen lama menyebut “Pilar, Kategori, Pillar”; implementasi sebenarnya hanya punya dua entitas utama: `categories` dan `pillars`.
2. Public endpoint tidak mengembalikan SEO fields, hanya data ringkas untuk tampilan.
3. Admin create/update tidak menerima `slug` manual untuk category/pillar; slug dibentuk dari `name`.
4. `categories` belum punya proteksi `isDefault`; berbeda dengan `pillars`.
5. Wilayah Indonesia, job title, dan income range adalah master pendukung, tetapi dokumentasi detailnya sebaiknya masuk `arsitektur-alamat.md` atau file domain yang memakai data tersebut.
