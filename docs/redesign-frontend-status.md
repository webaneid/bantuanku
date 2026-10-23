# Status Redesign Front-End Web Publik (redesign-1)

Terakhir diperbarui: 2026-10-23. Referensi desain asli (`docs/redesign-1/`: DESIGN.md, code.html,
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
| Header mobile `/page/[slug]` & `/laporan/[slug]` | persis campaign (top bar overlay + gambar penuh + blok judul), tanpa tombol donasi, `ShareBar` di bawah konten; desktop tidak berubah (belum di-commit) | — |

## Belum dikerjakan / keputusan terbuka
- `FeaturedCarousel` ("Program Unggulan & Mendesak") masih tampilan lama; qurban section, "Why Choose Us", Header, Footer belum di-redesign. User akan menyebut bagian berikutnya.
- Overflow horizontal header di lebar < 1340px (sudah ada sebelum redesign, belum diperbaiki).
- Halaman arsip `/program`: filter dan teks "Memuat program..." masih hardcode/tampilan lama.
- `/qurban/[id]` mobile shell belum diuji visual (DB lokal tidak punya tabel `qurban_discounts`); uji di staging/produksi, begitu juga menu top bar saat login.
- Caption kecil "DONASI SEKARANG" di bar ringkas masih ada (hanya keterangan); bisa diganti "Pilih nominal donasi" bila dirasa dobel.
- Alur bayar (checkout, keranjang, invoice) sengaja belum memakai top bar; bar bawahnya masih gaya lama.

## Gotcha lokal
- Font tiba-tiba serif di dev = cache `apps/web/.next` basi (kelas `__variable_xxx` di HTML tidak cocok dengan CSS). Perbaiki: hentikan dev server, `rm -rf apps/web/.next`, jalankan ulang. Bukan perubahan kode font.
- Web dev di port 3002, API 50245; admin dev port 3001 (lihat skill run-web/run-api).
