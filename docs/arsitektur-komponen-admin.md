# Arsitektur Komponen Admin

Dokumen ini adalah source of truth untuk arsitektur UI Admin Web: layout dashboard, sidebar, modal, feedback, form, table, pagination, dan komponen UI dasar.

Dokumen ini menyerap dan mengoreksi `docs/SOP-notifikasi.md`. SOP lama berisi standar target untuk mengganti native alert, tetapi implementasi aktual admin belum sepenuhnya bersih dari `confirm()`/`prompt()`.

Detail domain form Pages CMS (`PageForm`, `RichTextEditor`, `MediaLibrary`, dan `SEOPanel`) dirujuk ke `docs/arsitektur-pages-cms.md`.
Kebijakan kualitas UX lintas frontend seperti `FeedbackDialog`, native `confirm/prompt`, inline style, responsive QA, dan gap blueprint lama dicatat di `docs/arsitektur-frontend-ux-quality.md`.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Root layout dan provider | `apps/admin/src/app/layout.tsx`, `apps/admin/src/app/providers.tsx` |
| Auth state dan API client | `apps/admin/src/lib/auth.ts`, `apps/admin/src/lib/api.ts` |
| Dashboard shell | `apps/admin/src/app/dashboard/layout.tsx`, `apps/admin/src/components/Sidebar.tsx` |
| Settings shell | `apps/admin/src/components/SettingsLayout.tsx` |
| Modal legacy/domain | `apps/admin/src/components/Modal.tsx`, `apps/admin/src/components/modals/*` |
| Feedback dialog/toast | `apps/admin/src/components/FeedbackDialog.tsx`, `react-hot-toast`, `sonner` |
| Forms/contact/address/bank | `apps/admin/src/components/forms/*`, domain modal forms |
| Table/pagination | `apps/admin/src/styles/components/_table.scss`, `apps/admin/src/components/Pagination.tsx` |
| UI primitives | `apps/admin/src/components/ui/*` |
| Styling system | `apps/admin/src/styles/main.scss`, `apps/admin/src/styles/utils/_variables.scss` |

## Root Provider

Admin Web memakai Next.js App Router.

```text
apps/admin/src/app/layout.tsx
  -> Providers
    -> QueryClientProvider
    -> children
    -> Toaster position="top-right"
```

Provider global:

| Provider | Fungsi |
|----------|--------|
| `QueryClientProvider` | Cache dan query/mutation TanStack Query |
| `Toaster` dari `react-hot-toast` | Host toast global posisi kanan atas |

Auth state tidak dipasang sebagai React provider. Admin memakai Zustand store `useAuth` dengan persist storage `auth-storage`, plus `localStorage.token` dan `localStorage.user`.

API client memakai Axios instance `apps/admin/src/lib/api.ts`:

| Perilaku | Implementasi |
|----------|--------------|
| Base URL | `NEXT_PUBLIC_API_URL`, fallback `http://localhost:50245/v1` |
| Auth header | Interceptor membaca `localStorage.token` dan mengisi `Authorization: Bearer ...` |
| FormData | `Content-Type` dihapus agar browser set boundary |
| 401 | Hapus token/user/auth-storage dan redirect ke `/login` jika bukan halaman login |

## Dashboard Shell

Dashboard shell berada di `apps/admin/src/app/dashboard/layout.tsx`.

Alur:

```text
DashboardLayout
  -> cek mounted untuk hindari hydration mismatch
  -> jika tidak ada user, redirect /login
  -> desktop Sidebar
  -> mobile Sidebar + overlay
  -> main scroll container bg-gray-50
```

Sidebar:

| Area | Implementasi |
|------|--------------|
| Menu source | Array `allMenuItems` di `Sidebar.tsx` |
| Role filtering | `roles` per menu/submenu, dicek terhadap `user.roles` |
| Active state | Match pathname dan query string untuk menu dengan `?view=...` |
| Submenu | Expanded state lokal `expandedMenus` |
| Mitra special-case | User hanya role `mitra` tidak fetch organization settings |
| Branding | Ambil `organization_name` dan `organization_logo` dari `/admin/settings` jika boleh |
| Icons | Mayoritas `lucide-react` |

Settings area punya shell sendiri `SettingsLayout` dengan menu role-based untuk General, Amil, Payments, Users, Front-end, SEO, WhatsApp, Google Maps, Integration, dan Developer.

## Styling System

Admin memakai campuran Tailwind dan SCSS.

`apps/admin/src/styles/main.scss` memuat:

```text
Tailwind base/components/utilities
  -> utils variables/mixins
  -> base reset/typography
  -> components buttons/cards/forms/autocomplete/rich-text/media/filter/pagination/table/modal/feedback-dialog
  -> layouts sidebar/dashboard
  -> pages login/form/settings/dashboard-home/print
```

Design token utama ada di `styles/utils/_variables.scss`:

| Token | Catatan |
|-------|---------|
| Primary | Hijau Darunnajah `#035a52` |
| Secondary/accent/warning | Emas `#d2aa55` |
| Danger | Merah `#8f132f` |
| Info | Biru `#296585` |
| Radius | `sm=4px`, `md=8px`, `lg=12px`, `xl=16px`, `full=9999px` |
| Spacing | `xs=4px` sampai `2xl=48px` |
| Z-index | dropdown, sticky, fixed, modal, popover, tooltip |

Catatan arsitektur: warna SCSS utama dan beberapa primitive `components/ui/*` belum sepenuhnya selaras. Contoh: `ui/button.tsx` masih memakai `bg-blue-600`, sedangkan SCSS legacy memakai primary hijau. Ini perlu konsolidasi.

## Komponen UI Primitives

Folder `apps/admin/src/components/ui/*` berisi primitive ringan:

| Komponen | Catatan |
|----------|---------|
| `button.tsx` | Variant `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; size `default`, `sm`, `lg`, `icon` |
| `input.tsx` | Native input dengan Tailwind ring/focus |
| `textarea.tsx` | Native textarea |
| `select.tsx` | Punya dua pola: native select dan shadcn-style select custom |
| `dialog.tsx` | Dialog sederhana tanpa portal, backdrop click close |
| `switch.tsx` | Toggle/switch |
| `badge.tsx` | Badge/status |
| `card.tsx` | Card primitives |
| `skeleton.tsx` | Loading placeholder |
| `autocomplete.tsx` | Autocomplete primitive |

Primitive ini tidak menjadi satu-satunya sistem UI. Banyak halaman masih memakai class SCSS seperti `.btn`, `.form-input`, `.table`, `.dashboard-container`, dan domain modal sendiri.

## Modal dan Dialog

Ada tiga pola modal/dialog aktif:

| Pola | Source | Kegunaan |
|------|--------|----------|
| `Modal.tsx` legacy | `apps/admin/src/components/Modal.tsx` | Modal generik berbasis class `.modal-*`, lock body scroll, size `sm/md/lg/xl` |
| Domain modal | `apps/admin/src/components/modals/*` | Donor, employee, vendor, mustahiq, expense account, bank account |
| `ui/dialog.tsx` | `apps/admin/src/components/ui/dialog.tsx` | Dialog Tailwind sederhana untuk fitur yang memakai primitive UI |

`FeedbackDialog` adalah dialog status, bukan confirmation dialog. Ia dipakai luas di halaman/settings/domain form untuk hasil success/error yang membutuhkan acknowledgment dengan tombol OK.

Gap: tidak ada komponen confirmation dialog standar. Karena itu beberapa halaman masih memakai native `confirm()` dan `prompt()`.

## Feedback dan Notifikasi Admin

Sistem feedback aktual:

| Mekanisme | Status | Kegunaan Aktual |
|-----------|--------|-----------------|
| `react-hot-toast` | Aktif global via `Toaster` | Feedback non-blocking di banyak halaman dashboard |
| `FeedbackDialog` | Aktif | Feedback success/error yang lebih modal/acknowledged |
| `sonner` | Terpasang dan dipakai di halaman auth | Login dan forgot password memakai `toast` dari `sonner` |
| Native `confirm/prompt` | Masih ada | Konfirmasi destructive/approval dan alasan penolakan |

Standar target yang menggantikan `docs/SOP-notifikasi.md`:

1. Gunakan `react-hot-toast` untuk feedback ringan, validasi field, sukses aksi, dan error API.
2. Gunakan `FeedbackDialog` hanya jika user perlu membaca hasil penting sebelum lanjut atau ada callback lanjutan setelah OK.
3. Jangan tambah pemakaian baru `window.alert`, `alert`, `window.confirm`, `confirm`, `window.prompt`, atau `prompt`.
4. Untuk konfirmasi destructive atau approval, buat/ gunakan confirmation dialog internal, bukan native browser dialog.
5. Untuk prompt alasan penolakan, gunakan modal/form field internal agar validasi dan styling konsisten.
6. Toast error harus memakai pesan API jika ada, fallback pesan lokal yang spesifik.
7. Flow berantai cukup menampilkan satu feedback akhir agar tidak spam.

Native dialog yang masih ditemukan di admin non-backup:

| Native API | Lokasi |
|------------|--------|
| `confirm()` | `dashboard/ledger/create`, `dashboard/donations`, `dashboard/donations/[id]/edit`, `dashboard/ledger/[id]`, `dashboard/qurban/savings/pending-deposits`, `dashboard/qurban/periods/[id]`, `dashboard/zakat/distributions/[id]`, `dashboard/mitra/[id]` |
| `prompt()` | `dashboard/ledger/[id]`, `dashboard/mitra/[id]` |

## Forms

Form admin memakai campuran:

| Pola | Source |
|------|--------|
| SCSS form classes | `.form-section`, `.form-group`, `.form-label`, `.form-input`, `.form-textarea`, `.form-select` |
| Domain form components | `AddressForm`, `ContactForm`, `BankAccountForm` |
| Domain page forms | `CampaignForm`, `QurbanPackageForm`, `ZakatTypeForm`, `PageForm`, `SEOPanel` |
| UI primitives | `ui/input`, `ui/select`, `ui/textarea`, `ui/switch`, `ui/label` |

Konvensi yang sudah terlihat:

- Required label memakai `.form-label-required`.
- Error field memakai `.form-error` atau toast/dialog di level aksi.
- Disabled input dibuat abu-abu dan cursor not-allowed.
- Contact/address/bank account punya komponen reusable karena dipakai lintas entitas.

Rekomendasi: validasi domain sebaiknya dikumpulkan di layer form/domain component, bukan tersebar di handler page. Untuk field shared seperti kontak, alamat, dan rekening, pakai komponen reusable yang sudah ada.

### Helper Form Reusable

Root `00-helper-SOP.md` adalah SOP lama untuk membuat helper component. Substansi yang masih benar sudah dikoreksi di bagian ini; root SOP tidak boleh dipakai lagi sebagai source of truth.

Helper form reusable dibuat bila field set dan logic yang sama dipakai lintas beberapa entity, bukan untuk setiap field sederhana. Implementasi aktif yang memenuhi pola ini:

| Helper | Source | Dokumentasi Domain |
|--------|--------|--------------------|
| `ContactForm` | `apps/admin/src/components/forms/ContactForm.tsx` | `docs/arsitektur-kontak.md` |
| `AddressForm` | `apps/admin/src/components/forms/AddressForm.tsx` | `docs/arsitektur-alamat.md` |
| `BankAccountForm` | `apps/admin/src/components/forms/BankAccountForm.tsx` | `docs/arsitektur-disbursement.md` |
| `MediaLibrary` | `apps/admin/src/components/MediaLibrary.tsx` | `docs/arsitektur-media.md` |

Kriteria membuat helper baru:

1. Field set dipakai oleh minimal tiga context/entity, atau punya logic kompleks yang harus konsisten.
2. Ada data contract yang jelas melalui exported TypeScript interface.
3. Ada prop standar untuk `value`, `onChange`, `disabled`, dan `required` jika komponen berupa form.
4. Jika komponen bisa berdiri sendiri atau masuk ke section parent, sediakan `showTitle` dengan default `true`.
5. Normalisasi/validasi yang sama harus tersedia di helper frontend, helper API, atau domain service yang relevan.
6. Payload submit tetap harus explicit untuk field penting; jangan mengandalkan spread jika bisa menghapus atau menimpa field required.

Pola wrapper yang sesuai implementasi sekarang:

- `ContactForm` dan `AddressForm` memakai `.form-section` dan `showTitle`.
- Di modal domain seperti donor/employee/vendor/mustahiq, title utama biasanya disediakan parent section sehingga helper dipanggil dengan `showTitle={false}`.
- Di page/settings standalone, `showTitle` boleh default `true`.
- `BankAccountForm` tidak memakai `showTitle`; parent modal/page yang memberi heading section.
- `MediaLibrary` bukan helper form field biasa, tetapi picker modal reusable untuk media.

Pola data flow yang benar:

1. Parent menyimpan state domain utama dan state helper secara terpisah jika helper punya shape kompleks.
2. Helper mengirim perubahan melalui `onChange`.
3. Parent menormalisasi sebelum submit bila helper menyediakan normalizer, misalnya `normalizeContactData()`.
4. API tetap melakukan normalisasi/validasi ulang; validasi frontend hanya membantu UX.
5. Field derived seperti `postalCode` dari `AddressForm` boleh muncul di payload UI, tetapi tidak otomatis berarti disimpan di tabel domain.

Koreksi terhadap SOP lama:

1. Dokumentasi helper baru tidak boleh dibuat sebagai `00-helper-[name].md`; dokumentasi resmi harus masuk `docs/arsitektur-*.md` yang sesuai domain.
2. Klaim jumlah village dan kode alamat lama tidak boleh dipakai; detail resmi ada di `arsitektur-alamat.md`.
3. `npx tsc --noEmit` bukan quality gate root yang resmi di repo. Quality gate aktual dicatat di `docs/arsitektur-testing-qa.md`.
4. Migration baru harus mengikuti `docs/arsitektur-database.md` dan production manifest bila relevan, bukan template root SOP lama.
5. Jangan menambahkan helper hanya karena ada dua pemakaian kecil; biaya abstraksi harus lebih rendah dari duplikasi.

## Tables dan Pagination

Table SCSS utama:

| Class | Fungsi |
|-------|--------|
| `.table-container` | Wrapper putih, border, shadow, overflow-x desktop; mobile dibuat transparan |
| `.table` | Table dengan min-width 1000px, header abu, row hover |
| `.table-report` | Variant report tanpa min-width lebar |
| `.table-compact` | Padding lebih kecil |
| `.table-actions .action-btn` | Action icon button |
| `.mono` | Angka/nomor dengan font monospace/tabular |

Ada `table-mobile.scss` untuk pola mobile card/list. Pagination memakai komponen `Pagination.tsx` dengan maksimal 5 page number, ellipsis, previous/next, dan hide jika `totalPages <= 1`.

Catatan: label `Pagination` saat ini hardcoded `Total transaksi`, sehingga kurang universal untuk halaman non-transaksi. Jika dipakai lintas domain, label total harus menjadi prop.

## Autocomplete

Ada dua autocomplete:

| Komponen | Catatan |
|----------|---------|
| `components/Autocomplete.tsx` | Legacy SCSS, option `{ value, label }`, search client-side, clear, loading, click outside |
| `components/ui/autocomplete.tsx` | Primitive Tailwind untuk pola baru |

Rekomendasi: pilih satu sebagai standar per generasi UI. Untuk form domain lama, tetap gunakan legacy jika sudah terintegrasi; untuk halaman baru, lebih baik pakai primitive yang disepakati setelah konsolidasi design token.

## Icons

Admin memakai dua icon library:

| Library | Pemakaian |
|---------|-----------|
| `lucide-react` | Sidebar dan beberapa dashboard/action modern |
| `@heroicons/react` | Modal close, FeedbackDialog, SettingsLayout, Pagination, beberapa form/page lama |

Rekomendasi: untuk fitur baru, gunakan `lucide-react` kecuali komponen existing di area tersebut sudah konsisten memakai Heroicons.

## Gap dan Rekomendasi

1. **Konsolidasikan sistem feedback.** Pilih standar: `react-hot-toast` untuk toast global, `FeedbackDialog` untuk modal result, dan buat `ConfirmDialog` untuk destructive/approval.
2. **Migrasikan native `confirm/prompt`.** Ada 13 pemakaian di admin non-backup. Ini melanggar standar target dan perlu migrasi bertahap.
3. **Evaluasi `sonner`.** Auth memakai `sonner`, tetapi root provider hanya memasang `react-hot-toast` Toaster. Jika tidak ada Sonner provider lain, pindahkan auth ke `react-hot-toast` atau pasang provider yang benar.
4. **Samakan design token primitive `ui/*`.** Beberapa primitive memakai warna biru default, tidak selaras dengan primary hijau admin.
5. **Buat abstraction untuk destructive action.** Pattern delete/approve/reject tersebar; idealnya ada `ConfirmDialog` + helper untuk error API.
6. **Jadikan pagination lebih generic.** Label total perlu prop agar tidak selalu “Total transaksi”.
7. **Kurangi duplikasi modal.** `Modal.tsx`, `ui/dialog.tsx`, dan domain modal bisa tetap coexist, tetapi fitur baru harus punya pilihan standar yang eksplisit.
8. **Dokumentasikan migration path.** Halaman lama boleh tetap memakai SCSS legacy, halaman baru sebaiknya memakai primitive standar setelah token diselaraskan.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `docs/SOP-notifikasi.md` | Diserap ke bagian feedback/notifikasi admin, dikoreksi terhadap implementasi aktual, lalu boleh dihapus |
| `00-helper-SOP.md` | Diserap ke bagian form/helper reusable, dikoreksi terhadap implementasi aktual, lalu boleh dihapus |
