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

1. `prettyJSON()` aktif global. Ini membuat response JSON lebih mudah dibaca, tetapi menambah ukuran payload dibanding compact JSON.
2. `dbMiddleware` dipasang sebelum semua route handler, termasuk route yang mungkin tidak butuh DB setelah `/uploads` dan `/health` root. Untuk `/v1/*`, hampir semua route memang butuh DB.
3. Tidak ada request duration metrics, tracing, slow query log, atau endpoint metrics.

---

## API Cache Middleware

`apps/api/src/middleware/cache.ts` menyediakan cache berbasis `Map`:

| Export | TTL |
|--------|-----|
| `campaignCache` | 60 detik |
| `categoryCache` | 300 detik |
| `settingsCache` | 600 detik |

Perilaku helper:

- hanya cache method `GET`;
- key = path + query string;
- simpan body response 200 sebagai string;
- hit mengembalikan `X-Cache: HIT`;
- miss mengembalikan `X-Cache: MISS`;
- set `Cache-Control: public, max-age=...`;
- cleanup expired cache dilakukan inline pada setiap request.

Status aktual: **helper ini tidak dipakai oleh route mana pun**. Tidak ada import `campaignCache`, `categoryCache`, atau `settingsCache` di route API.

Konsekuensi:

1. Endpoint JSON API tidak mendapat server-side cache dari middleware ini.
2. Public API seperti campaigns, settings, categories, public stats, dan activity reports selalu hit handler/DB kecuali ada cache di layer lain.
3. Jika middleware ini nanti dipasang, perlu audit PII dan auth karena `Cache-Control: public` tidak aman untuk endpoint user/admin.

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

### Banyak service publik memakai `no-store`

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
