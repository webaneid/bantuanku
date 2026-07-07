# Arsitektur Theme System (Multi-Client Frontend)

> Dibuat: 2026-07-06

---

## Latar Belakang

Bantuanku akan ditawarkan ke beberapa klien (LAZ/yayasan). Setiap klien butuh tampilan frontend yang berbeda (logo, warna, Header, Footer, Hero), tapi mesinnya sama: API, admin dashboard, logika donasi/zakat/qurban/checkout — tidak berubah.

**Tujuan:**
- Satu repo GitHub, satu codebase
- Setiap deploy klien bisa punya tampilan berbeda
- Tambah klien baru = tambah satu folder theme + set env var
- Update fitur: `git pull` + rebuild di semua server, theme klien tidak tersentuh

---

## Keputusan Desain

### Build-time, bukan runtime

Theme dipilih saat build via env var `NEXT_PUBLIC_THEME`. Tidak ada runtime switcher dari admin panel.

**Alasan:** Setiap klien punya server sendiri. Tidak perlu satu deployment melayani beberapa klien. Runtime switching menambah kompleksitas signifikan (dynamic import, CSS injection, hydration) tanpa manfaat nyata untuk skenario ini.

### Hanya komponen "visual branding" yang di-theme

Bukan seluruh komponen. Yang perlu berbeda per klien hanya:
- **Header** (logo, menu, warna navbar)
- **Footer** (kontak, sosial media, warna background)
- **HeroSection** (banner utama homepage)
- **theme.config.ts** (warna, nama org, font)

Semua logic flow (checkout, zakat, qurban, pembayaran, profil) tetap shared — tidak perlu dibuat ulang per klien.

### Color tokens via CSS Custom Properties

Tailwind saat ini hardcode warna (`primary: #035a52`). Akan dimigrasikan ke CSS custom properties (`--color-primary: #035a52`) sehingga setiap theme bisa override hanya dengan satu file CSS — tanpa rebuild ulang Tailwind per theme.

---

## Struktur Folder

```
apps/web/src/
├── themes/
│   ├── bantuanku/                  ← theme default (refactor dari kode saat ini)
│   │   ├── index.ts                ← export semua theme components
│   │   ├── theme.config.ts         ← warna, nama org, font, logo
│   │   ├── theme.css               ← CSS custom properties override (Phase 2)
│   │   ├── components/
│   │   │   ├── Header.tsx          ← dipindah dari organisms/Header
│   │   │   ├── Footer.tsx          ← dipindah dari organisms/Footer
│   │   │   └── HeroSection.tsx     ← dipindah dari organisms/HeroSlider
│   │   └── styles/
│   │       ├── Header.scss         ← dipindah dari styles/components/header.scss
│   │       ├── Footer.scss         ← dipindah dari styles/components/footer.scss
│   │       └── HeroSection.scss    ← dipindah dari styles/components/hero-slider.scss
│   │
│   └── [nama-klien]/               ← dibuat saat ada klien baru
│       ├── index.ts
│       ├── theme.config.ts
│       ├── theme.css
│       ├── components/
│       │   ├── Header.tsx          ← desain baru, beda total
│       │   ├── Footer.tsx
│       │   └── HeroSection.tsx
│       └── styles/
│           ├── Header.scss         ← CSS baru sesuai desain klien
│           ├── Footer.scss
│           └── HeroSection.scss
│
├── lib/
│   └── theme.ts                    ← theme registry & loader (NEW)
│
├── components/
│   ├── organisms/                  ← yang TETAP di sini (shared):
│   │   ├── CategoryGrid/           ← pakai CSS vars, tidak perlu per-theme
│   │   ├── ProgramCard/
│   │   ├── FeaturedCarousel/
│   │   ├── QurbanCard/
│   │   ├── QurbanSection/
│   │   ├── ZakatCard/
│   │   └── TestimonialSection/
│   ├── molecules/                  ← semua tetap shared
│   └── atoms/                      ← semua tetap shared
│
├── styles/
│   ├── components/                 ← hanya CSS shared organisms (tidak berubah):
│   │   ├── buttons.scss            ← shared
│   │   ├── cards.scss              ← shared
│   │   ├── forms.scss              ← shared
│   │   ├── program-card.scss       ← shared
│   │   ├── featured-carousel.scss  ← shared
│   │   └── ...                     ← semua organism shared
│   │   (header.scss, footer.scss, hero-slider.scss DIHAPUS dari sini)
│   └── globals.scss                ← tidak lagi import header/footer/hero CSS
│
└── app/
    └── layout.tsx                  ← import Header/Footer dari active theme
```

---

## CSS Scoping — Tidak Ada CSS Theme yang Tidak Terpakai

### Prinsip

CSS theme-specific (Header, Footer, HeroSection) **tidak boleh masuk `globals.scss`**. Sebaliknya, setiap komponen theme meng-import SCSS-nya sendiri secara langsung:

```typescript
// themes/bantuanku/components/Header.tsx
import '../styles/Header.scss';   ← hanya diload saat Header ini dirender

// themes/yayasan-b/components/Header.tsx
import '../styles/Header.scss';   ← CSS berbeda, hanya diload saat theme yayasan-b aktif
```

Next.js secara otomatis hanya men-bundle CSS yang di-import oleh komponen yang **benar-benar dirender**. Karena hanya satu theme aktif per build, CSS dari theme lain tidak masuk bundle sama sekali.

### CSS yang Dipindah ke Theme Folder

| File SCSS lama | Pindah ke | Alasan |
|---------------|-----------|--------|
| `styles/components/header.scss` | `themes/[slug]/styles/Header.scss` | Hanya dipakai oleh Header theme |
| `styles/components/footer.scss` | `themes/[slug]/styles/Footer.scss` | Hanya dipakai oleh Footer theme |
| `styles/components/hero-slider.scss` | `themes/[slug]/styles/HeroSection.scss` | Hanya dipakai oleh HeroSection theme |

Import ketiga file ini juga **dihapus dari `globals.scss`**.

### CSS yang Tetap Global (Shared)

Semua CSS berikut tetap di `styles/components/` dan di-import via `globals.scss` — dipakai oleh shared organisms yang tidak di-theme:

`buttons.scss`, `cards.scss`, `forms.scss`, `badges.scss`, `program-card.scss`, `featured-carousel.scss`, `category-grid.scss`, `testimonial.scss`, `breadcrumb.scss`, dll.

### Hasil

| Kondisi | CSS yang ter-load |
|---------|------------------|
| `NEXT_PUBLIC_THEME=bantuanku` | Shared CSS + bantuanku Header/Footer/Hero CSS |
| `NEXT_PUBLIC_THEME=yayasan-b` | Shared CSS + yayasan-b Header/Footer/Hero CSS |
| Theme manapun | CSS theme lain = 0 byte |

---

## Theme Contract

Setiap folder theme **wajib** mengekspor interface berikut via `index.ts`:

```typescript
// themes/[nama]/index.ts
export { default as Header } from './components/Header';
export { default as Footer } from './components/Footer';
export { default as HeroSection } from './components/HeroSection';
export { default as themeConfig } from './theme.config';
```

```typescript
// theme.config.ts — shape wajib
export interface ThemeConfig {
  name: string;                    // "Bantuanku" / "Yayasan XYZ"
  slug: string;                    // "bantuanku" / "yayasan-xyz"
  logoPath: string;                // "/themes/bantuanku/logo.svg"
  favicon: string;                 // "/themes/bantuanku/favicon.ico"
  fonts?: {
    primary?: string;              // Google Fonts import URL jika berbeda
  };
}

const themeConfig: ThemeConfig = { ... };
export default themeConfig;
```

Props interface untuk tiap komponen theme (TypeScript enforces ini):

```typescript
// Setiap Header.tsx harus menerima props ini
export interface HeaderProps {
  settings: PublicSettings;        // dari DB (nama org, logo URL dari settings, dll)
}

// Setiap Footer.tsx
export interface FooterProps {
  settings: PublicSettings;
  categories: Category[];
}

// Setiap HeroSection.tsx
export interface HeroSectionProps {
  slides: HeroSlide[];             // dari settings.frontend_hero_slides
  settings: PublicSettings;
}
```

---

## Theme Registry & Loader

```typescript
// apps/web/src/lib/theme.ts

import type { ComponentType } from 'react';
import type { HeaderProps, FooterProps, HeroSectionProps, ThemeConfig } from '@/types/theme';

// Daftarkan semua theme yang tersedia di sini
// Import statis — Next.js bisa tree-shake theme yang tidak aktif
import * as bantuankuTheme from '@/themes/bantuanku';
// import * as yayasanBTheme from '@/themes/yayasan-b';  // tambah saat ada klien baru

const THEME_MAP = {
  bantuanku: bantuankuTheme,
  // 'yayasan-b': yayasanBTheme,
} as const;

type ThemeName = keyof typeof THEME_MAP;

const themeName = (process.env.NEXT_PUBLIC_THEME || 'bantuanku') as ThemeName;

if (!THEME_MAP[themeName]) {
  throw new Error(`Theme "${themeName}" tidak ditemukan di THEME_MAP. Daftarkan di apps/web/src/lib/theme.ts`);
}

export const activeTheme = THEME_MAP[themeName];
export const Header = activeTheme.Header;
export const Footer = activeTheme.Footer;
export const HeroSection = activeTheme.HeroSection;
export const themeConfig = activeTheme.themeConfig;
```

Penggunaan di `app/layout.tsx`:

```typescript
import { Header, Footer, themeConfig } from '@/lib/theme';
```

---

## Sistem Warna: Migrasi ke CSS Custom Properties

### Kondisi Saat Ini

`tailwind.config.js` mendefinisikan warna sebagai nilai hex statis:
```javascript
primary: { 500: '#035a52', 600: '#024a43', ... }
```

Komponen pakai class Tailwind `bg-primary-500`, `text-primary-600`, dll.

### Target

CSS custom properties di root, di-override per theme:

```css
/* apps/web/src/styles/tokens.css — default (bantuanku) */
:root {
  --color-primary-50:  #e6f2f1;
  --color-primary-100: #c2dedd;
  --color-primary-500: #035a52;
  --color-primary-600: #024a43;
  /* ... semua shade */

  --color-success-500: #678f0c;
  --color-warning-500: #d2aa55;
  --color-danger-500:  #8f132f;
  --color-info-500:    #296585;
}
```

```css
/* themes/yayasan-b/theme.css — override untuk klien ini */
:root {
  --color-primary-500: #1a4fa8;   /* biru, beda dari bantuanku */
  --color-primary-600: #163f86;
  /* hanya override yang berbeda */
}
```

`tailwind.config.js` direferensikan ke CSS var:
```javascript
primary: {
  500: 'var(--color-primary-500)',
  600: 'var(--color-primary-600)',
  // ...
}
```

Theme CSS di-import di `app/layout.tsx` sesuai theme aktif:
```typescript
import `@/themes/${process.env.NEXT_PUBLIC_THEME}/theme.css`;
// atau dynamic: import(`@/themes/${themeName}/theme.css`)
```

Dengan ini, semua komponen shared (CategoryGrid, ProgramCard, dll) otomatis mengikuti warna tema aktif via class `bg-primary-500` — tanpa diubah sama sekali.

---

## Aset Per Theme

Logo, favicon, dan aset visual lainnya disimpan di:
```
apps/web/public/themes/
  bantuanku/
    logo.svg
    logo-white.svg
    favicon.ico
  yayasan-b/
    logo.svg
    favicon.ico
```

Path dari `themeConfig.logoPath` → digunakan di Header dan Footer theme masing-masing.

---

## Rencana Migrasi (Fase)

### Fase 1 — Buat Struktur Theme (tanpa mengubah UI)
1. Buat folder `src/themes/bantuanku/components/` dan `src/themes/bantuanku/styles/`
2. **Pindahkan** `Header.tsx`, `Footer.tsx`, `HeroSlider.tsx` → `themes/bantuanku/components/`
3. **Pindahkan** `header.scss`, `footer.scss`, `hero-slider.scss` → `themes/bantuanku/styles/`
4. Di masing-masing component theme, tambahkan import SCSS-nya: `import '../styles/Header.scss'`
5. **Hapus** import `header.scss`, `footer.scss`, `hero-slider.scss` dari `globals.scss`
6. Buat `theme.config.ts` dengan data bantuanku saat ini
7. Buat `lib/theme.ts` (theme registry)
8. Update `app/layout.tsx` dan `app/page.tsx` untuk import dari `@/lib/theme`
9. TypeScript check: 0 error
10. Visual test: pastikan UI identik seperti sebelumnya — tidak ada CSS hilang

### Fase 2 — Migrasi Warna ke CSS Custom Properties
1. Buat `src/styles/tokens.css` dengan semua CSS custom properties
2. Update `tailwind.config.js` untuk referensi ke CSS vars
3. Buat `themes/bantuanku/theme.css` (nilai sama, tapi sekarang bisa di-override)
4. Import `theme.css` di layout
5. TypeScript + visual check

### Fase 3 — Dokumentasi "Cara Buat Theme Baru"
1. Tulis checklist lengkap (lihat section di bawah)
2. Buat satu contoh theme kedua (`themes/demo/`) sebagai proof-of-concept dengan warna beda

---

## Cara Menambah Theme Klien Baru

Checklist saat ada order klien baru:

```
[ ] 1. Buat folder: src/themes/[nama-klien]/components/ dan src/themes/[nama-klien]/styles/
[ ] 2. Copy dari bantuanku: index.ts, theme.config.ts, theme.css, components/, styles/
[ ] 3. Edit theme.config.ts: nama org, slug, logo path, favicon
[ ] 4. Edit theme.css: override warna primary sesuai brand klien (Phase 2)
[ ] 5. Edit Header.tsx + styles/Header.scss: logo baru, warna menu, layout navbar
[ ] 6. Edit Footer.tsx + styles/Footer.scss: kontak, sosial, warna background
[ ] 7. Edit HeroSection.tsx + styles/HeroSection.scss: layout hero jika beda
[ ] 8. Tambah logo/aset ke public/themes/[nama-klien]/
[ ] 9. Daftarkan di apps/web/src/lib/theme.ts (import + THEME_MAP entry)
[ ] 10. Di server klien: set NEXT_PUBLIC_THEME=[nama-klien] di .env (web) + ORGANIZATION_SLUG=[nama-klien] di .env (api)
[ ] 11. npm run build — selesai
[ ] 12. Verifikasi: CSS theme lain tidak ter-load (inspect Network tab → no header/footer CSS dari theme lain)
```

---

## Yang Tidak Berubah Per Theme

Komponen berikut tetap shared — tidak perlu disentuh saat buat theme baru:

| Kategori | Komponen |
|----------|----------|
| Atoms | Button, Input, Badge, Spinner, dll |
| Molecules | AmountSelector, ProgressBar, SearchBox, FormField, dll |
| Organisms (logic) | CategoryGrid, ProgramCard, FeaturedCarousel, QurbanCard, QurbanSection, ZakatCard, TestimonialSection |
| Flow | Seluruh checkout, zakat flow, qurban flow, profil akun |
| Payment | UniversalPaymentMethodSelector, UniversalInvoice |
| Tracking | GoogleTagManager, MetaPixel |
| State | CartContext, auth store |
| API | Semua services, lib/api.ts |

---

## CDN / GCS: Folder Per Klien

### Kondisi Saat Ini

Semua file upload masuk ke satu prefix di GCS bucket:

```
{bucket}/
  bantuanku/2026/07/timestamp-file.jpg    ← semua klien campur jadi satu
```

Fungsi `generateGCSPath` di `apps/api/src/lib/gcs.ts:204` sudah punya parameter `organizationSlug` dengan default hardcode `'bantuanku'`:

```typescript
export function generateGCSPath(filename: string, organizationSlug: string = 'bantuanku'): string {
  return `${organizationSlug}/${year}/${month}/${filename}`;
}
```

Tapi semua pemanggil (4 lokasi) tidak meneruskan argumen kedua — semuanya pakai default.

### Target

Setiap klien punya folder sendiri di GCS:

```
{bucket}/
  bantuanku/2026/07/...      ← klien 1
  yayasan-b/2026/07/...      ← klien 2
  yayasan-c/2026/07/...      ← klien 3
```

Kalau klien berhenti berlangganan → hapus prefix `{bucket}/{slug}/` → semua file klien itu hilang bersih.

### Mekanisme

Tambah satu env var di setiap deployment:

```
ORGANIZATION_SLUG=bantuanku     ← diisi slug klien saat setup server
```

Semua pemanggil `generateGCSPath` diteruskan slug ini:

```typescript
// apps/api/src/lib/gcs.ts — tidak ada perubahan di fungsi
generateGCSPath(filename, process.env.ORGANIZATION_SLUG ?? 'bantuanku')
```

**4 lokasi yang perlu diupdate saat eksekusi:**
1. `apps/api/src/routes/admin/media.ts:352`
2. `apps/api/src/routes/mitra.ts:361`
3. `apps/api/src/routes/qurban.ts:1106`
4. `apps/api/src/routes/qurban.ts:2118`

### Env Var Per Deployment

Setiap server klien punya `.env`:

```env
NEXT_PUBLIC_THEME=yayasan-b        ← pilih theme frontend
ORGANIZATION_SLUG=yayasan-b        ← prefix GCS (sama dengan slug theme)
```

Konvensi: `ORGANIZATION_SLUG` = `NEXT_PUBLIC_THEME` = slug folder theme. Satu identifier, dipakai di dua tempat.

### Checklist Onboard Klien Baru (Tambahan CDN)

```
[ ] Set ORGANIZATION_SLUG=[nama-klien] di .env API server
[ ] Pastikan GCS bucket sudah ada dan service account punya write access
[ ] Tidak perlu buat folder manual — GCS auto-create saat file pertama diupload
[ ] Catat slug di internal tracker untuk keperluan offboarding
```

### Offboarding Klien

Untuk hapus semua data CDN klien yang berhenti:

```bash
# Hapus semua file dengan prefix klien dari GCS bucket
gsutil -m rm -r gs://{bucket-name}/yayasan-b/
```

---

## Keputusan: Halaman Transaksi Tidak Di-Theme

Halaman checkout, pembayaran, profil akun, dan semua flow transaksi **sengaja tidak di-theme** — layout dan strukturnya sama untuk semua klien.

**Yang berbeda:** warna mengikuti theme aktif via CSS custom properties (tombol, progress bar, dll otomatis pakai warna primary klien).

**Alasan:**
- Checkout yang terbukti bekerja tidak perlu dibuat ulang per klien
- Bugfix sekali berlaku untuk semua klien
- Klien menilai identitas dari homepage, bukan halaman checkout

Jika klien meminta layout checkout yang berbeda total → itu **custom project** di luar scope theme system ini.

---

## Gap & Catatan

| # | Item | Status |
|---|------|--------|
| 1 | Homepage masih punya hardcoded sections ("Jelajahi Halaman Penting", "Why Choose Us", CTA buttons) | Bisa dipindah ke settings DB atau cukup diedit per-theme di HeroSection — keputusan saat Fase 1 |
| 2 | `NEXT_PUBLIC_THEME` harus diset sebelum build — tidak bisa diubah saat runtime tanpa rebuild | Disengaja by design |
| 3 | Tailwind masih hardcode warna — akan di-fix di Fase 2 | Fase 2 |
| 4 | SCSS `_variables.scss` juga hardcode warna — perlu sinkron dengan CSS vars di Fase 2 | Fase 2 |
