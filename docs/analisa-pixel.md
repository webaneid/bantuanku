# Analisa Sistem Meta Pixel & Meta Conversions API

Tanggal analisa: 14 Maret 2026  
Scope code yang dianalisa:
- `apps/web/src/components/MetaPixel.tsx`
- `apps/web/src/lib/fbPixel.ts`
- `apps/web/src/app/checkout/page.tsx`
- `apps/web/src/components/UniversalPaymentMethodSelector.tsx`
- `apps/web/src/app/program/[slug]/CampaignSidebar.tsx`
- `apps/api/src/lib/meta-capi.ts`
- `apps/api/src/routes/transactions.ts`
- `apps/api/src/routes/qurban.ts`
- `apps/api/src/routes/payments.ts`
- `apps/api/src/routes/admin/settings.ts`
- `apps/admin/src/app/dashboard/settings/integration/page.tsx`
- `apps/web/src/lib/seo.tsx`

## Ringkasan Eksekutif

Implementasi saat ini **sudah punya fondasi** Pixel + CAPI, tetapi belum memenuhi praktik terbaik Meta untuk kualitas konversi.

Temuan paling penting:
1. **Purchase event dipicu terlalu awal** (saat transaksi dibuat/pending), bukan saat benar-benar paid.
2. **Belum ada dedup Pixel-CAPI yang benar** (`event_id` server tidak dipasangkan dengan `eventID` di browser).
3. **Signal matching belum kuat** (`fbc/fbp` tidak ikut terkirim ke server, user_data masih minim).
4. **Konsistensi payload funnel belum rapi** (ID konten beda antar tahap funnel, nilai ViewContent campaign pakai goal total).
5. **Keamanan token CAPI perlu diperketat** (belum masuk rule enkripsi `_token`).

Kesimpulan: sistem tracking saat ini bisa jalan, tapi rawan **overcount/under-attribution** dan kualitas optimasi iklan belum maksimal.

---

## Kondisi Implementasi Saat Ini

### 1) Meta Pixel (client-side)
- Pixel dimuat di client lewat `MetaPixel` dan mengambil `meta_pixel_id` dari `/v1/settings` (`apps/web/src/components/MetaPixel.tsx:21-29`).
- `fbq('init', pixelId)` + `PageView` dipanggil setelah script siap (`apps/web/src/components/MetaPixel.tsx:59-60`).
- Event helper sudah tersedia (`ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`, dll) di `apps/web/src/lib/fbPixel.ts`.
- Saat ini helper event belum mendukung opsi `eventID` untuk dedup (`apps/web/src/lib/fbPixel.ts:35`).

### 2) CAPI (server-side)
- CAPI dikirim ke Graph API v21 (`apps/api/src/lib/meta-capi.ts:5-6`).
- Sudah hash `em`, `ph`, `fn`, plus dukungan `fbc/fbp` jika tersedia (`apps/api/src/lib/meta-capi.ts:40-49`).
- CAPI dipanggil saat create transaction (`apps/api/src/routes/transactions.ts:248-268`) dan create qurban order (`apps/api/src/routes/qurban.ts:680-698`).
- Status paid (webhook/approve manual) saat ini **tidak** memicu CAPI Purchase (`apps/api/src/routes/payments.ts:575-584`, `apps/api/src/routes/transactions.ts:1055-1063`).

### 3) Pengaturan admin
- `meta_pixel_id`, `meta_capi_access_token`, `meta_domain_verification` sudah ada di settings integration (`apps/admin/src/app/dashboard/settings/integration/page.tsx:77-104`).
- Domain verification sudah disuntikkan ke metadata head (`apps/web/src/lib/seo.tsx:146`).

### 4) Validasi payload aktual Bantuanku vs format tutorial

Berikut ringkasan payload CAPI yang **aktual** di Bantuanku (dari code path sekarang):

- Route transaksi umum (`apps/api/src/routes/transactions.ts:248-268`)
  - `event_name`: `Purchase`
  - `event_id`: `purchase_<transaction.id>`
  - `event_source_url`: `${frontendUrl}/checkout`
  - `action_source`: `website`
  - `user_data`: `em`, `ph`, `fn`, `client_ip_address`, `client_user_agent` (jika tersedia)
  - `custom_data`: `currency: "IDR"`, `value: Number(transaction.totalAmount)`, dll

- Route qurban (`apps/api/src/routes/qurban.ts:680-698`)
  - `event_name`: `Purchase`
  - `event_id`: `purchase_qurban_<order.id>`
  - `event_source_url`: **belum diisi**
  - `custom_data.currency`: `"IDR"`

Perbandingan dengan contoh tutorial yang kamu kirim:

1. `ph: [null]` di tutorial: **tidak sesuai**.  
   Standar yang aman: kalau tidak ada nomor, **jangan kirim field `ph` sama sekali**.

2. `custom_data.value: "142.52"` (string) di tutorial: **kurang tepat**.  
   Bantuanku saat ini sudah benar karena kirim number (`Number(...)`), bukan string.

3. `currency: "USD"` di tutorial: **tidak sesuai data aktual Bantuanku**.  
   Data aktual Bantuanku menggunakan `IDR`.

4. `attribution_data` dan `original_event_data` di tutorial: **bukan kebutuhan wajib** untuk implementasi standar Purchase CAPI di Bantuanku saat ini.

5. Format `em`/`ph` pada contoh tutorial berbentuk array.  
   Di Bantuanku sekarang builder mengisi scalar string hash. Ini biasanya tetap diproses, tapi untuk konsistensi penuh ke dokumentasi Meta, bisa dipertimbangkan migrasi ke format array hash.

### 5) Checklist parameter standar (status Bantuanku saat ini)

Catatan: link Events Manager yang kamu kirim tidak bisa di-scrape otomatis dari environment ini (redirect login/rate-limit), jadi checklist di bawah memakai standar parameter CAPI Meta yang umum dipakai untuk `action_source=website`.

| Parameter | Status di Bantuanku | Catatan |
|---|---|---|
| `event_name` | Sudah | Terkirim (`Purchase`). |
| `event_time` | Sudah | Dibuat dari unix timestamp server saat kirim event. |
| `action_source` | Sudah | Diset `website`. |
| `user_data` | Sudah (parsial) | Sudah kirim hash `em/ph/fn` jika ada data. |
| `client_user_agent` | Sudah (parsial) | Sudah diisi dari header request. |
| `event_source_url` | Parsial | Ada di transaksi umum, belum ada di route qurban CAPI. |
| `event_id` | Parsial | Ada di CAPI server, tapi belum dipasangkan dengan `eventID` Pixel browser (dedup belum lengkap). |
| `custom_data.currency` | Sudah | `IDR` (sesuai Bantuanku). |
| `custom_data.value` | Sudah | Sudah numeric (bukan string). |
| `fbc/fbp` | Belum | Struktur ada, tapi belum dipropagasikan dari cookie browser ke server. |
| `external_id` (recommended) | Belum | Belum ada pengiriman `external_id` hash untuk penguatan matching. |
| `test_event_code` (opsional QA) | Belum | Belum ada mode khusus testing dari panel/admin. |

---

## Gap vs Standard Meta (Prioritas)

## P0 (Kritis)

### A. Trigger Purchase belum sesuai konversi nyata
- Saat ini Purchase ditembak saat transaksi dibuat (umumnya status pending), baik di frontend checkout (`apps/web/src/app/checkout/page.tsx:527-536`) maupun backend create route.
- Standard Meta untuk optimasi value/conversion: Purchase sebaiknya berdasarkan **pembayaran sukses**.
- Dampak: optimasi campaign bisa bias, ROAS dan CPA tidak akurat.

### B. Dedup Pixel + CAPI belum valid
- Server mengirim `event_id` (`apps/api/src/routes/transactions.ts:250`), tapi browser event tidak kirim `eventID` pasangan.
- Dampak: event bisa double count atau tidak terdedup.

### C. Signal matching kurang (fbc/fbp tidak dipropagasikan)
- Struktur CAPI sudah support `fbc/fbp`, tapi tidak ada pengisian dari request/browser.
- Dampak: Event Match Quality turun, atribusi melemah (terutama iOS dan browser restriktif).

## P1 (Tinggi)

### D. Konsistensi content identity antar funnel belum konsisten
- ViewContent/AddToCart cenderung pakai product ID; Purchase cenderung pakai transaction ID (`apps/web/src/app/checkout/page.tsx:532`, `apps/api/src/routes/transactions.ts:262`).
- Dampak: funnel quality dan analisis konten per item tidak solid.

### E. Nilai ViewContent campaign tidak representatif
- ViewContent campaign memakai `campaign.goal` (`apps/web/src/app/program/[slug]/CampaignSidebar.tsx:64`), bukan nilai transaksi/nominal intent.
- Dampak: sinyal value untuk model iklan jadi noisy.

### F. CAPI qurban tidak kirim `event_source_url`
- Route qurban kirim CAPI tanpa `eventSourceUrl` (`apps/api/src/routes/qurban.ts:680-698`).
- Dampak: konteks event berkurang.

### G. Purchase event bertumpuk pada checkout multi-item
- Frontend mengirim 1 Purchase agregat (multi transaction), backend kirim Purchase per transaksi.
- Dampak: berpotensi mismatch hitungan konversi/value.

## P2 (Menengah)

### H. Keamanan token CAPI
- Rule enkripsi settings saat ini hanya `_api_key` / `_secret` (`apps/api/src/routes/admin/settings.ts:431-433`), sehingga `_access_token` tidak ikut.
- Dampak: risiko paparan token bila akses DB/log tidak ketat.

### I. Reliabilitas pengiriman CAPI
- Pola fire-and-forget tanpa retry queue/dlq (`apps/api/src/lib/meta-capi.ts:78-117`).
- Dampak: event loss saat Graph timeout/429/5xx.

### J. Consent & governance
- Belum ada consent gate untuk tracking ads (cookie banner/CMP).
- Dampak: risiko kepatuhan (terutama jika menyasar region dengan regulasi ketat).

### K. Observability dan QA tooling terbatas
- Belum ada mode `test_event_code`, dashboard health CAPI, dan alerting.
- Dampak: susah audit kualitas tracking secara konsisten.

---

## Rekomendasi Peningkatan (Best Practice Roadmap)

## Fase 1 — Quick Wins (wajib dulu)
1. **Pindahkan Purchase ke paid-success**
   - Trigger CAPI Purchase pada:
   - webhook sukses gateway (`apps/api/src/routes/payments.ts`)
   - approve payment manual (`apps/api/src/routes/transactions.ts`).
   - Untuk create transaction gunakan `InitiateCheckout` (bukan Purchase).

2. **Implement dedup event end-to-end**
   - Generate `event_id` di frontend per transaction attempt.
   - Kirim `event_id` ke API.
   - Pixel: kirim `fbq('track', 'Purchase', params, { eventID })`.
   - CAPI: kirim `event_id` yang sama.

3. **Propagasi `fbc` dan `fbp`**
   - Baca cookie `_fbc`, `_fbp` di browser saat checkout.
   - Kirim ke backend dan masukkan ke `user_data`.

4. **Perbaiki payload value & content**
   - Samakan `content_ids` lintas funnel (gunakan ID produk/slug yang stabil).
   - `Purchase.value` = nilai final transaksi yang benar (clear rule: subtotal vs total + unique code).

## Fase 2 — Hardening
1. **Tambahkan `event_source_url` konsisten** untuk semua CAPI event termasuk qurban.
2. **Normalisasi phone untuk hash** ke format internasional konsisten (misal 62xxxxxxxxxx sebelum hash).
3. **Perluas user_data matching** (minimal `external_id` hash + opsional `ln`, `ct`, `zp`, jika tersedia dan legal).
4. **Enkripsi token CAPI**
   - Masukkan `_token` ke rule enkripsi/dekripsi settings.
5. **Gunakan Authorization header** untuk access token (hindari query param di URL).

## Fase 3 — Reliability & Governance
1. **Retry queue CAPI**
   - Simpan event gagal ke tabel queue.
   - Worker cron retry exponential backoff + max attempts.
2. **Observability**
   - Simpan status response Meta per event.
   - Dashboard: success rate, fail reason top N.
3. **Consent mode**
   - Jika consent ditolak: nonaktifkan Pixel event non-essential.
   - CAPI tetap taat legal basis yang disepakati.
4. **QA Mode**
   - Support `test_event_code` via settings untuk uji di Events Manager.

---

## Praktik Terbaik Event Mapping (disarankan)

### Funnel minimal yang stabil
1. `ViewContent` — buka detail program
2. `AddToCart` — pilih nominal/produk
3. `InitiateCheckout` — masuk checkout
4. `AddPaymentInfo` — pilih metode bayar
5. `Purchase` — **hanya saat paid/verified**

### Rule dedup
- Untuk event yang dikirim ganda (browser + server), wajib:
  - Browser: `eventID = X`
  - Server: `event_id = X`
  - Event name sama, event time berdekatan, value konsisten.

### Rule payload purchase
- `currency`: `IDR`
- `value`: angka final sesuai definisi bisnis (disepakati satu definisi)
- `content_ids`: ID produk stabil (bukan ID transaksi random jika ingin analitik produk)
- `contents`: array `{id, quantity, item_price}` (disarankan)
- `content_type`: `"product"`

---

## Checklist Validasi Setelah Perbaikan

- [ ] Event Purchase hanya muncul saat status transaksi `paid`.
- [ ] Browser + CAPI Purchase terdedup (Event Manager tidak double).
- [ ] `fbc`/`fbp` terkirim di CAPI payload.
- [ ] Event Match Quality naik (dibanding baseline sebelum perbaikan).
- [ ] Tidak ada token CAPI plaintext di penyimpanan sensitif/log.
- [ ] Ada fallback retry untuk kegagalan kirim CAPI.

---

## Catatan Penting

Dari sisi codebase, yang bisa diverifikasi hanya implementasi aplikasi.  
Konfigurasi di Meta Events Manager (AEM, domain priority, custom conversion, attribution setting) tidak terlihat dari repository, jadi perlu audit manual di dashboard Meta.

---

## Checklist UAT Events Manager (Step-by-step)

Tujuan UAT ini: memastikan implementasi Pixel + CAPI Bantuanku benar di trafik nyata.

### Persiapan
- [ ] Gunakan environment staging/production yang sudah berisi `meta_pixel_id` dan `meta_capi_access_token` valid.
- [ ] Pastikan browser tidak memblokir tracking (matikan adblock untuk domain uji).
- [ ] Siapkan 2 skenario transaksi uji:
  - Skenario A: bayar lewat payment gateway (webhook success).
  - Skenario B: upload bukti lalu approve manual dari admin.

### Langkah Uji A — Gateway Success
1. Buka program di frontend dan lakukan alur normal: ViewContent → AddToCart → checkout.
2. Selesaikan pembayaran sampai status transaksi `paid`.
3. Buka Meta Events Manager > Test Events dan cek event masuk.
4. Validasi:
   - [ ] `Purchase` muncul setelah pembayaran sukses (bukan saat create transaksi).
   - [ ] Value dan currency benar (`IDR` + nominal transaksi).
   - [ ] Tidak ada duplikasi Purchase untuk 1 transaksi yang sama.
   - [ ] `event_id` terbaca dan stabil.

### Langkah Uji B — Manual Approve
1. Buat transaksi baru sampai status `pending`.
2. Approve dari admin (`approve-payment`).
3. Cek di Test Events:
   - [ ] `Purchase` muncul saat approve berhasil.
   - [ ] Payload konsisten dengan skenario A.

### Langkah Uji C — Dedup & Matching
- [ ] Cek Event Match Quality untuk Purchase (minimal “Good”, target naik ke “Great”).
- [ ] Cek parameter `fbc`/`fbp` terkirim pada event yang berasal dari browser flow.
- [ ] Pastikan 1 transaksi paid = 1 Purchase terhitung di overview (tidak ganda).

### Langkah Uji D — Negative/Failure
- [ ] Simulasikan pembayaran gagal/expired, pastikan Purchase tidak dikirim.
- [ ] Ulang approve pada transaksi yang sudah paid, pastikan tidak menambah Purchase baru.

### Kriteria Lulus (Go/No-Go)
- [ ] 100% Purchase hanya muncul pada `paid-success`.
- [ ] Duplicate rate Purchase = 0 pada sample UAT.
- [ ] Event Match Quality tidak turun dibanding baseline.
- [ ] Nilai konversi (`value`) akurat pada semua sample uji.

### Log Hasil UAT (isi oleh tim)
| Tanggal | Skenario | Transaction ID | Hasil | Catatan |
|---|---|---|---|---|
| YYYY-MM-DD | Gateway Success | ... | Pass/Fail | ... |
| YYYY-MM-DD | Manual Approve | ... | Pass/Fail | ... |
