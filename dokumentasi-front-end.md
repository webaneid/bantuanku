# Dokumentasi Front-End

## 1) Informasi & Alur Singkat
- **Stack & struktur**: Monorepo Next.js (app router) untuk _public web_ di `apps/web` dan _admin_ di `apps/admin`; styling kombinasi Tailwind + SCSS utilitas; komponen custom (Button, Card, dsb) di `apps/web/src/components` dan `apps/admin/src/components`.
- **Alur donasi umum**: Landing → pilih program (`/program/[slug]` atau listing) → tambah ke keranjang/checkout (`/checkout`) → pilih metode pembayaran → submit → halaman hasil pembayaran `/checkout/payment-result`.
- **Alur qurban**:
  - Public: Pilih paket (`/qurban/[id]`), tabungan qurban (`/qurban/savings/new`, `/qurban/savings/[id]`), deposit tabungan (DepositForm).
  - Admin: Kelola orders/tabungan/period/paket di `/dashboard/qurban/...`.
- **Alur zakat**: Kalkulator di beberapa halaman (`/zakat/zakat-bisnis`, `…-penghasilan`, `…-peternakan`) yang menghitung dan menampilkan hasil + CTA donasi.
- **Akun donor**: Riwayat & tabungan di `/account/*` (mis. `/account/qurban-savings/[id]`).

## 2) Notifikasi Browser Default (alert)
Temuan `alert()` yang masih dipakai (per `rg "alert("`):
- `apps/web/src/app/qurban/[id]/QurbanSidebar.tsx`: alert paket tidak tersedia.
- `apps/web/src/app/account/qurban-savings/[id]/DepositForm.tsx`: sukses & gagal setoran.
- `apps/web/src/app/qurban/savings/[id]/DepositForm.tsx`: sukses & gagal setoran.
- `apps/web/src/app/qurban/savings/new/page.tsx`: gagal memuat paket, gagal membuat tabungan.
- `apps/web/src/app/checkout/payment-result/page.tsx`: salin nomor VA.
- `apps/web/src/app/program/[slug]/CampaignSidebar.tsx`: nominal donasi belum dipilih.
- `apps/web/src/components/organisms/QurbanSection/QurbanSection.tsx`: item ditambahkan ke keranjang.
- `apps/web/src/app/zakat/zakat-bisnis/page.tsx`, `…/zakat-penghasilan/page.tsx`, `…/zakat-peternakan/page.tsx`: gagalkan perhitungan (dan nisab ternak).
- Admin: `apps/admin/src/components/CampaignForm.tsx`: validasi form gagal (alert multi-line).

Catatan: Semua notifikasi di settings & qurban admin sudah diganti ke `FeedbackDialog`; sisanya di atas perlu diseragamkan.

## 3) Temuan CSS/SCSS Hardcode/Inline
Beberapa inline style yang berpotensi menyulitkan konsistensi & performa (per `rg "style={{"`):
- `apps/web/src/app/page.tsx`: Button hero outline warna putih (inline color/border).
- `apps/web/src/app/keranjang-bantuan/page.tsx`: font-size inline di beberapa paragraf/teks.
- `apps/web/src/app/account/qurban-savings/page.tsx`: progress bar lebar dengan inline width berbasis persen.
- `apps/web/src/app/checkout/page.tsx`: font-size inline pada teks informasi.
- `apps/admin/src/components/MediaLibrary.tsx`: input file disembunyikan via inline `display: none`.
Rekomendasi: pindahkan ke kelas utilitas (Tailwind) atau SCSS module agar konsisten dan mudah di-theme.

## 4) Rencana Perbaikan UI Responsif & Mobile-Friendly
1. **Standarisasi notifikasi**: Ganti seluruh `alert()` di daftar pada bagian 2 dengan komponen `FeedbackDialog` (admin) / toast in-app (web) dengan status (success/error/info) dan auto-close.
2. **Refaktor style inline**: Buat utility class (mis. `.text-15`, `.fs-13`) atau gunakan Tailwind `text-[15px]`, `leading-[1.6]`; buat komponen ProgressBar agar lebar diatur via prop.
3. **Header & navigasi mobile**: Audit header web & admin; pastikan burger menu + slide-in drawer, logo skala dinamis (flex basis %), dan tombol aksi tetap accessible.
4. **Grid responsif**: Pastikan kartu program/qurban/zakat memakai `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, serta tabel → kartu pada <md (pattern sudah ada di admin qurban deposits—reusability).
5. **Form ergonomi**: Gunakan input penuh lebar, spacing konsisten (`space-y-4`), dan pastikan label+helper teks tidak terpotong di mobile; validasi ditampilkan via komponen feedback, bukan alert.
6. **Aset gambar**: Satukan ukuran logo/hero ke kelas CSS; pastikan `object-contain` dan batas max-height untuk modal gambar (sudah dipakai di admin) juga di sisi web.
7. **Theming & variabel**: Kumpulkan warna/huruf di satu sumber (Tailwind config atau SCSS variables) untuk menghindari hardcode warna di komponen.

## 5) Langkah Lanjut Prioritas
- Ganti semua `alert()` yang terdaftar → komponen notifikasi konsisten.
- Hilangkan inline `style` yang terdeteksi dan buat utilitas/komponen.
- Uji responsif halaman utama (landing, program detail, checkout, qurban savings) dengan breakpoints sm/md/lg, perbaiki overflow & spacing.
