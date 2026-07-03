# Arsitektur i18n Web

Dokumen ini adalah source of truth arsitektur i18n yang sesuai dengan implementasi kode saat ini. Sumber kebenaran utama adalah `apps/web/src/lib/i18n/**`, integrasi root layout, dan pemakaian `useI18n()`/`translate()` di `apps/web`.

## Ruang Lingkup

| Area | Implementasi |
|------|--------------|
| Runtime i18n | Custom helper in-memory, bukan `next-intl`, `i18next`, atau package terpisah |
| Aplikasi | `apps/web` |
| Bahasa aktif | `id`, `en` |
| Bahasa default | `id` |
| Persistence pilihan bahasa | Cookie browser bernama `locale` |
| Routing bahasa | Tidak ada prefix route `/id` atau `/en` |
| Admin/API | Tidak menjadi bagian sistem i18n ini |

File utama:

| File | Peran |
|------|------|
| `apps/web/src/lib/i18n/index.ts` | Registry dictionary, normalisasi locale, resolver key, fallback, interpolation |
| `apps/web/src/lib/i18n/types.ts` | Tipe `Locale`, `Messages`, `TranslateParams` |
| `apps/web/src/lib/i18n/provider.tsx` | React context client-side untuk `locale`, `setLocale`, dan `t()` |
| `apps/web/src/lib/i18n/locales/id.ts` | Dictionary Bahasa Indonesia |
| `apps/web/src/lib/i18n/locales/en.ts` | Dictionary English |
| `apps/web/src/app/layout.tsx` | Membaca cookie locale, set `<html lang>`, dan inject provider |
| `apps/web/src/app/providers.tsx` | Membungkus aplikasi dengan `I18nProvider` |
| `apps/web/src/components/organisms/Header/Header.tsx` | UI pemilih bahasa dan penulisan cookie |

## Model Locale

Locale yang didukung hanya:

```ts
export type Locale = "id" | "en";
```

`DEFAULT_LOCALE` adalah `id`.

Normalisasi locale sangat sederhana:

```ts
if (locale === "en") return "en";
return "id";
```

Konsekuensinya:

1. Nilai `id`, `null`, `undefined`, string kosong, `en-US`, `id-ID`, atau locale lain akan jatuh ke `id`.
2. Tidak ada deteksi `Accept-Language`.
3. Tidak ada dukungan bahasa lain selain `en` dan default `id`.

## Dictionary

Dictionary disimpan sebagai object TypeScript nested:

```ts
export const dictionaries: Record<Locale, Messages> = {
  id: idMessages,
  en: enMessages,
};
```

Struktur pesan memakai key dot-path seperti:

```ts
t("common.menuHome")
t("checkout.title")
t("invoice.status.paid")
```

Namespace besar yang sudah ada di `id.ts` dan `en.ts`:

| Namespace | Fungsi |
|-----------|--------|
| `common` | Label umum, menu, bahasa, CTA umum |
| `footer` | Label footer |
| `home` | Section homepage |
| `campaignDetail` | Detail program donasi |
| `qurbanDetail` | Detail qurban |
| `qurbanLayout` | Metadata/layout qurban |
| `qurbanPage` | Halaman daftar qurban |
| `qurbanCard` | Label card qurban |
| `qurbanSavingsCreate` | Form tabungan qurban |
| `zakatDetail` | Detail zakat |
| `zakatPage` | Halaman zakat |
| `zakatCalculator` | Kalkulator zakat |
| `invoice` | Invoice universal |
| `payment` | Pembayaran |
| `checkout` | Checkout |
| `auth` | Login, register, forgot password |
| `account` | Area akun |

## Resolver dan Fallback

Resolver menggunakan `path.split(".")` untuk membaca nested object. Fallback berjalan dalam urutan:

1. Pesan dari locale aktif.
2. Pesan dari locale default `id`.
3. String key mentah.

Jika `t("checkout.foo")` tidak ditemukan di `en`, sistem mencari `id`. Jika tetap tidak ditemukan, UI akan menampilkan `checkout.foo`.

Ini mencegah blank text, tetapi juga bisa membocorkan key internal ke UI jika key salah atau dictionary tidak lengkap.

## Interpolation

Interpolation hanya mengganti token `{param}` dengan nilai string/number dari object params.

Contoh pola:

```ts
translate(locale, "home.stats.donors", { count: 120 })
```

Batasan implementasi:

1. Tidak ada ICU message format.
2. Tidak ada pluralization bawaan.
3. Tidak ada formatting currency/date bawaan.
4. Tidak ada rich text interpolation.
5. Tidak ada escaping khusus selain escaping normal React ketika string dirender.

## Provider Client

`I18nProvider` menyimpan locale di state React:

| Value | Fungsi |
|-------|--------|
| `locale` | Locale aktif setelah `normalizeLocale(initialLocale)` |
| `setLocale(locale)` | Mengubah state locale client-side |
| `t(key, params)` | Memanggil `translate(locale, key, params)` |

`useI18n()` hanya boleh dipakai di bawah `I18nProvider`. Jika dipakai di luar provider, hook melempar error:

```ts
throw new Error("useI18n must be used within I18nProvider");
```

## Integrasi Root Layout

`apps/web/src/app/layout.tsx` membaca cookie `locale` dari request server:

```ts
const locale = normalizeLocale(cookies().get("locale")?.value);
```

Nilai ini dipakai untuk:

1. `<html lang={locale}>`.
2. Teks skip-to-content dari `translate(locale, "common.skipToContent")`.
3. Prop `locale` ke `Providers`.

`generateMetadata()` masih memanggil `generateSiteMetadata()` tanpa parameter locale. Artinya metadata global belum benar-benar locale-aware, walaupun atribut `<html lang>` sudah mengikuti cookie.

## Integrasi Providers

`apps/web/src/app/providers.tsx` membungkus aplikasi dalam urutan:

1. `QueryClientProvider`
2. `I18nProvider`
3. `CartProvider`
4. `ReferralCapture`
5. `MetaPixel`
6. `GoogleTagManager`
7. `FeedbackToastHost`

Dengan urutan ini, semua child web app di bawah provider bisa memakai `useI18n()`.

## Pemilih Bahasa

Pemilih bahasa berada di `Header`.

Saat user mengganti bahasa:

1. `setLocale(nextLocale)` mengubah state client.
2. Browser menulis cookie:

```ts
document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
```

3. `router.refresh()` memaksa server component membaca ulang cookie dan render ulang.

Catatan implementasi:

1. Cookie berlaku satu tahun.
2. Cookie memakai `path=/`.
3. Cookie memakai `samesite=lax`.
4. Tidak ada atribut `secure`.
5. Tidak ada server action khusus untuk update locale.

## Pola Pemakaian

Server component memakai helper langsung:

```ts
const locale = normalizeLocale(cookies().get("locale")?.value);
const t = (key, params) => translate(locale, key, params);
```

Client component memakai context:

```ts
const { t, locale, setLocale } = useI18n();
```

Contoh area yang sudah memakai i18n:

| Area | Pola |
|------|------|
| Homepage | Server-side `translate()` dari cookie |
| Header/Footer | `useI18n()` |
| Auth pages | `useI18n()` |
| Checkout/payment/invoice | `useI18n()` |
| Program detail | Server-side `translate()` + client component `useI18n()` |
| Zakat/qurban | Campuran server-side `translate()` dan client `useI18n()` |
| Account | `useI18n()` |
| Testimonial | `useI18n().locale` dikirim sebagai param `lang` ke API testimonial |

## Data Dinamis

i18n hanya menangani UI text statis. Data dari backend tetap mengikuti nilai database/API/settings.

Contoh data yang tidak otomatis diterjemahkan oleh dictionary:

1. Judul program.
2. Deskripsi program.
3. Nama kategori dari API.
4. Nama paket qurban.
5. Nama tipe zakat dari API.
6. Menu header/footer dari settings JSON.
7. Konten halaman statis dari CMS/settings.

Jika `frontend_header_menu` tersedia di settings, Header memakai label dari settings tersebut. Fallback menu memakai beberapa key i18n, tetapi masih ada label hardcoded `Laporan`.

## Formatting Locale

Formatting tanggal/angka belum menjadi layanan i18n terpusat.

Contoh implementasi saat ini:

1. Homepage membuat `localeTag` manual: `id-ID` atau `en-US`.
2. `TestimonialSection` memilih `date-fns/locale` manual: `id` atau `enUS`.
3. Beberapa halaman masih memakai `toLocaleString("id-ID")` langsung.
4. Helper uang seperti `formatRupiahFull()` tetap Rupiah dan tidak menjadi bagian sistem i18n.

Implikasi: label UI bisa berubah bahasa, tetapi formatting angka/tanggal belum konsisten mengikuti locale secara menyeluruh.

## Gap Implementasi

| Gap | Dampak |
|-----|--------|
| Tidak ada type-safe key | Salah ketik key baru ketahuan saat runtime dan bisa tampil sebagai string key |
| Tidak ada parity check `id` vs `en` | Dictionary English bisa tertinggal dari Indonesia tanpa gagal build |
| Tidak ada `next-intl`/ICU | Plural, gender, rich message, dan locale formatting harus dibuat manual |
| Tidak ada route locale | Tidak ada URL kanonis `/en/...`, sulit untuk SEO multi-bahasa |
| Metadata belum locale-aware | Title/description global bisa tidak sesuai bahasa aktif |
| Banyak hardcoded string tersisa | Pengalaman EN belum konsisten di seluruh halaman |
| Data settings tidak punya varian bahasa | Menu/settings dari admin hanya tampil sesuai isi settings tunggal |
| Locale detection hanya cookie | User baru tidak diarahkan berdasarkan browser language |
| Missing key fallback ke key mentah | Key internal bisa tampil ke user |
| Tidak ada audit otomatis hardcode | Regression hardcoded string mudah masuk kembali |

## Hardcoded String yang Masih Terlihat

Bagian ini menyerap dan mengompresi audit root legacy:

- `hardcode-front-end.md`;
- `hardcode-audit-frontend.md`;
- `hardcode-status-checklist.md`.

Tiga file itu adalah laporan/checklist lama, bukan source of truth. Sebagian item di dalamnya sudah berubah: contoh kritikal dummy address di `UniversalInvoice` tidak lagi ditemukan di komponen runtime saat audit ulang; invoice sekarang membaca `organization_email` dan `organization_phone` dari settings bila tersedia. Yang masih relevan adalah kesimpulan arsitekturalnya: hardcoded UI text masih banyak, settings frontend sudah menangani sebagian konten marketing/page, dan i18n belum mencakup seluruh public web.

Contoh yang sudah diverifikasi di kode:

| File | Contoh |
|------|--------|
| `apps/web/src/components/organisms/Header/Header.tsx` | Fallback menu `Laporan` |
| `apps/web/src/app/keranjang-bantuan/page.tsx` | `Keranjang Bantuan Kosong`, `Telusuri Program`, `Ringkasan Bantuan`, `Lanjutkan Pembayaran`, `Tambah Program Lain` |
| `apps/web/src/app/keranjang-bantuan/page.tsx` | `toLocaleString("id-ID")` untuk input nominal |
| `apps/web/src/components/organisms/TestimonialSection/TestimonialSection.tsx` | Heading/subheading dipilih dengan ternary locale, bukan dictionary |
| `apps/web/src/app/page.tsx` | Badge qurban `Unggulan` dari mapping card |

Daftar ini bukan audit lengkap semua hardcoded string. Ini adalah bukti bahwa implementasi i18n belum menyapu seluruh UI.

Ringkasan area legacy audit yang tetap menjadi gap:

| Area | Status arsitektur saat ini |
|------|----------------------------|
| Header/search/user menu label | Sebagian sudah memakai i18n/settings, tetapi fallback dan beberapa label masih perlu migrasi dictionary. |
| Footer/menu/section settings | `frontend_footer_menu` dan `frontend_service_categories` sudah menjadi sumber dinamis utama; fallback tetap ada. |
| Homepage marketing sections | Banyak section sudah settings-driven (`frontend_hero_slides`, `frontend_featured_section`, `frontend_programs_section`, `frontend_funfact_section`, `frontend_why_choose_us_section`, `frontend_cta_section`), tetapi fallback dan label UI masih ada. |
| Zakat/Qurban/Wakaf/Program page copy | Page title/description utama sebagian settings-driven; label filter, empty state, pagination, dan status masih perlu dictionary. |
| Checkout/invoice/account labels | Masih menjadi prioritas migrasi i18n karena muncul di flow kritikal donatur. |
| Sensitive/dummy public text | Tidak boleh ada dummy kontak/alamat di runtime public; nilai harus berasal dari settings organisasi atau default aman. |

## Perbedaan dari Blueprint Lama

Blueprint lama `03-Translate-Safe-Text-blueprint.md` merencanakan:

1. `next-intl`.
2. Package `packages/i18n`.
3. JSON namespace per domain.
4. Routing `[locale]`.
5. Middleware locale detection.
6. Bahasa tambahan `ar`.
7. Type-safe message layer.

Implementasi aktual tidak mengikuti desain itu. Sistem yang benar saat ini adalah custom dictionary TypeScript di `apps/web/src/lib/i18n`.

## Rekomendasi Perbaikan

Prioritas 1: hardening sistem yang sudah ada.

1. Buat script parity check untuk memastikan semua key di `idMessages` ada di `enMessages`.
2. Tambahkan script audit hardcoded UI string minimal untuk `apps/web/src/app/**` dan `apps/web/src/components/**`.
3. Buat helper typed key dari dictionary agar `t()` tidak menerima string bebas.
4. Buat wrapper formatting `formatCurrency(locale, amount)` dan `formatDate(locale, date)`.
5. Ubah fallback missing key supaya development memberi warning/error, production tetap fallback aman.

Prioritas 2: selesaikan coverage.

1. Migrasikan `keranjang-bantuan` ke dictionary.
2. Migrasikan fallback label `Laporan` di Header ke `common`.
3. Migrasikan text testimonial section ke dictionary.
4. Migrasikan hardcoded label penting di checkout, invoice, account, zakat, qurban, dan program detail yang masih tersisa.
5. Pastikan semua status transaksi/pembayaran memakai mapping key yang sama.

Prioritas 3: keputusan arsitektur jangka menengah.

1. Jika butuh SEO multi-bahasa, tambahkan route locale `/en/...` dan metadata locale-aware.
2. Jika butuh pluralization/ICU/rich text, migrasi bertahap ke `next-intl` atau perluas resolver custom dengan sengaja.
3. Jika settings harus multi-bahasa, ubah schema settings/menu agar label punya varian `id` dan `en`.
4. Jika konten program harus multi-bahasa, desain field translation di database, bukan memaksakan dictionary UI.

## Keputusan Source of Truth

1. `apps/web/src/lib/i18n/**` adalah implementasi i18n aktual.
2. `docs/arsitektur-i18n.md` adalah dokumentasi arsitektur resmi.
3. Blueprint lama yang menyebut desain `next-intl`, `packages/i18n`, atau route `[locale]` tidak boleh dianggap source of truth kecuali implementasinya benar-benar dibuat di kode.
