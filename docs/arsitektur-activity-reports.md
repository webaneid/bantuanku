# Arsitektur Activity Reports

Dokumen ini adalah source of truth untuk modul activity reports / laporan kegiatan. Semua klaim di bawah disesuaikan dengan implementasi kode aktual, bukan blueprint lama.

## Ruang Lingkup Implementasi

Activity reports adalah laporan naratif kegiatan yang dapat dikaitkan ke beberapa domain bisnis:

| Reference Type | Target Implementasi | Pemakaian Utama |
|---|---|---|
| `campaign` | Campaign/program donasi | Tab update di detail program dan daftar laporan kampanye |
| `zakat_period` | Periode zakat | Tab kegiatan di laporan publik zakat |
| `zakat_disbursement` | Penyaluran zakat | Laporan kegiatan khusus distribusi zakat |
| `qurban_period` | Periode qurban | Tab kegiatan di laporan publik qurban |

File implementasi utama:

| Area | File |
|---|---|
| Schema DB | `packages/db/src/schema/activity-report.ts` |
| Admin API | `apps/api/src/routes/admin/activity-reports.ts` |
| Public API activity reports | `apps/api/src/routes/activity-reports-public.ts` |
| Public stats integration | `apps/api/src/routes/public-stats.ts` |
| Admin list/create/detail/edit | `apps/admin/src/app/dashboard/activity-reports/*` |
| Admin campaign/zakat/qurban detail tab | `apps/admin/src/app/dashboard/campaigns/[id]/page.tsx`, `apps/admin/src/app/dashboard/zakat/periods/[id]/page.tsx`, `apps/admin/src/app/dashboard/qurban/periods/[id]/page.tsx` |
| Public archive/detail | `apps/web/src/app/laporan/page.tsx`, `apps/web/src/app/laporan/[slug]/page.tsx` |
| Public campaign tab | `apps/web/src/app/program/[slug]/CampaignTabs.tsx` |
| Public zakat/qurban report tab | `apps/web/src/app/zakat/laporan/*`, `apps/web/src/app/qurban/laporan/*` |
| Duplicate cleanup | `packages/db/scripts/cleanup-duplicate-activity-reports.ts`, `packages/db/scripts/preview-duplicate-activity-reports.sql` |

Dokumen terkait yang wajib dirujuk ketika mengubah modul ini:

| Arsitektur Terkait | Alasan Keterkaitan |
|---|---|
| `docs/arsitektur-auth.md` | Role guard admin activity reports |
| `docs/arsitektur-program-coordinator.md` | Scoped access coordinator dan gap ownership update |
| `docs/arsitektur-donasi.md` | Reference `campaign` dan tab update campaign |
| `docs/arsitektur-zakat.md` | Reference `zakat_period` dan `zakat_disbursement` |
| `docs/arsitektur-qurban.md` | Reference `qurban_period` dan laporan kegiatan qurban |
| `docs/arsitektur-laporan.md` | Integrasi laporan publik/statistik zakat dan qurban |
| `docs/arsitektur-media.md` | Gallery, Media Library, image variant |
| `docs/arsitektur-seo.md` | SEO panel, canonical, robots, OG metadata |
| `docs/arsitektur-cache-performance.md` | Public archive/detail memakai `revalidate=300` dan API route belum punya server cache |
| `docs/arsitektur-alamat.md` | AddressForm dan tabel alamat Indonesia |
| `docs/arsitektur-notifikasi.md` | WhatsApp broadcast saat laporan dipublish |
| `docs/arsitektur-komponen-admin.md` | Form, modal, feedback dialog, table/card admin |
| `docs/arsitektur-komponen-web.md` | Komponen public web, cards, tabs, archive/detail |

## Model Data

Tabel utama adalah `activity_reports`.

| Kolom | Tipe Implementasi | Catatan |
|---|---|---|
| `id` | `text` | Primary key, default `createId()` |
| `reference_type` | `text not null` | Tidak ada DB enum; validasi enum ada di API admin |
| `reference_id` | `text not null` | ID target polymorphic |
| `reference_name` | `text` | Snapshot nama target untuk tampilan |
| `title` | `text not null` | Judul laporan |
| `slug` | `text unique not null` | Dibuat dari title, unik dengan suffix angka saat create/update admin |
| `activity_date` | `timestamp with time zone` | Tanggal kegiatan |
| `description` | `text not null` | HTML dari RichTextEditor |
| `gallery` | `jsonb string[]` | Default `[]`, maksimal 20 di validasi API |
| `video_url` | `text` | Optional URL, UI hanya embed YouTube |
| `type_specific_data` | `jsonb` | Struktur dinamis sesuai reference type |
| `detail_address` | `text` | Detail alamat bebas |
| `province_code` / `regency_code` / `district_code` / `village_code` | `text` FK | Mengarah ke tabel alamat Indonesia |
| `status` | `text not null` | Nilai implementasi: `draft`, `published` |
| `published_at` | `timestamp with time zone` | Diisi saat status published; dikosongkan saat unpublish |
| `created_by` | `text` FK users | Creator laporan |
| `created_at` / `updated_at` | timestamp | Audit timestamp |
| `campaign_id` | `text` | Legacy backward compatibility, tidak lagi wajib |
| SEO fields | mixed | `focus_keyphrase`, `meta_title`, `meta_description`, `canonical_url`, `no_index`, `no_follow`, `og_title`, `og_description`, `og_image_url`, `seo_score` |

Migrasi historis yang masih relevan:

| Migrasi | Fungsi |
|---|---|
| `0008_create_activity_reports.sql` | Membuat tabel awal berbasis campaign |
| `071_universal_activity_reports.sql` | Menambah `reference_type`, `reference_id`, `reference_name`, `video_url`, `type_specific_data`; membuat `campaign_id` nullable |
| `106_update_activity_reports_address.sql` | Menambah integrasi alamat Indonesia |
| `113_add_slug_to_activity_reports.sql` | Menambah slug unik untuk URL publik |
| `114_add_seo_fields_to_activity_reports.sql` | Menambah field SEO |

Catatan: `packages/db/migrate-activity-reports.mjs` adalah script lama hardcoded ke database lokal dan masih mencerminkan tabel awal berbasis `campaign_id`. Script ini bukan source of truth arsitektur saat ini.

## Type Specific Data

`type_specific_data` tidak memiliki schema DB tetap. Bentuk yang dipakai UI admin:

| Reference Type | Field yang Dipakai |
|---|---|
| `campaign` | `beneficiary_count` |
| `zakat_period` | `recipient_count`, `distribution_areas` |
| `zakat_disbursement` | `recipient_count` |
| `qurban_period` | `animals_by_type.kambing`, `animals_by_type.sapi`, `animals_by_type.domba`, `total_animals`, `total_recipients` |

Pada create report qurban, admin UI mengambil detail periode qurban dan mengisi awal `animals_by_type` serta `total_animals` dari statistik periode jika `typeSpecificData` masih kosong. Edit report tidak melakukan autofill ulang dari detail qurban.

## Admin API

Base route: `/v1/admin/activity-reports`.

| Endpoint | Role | Perilaku |
|---|---|---|
| `GET /` | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator` | List semua laporan sesuai filter. `program_coordinator` hanya melihat laporan miliknya. |
| `GET /:id` | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator` | Detail laporan. `program_coordinator` hanya bisa melihat laporan miliknya. |
| `POST /` | `super_admin`, `admin_campaign`, `program_coordinator` | Membuat laporan, generate slug unik, set `published_at` jika langsung published. |
| `PUT /:id` | `super_admin`, `admin_campaign`, `program_coordinator` | Update field laporan, regenerate slug jika title berubah, publish/unpublish. |
| `DELETE /:id` | `super_admin`, `admin_campaign` | Hard delete row laporan. |

Filter `GET /`:

| Query | Fungsi |
|---|---|
| `reference_type` | Filter by reference type |
| `reference_id` | Filter by target ID |
| `status` | Filter `draft` / `published` |

Tidak ada pagination server di admin list. Admin UI mengambil semua data lalu melakukan pagination client-side 10 item per halaman.

Validasi create/update:

| Field | Aturan |
|---|---|
| `referenceType` | `campaign`, `zakat_period`, `zakat_disbursement`, `qurban_period` |
| `referenceId` | Required string |
| `title` | 10 sampai 200 karakter |
| `activityDate` | Required string |
| `description` | Minimal 50 karakter |
| `gallery` | Array string maksimal 20 |
| `videoUrl` | Optional URL, empty string diubah menjadi undefined |
| `status` | Optional `draft` / `published` |
| SEO | Panjang `metaTitle`/`ogTitle` max 70, `metaDescription`/`ogDescription` max 160 |
| Address | `detailAddress`, kode wilayah optional/nullable |

`postalCode` diterima oleh schema request karena dipakai `AddressForm`, tetapi tidak disimpan ke tabel `activity_reports`. Postal code yang terlihat di detail berasal dari join `village.postalCode`.

## Publish dan Notifikasi

Saat laporan dibuat langsung `published`, atau status berubah dari non-published ke `published`, API mencoba mengirim WhatsApp bulk notification.

Sumber penerima:

1. Ambil transaksi dengan `transactions.productId = report.referenceId`.
2. Filter `paymentStatus = "paid"`.
3. Ambil nomor telepon donor unik.
4. Kirim template `wa_tpl_report_published`.

Variabel template:

| Variable | Sumber |
|---|---|
| `customer_name` | Nama donor |
| `product_name` | `referenceName` atau `referenceId` |
| `report_title` | Judul laporan |
| `report_date` | `activityDate` format Indonesia |
| `report_description` | HTML description di-strip dan dipotong 200 karakter |
| `report_url` | `${frontendUrl}/laporan/${slug}` |

Kegagalan WhatsApp hanya dicatat ke log. Create/update laporan tetap sukses.

Risiko implementasi: lookup penerima memakai `transactions.productId = referenceId`. Ini cocok untuk sebagian flow, tetapi bisa tidak lengkap untuk `zakat_period`, `zakat_disbursement`, atau `qurban_period` jika transaksi memakai product ID lain seperti package period atau campaign terkait.

## Admin Frontend

### List

File: `apps/admin/src/app/dashboard/activity-reports/page.tsx`.

Perilaku:

- Fetch `/admin/activity-reports` dengan filter `reference_type` dan `status`.
- Pagination dilakukan client-side, 10 item per halaman.
- Desktop memakai table, mobile memakai card.
- Action: view, edit, delete.
- UI tidak menyembunyikan semua action berdasarkan role; pembatas utama tetap di server.

### Create

File: `apps/admin/src/app/dashboard/activity-reports/create/page.tsx`.

Komponen utama:

| Komponen | Fungsi |
|---|---|
| `Autocomplete` | Memilih target reference |
| `RichTextEditor` | Mengisi HTML description |
| `MediaLibrary` | Memilih gambar gallery |
| `AddressForm` | Mengisi alamat Indonesia |
| `SEOPanel` | Mengisi metadata SEO |
| `FeedbackDialog` | Feedback sukses/error submit |

Reference list yang diambil:

| Reference Type | Endpoint Admin |
|---|---|
| `campaign` | `GET /admin/campaigns` |
| `zakat_period` | `GET /admin/zakat/periods` |
| `zakat_disbursement` | `GET /admin/disbursements?disbursement_type=zakat_distribution` |
| `qurban_period` | `GET /admin/qurban/periods` dan detail `GET /admin/qurban/periods/:id/detail` |

Gallery memakai `MediaLibrary` dengan `category="general"` dan `accept="image/*"`. Ini berarti foto laporan kegiatan saat ini tersimpan sebagai kategori media umum, bukan kategori khusus activity report.

### Edit

File: `apps/admin/src/app/dashboard/activity-reports/[id]/edit/page.tsx`.

Edit memuat data detail dari `/admin/activity-reports/:id`, lalu mengirim full payload ke `PUT /admin/activity-reports/:id`. Address dan SEO dipopulasi dari response detail. Edit tidak melakukan autofill ulang statistik qurban seperti create.

### Detail

File: `apps/admin/src/app/dashboard/activity-reports/[id]/page.tsx`.

Detail admin menampilkan:

- Info reference, tanggal, creator, status.
- Tombol publish/unpublish lewat `PUT /admin/activity-reports/:id`.
- Lokasi dari join alamat.
- Type-specific stats.
- HTML description via `dangerouslySetInnerHTML`.
- YouTube embed jika URL bisa diparse.
- Gallery grid dan lightbox.
- Delete hard delete lewat API.

## Public API

Base route: `/v1/activity-reports`.

| Endpoint | Perilaku |
|---|---|
| `GET /` | List published dengan pagination, filter optional `reference_type`, hanya `noIndex=false`. |
| `GET /by-slug/:slug` | Detail by slug, hanya `status=published`; tidak memfilter `noIndex=false`. |
| `GET /:id` | Detail by ID, hanya `status=published`; tidak memfilter `noIndex=false`. |
| `GET /campaign/:campaignId` | List laporan campaign, `status=published`, `noIndex=false`, cocok via `referenceType/referenceId` atau legacy `campaignId`. |

Response list `/` membungkus data dan pagination di dalam `data`:

```json
{
  "success": true,
  "data": {
    "data": [],
    "pagination": {}
  }
}
```

Public detail by slug/by id tetap dapat melayani laporan `noIndex=true`. Ini selaras dengan konsep SEO: halaman masih bisa dibuka, tetapi metadata robots harus memberi `noindex`.

## Public Web

### Archive `/laporan`

File: `apps/web/src/app/laporan/page.tsx`.

Perilaku:

- Server component.
- Fetch `GET /activity-reports?page={page}&limit=12` dengan `revalidate=300`.
- Menampilkan archive card 3 kolom desktop.
- Thumbnail dari item pertama `gallery`.
- Label reference type:
  - `campaign` -> Program
  - `zakat_period` -> Zakat
  - `zakat_disbursement` -> Penyaluran Zakat
  - `qurban_period` -> Qurban
- Excerpt dibuat dengan strip HTML.
- Lokasi memakai `regencyName` dan `provinceName`.
- Pagination via query `?page=`.
- Metadata halaman paginated `page > 1` diberi robots noindex dan canonical tetap `/laporan`.

### Detail `/laporan/[slug]`

File: `apps/web/src/app/laporan/[slug]/page.tsx` dan `LaporanDetailClient.tsx`.

Perilaku:

- Fetch `GET /activity-reports/by-slug/:slug` dengan `revalidate=300`.
- Metadata memakai field SEO dari report jika tersedia.
- Fallback OG image: `ogImageUrl`, lalu gallery pertama, lalu setting `og_image`, lalu `/og` (route dinamis `next/og`).
- Robots mengikuti `noIndex` dan `noFollow`.
- Canonical memakai `canonicalUrl` jika ada; jika tidak, kode mencoba infer canonical dari title.
- Jika canonical URL berbeda dari URL saat ini, halaman melakukan `permanentRedirect(canonicalUrl)`.
- Detail menampilkan badge reference type, tanggal, judul, reference name, address, type-specific summary, HTML description, YouTube embed, gallery lightbox, dan link kembali ke archive.

Risiko canonical: infer canonical dapat mengarahkan slug bersuffix ke slug hasil normalisasi title. Jika slug tujuan tidak benar-benar ada, redirect bisa menuju URL yang tidak punya data. Script cleanup duplicate mengurangi risiko ini dengan mengisi `canonicalUrl` eksplisit ke slug preferred.

### Campaign Detail Tab

File: `apps/web/src/app/program/[slug]/CampaignTabs.tsx`.

Tab `updates` mengambil `GET /activity-reports/campaign/:campaignId?limit=50`, lalu menampilkan timeline activity reports campaign. Konten yang dirender mencakup tanggal, judul, lokasi, `beneficiary_count`, HTML description, YouTube embed, gallery, dan lightbox.

### Zakat dan Qurban Public Report

File terkait:

- `apps/web/src/app/zakat/laporan/page.tsx`
- `apps/web/src/app/qurban/laporan/page.tsx`
- `apps/web/src/services/public-reports.ts`
- `apps/api/src/routes/public-stats.ts`

Integrasi:

| Page | API | Activity Filter |
|---|---|---|
| `/zakat/laporan` tab kegiatan | `/public-stats/zakat-report` dan `/public-stats/zakat-activities` | `status=published`, `referenceType=zakat_period` |
| `/qurban/laporan` tab kegiatan | `/public-stats/qurban-report` dan `/public-stats/qurban-activities` | `status=published`, `referenceType=qurban_period` |

Tabel kegiatan zakat/qurban mengambil daftar ringkas dari public-stats. Saat user membuka detail, komponen mengambil detail penuh via `GET /activity-reports/:id` dan menampilkan modal, bukan link ke `/laporan/:slug`.

## SEO, Media, Address, dan Related Architecture

Activity reports tidak berdiri sendiri. Aturan domain berikut harus mengikuti dokumen arsitektur terkait:

| Area | Implementasi di Activity Reports | Rujukan |
|---|---|---|
| SEO | `SEOPanel`, meta fields, canonical, noindex/nofollow, OG image | `docs/arsitektur-seo.md` |
| Media | `MediaLibrary`, gallery URL array, image variant, lightbox | `docs/arsitektur-media.md` |
| Address | `AddressForm`, join province/regency/district/village | `docs/arsitektur-alamat.md` |
| Auth | Role guard API admin dan pembatas coordinator | `docs/arsitektur-auth.md` |
| Notification | WhatsApp broadcast saat publish | `docs/arsitektur-notifikasi.md` |
| Reports | Public stats zakat/qurban dan tab kegiatan | `docs/arsitektur-laporan.md` |
| Campaign | Activity updates pada detail program | `docs/arsitektur-donasi.md` |
| Zakat | Periode zakat dan penyaluran zakat | `docs/arsitektur-zakat.md` |
| Qurban | Periode qurban dan statistik qurban | `docs/arsitektur-qurban.md` |

## Duplicate Cleanup

Duplikasi laporan published dikelola oleh:

- `packages/db/scripts/preview-duplicate-activity-reports.sql`
- `packages/db/scripts/cleanup-duplicate-activity-reports.ts`

Kunci grouping duplicate:

```text
referenceType :: referenceId :: normalizedTitle
```

Pemilihan canonical:

1. Jika ada report dengan slug persis sama dengan normalized title, pilih itu.
2. Jika tidak ada, pilih report dengan `publishedAt` paling awal.
3. Jika masih sama, pilih `createdAt` paling awal.

Mode default script TypeScript adalah dry run. Jika dijalankan dengan `--apply`, duplicate akan diberi:

- `canonicalUrl = {FRONTEND_URL}/laporan/{preferred.slug}`
- `noIndex = true`
- `updatedAt = now`

## Gap Implementasi yang Harus Dicatat

| Gap | Dampak | Rekomendasi |
|---|---|---|
| `reference_type` dan `status` hanya `text` di DB | Data invalid bisa masuk dari luar API admin | Tambahkan DB check constraint atau enum migration setelah nilai final stabil |
| Admin list tidak punya server pagination | Data besar akan berat di admin | Tambahkan `page`, `limit`, count query di API admin |
| `program_coordinator` dibatasi di list/get, tetapi `PUT /:id` belum cek ownership | Coordinator yang tahu ID bisa update laporan orang lain | Tambahkan ownership guard di PUT seperti GET |
| Komentar route admin menyebut `mitra` dapat activity reports, tetapi route activity reports tidak menerima role `mitra` | Dokumentasi kode internal membingungkan | Koreksi komentar atau tambah role sesuai keputusan produk |
| Create/update publish reset `publishedAt` saat unpublish/republish | Riwayat tanggal publish pertama hilang | Pisahkan `firstPublishedAt` dan `publishedAt`, atau jangan kosongkan saat unpublish |
| Broadcast WA memakai `transactions.productId = referenceId` | Donor non-campaign bisa tidak terjangkau | Buat resolver donor per reference type |
| Gallery memakai kategori media `general` | Tidak ada segmentasi media activity report | Tambahkan kategori `activity_report` jika dibutuhkan di Media Library |
| Frontend create tidak mencegah gallery > 20 sebelum submit | User baru tahu error setelah API reject | Tambahkan batas visual dan disabled state di UI |
| Description HTML disimpan dan dirender via `dangerouslySetInnerHTML` | Risiko XSS jika sanitasi editor/API tidak cukup | Tambahkan sanitasi server-side untuk HTML yang disimpan atau dirender |
| Non-YouTube `videoUrl` valid di API tetapi tidak tampil di public detail | User mengira semua URL video didukung | Batasi validasi ke YouTube atau tampilkan fallback link |
| Create qurban autofill stats, edit tidak | Perilaku form tidak konsisten | Tambahkan autofill opsional di edit saat reference qurban berubah |
| `postalCode` diterima request tapi tidak disimpan | Data input bisa hilang | Jelaskan UI bahwa postal code dari village, atau simpan kolom khusus jika perlu |
| `getImageUrlByVariant` di sebagian public UI bisa tidak cocok dengan pola nama variant media hyphen | Thumbnail bisa tidak berpindah ke variant optimal | Sinkronkan helper image dengan output media processor |
| `inferCanonicalReportUrl` bisa redirect ke slug yang tidak ada | Potensi redirect ke 404 | Prioritaskan `canonicalUrl` dari cleanup script, atau validasi existence sebelum redirect |
| Delete admin hard delete tanpa cleanup media | File media orphan tetap ada | Jika perlu, buat job cleanup media yang menghitung referensi silang |

## SOP Perubahan

1. Setiap penambahan reference type baru wajib memperbarui schema validasi admin API, UI create/edit, public label, public stats jika relevan, dan dokumen ini.
2. Jika field SEO berubah, update dokumen ini dan `docs/arsitektur-seo.md`.
3. Jika mekanisme media/gallery berubah, update dokumen ini dan `docs/arsitektur-media.md`.
4. Jika role berubah, update dokumen ini dan `docs/arsitektur-auth.md`.
5. Jika activity reports masuk ke laporan publik baru, update dokumen ini dan `docs/arsitektur-laporan.md`.
6. File lama hanya boleh dihapus setelah kontennya terbukti sudah terserap ke dokumen `arsitektur-*.md` dan sesuai implementasi kode aktual.
