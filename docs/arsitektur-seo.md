# Arsitektur SEO

Dokumen ini adalah source of truth arsitektur SEO Bantuanku sesuai implementasi kode saat ini. Fokus utamanya adalah public web Next.js, field SEO di database, panel admin, sitemap, robots, metadata, Open Graph, Twitter Card, JSON-LD, dan AI reference.

Cache SEO settings, ISR/fetch `revalidate`, sitemap dynamic rendering, dan AI reference cache header dirujuk ke `docs/arsitektur-cache-performance.md`.
Search/discovery crawler, hubungan sitemap dengan listing/search, dan gap noIndex sitemap lintas entity dirujuk ke `docs/arsitektur-search-discovery.md`.
CMS pages berbasis tabel `pages`, admin CRUD page, dan public route `/page/[slug]` dirujuk ke `docs/arsitektur-pages-cms.md`.
Documentation center `/documentation` dan gap sitemap dokumentasi dirujuk ke `docs/arsitektur-documentation-center.md`.

## Ruang Lingkup

| Area | Implementasi |
|------|--------------|
| Public web SEO | `apps/web` Next.js App Router |
| Admin editor SEO | `apps/admin` melalui `SEOPanel` dan halaman settings SEO |
| API settings SEO | `apps/api` public `/v1/settings` dan admin `/admin/settings` |
| Data SEO entity | Kolom SEO di tabel content/master tertentu |
| Global SEO settings | Tabel `settings` dengan key public dan kategori `seo_pages` |
| Sitemap | Dynamic route `apps/web/src/app/sitemap.ts` |
| Robots | Route `apps/web/src/app/robots.ts` |
| Structured data | JSON-LD Organization, BreadcrumbList, Article, CollectionPage, Product di beberapa route |
| AI discoverability | Root AI meta/link + endpoint `/ai-reference` |

File utama:

| File | Peran |
|------|------|
| `apps/web/src/lib/seo.tsx` | Helper metadata, settings fetch, URL normalization, OG image resolver, JSON-LD helper |
| `apps/web/src/app/layout.tsx` | Global metadata, Organization JSON-LD, AI meta/link |
| `apps/web/src/app/page.tsx` | Metadata homepage dari `seo_page_home` |
| `apps/web/src/app/sitemap.ts` | Sitemap dinamis static + dynamic routes |
| `apps/web/src/app/robots.ts` | Robots route |
| `apps/web/src/app/ai-reference/route.ts` | JSON endpoint untuk AI assistant/crawler |
| `apps/admin/src/components/SEOPanel.tsx` | Form field SEO + scoring client-side |
| `apps/admin/src/app/dashboard/settings/seo/page.tsx` | Editor SEO halaman arsip/homepage |
| `apps/api/src/routes/settings-public.ts` | Public settings untuk web SEO |
| `apps/api/src/routes/admin/settings.ts` | Admin save settings SEO |

## Sumber Data SEO

SEO memakai dua sumber data.

### 1. Settings Global

Public web mengambil settings dari:

```ts
API_INTERNAL_URL || NEXT_PUBLIC_API_URL || "http://localhost:50245/v1"
```

Endpoint yang dipanggil adalah `/settings` atau `/v1/settings` tergantung base URL.

Public API `/v1/settings` mengembalikan:

1. Setting dengan `isPublic = true`.
2. Semua setting dengan `category = "seo_pages"`.

Nilai global yang dipakai helper SEO:

| Key | Fungsi |
|-----|--------|
| `site_name` | Nama situs, author, creator, siteName OG |
| `site_tagline` | Suffix/default title |
| `site_description` | Default meta description |
| `site_keywords` | Default keywords |
| `og_image` | Default Open Graph image |
| `organization_favicon` | Favicon |
| `organization_logo` | Logo Organization JSON-LD fallback |
| `organization_address` | Address Organization JSON-LD |
| `organization_email` | Contact point Organization JSON-LD |
| `organization_phone` | Contact point Organization JSON-LD |
| `twitter_handle` | Twitter Card site/creator |
| `google_site_verification` | Google Search Console verification |
| `meta_domain_verification` | Facebook domain verification |

Settings SEO halaman arsip disimpan sebagai JSON string di tabel `settings`:

| Key | Route |
|-----|-------|
| `seo_page_home` | `/` |
| `seo_page_program` | `/program` |
| `seo_page_zakat` | `/zakat` |
| `seo_page_qurban` | `/qurban` |
| `seo_page_wakaf` | `/wakaf` |

### 2. Field SEO Per Entity

Field SEO yang umum dipakai:

| Field | Fungsi |
|-------|--------|
| `metaTitle` | Title SEO |
| `metaDescription` | Meta description |
| `focusKeyphrase` | Keyword untuk scoring dan keywords |
| `canonicalUrl` | Override canonical |
| `noIndex` | Robots noindex |
| `noFollow` | Robots nofollow |
| `ogTitle` | Override Open Graph title |
| `ogDescription` | Override Open Graph description |
| `ogImageUrl` | Override Open Graph image |
| `seoScore` | Skor hasil panel admin |

Tabel yang sudah memiliki field SEO:

| Tabel | Catatan |
|-------|---------|
| `campaigns` | Program donasi |
| `pages` | Static pages |
| `zakat_types` | Jenis zakat |
| `qurban_packages` | Paket qurban |
| `categories` | Kategori program |
| `pillars` | Pilar program |
| `activity_reports` | Laporan kegiatan |

`metaTitle` dan `ogTitle` umumnya `varchar(70)`. `metaDescription` umumnya `varchar(170)`, tetapi `activity_reports` memakai `varchar(160)`. `focusKeyphrase` umumnya `varchar(100)`, tetapi `activity_reports` memakai `text`.

## Helper SEO Web

`apps/web/src/lib/seo.tsx` menyediakan helper berikut:

| Helper | Fungsi |
|--------|--------|
| `toAbsoluteUrl(appUrl, url)` | Mengubah URL relatif menjadi absolute dan menolak `data:` |
| `resolveOgImageUrl(appUrl, candidates, fallback)` | Memilih OG image pertama yang valid dari kandidat |
| `fetchSeoSettings()` | Fetch public settings dengan cache memory 5 menit dan `revalidate: 300` |
| `generateSiteMetadata(overrides)` | Metadata global default untuk layout |
| `generateOrganizationJsonLd(settings)` | JSON-LD Organization global |
| `generateBreadcrumbJsonLd(items)` | JSON-LD BreadcrumbList |
| `JsonLdScript({ data })` | Render `<script type="application/ld+json">` |

`fetchSeoSettings()` fallback ketika API gagal:

1. `site_name = "Bantuanku"`
2. `site_tagline = "Platform Donasi Terpercaya"`
3. `site_description` default donasi/zakat/qurban/wakaf
4. `site_keywords` default
5. `og_image = "/og"` (route dinamis `next/og` — 1200×630 branded image)
6. `organization_favicon = "/logo.svg"`
7. `twitter_handle = "@bantuanku"`

## Global Metadata

Root layout menjalankan:

```ts
export async function generateMetadata(): Promise<Metadata> {
  return await generateSiteMetadata();
}
```

`generateSiteMetadata()` menghasilkan:

1. `title.default` dan `title.template`.
2. `description`.
3. `keywords`.
4. `authors` dan `creator`.
5. Open Graph `website`, `id_ID`, URL root, image 1200x630.
6. Twitter Card `summary_large_image`.
7. Icons dari favicon setting.
8. Robots default index/follow.
9. Google verification jika tersedia.
10. Meta tambahan untuk AI crawler dan Meta domain verification.

Root layout juga menambahkan:

```html
<link rel="ai-reference" type="application/json" href="{appUrl}/ai-reference" />
<meta name="ai-indexable" content="true" />
<meta name="ai-training" content="allowed" />
```

Root Organization JSON-LD di-render dari `generateOrganizationJsonLd(settings)`.

## Metadata Per Route

Route dengan metadata eksplisit yang sudah terlihat di kode:

| Route | Sumber metadata | Structured data |
|-------|-----------------|-----------------|
| `/` | `seo_page_home` + global settings | Root Organization dari layout |
| `/program` | `seo_page_program` | `CollectionPage`, `BreadcrumbList` |
| `/program/[slug]` | Field SEO campaign | `Article`, `BreadcrumbList` |
| `/program/kategori/[slug]` | Field SEO category | Metadata route |
| `/program/pilar/[slug]` | Field SEO pillar | Metadata route |
| `/zakat` | `seo_page_zakat` | `CollectionPage`, `BreadcrumbList` |
| `/zakat/[slug]` | Field SEO zakat type | `BreadcrumbList` |
| `/qurban` | `seo_page_qurban` | `CollectionPage`, `BreadcrumbList` |
| `/qurban/[id]` | Field SEO qurban package | `Product`, `BreadcrumbList` |
| `/wakaf` | `seo_page_wakaf` | `CollectionPage`, `BreadcrumbList` |
| `/page/[slug]` | Field SEO static page | `Article`, `BreadcrumbList` |
| `/laporan` | Settings global fallback | Metadata route |
| `/laporan/[slug]` | Field SEO activity report | `BreadcrumbList` |
| `/zakat/laporan` | Settings global fallback | Metadata route |
| `/qurban/laporan` | Settings global fallback | Metadata route |
| `/daftar-mitra` | Settings global fallback | Metadata route |
| `/mitra/[slug]` | Data mitra | Metadata route |
| `/documentation/[slug]` | Content documentation manifest | Metadata route |

Pola fallback umum:

1. `metaTitle` -> title entity.
2. `metaDescription` -> description/excerpt/content stripped.
3. `canonicalUrl` -> URL route default.
4. `ogTitle` -> SEO title.
5. `ogDescription` -> SEO description.
6. `ogImageUrl` -> feature/entity image -> `settings.og_image` -> `/og` (route dinamis `next/og`).
7. `noIndex`/`noFollow` -> robots override.

## Sitemap

`apps/web/src/app/sitemap.ts` memakai:

```ts
export const dynamic = "force-dynamic";
```

Base URL:

```ts
NEXT_PUBLIC_APP_URL || "https://bantuanku.org"
```

API URL:

```ts
NEXT_PUBLIC_API_URL || "http://localhost:50245/v1"
```

Sitemap berisi:

| Jenis URL | Sumber |
|-----------|--------|
| Static pages | Hardcoded list |
| Zakat calculator pages | Hardcoded slug kalkulator |
| Campaign pages | Paginated `/campaigns?limit=100&page=N` |
| Zakat type pages | `/zakat/types` |
| Qurban package pages | Active periods + packages per period |
| Category pages | `/categories` |
| Pillar pages | `/pillars` |
| Static content pages | `/pages` |
| Activity report pages | Paginated `/activity-reports?limit=100&page=N` |

Activity report sitemap punya dedupe berdasarkan canonical URL dan skip `noIndex === true`.

Catatan penting:

1. Campaign, zakat, qurban, category, pillar, dan static page sitemap belum terlihat memfilter `noIndex`.
2. Sitemap memakai public API runtime; jika API gagal, bagian dynamic yang gagal akan kosong dan hanya bagian lain tetap keluar.
3. Qurban URL memakai `packagePeriodId`, bukan slug SEO-friendly.

## Robots

`apps/web/src/app/robots.ts` menghasilkan:

```ts
{
  userAgent: "*",
  allow: "/",
  disallow: ["/dashboard/", "/checkout/payment-result/", "/api/"],
  sitemap: `${appUrl}/sitemap.xml`
}
```

Tidak ada `apps/web/public/robots.txt` aktif yang menjadi source of truth. Robots dikontrol oleh route Next.js.

Gap: robots route belum punya aturan eksplisit untuk GPTBot, ChatGPT-User, Google-Extended, CCBot, ClaudeBot, PerplexityBot, atau AI crawler lain. AI crawler hanya diberi sinyal lewat metadata root, bukan robots rule khusus.

## AI Reference

Endpoint `/ai-reference` mengembalikan JSON dengan cache header:

```http
Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200
```

Isi utama:

1. Platform name, tagline, description, URL, country, language.
2. Services: Campaign Donations, Zakat, Qurban, Wakaf.
3. Features platform.
4. Organization contact.
5. Social media.
6. Public API endpoint reference.
7. Donation info.
8. Transparency flags.
9. Contact/support info.
10. Metadata version dan purpose.

Endpoint ini membaca `/settings`, tetapi tetap punya fallback jika fetch settings gagal.

## Admin SEO Panel

`apps/admin/src/components/SEOPanel.tsx` adalah komponen edit SEO reusable untuk:

1. `campaign`
2. `page`
3. `zakatType`
4. `qurbanPackage`
5. `activityReport`
6. `category`
7. `pillar`

Field yang diedit:

1. Focus keyphrase.
2. SEO title.
3. Meta description.
4. Canonical URL.
5. No index.
6. No follow.
7. OG title.
8. OG description.
9. OG image URL via `MediaLibrary`.
10. SEO score.

Scoring dilakukan client-side, bukan API analyzer. Check yang digunakan meliputi:

1. Focus keyphrase diisi.
2. Keyphrase di title.
3. Keyphrase di meta description.
4. Keyphrase di slug.
5. Keyphrase di paragraf awal.
6. Keyphrase density.
7. Panjang SEO title.
8. Panjang meta description.
9. Panjang konten.
10. Internal links.
11. Image alt dengan keyphrase.
12. Featured/OG image.
13. Panjang slug.
14. Subheading H2/H3.
15. Keyphrase di subheading.

Skor:

| Range | Warna |
|-------|-------|
| `>= 71` | green |
| `41 - 70` | orange |
| `< 41` | red |

## Admin Settings SEO Page

`apps/admin/src/app/dashboard/settings/seo/page.tsx` mengelola SEO untuk halaman arsip/home:

| Setting key | Label admin | Route |
|-------------|-------------|-------|
| `seo_page_home` | Homepage | `/` |
| `seo_page_program` | Arsip Program | `/program` |
| `seo_page_zakat` | Arsip Zakat | `/zakat` |
| `seo_page_qurban` | Arsip Qurban | `/qurban` |
| `seo_page_wakaf` | Arsip Wakaf | `/wakaf` |

Simpan dilakukan ke:

```http
PUT /admin/settings/batch
```

Payload setiap item:

1. `key`
2. `value` JSON string SEO data
3. `category = "seo_pages"`
4. `type = "json"`
5. `isPublic = true`

## Perbaikan (2026-07-06)

| Item | Sebelum | Sesudah |
|------|---------|---------|
| OG image fallback | `/og-image.jpg` (404) | Route dinamis `/og` via `next/og` `ImageResponse` — mengembalikan 1200×630 branded image |
| Sitemap noIndex filter | Hanya `activity_reports` yang filter `noIndex` | Semua entity (campaign, zakat type, qurban package, category, pillar, static page) kini filter `noIndex === true` |
| AI crawler rules di robots | Tidak ada rule eksplisit AI bot | `robots.ts` sekarang punya explicit `allow: '/'` untuk GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, anthropic-ai, Claude-Web, CCBot, Applebot-Extended — konsisten dengan meta tags di layout |

## Gap Implementasi

| Gap | Dampak |
|-----|--------|
| Tidak ada `llms.txt` | AI assistant tidak punya markdown guidance statis |
| Metadata belum locale-aware penuh | `html lang` bisa berubah, tetapi OG locale/global metadata default masih `id_ID` |
| Tidak ada hreflang/alternate locale URL | Jika i18n dikembangkan ke URL `/en`, SEO belum siap |
| SEO scoring hanya client-side | Tidak ada validasi/skor server-side yang konsisten untuk import/API |
| Tidak ada endpoint `POST /seo/analyze` | Blueprint lama menyebut API analyzer, tetapi implementasi aktual belum ada |
| Tidak ada redirect manager | Canonical tersedia, tetapi redirect SEO umum belum ada kecuali kasus laporan tertentu |
| Qurban detail memakai ID/packagePeriodId | URL belum SEO-friendly slug |
| Static public robots disinggung blueprint lama, tetapi source of truth sekarang route `robots.ts` | Risiko salah edit jika developer membuat `public/robots.txt` baru |
| `settings.value` untuk `seo_pages` adalah JSON string | Parsing tersebar di route web, tidak ada typed parser reusable |

## Perbedaan dari Blueprint Lama

Blueprint lama `03-SEO-blueprint.md` berstatus rencana. Sebagian klaimnya sudah usang terhadap implementasi sekarang:

| Klaim lama | Implementasi aktual |
|------------|---------------------|
| Homepage tanpa metadata | Homepage sudah punya `generateMetadata()` |
| Meta field tidak ada di DB | Field SEO sudah ada di campaigns, pages, zakat_types, qurban_packages, categories, pillars, activity_reports |
| Sitemap sangat terbatas | Sitemap sudah mencakup static, campaign, zakat type, qurban, category, pillar, static page, activity report |
| Robots source di `public/robots.txt` | Source aktual adalah `apps/web/src/app/robots.ts` |
| SEO analyzer API direncanakan | Scoring aktual ada di client `SEOPanel`, bukan API |
| `/admin/seo` direncanakan | UI aktual ada di `/dashboard/settings/seo` dan panel SEO di form entity |

Gap blueprint yang masih relevan:

1. ~~`/og-image.jpg` belum ada.~~ **Selesai (2026-07-06)** — diganti route dinamis `/og`.
2. `llms.txt` belum ada.
3. ~~AI bot robots rule belum spesifik.~~ **Selesai (2026-07-06)** — `robots.ts` sudah punya explicit allow untuk 8 AI bot.
4. Qurban URL belum slug-friendly.
5. Redirect manager belum ada.
6. SEO server-side analyzer belum ada.

## Rekomendasi Perbaikan

Prioritas 1:

1. ~~Tambahkan asset fallback `apps/web/public/og-image.jpg`~~ — **Selesai (2026-07-06)** via route `/og` (`next/og` ImageResponse).
2. ~~Samakan sitemap filtering `noIndex`~~ — **Selesai (2026-07-06)** untuk semua 6 entity type.
3. ~~Tambahkan rules AI crawler di `robots.ts`~~ — **Selesai (2026-07-06)**.
4. Buat helper parser typed untuk `seo_page_*` settings agar JSON parsing tidak berulang dan tidak silent gagal.

Prioritas 2:

1. Tambahkan `llms.txt` atau route `app/llms.txt/route.ts` jika AI guidance ingin didukung.
2. Tambahkan metadata locale-aware: OG locale, title/description fallback, dan strategi hreflang bila URL locale dibuat.
3. Pindahkan SEO scoring penting ke shared helper atau API agar admin, import, dan batch update memakai aturan yang sama.
4. Tambahkan canonical/noIndex handling yang konsisten untuk campaign, zakat, qurban, category, pillar, dan static page di sitemap.

Prioritas 3:

1. Desain slug SEO-friendly untuk qurban package detail tanpa merusak referensi `packagePeriodId`.
2. Tambahkan redirect manager jika banyak URL legacy/canonical berubah.
3. Pertimbangkan WebSite JSON-LD + SearchAction jika search publik sudah stabil.
4. Pertimbangkan FAQPage JSON-LD hanya untuk halaman yang benar-benar punya FAQ di konten, bukan generated palsu.

## Keputusan Source of Truth

1. Source of truth SEO runtime web adalah `apps/web/src/lib/seo.tsx`, route metadata, `sitemap.ts`, `robots.ts`, dan `ai-reference/route.ts`.
2. Source of truth SEO editor adalah `apps/admin/src/components/SEOPanel.tsx` dan form entity terkait.
3. Source of truth data SEO adalah schema Drizzle di `packages/db/src/schema/**`.
4. Blueprint lama yang menyebut kondisi sebelum field SEO, sitemap luas, atau homepage metadata tidak boleh dipakai sebagai referensi implementasi aktual.
