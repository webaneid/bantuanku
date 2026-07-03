# Arsitektur Search Discovery

> Terakhir di-sync: 2026-07-02

---

## Overview

Search dan discovery Bantuanku saat ini tersebar di beberapa layer:

- API public `/v1/search` dan `/v1/autocomplete`;
- campaign listing/filter di `/v1/campaigns` dan `ProgramListTemplate`;
- category/pillar archive page;
- sitemap dinamis, robots route, metadata SEO, dan `/ai-reference`;
- public report archive/detail;
- tracking Meta Pixel untuk search program listing.

Dokumen ini membedakan **search interaktif user**, **discovery listing/filter**, dan **discovery crawler/SEO/AI** sesuai implementasi kode aktual. Search publik utama di web saat ini bukan full-text search terpusat, melainkan filter client-side di listing program.

Dokumen terkait:

- `arsitektur-api-routing.md` — route mount `/v1/search` dan `/v1/autocomplete`.
- `arsitektur-komponen-web.md` — `SearchBox`, `ProgramListTemplate`, Header, dan client-side filtering.
- `arsitektur-seo.md` — sitemap, robots, metadata, canonical, AI reference.
- `arsitektur-pages-cms.md` — CMS pages di sitemap, URL autocomplete, dan gap search untuk pages.
- `arsitektur-documentation-center.md` — documentation static content, gap sitemap, dan gap search dokumentasi.
- `arsitektur-cache-performance.md` — sitemap force-dynamic, no-store/revalidate, search performance gap.
- `arsitektur-security.md` — public search/autocomplete dan risiko exposure user data.
- `arsitektur-tracking.md` — Meta Pixel `Search`.
- `arsitektur-donasi.md` — campaign discovery/listing.
- `arsitektur-zakat.md`, `arsitektur-qurban.md`, `arsitektur-activity-reports.md` — discovery domain publik.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| API search | `apps/api/src/routes/search.ts` |
| API autocomplete | `apps/api/src/routes/autocomplete.ts` |
| API campaigns list/detail | `apps/api/src/routes/campaigns.ts` |
| API categories/pillars | `apps/api/src/routes/categories.ts`, `apps/api/src/routes/pillars.ts` |
| Public pages API | `apps/api/src/routes/pages.ts` |
| Public activity reports API | `apps/api/src/routes/activity-reports-public.ts` |
| Web SearchBox | `apps/web/src/components/molecules/SearchBox/SearchBox.tsx` |
| Web Header search UI | `apps/web/src/components/organisms/Header/Header.tsx` |
| Program listing/filter | `apps/web/src/components/templates/ProgramListTemplate.tsx` |
| Program archive routes | `apps/web/src/app/program/page.tsx`, `program/kategori/[slug]/page.tsx`, `program/pilar/[slug]/page.tsx` |
| Sitemap | `apps/web/src/app/sitemap.ts` |
| Robots | `apps/web/src/app/robots.ts` |
| AI reference | `apps/web/src/app/ai-reference/route.ts` |
| SEO helper | `apps/web/src/lib/seo.tsx` |
| Meta Pixel search event | `apps/web/src/lib/fbPixel.ts` |

---

## API Search

Base route:

```http
/v1/search
```

### `GET /v1/search`

Query:

| Param | Default | Catatan |
|-------|---------|---------|
| `q` | required | Jika kosong atau panjang `< 2`, return object kosong. |
| `type` | `all` | `all`, `campaigns`, atau `users`. |
| `page` | `1` | Dipakai saat type bukan `all`. |
| `limit` | `10` | Dipakai saat type bukan `all`. |

Hasil:

| Type | Query |
|------|-------|
| `campaigns` | Campaign aktif, `title LIKE %q%` atau `description LIKE %q%`, order `createdAt desc`. |
| `users` | User dengan `name LIKE %q%` atau `email LIKE %q%`, order `createdAt desc`. |
| `all` | Maksimal 5 campaign + 5 user. |

Catatan implementasi:

1. Search memakai SQL `LIKE`, bukan full-text search.
2. Tidak ada normalisasi case eksplisit; perilaku case sensitivity bergantung database/collation.
3. Tidak ada ranking relevansi.
4. Tidak ada highlight/snippet.
5. Tidak ada total count untuk `GET /search` umum.
6. Tidak ada auth guard; route public.

### `GET /v1/search/campaigns`

Query:

| Param | Fungsi |
|-------|--------|
| `page`, `limit` | Pagination server-side. |
| `search` | `title LIKE %search%` atau `description LIKE %search%`. |
| `category` | Filter `campaigns.category`. |
| `pillar` | Filter `campaigns.pillar`. |
| `status` | Default `active`. |
| `isFeatured`, `isUrgent` | Boolean filter. |
| `minGoal`, `maxGoal` | Range goal. |
| `minCollected`, `maxCollected` | Range collected. |
| `sort` | `latest`, `popular`, `collected`, `urgent`, `ending`. |

Gap: route ini lebih kaya daripada `/v1/campaigns`, tetapi web `ProgramListTemplate` saat ini tidak memakainya sebagai sumber filter utama.

---

## API Autocomplete

Base route:

```http
/v1/autocomplete
```

Endpoint:

| Endpoint | Data | Catatan |
|----------|------|---------|
| `GET /campaigns?q=&limit=` | Campaign aktif by title `LIKE %q%`. | Return id, title, slug, imageUrl. |
| `GET /categories?q=&limit=` | Category by name `LIKE %q%`. | Tidak filter `isActive`. |
| `GET /users?q=&limit=` | User by name `LIKE %q%`. | Return id, name, email. |
| `GET /pillars?q=` | Static hardcoded pilar lama. | Bukan dari tabel `pillars`. |
| `GET /payment-status?q=` | Static status. | Nilai `success` tidak sama persis dengan status payment transaksi modern. |
| `GET /campaign-status?q=` | Static campaign status. | `draft`, `active`, `completed`, `cancelled`. |

Gap security/discovery:

1. `/autocomplete/users` public dan mengekspos email user.
2. `/autocomplete/categories` tidak filter `isActive`.
3. `/autocomplete/pillars` memakai hardcoded list, bukan master data `pillars`.
4. Tidak ada minimum length untuk `q`; query kosong bisa mengembalikan data awal.
5. Tidak ada cache server-side.

---

## Campaign Discovery

### `/v1/campaigns`

Query:

| Param | Fungsi |
|-------|--------|
| `page`, `limit` | Pagination server-side. |
| `category` | Filter `campaigns.category`. |
| `search` | Search title saja. |
| `status` | Default `active`. |

Response diperkaya `categoryName` dengan fetch semua categories lalu mapping by `categoryId`.

Catatan:

1. `optionalAuthMiddleware` dipasang, tetapi hasil public list tidak terlihat berbeda berdasarkan user.
2. Search hanya title, bukan description.
3. Filter category memakai kolom `campaigns.category`, sedangkan UI listing memakai `categoryId`. Ini perlu hati-hati karena ada dua konsep category legacy/baru.

### `ProgramListTemplate`

Web `/program`, `/program/kategori/[slug]`, dan `/program/pilar/[slug]` memakai `ProgramListTemplate`.

Flow:

1. fetch campaigns aktif dengan `limit=1000`;
2. fetch categories;
3. fetch pillars;
4. filter categories/pillars yang punya campaign;
5. filter campaign di client untuk:
   - category;
   - pillar;
   - urgent/featured;
   - search title/description;
6. pagination client-side `itemsPerPage = 12`.

Tracking:

- search query memicu Meta Pixel `Search` setelah debounce 800ms.

Gap:

1. Listing fetch sampai 1000 campaign lalu filter/paginate di client.
2. Server-side search/filter API yang lebih kaya belum dipakai.
3. Header search tidak terhubung ke route/search action.
4. URL query untuk search/filter listing belum menjadi source-of-truth; state filter sebagian besar lokal.
5. Untuk data besar, discovery campaign harus pindah ke server pagination/filter.

---

## Header Search UI

`Header` menampilkan `SearchBox` desktop/mobile jika `showSearch=true`.

Status aktual:

- SearchBox di header tidak diberi `onSearch`;
- tidak redirect ke `/program?search=...`;
- tidak memanggil `/v1/search`;
- tidak menampilkan suggestion.

Jadi header search saat ini adalah UI input, belum search experience fungsional.

---

## SearchBox Component

`SearchBox` adalah komponen input generic:

| Fitur | Implementasi |
|-------|--------------|
| Controlled/uncontrolled value | Ada. |
| Debounce callback | Default `300ms`. |
| Clear button | Ada. |
| Loading state | Ada. |
| Escape to clear | Ada. |
| Size | `sm`, `md`, `lg`. |
| Variant | `default`, `filled`. |

Gap:

1. Icon masih inline SVG, bukan icon library.
2. `aria-label` input bergantung placeholder/props; belum ada kontrak accessibility khusus.
3. Komponen tidak punya built-in suggestion/results; itu harus disusun di caller.

---

## SEO Discovery

Discovery mesin pencari dikendalikan oleh:

| Area | Implementasi |
|------|--------------|
| Global metadata | `apps/web/src/app/layout.tsx`, `apps/web/src/lib/seo.tsx`. |
| Sitemap | `apps/web/src/app/sitemap.ts`, `dynamic = "force-dynamic"`. |
| Robots | `apps/web/src/app/robots.ts`. |
| AI reference | `apps/web/src/app/ai-reference/route.ts`. |
| Entity SEO fields | Campaign, zakat type, qurban package, category, pillar, pages, activity reports. |

Sitemap memasukkan:

- static pages;
- zakat calculator pages;
- campaign pages;
- zakat type pages;
- qurban package-period pages;
- category pages;
- pillar pages;
- static content pages;
- activity report pages.

Catatan gap dari SEO:

1. Activity report sitemap skip `noIndex === true`.
2. Campaign, zakat, qurban, category, pillar, dan page sitemap belum terlihat konsisten skip `noIndex`.
3. Sitemap fetch data runtime dan bisa menghasilkan subset kosong jika API gagal.
4. Robots hanya allow `*`, disallow `/dashboard/`, `/checkout/payment-result/`, dan `/api/`.
5. AI crawler belum punya robots rule eksplisit; sinyal AI terutama lewat metadata root dan `/ai-reference`.

Detail SEO lengkap ada di `arsitektur-seo.md`.

---

## Activity Reports Discovery

Public archive:

| Route | Implementasi |
|-------|--------------|
| `/laporan` | Fetch `/activity-reports?page=&limit=12` dengan `revalidate=300`. |
| `/laporan/[slug]` | Fetch detail by slug dengan `revalidate=300`. |
| `/v1/activity-reports` | List published dan `noIndex=false`. |
| `/v1/activity-reports/by-slug/:slug` | Detail published by slug, tidak filter `noIndex=false`. |

Konsekuensi:

- report `noIndex=true` tidak muncul di archive list;
- detail masih bisa dibuka jika slug diketahui;
- metadata detail harus memberi robots noindex sesuai SEO field.

---

## Tracking Discovery

Meta Pixel search event tersedia:

```ts
fbPixel.search({ search_string, content_category })
```

Pemakaian aktif yang ditemukan:

- `ProgramListTemplate`: search query listing program setelah debounce 800ms.

Gap:

1. Header search belum tracking karena belum punya behavior search.
2. API `/v1/search` tidak otomatis tracking; tracking hanya frontend.
3. Tidak ada analytics internal untuk query search populer/no-result.

---

## Performance dan Cache

Search/discovery belum punya cache server-side.

| Area | Cache |
|------|-------|
| `/v1/search` | Tidak ada server cache. |
| `/v1/autocomplete` | Tidak ada server cache. |
| `/v1/campaigns` | Tidak ada server cache. |
| Program listing web | Fetch service `no-store`, lalu filter client-side. |
| Sitemap | `force-dynamic`; fetch runtime. |
| Activity report archive | Web `revalidate=300`; API route tidak cache. |

Risiko:

1. `LIKE %query%` sulit memakai index biasa.
2. Autocomplete dengan query kosong bisa menekan DB bila dipakai intensif.
3. Program listing `limit=1000` akan berat saat campaign bertambah.
4. Sitemap runtime melakukan banyak fetch dan loop pagination.

Rujukan: `arsitektur-cache-performance.md`.

---

## Security dan Privacy

Search/discovery route sebagian public.

Gap penting:

1. `/v1/search?type=users` public mengekspos `id`, `name`, `email`, `createdAt`.
2. `/v1/autocomplete/users` public mengekspos `id`, `name`, `email`.
3. Tidak ada rate limit khusus search/autocomplete selain global API rate limit.
4. Tidak ada minimum query length untuk autocomplete.
5. Query search dapat mencetak data di frontend tracking/log jika caller menambahkan tracking.

Rekomendasi: user search/autocomplete harus dipindah ke admin-only route atau dimasking/dinonaktifkan untuk public.

---

## Risk Register

| Risiko | Dampak | Rekomendasi |
|--------|--------|-------------|
| Public user search/autocomplete mengekspos email | Privacy issue dan enumeration user. | Jadikan admin-only atau hapus email dari response public. |
| Header search tidak fungsional | UX membingungkan. | Hubungkan ke `/program?search=` atau global search page. |
| Search API tidak dipakai listing utama | Dua arsitektur search berjalan paralel. | Pilih satu: server-side search/filter sebagai source utama. |
| Campaign listing fetch `limit=1000` | Berat saat data tumbuh. | Pakai `/v1/search/campaigns` atau perluas `/v1/campaigns` untuk server-side filter/pagination. |
| `LIKE %q%` tanpa full-text index | Search lambat dan ranking buruk. | Tambah full-text search/trigram index atau search service jika skala naik. |
| Autocomplete query kosong | Bisa mengembalikan data awal terlalu mudah. | Minimum `q.length >= 2`, kecuali static dictionary aman. |
| Hardcoded pillars autocomplete | Drift dari master data. | Ambil dari tabel `pillars`. |
| Sitemap noIndex tidak konsisten | URL noindex bisa tetap masuk sitemap. | Terapkan filter noIndex semua entity SEO. |
| Tidak ada search analytics internal | Query gagal/populer tidak diketahui. | Simpan agregat query anonim, dengan privacy guard. |

---

## Rekomendasi Arsitektur Target

Urutan yang disarankan:

1. Amankan `/v1/search` dan `/v1/autocomplete`:
   - hapus/mask user email;
   - minimum query length;
   - rate limit khusus search.
2. Jadikan server-side campaign discovery sebagai source utama:
   - categoryId/categorySlug;
   - pillarSlug;
   - urgency/featured;
   - search title/description;
   - sort;
   - pagination.
3. Hubungkan Header Search ke route yang jelas:
   - `/program?search=...`; atau
   - halaman `/search?q=...` jika global search diperlukan.
4. Tambah URL-state untuk filter listing agar shareable dan SEO-aware.
5. Konsolidasikan autocomplete:
   - public autocomplete hanya untuk campaign/category/pillar aktif;
   - admin autocomplete untuk user/donatur/employee/transaction dibuat di admin route.
6. Tambah full-text/trigram search jika data campaign/report/page bertambah.
7. Selaraskan sitemap dengan field `noIndex` semua entity.
8. Tambah WebSite JSON-LD `SearchAction` hanya setelah search publik stabil.
9. Tambah analytics query anonim untuk search quality.

---

## SOP Perubahan Search Discovery

1. Jangan membuat endpoint search public yang mengembalikan PII.
2. Search public harus punya minimum query length dan limit maksimum.
3. Listing yang bisa tumbuh besar harus server-side pagination/filter.
4. Filter listing publik sebaiknya tercermin di URL jika perlu dibagikan atau diindeks.
5. Autocomplete public hanya boleh untuk data yang memang public dan aktif.
6. Setiap entity dengan `noIndex=true` harus dikeluarkan dari sitemap.
7. Jika menambahkan route discovery baru, update sitemap/robots/SEO/cache policy sekaligus.
8. Search analytics harus agregat/anonim; jangan simpan query bersama identitas user tanpa dasar kebutuhan jelas.

---

## File Lama / Dokumen Lama

Tidak ditemukan dokumen lama khusus search/discovery di root atau `docs/` yang bisa dihapus.
