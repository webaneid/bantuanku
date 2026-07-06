# Arsitektur Frontend UX Quality

> Terakhir di-sync: 2026-07-06

---

## Overview

Dokumen ini adalah source of truth untuk kualitas UX frontend Bantuanku sesuai implementasi kode saat ini. Fokusnya:

1. stack frontend public web dan admin;
2. struktur komponen, styling, dan design system yang benar-benar ada;
3. standar feedback/notifikasi;
4. mobile/responsive quality;
5. inline style dan native browser dialog yang masih tersisa;
6. gap antara blueprint frontend lama dan implementasi aktual.

Dokumen ini menyerap dan mengoreksi:

- `dokumentasi-front-end.md`;
- `apps/admin/docs/00-blueprint-front-end.md`.
- `00-frontend-developement.md` di root repository.
- `hardcode-front-end.md`, `hardcode-audit-frontend.md`, dan `hardcode-status-checklist.md` di root repository.

Catatan: `00-frontend-developement.md` adalah planning lama public website dari 22 Januari 2026, bukan implementasi aktual. File itu menulis public web sebagai Next.js 15/React 19, route `/campaigns`, `/donate/*`, API route webhook frontend, dan gateway Midtrans/Xendit/Manual sebagai target matang. Implementasi aktual berbeda: public web memakai Next.js 14/React 18, route utama mengikuti `apps/web/src/app/**`, payment gateway punya dokumen spesifik, dan webhook berada di API Hono. Karena substansi yang masih relevan sudah dikompresi ke dokumen arsitektur baru, file root itu dihapus.

Catatan hardcode audit root: tiga file `hardcode-*` lama berisi snapshot audit UI text/settings dari Februari 2026. Detail line number tidak lagi dapat dipercaya karena kode sudah berubah. Substansi yang masih valid dipindahkan ke `arsitektur-i18n.md` untuk hardcoded text, dokumen ini untuk inline style/native dialog, `arsitektur-color.md` untuk hardcoded color, dan `arsitektur-universal-payment.md` untuk invoice footer.

`dokumentasi-ipaymu.md` tidak diserap di dokumen ini karena sudah dipindahkan ke arsitektur gateway spesifik `docs/arsitektur-payment-gateway-ipaymu.md`. Integrasi Flip, Xendit, dan Midtrans juga sudah dipisahkan ke dokumen gateway masing-masing.

Dokumen terkait:

- `arsitektur-komponen-web.md` — atomic component public web.
- `arsitektur-komponen-admin.md` — admin layout, modal, form, table, feedback.
- `arsitektur-color.md` — color system aktual.
- `arsitektur-i18n.md` — i18n dan hardcoded text gap.
- `arsitektur-media.md` — media/image UX.
- `arsitektur-cache-performance.md` — performance frontend, React Query, image.
- `arsitektur-testing-qa.md` — QA gap, lint, type-check, visual regression.
- `arsitektur-security.md` — `dangerouslySetInnerHTML`, unsafe HTML, frontend token.
- `arsitektur-universal-payment.md` — UX checkout/payment dan metodologi pembayaran.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Web package/deps | `apps/web/package.json` |
| Admin package/deps | `apps/admin/package.json` |
| Web global styles | `apps/web/src/styles/globals.scss` |
| Web style partials | `apps/web/src/styles/**/*.scss` |
| Admin global styles | `apps/admin/src/styles/main.scss` |
| Admin style partials | `apps/admin/src/styles/**/*.scss` |
| Web components | `apps/web/src/components/**` |
| Admin components | `apps/admin/src/components/**` |
| Web provider | `apps/web/src/app/providers.tsx` |
| Admin provider | `apps/admin/src/app/providers.tsx` |
| Web Header/Footer | `apps/web/src/components/organisms/Header`, `apps/web/src/components/organisms/Footer` |
| Admin Sidebar/Layout | `apps/admin/src/components/Sidebar.tsx`, `apps/admin/src/app/dashboard/layout.tsx` |
| Feedback dialog | `apps/admin/src/components/FeedbackDialog.tsx`, `apps/web/src/styles/components/_feedback-dialog.scss` |
| Public checkout/payment UI | `apps/web/src/app/checkout/**`, `apps/web/src/app/invoice/**` |
| Admin settings frontend | `apps/admin/src/app/dashboard/settings/frontend/page.tsx` |

---

## Frontend Stack Aktual

### Public Web

Package:

```text
apps/web/package.json
```

| Area | Implementasi |
|------|--------------|
| Framework | Next.js `^14.2.0`, App Router |
| React | React `^18.3.0` |
| Styling | Tailwind CSS, SCSS partials, global SCSS |
| Server state | `@tanstack/react-query` |
| Client state | Context dan sebagian Zustand dependency tersedia |
| Forms | `react-hook-form`, `zod`, custom state |
| UI helpers | `clsx`, Headless UI dependency tersedia |
| Animation/carousel | `framer-motion`, `swiper` dependency tersedia |
| Notification dependency | `react-hot-toast` tersedia |
| PDF/image export | `html2canvas`, `jspdf`, `qrcode` |
| Date | `date-fns`, `date-fns-tz` |

### Admin

Package:

```text
apps/admin/package.json
```

| Area | Implementasi |
|------|--------------|
| Framework | Next.js `^15.1.6`, App Router |
| React | React `^19.0.0` |
| Styling | Tailwind CSS, SCSS partials, global SCSS |
| Server state | `@tanstack/react-query` |
| API client | `axios` |
| Forms | `react-hook-form`, `zod`, custom state |
| Icons | `@heroicons/react`, `lucide-react` |
| Rich text | Tiptap |
| Charts | `recharts` |
| Notification | `react-hot-toast`, `sonner`, custom `FeedbackDialog` |
| Export | `xlsx` |
| QR scan | `jsqr` |

Gap terhadap blueprint lama:

1. Blueprint lama menyebut stack target umum, tetapi route dan implementasi aktual sudah banyak berubah.
2. CSS Modules tidak terlihat sebagai pola utama; styling aktual dominan Tailwind + SCSS global/partials.
3. Headless UI/Radix/Framer Motion tidak boleh dianggap standar wajib hanya karena disebut blueprint; yang benar adalah dependensi dan pemakaian aktual.
4. Public web dan admin memakai major Next/React berbeda; ini harus dianggap constraint QA.

---

## Struktur Komponen Aktual

### Public Web

Public web punya pola atomic-ish:

```text
apps/web/src/components/atoms
apps/web/src/components/molecules
apps/web/src/components/organisms
apps/web/src/components/templates
apps/web/src/components/zakat
apps/web/src/components/account
```

Contoh komponen:

| Layer | Contoh |
|-------|--------|
| atoms | `Button`, `Badge`, `Input`, `Label`, `Spinner` |
| molecules | `AmountSelector`, `FormField`, `ProgressBar`, `QuantitySelector`, `ShareButtons`, `SearchBox` |
| organisms | `Header`, `Footer`, `HeroSlider`, `ProgramCard`, `QurbanCard`, `QurbanCarousel`, `QurbanSection`, `ZakatCard`, `CategoryGrid`, `FeaturedCarousel`, `TestimonialSection`, `Breadcrumb` |
| templates | `ProgramListTemplate` |

Catatan:

1. Blueprint lama menyebut `ProgramCard` sebagai organisms, dan itu memang ada.
2. Blueprint lama menyebut `DonationForm`, `CartSidebar`, `MainLayout`, `CheckoutLayout`; tidak semua ada sebagai komponen bernama sama.
3. Banyak page masih punya komponen lokal di folder route, bukan semua ditarik ke reusable component.

### Admin

Admin tidak mengikuti atomic design formal. Pola aktual:

- layout shell dashboard;
- domain page langsung di `apps/admin/src/app/dashboard/**`;
- shared components di `apps/admin/src/components/**`;
- modal domain di `apps/admin/src/components/modals/**`;
- UI primitives di `apps/admin/src/components/ui/**`;
- SCSS partials untuk table, forms, modal, layout, settings, print.

Detail lebih lengkap ada di `arsitektur-komponen-admin.md`.

---

## Styling System Aktual

### Public Web

SCSS partials:

```text
apps/web/src/styles/_variables.scss
apps/web/src/styles/_mixins.scss
apps/web/src/styles/_typography.scss
apps/web/src/styles/components/*.scss
apps/web/src/styles/globals.scss
```

Komponen style yang ada mencakup:

- buttons;
- cards;
- forms;
- badges;
- progress;
- header/footer;
- hero slider;
- program card/grid;
- pagination;
- table/mobile table;
- feedback dialog;
- amount/quantity/search/share controls.

### Admin

SCSS partials:

```text
apps/admin/src/styles/utils/_variables.scss
apps/admin/src/styles/utils/_mixins.scss
apps/admin/src/styles/base/_reset.scss
apps/admin/src/styles/base/_typography.scss
apps/admin/src/styles/components/*.scss
apps/admin/src/styles/layouts/*.scss
apps/admin/src/styles/pages/*.scss
apps/admin/src/styles/main.scss
```

Admin style mencakup:

- dashboard layout/sidebar;
- button/card/form/table;
- mobile table;
- pagination;
- modal;
- media library;
- rich text editor;
- feedback dialog;
- settings, login, print, form page.

Gap:

1. Inline style masih banyak dipakai untuk ukuran, progress width, chart dimensions, table align, dan warna ad hoc.
2. Tidak ada rule lint yang melarang inline style untuk visual styling.
3. Beberapa inline style masih wajar untuk dynamic width/chart, tetapi font size/color hardcode sebaiknya dipindah ke class/token.

---

## Native Browser Dialog dan Feedback UX

### Implementasi Feedback Saat Ini

| Area | Implementasi |
|------|--------------|
| Admin modal feedback | `FeedbackDialog` banyak dipakai di form/settings/domain CRUD |
| Admin toast | `react-hot-toast` dan `sonner` masih sama-sama dipakai |
| Web toast | `feedbackToast` (event-emitter di `apps/web/src/lib/feedback-toast.ts`) — standar aktif untuk web |
| Browser native dialog web | Sudah dibersihkan (2026-07-05) — lihat tabel perbaikan di bawah |
| Browser native dialog admin | Masih ada di beberapa halaman — lihat daftar tersisa di bawah |

### Perbaikan Native Dialog

**Fase 1 (2026-07-05):**

| Jenis | File | Sebelum | Sesudah |
|-------|------|---------|---------|
| `alert()` web | `QurbanSection.tsx` | `alert(...)` | `feedbackToast.success(...)` |
| `alert()` web | `QurbanSidebar.tsx` | `alert(t(...))` | `feedbackToast.error(t(...))` |
| `alert()` web | `CampaignSidebar.tsx` | `alert(t(...))` | `feedbackToast.error(t(...))` |
| `alert()` web | `qurban/savings/new/page.tsx` | 3× `alert(t(...))` | `feedbackToast.error(t(...))` |
| `confirm()` admin | `mitra/[id]/page.tsx` | `window.confirm(...)` | Inline modal state pattern |
| `prompt()` admin | `mitra/[id]/page.tsx` | `window.prompt(...)` | Inline textarea modal pattern |

**Fase 2 (2026-07-06):**

| Jenis | File | Sebelum | Sesudah |
|-------|------|---------|---------|
| `confirm()` admin | `qurban/discounts/page.tsx` | 2× `confirm()` (nonaktifkan + hapus) | `confirmDialog` state + inline modal |
| `confirm()` admin | `qurban/discounts/[id]/page.tsx` | `confirm()` (nonaktifkan) | `confirmOpen` state + inline modal |

Catatan: `qurban/discounts/` tidak tercatat di audit Fase 1 — ditemukan saat audit ulang 2026-07-06.

### Native Dialog yang Masih Tersisa (Admin)

Diverifikasi langsung dari kode pada 2026-07-06:

| Jenis | Lokasi |
|-------|--------|
| `confirm()` | `qurban/periods/[id]/page.tsx`, `zakat/distributions/[id]/page.tsx`, `donations/page.tsx`, `donations/[id]/edit/page.tsx`, `qurban/savings/pending-deposits/page.tsx`, `ledger/create/page.tsx`, `ledger/[id]/page.tsx` |
| `prompt()` | `ledger/[id]/page.tsx` |

Total tersisa: 7 file admin dengan `confirm()`, 1 file dengan `prompt()`.

Catatan koreksi:

1. Klaim lama tentang `CampaignForm.tsx` memakai `alert()` sudah tidak sesuai audit; `CampaignForm` sekarang memakai `FeedbackDialog`.
2. Seluruh `alert()` di web sudah diganti ke `feedbackToast` (Fase 1, 2026-07-05) — diverifikasi ulang 2026-07-06.
3. `mitra/[id]/page.tsx` sudah bersih (Fase 1).
4. `qurban/discounts/` sudah bersih (Fase 2, 2026-07-06).

Rekomendasi:

1. Native `alert/confirm/prompt` harus dianggap legacy UX.
2. Admin destructive confirmation: gunakan pola inline modal yang sudah ada di `mitra/[id]/page.tsx` sebagai referensi.
3. Web validation/success: standar aktif adalah `feedbackToast` — jangan kembali ke `alert()`.
4. Jangan campur `react-hot-toast` dan `sonner` tanpa keputusan standar.

---

## Inline Style dan Hardcoded Visual

Audit `style={{` menunjukkan inline style masih tersebar.

Kategori yang relatif dapat diterima:

| Kategori | Contoh | Catatan |
|----------|--------|---------|
| Dynamic progress width | `style={{ width: `${progress}%` }}` | Bisa diterima jika lewat component `ProgressBar` lebih baik |
| Chart dimensions/colors | Recharts tooltip/legend/chart wrapper | Sering praktis, tapi perlu wrapper |
| Hidden tracking noscript/input file | `display: none` | Bisa diterima jika memang utilitarian |
| JSON-LD `dangerouslySetInnerHTML` | SEO scripts | Bukan UX styling |

Kategori yang perlu dikurangi:

| Kategori | Contoh area |
|----------|-------------|
| Font size hardcode | checkout, payment detail, program tabs, donation selector |
| Color hardcode | qurban savings buttons, table card background |
| Table align inline | pending deposits |
| Repeated heading size inline | checkout/payment method/gateway pages |
| Width/height fixed image QR | payment result |

Rekomendasi:

1. Font size hardcode dipindah ke Tailwind class atau SCSS utility.
2. Progress bar memakai reusable `ProgressBar`.
3. Chart/table inline style dibungkus komponen kecil jika pola berulang.
4. Hardcoded color harus mengacu token `arsitektur-color.md`.

---

## Responsive dan Mobile Quality

Pola responsif yang sudah ada:

- web card/list banyak memakai Tailwind responsive classes;
- admin punya `_table-mobile.scss`;
- public web punya `_table-mobile.scss`;
- Header web punya mobile menu component;
- Documentation center responsive 1 kolom ke 3 kolom di `xl`;
- Program listing memakai grid dan client-side pagination;
- admin page banyak memakai dashboard container dan SCSS shared.

Gap:

1. Belum ada visual regression atau screenshot QA otomatis.
2. Tidak ada checklist viewport wajib di CI.
3. Banyak page kompleks admin masih berisiko overflow karena table/inline width.
4. Payment/checkout pages punya banyak inline font-size yang rawan inkonsistensi.
5. Blueprint lama menyebut mobile-first, tetapi tidak ada enforcement otomatis.

Viewport minimum yang direkomendasikan untuk QA manual/otomatis:

| Target | Width |
|--------|-------|
| Mobile kecil | 360 |
| Mobile umum | 390 |
| Tablet | 768 |
| Desktop | 1366 |
| Wide | 1440+ |

---

## Accessibility Quality

Implementasi saat ini belum punya audit aksesibilitas formal.

Yang sudah relatif baik:

- banyak button/link memakai elemen semantik;
- beberapa icon link punya `aria-label`;
- form umumnya memakai label visual;
- responsive menu tersedia di Header.

Gap:

1. Tidak ada automated a11y test.
2. Native dialog masih mengganggu UX dan kontrol aksesibilitas.
3. Icon-only actions tidak semuanya dipastikan punya accessible name.
4. Rich HTML content dari CMS/report/documentation perlu heading hierarchy yang konsisten.
5. Focus management modal belum terdokumentasi sebagai contract.

Rekomendasi:

1. Tambah QA a11y dengan Playwright + axe atau minimal checklist manual.
2. Semua icon-only button wajib punya `aria-label`/title yang meaningful.
3. Modal konfirmasi wajib trap focus dan close behavior jelas.
4. Jangan gunakan color saja sebagai indikator status.

---

## Blueprint Lama vs Implementasi Aktual

`apps/admin/docs/00-blueprint-front-end.md` adalah blueprint target lama. Banyak isinya masih berguna sebagai prinsip, tetapi tidak boleh dipakai sebagai source of truth karena banyak route/pola berbeda dari kode aktual.

Contoh mismatch:

| Blueprint Lama | Implementasi Aktual |
|----------------|---------------------|
| `/programs` | Public route utama adalah `/program` |
| `/reports` | Public laporan kegiatan adalah `/laporan`; laporan zakat/qurban punya route sendiri |
| `/cart` | Cart utama adalah `/keranjang-bantuan` |
| `/payment/success/:id` | Flow aktual memakai `/checkout/payment-result` dan invoice/universal payment routes |
| Static `/contact`, `/faq`, `/terms`, `/privacy` | Banyak legacy href dinormalisasi ke `/documentation` atau CMS page |
| Donation flow multi-step ideal | Implementasi aktual terpecah ke cart/checkout/payment-method/payment-detail/gateway |
| Admin pages hanya `/dashboard/*` | Benar secara umum, tetapi detail route sangat luas |
| Component checklist target | Sebagian ada, sebagian tidak bernama sama |

Keputusan arsitektur:

1. Prinsip mobile-first, consistency, accessibility, performance tetap dipertahankan sebagai arah quality.
2. Route dan component contract harus mengikuti implementasi aktual, bukan blueprint lama.
3. Roadmap lama tidak menjadi backlog resmi kecuali dipindahkan ke gap/rekomendasi arsitektur baru.

---

## Payment Gateway UX Bukan Scope Dokumen Ini

`dokumentasi-ipaymu.md` tidak diserap di sini karena topiknya payment gateway spesifik dan sebagian isinya terlihat mengacu arsitektur Laravel lama (`app/Services/IPaymuService.php`, Blade views, Laravel routes), bukan implementasi monorepo Next/Hono saat ini. File tersebut sudah dikoreksi dan digantikan oleh `docs/arsitektur-payment-gateway-ipaymu.md`.

Keputusan:

1. iPaymu punya dokumen arsitektur payment gateway spesifik sendiri.
2. Flip, Xendit, dan Midtrans sudah punya dokumen spesifik sendiri di `docs/arsitektur-payment-gateway-flip.md`, `docs/arsitektur-payment-gateway-xendit.md`, dan `docs/arsitektur-payment-gateway-midtrans.md`.
3. Dokumen umum payment hanya `arsitektur-universal-payment.md`.
4. UX payment hanya dicatat di sini sebagai kualitas frontend umum, bukan sebagai source of truth gateway.

Rekomendasi nama dokumen lanjutan:

- `docs/arsitektur-payment-gateway-flip.md`
- `docs/arsitektur-payment-gateway-midtrans.md`

---

## Gap Implementasi yang Tercatat

| Gap | Dampak | Rekomendasi |
|-----|--------|-------------|
| Native `alert/confirm/prompt` masih ada | UX tidak konsisten, sulit dikontrol, buruk untuk flow kritikal | Ganti dengan toast/dialog/modal standar |
| `react-hot-toast`, `sonner`, `FeedbackDialog` berjalan paralel | Standar feedback tidak jelas | Tetapkan matriks: toast untuk transient, dialog untuk blocking/critical |
| Inline style untuk font size/color masih banyak | Inkonsistensi visual dan sulit theming | Pindahkan ke token/class/component |
| Public/admin memakai Next/React major berbeda | QA/build behavior berbeda | Dokumentasikan dan test masing-masing app |
| Blueprint lama punya route yang tidak sesuai | Risiko developer mengikuti route salah | Hapus blueprint lama setelah dokumen ini menjadi source of truth |
| Tidak ada visual regression | UI regressions sulit terdeteksi | Tambah screenshot QA untuk halaman utama |
| Tidak ada a11y automated check | Risiko aksesibilitas lolos | Tambah checklist/axe untuk komponen kritikal |
| Payment gateway docs perlu dijaga tetap spesifik | Payment UX/gateway mudah tercampur | Rujuk arsitektur iPaymu/Flip terpisah |
| Root planning frontend lama sudah usang | Developer bisa mengikuti route/stack/gateway yang salah | `00-frontend-developement.md` dihapus setelah diserap dan dikoreksi di dokumen arsitektur |
| Root hardcode audit lama sudah usang | Line number/claim bisa menyesatkan karena kode sudah berubah | `hardcode-front-end.md`, `hardcode-audit-frontend.md`, dan `hardcode-status-checklist.md` dihapus setelah gap valid dikompresi ke arsitektur |

---

## Rekomendasi Arsitektur

1. **Tetapkan feedback standard.** Admin: `FeedbackDialog` untuk blocking/modal dan toast untuk sukses ringan. Web: toast/dialog non-blocking untuk validasi/sukses; hindari native dialog.
2. **Buat komponen wrapper untuk pola visual berulang.** Progress, QR image, chart card, table action confirmation.
3. **Kurangi inline style bertahap.** Prioritaskan font-size/color hardcode sebelum dynamic width chart/progress.
4. **Jadikan `arsitektur-komponen-web.md` dan `arsitektur-komponen-admin.md` sebagai contract komponen**, sedangkan dokumen ini menjadi quality policy lintas frontend.
5. **Pisahkan payment gateway UX per gateway.** Jangan gabungkan iPaymu/Flip ke dokumen UX umum.
6. **Tambahkan visual QA minimum.** Homepage, program detail, checkout, payment detail, qurban savings, admin dashboard, admin form heavy.
7. **Audit route legacy dari blueprint.** Jangan gunakan `/programs`, `/reports`, `/cart`, `/payment/*` lama tanpa mapping eksplisit.
8. **Tambahkan a11y checklist pada PR UI.** Fokus modal, form validation, icon-only button, heading order, contrast.

---

## Contract yang Harus Dijaga

1. Implementasi aktual selalu lebih kuat daripada blueprint lama.
2. Native browser dialog tidak boleh ditambah untuk fitur baru.
3. Styling baru harus memakai token/class/component kecuali ada alasan teknis jelas.
4. Payment gateway spesifik harus terdokumentasi di file gateway sendiri.
5. Public web dan admin harus diuji terpisah karena major Next/React berbeda.
6. Dokumentasi frontend lama tidak boleh menjadi source of truth setelah dokumen ini ada.
