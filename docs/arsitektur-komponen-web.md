# Arsitektur Komponen Web

Dokumen ini adalah source of truth untuk sistem komponen frontend publik di `apps/web`. Standar yang dicatat di sini mengikuti implementasi kode aktual, bukan asumsi atomic design ideal.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Root layout | `apps/web/src/app/layout.tsx` |
| Client providers | `apps/web/src/app/providers.tsx` |
| Atomic components | `apps/web/src/components/atoms/*` |
| Molecule components | `apps/web/src/components/molecules/*` |
| Organism components | `apps/web/src/components/organisms/*` |
| Template components | `apps/web/src/components/templates/*` |
| Domain components | `apps/web/src/app/**`, `apps/web/src/components/zakat/*`, `apps/web/src/components/account/*` |
| Shared web components | `apps/web/src/components/*.tsx` |
| Global styling | `apps/web/src/styles/globals.scss` |
| SCSS component styles | `apps/web/src/styles/components/*.scss` |
| Tailwind token | `apps/web/tailwind.config.js` |

## Root Composition

`apps/web/src/app/layout.tsx` adalah server layout utama.

Tanggung jawab:

- import global style dari `@/styles/globals.scss`
- setup font `Inter` via `next/font/google`
- generate metadata dari SEO settings
- inject Organization JSON-LD
- set `<html lang>` dari cookie `locale`
- render skip-to-content link
- membungkus semua halaman dengan `Providers`

`apps/web/src/app/providers.tsx` adalah client boundary utama.

Provider aktif:

| Provider/Component | Fungsi |
|--------------------|--------|
| `QueryClientProvider` | React Query client dengan `staleTime=60s`, `retry=1`, `refetchOnWindowFocus=false` |
| `I18nProvider` | Locale dan translate function client-side |
| `CartProvider` | State cart frontend |
| `ReferralCapture` | Ambil query `?ref=` dan simpan referral code |
| `MetaPixel` | Meta Pixel client-side |
| `GoogleTagManager` | GTM client-side |
| `FeedbackToastHost` | Host feedback dialog global |

## Styling System

Web memakai kombinasi Tailwind dan SCSS global.

Import order di `globals.scss`:

```text
Tailwind base/components/utilities
  -> variables/mixins/typography
  -> component SCSS
  -> global base layer
  -> utility layer
```

Component React umumnya hanya menulis class semantik seperti `btn`, `form-input`, `program-card`, `header`, `footer`, lalu styling detail berada di SCSS.

Token warna web mengikuti `arsitektur-color.md`:

| Token | Base |
|-------|------|
| `primary-500` | `#035a52` |
| `success-500` | `#678f0c` |
| `warning-500` | `#d2aa55` |
| `danger-500` | `#8f132f` |
| `info-500` | `#296585` |
| `accent-500` | `#d2aa55` |

Global behavior:

- `body`: `bg-white text-gray-900`, font Inter, `font-size: 15px`, `line-height: 1.8`
- focus visible global: `ring-primary-500`
- selection: `bg-primary-100 text-primary-900`
- utility `.container`: max-width `1280px`
- utility `.mono`: JetBrains Mono/Courier fallback

## Atomic Components

Folder: `apps/web/src/components/atoms`.

| Component | File | Pola Aktual |
|-----------|------|-------------|
| `Button` | `Button/Button.tsx` | Render `<button>` dengan class `btn`, `btn-{variant}`, `btn-{size}` |
| `IconButton` | `Button/IconButton.tsx` | Tombol icon berbasis atomic button style |
| `ActionButton` | `Button/ActionButton.tsx` | Tombol aksi ringan |
| `Input` | `Input/Input.tsx` | Render `form-input`, state `error/success` |
| `Textarea` | `Input/Textarea.tsx` | Render textarea form style |
| `Select` | `Input/Select.tsx` | Render select form style |
| `Checkbox` | `Input/Checkbox.tsx` | Optional label, generate id jika tidak dikirim |
| `Radio` | `Input/Radio.tsx` | Optional label, generate id jika tidak dikirim |
| `Label` | `Label/Label.tsx` | Label form dengan required marker |
| `Badge` | `Badge/Badge.tsx` | Variant semantic + size + dot/outline |
| `ProgramBadge` | `Badge/ProgramBadge.tsx` | Badge untuk kategori/program |
| `StatusBadge` | `Badge/StatusBadge.tsx` | Badge status terbatas |
| `Spinner` | `Spinner/Spinner.tsx` | Loading spinner |

`Button` variant aktual:

```text
primary, secondary, success, danger, warning, outline, ghost
```

`Button` size aktual:

```text
sm, md, lg
```

Catatan: atomic components tidak selalu punya `'use client'` eksplisit. Komponen yang hanya render markup tetap aman sebagai server component, tetapi komponen dengan event handler dari parent biasanya dipakai dari client page/component.

## Molecule Components

Folder: `apps/web/src/components/molecules`.

| Component | Fungsi |
|-----------|--------|
| `FormField` | Wrapper `InputField`, `TextareaField`, `SelectField` dengan label/error/help |
| `AmountSelector` | Preset nominal + custom amount untuk donasi |
| `ProgressBar` | Progress current/target |
| `QuantitySelector` | Stepper jumlah item |
| `SearchBox` | Search input dengan internal state/focus |
| `ShareButtons` | Share social/link dengan copy state |

`AmountSelector` default:

```text
presets: 10000, 25000, 50000, 100000, 250000, 500000, 1000000
min: 10000
label: "Jumlah Donasi"
help: "Minimal donasi Rp 10.000"
```

## Organism Components

Folder: `apps/web/src/components/organisms`.

| Component | Fungsi Aktual |
|-----------|---------------|
| `Header` | Header publik, menu dari settings, search, language selector, cart count, user menu |
| `Footer` | Footer publik, data organisasi/menu/social media dari settings |
| `Breadcrumb` | Navigasi breadcrumb halaman |
| `HeroSlider` | Hero berbentuk kartu (tidak full width, radius 24px) dengan autoplay, swipe, optional navigation; teks sejajar `.container` (lihat § HeroSlider) |
| `ProgramCard` | Card campaign donasi dengan image, badge, progress, stats |
| `FeaturedCarousel` | Section lengkap "Program Unggulan & Mendesak": kolom teks kiri (eyebrow, judul, deskripsi, "Lihat Semua") + carousel kartu GELAP (`bg-primary-900`) scroll-snap di kanan, panel latar `primary-50` menempel tepi kanan (desktop), titik pil + panah. Props `campaigns`, `title`, `description`. Area gambar kartu dikunci `aspect-[900/498]` = rasio crop media (kirim varian `large` 900×498, fallback `medium`). Lencana: "Sisa N Hari" (merah bila urgent/≤7 hari), "Target Tercapai"; bar progres bercahaya (emas ≥80%). Dekorasi flat, tanpa ornamen. Angka pakai `formatRupiahCompact` |
| `CategoryGrid` | Grid kategori layanan/program |
| `MobileTopBar` | Top bar mobile halaman single (back + titik tiga/menu); lihat `arsitektur-mobile-single-shell.md` |
| `MobileMenuPanel` | Isi menu mobile, satu sumber untuk `Header` dan `MobileTopBar` |
| `QurbanCard` | Kartu paket qurban bergaya toko (2026-10-25): foto 16:9 (ukuran asli, object-contain), chip jenis hewan/unggulan/diskon, chip Individu/Patungan, harga tebal (coret + chip bila diskon, "Habis" bila stok/slot habis), dua aksi **Detail** + **Keranjang** (tambah 1 paket ke `CartContext`, sama dengan modal konfirmasi di detail). CSS lokal `QurbanCard.css`. Props dibuat HANYA lewat `mapQurbanPackageToCardProps` (`lib/qurban-card.ts`) |
| `QurbanCarousel` | Carousel paket qurban, memakai CSS lokal `QurbanCarousel.css` |
| `QurbanSection` | Section qurban di homepage |
| `ZakatCard` | Card zakat, memakai CSS lokal `ZakatCard.css` |
| `TestimonialSection` | Section testimoni Google Maps. SERVER component (async, menerima `locale`): data dari `services/testimonials.ts` (`revalidate` 1 jam), geser dengan scroll-snap CSS (tanpa Swiper) |

### Header

Catatan layout (2026-10-23): `.header__container` memakai padding kiri-kanan 32px di ≥1024px (sebelumnya 24px) agar tepinya sama dengan `.container` section (`px-4 sm:px-6 lg:px-8`). **Gap yang diketahui:** di lebar ~900–1340px `.header__actions` (pencarian + bahasa + keranjang + Masuk) melebihi lebar layar sehingga muncul scroll horizontal (37px di 1280, ~217px di 1100; sudah ada sebelum perubahan ini); tidak terjadi di ≥1366px.

`Header` adalah client component.

Sumber data:

- `useSettings()` untuk logo, site name, dan `frontend_header_menu`. Sejak 2026-10-25 hook ini membaca konteks (`SettingsProvider` di `app/providers.tsx`) yang diisi root layout server dengan `pickShellSettings()` (`lib/settings-shell.ts`); TIDAK ada `fetch` dari browser. Kunci baru yang dibutuhkan komponen klien harus ditambahkan ke `SHELL_SETTING_KEYS`
- `useCart()` untuk cart count
- `useAuth()` untuk user menu/logout
- `useI18n()` untuk label dan language selector

Fallback menu jika settings kosong:

```text
/, /program, /zakat, /qurban, /wakaf, /laporan, /page/tentang-kami
```

`normalizePublicHref()` mengubah:

| Input | Output |
|-------|--------|
| `/tentang` | `/page/tentang-kami` |
| `/infaq` | `/program` |

### Footer

`Footer` adalah client component.

Sumber data:

- organization logo/name/about/contact/address dari settings
- `frontend_service_categories` untuk program links
- `frontend_footer_menu` untuk kolom footer custom
- social media settings untuk link sosial

`normalizePublicHref()` mengubah link legacy seperti `/tentang`, `/kontak`, `/faq`, `/syarat-ketentuan`, `/kebijakan-privasi`, dan `/infaq`.

Route `/documentation` memakai layout baca terpisah berbasis static TypeScript content; detailnya ada di `docs/arsitektur-documentation-center.md`.
Kebijakan kualitas UX lintas frontend seperti native dialog, inline style, responsive QA, dan gap blueprint lama dicatat di `docs/arsitektur-frontend-ux-quality.md`.

### ProgramCard

Satu desain kartu untuk seluruh situs (redesign-1, 2026-10-23); varian `default/compact/featured` dan prop `variant` sudah dihapus. Client component: teks lewat `useI18n` (`home.programs.card.*`), jadi pemanggil cukup mengirim data campaign yang sudah dimapping.

Props: `id, slug, title, description, image, categoryName, currentAmount, targetAmount, donorCount, daysLeft, isUrgent`.

- Desktop/tablet: vertikal (gambar 12rem, chip kategori + Mendesak/Target Tercapai/sisa hari, progress 8px, tombol "Donasi Sekarang"). Mobile (<640px): horizontal, gambar kiri dan teks kanan, tanpa deskripsi dan tombol.
- `isUrgent` memakai warna `danger`. Dipakai di beranda, `/program` (+ kategori), `/program/[slug]` (terkait), `/wakaf`, `/mitra/[slug]`. Grid arsip 3 kolom.

### AccountPageHeader dan AccountBottomNav

`components/account/AccountPageHeader.tsx`: kepala halaman akun. Mobile (< lg) = hero gradasi `primary-600 → primary-800` bersudut bawah 28px (judul, subjudul, `backHref` opsional, `action` opsional); desktop = judul biasa. `components/account/AccountBottomNav.tsx`: bar navigasi bawah mengambang (4 item, aktif = lingkaran primary, `z-[1030]`) hanya di mobile; dipasang oleh `account/layout.tsx`.

### CartSummaryCard

`molecules/CartSummaryCard` (client): blok ringkasan mobile untuk `/keranjang-bantuan` dan `/checkout` — gradasi `primary-600 → primary-800`, radius 24px, teks putih: judul + subjudul, daftar item (judul, jenis, nominal, rincian zakat), total dalam angka besar, teks info. Props: `items`, `total`, `title`, `subtitle`, `summaryTitle`, `totalLabel`, `infoText`, `formatAmount`, `className` (pemanggil memberi `lg:hidden`; desktop memakai sidebar sendiri), dan opsional `edit` (`onAmountChange`, `onRemove`, `onClear`). Tanpa `edit` = ringkasan baca-saja (`/checkout`); dengan `edit` = isi keranjang lengkap (`/keranjang-bantuan`): nominal campaign bisa diedit, tombol hapus per item, rincian zakat/qurban, tautan "Kosongkan Keranjang".

### ReportCard dan RelatedReports

`ReportCard` (`organisms/ReportCard`): kartu laporan kegiatan, satu komponen dengan dua tampilan lewat kelas responsif. Mobile (< md): baris ringkas (thumbnail persegi 64px, judul maks 2 baris, meta kecil tanggal singkat · kabupaten/provinsi). md ke atas: kartu (thumbnail 16:9, badge jenis, nama referensi, kutipan, meta). Induknya wajib grid `grid-cols-1 divide-y divide-gray-100 md:divide-y-0 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6`. Dipakai di arsip `/laporan`, `RelatedReports`, dan tab "Kabar Terbaru" di `/program/[slug]` (`CampaignTabs`, hanya tampilan mobile; desktop memakai timeline sendiri).

`RelatedReports` (`organisms/RelatedReports`, client component): judul "Laporan Terkait" (`mode="related"`) atau "Laporan Lain" (`mode="other"`) + tautan "Lihat Semua" + grid `ReportCard`. Dipakai di `/laporan/[slug]`.

### HeroSlider

`HeroSlider` adalah client component.

Behavior:

- default `autoplay=true`
- default `autoplayDelay=5000`
- default `showIndicators=true`
- default `showNavigation=false`
- mendukung swipe mobile
- slide pertama memakai `priority` image

Layout (redesign 2026-10-23, desktop/tablet; mobile ≤639px tidak berubah):

- Struktur: pembungkus `.hero-slider` (padding kiri-kanan `--hero-gutter`) → kartu `.hero-slider__slides` (gambar + overlay, `overflow:hidden`, `border-radius: $radius-2xl` 24px, tinggi `clamp(560px, 78vh, 760px)`; tablet `clamp(480px, 62vh, 600px)`) dan lapisan teks `.hero-slider__contents` yang menutupi SELURUH lebar pembungkus (bukan hanya kartu). Tiap teks slide dibungkus `.container` standar, sehingga tepi kirinya sama dengan header dan section di bawahnya.
- `--hero-gutter: clamp(8px, calc((100% - 1280px) / 2 + 8px), 40px)`: jarak kartu ke tepi layar 40px di layar lebar (≥~1344px), menyempit di layar sedang supaya teks yang sejajar container selalu minimal ~24px (16px di tablet) di dalam kartu. Persen = lebar blok pembungkus (bukan `100vw`, jadi tidak terpengaruh scrollbar).
- Touch swipe dipasang di pembungkus (bukan di kartu) karena lapisan teks berada di atas kartu.
- Ringan: tanpa JS tambahan; `next/image` `quality={80}` dan `sizes="(min-width: 640px) calc(100vw - 80px), calc(100vw - 32px)"`.
- Terverifikasi di browser: header, teks hero, dan konten section sejajar di x=108 (1440px), 32 (1280/1100), 24 (900/700).

## Template Components

Folder: `apps/web/src/components/templates`.

Saat ini hanya ada `ProgramListTemplate`.

`ProgramListTemplate` adalah client component untuk halaman listing campaign. Ia melakukan fetch client-side untuk:

- campaigns aktif via `fetchCampaigns({ status: "active", limit: 1000 })`
- categories via `fetchCategories()`
- pillars via `GET /pillars`

State lokal:

```text
allCampaigns, filteredCampaigns, categories, pillars,
selectedCategory, selectedPillar, selectedUrgency,
searchQuery, currentPage, isLoading
```

Filtering dilakukan di client untuk category, pillar, urgency, dan search. Pagination juga client-side dengan `itemsPerPage = 12`.

Tracking:

- search query mengirim Meta Pixel `Search` setelah debounce 800ms.

Detail arsitektur search, autocomplete, listing discovery, Header search, dan gap server-side search dicatat di `docs/arsitektur-search-discovery.md`.

## Shared Domain Components

Folder `apps/web/src/components` juga berisi komponen non-atomic:

| Component | Domain |
|-----------|--------|
| `UniversalPaymentMethodSelector` | Pembayaran, pilih metode untuk transaction |
| `UniversalPaymentDetailSelector` | Pembayaran, detail metode dan upload proof |
| `UniversalInvoice` | Invoice transaksi |
| `FeedbackToastHost` | Feedback dialog global |
| `Autocomplete` | Input autocomplete umum |
| `MetaPixel` | Tracking |
| `GoogleTagManager` | Tracking |
| `ViewContentTracker` | Tracking content view |

Komponen ini belum masuk struktur atom/molecule/organism. Secara arsitektur saat ini mereka adalah shared domain components.

Detail payment selector, QRIS manual/dynamic, gateway entrypoint, dan invoice didokumentasikan di `arsitektur-universal-payment.md`.

## Page-Local Components

Banyak halaman domain menyimpan komponen lokal di folder route:

| Route | Local Components |
|-------|------------------|
| `program/[slug]` | `CampaignGallery`, `CampaignSidebar`, `CampaignTabs`, `DonationAmountSelector`, `DonationConfirmModal` |
| `qurban/[id]` | `QurbanSidebar`, `QurbanTabs`, `QurbanConfirmModal` |
| `qurban/laporan` | Report filters dan report tables |
| `qurban/savings` | `SavingsCard`, detail `DepositForm`, `ProgressBar`, `TransactionList` |
| `zakat/laporan` | Zakat report filters dan tables |
| `account/qurban-savings/[id]` | `DepositForm`, `ProgressBar`, `TransactionList` |

Ini berarti atomic design belum menjadi satu-satunya pola. Struktur aktual adalah campuran:

```text
shared atomic/molecule/organism
  + shared domain components
  + page-local domain components
```

## Halaman Pemakai Utama

| Halaman | Komponen Utama |
|---------|----------------|
| `/` | `Header`, `Footer`, `HeroSlider`, `FeaturedCarousel`, `CategoryGrid`, `ProgramCard`, `QurbanSection`, `TestimonialSection` |
| `/program` | `Header`, `Footer`, `Breadcrumb`, `ProgramListTemplate` |
| `/program/[slug]` | `Header`, `Footer`, `Breadcrumb`, `ProgramCard`, local campaign components |
| `/qurban` | `Header`, `Footer`, `Breadcrumb`, `QurbanCard` |
| `/zakat` dan kalkulator | `Header`, `Footer`, `Breadcrumb`, `ZakatCard`, zakat domain components |
| `/checkout` | `Header`, `Footer`, `Button`, `Input`, `Checkbox`, `InputField`, `TextareaField` |
| `/invoice/*` | `UniversalInvoice`, payment components |
| `/account/*` | Account layout, atoms, account domain components |

## Demo/Test Routes

Route berikut masih ada di app:

```text
/test-components
/test-molecules
/test-organisms
```

Isi route tersebut berfungsi sebagai demo komponen, bukan dokumentasi resmi. **Sejak 2026-07-06**, masing-masing route punya server `layout.tsx` yang memanggil `notFound()` jika `NODE_ENV !== 'development'`. Route ini tidak dapat diakses di production — browser mendapat 404.

## Gap dan Rekomendasi

1. ~~**Ganti ID random render-time dengan `useId()`.**~~ **Selesai (2026-07-05).** `FormField`, `Checkbox`, dan `Radio` sudah dimigrasikan ke `useId()` (React 18). Pattern: `const generatedId = useId(); const fieldId = id || generatedId;` — id eksplisit dari prop tetap diutamakan, fallback ke id SSR-safe dari React.
2. **Tentukan status route demo.** `/test-components`, `/test-molecules`, dan `/test-organisms` perlu diputuskan: hapus, pindahkan ke internal-only, atau guard hanya development.
3. **Konsolidasikan shared domain components.** `UniversalPayment*`, `UniversalInvoice`, dan `Autocomplete` berada langsung di `components/`, bukan struktur domain atau atomic. Ini membuat batas ownership kurang jelas.
4. **Kurangi komponen duplikat lintas domain.** Qurban savings punya `DepositForm`, `ProgressBar`, dan `TransactionList` di dua lokasi: `account/qurban-savings/[id]` dan `qurban/savings/[id]`.
5. **Samakan pola style.** Mayoritas memakai SCSS global, tetapi `QurbanCard`, `QurbanCarousel`, dan `ZakatCard` memakai CSS file lokal. Pilih apakah ini pengecualian sah atau perlu dipindah ke SCSS component layer.
6. **Tambahkan `'use client'` eksplisit untuk komponen reusable interaktif.** Komponen yang memakai event handler atau browser-only behavior sebaiknya jelas client component agar tidak bergantung pada parent boundary.
7. **Pecah template listing campaign.** `ProgramListTemplate` fetch semua campaign sampai `limit=1000` dan filter/paginate di client. Untuk data besar, arsitektur lebih sehat jika filter/pagination pindah ke API query.
8. **Selaraskan hardcoded blue dengan color system.** Beberapa page dan shared component masih memakai `blue-*`; lihat `arsitektur-color.md`.
9. **Form input sebaiknya punya kontrak accessibility lebih kuat.** Error/help belum selalu dihubungkan dengan `aria-describedby`; id yang stabil akan membantu.
10. **Gunakan icon library secara konsisten.** Banyak komponen memakai inline SVG manual. Jika web sudah mengadopsi satu icon library, tombol/icon reusable sebaiknya distandarkan.
11. **Impor komponen langsung dari foldernya, bukan dari barrel** (`@/components/organisms/Header`, bukan `@/components/organisms`). Barrel menarik semua komponen termasuk yang berdependensi berat (axios lewat `lib/api`) ke setiap halaman. Lihat `arsitektur-cache-performance.md` fase 8.
12. **Teks `t("ns.key")` di komponen klien butuh namespace diumumkan di `layout.tsx` rutenya** (`<I18nNamespaces names={[…]}>`). Klien tidak membundel kamus. Setelah menambah/memindah komponen atau key, jalankan `npm run check:i18n` di `apps/web` (ADR-0014, `arsitektur-i18n.md`).

## Keputusan Arsitektur Saat Ini

- `apps/web` memakai Next.js App Router dengan campuran server page dan client component.
- `Providers` adalah client boundary global untuk React Query, i18n, cart, referral, tracking, dan feedback.
- Komponen reusable utama mengikuti struktur atom/molecule/organism/template, tetapi tidak semua komponen web masuk struktur tersebut.
- Styling component utama memakai class semantik global SCSS.
- Domain checkout, payment, qurban, zakat, laporan, dan account masih banyak memakai komponen lokal.
- `Header` dan `Footer` bersifat settings-driven dan menjadi shell publik umum.
- Dokumen ini tidak menghapus file lama karena tidak ditemukan dokumen lama khusus komponen web yang perlu diserap.

### Mobile single shell (2026-10-23)

`MobileTopBar`, `MobileMenuPanel` (organisms), `MobileActionSheet` (molecule), hook `useHeaderMenuItems`, prop `Header.hideOnMobile`. Detail, cakupan halaman, z-index, dan aturan spacer: `docs/arsitektur-mobile-single-shell.md`.
