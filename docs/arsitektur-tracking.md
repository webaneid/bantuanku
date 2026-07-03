# Arsitektur Tracking

Dokumen ini adalah source of truth untuk tracking iklan/analytics yang ada di kode: Meta Pixel client-side, Google Tag Manager, Meta Conversions API server-side, dan integrasi setting admin.

Dokumen ini menyerap dan mengoreksi `docs/analisa-pixel.md` serta mengompresi `docs/tutorial-pixel-standard-spesifik-peristiwa.md` menjadi mapping yang relevan untuk Bantuanku. Klaim lama yang sudah tidak sesuai kode saat ini tidak dipertahankan.

Detail search discovery, Header search, `ProgramListTemplate`, dan trigger Meta Pixel `Search` dirujuk ke `docs/arsitektur-search-discovery.md`.

## Ruang Lingkup

| Area | Status Implementasi | Source Code |
|------|---------------------|-------------|
| Meta Pixel base script + PageView | Aktif jika `meta_pixel_id` public terisi | `apps/web/src/components/MetaPixel.tsx` |
| Meta Pixel standard events | Aktif lewat helper typed | `apps/web/src/lib/fbPixel.ts` |
| Google Tag Manager | Aktif jika `gtm_container_id` public terisi | `apps/web/src/components/GoogleTagManager.tsx` |
| Meta CAPI Purchase | Aktif saat payment success/approve manual | `apps/api/src/lib/meta-capi.ts`, `apps/api/src/routes/payments.ts`, `apps/api/src/routes/transactions.ts` |
| Admin integration settings | Aktif | `apps/admin/src/app/dashboard/settings/integration/page.tsx`, `apps/api/src/routes/admin/settings.ts` |

## Settings

Semua setting tracking berada di category `integration`.

| Key | Public | Fungsi |
|-----|--------|--------|
| `google_site_verification` | Ya | Meta tag Google Search Console |
| `meta_domain_verification` | Ya | Meta tag domain verification |
| `meta_pixel_id` | Ya | ID Meta Pixel yang dibaca frontend |
| `meta_capi_access_token` | Tidak | Token CAPI server-side |
| `gtm_container_id` | Ya | Container ID GTM |

`meta_capi_access_token` termasuk key `_access_token`, sehingga disimpan lewat rule enkripsi/dekripsi di admin settings API. CAPI mengirim token lewat header `Authorization: Bearer ...`, bukan query parameter.

## Web Provider Mounting

`apps/web/src/app/providers.tsx` memasang `MetaPixel` dan `GoogleTagManager` di root provider, sehingga berlaku global untuk frontend web.

```text
RootLayout
  -> Providers
    -> CartProvider
      -> ReferralCapture
      -> MetaPixel
      -> GoogleTagManager
      -> children
```

`MetaPixel` dan `GoogleTagManager` mengambil setting dari `/v1/settings` memakai `NEXT_PUBLIC_API_URL` dengan fallback lokal `http://localhost:50245/v1`.

## Meta Pixel Client-Side

`MetaPixel`:

| Perilaku | Implementasi |
|----------|--------------|
| Load script | Inject `https://connect.facebook.net/en_US/fbevents.js` saat `meta_pixel_id` tersedia |
| Init | `fbq("init", pixelId)` |
| PageView awal | `fbq("track", "PageView")` setelah init |
| SPA navigation | `fbPixel.pageView()` saat pathname/search params berubah |
| Noscript fallback | Render image `facebook.com/tr?id=...&ev=PageView&noscript=1` |

`fbPixel.ts` menyediakan helper event standar:

| Helper | Event Meta |
|--------|------------|
| `pageView()` | `PageView` |
| `viewContent()` | `ViewContent` |
| `addToCart()` | `AddToCart` |
| `addToWishlist()` | `AddToWishlist` |
| `initiateCheckout()` | `InitiateCheckout` |
| `addPaymentInfo()` | `AddPaymentInfo` |
| `purchase()` | `Purchase` |
| `lead()` | `Lead` |
| `completeRegistration()` | `CompleteRegistration` |
| `contact()` | `Contact` |
| `search()` | `Search` |

Helper `track()` menunggu `fbq` siap dengan retry maksimal 20 kali per 250 ms. Beberapa helper mendukung `eventID`, dan `generateEventId(prefix)` tersedia untuk dedup Pixel-CAPI.

## Trigger Pixel Aktual

| Event | Trigger Aktual |
|-------|----------------|
| `PageView` | Global saat Pixel init dan saat route SPA berubah |
| `ViewContent` campaign | Detail campaign di `CampaignSidebar`, `content_ids=[campaign.id]` |
| `ViewContent` qurban | Detail qurban di `QurbanSidebar`, `content_ids=[packagePeriodId]`, `value=price` |
| `ViewContent` zakat | Detail zakat memakai `ViewContentTracker`, `content_ids=[zakatType.id]` |
| `InitiateCheckout` | Page checkout mount jika cart punya item, membawa `content_ids`, `num_items`, `value`, `eventID` |
| `AddPaymentInfo` | Saat user memilih metode pembayaran di `UniversalPaymentMethodSelector`, `content_ids=[transactionId]` |

Tidak ditemukan trigger `fbPixel.purchase()` aktif di frontend web. Purchase sekarang dikirim server-side lewat CAPI saat pembayaran sukses atau approve manual.

## Checkout dan Signal Matching

Checkout membaca cookie Meta:

| Cookie | Disimpan Sebagai |
|--------|------------------|
| `_fbc` | `type_specific_data.meta_fbc` |
| `_fbp` | `type_specific_data.meta_fbp` |

Untuk setiap item checkout, frontend membuat `meta_event_id` dengan prefix:

| Item | Prefix |
|------|--------|
| Campaign/fidyah | `purchase_campaign` |
| Zakat | `purchase_zakat` |
| Qurban | `purchase_qurban` |

Nilai `meta_event_id`, `meta_fbc`, dan `meta_fbp` dikirim ke API di `type_specific_data`. API memakai nilai tersebut saat mengirim CAPI `Purchase`.

## Meta CAPI

`sendCAPIEvent()` mengirim ke Graph API `v21.0`.

Payload event:

| Field | Implementasi |
|-------|--------------|
| `event_name` | Dari caller, saat ini `Purchase` |
| `event_time` | Unix timestamp server |
| `event_id` | `meta_event_id` dari checkout, fallback `purchase_{transactionId}` |
| `event_source_url` | `${frontendUrl}/checkout` |
| `action_source` | `website` |
| `user_data` | Hash SHA-256 untuk `em`, `ph`, `fn`, `external_id`; raw `fbc/fbp`; IP dan user-agent jika ada |
| `custom_data.currency` | `IDR` |
| `custom_data.value` | `transaction.totalAmount` |
| `custom_data.content_ids` | `[transaction.productId]` |
| `custom_data.content_type` | `product` |
| `custom_data.num_items` | `transaction.quantity || 1` |
| `custom_data.content_name` | `transaction.productName` |
| `custom_data.content_category` | `transaction.productType` |

Reliability saat ini:

| Area | Implementasi |
|------|--------------|
| Retry in-process | 3 kali untuk HTTP `429` atau `5xx`, delay 1s/3s/10s |
| Persistence | Tidak ada queue/outbox table |
| Error handling | Error dicatat ke log, caller tidak digagalkan |

## Trigger CAPI Purchase Aktual

| Trigger | Source Code | Catatan |
|---------|-------------|---------|
| Gateway webhook success | `apps/api/src/routes/payments.ts` | Hanya saat `parsed.status === "success"` |
| Approve payment manual | `apps/api/src/routes/transactions.ts` | Setelah transaksi diubah menjadi `paid` |

Klaim lama bahwa CAPI Purchase dikirim saat create transaction sudah tidak sesuai dengan kode saat ini. Route create transaction tidak lagi mengirim CAPI Purchase; create transaction hanya menyimpan `meta_event_id` dan cookie Meta yang dikirim frontend.

## Google Tag Manager

`GoogleTagManager`:

| Perilaku | Implementasi |
|----------|--------------|
| Load script | Inject `https://www.googletagmanager.com/gtm.js?id={gtm_container_id}` |
| Init dataLayer | Push `{ "gtm.start": Date.now(), event: "gtm.js" }` |
| SPA pageview | Push `{ event: "virtualPageview", pagePath, pageTitle }` saat route berubah |
| Noscript fallback | Render iframe `googletagmanager.com/ns.html?id=...` |

Tidak ada definisi event e-commerce GTM khusus di kode. GTM saat ini bertugas sebagai container umum dan virtual pageview.

## Mapping Event Standar Meta Untuk Bantuanku

Dokumen tutorial lama berisi daftar event standar Meta generik. Mapping yang relevan untuk Bantuanku:

| Standard Event | Status di Bantuanku | Definisi Bisnis |
|----------------|---------------------|-----------------|
| `PageView` | Aktif | Semua halaman frontend web |
| `ViewContent` | Aktif | User membuka detail campaign, qurban, atau zakat |
| `AddToCart` | Helper tersedia, trigger perlu audit lanjutan | User memilih nominal/produk lalu menambah ke keranjang |
| `InitiateCheckout` | Aktif | User membuka checkout dengan cart berisi item |
| `AddPaymentInfo` | Aktif | User memilih metode pembayaran |
| `Purchase` | Aktif server-side via CAPI | Pembayaran sukses gateway atau approve manual |
| `CompleteRegistration` | Helper tersedia, trigger perlu audit lanjutan | User berhasil registrasi |
| `Lead` | Helper tersedia, trigger perlu audit lanjutan | User mengirim inquiry/kontak |
| `Contact` | Helper tersedia, trigger perlu audit lanjutan | User klik kontak/WhatsApp |
| `Search` | Aktif pada search listing program; Header search belum fungsional | User melakukan pencarian program |

Event yang tidak relevan langsung untuk domain donasi, seperti `StartTrial`, `Subscribe`, `CustomizeProduct`, atau `FindLocation`, tidak menjadi standar internal saat ini.

## Gap dan Rekomendasi

1. **Dedup Pixel-CAPI Purchase belum end-to-end.** `event_id` CAPI ada, tetapi browser tidak mengirim `Purchase` pasangan saat paid-success. Jika ingin dedup browser+server, perlu event browser pada thank-you/paid page dengan `eventID` yang sama, atau putuskan CAPI-only untuk Purchase.
2. **CAPI retry belum persisten.** Retry saat ini hanya in-process. Jika proses restart atau request timeout, event gagal tidak bisa dipulihkan. Tambahkan outbox table untuk CAPI jika tracking paid harus kuat.
3. **Admin manual approval memakai user-agent/IP admin.** Purchase manual approval memakai request admin sebagai `client_ip_address` dan `client_user_agent`, bukan browser donatur. Lebih baik simpan original user-agent/IP saat checkout/create payment.
4. **`AddPaymentInfo` memakai transactionId sebagai `content_ids`.** Funnel content identity belum konsisten dengan `ViewContent`/`Purchase` yang memakai product/campaign/package id.
5. **`InitiateCheckout` eventID tidak dipakai CAPI.** Event ini hanya browser-side, tidak masalah jika memang tidak ada CAPI InitiateCheckout. Jika nanti ditambah CAPI InitiateCheckout, eventID harus diteruskan.
6. **Tidak ada consent gate.** Pixel/GTM langsung aktif ketika setting tersedia. Jika butuh kepatuhan privasi lebih ketat, tambahkan consent manager sebelum load script.
7. **Tidak ada `test_event_code`.** QA Meta Events Manager masih manual, belum ada setting untuk Test Events CAPI.
8. **Hash phone belum menormalisasi ke format internasional baku.** `buildUserData()` hanya menghapus non-digit; input checkout masih bisa `08...`. Pertimbangkan normalisasi ke `62...` sebelum hash.

## Keputusan Arsitektur Saat Ini

- `Purchase` didefinisikan sebagai paid-success, bukan create transaction.
- Source of truth conversion paid saat ini adalah CAPI server-side.
- Pixel browser-side dipakai untuk upper/mid funnel (`PageView`, `ViewContent`, `InitiateCheckout`, `AddPaymentInfo`).
- GTM dipakai sebagai container umum dan virtual pageview, bukan source utama conversion.
- Token CAPI harus tetap non-public dan terenkripsi via settings admin.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `docs/analisa-pixel.md` | Diserap, dikoreksi terhadap kode aktual, lalu boleh dihapus |
| `docs/tutorial-pixel-standard-spesifik-peristiwa.md` | Dikompresi menjadi mapping event standar relevan, lalu boleh dihapus |
