# Arsitektur Kontak

Dokumen ini adalah source of truth untuk sistem kontak Bantuanku: normalisasi email/telepon/WhatsApp/website, helper frontend/backend, `ContactForm`, dan pemakaian field kontak di domain utama.

Dokumen ini menyerap dan mengoreksi root `00-helper-kontak.md`. Helper lama benar tentang arah standardisasi kontak, tetapi status implementasi dan checklist entity sudah tidak akurat terhadap kode saat ini.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Frontend helper | `apps/admin/src/lib/contact-helpers.ts` |
| Backend helper | `apps/api/src/lib/contact-helpers.ts` |
| Admin contact form | `apps/admin/src/components/forms/ContactForm.tsx` |
| Organization contact settings | `apps/admin/src/app/dashboard/settings/general/page.tsx`, `apps/api/src/routes/admin/settings.ts` |
| Public settings consumer | `apps/web/src/services/settings.ts`, `apps/web/src/components/organisms/Footer/Footer.tsx`, `apps/web/src/components/UniversalInvoice.tsx` |
| WhatsApp template variables | `apps/api/src/services/whatsapp.ts` |
| Entity schemas | `donatur`, `users`, `employees`, `vendors`, `mustahiqs`, `mitra` |
| Domain API | Admin/public donatur, employees, vendors, mustahiqs, mitra, auth/profile |

## Format Standar

Format kontak yang dipakai helper:

| Field | Format Simpan | Catatan |
|-------|---------------|---------|
| `email` | lowercase, trim | `normalizeEmail()` |
| `phone` | lokal Indonesia `08...` | `normalizePhone()` menghapus spasi/dash dan mengubah `+62`/`62` menjadi `0` |
| `whatsappNumber` | lokal Indonesia `08...` | Field TypeScript memakai camelCase; kolom DB memakai `whatsapp_number` |
| `website` | URL dengan protocol | `normalizeWebsite()` menambahkan `https://` jika belum ada |

Untuk provider WhatsApp, nomor lokal dikonversi lagi menjadi format provider seperti `628...` atau JID `628...@s.whatsapp.net`. Detail pengiriman ada di `arsitektur-notifikasi.md`.

## Helper Kontak

### Frontend Helper

`apps/admin/src/lib/contact-helpers.ts` menyediakan:

| Function | Fungsi |
|----------|--------|
| `normalizePhone()` | Standarkan nomor ke `08...` |
| `toWhatsAppFormat()` | Ubah ke `628...` |
| `toInternationalFormat()` | Ubah ke `+628...` |
| `formatPhoneDisplay()` | Format tampilan dengan spasi |
| `normalizeEmail()` | Lowercase + trim |
| `normalizeWebsite()` | Tambah protocol jika perlu |
| `isValidEmail()` | Regex email sederhana |
| `isValidPhone()` | Validasi `0` + 9-12 digit |
| `isValidWebsite()` | Validasi via `new URL()` setelah normalisasi |
| `normalizeContactData()` | Normalisasi batch `{ email, phone, whatsappNumber, website }` |

### Backend Helper

`apps/api/src/lib/contact-helpers.ts` menyediakan normalisasi dasar:

| Function | Fungsi |
|----------|--------|
| `normalizePhone()` | Standarkan nomor ke `08...` |
| `normalizeEmail()` | Lowercase + trim |
| `normalizeWebsite()` | Tambah protocol jika perlu |
| `normalizeContactData()` | Normalisasi batch object |

Backend helper juga masih menormalisasi field legacy `whatsapp` jika ada, tetapi field modern yang harus dipakai adalah `whatsappNumber`.

## ContactForm Admin

`ContactForm` adalah komponen reusable Admin Web untuk:

| Field | Input | Catatan |
|-------|-------|---------|
| `email` | `type=email` | Label required jika prop `required=true` |
| `phone` | `type=tel` | Validasi on blur |
| `whatsappNumber` | `type=tel` | Bisa disamakan dengan phone via checkbox |
| `website` | `type=url` | Validasi on blur |

Perilaku penting:

- `ContactForm` menyimpan input lokal dan memanggil `onChange()` dengan nilai mentah user.
- Normalisasi final biasanya dilakukan di page/modal sebelum submit memakai `normalizeContactData()`.
- Validasi frontend hanya menampilkan error lokal; enforcement final tetap harus ada di API.
- Prop `required=true` saat ini terutama memberi required pada email, bukan memastikan phone/WhatsApp wajib.

Pemakai `ContactForm` yang ditemukan:

| Area | Source |
|------|--------|
| Donatur modal | `apps/admin/src/components/modals/DonorModal.tsx` |
| Employee modal | `apps/admin/src/components/modals/EmployeeModal.tsx` |
| Vendor modal | `apps/admin/src/components/modals/VendorModal.tsx` |
| Mustahiq modal | `apps/admin/src/components/modals/MustahiqModal.tsx` |
| Mitra create/edit | `apps/admin/src/app/dashboard/mitra/create/page.tsx`, `apps/admin/src/app/dashboard/mitra/[id]/edit/page.tsx` |
| Organization settings | `apps/admin/src/app/dashboard/settings/general/page.tsx` |

Admin profile memakai `normalizeContactData()`, tetapi tidak memakai `ContactForm`; field kontak ditulis manual di page profile.

## Entity dan Kolom Kontak

| Entity | Kolom Kontak | Catatan |
|--------|--------------|---------|
| `donatur` | `email`, `phone`, `whatsappNumber`, `website` | Admin modal + public donatur route memakai helper |
| `users` | `email`, `phone`, `whatsappNumber` | Auth/profile punya normalizer sendiri di beberapa handler |
| `employees` | `email`, `phone`, `whatsappNumber`, `website` | Admin employee route memakai helper |
| `vendors` | `contactPerson`, `email`, `phone`, `whatsappNumber`, `website` | Admin vendor route memakai helper |
| `mustahiqs` | `email`, `phone`, `whatsappNumber`, `website` | Admin mustahiq route memakai helper |
| `mitra` | `email`, `phone`, `whatsappNumber`, `website` | Public/admin mitra route memakai helper |

Root `00-helper-kontak.md` menyebut hanya donatur yang sudah implement dan entity lain belum. Itu tidak sesuai lagi; implementasi kontak sudah tersebar ke banyak entity.

## Organization Contact Settings

Kontak organisasi tidak disimpan di tabel domain khusus. Source of truth-nya adalah tabel `settings`:

| Key | Category | Public | Pemakai |
|-----|----------|--------|---------|
| `organization_phone` | `organization` | true | Footer, invoice, WhatsApp variable |
| `organization_whatsapp` | `organization` | true | Footer, halaman zakat/qurban, WhatsApp variable |
| `organization_email` | `organization` | true | Footer, invoice, SEO/contact point |
| `organization_website` | `organization` | true | Frontend URL fallback, WhatsApp variable, payment redirect fallback |

Admin General Settings memakai `ContactForm` dan menyimpan nilai lewat `/admin/settings/batch`.

Consumer penting:

| Consumer | Field |
|----------|-------|
| Web Footer | `organization_phone`, `organization_whatsapp`, `organization_email`, address settings |
| Universal Invoice | `organization_email`, `organization_phone`, address settings |
| WhatsApp global variables | `store_phone`, `store_whatsapp`, `store_email`, `store_website` |
| SEO Organization JSON-LD | `organization_email`, `organization_phone`, `organization_address` |

## Hubungan Dengan Dokumen Lain

| Dokumen | Hubungan |
|---------|----------|
| `arsitektur-settings.md` | Organization contact disimpan sebagai settings public |
| `arsitektur-notifikasi.md` | WhatsApp provider/template memakai nomor dan variable kontak |
| `arsitektur-donatur-modal.md` | Detail pemakaian `ContactForm` di `DonorModal` |
| `arsitektur-karyawan.md`, `arsitektur-vendor.md`, `arsitektur-mustahiq.md`, `arsitektur-mitra.md` | Field kontak per entity |
| `arsitektur-universal-payment.md` | Invoice membaca kontak organisasi dari settings |
| `arsitektur-seo.md` | Organization contact untuk structured data |

## Gap dan Rekomendasi

1. **Normalizer tersebar.** `auth.ts`, `transaction.ts`, `account.ts`, dan WhatsApp service masih punya normalisasi phone sendiri. Satukan ke helper shared atau minimal samakan behavior.
2. **Frontend dan backend helper tidak identik.** Frontend punya formatter/validator/WhatsApp converter; backend hanya normalisasi dasar.
3. **Validasi required belum seragam.** `ContactForm required=true` terutama mewajibkan email, sementara beberapa API mewajibkan phone/WhatsApp minimal 10.
4. **Tidak ada package shared.** Helper ada di Admin dan API secara terpisah; Web public punya pola sendiri untuk nomor WhatsApp/link.
5. **Legacy field `whatsapp` masih ditoleransi backend helper.** Ini bagus untuk kompatibilitas, tetapi field baru harus tetap `whatsappNumber`.
6. **Website normalization bisa menerima domain yang valid secara URL tetapi belum tentu domain operasional.** Jika dipakai untuk payment redirect atau SEO, perlu validasi lebih ketat.
7. **PII kontak muncul di banyak export/log.** Risiko masking/export dicatat juga di `arsitektur-security.md`, `arsitektur-export-import.md`, dan `arsitektur-observability-logging.md`.

## Keputusan Arsitektur Saat Ini

- Format simpan nomor telepon/WhatsApp internal adalah lokal `08...`.
- Format `628...` hanya format integrasi eksternal, terutama WhatsApp.
- Field TypeScript modern adalah `whatsappNumber`; kolom DB adalah `whatsapp_number`.
- `ContactForm` adalah komponen Admin Web, bukan komponen public web.
- Organization contact adalah settings public, bukan entity table.
- Root helper kontak lama tidak lagi menjadi referensi aktif.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `00-helper-kontak.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
