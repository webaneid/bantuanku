# Arsitektur Mobile Single Shell (web publik)

**Status:** diimplementasikan 2026-10-23. Terinspirasi `docs/arsitektur-mobile-shell.md` di project jalajogja
(pola yang sama, disesuaikan ke struktur web ini).

## Tujuan

Di mobile (< `lg`, 1024px) halaman **single** (detail satu item) tampil seperti aplikasi:
header situs disembunyikan, diganti top bar kecil (back di kiri, titik tiga/menu di kanan), dan
halaman yang punya aksi transaksi (donasi, qurban) memakai **bar bawah yang bisa naik-turun**
(bottom sheet) yang berisi seluruh pilihan (nominal/paket, total, tombol).

Desktop (`lg` ke atas) **tidak berubah**.

## Cakupan

| Halaman | Header disembunyikan + top bar | Bar bawah naik-turun |
|---|---|---|
| `/program/[slug]` | ya (overlay di atas gambar) | ya (nominal donasi) |
| `/qurban/[id]` | ya (overlay di atas gambar) | ya (paket/jumlah/voucher + ringkasan) |
| `/zakat/[slug]` | ya (overlay bila ada gambar, selain itu solid) | tidak (kalkulator) |
| `/laporan/[slug]`, `/page/[slug]`, `/mitra/[slug]` | ya (solid) | tidak |
| Checkout, keranjang bantuan, invoice, akun | **tidak** (header penuh, alur bayar/utilitas) | bar milik halaman sendiri, tidak diubah |

## Komponen

| Komponen | Lokasi | Fungsi |
|---|---|---|
| `Header` prop `hideOnMobile` | `organisms/Header` | menyembunyikan header di bawah `lg` (kelas `header--hide-mobile`) |
| `MobileTopBar` | `organisms/MobileTopBar` | back (kiri) + titik tiga (kanan) yang membuka panel menu. Mode `overlay` (transparan di atas gambar, sembunyi saat scroll turun, muncul saat scroll naik) atau solid (bar putih + spacer) |
| `MobileMenuPanel` | `organisms/MobileMenuPanel` | isi menu mobile (menu, bahasa, login/logout, akun). **Satu sumber** untuk Header dan `MobileTopBar` |
| `useHeaderMenuItems` | `hooks/useHeaderMenu.ts` | parse `frontend_header_menu` (dipakai Header dan panel) |
| `MobileActionSheet` | `molecules/MobileActionSheet` | bar ringkas selalu tampil di bawah; ketuk untuk membuka sheet (animasi `max-height`); isi tidak di-unmount; prop `collapseSignal` |

## Aturan wajib

1. **Spacer harus jadi elemen paling terakhir di halaman.** Bar `fixed bottom-0` butuh spacer
   (`h-20 lg:hidden`) **setelah `<Footer />`**, bukan di tengah halaman. Jangan pakai `pb-*` di
   container tengah (membuat jarak kosong antara konten dan footer). Pelajaran dari jalajogja (bug sama 4x).
2. **Dua overlay tidak boleh aktif bersamaan.** Sheet harus collapse (`collapseSignal`) sebelum modal
   konfirmasi/share dibuka, kalau tidak klik terasa tidak merespons.
3. **Z-index** (skala web ini): header 1000, top bar 1020, bar/sheet bawah 1030 (backdrop 1029),
   panel menu top bar 1050/1051, modal share 1040, modal konfirmasi 1050.
4. Menu top bar **persis sama** dengan menu header (sumber `useHeaderMenuItems`); jangan membuat daftar menu terpisah.
5. Teks UI lewat i18n (`common.*`, `campaignDetail.sidebar.*`, `qurbanDetail.sidebar.*`).
6. Elemen `fixed bottom-0` baru di web publik: cek tinggi spacer di tiap halaman yang memakainya.

## Gap / catatan

- Halaman alur bayar (checkout, keranjang, invoice) sengaja tidak diubah; bar bawahnya masih gaya lama.
