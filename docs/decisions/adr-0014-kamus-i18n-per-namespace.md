# ADR-0014: Kamus i18n dipecah per namespace dan dimuat per rute

**Status:** Accepted
**Tanggal:** 2026-10-25

## Context
`I18nProvider` (klien) membundel seluruh `locales/id.ts` (±68 kB mentah, ±16 kB gzip) di setiap halaman sebagai kamus default + fallback.
Beranda hanya memakai sebagian kecil. Ukuran per namespace (karakter, `id.ts`):

| Namespace | Ukuran | Dipakai di |
|-----------|--------|------------|
| checkout | 13,7k | `/checkout/**` |
| account | 13,3k | `/account/**` |
| zakatCalculator | 7,9k | `/zakat/**` |
| auth | 6,1k | login, register, forgot-password |
| payment | 5,4k | checkout, invoice, payment-result |
| qurbanDetail / qurbanSavingsCreate / qurbanPage | 3,6k / 1,7k / 1,0k | `/qurban/**` |
| home, campaignDetail, invoice, zakatPage, zakatDetail, keranjang, testimonial, dst. | ≤3,5k | rute masing-masing |
| common, footer, laporanDetail, qurbanCard | ±1,4k total | hampir semua halaman (Header/Footer) |

Hanya `common` + `footer` yang dibutuhkan semua halaman (±1,4k dari 68k). Sisanya (±96%) dikirim sia-sia ke halaman yang tak memakainya.
Fakta kode: `translate()` server (`lib/i18n/index.ts`) tidak ikut bundel klien, jadi tidak berubah. Ada 10 pemanggilan `t()` dengan key dinamis, semuanya tetap di dalam satu namespace (`t(\`account.layout.nav.${k}\`)`), jadi pemecahan per namespace aman.

## Decision
1. **Sumber kamus dipecah per namespace**: `lib/i18n/locales/{id,en}/<namespace>.ts` + `index.ts` yang menyusun ulang objek penuh untuk kode server (`translate()` tetap berperilaku sama). API `t("ns.key")` TIDAK berubah, tidak ada pemanggil `t()` yang diedit.
2. **Klien tidak membundel kamus sama sekali.** Namespace dasar (`BASE_NAMESPACES` = `common`, `footer`, dipakai Header/Footer) dikirim root layout lewat props `Providers`; keduanya ±1 kB.
3. **Namespace rute dikirim server lewat layout rute**: komponen server `<I18nNamespaces names={[...]}/>` di `layout.tsx` rute (mis. `app/checkout/layout.tsx` → `checkout`, `payment`; `app/account/layout.tsx` → `account`) memuat namespace itu dari kamus server. Untuk locale non-default, server menggabungkan `en` di atas `id` (deep merge) sehingga fallback `id` tidak perlu dikirim terpisah. Data dikirim sebagai props (payload RSC), lalu digabung ke konteks i18n oleh provider klien bersarang.
4. **Ganti bahasa**: pesan mengikuti server. Header menulis cookie lalu `router.refresh()` (sudah ada); layout dirender ulang dan mengirim namespace bahasa baru. `setLocale` dihapus dari konteks: locale dan pesan berasal dari props server, jadi pilihan di Header baru berubah setelah `refresh()` selesai. Pemuatan lazy `import("./locales/en")` dihapus.
5. **Pemeriksa wajib** `apps/web/scripts/check-i18n-namespaces.mjs` (`npm run check:i18n` di `apps/web`, masuk checklist frontend): untuk tiap key statis `t("ns.…")` dan awalan key dinamis, hitung semua halaman `page.tsx` yang mengimpor file pemanggil (graf impor), lalu pastikan `ns` termasuk namespace dasar atau diumumkan oleh rantai `layout.tsx` halaman itu. Juga memeriksa paritas key `id` vs `en` per namespace. Gagal → exit 1.
6. Komponen bersama yang dipakai lintas rute (mis. `UniversalPaymentInstruction`, `UniversalInvoice`) menuntut namespace-nya diumumkan di tiap rute pemakai; pemeriksa menegakkan ini.

## Alternatif yang Dipertimbangkan
- **B. Server component menerjemahkan sendiri** — hanya efektif untuk halaman server; 20 dari 34 halaman pemakai Header/Footer adalah `'use client'`.
- **`import()` namespace di klien (chunk async)** — teks bisa berkedip/kosong saat hidrasi dan menambah waterfall request; payload RSC lebih sederhana dan SSR-nya utuh.
- **`next-intl` / `i18next`** — migrasi seluruh pemanggil dan routing; berlebihan untuk target penghematan ini (lihat `arsitektur-i18n.md`, "Perbedaan dari Blueprint Lama").
- **Biarkan** — beranda tetap membawa ±13 kB gzip yang tidak dipakai.

## Konsekuensi
- Beranda dan halaman ringan hemat ±13 kB gzip; halaman berat (checkout/account) sedikit bertambah di payload HTML (namespace-nya dikirim sebagai props, dikompresi), tetapi tidak lagi mengunduh kamus rute lain.
- Namespace rute tidak lagi ikut cache browser lintas halaman (kini bagian payload HTML/RSC). Untuk halaman publik yang di-edge-cache, payload ikut ter-cache, jadi tidak ada biaya tambahan di origin.
- Risiko baru: lupa mengumumkan namespace di layout → teks tampil sebagai key mentah dan **`tsc` tidak menangkapnya**. Mitigasi: pemeriksa (poin 5) dan uji browser `id` + `en` pada tiap rute yang berubah.
- Aturan permanen: komponen baru yang memakai namespace baru wajib memperbarui `layout.tsx` rute pemakainya; menambah namespace berarti membuat file `<namespace>.ts` di kedua bahasa.
- Hasil terukur (First Load JS gzip): beranda 139 → 122 kB, checkout 157 → 140, `/zakat` 130 → 113, `/program` 141 → 123, `/laporan` 127 → 110.
- Komponen dengan namespace sama dipakai di banyak rute (mis. `ProgramCard` memakai `home`) membuat tiap rute pemakainya mengumumkan namespace itu; pemeriksa melaporkannya.

---
> Aturan: file ADR TIDAK diedit setelah Accepted. Kalau keputusan berubah,
> buat ADR baru dan tulis "Supersedes ADR-XXXX" di file baru itu.
