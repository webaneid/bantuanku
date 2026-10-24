# Arsitektur Cache Performance

> Terakhir di-sync: 2026-07-02

---

## Overview

Cache dan performance Bantuanku saat ini belum memakai cache layer terpusat seperti Redis, CDN rule repo, edge cache, atau query result cache persistent. Implementasi aktual terdiri dari:

- compression middleware global di API;
- cache helper API berbasis `Map`, tetapi belum dipasang di route;
- local upload file cache berbasis `global.uploadedFiles`;
- React Query cache di admin/web;
- beberapa fetch Next.js dengan `revalidate`;
- banyak fetch public web yang sengaja `no-store`;
- Next image optimization dan varian media WebP;
- beberapa Map in-memory untuk bot/rate-limit/scheduler.

Dokumen ini mencatat cache/performance yang benar-benar berjalan di kode dan gap yang perlu diputuskan sebelum optimasi production.

Dokumen terkait:

- `arsitektur-api-routing.md` — middleware order, route root, rate limit, `/uploads`.
- `arsitektur-media.md` — image processing, variants, GCS/local fallback.
- `arsitektur-seo.md` — SEO settings cache, sitemap, AI reference cache.
- `arsitektur-search-discovery.md` — search/autocomplete/listing discovery dan performance query search.
- `arsitektur-pages-cms.md` — CMS page `no-store`, sidebar fetch, sitemap pages, dan invalidation gap.
- `arsitektur-documentation-center.md` — static documentation content dan build-time behavior.
- `arsitektur-activity-reports.md` — public activity reports dengan `revalidate`.
- `arsitektur-statistik.md` — statistik admin dan public stats.
- `arsitektur-observability-logging.md` — belum ada metrics/performance monitoring.
- `arsitektur-security.md` — cache publik, secret/PII, dan rate limit in-memory.
- `arsitektur-testing-qa.md` — belum ada performance/regression test.
- `arsitektur-deployment.md` — PM2 process, multi-instance risk, local uploads.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| API middleware order | `apps/api/src/index.ts` |
| Compression middleware | `apps/api/src/middleware/compression.ts` |
| Cache middleware tidak aktif | `apps/api/src/middleware/cache.ts` |
| Rate limit in-memory | `apps/api/src/middleware/ratelimit.ts` |
| Local uploads cache | `apps/api/src/index.ts` |
| Image processor | `apps/api/src/lib/image-processor.ts` |
| Media upload | `apps/api/src/routes/admin/media.ts` |
| Public stats queries | `apps/api/src/routes/public-stats.ts` |
| Web QueryClient | `apps/web/src/app/providers.tsx` |
| Admin QueryClient | `apps/admin/src/app/providers.tsx` |
| Admin address query cache | `apps/admin/src/lib/hooks/use-indonesia-address.ts` |
| Web fetch services | `apps/web/src/services/*.ts` |
| SEO settings memory cache | `apps/web/src/lib/seo.tsx` |
| AI reference route cache header | `apps/web/src/app/ai-reference/route.ts` |
| Next image config | `apps/web/next.config.js`, `apps/admin/next.config.ts` |
| WhatsApp AI in-memory cache/context | `apps/api/src/services/whatsapp-ai.ts` |
| Scheduler local cache | `apps/api/src/services/savings-reminder.ts` |

---

## Program Optimasi Kecepatan (2026-10-24)

> Hasil terukur (First Load JS gzip, build produksi): beranda 234 → **169 kB**, `/invoice/[id]` 342 → 145 kB, checkout 241 → 193 kB. Target < 150 kB belum tercapai; sisa langkah ada di baris fase 6.

Tujuan: halaman publik terbuka secepat mungkin dan ringan untuk VPS. Dikerjakan per fase, tiap fase satu commit.

**Baseline (sebelum optimasi):**

| Metrik | Nilai |
|--------|-------|
| TTFB HTML beranda produksi (`bantuanku.org`, lewat Cloudflare) | 0,60 dtk (`cf-cache-status: DYNAMIC`, `cache-control: no-store`) |
| First Load JS beranda | 234 kB gzip (dasar Next+React 88 kB) |
| First Load JS `/invoice/[id]` | 342 kB |
| `/_next/image` | Cloudflare tidak men-cache (`DYNAMIC`), tiap gambar memukul optimizer di VPS |
| `/_next/static/*` | sudah `immutable` + `HIT` di Cloudflare (OK) |

**Keputusan:** locale tetap dari cookie (halaman tidak bisa SSG penuh), jadi cache dilakukan di lapis data (Next Data Cache `revalidate` + tag) dan lapis API. Kesegaran: campaign 60 dtk; settings/kategori/halaman CMS 5 mnt. Target: JS beranda < 150 kB, LCP mobile < 2 dtk.

| Fase | Isi | Status |
|------|-----|--------|
| 1 | Bundel: `TestimonialSection` jadi server component + scroll-snap CSS (tanpa Swiper/axios/react-query di klien); `jspdf`/`html2canvas` dimuat lewat `import()` saat tombol unduh diklik | Selesai: beranda 234 → 194 kB, `/invoice/[id]` 342 → 169 kB |
| 2 | Waterfall beranda: semua fetch dimulai paralel di awal `HomePage` (helper `started`), satu fetch campaign (`limit=100`) dipakai untuk carousel + menu kategori, paket qurban per periode paralel; id Pixel/GTM dioper dari `layout` → `Providers` (tanpa `/settings` dari browser) | Selesai (isi HTML identik, diverifikasi) |
| 3 | Next Data Cache: fetch server publik pakai `revalidate` + tag (campaign 60 dtk; settings/kategori/stats/qurban/pages/laporan/zakat 5 mnt); `POST /revalidate-cache` (web) dipanggil `webRevalidateMiddleware` (API) setelah mutasi admin; service memakai `lib/api-url.ts` (`API_INTERNAL_URL`) | Selesai (diuji: cache hit tanpa hit API, revalidate per tag, 401 tanpa secret) |
| 4 | Cache respons API publik di memori (`cache.ts`, TTL 60 dtk–5 mnt) + dikosongkan saat mutasi admin; `status` publik campaign di-whitelist (draft tidak bocor). `prettyJSON` ternyata hanya aktif dengan `?pretty` (tidak perlu dimatikan) | Selesai (diuji: MISS/HIT, 500 tak di-cache, invalidasi hanya pada mutasi sukses) |
| 5 | Loader `next/image` kustom (`lib/image-loader.ts`, `loader: 'custom'`): media WebP (CDN/GCS/API) dikembalikan apa adanya, Unsplash di-resize lewat parameter URL; `/_next/image` tidak dipakai/dilayani lagi. Upload GCS baru diberi `Cache-Control: public, max-age=31536000, immutable` | Selesai (diuji: 0 request `/_next/image`, 13 gambar termuat, fallback Unsplash) |
| 6 | Hydration/bundel klien: kamus i18n hanya `id` di bundel klien (kamus `en` dikirim server sebagai props hanya bila locale `en`, lazy saat ganti bahasa); `lib/format.ts` dipisah dari `format-date.ts` (date-fns tak lagi di semua halaman); `lib/auth.ts` memuat axios lazy; `CategoryGrid`/`ZakatCard` jadi server component | Selesai: beranda 194 → 169 kB, checkout 241 → 193 kB, `/program` 199 → 191 kB. Sisa (belum): `ProgramCard`/`Footer`/`Header` masih client (`useI18n`, `useSettings`), React Query di root |
| 7 | Rekomendasi Cloudflare/reverse proxy (tidak ada konfigurasi di repo) | Belum |

---

## API Runtime Performance

Middleware global API saat ini:

```text
logger
-> cors
-> securityHeaders
-> compressionMiddleware
-> prettyJSON
-> apiRateLimit
-> validateContentType
-> dbMiddleware
-> route handler
```

`compressionMiddleware` memakai `hono/compress` dan aktif untuk semua route.

Catatan performance:

1. `prettyJSON()` aktif global tetapi hanya memformat bila ada query `?pretty` (terverifikasi: respons normal compact), jadi tidak menambah payload.
2. `dbMiddleware` dipasang sebelum semua route handler, termasuk route yang mungkin tidak butuh DB setelah `/uploads` dan `/health` root. Untuk `/v1/*`, hampir semua route memang butuh DB.
3. Tidak ada request duration metrics, tracing, slow query log, atau endpoint metrics.

---

## API Cache Middleware

`apps/api/src/middleware/cache.ts` — cache respons GET di memori proses API (aktif sejak fase 4, 2026-10-24):

| Export | TTL | Dipasang di |
|--------|-----|-------------|
| `campaignCache` | 60 dtk | `GET /campaigns`, `/featured`, `/urgent`, `/:idOrSlug` |
| `categoryCache` | 5 mnt | `/categories`, `/pillars` |
| `settingsCache` | 5 mnt | `/settings` (+ `/bank-accounts`) |
| `statsCache` | 2 mnt | `/public-stats/*` |

Aturan:

- hanya `GET` berstatus 200; kunci = path + query (Authorization TIDAK ikut kunci → hanya untuk endpoint yang sama untuk semua pengunjung); request ber-`search` tidak di-cache; maksimum 300 entri (terlama dibuang);
- header ke klien `Cache-Control: public, max-age=0, must-revalidate` + `X-Cache: HIT|MISS` (browser tidak menahan data basi);
- `clearApiCache()` dipanggil `webRevalidateMiddleware` setiap mutasi admin sukses (`POST/PUT/PATCH/DELETE /v1/admin/*`, status < 400);
- endpoint donor (`/campaigns/:id/donors`, `/updates`) dan semua rute berotentikasi TIDAK di-cache;
- cache per proses; aman selama API satu proses (PM2 fork). Bila kelak multi-instance, invalidasi harus lewat penyimpanan bersama.
- Perubahan lewat jalur non-admin (donasi masuk, mitra) hanya mengandalkan TTL (campaign 60 dtk).

Catatan terkait: `GET /campaigns?status=` kini hanya menerima `active|completed|closed` (nilai lain, termasuk `draft`, jatuh ke `active`) agar draft tidak bocor lewat endpoint publik.

---

## Cache Headers API

Header cache aktif yang ditemukan:

| Route | Header |
|-------|--------|
| `GET /uploads/:filename` | `Cache-Control: public, max-age=31536000` |

Tidak ditemukan header `ETag` atau `Last-Modified`.

Endpoint JSON API lain tidak memasang `Cache-Control` eksplisit, kecuali jika kelak memakai middleware cache yang saat ini belum terpasang.

---

## Local Uploads Cache

`GET /uploads/:filename`:

1. cek `global.uploadedFiles`;
2. jika tidak ada, baca file dari `process.cwd()/uploads/<filename>`;
3. cache buffer ke `global.uploadedFiles`;
4. return file dengan `Cache-Control: public, max-age=31536000`.

Gap:

1. `global.uploadedFiles` tidak punya TTL dan tidak punya batas ukuran.
2. Memory bisa tumbuh mengikuti jumlah file yang pernah diminta.
3. Cache hanya per process; tidak shared antar PM2 instance.
4. `max-age=31536000` aman hanya jika filename immutable. Jika file bisa diganti dengan nama sama, browser/CDN bisa menyajikan versi lama.
5. Tidak ada purge/invalidation.

---

## Frontend Query Cache

### Web

`apps/web/src/app/providers.tsx`:

| Setting | Nilai |
|---------|-------|
| `staleTime` | 60 detik |
| `refetchOnWindowFocus` | `false` |
| `retry` | `1` |

### Admin

`apps/admin/src/app/providers.tsx`:

| Setting | Nilai |
|---------|-------|
| `staleTime` | 60 detik |
| `refetchOnWindowFocus` | `false` |
| `retry` | default React Query, tidak diset global |

Override penting:

| Area | Cache |
|------|-------|
| Admin address hooks | `staleTime: Infinity` untuk provinsi/kabupaten/kecamatan/desa/complete address. |
| Donor/Mustahiq modal master data | job title dan income range `staleTime: 30 menit`. |
| Sidebar/admin layout | beberapa query `staleTime: 5 menit`. |
| Reports tertentu | beberapa query `staleTime: 0`. |
| Qurban savings detail | `staleTime: 0`, `gcTime: 0`. |
| List pagination tertentu | `placeholderData: keepPreviousData`. |

Catatan: React Query cache ini hanya cache browser/client, bukan server cache.

---

## Next.js Fetch Cache

### Next Data Cache + invalidasi (sejak fase 3, 2026-10-24)

Service publik di `apps/web/src/services/*.ts` memakai `next: { revalidate, tags }` (bukan lagi `no-store`):

| Tag | TTL | Service |
|-----|-----|---------|
| `campaigns` | 60 dtk | `campaigns.ts`, `/program/pilar/[slug]` |
| `categories` | 5 mnt | `categories.ts` |
| `stats` | 5 mnt | `stats.ts` |
| `qurban` | 5 mnt | `qurban.ts` |
| `pages` | 5 mnt | `pages.ts` |
| `settings` | 5 mnt | `settings.ts`, `lib/seo.tsx` (`fetchSeoSettings`, tanpa cache variabel modul lagi), `testimonials.ts` (1 jam) |
| `reports` | 5 mnt | `public-reports.ts`, `/laporan`, `/laporan/[slug]` |
| `zakat` | 5 mnt | `zakat.ts` (GET) |

Sengaja TIDAK di-cache: `sitemap.ts` (lihat lessons-learned 2026-10-23), `/mitra/[slug]`, dan semua panggilan berotentikasi/POST. Respons non-OK (4xx/5xx) tidak masuk cache.

**Invalidasi:** `apps/api/src/middleware/web-revalidate.ts` (dipasang di `/v1/admin/*` pada `index.ts`) — setelah POST/PUT/PATCH/DELETE sukses, memetakan segmen route admin ke tag (`ROUTE_TAGS`) lalu `POST {WEB_INTERNAL_URL}/revalidate-cache` dengan header `x-revalidate-secret`. Route web `app/revalidate-cache/route.ts`: wajib `REVALIDATE_SECRET` (503 bila kosong, 401 bila salah, `timingSafeEqual`), hanya tag dalam whitelist. Fire-and-forget; bila gagal/dimatikan (env kosong) cache tetap kedaluwarsa sendiri sesuai TTL. Perubahan data oleh jalur non-admin (donasi masuk, mitra) hanya mengandalkan TTL.

**URL API server:** `lib/api-url.ts` memakai `API_INTERNAL_URL` bila di-set (fetch SSR langsung ke API di VPS, tanpa memutar lewat Cloudflare), kalau tidak jatuh ke `NEXT_PUBLIC_API_URL`. Variabel ini bukan `NEXT_PUBLIC_*` sehingga di browser otomatis tidak terpakai.

Cache ini tersimpan di `.next/cache` pada VPS: kosong setelah build ulang, dan per-instance (PM2 satu proses web = konsisten).

### Sebelum fase 3: banyak service publik memakai `no-store`

Service web berikut memakai `cache: "no-store"`:

- campaigns;
- categories;
- pages;
- qurban;
- zakat;
- stats;
- settings;
- public reports;
- mitra detail.

Konsekuensi:

1. Data publik lebih fresh.
2. Server/API lebih sering menerima request.
3. Page yang bisa statis/ISR tidak dimanfaatkan penuh.

### Fetch dengan `revalidate`

| Area | TTL |
|------|-----|
| `fetchSeoSettings()` | memory cache 5 menit + fetch `revalidate: 300`. |
| `apps/web/src/app/laporan/page.tsx` | activity reports list `revalidate: 300`. |
| `apps/web/src/app/laporan/[slug]/page.tsx` | activity report detail `revalidate: 300`. |
| `apps/web/src/app/program/pilar/[slug]/page.tsx` | `revalidate: 60`. |
| `apps/web/src/app/ai-reference/route.ts` | fetch settings `revalidate: 3600`. |

### Force dynamic

| Route | Setting |
|-------|---------|
| `apps/web/src/app/sitemap.ts` | `dynamic = "force-dynamic"`. |
| `apps/web/src/app/zakat/page.tsx` | `dynamic = "force-dynamic"`, `revalidate = 0`. |

Gap:

1. Kebijakan `no-store` vs `revalidate` belum konsisten per jenis data.
2. Tidak ada dokumen invalidation saat admin mengubah campaign/settings/page/media/SEO.
3. Sitemap force-dynamic berarti setiap request membangun ulang dari API runtime.

---

## SEO dan AI Reference Cache

`fetchSeoSettings()` memakai dua cache:

1. in-memory module variable 5 menit;
2. Next fetch `revalidate: 300`.

`/ai-reference`:

- fetch settings dengan `revalidate: 3600`;
- response header:

```http
Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200
```

Gap:

1. Cache SEO bersifat per process/render runtime.
2. Update settings SEO tidak punya explicit purge.
3. Jika API settings error, fallback default dipakai tanpa negative-cache policy eksplisit.

---

## Image dan Media Performance

> **Sejak fase 5 (2026-10-24):** `next.config.js` memakai `images.loader: 'custom'` → `src/lib/image-loader.ts`. Endpoint `/_next/image` tidak dilayani (404) sehingga tidak ada resize/encode AVIF di VPS. Media `.webp` dari host CDN/GCS/API dikembalikan apa adanya (varian dipilih di kode lewat `getImageUrlByVariant`, tanpa penukaran otomatis karena kategori `financial/activity/document` hanya punya `original`); Unsplash memakai parameter `w/q/auto=format`; sumber lain apa adanya. Konsekuensi: gambar non-WebP (mis. bukti bayar JPEG) tidak lagi di-resize; srcset berisi URL yang sama untuk semua lebar (browser tetap mengunduh satu file). Objek GCS lama masih `max-age=3600`; untuk menyamakan: `gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "gs://<bucket>/bantuanku/**"` (nama objek unik, aman).


Media library memproses image via `sharp`:

| Category | Varian |
|----------|--------|
| `general` | `thumbnail`, `medium`, `large`, `square`, `original`. |
| `financial`, `activity`, `document` image | single WebP `original`. |
| PDF | tidak diproses image. |

`sharp` dimuat lazy lewat dynamic import dan dicache di module variable `sharpLoader`.

WebP options:

```ts
quality: 82
effort: 4
```

Next image config:

| App | Remote image domains |
|-----|----------------------|
| Web | localhost uploads, localhost, Unsplash, `api.bantuanku.org`, `cdn.bantuanku.org`, `placehold.co`, `storage.googleapis.com/cdn.webane.net/**`. |
| Admin | Gravatar, `storage.googleapis.com/cdn.webane.net/**`, localhost uploads. |

Gap:

1. Upload image processing berjalan serial per varian, bukan parallel.
2. Tidak ada queue/background worker untuk image processing.
3. Local uploads fallback dapat membebani API process untuk static file serving.
4. CDN/GCS cache policy tidak didefinisikan di repo.
5. Placeholder SVG dibuat inline di web helper; baik untuk fallback kecil, tetapi tidak punya observability untuk missing image rate.

---

## Database dan Query Performance

Repo memiliki beberapa migration yang menambahkan index untuk alamat, bank account, qurban shared group, transactions, activity reports, dan field lain. Namun tidak ada performance testing atau query plan test otomatis.

Endpoint yang berpotensi berat:

| Area | Catatan |
|------|---------|
| `public-stats` | Menjalankan beberapa aggregate query paralel dan beberapa report query limit 100-200. Tidak ada cache header/server cache. |
| Admin reports | Banyak report memakai query agregasi dan beberapa query client `staleTime: 0`. |
| Export/import | CSV/export bisa mengambil data besar; detail ada di `arsitektur-export-import.md`. |
| Search/autocomplete | Belum terlihat cache server-side; perlu audit limit/index. |
| Activity reports public | Fetch web memakai `revalidate: 300`, tetapi API route sendiri tidak cache. |

Gap:

1. Tidak ada slow query log.
2. Tidak ada query plan baseline.
3. Tidak ada cache materialized view/table untuk statistik publik.
4. Tidak ada pagination/limit policy terpusat.
5. Tidak ada load test untuk report/export/statistik.

---

## In-Memory State yang Berdampak Performance

| Area | Implementasi | Risiko |
|------|--------------|--------|
| Rate limit | `Map` per process, cleanup per request. | Tidak shared multi-instance, memory tumbuh sesuai IP/path aktif. |
| API cache helper | `Map`, tidak aktif. | Jika diaktifkan, perlu TTL/invalidation dan batas memory. |
| Upload file cache | `global.uploadedFiles`. | Tidak ada TTL/size cap. |
| WhatsApp AI context | `Map` TTL 30 menit, history max 20 pesan. | Tidak durable dan tidak shared. |
| Gold price bot cache | 1 jam. | Per process dan fallback settings. |
| Savings reminder period bounds | local `Map` per run. | Aman, scope lokal job. |

---

## Cache Invalidation

Belum ada mekanisme invalidation eksplisit untuk:

- campaign update;
- category/pillar update;
- settings update;
- SEO update;
- media replace/delete;
- activity report publish/update;
- statistics/report aggregates.

Saat ini freshness bergantung pada:

1. `no-store` untuk banyak service web;
2. React Query stale time di browser;
3. ISR/fetch `revalidate` pada route tertentu;
4. browser/CDN cache untuk `/uploads`.

Gap paling penting: jika server-side cache API nanti diaktifkan, harus ada invalidation per mutation atau TTL sangat pendek dan aman.

---

## Performance Observability

Belum ada:

- request duration metric;
- DB query duration metric;
- cache hit/miss metric aktif;
- memory usage metric;
- queue/job duration metric;
- CDN hit ratio;
- Web Vitals reporting;
- load test script.

`X-Cache` hanya akan muncul jika middleware cache dipasang, dan saat ini tidak aktif.

---

## Risk Register

| Risiko | Dampak | Rekomendasi |
|--------|--------|-------------|
| API cache middleware ada tapi tidak dipakai | Developer bisa mengira endpoint sudah cache padahal belum. | Dokumentasikan per route dan pasang hanya untuk endpoint publik aman. |
| `Cache-Control: public` di helper cache | Jika dipakai ke endpoint auth/admin, data sensitif bisa tercache publik. | Tambah guard: hanya public route allowlist, skip Authorization. |
| `global.uploadedFiles` tanpa batas | Memory leak pada file populer/banyak. | Tambah LRU/TTL/size cap atau pindahkan static serving ke CDN/reverse proxy. |
| Banyak public service `no-store` | API/DB load tinggi untuk data yang relatif jarang berubah. | Tetapkan policy per domain: real-time vs ISR/cache. |
| Tidak ada invalidation | Cache bisa stale setelah admin update. | Buat invalidation event untuk settings, campaign, media, report. |
| Statistik/report tanpa cache | Aggregate query bisa mahal saat traffic naik. | Tambah cache pendek/materialized aggregate untuk public stats. |
| Pretty JSON global | Payload API lebih besar. | Matikan di production atau aktifkan hanya dev. |
| Rate limit Map in-memory | Tidak aman multi-instance dan bisa memory-heavy. | Redis/DB backed rate limit. |
| Tidak ada performance metrics | Bottleneck baru diketahui setelah user terdampak. | Tambah request/query timing dan dashboard minimal. |

---

## Rekomendasi Arsitektur Target

Urutan yang disarankan:

1. Tetapkan klasifikasi cache:
   - `realtime`: transaksi, payment, auth, admin mutation result;
   - `short-cache`: campaigns list, categories, public stats;
   - `medium-cache`: settings publik, SEO, activity reports;
   - `long-cache`: immutable media variants.
2. Matikan `prettyJSON` di production atau buat environment guard.
3. Tambah cache policy di API hanya untuk route publik allowlist.
4. Tambah skip cache bila ada `Authorization` header.
5. Ganti `global.uploadedFiles` dengan LRU/TTL atau pindahkan static file serving ke reverse proxy/CDN.
6. Buat invalidation setelah admin update settings/campaign/page/media/activity report.
7. Tambah Redis bila butuh shared cache/rate limit multi-instance.
8. Tambah metrics: request duration, DB duration, cache hit/miss, memory usage.
9. Tambah performance test untuk public stats, reports, search, checkout, dan upload media.

---

## SOP Perubahan Cache

1. Jangan cache endpoint authenticated atau admin kecuali ada proof tidak mengandung PII dan cache scoped per user.
2. Cache publik harus punya TTL dan invalidation strategy.
3. Setiap `Cache-Control: public` harus diaudit terhadap data sensitif.
4. File/media boleh long-cache hanya jika filename immutable.
5. In-memory cache wajib punya TTL dan batas ukuran sebelum dianggap production-safe.
6. Untuk multi-instance, jangan mengandalkan Map process-local untuk state yang harus konsisten.
7. Setiap optimasi query besar harus disertai cara ukur: waktu response, query plan, atau load test.
8. Setiap dokumen arsitektur domain yang menambahkan endpoint publik harus menyebut cache policy endpoint tersebut.

---

## File Lama / Dokumen Lama

Tidak ditemukan dokumen lama khusus cache/performance di root atau `docs/` yang bisa dihapus.
