# Status Redesign Front-End Web Publik (redesign-1)

Terakhir diperbarui: 2026-10-24 (sesi lanjutan: laporan kegiatan, checkout, keranjang). Referensi desain asli (`docs/redesign-1/`: DESIGN.md, code.html,
screen.png) sudah DIHAPUS dari repo atas permintaan user supaya tidak ikut git; salinannya ada di
tangan user. Sumber kebenaran sekarang adalah kode + dokumen ini + `arsitektur-komponen-web.md`.

## Prinsip yang diputuskan user
- Warna memakai token tema yang sudah ada (primary teal, warning/accent emas, danger merah tua), BUKAN hex dari desain; tema tidak punya oranye, "urgent" memakai `danger`.
- Teks klaim lembaga dari desain ("Diawasi Kemenag & BAZNAS RI", "Transparansi Penyaluran Real-time", "Jelajahi Cepat") sengaja TIDAK dibuat (tidak ada di settings, tidak boleh hardcode).
- Font Plus Jakarta Sans dari desain BELUM dipakai (perubahan global; menunggu keputusan). Font aktif tetap Inter.
- Hemat CSS: satu desain kartu program untuk semua halaman, varian lama dihapus.
- Mobile hero tidak diubah (keputusan user: "sudah benar untuk sementara").

## Sudah selesai (semua sudah di-push ke `release/vps-initial`)
| Bagian | Catatan | Commit |
|---|---|---|
| Hero (`HeroSlider`) | kartu tidak full width (jarak ~80px), radius, lebih tinggi, teks sejajar container | f7c0334 |
| Hapus section hardcode "Jelajahi Halaman Penting" | tautannya tetap di Footer | b9cdb3f |
| funfact-section | kartu hijau 24px + 4 kotak statistik | 419136a |
| `ProgramCard` | SATU desain di semua halaman (beranda, `/program`, kategori, terkait, wakaf, mitra); mobile horizontal tanpa deskripsi/tombol | 419136a |
| programs-section | menu kategori (tautan ke `/program/kategori/<slug>`), hanya kategori berisi campaign aktif | 419136a |
| `CategoryGrid` (pilar) | desain kartu baru, posisi tetap di bawah hero | 419136a |
| CTA | rata tengah, tinggi +20%, tombol 1 putih + tombol 2 outline putih | 419136a |
| Mobile single shell | header disembunyikan, `MobileTopBar` (back + titik tiga), `MobileActionSheet` (bar donasi/qurban naik-turun); lihat `arsitektur-mobile-single-shell.md` | 9b62dd5, 472b81e |
| Header mobile `/page/[slug]` & `/laporan/[slug]` | persis campaign (top bar overlay + gambar penuh + blok judul), tanpa tombol donasi; `ShareBar` = bar statis di bawah layar (mobile) / kartu (desktop); kartu artikel & sidebar padding 15px di mobile, gambar editor full-width (`prose-bleed`) | 0c8007f |
| Arsip `/laporan` | mobile: daftar ringkas (thumbnail persegi, judul, tanggal singkat · kabupaten); paginasi diperbaiki (redirect di luar jangkauan, style `.pagination`, "Halaman X dari N" di mobile) | d8e0ae5 |
| Laporan terkait di `/laporan/[slug]` | "Laporan Terkait" (referensi sama) / "Laporan Lain"; API `GET /activity-reports/by-slug/:slug/related`; `ReportCard` + `RelatedReports` | 8d73123 |
| Tab "Kabar Terbaru" di `/program/[slug]` | daftar saja (timeline desktop tanpa konten, mobile = `ReportCard`), kartu klik ke detail laporan; payload API campaign diringkas | b0c6d96 |
| Halaman pilih metode bayar `/invoice/[id]/payment-method` | semua metode tampil sekaligus (kartu manual + channel iPaymu), logo lembaga di atas judul; halaman instruksi bayar baru `/invoice/[id]/payment-instruction` | 4793520, c061a7d |
| `/checkout` mobile | tanpa overflow (grid `grid-cols-1`), kartu penuh tanpa border teks 15px, bar bawah tombol utama + tautan teks, blok ringkasan primary di atas (`CartSummaryCard`); alur satu isian email/HP + tombol Lanjutkan (terdaftar → tanpa isian identitas; belum → form lengkap) | 8c0f01e, 27d8235 |
| `/keranjang-bantuan` mobile | seluruh isi keranjang di satu blok primary (`CartSummaryCard` mode `edit`: nominal, hapus, rincian zakat/qurban, kosongkan); tombol "Verifikasi Donatur" + tautan teks "Tambah Program Lain"; daftar kartu hanya desktop | 263e598, 2a7dbe0, ca1bbfb |
| Modal donasi campaign (`DonationConfirmModal`) | 3 tombol seragam (`h-12`): Donasi Sekarang → `/checkout`, Tambah ke Keranjang & Lihat → `/keranjang-bantuan`, Tambah ke Keranjang → `/program`; "Cari Program Lain" dihapus; `/checkout` menunggu `CartContext.isLoaded` sebelum redirect ke keranjang | c8ddc85 |
| Checkout: bar bawah dan Lanjutkan | bar "Pilih Metode Pembayaran" hanya tampil bila data donatur siap; tombol Lanjutkan hilang setelah terverifikasi/mulai mengisi; auto-gulir ke hasil | aa36930 |
| `/invoice/[id]/payment-instruction` mobile | blok primary + kartu penuh + tautan teks; QRIS: tombol "Unduh QRIS" (PNG 800px) | 3708299 |
| Halaman akun `/account/*` (redesign total) | cangkang baru (bar bawah mengambang mobile, sidebar berkartu pengguna desktop), dashboard (hero total kontribusi + aksi cepat + ringkasan + transaksi terbaru), Riwayat, Tabungan Qurban (daftar + detail), Influencer, Profil; tabel baku tidak diubah | e2be6eb, c214276, e8900f2, 045776a |
| `FeaturedCarousel` ("Program Unggulan & Mendesak") | section baru: teks kiri + kartu gelap bergulir kanan, gambar rasio 900:498 (varian `large`), lencana sisa hari/target tercapai, dekorasi flat | 3b7b24f, d9e102a |

## Belum dikerjakan / keputusan terbuka
- qurban section, "Why Choose Us", Header, Footer belum di-redesign. User akan menyebut bagian berikutnya.
- Overflow horizontal header di lebar < 1340px (sudah ada sebelum redesign, belum diperbaiki).
- Halaman arsip `/program`: filter dan teks "Memuat program..." masih hardcode/tampilan lama.
- `/qurban/[id]` mobile shell belum diuji visual (DB lokal tidak punya tabel `qurban_discounts`); uji di staging/produksi, begitu juga menu top bar saat login.
- Caption kecil "DONASI SEKARANG" di bar ringkas masih ada (hanya keterangan); bisa diganti "Pilih nominal donasi" bila dirasa dobel.
- Alur bayar (keranjang, checkout, invoice) sengaja tidak memakai top bar mobile. Bar bawah keranjang dan checkout sudah gaya baru; bar bawah halaman invoice/akun belum diubah.

## Gotcha lokal
- Font tiba-tiba serif di dev = cache `apps/web/.next` basi (kelas `__variable_xxx` di HTML tidak cocok dengan CSS). Perbaiki: hentikan dev server, `rm -rf apps/web/.next`, jalankan ulang. Bukan perubahan kode font.
- Web dev di port 3002, API 50245; admin dev port 3001 (lihat skill run-web/run-api).

## Catatan sesi 2026-10-24 (belum selesai / akan berubah)
- Pemilik produk menyebut UI checkout dan keranjang "sementara ok, akan berubah lagi"; jangan menganggap final.
- Belum teruji di perangkat mobile sungguhan: checkout/keranjang/instruksi bayar (diuji lewat iframe 390px), dan alur checkout dengan user login.
- Thumbnail program di blok ringkasan (seperti referensi desain) belum ada karena `CartItem` tidak menyimpan gambar.
- Tombol "Tambah Program Lain" di sidebar desktop keranjang tetap outline (hanya mobile yang jadi tautan teks); tombol form checkout desktop tidak digating.
- Modal donasi qurban dan zakat belum disederhanakan seperti modal campaign (masih pola lama, tombol tidak seragam).
- Unduh QRIS belum diuji di iPhone/Safari nyata.
