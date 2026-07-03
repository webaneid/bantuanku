# Arsitektur Pages CMS

> Terakhir di-sync: 2026-07-02

---

## Overview

Pages CMS adalah modul halaman statis publik berbasis tabel `pages`. Modul ini dipakai untuk konten seperti halaman "Tentang Kami", "Kontak", atau halaman editorial lain yang dikelola dari admin dan tampil di public web pada route:

```text
/page/[slug]
```

Dokumen ini hanya membahas **CMS pages yang tersimpan di database** dan route publiknya. Ini berbeda dari:

- halaman arsip/domain hardcoded seperti `/program`, `/zakat`, `/qurban`, `/wakaf`;
- SEO settings untuk homepage/arsip di `settings.category = "seo_pages"`;
- documentation center di `/documentation`, yang kontennya berasal dari file TypeScript statis;
- activity reports di `/laporan`, yang memakai tabel dan workflow berbeda.

Dokumen terkait:

- `arsitektur-seo.md` — field SEO, metadata, Open Graph, Twitter Card, JSON-LD, sitemap.
- `arsitektur-media.md` — MediaLibrary dan URL gambar.
- `arsitektur-search-discovery.md` — sitemap/discovery, URL autocomplete, dan crawler.
- `arsitektur-documentation-center.md` — `/documentation` static TypeScript content yang bukan Pages CMS.
- `arsitektur-security.md` — trust boundary, HTML rendering, dan risiko XSS.
- `arsitektur-api-routing.md` — mount route `/v1/pages` dan `/v1/admin/pages`.
- `arsitektur-cache-performance.md` — `no-store`, sitemap dynamic, dan invalidation gap.
- `arsitektur-permission-rbac.md` — role guard `super_admin` dan `admin_campaign`.
- `arsitektur-komponen-admin.md` — `PageForm`, `SEOPanel`, `MediaLibrary`, `RichTextEditor`.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Schema DB pages | `packages/db/src/schema/page.ts` |
| Public pages API | `apps/api/src/routes/pages.ts` |
| Admin pages API | `apps/api/src/routes/admin/pages.ts` |
| Route mount API | `apps/api/src/index.ts`, `apps/api/src/routes/admin/index.ts` |
| Public web detail | `apps/web/src/app/page/[slug]/page.tsx` |
| Web pages service | `apps/web/src/services/pages.ts` |
| Admin list | `apps/admin/src/app/dashboard/pages/page.tsx` |
| Admin create | `apps/admin/src/app/dashboard/pages/create/page.tsx` |
| Admin edit | `apps/admin/src/app/dashboard/pages/[id]/edit/page.tsx` |
| Admin form | `apps/admin/src/components/PageForm.tsx` |
| Rich text editor | `apps/admin/src/components/RichTextEditor.tsx` |
| Media picker | `apps/admin/src/components/MediaLibrary.tsx` |
| SEO panel | `apps/admin/src/components/SEOPanel.tsx` |
| URL autocomplete registry | `apps/admin/src/lib/url-registry.ts` |
| Sitemap pages fetch | `apps/web/src/app/sitemap.ts` |

---

## Data Model

Tabel:

```text
pages
```

Kolom utama:

| Kolom | Tipe / Aturan | Fungsi |
|-------|---------------|--------|
| `id` | `text` primary key | ID internal dari `createId()` |
| `slug` | `text`, unique, not null | Path publik `/page/{slug}` |
| `title` | `text`, not null | Judul halaman |
| `featureImageUrl` | `text`, nullable | Gambar utama halaman |
| `content` | `text`, not null | HTML hasil editor rich text |
| `excerpt` | `text`, nullable | Ringkasan pendek |
| `isPublished` | `boolean`, default `true`, not null | Status publik/draft |
| `publishedAt` | `timestamptz`, nullable | Waktu pertama publish; dihapus saat draft |
| `createdBy` | FK `users.id`, nullable | User pembuat |
| `createdAt` | `timestamptz`, default now | Waktu dibuat |
| `updatedAt` | `timestamptz`, default now | Waktu terakhir update |

Kolom SEO:

| Kolom | Limit | Fungsi |
|-------|-------|--------|
| `metaTitle` | 70 | Title SEO |
| `metaDescription` | 170 | Meta description |
| `focusKeyphrase` | 100 | Keyword untuk SEO panel/metadata |
| `canonicalUrl` | text | Override canonical |
| `noIndex` | boolean | Robots noindex |
| `noFollow` | boolean | Robots nofollow |
| `ogTitle` | 70 | Open Graph title |
| `ogDescription` | 200 | Open Graph description |
| `ogImageUrl` | text | Open Graph image |
| `seoScore` | integer default 0 | Skor SEO panel |

Catatan migrasi:

- `094_add_feature_image_to_pages.sql` dan `096_add_feature_image_to_pages.sql` sama-sama menambah `feature_image_url` dengan `IF NOT EXISTS`.
- `095_remove_pages_seo_columns.sql` pernah menghapus kolom SEO.
- `097_add_seo_fields_to_pages.sql` menambah kembali field SEO sesuai schema sekarang.

---

## Public API

Base route:

```http
/v1/pages
```

Route ini public, tanpa auth.

### `GET /v1/pages`

Mengambil semua page dengan:

```ts
where: eq(pages.isPublished, true)
```

Kolom response:

| Field |
|-------|
| `id` |
| `slug` |
| `title` |
| `featureImageUrl` |
| `excerpt` |

Catatan:

1. Tidak ada pagination.
2. Tidak ada filter `noIndex`.
3. Tidak ada sort eksplisit.
4. Tidak mengembalikan `content` dan field SEO.
5. Dipakai oleh sitemap dan admin URL autocomplete.

### `GET /v1/pages/:slug`

Mengambil detail page dengan:

```ts
where: and(eq(pages.slug, slug), eq(pages.isPublished, true))
```

Kolom response:

| Field |
|-------|
| `id` |
| `slug` |
| `title` |
| `featureImageUrl` |
| `content` |
| `excerpt` |
| `publishedAt` |
| `updatedAt` |
| `metaTitle` |
| `metaDescription` |
| `focusKeyphrase` |
| `canonicalUrl` |
| `noIndex` |
| `noFollow` |
| `ogTitle` |
| `ogDescription` |
| `ogImageUrl` |
| `seoScore` |

Jika data tidak ditemukan, API mengembalikan error `404` dengan pesan `Page not found`.

---

## Admin API

Base route:

```http
/v1/admin/pages
```

Role guard:

```ts
requireRole("super_admin", "admin_campaign")
```

Catatan: guard ini dipasang di `apps/api/src/routes/admin/pages.ts`, dan route parent juga memasang guard untuk `/pages/*` di `apps/api/src/routes/admin/index.ts`.

### Endpoint

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/v1/admin/pages` | List pages dengan search, status, pagination |
| `GET` | `/v1/admin/pages/:id` | Detail page lengkap |
| `POST` | `/v1/admin/pages` | Create page |
| `PUT` | `/v1/admin/pages/:id` | Update page |
| `DELETE` | `/v1/admin/pages/:id` | Delete page permanen |

### Query List

| Query | Default | Implementasi |
|-------|---------|--------------|
| `search` | `""` | `ilike(title)` atau `ilike(slug)` |
| `status` | `all` | `all`, `published`, `draft` |
| `page` | `1` | minimum 1 |
| `limit` | `20` | min 1, max 100 |

List diurutkan berdasarkan:

```ts
desc(pages.updatedAt)
```

### Payload Create/Update

Validasi zod:

| Field | Aturan |
|-------|--------|
| `title` | trim, min 1 |
| `slug` | trim, min 1, regex slug |
| `featureImageUrl` | optional nullable string |
| `excerpt` | optional nullable string |
| `content` | min 1 |
| `isPublished` | optional boolean |
| `metaTitle` | optional nullable string, max 70 |
| `metaDescription` | optional nullable string, max 170 |
| `focusKeyphrase` | optional nullable string, max 100 |
| `canonicalUrl` | optional nullable string |
| `noIndex` | optional boolean |
| `noFollow` | optional boolean |
| `ogTitle` | optional nullable string, max 70 |
| `ogDescription` | optional nullable string, max 200 |
| `ogImageUrl` | optional nullable string |
| `seoScore` | optional integer 0-100 |

Slug regex:

```ts
/^[a-z0-9]+(?:-[a-z0-9]+)*$/
```

Validasi konten tidak cukup hanya string HTML. API menjalankan `hasMeaningfulContent()` dengan cara:

1. hapus tag HTML;
2. ubah `&nbsp;` menjadi spasi;
3. normalisasi whitespace;
4. wajib punya teks non-kosong.

### Publish/Draft Behavior

Create:

| Kondisi | `isPublished` | `publishedAt` |
|---------|---------------|---------------|
| payload `isPublished === true` | `true` | `now` |
| selain itu | `false` | `null` |

Update:

| Kondisi | `publishedAt` |
|---------|---------------|
| `isPublished === true` dan sebelumnya belum punya `publishedAt` | `now` |
| `isPublished === true` dan sudah punya `publishedAt` | tetap nilai lama |
| `isPublished === false` | `null` |
| `isPublished` tidak dikirim | tetap berdasarkan record lama |

### Duplicate Slug

Create dan update mengecek slug unik.

Jika duplicate:

```http
409 Conflict
```

Pesan:

```text
Slug sudah digunakan
```

### Delete

Delete adalah hard delete:

```ts
await db.delete(pages).where(eq(pages.id, id))
```

Tidak ada soft delete, archive, trash, atau redirect otomatis dari slug lama.

---

## Admin UI

Halaman admin:

| Route Admin | Fungsi |
|-------------|--------|
| `/dashboard/pages` | List, search, status filter, delete |
| `/dashboard/pages/create` | Create page |
| `/dashboard/pages/[id]/edit` | Edit page |

Guard di UI:

```ts
user.roles includes "super_admin" || "admin_campaign"
```

Jika tidak punya role, UI menampilkan pesan tidak memiliki akses. Server API tetap menjadi guard utama.

### List UI

`apps/admin/src/app/dashboard/pages/page.tsx`:

- memakai React Query key `["admin-pages", search, status, page]`;
- memanggil `GET /admin/pages`;
- limit selalu `20`;
- filter status: `all`, `published`, `draft`;
- search by judul atau slug;
- thumbnail memakai `featureImageUrl` langsung;
- delete memakai modal konfirmasi custom;
- pagination hanya previous/next, bukan komponen `Pagination`.

### Create/Edit UI

`PageForm` mengelola:

- title;
- slug;
- excerpt;
- rich text content;
- feature image;
- publish status;
- SEO panel.

Slug otomatis dibuat dari title selama belum diedit manual:

```ts
value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, "")
  .replace(/[\s_-]+/g, "-")
  .replace(/^-+|-+$/g, "")
```

Tombol submit:

| Tombol | Mode | Efek |
|--------|------|------|
| `Simpan Draft` | `draft` | kirim `isPublished: false` |
| `Publish` | `publish` | kirim `isPublished: true` |

### Media Library

Feature image dipilih via `MediaLibrary`. Nilai yang disimpan di `featureImageUrl` adalah URL/path dari media library.

Detail upload, varian gambar, fallback local/GCS, dan gap keamanan upload dicatat di `arsitektur-media.md`.

### SEO Panel

`SEOPanel` dipakai langsung di form page dengan:

```ts
entityType="page"
```

`SEOPanel` menghitung dan mengirim:

- `metaTitle`;
- `metaDescription`;
- `focusKeyphrase`;
- `canonicalUrl`;
- `noIndex`;
- `noFollow`;
- `ogTitle`;
- `ogDescription`;
- `ogImageUrl`;
- `seoScore`.

Detail scoring dan metadata lintas entity dicatat di `arsitektur-seo.md`.

---

## Public Web Rendering

Route:

```text
apps/web/src/app/page/[slug]/page.tsx
```

Behavior:

1. `params.slug` diambil dari URL.
2. Web memanggil `fetchPageBySlug(slug)`.
3. Jika API error, route memanggil `notFound()`.
4. Jika berhasil, halaman render Header, Breadcrumb, article content, sidebar, Footer.
5. `content` dirender dengan:

```tsx
dangerouslySetInnerHTML={{ __html: page.content }}
```

### Layout Public Page

Struktur public page:

| Area | Isi |
|------|-----|
| Header | Komponen global `Header` |
| Breadcrumb | Beranda > judul page |
| Article | H1, feature image, HTML content |
| Sidebar | Program Lainnya, Zakat Lainnya, Qurban Lainnya |
| Footer | Komponen global `Footer` |

### Sidebar Discovery

Public page mengambil data tambahan:

| Sidebar | Source |
|---------|--------|
| Program Lainnya | `fetchCampaigns({ status: "active", limit: 100 })`, sort lokal, ambil 5 |
| Zakat Lainnya | `fetchZakatTypes()`, filter `isActive`, sort `displayOrder/name`, ambil 5 |
| Qurban Lainnya | `fetchActivePeriods()`, pilih active period/period pertama, `fetchPackagesByPeriod()`, ambil 5 |

Jika sidebar gagal dimuat, error hanya dicatat ke console:

```ts
console.error("Failed to load sidebar page links:", error)
```

Konten page tetap dirender.

### Image URL

Feature image di-normalisasi dengan:

```ts
getImageUrl(page.featureImageUrl)
```

Sidebar campaign/zakat/qurban mencoba memakai varian square dengan mengganti suffix:

```ts
-(thumbnail|medium|large|square|original).webp -> -square.webp
```

---

## Metadata SEO

`generateMetadata()` untuk `/page/[slug]` mengambil:

1. page detail;
2. SEO settings global.

Mapping metadata:

| Metadata | Source |
|----------|--------|
| title | `page.metaTitle || page.title` |
| description | `page.metaDescription || page.excerpt || page.title` |
| canonical | `page.canonicalUrl || {APP_URL}/page/{slug}` |
| OG image | `page.ogImageUrl || page.featureImageUrl || settings.og_image || /og-image.jpg` |
| OG title | `page.ogTitle || seoTitle` |
| OG description | `page.ogDescription || seoDescription` |
| robots index | `!page.noIndex` |
| robots follow | `!page.noFollow` |
| keywords | split `focusKeyphrase` by comma |
| twitter card | `summary_large_image` |

Structured data:

| JSON-LD | Lokasi |
|---------|--------|
| `BreadcrumbList` | `generateMetadata()` dan render body |
| `Article` | `generateMetadata()` dibuat sebagai object tetapi tidak dikembalikan ke Next metadata |
| `WebPage` | dirender sebagai script JSON-LD di body |

Gap: `articleJsonLd` dibuat di `generateMetadata()`, tetapi tidak dipakai dalam return metadata ataupun dirender sebagai script. Yang benar-benar dirender pada body adalah `BreadcrumbList` dan `WebPage`.

---

## Sitemap, Discovery, dan URL Autocomplete

### Sitemap

`apps/web/src/app/sitemap.ts` memanggil:

```http
GET /v1/pages
```

Lalu membuat URL:

```text
{APP_URL}/page/{slug}
```

Catatan:

1. Karena `/v1/pages` hanya mengembalikan published pages, draft tidak masuk sitemap.
2. Karena `/v1/pages` tidak mengembalikan `noIndex`, sitemap tidak bisa memfilter `noIndex`.
3. `lastModified` memakai `updatedAt` jika ada di data, tetapi public list saat ini tidak mengembalikan `updatedAt`; fallback memakai `new Date()`.

### URL Autocomplete Admin

`apps/admin/src/lib/url-registry.ts` juga memanggil:

```http
GET /v1/pages
```

Hasilnya dimasukkan sebagai opsi:

```text
/page/{slug}
```

Kategori:

```text
Pages
```

Dipakai untuk autocomplete URL internal di admin.

### Search

CMS pages tidak masuk `GET /v1/search`. Search public saat ini hanya mencakup campaigns dan users pada route search utama.

Gap: jika halaman CMS semakin banyak, belum ada search page/title/content yang mencakup tabel `pages`.

---

## Documentation Center Bukan Pages CMS

Route:

```text
/documentation
/documentation/[slug]
```

Source:

```text
apps/web/src/content/documentation/**
```

Karakteristik:

1. Konten documentation disimpan sebagai TypeScript static content, bukan tabel `pages`.
2. Manifest berada di `apps/web/src/content/documentation/manifest.ts`.
3. Dynamic params dibuat dari `getAllDocumentationSlugs()`.
4. Metadata route documentation berasal dari `page.title` dan `page.summary`.
5. Tidak ada admin CRUD untuk documentation center.
6. Tidak memakai `/v1/pages`.

Karena itu, documentation center tidak boleh dianggap sebagai bagian dari Pages CMS. Source of truth detailnya ada di `docs/arsitektur-documentation-center.md`.

---

## Security Boundary

Konten page adalah HTML dari admin `RichTextEditor`, lalu dirender di web dengan `dangerouslySetInnerHTML`.

Implikasi:

1. Admin yang boleh membuat/edit page adalah trust boundary utama.
2. API hanya mengecek konten meaningful; tidak terlihat sanitasi HTML server-side di route pages.
3. Jika editor atau payload API bisa memasukkan script/handler berbahaya, public route berisiko XSS.
4. `featureImageUrl`, `ogImageUrl`, dan `canonicalUrl` disimpan sebagai string; validasi URL masih minimal.
5. Public API detail tidak butuh auth, tetapi hanya published page yang bisa diambil.

Rekomendasi keamanan dicatat juga di `arsitektur-security.md`.

---

## Cache dan Performance

Web service pages:

```ts
fetch(`${API_URL}/pages`, { cache: "no-store" })
fetch(`${API_URL}/pages/${slug}`, { cache: "no-store" })
```

Implikasi:

1. Public page detail tidak memanfaatkan ISR/cache Next.js.
2. Setiap request page detail memanggil API.
3. Sidebar juga memanggil campaign, zakat, dan qurban APIs.
4. Sitemap dynamic fetch bisa menghasilkan `lastModified` fallback waktu request karena public list tidak mengembalikan `updatedAt`.
5. Tidak ada invalidation explicit setelah admin update page.

Detail cache lintas aplikasi dicatat di `arsitektur-cache-performance.md`.

---

## Gap Implementasi yang Tercatat

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| Public list `/v1/pages` tidak mengembalikan `updatedAt`, `noIndex`, `noFollow` | Sitemap tidak akurat untuk `lastModified` dan tetap bisa memasukkan page `noIndex` | Tambah field minimal untuk sitemap atau buat endpoint khusus sitemap |
| `noIndex` tidak mencegah detail page dibuka | Ini normal untuk SEO, tetapi perlu dipahami: noindex bukan access control | Dokumentasikan di UI/admin |
| Tidak ada sanitasi HTML server-side yang jelas pada content | Risiko XSS jika payload HTML berbahaya lolos dari editor/API | Tambah sanitizer server-side atau whitelist HTML saat save/render |
| `dangerouslySetInnerHTML` langsung render DB content | Blast radius XSS ada di public web | Ikat dengan sanitizer dan regression test |
| Delete page hard delete | Link lama bisa 404 tanpa redirect | Tambah soft delete/archive/redirect jika kebutuhan SEO meningkat |
| Slug update tidak membuat redirect | Backlink lama hilang | Tambah tabel redirect atau slug history |
| `/v1/pages` tanpa pagination | Aman untuk jumlah kecil, buruk jika page bertambah banyak | Tambah pagination untuk admin/public atau endpoint sitemap |
| CMS pages tidak masuk search public | Halaman editorial tidak discoverable via search | Tambah pages ke search/discovery jika konten bertambah |
| Sidebar public page fetch banyak domain setiap request | Latency page meningkat dan bergantung banyak API | Cache/ISR atau komponen sidebar terpisah dengan fallback |
| `articleJsonLd` dibuat tetapi tidak dirender | Structured data Article tidak aktif | Render Article JSON-LD atau hapus kode mati |
| Admin list tidak memakai komponen `Pagination` standar | UX/pola pagination beda dari admin lain | Samakan dengan `apps/admin/src/components/Pagination.tsx` |
| `canonicalUrl`, `featureImageUrl`, `ogImageUrl` validasi URL minimal | Bisa menyimpan URL tidak valid atau tidak diinginkan | Tambah validasi URL dan policy domain |

---

## Rekomendasi Arsitektur

1. **Tetapkan Pages CMS sebagai content DB resmi untuk halaman editorial publik.** Jangan campur dengan `settings.seo_pages` yang hanya untuk metadata homepage/arsip.
2. **Tambah endpoint sitemap khusus pages** atau perluas `/v1/pages` dengan `updatedAt`, `noIndex`, `noFollow` agar sitemap bisa akurat tanpa membuka content penuh.
3. **Tambahkan sanitasi HTML server-side** sebelum simpan atau sebelum render. Editor client-side tidak cukup sebagai kontrol keamanan.
4. **Tambahkan redirect/slug history** sebelum CMS dipakai intensif untuk halaman SEO bernilai tinggi.
5. **Pertimbangkan ISR/revalidate untuk `/page/[slug]`** setelah ada strategi invalidation dari admin update.
6. **Masukkan pages ke search jika jumlah konten editorial bertambah**, minimal search title/excerpt, bukan langsung full HTML mentah.
7. **Standarkan admin pagination** dengan komponen `Pagination` agar konsisten dengan halaman admin lain.
8. **Pisahkan dokumentasi operasional `/documentation` dari CMS pages** karena source datanya static TypeScript, bukan database.
9. **Tambahkan audit log untuk create/update/delete pages** jika page CMS dipakai untuk konten publik sensitif.
10. **Tambahkan preview draft** dengan token/guard bila editor butuh review sebelum publish.

---

## Contract yang Harus Dijaga

1. Public URL CMS page selalu berbentuk `/page/{slug}`.
2. Public API hanya menampilkan page dengan `isPublished = true`.
3. Admin CRUD hanya untuk role `super_admin` dan `admin_campaign`.
4. `slug` harus lowercase alphanumeric dengan hyphen, tanpa slash.
5. `content` disimpan sebagai HTML string.
6. SEO field pages disimpan langsung di tabel `pages`, bukan di `settings`.
7. Documentation center `/documentation` tidak boleh bergantung pada tabel `pages`.
8. `noIndex` dan `noFollow` adalah instruksi crawler, bukan mekanisme privasi.
