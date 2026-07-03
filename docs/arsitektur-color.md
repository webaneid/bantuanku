# Arsitektur Color System

Dokumen ini adalah source of truth untuk sistem warna Bantuanku/Laziswaf Darunnajah. Standar final di dokumen ini mengikuti implementasi kode aktual, bukan dokumen color harmony lama.

Dokumen ini menyerap dan mengoreksi:

- `docs/color-harmony.md`
- `docs/color-harmony-override.md`
- `COLORS.md`

Dokumen lama memakai rencana warna `#009B4C`, `#F58220`, `#1B3C87`, dan beberapa token lain seperti `#C9A961`/`#006B5C`. Implementasi aktual sudah memakai palet yang berbeda: primary hijau tua `#035a52`, secondary/accent emas `#d2aa55`, danger merah `#8f132f`, dan info biru `#296585`.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Admin Tailwind token | `apps/admin/tailwind.config.ts` |
| Admin SCSS token | `apps/admin/src/styles/utils/_variables.scss` |
| Admin global CSS | `apps/admin/src/app/globals.css` |
| Admin component SCSS | `apps/admin/src/styles/components/*.scss` |
| Admin layout/page SCSS | `apps/admin/src/styles/layouts/*.scss`, `apps/admin/src/styles/pages/*.scss` |
| Web Tailwind token | `apps/web/tailwind.config.js` |
| Web SCSS token | `apps/web/src/styles/_variables.scss` |
| Web global SCSS | `apps/web/src/styles/globals.scss` |
| Web component SCSS | `apps/web/src/styles/components/*.scss` |
| DB metadata warna | `packages/db/src/schema/category.ts`, `packages/db/src/schema/pillar.ts` |
| Seed warna kategori | `packages/db/src/seed.ts` |
| Email template | `apps/api/src/services/email.ts` |

## Palet Aktual

### Admin

Admin memiliki dua sumber token yang harus tetap dianggap satu sistem:

- Tailwind: `apps/admin/tailwind.config.ts`
- SCSS: `apps/admin/src/styles/utils/_variables.scss`

Token utama:

| Token | Base | Fungsi Aktual |
|-------|------|---------------|
| `primary-500` | `#035a52` | Hijau Darunnajah untuk tombol utama, link, focus, active state |
| `secondary-500` | `#d2aa55` | Emas untuk secondary/accent/warning |
| `accent-500` | `#d2aa55` | Alias emas, dipertahankan untuk backward compatibility |
| `success-500` | `#678f0c` | Status sukses dan aksi positif non-primary |
| `danger-500` | `#8f132f` | Error, destructive action, danger state |
| `warning-500` | `#d2aa55` | Warning, sama dengan emas |
| `info-500` | `#296585` | Info state dan visual data/informasi |
| `gray-*` | Tailwind gray scale | Netral UI, border, body, surface |

Catatan penting:

- `secondary` dan `accent` di Admin sama-sama emas.
- `warning` juga memakai keluarga emas yang sama.
- Admin Tailwind dan Admin SCSS sudah memakai base color yang sama, tetapi beberapa shade berbeda tipis dengan Web.

### Web

Web memiliki dua sumber token:

- Tailwind: `apps/web/tailwind.config.js`
- SCSS: `apps/web/src/styles/_variables.scss`

Token utama:

| Token | Base | Fungsi Aktual |
|-------|------|---------------|
| `primary-500` | `#035a52` | Brand green utama |
| `success-500` | `#678f0c` | Success state |
| `warning-500` | `#d2aa55` | Warning/emas |
| `danger-500` | `#8f132f` | Danger/error |
| `info-500` | `#296585` | Info/biru |
| `accent-500` | `#d2aa55` | Accent emas |

Catatan penting:

- Web Tailwind tidak mendefinisikan `secondary`, sedangkan Admin mendefinisikan `secondary`.
- Web SCSS hanya mendefinisikan sebagian shade `accent`: `50`, `500`, dan `700`.
- Web dan Admin sama-sama memakai base color yang sama, tetapi shade skala 50-900 tidak 100% identik.

## Shade Scale Aktual

### Primary

| App | 50 | 100 | 500 | 600 | 700 |
|-----|----|-----|-----|-----|-----|
| Admin Tailwind/SCSS | `#e6f2f1` | `#cce3e1` | `#035a52` | `#025850` | `#024842` |
| Web Tailwind | `#e6f4f3` | `#b3e0dc` | `#035a52` | `#024741` | `#023831` |
| Web SCSS | `#e6f4f3` | `#b3e0dc` | `#035a52` | `#024741` | `#023831` |

### Emas / Accent / Warning

| App | 50 | 100 | 500 | 600 | 700 |
|-----|----|-----|-----|-----|-----|
| Admin Tailwind/SCSS | `#faf7f0` | `#dccfb4` | `#d2aa55` | `#a88843` | `#8a6f37` |
| Web Tailwind | `#fdf8ed` | `#f7eacc` | `#d2aa55` | `#b8964b` | `#9e7f3f` |
| Web SCSS warning | `#fdf8ed` | `#f7eacc` | `#d2aa55` | `#b8964b` | `#9e7f3f` |

### Semantic

| Token | Base Aktual | Catatan |
|-------|-------------|---------|
| `success-500` | `#678f0c` | Bukan Tailwind green default dan bukan `#10B981` dari dokumen lama |
| `danger-500` | `#8f132f` | Bukan `#C92424` dari dokumen lama |
| `info-500` | `#296585` | Bukan `#1B3C87` dari dokumen lama |

## Implementasi Komponen

### Admin SCSS Button

`apps/admin/src/styles/components/_buttons.scss` memakai token SCSS:

| Class | Warna Aktual |
|-------|--------------|
| `.btn.btn-primary` | `$primary-500`, hover `$primary-600`, active `$primary-700` |
| `.btn.btn-secondary` | transparent + border/text `$accent-500` |
| `.btn.btn-accent` | `$gradient-gold` |
| `.btn.btn-success` | `$success-500` |
| `.btn.btn-danger` | `$danger-500` |
| `.btn.btn-outline` | border/text `$primary-500` |
| `.btn.btn-link` | `$primary-500` |

### Web SCSS Button

`apps/web/src/styles/components/_buttons.scss` memakai pola class berbeda:

| Class | Warna Aktual |
|-------|--------------|
| `.btn-primary` | `$primary-500` |
| `.btn-secondary` | gray neutral, bukan emas/biru |
| `.btn-success` | `$success-500` |
| `.btn-danger` | `$danger-500` |
| `.btn-warning` | `$warning-500` |
| `.btn-outline` | `$primary-500` |
| `.btn-ghost` | `$primary-600` |

### Global

| App | Global behavior |
|-----|-----------------|
| Admin | `body` memakai `bg-gray-50 text-gray-900`; `.prose a` memakai `text-primary-600 hover:text-primary-700` |
| Web | `body` memakai `bg-white text-gray-900`; focus ring global `ring-primary-500`; selection `bg-primary-100 text-primary-900` |

## DB dan Data-Driven Color

Beberapa warna bukan bagian dari design token global, melainkan metadata data:

| Entity | Field | Source |
|--------|-------|--------|
| Category | `category.color` | `packages/db/src/schema/category.ts` |
| Pillar | `pillar.color` | `packages/db/src/schema/pillar.ts` |

Seed kategori masih memakai warna Tailwind generic:

| Slug | Seed color |
|------|------------|
| `pendidikan` | `#3b82f6` |
| `kesehatan` | `#ef4444` |
| `bencana` | `#f97316` |
| `sosial` | `#22c55e` |
| `kemanusiaan` | `#8b5cf6` |
| `lingkungan` | `#10b981` |

Ini adalah warna metadata konten, bukan token brand utama. Jika ingin diselaraskan, perubahan harus dilakukan melalui arsitektur master data/kategori, bukan hanya color token global.

## Email Template

`apps/api/src/services/email.ts` memakai warna hardcoded `#10b981` untuk header/button/success icon.

Ini belum mengikuti token Admin/Web (`#035a52`) dan juga tidak mengambil token dari shared package. Karena email dirender di API, sistem warna email saat ini berdiri sendiri.

## Koreksi Dokumen Lama

| Klaim Lama | Status Implementasi |
|------------|---------------------|
| Primary `#009B4C` | Tidak sesuai. Implementasi memakai `#035a52`. |
| Secondary `#1B3C87` | Tidak sesuai untuk Admin/Web token. Admin `secondary` adalah emas `#d2aa55`; Web tidak punya `secondary`. |
| Accent `#F58220` | Tidak sesuai. Implementasi memakai emas `#d2aa55`. |
| Success `#10B981` | Tidak sesuai token UI. Implementasi memakai `#678f0c`; email masih hardcoded `#10b981`. |
| Danger `#C92424` | Tidak sesuai. Implementasi memakai `#8f132f`. |
| Warning `#F58220` | Tidak sesuai. Implementasi memakai `#d2aa55`. |
| Root `COLORS.md` berisi token `#C9A961`/`#006B5C` dan CSS variable `--color-*` | Tidak sesuai. Implementasi memakai Tailwind/SCSS token app, bukan CSS variable root tersebut. |
| CTA primary harus gold gradient | Tidak berlaku umum. Admin `.btn-primary` hijau, `.btn-accent` gold gradient. Web `.btn-primary` hijau. |
| `docs/color-harmony.md` perlu dipertahankan sebagai reference | Tidak sesuai SOP source of truth. Informasi yang relevan sudah diserap dan dikoreksi di dokumen ini. |

## Gap dan Rekomendasi

1. **Satukan shade scale Admin dan Web.** Base color sama, tetapi shade 50-900 berbeda. Ini membuat hasil visual `primary-50`, `warning-100`, dan token sejenis tidak konsisten antar app.
2. **Tambahkan `secondary` di Web atau hapus konsep `secondary` dari arsitektur global.** Saat ini `secondary` ada di Admin saja.
3. **Samakan primitive Admin `components/ui/*`.** `button.tsx`, `badge.tsx`, dan `switch.tsx` masih memakai `blue-*`, `red-*`, dan `green-*` Tailwind generic.
4. **Kurangi hardcoded `blue-*` di halaman.** Banyak status, info panel, link, dan card masih memakai `blue-*`. Sebagian bisa tetap valid sebagai semantic info, tetapi harus diarahkan ke `info-*` jika ingin konsisten.
5. **Buat shared color token package jika ingin benar-benar satu sumber.** Saat ini token didefinisikan terpisah di Admin Tailwind, Admin SCSS, Web Tailwind, dan Web SCSS.
6. **Selaraskan email template.** API email masih hardcoded `#10b981`; sebaiknya memakai brand primary `#035a52` atau token email khusus.
7. **Pisahkan brand token dan metadata warna konten.** Warna category/pillar dari DB tidak otomatis salah, tetapi harus didokumentasikan sebagai data-driven color, bukan design token.
8. **Hindari dokumen rencana warna paralel.** Semua rencana perubahan warna berikutnya harus memperbarui dokumen ini atau implementasi kode, bukan membuat blueprint baru.

## Keputusan Arsitektur Saat Ini

- Source of truth implementasi warna saat ini ada di kode, terutama Tailwind config dan SCSS variables.
- Primary brand aktual adalah `#035a52`.
- Emas aktual adalah `#d2aa55`, dipakai sebagai `secondary`, `accent`, dan `warning` di Admin.
- Web belum punya token `secondary`.
- Hardcoded `blue-*` masih ada dan belum otomatis dianggap salah; sebagian berfungsi sebagai info state. Namun untuk konsistensi, arah refactor adalah pindah ke `info-*`.
- Dokumen lama `color-harmony.md`, `color-harmony-override.md`, dan root `COLORS.md` tidak lagi menjadi referensi aktif.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `docs/color-harmony.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
| `docs/color-harmony-override.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
| `COLORS.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
