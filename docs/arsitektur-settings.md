# Arsitektur Settings

## Ringkasan

Settings adalah subsistem key-value untuk konfigurasi aplikasi. Implementasi aktual tidak memakai tabel khusus per halaman atau per fitur, melainkan satu tabel `settings` dengan `key` unik, `value` string, `type`, `category`, metadata tampilan, dan flag `isPublic`.

Dokumen ini menggantikan `CONFIGURATION.md`.

## Implementasi Terkait

| Area | File |
|------|------|
| Schema | `packages/db/src/schema/setting.ts` |
| Admin API | `apps/api/src/routes/admin/settings.ts` |
| Public API | `apps/api/src/routes/settings-public.ts` |
| Admin UI | `apps/admin/src/app/dashboard/settings/**` |
| Web service | `apps/web/src/services/settings.ts` |

## Model Data

Tabel utama: `settings`.

| Kolom | Catatan |
|-------|---------|
| `key` | Unik, menjadi identifier utama setting. |
| `value` | Selalu disimpan sebagai string. Parsing dilakukan berdasarkan `type`. |
| `type` | `string`, `number`, `boolean`, atau `json`. |
| `label`, `description` | Metadata admin. |
| `category` | Pengelompokan UI dan guard developer-only. |
| `sortOrder` | Urutan tampilan. |
| `isPublic` | Jika `true`, setting dapat dibaca publik. |
| `updatedBy`, `updatedAt` | Audit update terakhir. |

Nilai sensitif dengan key mengandung `_api_key`, `_secret`, atau `_access_token` dienkripsi saat batch update dan didekripsi saat dibaca admin.
Gap security penyimpanan secret, masking, enkripsi settings, dan pola update yang belum konsisten dicatat di `arsitektur-security.md`.

## Endpoint Admin

Base path: `/admin/settings`.

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| `GET` | `/` | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator`, `employee` | Ambil semua settings, dikelompokkan berdasarkan `category`. |
| `GET` | `/:key` | `super_admin`, `admin_finance` | Ambil satu setting. |
| `POST` | `/` | `super_admin`, `admin_finance` | Buat setting baru. |
| `PATCH` | `/:key` | `super_admin`, `admin_finance` | Update hanya `value`. |
| `PUT` | `/batch` | `super_admin`, `admin_finance` | Upsert banyak setting sekaligus. |
| `DELETE` | `/:key` | `super_admin`, `admin_finance` | Hapus setting. |
| `POST` | `/google-maps/reset-cache` | `super_admin`, `admin_finance` | Reset cache testimoni Google Maps. |
| `POST` | `/auto-update-gold-price` | `super_admin`, `admin_finance` | Scrape harga emas Pluang dan update setting zakat emas. |
| `POST` | `/auto-update-silver-price` | `super_admin`, `admin_finance` | Scrape harga perak dan update setting zakat perak. |
| `GET` | `/public/bank-accounts` | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator` | Ambil rekening publik dari settings/bank account. |
| `GET` | `/developer/rekening` | `super_admin`, `admin_finance` | Ambil rekening developer. |
| `PUT` | `/developer/rekening` | `super_admin` + developer | Simpan rekening developer. |
| `GET` | `/developer/pendapatan` | `super_admin` + developer | Ringkasan pendapatan developer per periode 20-ke-20. |

Kategori `cdn` dan key berawalan `whatsapp_bot_` diperlakukan sebagai developer-only. User non-developer tidak boleh melihat atau mengubahnya lewat API admin.

Detail kontrak harga emas `zakat_gold_price`, scraper Pluang, cron script, dan risiko side effect UI dicatat di `arsitektur-zakat.md`.

Detail kontak organisasi (`organization_phone`, `organization_whatsapp`, `organization_email`, `organization_website`) dan normalisasi email/telepon/website dicatat di `arsitektur-kontak.md`.

## Endpoint Publik

Base path: `/settings`.

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/` | Ambil setting `isPublic = true` dan semua setting kategori `seo_pages`. |
| `GET` | `/bank-accounts` | Ambil rekening aktif dari tabel `bank_accounts`. |

Public settings diparsing menjadi `number` atau `boolean` bila `type` sesuai. Selain itu tetap string. Endpoint publik juga resolve nama wilayah organisasi dari kode provinsi/kabupaten/kecamatan/desa.

## Pola Penggunaan UI

Halaman admin settings menyimpan konfigurasi melalui `/admin/settings/batch`. Beberapa halaman menyimpan struktur kompleks sebagai JSON string, misalnya:

- frontend/menu/hero/service categories,
- payment bank accounts dan QRIS,
- SEO page settings,
- integrasi pihak ketiga,
- WhatsApp settings,
- Google Maps settings.

Konsekuensinya, kontrak detail setiap setting berada di UI dan service pemakai, bukan dipaksa oleh schema database.

## Catatan Kritis

1. `settings.value` adalah string. Jangan dokumentasikan seolah value tersimpan sebagai native JSON/boolean/number di DB.
2. Payment method publik tidak bersumber dari tabel master `payment_methods` saja; beberapa konfigurasi pembayaran aktif dibaca dari settings.
3. Developer-only setting disaring berdasarkan `category` dan prefix key, bukan RBAC table khusus.
4. Public API hanya mengembalikan setting yang `isPublic` atau kategori `seo_pages`, bukan seluruh konfigurasi.
