# Arsitektur Documentation Center

> Terakhir di-sync: 2026-07-02

---

## Overview

Documentation Center adalah halaman dokumentasi operasional publik di frontend web:

```text
/documentation
/documentation/[slug]
```

Modul ini **bukan Pages CMS**. Kontennya tidak berasal dari database `pages`, tidak punya admin CRUD, dan tidak memakai API. Semua dokumen disimpan sebagai TypeScript static content di repository.

Tujuan implementasi saat ini:

1. menyediakan dokumentasi operasional yang bisa dibuka publik;
2. menjaga UI fokus baca tanpa Header/Footer global;
3. membuat konten versioned lewat Git;
4. menghindari dependency API/database untuk dokumentasi.

Dokumen terkait:

- `arsitektur-pages-cms.md` — batas antara CMS pages DB dan documentation static content.
- `arsitektur-komponen-web.md` — public web component/layout.
- `arsitektur-seo.md` — metadata route documentation dan gap sitemap.
- `arsitektur-search-discovery.md` — discovery publik dan gap documentation tidak masuk search/sitemap.
- `arsitektur-security.md` — HTML static content dan `dangerouslySetInnerHTML`.
- `arsitektur-cache-performance.md` — static generation, no API fetch, dan build-time content.
- `arsitektur-settings.md` — menu frontend/settings yang bisa mengarah ke `/documentation`.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Route index documentation | `apps/web/src/app/documentation/page.tsx` |
| Route detail documentation | `apps/web/src/app/documentation/[slug]/page.tsx` |
| Layout metadata | `apps/web/src/app/documentation/layout.tsx` |
| Renderer utama | `apps/web/src/app/documentation/DocumentationView.tsx` |
| Helper lookup | `apps/web/src/lib/documentation.ts` |
| Manifest kategori/sidebar | `apps/web/src/content/documentation/manifest.ts` |
| Type contract | `apps/web/src/content/documentation/types.ts` |
| Page registry | `apps/web/src/content/documentation/pages/index.ts` |
| Content pages | `apps/web/src/content/documentation/pages/*.ts` |
| Logo web documentation | `apps/web/public/brand/logo-webane.svg` |
| Link admin Developer | `apps/admin/src/app/dashboard/settings/developer/page.tsx` |
| Link footer web | `apps/web/src/components/organisms/Footer/Footer.tsx` |
| Default menu frontend | `apps/admin/src/app/dashboard/settings/frontend/page.tsx` |

---

## Data Model Static Content

Type:

```ts
export type DocumentationSection = {
  id: string;
  heading: string;
  bodyHtml: string;
};

export type DocumentationPage = {
  slug: string;
  title: string;
  category: string;
  summary?: string;
  updatedAt: string;
  sections: DocumentationSection[];
};

export type DocumentationCategory = {
  id: string;
  label: string;
  items: Array<{
    slug: string;
    title: string;
  }>;
};

export type DocumentationManifest = {
  version: number;
  categories: DocumentationCategory[];
};
```

Catatan implementasi:

1. `bodyHtml` adalah string HTML manual.
2. `updatedAt` disimpan sebagai string, bukan `Date`.
3. Tidak ada validasi runtime yang memastikan slug di manifest selalu ada di registry.
4. Tidak ada validasi runtime yang memastikan page registry tidak punya page orphan.
5. `category` di page content hanya metadata display/data; urutan sidebar mengikuti manifest.

---

## Manifest dan Kategori

File:

```text
apps/web/src/content/documentation/manifest.ts
```

Versi manifest saat ini:

```ts
version: 2
```

Kategori:

| ID | Label | Slug di Manifest |
|----|-------|------------------|
| `memulai` | Memulai | `pengenalan`, `login-dan-akses`, `navigasi-dashboard` |
| `campaign` | Campaign & Donasi | `cara-membuat-campaign`, `mengelola-transaksi` |
| `keuangan` | Keuangan | `kategori-keuangan`, `kode-unik`, `flip-payment`, `bagi-hasil-amil`, `alur-pencairan`, `laporan-keuangan` |
| `operasional` | Operasional | `konsep-mitra`, `zakat`, `qurban`, `fundraiser`, `seo`, `panduan-upload-gambar` |
| `fitur` | Fitur | `whatsapp-notifikasi`, `whatsapp-ai` |

Urutan kategori dan urutan item di sidebar sepenuhnya mengikuti `documentationManifest.categories`.

---

## Page Registry

File:

```text
apps/web/src/content/documentation/pages/index.ts
```

Registry `documentationPages` saat ini memetakan slug ke object page:

| Slug | Export |
|------|--------|
| `pengenalan` | `pengenalanDoc` |
| `login-dan-akses` | `loginDanAksesDoc` |
| `navigasi-dashboard` | `navigasiDashboardDoc` |
| `panduan-upload-gambar` | `uploadGambarDoc` |
| `konsep-mitra` | `konsepMitraDoc` |
| `alur-pencairan` | `alurPencairanDoc` |
| `cara-membuat-campaign` | `caraMembuatCampaignDoc` |
| `mengelola-transaksi` | `mengelolaTransaksiDoc` |
| `laporan-keuangan` | `laporanKeuanganDoc` |
| `kategori-keuangan` | `kategoriKeuanganDoc` |
| `seo` | `seoDoc` |
| `flip-payment` | `flipPaymentDoc` |
| `kode-unik` | `kodeUnikDoc` |
| `qurban` | `qurbanDoc` |
| `zakat` | `zakatDoc` |
| `fundraiser` | `fundraiserDoc` |
| `bagi-hasil-amil` | `bagiHasilAmilDoc` |
| `whatsapp-notifikasi` | `whatsappNotificationDoc` |
| `whatsapp-ai` | `whatsappAiDoc` |

Semua content page yang terdaftar memakai `updatedAt: "2026-02-20"` saat audit ini.

---

## Helper Internal Frontend

File:

```text
apps/web/src/lib/documentation.ts
```

Helper:

| Function | Behavior |
|----------|----------|
| `getDocumentationManifest()` | Return static `documentationManifest`. |
| `getDocumentationPageBySlug(slug)` | Return `documentationPages[slug] || null`. |
| `getDefaultDocumentationSlug()` | Ambil slug item pertama dari kategori pertama. |
| `getAllDocumentationSlugs()` | Flatten semua slug dari manifest categories. |

Catatan:

1. `getAllDocumentationSlugs()` membaca manifest, bukan registry.
2. Jika manifest berisi slug yang tidak ada di registry, static params tetap dibuat tetapi route akan `notFound()`.
3. Jika registry punya slug yang tidak ada di manifest, page tidak muncul di sidebar dan tidak masuk static params.

---

## Routing

### `/documentation`

File:

```text
apps/web/src/app/documentation/page.tsx
```

Behavior:

1. Ambil default slug dari `getDefaultDocumentationSlug()`.
2. Jika tidak ada default slug, panggil `notFound()`.
3. Render `DocumentationView` dengan slug default.
4. URL tetap `/documentation`, tidak redirect ke `/documentation/{slug}`.

Default slug saat ini:

```text
pengenalan
```

### `/documentation/[slug]`

File:

```text
apps/web/src/app/documentation/[slug]/page.tsx
```

Behavior:

1. `generateStaticParams()` membuat static params dari `getAllDocumentationSlugs()`.
2. `generateMetadata()` mengambil page by slug.
3. Jika metadata page tidak ada, title fallback `Dokumentasi`.
4. Page route mengambil page by slug.
5. Jika page tidak ditemukan, panggil `notFound()`.
6. Render `DocumentationView` dengan slug.

Metadata detail:

| Field | Source |
|-------|--------|
| `title` | `${page.title} | Dokumentasi` |
| `description` | `page.summary || "Dokumentasi operasional aplikasi Bantuanku."` |

Layout metadata global:

| Field | Value |
|-------|-------|
| `title` | `Dokumentasi` |
| `description` | `Dokumentasi dan tutorial operasional aplikasi Bantuanku.` |

---

## UI Rendering

Renderer:

```text
apps/web/src/app/documentation/DocumentationView.tsx
```

Struktur UI:

| Area | Implementasi |
|------|--------------|
| Container | `min-h-screen bg-gray-50`, `.container`, padding responsive |
| Header internal | Card putih berisi logo Webane + judul "Dokumentasi Bantuanku" |
| Sidebar kiri | Kategori manifest sebagai `<details>` accordion |
| Content tengah | Title, summary, updatedAt, sections |
| TOC kanan | List section heading, hanya tampil `xl:block` |

Komponen ini tidak memakai Header/Footer global public web.

### Sidebar

Sidebar:

1. loop `manifest.categories`;
2. kategori terbuka jika ada item yang slug-nya sama dengan slug aktif;
3. link item menuju `/documentation/{item.slug}`;
4. active item diberi class `bg-primary-50 text-primary-700 font-medium`.

### Content

Setiap section render:

```tsx
<section key={section.id} id={section.id} className="scroll-mt-24">
  <h3>{section.heading}</h3>
  <div dangerouslySetInnerHTML={{ __html: section.bodyHtml }} />
</section>
```

`bodyHtml` memakai class:

```text
prose prose-sm md:prose-base max-w-none text-gray-700
```

### TOC Kanan

TOC kanan:

1. hidden di bawah viewport `xl`;
2. link anchor ke `#section.id`;
3. tidak ada active-scroll tracking.

---

## Integrasi Link

### Admin Developer Settings

File:

```text
apps/admin/src/app/dashboard/settings/developer/page.tsx
```

Tombol "Dokumentasi" memakai:

```tsx
href={`${webUrl || ""}/documentation`}
```

`webUrl` berasal dari:

```ts
process.env.NEXT_PUBLIC_WEB_URL?.trim().replace(/\/+$/, "") || ""
```

Jika env kosong, link menjadi `/documentation` relatif terhadap admin origin.

### Frontend Settings Default

File:

```text
apps/admin/src/app/dashboard/settings/frontend/page.tsx
```

`normalizePublicHref()` memetakan URL lama:

| Input | Output |
|-------|--------|
| `/kontak` | `/documentation` |
| `/faq` | `/documentation` |
| `/syarat-ketentuan` | `/documentation` |
| `/kebijakan-privasi` | `/documentation` |

Default footer menu juga punya:

```ts
{ label: "Dokumentasi", url: "/documentation" }
```

### Footer Public Web

File:

```text
apps/web/src/components/organisms/Footer/Footer.tsx
```

Default about links menyertakan:

```ts
{ label: "Dokumentasi", href: "/documentation" }
```

---

## SEO dan Discovery

Route `/documentation/[slug]` punya dynamic metadata berdasarkan static content.

Namun sitemap saat ini belum memasukkan:

```text
/documentation
/documentation/[slug]
```

`apps/web/src/app/sitemap.ts` hanya memasukkan static pages utama, zakat calculator, campaign, zakat type, qurban, category, pillar, CMS pages, dan activity reports. Documentation center tidak dipanggil dari sitemap.

Documentation center juga tidak masuk:

- `/v1/search`;
- `/v1/autocomplete`;
- `/v1/pages`;
- `/ai-reference`.

Implikasi:

1. Dokumentasi bisa ditemukan lewat footer/menu/link langsung.
2. Dokumentasi belum optimal untuk crawler discovery.
3. Dokumentasi tidak searchable di search publik.

---

## Security Boundary

Konten `bodyHtml` dirender dengan:

```tsx
dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
```

Perbedaan dengan Pages CMS:

| Area | Documentation Center | Pages CMS |
|------|----------------------|-----------|
| Source content | File TS di repo | Database `pages` |
| Editor | Developer/code change | Admin UI |
| Trust boundary | Maintainer repo | Admin role + API payload |
| Sanitasi runtime | Tidak ada | Tidak terlihat sanitasi server-side |
| Public route | `/documentation/*` | `/page/*` |

Risiko utama documentation center lebih kecil daripada CMS pages karena content tidak datang dari request user/admin runtime. Namun HTML tetap harus dianggap sensitif karena perubahan repo yang salah bisa memasukkan script/handler berbahaya.

Rekomendasi:

1. Jangan masukkan `<script>`, inline event handler, iframe, atau external untrusted HTML ke `bodyHtml`.
2. Jika konten makin besar, pertimbangkan format yang lebih aman seperti MDX/Markdown dengan renderer terkontrol.
3. Tambahkan test/lint yang melarang pola HTML berbahaya di `apps/web/src/content/documentation/pages/*.ts`.

---

## Cache dan Build Behavior

Documentation center tidak melakukan fetch API.

Implikasi:

1. Konten ikut bundle/build Next.js.
2. Update konten butuh deploy ulang aplikasi web.
3. `generateStaticParams()` memungkinkan static generation untuk `/documentation/[slug]`.
4. Tidak ada invalidation runtime.
5. Tidak ada stale data dari API karena tidak ada API dependency.

---

## Gap Implementasi yang Tercatat

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| Documentation tidak masuk sitemap | Crawler discovery lemah | Tambah `/documentation` dan semua slug manifest ke sitemap |
| Tidak ada validasi manifest vs registry | Slug bisa 404 atau konten orphan tanpa terdeteksi | Tambah unit/script check |
| `bodyHtml` raw HTML tanpa lint/sanitizer | Risiko HTML berbahaya masuk via code review yang lolos | Tambah lint/check pola `<script`, `onClick=`, `onerror=`, iframe |
| `/documentation` render default page tanpa canonical/redirect ke slug | Potensi duplikasi dengan `/documentation/pengenalan` jika keduanya diindeks | Tambah canonical atau redirect eksplisit |
| Tidak ada search documentation | User tidak bisa mencari topik dokumentasi | Tambah client-side search dari manifest/pages atau endpoint static |
| TOC kanan tanpa active section state | Navigasi panjang kurang informatif | Tambah active anchor tracking bila konten makin panjang |
| Semua `updatedAt` content sama | Informasi update kurang bermakna | Update per page saat konten berubah |
| Tidak ada relation ke docs arsitektur | Dokumentasi operasional bisa drift dari source-of-truth arsitektur | Saat arsitektur berubah, audit content documentation terkait |
| Link admin Developer fallback relatif jika `NEXT_PUBLIC_WEB_URL` kosong | Tombol bisa membuka `/documentation` di origin admin, bukan web | Pastikan env terisi atau gunakan resolver URL yang jelas |

---

## Rekomendasi Arsitektur

1. **Pertahankan documentation center sebagai static content**, bukan CMS, selama targetnya dokumentasi operasional internal/publik yang dikurasi developer.
2. **Tambahkan sitemap documentation** dengan semua slug dari `getAllDocumentationSlugs()`.
3. **Buat script validasi manifest-registry** agar setiap slug manifest punya page dan setiap page punya manifest entry.
4. **Tambahkan lint keamanan untuk `bodyHtml`** supaya raw HTML tetap terkendali.
5. **Jangan campur documentation center dengan Pages CMS**. Pages CMS untuk halaman editorial organisasi; documentation center untuk panduan operasional produk.
6. **Audit isi documentation terhadap arsitektur resmi** karena beberapa halaman documentation adalah tutorial operasional dan bisa drift dari implementasi.
7. **Pertimbangkan search lokal** jika jumlah page bertambah, cukup berbasis static data di client tanpa API.
8. **Perbaiki canonical `/documentation`** agar tidak ambigu dengan default slug `pengenalan`.

---

## Contract yang Harus Dijaga

1. `/documentation` harus membuka halaman pertama manifest.
2. `/documentation/[slug]` hanya valid untuk slug yang ada di manifest dan registry.
3. Documentation content tidak boleh bergantung pada API/database.
4. Urutan sidebar harus mengikuti manifest.
5. Content page harus mengikuti `DocumentationPage`.
6. `bodyHtml` harus dianggap trusted repo content, bukan user-generated content.
7. Update documentation membutuhkan perubahan kode dan deploy web.
8. Documentation center tidak boleh menggantikan source of truth arsitektur `docs/arsitektur-*.md`.
