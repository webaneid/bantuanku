# Arsitektur Activity Reports

Dokumen ini adalah source of truth untuk modul activity reports / laporan kegiatan. Semua klaim di bawah disesuaikan dengan implementasi kode aktual, bukan blueprint lama.

> **Konsumen bot WA (2026-10-31):** tool `get_info` (topik `laporan`) membaca laporan `status = published` dan `noIndex = false` (5 terbaru, judul + tanggal + tautan `/laporan/{slug}`). Lihat `arsitektur-wa-bot.md` bagian H2.

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
| Public archive/detail | `apps/web/src/app/laporan/page.tsx`, `apps/web/src/app/laporan/[slug]/page.tsx`, `LaporanDetailClient.tsx` |
| Tampilan mobile arsip `/laporan` (< md) | Daftar ringkas: thumbnail persegi 64px + judul (maks 2 baris) + meta kecil (tanggal singkat · kabupaten, fallback provinsi); badge jenis, nama referensi, dan deskripsi disembunyikan. md ke atas tetap grid kartu |
| Paginasi arsip `/laporan` | 12 laporan/halaman, `?page=N` (nilai tidak valid → halaman 1; di luar jangkauan → redirect ke halaman terakhir; halaman 1 = `/laporan` tanpa query). Memakai style `.pagination` bersama (seperti `/wakaf`): prev/next + nomor (pertama, terakhir, ±1, ellipsis); di mobile (< sm) diganti teks "Halaman X dari N". `rel=prev/next`, `aria-current`. Halaman > 1 `noindex` |
| Sitemap | `apps/web/src/app/sitemap.ts` (`fetchReportPages`, paginasi `limit=100`, skip `noIndex`) |
| Mekanisme terpisah (bukan modul ini) | `disbursement_activity_reports` + `/admin/disbursements/:id/activity-reports` — lihat § Mekanisme Terpisah |
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
| `slug` | `text unique not null` | Auto-generate unik dari title saat **create**. Saat **update**, slug **tidak** ikut berubah walau title berubah — hanya berubah lewat field `slug` eksplisit (tombol "Ubah URL" di admin edit, sama seperti campaign). |
| `activity_date` | `timestamp with time zone` | Tanggal kegiatan. Form mengirim `YYYY-MM-DD`; API menyimpannya via `new Date(str)` = 00:00 UTC (07:00 WIB, tanggal WIB sama). Form edit membaca `split("T")[0]` (bagian tanggal UTC). |
| `description` | `text not null` | HTML dari RichTextEditor |
| `gallery` | `jsonb string[]` | Default `[]`, maksimal 20 di validasi API |
| `video_url` | `text` | Optional URL, UI hanya embed YouTube |
| `type_specific_data` | `jsonb` | Struktur dinamis sesuai reference type |
| `detail_address` | `text` | Detail alamat bebas |
| `province_code` / `regency_code` / `district_code` / `village_code` | `text` FK | Mengarah ke tabel alamat Indonesia |
| `status` | `text not null` | Nilai implementasi: `draft`, `published` |
| `published_at` | `timestamp with time zone` | Diisi saat transisi ke `published` (create langsung published, atau update dari non-published). **Tidak** berubah saat edit laporan yang sudah published; dikosongkan saat unpublish |
| `created_by` | `text` FK users | Creator laporan |
| `created_at` / `updated_at` | `timestamp with time zone` | Audit timestamp |
| `campaign_id` | `text` | Legacy backward compatibility, tidak lagi wajib |
| SEO fields | mixed | `focus_keyphrase`, `meta_title`, `meta_description`, `canonical_url`, `no_index`, `no_follow`, `og_title`, `og_description`, `og_image_url`, `seo_score` |

Index (dari migrasi; tidak dideklarasikan di schema Drizzle): `activity_reports_status_idx`, `activity_reports_reference_idx (reference_type, reference_id)`, `activity_reports_activity_date_idx`, `idx_activity_reports_slug` (UNIQUE), serta index per kode alamat.

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
| `PUT /:id` | `super_admin`, `admin_campaign`, `program_coordinator` | Update parsial (hanya field yang dikirim). Title tidak lagi memicu regenerasi slug — slug hanya berubah lewat field `slug` eksplisit (validasi format + uniqueness, exclude diri sendiri, 409 jika bentrok). Publish/unpublish lewat `status`. `program_coordinator` hanya bisa update laporan miliknya sendiri (404 jika bukan milik sendiri, mirror guard `GET /:id`); `super_admin`/`admin_campaign` tidak dibatasi ownership. |
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
| `activityDate` | Required string yang bisa di-parse `Date.parse` (invalid → 400 "Tanggal kegiatan tidak valid") |
| `description` | Minimal 50 karakter |
| `gallery` | Array string maksimal 20 |
| `videoUrl` | Optional, nullable URL. `""` diubah menjadi `null`; pada `PUT`, `null`/`""` mengosongkan kolom, `undefined` (key tidak dikirim) membiarkan nilai lama |
| `status` | Optional `draft` / `published` |
| SEO | Panjang `metaTitle`/`ogTitle` max 70, `metaDescription`/`ogDescription` max 160 |
| Address | `detailAddress`, kode wilayah optional/nullable |

`referenceId` dan `referenceName` **tidak divalidasi** terhadap tabel target (ID fiktif diterima; `referenceName` adalah snapshot yang dikirim client). `typeSpecificData` hanya `z.record(z.any())`; karena form mengirim `undefined` saat kosong, isi lama tidak bisa dikosongkan lewat UI.

`postalCode` diterima oleh schema request karena dipakai `AddressForm`, tetapi tidak disimpan ke tabel `activity_reports`. Postal code yang terlihat di detail berasal dari join `village.postalCode`.

## Publish dan Notifikasi

Saat laporan dibuat langsung `published`, atau status berubah dari non-published ke `published` (termasuk **republish setelah unpublish**), API mengirim WhatsApp bulk notification **di background** (`setImmediate`, tidak menunggu `await` sebelum response — lihat CLAUDE.md lesson 2026-07-06 "Cron Endpoint Wajib Respond Segera", pola yang sama diterapkan di sini walau ini bukan cron). Template `wa_tpl_report_published` ada di settings.

Sumber penerima (helper `notifyReportPublished`, dipakai bersama oleh `POST` dan `PUT`):

1. Ambil transaksi dengan `transactions.productId = report.referenceId` dan `paymentStatus = "paid"`, `LEFT JOIN donatur` via `transactions.donaturId`.
2. **Lewati penerima yang `donatur.waOptOut = true`** (sejak 2026-09-22; sebelumnya tidak dicek sama sekali). Transaksi guest (`donaturId = null`, tidak match baris `donatur` manapun) tetap dikirimi — mereka tidak punya akun untuk opt-out.
3. Ambil nomor telepon donor unik (dedup berdasarkan `donorPhone`).
4. Kirim template `wa_tpl_report_published`.

Diverifikasi (2026-09-22): (a) query SQL join+filter langsung di database — donatur `waOptOut=true` terkecualikan, donatur aktif dan transaksi guest tetap lolos; (b) alur penuh via API dengan `whatsapp_enabled` dimatikan sementara — tidak ada exception di log server. Belum diverifikasi dengan gateway WA yang benar-benar mengirim (disengaja, untuk menghindari pesan nyata ke nomor uji saat audit).

Variabel template:

| Variable | Sumber |
|---|---|
| `customer_name` | Nama donor |
| `product_name` | `referenceName` (string kosong jika null; **tidak** fallback ke `referenceId`) |
| `report_title` | Judul laporan |
| `report_date` | `activityDate` format Indonesia |
| `report_description` | HTML description di-strip dan dipotong 200 karakter |
| `report_url` | `${frontendUrl}/laporan/${slug}` |

Kegagalan WhatsApp hanya dicatat ke log (`console.error`, `setImmediate` callback). Create/update laporan tetap sukses — response HTTP tidak pernah menunggu pengiriman WA selesai.

Karakteristik implementasi yang masih berbeda dari `arsitektur-wa-community-care.md` (opt-out dan blocking sudah diperbaiki 2026-09-22; sisanya belum):

- Deduplikasi penerima berdasarkan string nomor mentah (tanpa normalisasi).
- Tidak ada log pengiriman/anti-spam seperti `wa_broadcast_logs`; unpublish → publish ulang mengirim ulang ke semua donor yang masih memenuhi syarat.
- Tidak ada mekanisme retry atau visibilitas admin atas kegagalan kirim (hanya masuk server log).

Risiko implementasi: lookup penerima memakai `transactions.productId = referenceId`. Ini cocok untuk sebagian flow, tetapi bisa tidak lengkap untuk `zakat_period`, `zakat_disbursement`, atau `qurban_period` jika transaksi memakai product ID lain seperti package period atau campaign terkait.

## Admin Frontend

### List

File: `apps/admin/src/app/dashboard/activity-reports/page.tsx`.

Perilaku:

- Fetch `/admin/activity-reports` dengan filter `reference_type` dan `status`.
- Pagination dilakukan client-side, 10 item per halaman.
- Desktop memakai table, mobile memakai card.
- Action: view, edit, delete.
- UI tidak menyembunyikan action berdasarkan role (tombol Hapus tampil untuk semua peran; server menolak `program_coordinator` dengan 403); pembatas utama tetap di server.
- Menu sidebar "Laporan Kegiatan" (`Sidebar.tsx`) memakai `roles: ["super_admin", "admin_campaign", "admin_finance", "program_coordinator"]` (sebelum 2026-09-22 juga menyertakan `mitra`, padahal API menolaknya 403 di semua endpoint — dihapus, dan komentar terkait di `routes/admin/index.ts` dikoreksi).

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
| `zakat_disbursement` | `GET /admin/zakat/distributions?limit=100` (tabel `zakat_distributions` — penyaluran ke mustahiq, **bukan** `disbursements`). Sebelum 2026-09-22 memakai `GET /admin/disbursements?disbursement_type=zakat_distribution`, nilai filter yang tidak pernah ada di enum `disbursement_type` (`campaign`, `zakat`, `qurban`, `operational`, `vendor`, `revenue_share`) sehingga dropdown selalu kosong (terverifikasi: 0 baris). Label opsi: `${referenceId} - ${recipientName}` (format `referenceId`: `DIST-<timestamp>-<random>`). |
| `qurban_period` | `GET /admin/qurban/periods` dan detail `GET /admin/qurban/periods/:id/detail` |

Gallery memakai `MediaLibrary` dengan `category="general"` dan `accept="image/*"`. Ini berarti foto laporan kegiatan saat ini tersimpan sebagai kategori media umum, bukan kategori khusus activity report.

### Edit

File: `apps/admin/src/app/dashboard/activity-reports/[id]/edit/page.tsx`.

Edit memuat data detail dari `/admin/activity-reports/:id`, lalu mengirim full payload (termasuk `title`, `slug`, dan `status`) ke `PUT /admin/activity-reports/:id`. `videoUrl` dikirim `null` saat dikosongkan (sejak 2026-09-22); `typeSpecificData` dikirim `undefined` jika kosong. Field "URL Laporan" read-only + tombol "Ubah URL" (pola sama dengan `CampaignForm`, sejak 2026-09-22): mengubah title tidak lagi mengubah slug; slug hanya berubah lewat field ini, dengan warning jika laporan sudah `published`. Address dan SEO dipopulasi dari response detail. Edit tidak melakukan autofill ulang statistik qurban seperti create.

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
| `GET /` | List published dengan pagination (`page` min 1, `limit` default 20, maks 100), filter optional `reference_type`, hanya `noIndex=false`. Urut `activityDate` desc. |
| `GET /by-slug/:slug/related?limit=` | Laporan terkait untuk halaman detail (`limit` default 3, maks 12). 404 bila slug tidak published. Respons `{ mode, data }`: `mode: "related"` bila ada laporan published lain dengan `referenceType` + `referenceId` yang sama (urut `activityDate` desc); jika tidak ada, `mode: "other"` berisi laporan published terbaru lain. Selalu `noIndex=false` dan tanpa laporan itu sendiri. Item ringkas (kartu): `id, slug, title, referenceType, referenceName, activityDate, description` (teks polos 150 karakter), `gallery, publishedAt, provinceName, regencyName` — tanpa `referenceId`. |
| `GET /by-slug/:slug` | Detail by slug, hanya `status=published`; tidak memfilter `noIndex=false`. |
| `GET /:id` | Detail by ID, hanya `status=published`; tidak memfilter `noIndex=false`. |
| `GET /campaign/:campaignId` | List laporan campaign, `status=published`, `noIndex=false`, cocok via `referenceType/referenceId` atau legacy `campaignId`. Respons berupa array langsung (bukan objek paginasi); `limit` default 50, maks 100. Tidak mengembalikan field SEO/`status`. Sejak 2026-10-23 payload diringkas untuk tab "Kabar Terbaru": `description` berupa kutipan teks polos 150 karakter (bukan HTML penuh), `videoUrl` dihapus, `referenceType` dan `referenceName` ditambahkan; isi lengkap hanya di `/laporan/:slug`. |

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

Field respons detail/list: `id, slug, referenceType, referenceName, title, activityDate, description, gallery, videoUrl, typeSpecificData, status, publishedAt, createdAt`, alamat (`detailAddress`, `province/regency/district/villageName`), SEO (`metaTitle, metaDescription, ogTitle, ogDescription, ogImageUrl, noIndex, noFollow, canonicalUrl`), dan **`creatorName`** (nama staf pembuat — terekspos ke publik). `referenceId` dan `focusKeyphrase` tidak dikembalikan.

Public detail by slug/by id tetap dapat melayani laporan `noIndex=true`. Ini selaras dengan konsep SEO: halaman masih bisa dibuka, tetapi metadata robots harus memberi `noindex`.

## Public Web

### Archive `/laporan`

File: `apps/web/src/app/laporan/page.tsx`.

Perilaku:

- Server component.
- Fetch `GET /activity-reports?page={page}&limit=12` dengan `revalidate=300`.
- Menampilkan archive card 3 kolom desktop memakai `ReportCard` (organism bersama dengan `RelatedReports`); helper label/tanggal/warna ada di `lib/report-label.ts`.
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
- Section "Laporan Terkait" (mode `related`) / "Laporan Lain" (mode `other`) di bawah grid artikel+sidebar: fetch `GET /activity-reports/by-slug/:slug/related?limit=3` (`revalidate=300`), komponen `RelatedReports` (i18n `laporanDetail.related.*`, tautan "Lihat Semua" ke `/laporan`). Kartu memakai `ReportCard` yang sama dengan arsip: desktop kartu, mobile baris ringkas. Section tidak tampil bila hasil kosong.
- Metadata memakai field SEO dari report jika tersedia.
- Fallback OG image: `ogImageUrl`, lalu gallery pertama, lalu setting `og_image`, lalu `/og` (route dinamis `next/og`).
- Robots mengikuti `noIndex` dan `noFollow`.
- Canonical memakai `canonicalUrl` jika ada; jika tidak, kode mencoba infer canonical dari title.
- Jika canonical URL berbeda dari URL saat ini, halaman melakukan `permanentRedirect(canonicalUrl)`.
- Detail menampilkan badge reference type, tanggal, judul, reference name, address, type-specific summary, HTML description, YouTube embed, gallery lightbox, dan link kembali ke archive.

Risiko canonical (analisis kode, belum diuji di browser): `inferCanonicalReportUrl` mengubah slug bentuk `{slug-title}-{angka|4–12 karakter alfanumerik}` menjadi `/laporan/{slug-title}` lalu `permanentRedirect` (301) **tanpa memeriksa apakah slug tujuan ada atau milik laporan yang sama**. API admin memberi suffix `-1`, `-2` untuk judul kembar yang sah (mis. dua periode berbeda dengan judul sama), sehingga laporan kedua ter-redirect permanen ke laporan pertama dan tidak bisa dibuka lewat URL-nya sendiri. Script cleanup duplicate mengisi `canonicalUrl` eksplisit, tetapi laporan yang tidak melewati script tetap terkena inferensi.

### Sitemap

`sitemap.ts` mengambil semua laporan published lewat `GET /activity-reports?limit=100&page=N` (loop sampai halaman tidak penuh, timeout 10 s per request) dan melewati `noIndex === true`. Batas `limit` maks 100 di API sesuai dengan nilai ini.

### Campaign Detail Tab

File: `apps/web/src/app/program/[slug]/CampaignTabs.tsx`.

Tab `updates` mengambil `GET /activity-reports/campaign/:campaignId?limit=50`. Sejak 2026-10-23 tab hanya berisi **daftar** (isi laporan tidak ditampilkan di tab); tiap item mengarah ke `/laporan/:slug`. Desktop (md ke atas): timeline lama — ikon kalender di kiri, lalu tanggal, judul, lokasi lengkap dan `beneficiary_count` di bawahnya; seluruh blok bisa diklik. Mobile (< md): `ReportCard` yang sama dengan arsip `/laporan` (baris ringkas, hemat CSS). Description, YouTube embed, gallery, dan lightbox dihapus dari tab.

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

## Mekanisme Terpisah: `disbursement_activity_reports`

Ada tabel kedua dengan nama mirip, `disbursement_activity_reports` (`packages/db/src/schema/disbursements.ts`), untuk catatan kegiatan yang menempel pada satu pencairan zakat (`report_date`, `report_description`, `photos` JSON-string, `video_url`, `recipient_count`, `recipient_list`, `added_by`; FK `disbursement_id` ON DELETE CASCADE). Endpoint: `GET/POST /v1/admin/disbursements/:id/activity-reports` (`super_admin`, `admin_finance`), logika di `DisbursementService.addActivityReport/getActivityReports` (hanya untuk `disbursementType === "zakat"`).

Ini **bukan** bagian modul activity reports di atas: tidak punya slug/SEO/halaman publik, tidak muncul di `/dashboard/activity-reports`, dan tidak dipanggil oleh frontend admin maupun web manapun (dicek dengan grep 2026-09-22). Endpoint dan tabelnya sisa desain lama; jangan dicampur dengan reference type `zakat_disbursement`.

## Gap Implementasi yang Harus Dicatat

| Gap | Dampak | Rekomendasi |
|---|---|---|
| `inferCanonicalReportUrl` (web publik) me-redirect 301 slug ber-suffix ke slug dasar tanpa cek keberadaan/kepemilikan | Laporan dengan judul kembar yang sah tidak bisa dibuka lewat URL-nya sendiri | Hapus inferensi, andalkan `canonicalUrl` eksplisit dari cleanup script; atau validasi lewat API. **Belum diperbaiki** — di luar cakupan permintaan 2026-09-22, murni perilaku `apps/web`, perlu keputusan produk terpisah |
| WA publish tanpa log anti-spam (`wa_broadcast_logs`) dan tanpa retry/visibilitas kegagalan | Unpublish → publish ulang mengirim ulang ke semua donor yang lolos filter; admin tidak tahu jika pengiriman gagal | Pindahkan ke job `wa_broadcast_jobs`/`wa_broadcast_logs` (audience per-program sudah ada di `broadcast-processor.ts`) jika volume mulai besar |
| `POST` coordinator tidak memvalidasi apakah ia berhak atas `referenceId`/`referenceType` yang dipilih | Coordinator bisa membuat laporan untuk program yang bukan miliknya | Validasi ownership reference di POST sesuai domain masing-masing (campaign/zakat/qurban) |
| `referenceName` tetap snapshot dari client (tidak diisi ulang dari server saat referensi berubah nama) | Nama yang ditampilkan bisa basi jika campaign/periode di-rename setelah laporan dibuat | Isi `referenceName` dari server saat create/update, bukan dari input client |
| `reference_type` dan `status` hanya `text` di DB | Data invalid bisa masuk dari luar API admin | Tambahkan DB check constraint setelah nilai final stabil |
| Admin list tanpa server pagination | Data besar akan berat di admin | Tambahkan `page`, `limit`, count query di API admin |
| Unpublish lalu publish ulang mereset `publishedAt` (edit biasa tidak lagi mereset, sejak 2026-09-22) | Tanggal publish pertama hilang; cleanup script memakai `publishedAt` paling awal sebagai canonical | Pisahkan `firstPublishedAt`, atau jangan kosongkan saat unpublish |
| `typeSpecificData` tidak bisa dikosongkan dari form (dikirim `undefined`) | Statistik lama menempel | Kirim `null` saat kosong dan izinkan nullable di API |
| Broadcast WA memakai `transactions.productId = referenceId` tanpa filter `productType` | Donor non-campaign (zakat/qurban) bisa tidak terjangkau atau salah target jika ID bertabrakan lintas tipe produk | Tambahkan filter `productType` sesuai `referenceType`, atau resolver donor per reference type |
| Gallery memakai kategori media `general` | Tidak ada segmentasi media activity report | Tambahkan kategori `activity_report` jika dibutuhkan |
| Frontend create tidak mencegah gallery > 20 sebelum submit | User baru tahu error setelah API reject | Tambahkan batas visual di UI |
| Description HTML disimpan dan dirender via `dangerouslySetInnerHTML` (admin detail) / `RenderContent` (web) | Risiko XSS jika sanitasi editor/API tidak cukup | Sanitasi server-side untuk HTML yang disimpan |
| Non-YouTube `videoUrl` valid di API tetapi tidak tampil di UI | User mengira semua URL video didukung | Batasi validasi ke YouTube atau tampilkan fallback link |
| Create qurban autofill stats, edit tidak | Perilaku form tidak konsisten | Autofill opsional di edit saat reference qurban berubah |
| `postalCode` diterima request tapi tidak disimpan | Data input bisa hilang | Jelaskan di UI bahwa postal code dari village |
| `getImageUrlByVariant` di sebagian public UI bisa tidak cocok dengan pola nama variant media hyphen | Thumbnail bisa tidak berpindah ke variant optimal | Sinkronkan helper image dengan output media processor |
| Delete admin hard delete tanpa cleanup media | File media orphan | Job cleanup media yang menghitung referensi silang |
| Tabel `disbursement_activity_reports` + endpointnya tidak dipakai | Kode mati, membingungkan | Hapus setelah konfirmasi tidak ada data produksi |
| Schema Drizzle tidak mendeklarasikan index yang ada di DB | Drift schema vs DB | Deklarasikan index di schema atau catat sebagai by design |

## Perbaikan

> 2026-09-22 (audit dokumen vs kode + verifikasi runtime pada API lokal; semua uji memakai `referenceId` fiktif agar tidak ada WhatsApp terkirim ke donor)

| Fix | File | Detail |
|---|---|---|
| `videoUrl` tidak bisa dikosongkan saat edit | `admin/activity-reports.ts`, `activity-reports/[id]/edit/page.tsx` | Form mengirim `undefined` (dibuang `JSON.stringify`) dan API mengubah `""` menjadi `undefined`, sehingga nilai lama tidak pernah tersentuh (pola sama dengan campaign, CLAUDE.md 2026-09-13). Kini form mengirim `null`, API menerima `null`/`""` → `NULL`. Diverifikasi: `PUT {videoUrl:null}` dan `{videoUrl:""}` mengosongkan; URL invalid → 400. |
| `publishedAt` di-reset pada setiap edit laporan published | `admin/activity-reports.ts` | Form edit selalu mengirim `status`; handler lama menimpa `publishedAt = now()` setiap simpan. Kini hanya diisi saat transisi ke published, dikosongkan saat unpublish. Diverifikasi: dua edit berturut-turut → `publishedAt` identik. |
| `activityDate` invalid menghasilkan 500 | `admin/activity-reports.ts` | Ditambah refine `Date.parse` di Zod → 400 dengan pesan "Tanggal kegiatan tidak valid". |
| `GET /activity-reports?page=0` menghasilkan 500 (OFFSET negatif), `limit` tanpa batas atas | `activity-reports-public.ts` | `page` min 1; `limit` di-clamp 1–100 (default list 20, campaign 50) pada list dan endpoint campaign. |
| Dokumen | `arsitektur-activity-reports.md` | Dikoreksi: `product_name` tidak fallback ke `referenceId`; timestamp `created_at`/`updated_at` bertipe timestamptz; ditambah sidebar `mitra`, dropdown pencairan, `creatorName`, sitemap, `disbursement_activity_reports`, karakteristik pengiriman WA, dan gap baru. |
| Slug ikut berubah setiap `PUT` yang menyertakan `title` (form edit selalu mengirim `title`) | `admin/activity-reports.ts`, `activity-reports/[id]/edit/page.tsx` | Konsekuensi sama dengan lesson slug campaign (CLAUDE.md 2026-09-13): title tidak lagi memicu regenerasi slug. Slug hanya berubah lewat field `slug` eksplisit — validasi format (regex), uniqueness (exclude diri sendiri, 409 jika bentrok). Admin edit dapat field "URL Laporan" read-only + tombol "Ubah URL" (pola sama `CampaignForm`), dengan warning jika laporan sudah published. Diverifikasi: ganti title tanpa `slug` → slug stabil; `PUT {slug: "..."}` → berubah; slug yang dipakai laporan lain → 409; format tidak valid → 400. |
| WA publish tidak menghormati `donatur.waOptOut` dan memblokir response saat donor banyak | `admin/activity-reports.ts` (helper `notifyReportPublished`, dipakai bersama `POST`/`PUT`) | Query penerima kini `LEFT JOIN donatur` via `transactions.donaturId` dan mengecualikan `waOptOut = true` (transaksi guest tanpa `donaturId` tetap dikirimi — tidak punya opt-out). Pengiriman dipindah ke `setImmediate` agar tidak menunggu di dalam request (pola sama lesson cron WA 2026-07-06). Diverifikasi: query SQL join+filter langsung ke DB (opt-out terkecualikan, aktif & guest lolos) dan uji end-to-end dengan `whatsapp_enabled` dimatikan sementara (tidak ada exception di log). |
| Dropdown "Zakat - Pencairan" selalu kosong (filter `disbursement_type=zakat_distribution` tidak valid) | `activity-reports/create/page.tsx`, `activity-reports/[id]/edit/page.tsx` | Sumber data yang benar adalah `GET /admin/zakat/distributions` (tabel `zakat_distributions` — penyaluran ke mustahiq), bukan `disbursements`. Label opsi diganti `${referenceId} - ${recipientName}`. Diverifikasi: endpoint 200 dengan shape yang sesuai (dev DB belum punya data zakat_distributions, jadi dropdown kosong secara sah, bukan error). |
| Menu sidebar "Laporan Kegiatan" tampil untuk `mitra` walau API selalu 403 | `Sidebar.tsx`, komentar di `routes/admin/index.ts` | `mitra` dihapus dari `roles` menu; komentar yang keliru ("mitra lihat laporan kegiatan miliknya") dihapus. |
| `PUT /:id` tanpa cek ownership untuk `program_coordinator` | `admin/activity-reports.ts` | Ditambahkan guard yang sama dengan `GET /:id`: coordinator yang bukan `createdBy` mendapat 404 (bukan 403, konsisten dengan pola "not found" agar tidak membocorkan keberadaan laporan). Diverifikasi dengan user `program_coordinator` uji: PUT ke laporan admin lain → 404; PUT ke laporan sendiri → 200; PUT oleh `super_admin` ke laporan siapa pun → 200 (tidak ada regresi). |
| `creatorName` sempat salah dinilai sebagai kebocoran data di API publik | `activity-reports-public.ts`, dokumen ini | **Dikoreksi, bukan diubah**: field ini memang ditampilkan publik sebagai byline "Dibuat oleh: [nama staf]" di tiga halaman (`laporan/[slug]`, `qurban/laporan`, `zakat/laporan`) — fitur yang disengaja, bukan gap. Baris terkait di tabel Gap dihapus. |
| Dokumen | `arsitektur-activity-reports.md` | Dikoreksi (fase kedua): kolom `slug` dan `published_at`, tabel Admin API, dropdown zakat, sidebar mitra, § Publish dan Notifikasi (opt-out + async), dan gap yang sudah selesai dipindah ke tabel Perbaikan. |
| Laporan bisa dibuat/diupdate dengan `referenceId` yang sudah tidak ada di tabel target (campaign dihapus, periode dihapus, dll) | `admin/activity-reports.ts` (helper `referenceExists`) | `POST` dan `PUT` (saat `referenceType`/`referenceId` berubah) kini memvalidasi keberadaan baris target: `campaigns`, `zakat_periods`, `zakat_distributions`, atau `qurban_periods` sesuai `referenceType`. ID yang tidak ditemukan → `400` "Referensi (campaign/periode) yang dipilih tidak ditemukan". **Tidak** memvalidasi status target (draft/aktif) — lihat temuan di bawah. Diverifikasi: referenceId fiktif ditolak di POST dan PUT; PUT field lain tanpa mengubah referensi tetap lolos (tidak re-validasi tanpa perlu). |
| **Audit produksi 2026-09-22** (11 laporan published, cross-check ke seluruh campaign): 1 laporan ("Harapan Gizi Indonesia : Berbagi Makanan Gratis") ternyata **bukan** yatim — referensinya valid, tapi campaign tujuannya (`referenceId` yang sama, sudah di-rename jadi "Jumat Berkah: Seporsi Sarapan Pagi untuk Para Pahlawan Keluarga") **statusnya `draft`**, sehingga tidak muncul di `/program` maupun bisa ditemukan. Laporan itu sendiri terverifikasi **muncul benar** di tab "Kabar Terbaru" campaign tsb ketika diakses langsung via URL lama (`/program/sedekah-jumat-double-keberkahan`) — sebelum perbaikan draft-block di bawah. | (data produksi, bukan bug kode aktivity-reports) | Lihat `arsitektur-donasi.md` Catatan Penting #7 untuk perbaikan terkait (blokir akses publik ke campaign draft). 10 laporan published lainnya semuanya tervalidasi menempel benar ke referensinya masing-masing. |

## SOP Perubahan

1. Setiap penambahan reference type baru wajib memperbarui schema validasi admin API, UI create/edit, public label, public stats jika relevan, dan dokumen ini.
2. Jika field SEO berubah, update dokumen ini dan `docs/arsitektur-seo.md`.
3. Jika mekanisme media/gallery berubah, update dokumen ini dan `docs/arsitektur-media.md`.
4. Jika role berubah, update dokumen ini dan `docs/arsitektur-auth.md`.
5. Jika activity reports masuk ke laporan publik baru, update dokumen ini dan `docs/arsitektur-laporan.md`.
6. File lama hanya boleh dihapus setelah kontennya terbukti sudah terserap ke dokumen `arsitektur-*.md` dan sesuai implementasi kode aktual.
