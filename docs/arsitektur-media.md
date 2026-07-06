# Arsitektur Media Library

Dokumen ini adalah source of truth arsitektur media library Bantuanku sesuai implementasi kode saat ini. Fokusnya adalah upload media admin, penyimpanan lokal/GCS, varian image, kategori media, integrasi `MediaLibrary`, dan konsumsi URL oleh web/admin.

## Ruang Lingkup

| Area | Implementasi |
|------|--------------|
| API media admin | `apps/api/src/routes/admin/media.ts` |
| UI media library | `apps/admin/src/components/MediaLibrary.tsx` |
| Storage cloud | Google Cloud Storage via REST API jika CDN aktif |
| Storage lokal | Folder `uploads/` di `process.cwd()` sebagai fallback |
| Image processing | `sharp` melalui `apps/api/src/lib/image-processor.ts` |
| Schema DB | `packages/db/src/schema/media.ts` |
| Serve file lokal | `GET /uploads/:filename` di `apps/api/src/index.ts` |
| URL helper web | `apps/web/src/lib/image.ts` |
| CDN settings | Tabel `settings`, kategori `cdn` |

Media library berbeda dari upload bukti bayar transaksi universal. Upload bukti bayar transaksi utama didokumentasikan di `arsitektur-universal-payment.md` dan saat ini GCS-required. Media library admin masih bisa fallback ke local uploads jika CDN tidak aktif atau upload GCS gagal.

Gap security upload seperti validasi MIME berbasis request, public local uploads, dan policy fallback production dicatat di `arsitektur-security.md`.
Cache media, local uploads memory cache, image variants, dan performance processing dicatat di `arsitektur-cache-performance.md`.
Pemakaian MediaLibrary untuk `featureImageUrl` CMS pages dicatat di `arsitektur-pages-cms.md`.

## Endpoint

Base route:

```http
/v1/admin/media
```

Route ini berada di bawah admin auth:

1. `authMiddleware`
2. `requireRole("super_admin", "admin_finance", "admin_campaign", "program_coordinator", "employee", "mitra")`

Mitra boleh mengakses `/media`, tetapi pada list hanya melihat media yang dia upload sendiri jika role-nya hanya `mitra`.

| Method | Path | Status implementasi |
|--------|------|---------------------|
| `GET` | `/v1/admin/media` | Ambil media dengan filter search/category |
| `POST` | `/v1/admin/media/upload` | Upload file, process image, simpan DB |
| `PATCH` | `/v1/admin/media/:id` | Stub; belum update DB |
| `DELETE` | `/v1/admin/media/:id` | Stub; belum delete DB/storage |

### Endpoint Publik Upload Dokumen Mitra

```http
POST /v1/mitra/upload-document
```

Endpoint ini tidak memerlukan auth — dipakai oleh form registrasi publik mitra (`/daftar-mitra`) sebelum akun mitra dibuat. Karakteristik:

| Atribut | Nilai |
|---------|-------|
| Auth | Tidak diperlukan |
| Kategori tetap | `document` |
| Input | multipart/form-data, field `file` |
| Jenis diterima | Image (`image/*`) atau PDF (`application/pdf`) |
| Maks image | 5MB |
| Maks PDF | 10MB |
| Proses image | `processSingleWebp` (single WebP `original`, tanpa multi-variant) |
| Proses PDF | Disimpan apa adanya |
| Storage | GCS jika CDN aktif, fallback local |
| DB row | Row `media` dibuat dengan `uploadedBy: null` |
| Response | `{ url: string }` — URL final yang langsung dipakai di payload `/mitra/register` |

Row media dengan `uploadedBy: null` berarti media ini belum terhubung ke akun mana pun. Jika pendaftaran dibatalkan setelah upload, row akan menjadi orphan. Cleanup lewat `cleanup-local-originals.ts` dan mekanisme GCS delete masih perlu dihubungkan ke kasus ini di masa depan.

## Schema Media

Tabel `media`:

| Kolom | Fungsi |
|-------|--------|
| `id` | Primary key |
| `filename` | Nama file final yang disimpan |
| `originalName` | Nama file asli dari user |
| `mimeType` | MIME final setelah proses |
| `size` | Ukuran file final utama |
| `url` | Nilai kompatibilitas lama; sama dengan `path` |
| `path` | Path lokal `/uploads/...` atau full GCS URL |
| `width` | Width file utama jika image |
| `height` | Height file utama jika image |
| `variants` | JSON map varian image |
| `originalLocalPath` | Lokasi original sementara di local |
| `originalLocalExpiresAt` | Expiry original sementara |
| `folder` | `uploads` atau `gcs` |
| `category` | `general`, `financial`, `activity`, `document` |
| `uploadedBy` | User uploader |
| `createdAt` | Timestamp upload |

`MediaVariant`:

```ts
{
  variant: "thumbnail" | "medium" | "large" | "square" | "original";
  width: number;
  height: number;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}
```

## Kategori Media

Kategori valid:

| Category | File diterima | Proses |
|----------|---------------|--------|
| `general` | Image only | Generate 5 varian WebP; primary = `large` |
| `financial` | Image only | Convert 1 varian WebP `original`; tanpa crop |
| `activity` | Image only | Convert 1 varian WebP `original`; tanpa crop |
| `document` | Image atau PDF | Image convert WebP `original`; PDF disimpan apa adanya |

Validasi ukuran:

| Tipe | Limit |
|------|-------|
| Image | 5 MB |
| PDF | 10 MB |

Catatan koreksi terhadap dokumen lama: kategori `financial` di endpoint media saat ini hanya menerima image, bukan PDF. PDF hanya diterima jika `category = "document"`.

## Image Processing

Processor berada di `apps/api/src/lib/image-processor.ts` dan memuat `sharp` secara dynamic import.

Jika package `sharp` tidak tersedia, upload image gagal dengan HTTP 500 dan pesan:

```text
Paket sharp belum terpasang. Jalankan: npm install --workspace=@bantuanku/api sharp
```

`@bantuanku/api` saat ini sudah mencantumkan dependency `sharp`.

### General Image

`processGeneralImage()` menghasilkan:

| Variant | Target | Fit |
|---------|--------|-----|
| `thumbnail` | `300 x 166` | `cover` |
| `medium` | `600 x 332` | `cover` |
| `large` | `900 x 498` | `cover` |
| `square` | `300 x 300` | `cover` |
| `original` | max `1200 x 664` | `inside` |

Semua varian:

1. `rotate()` untuk auto-orient.
2. Resize sesuai target.
3. Convert ke WebP.
4. Quality `82`, effort `4`.
5. `withoutEnlargement: true`.

### Non-General Image

`financial`, `activity`, dan image `document` memakai `processSingleWebp()`:

1. Variant `original`.
2. Max `1200 x 664`.
3. Fit `inside`.
4. Convert WebP.
5. Tanpa autocrop cover.

### PDF

PDF hanya berlaku untuk `category = "document"`:

1. Tidak diproses `sharp`.
2. Tidak dibuat varian.
3. Disimpan dengan ekstensi `.pdf`.
4. MIME tetap dari upload.

## Storage Flow

Saat upload:

1. API membaca multipart body.
2. Validasi `file`.
3. Validasi `category`.
4. Validasi MIME dan size.
5. Buffer original dibuat dari `file.arrayBuffer()`.
6. Jika image, original disimpan sementara ke local `uploads/original-temp/...`.
7. API membaca CDN settings dari DB.
8. File hasil proses diupload ke GCS jika CDN valid.
9. Jika CDN tidak aktif atau upload GCS gagal, file disimpan lokal di `uploads/`.
10. Row `media` dibuat di database.
11. Response mengembalikan URL runtime dan `variants` jika ada.

## CDN/GCS Settings

Settings dibaca dari tabel `settings` dengan `category = "cdn"`:

| Key | Wajib saat CDN aktif |
|-----|----------------------|
| `cdn_enabled` | Harus string `"true"` |
| `gcs_bucket_name` | Wajib |
| `gcs_project_id` | Wajib |
| `gcs_client_email` | Wajib |
| `gcs_private_key` | Wajib |

Jika `cdn_enabled !== "true"` atau salah satu field kosong, `fetchCDNSettings()` mengembalikan `null` dan upload memakai local storage.

Admin setting CDN berada di `apps/admin/src/app/dashboard/settings/general/page.tsx`, tab `cdn`, dan hanya ditampilkan untuk developer.

## GCS Upload

`apps/api/src/lib/gcs.ts` melakukan:

1. Membuat JWT service account manual.
2. Menukar JWT ke OAuth access token.
3. Upload object via REST:

```http
POST https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o?uploadType=media&name={destination}
```

4. Mencoba membuat object public via ACL `allUsers: READER`.
5. Mengembalikan public URL:

```text
https://storage.googleapis.com/{bucket}/{destination}
```

Path object dibuat oleh `generateGCSPath(filename, "bantuanku")`:

```text
bantuanku/YYYY/MM/{filename}
```

Jika upload GCS gagal pada media library, error dicatat dan sistem fallback ke local storage. Ini berbeda dari upload proof transaksi universal yang GCS-required.

## Local Storage

Local storage memakai:

```ts
path.join(process.cwd(), "uploads")
```

File lokal disimpan sebagai:

```text
/uploads/{filename}
```

API route `GET /uploads/:filename`:

1. Cek `global.uploadedFiles`.
2. Jika tidak ada, baca dari filesystem `process.cwd()/uploads/{filename}`.
3. Cache buffer ke `global.uploadedFiles`.
4. Response dengan `Content-Type` berdasarkan ekstensi.
5. `Cache-Control: public, max-age=31536000`.

Keterbatasan: route ini hanya melayani filename satu level. File original sementara berada dalam subfolder `original-temp/YYYY/MM/DD`, tetapi original temp tidak untuk diserve publik.

## Original Local Retention

Untuk image upload, original disimpan sementara ke:

```text
uploads/original-temp/YYYY/MM/DD/{timestamp}-{mediaId}-{basename}.{ext}
```

Retention:

| Nilai | Implementasi |
|-------|--------------|
| Durasi | 7 hari |
| Field DB | `originalLocalPath`, `originalLocalExpiresAt` |
| Cleanup inline | `removeExpiredOriginals()` dipanggil saat upload |
| Cleanup script | `apps/api/scripts/cleanup-local-originals.ts` |
| NPM script | `pnpm --filter @bantuanku/api cleanup-local-originals` |

Cleanup script memakai `process.cwd()/uploads`, jadi working directory saat menjalankan script harus benar.

## Response GET Media

`GET /v1/admin/media` menerima query:

| Query | Fungsi |
|-------|--------|
| `search` | Cari `filename` atau `originalName` dengan `LIKE` |
| `category` | Filter exact category |

Response item:

```ts
{
  id,
  url,
  title: originalName,
  alt: "",
  description: "",
  filename,
  size,
  mimeType,
  category,
  width,
  height,
  variants,
  createdAt
}
```

Untuk local path, URL response dibuat dari:

```ts
c.env?.API_URL || process.env.API_URL || "http://localhost:50245"
```

Untuk GCS absolute URL, URL dipakai apa adanya.

## MediaLibrary Admin

`apps/admin/src/components/MediaLibrary.tsx` adalah modal client component.

Props utama:

| Prop | Fungsi |
|------|--------|
| `isOpen` | Buka/tutup modal |
| `onClose` | Callback tutup |
| `onSelect(url)` | Callback setelah memilih URL |
| `selectedUrl` | URL terpilih awal |
| `accept` | MIME accept input, default `image/*` |
| `category` | Filter/upload category |
| `showUploadToast` | Kontrol toast upload |
| `onUploadResult` | Callback hasil upload |

Tab UI:

1. `library`
2. `upload`
3. `camera` hanya mobile, memakai `capture="environment"`

Upload dari UI:

1. Membuat `FormData`.
2. Append `file`.
3. Append `category` jika prop tersedia.
4. POST `/admin/media/upload`.
5. Invalidate query `media-library`.
6. Set URL upload sebagai selection sementara.

Pemilihan media hanya mengembalikan URL utama, bukan object penuh atau variant map.

Field sidebar `Judul`, `Teks Alt`, dan `Deskripsi` hanya input UI lokal. Karena endpoint `PATCH /:id` masih stub dan komponen tidak memanggil update metadata, perubahan field ini belum tersimpan.

## URL Normalization

Backend entity form memakai pola:

1. Jika URL media sudah absolute `http://` atau `https://`, simpan apa adanya.
2. Jika bukan absolute, pakai `extractPath()` untuk menyimpan path lokal.

`extractPath()`:

1. Mengembalikan string yang sudah diawali `/`.
2. Untuk full URL, mengambil `new URL(url).pathname`.
3. Jika parse gagal, mencoba pattern `/uploads/...`.

Ini dipakai di admin campaigns, zakat types, qurban packages, dan beberapa flow qurban savings/payment.

## Konsumsi URL di Web/Admin

`apps/web/src/lib/image.ts`:

1. Jika URL kosong, return placeholder SVG data URI.
2. Jika `placehold.co`, ganti ke placeholder lokal.
3. Jika absolute HTTP/HTTPS, return apa adanya.
4. Jika relative path, prepend `NEXT_PUBLIC_API_URL` tanpa suffix `/v1`.
5. `getImageUrlByVariant()` mengganti suffix filename varian jika pola cocok.

Next image remote patterns:

| App | Remote patterns terkait media |
|-----|-------------------------------|
| `apps/web` | localhost `/uploads/**`, `api.bantuanku.org`, `cdn.bantuanku.org`, `storage.googleapis.com/cdn.webane.net/**`, Unsplash, placehold |
| `apps/admin` | gravatar, `storage.googleapis.com/cdn.webane.net/**`, localhost `/uploads/**` |

## Integrasi Fitur

Media library dipakai antara lain untuk:

1. Campaign image dan gallery.
2. Zakat type image.
3. Qurban package image.
4. Static page feature image.
5. Activity report gallery.
6. SEO `ogImageUrl`.
7. Settings frontend image/banner.
8. Settings payment QRIS image.
9. Settings general organization/logo fields.

## Pemetaan Category per Konteks

`category` prop MediaLibrary melakukan dua hal sekaligus: memfilter gambar yang ditampilkan di grid library dan menentukan kategori upload baru. Pemetaan yang benar:

| Konteks | Category | Alasan |
|---------|----------|--------|
| Campaign banner, zakat type image, qurban package image | `general` | Butuh 5 varian size (thumbnail/medium/large/square/original) |
| Logo organisasi, favicon, institution logo | `general` | Branding image butuh multi-varian; bukan receipt |
| Banner/slider homepage (settings/frontend) | `general` | Konten website umum, bukan foto laporan kegiatan |
| Foto laporan penyembelihan qurban | `activity` | Laporan kegiatan visual, single WebP tanpa crop |
| Bukti bayar transaksi, bukti transfer disbursement | `financial` | Dokumen keuangan, single WebP, tidak perlu varian |
| QRIS image | `general` | Ditampilkan di halaman web publik; butuh kualitas tampilan baik |
| Legal document mitra (KTP, NPWP, SIUP) | `document` | Bisa PDF; bukan image generik |
| Activity report feature image | `general` | Artikel/laporan butuh varian untuk grid dan detail |

Qurban payment/order upload punya flow upload sendiri di `apps/api/src/routes/qurban.ts`, bukan hanya media library. Flow tersebut bisa fallback local dan juga insert row `media` kategori `financial`.

## Gap Implementasi

| Gap | Dampak |
|-----|--------|
| `PATCH /v1/admin/media/:id` masih stub | Judul/alt/deskripsi media tidak tersimpan |
| `DELETE /v1/admin/media/:id` masih stub | File dan row DB tidak benar-benar dihapus |
| Metadata `alt` dan `description` tidak ada di schema media aktif | UI sidebar tidak punya tempat persistence |
| MediaLibrary tidak memakai thumbnail variant untuk grid | Grid selalu render URL utama, biasanya `large` untuk `general` |
| Role category filtering belum enforced kecuali mitra uploader-only | Finance/campaign category separation belum benar-benar enforced server-side |
| GCS upload media library fallback ke local saat gagal | Production bisa menghasilkan campuran URL GCS dan local jika GCS bermasalah |
| `check-media-consistency.ts` masih asumsi uploads dir `apps/api/uploads` | Runtime upload aktual memakai `process.cwd()/uploads`, bisa berbeda tergantung working directory |
| `apps/api/drizzle/0003_create_media_table.sql` adalah schema lama SQLite | Tidak sesuai schema Drizzle/Postgres aktif di `packages/db/src/schema/media.ts` |
| Variants di response ada, tetapi `MediaLibrary` type tidak mendeklarasikannya | Frontend tidak memanfaatkan variant map |
| GCS ACL public bisa gagal tanpa menggagalkan upload | URL bisa tidak publik jika bucket/ACL tidak mendukung public object ACL |
| `generateGCSPath` selalu pakai default slug `'bantuanku'` di semua 4 pemanggil | Saat multi-client aktif, semua upload dari server klien berbeda tetap masuk ke prefix `bantuanku/` — file tercampur, offboarding klien tidak bisa bersih. Fix: teruskan `ORGANIZATION_SLUG` env var ke semua pemanggil. Detail di `arsitektur-theme-system.md` section CDN. |

## Perbaikan yang Sudah Dilakukan

> 2026-07-02

| Fix | File | Detail |
|-----|------|--------|
| Ganti local `createId()` ke shared | `apps/api/src/routes/admin/media.ts` | Import `createId` dari `@bantuanku/db` (nanoid), hapus implementasi lokal `Date.now().toString(36)` |
| Hapus debug `console.log` | `apps/api/src/routes/admin/media.ts` | `console.log("Form data keys:", ...)` dihapus dari endpoint upload |
| Fix category logo/favicon | `apps/admin/src/app/dashboard/settings/general/page.tsx` | 3× `category="financial"` → `category="general"` (logo, favicon, institution logo) |
| Fix category banner/slider | `apps/admin/src/app/dashboard/settings/frontend/page.tsx` | `category="activity"` → `category="general"` (homepage slider/banner) |

## Perbedaan dari Dokumen Lama

`00-helper-media-library.md` menekankan database harus menyimpan path lokal saja. Implementasi sekarang berbeda:

1. Local upload menyimpan `/uploads/...`.
2. GCS upload menyimpan full absolute GCS URL di `path` dan `url`.
3. Runtime response menormalisasi local path menjadi full URL, tetapi GCS URL dipakai apa adanya.

`03-autocrop-image-blueprint.md` sebagian sudah benar, tetapi ada detail yang perlu dikoreksi:

1. Varian `original_limited` di kode bernama `original`.
2. Format filename aktual memakai `{timestamp}-{id}-{basename}-{variant}.webp`, bukan `{mediaId}_{slug}_{variant}.webp`.
3. Kategori `activity` dan image `document` juga memakai single WebP original seperti `financial`.
4. CDN bukan wajib untuk media library; jika tidak aktif atau gagal, fallback local berjalan.
5. PDF hanya diterima untuk `document`, bukan `financial`.

## Rekomendasi Perbaikan

Prioritas 1:

1. Implementasikan `PATCH /media/:id` atau hapus field edit alt/title/description dari UI sampai persistence tersedia.
2. Implementasikan `DELETE /media/:id` untuk hapus row DB dan file storage/GCS.
3. Tambahkan kolom `alt` dan `description` jika metadata media memang dibutuhkan untuk SEO/accessibility.
4. Perbaiki `MediaLibrary` agar grid memakai `variants.thumbnail.url` jika tersedia.
5. Selaraskan `check-media-consistency.ts` dengan `process.cwd()/uploads` atau jadikan path upload eksplisit lewat env.

Prioritas 2:

1. Buat kebijakan production: apakah media library boleh fallback local saat GCS gagal. Jika tidak, ubah menjadi fail-fast.
2. Tambahkan category access control server-side sesuai role, bukan hanya filter UI.
3. Tambahkan typed response `MediaItem` yang mencakup `variants`, `width`, `height`, dan `category`.
4. Tambahkan cleanup job production untuk original temp sebagai cron/PM2 scheduled command.
5. Tambahkan validasi SVG jika logo/settings butuh SVG, karena pipeline image sekarang mengandalkan `sharp`.

Prioritas 3:

1. Simpan object GCS path terpisah dari public URL agar delete GCS lebih mudah.
2. Tambahkan audit/log upload dan delete media.
3. Pertimbangkan signed URL/private bucket untuk financial/document jika file tidak boleh publik.
4. Buat migrasi cleanup untuk row lama yang masih full local URL atau schema SQLite lama jika masih ada di database lama.

## Keputusan Source of Truth

1. Source of truth upload media adalah `apps/api/src/routes/admin/media.ts`.
2. Source of truth image processing adalah `apps/api/src/lib/image-processor.ts`.
3. Source of truth GCS upload adalah `apps/api/src/lib/gcs.ts`.
4. Source of truth schema adalah `packages/db/src/schema/media.ts`.
5. Source of truth UI admin adalah `apps/admin/src/components/MediaLibrary.tsx`.
6. Dokumen root lama tentang media/autocrop tidak boleh dipakai sebagai rujukan arsitektur setelah dokumen ini dibuat.
