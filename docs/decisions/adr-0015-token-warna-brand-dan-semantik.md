# ADR-0015: Token warna — empat warna brand, token semantik tetap

**Status:** Accepted
**Tanggal:** 2026-10-25

## Context
Platform ini dijual ke banyak LAZ. Audit warna web (2026-10-25) menemukan 584 pemakaian palet bawaan Tailwind (amber, emerald, blue, red, ...) di luar token, dan tidak ada menu warna di admin: semua tertanam di `tailwind.config.js` dan `_variables.scss`. Token yang ada juga bermasalah: `accent`, `warning` (dan `secondary` di admin) sama-sama emas `#d2aa55`, `success` lime terpisah dari brand, `info` tak pernah dipakai, dan tidak ada token untuk warna terang/gelap brand.
Kebiasaan desain pemilik produk: satu brand minimal **empat warna** — `primary`, `secondary`, **terang** (latar/permukaan) dan **gelap** (teks/permukaan gelap). Terang dan gelap penting karena klien sering menolak abu-abu generik (`#f1f1f1`, `#000`) dan ingin terang/gelap yang selaras brand (mis. `#444` bukan hitam pekat). `success` memakai warna primary; `warning`, `danger`, `info` memakai warna bawaan Tailwind/Bootstrap.

## Decision
1. **Empat token brand, ditentukan klien:** `primary` (utama), `secondary` (aksen), `light` (terang), `dark` (gelap). `primary` dan `secondary` punya skala 50–900; `light` dan `dark` satu nilai. `accent` dipertahankan sebagai **alias `secondary`** untuk kode yang sudah ada (jangan dipakai di kode baru).
2. **Token semantik tetap, tidak mengikuti brand:** `success` = alias `primary`; `warning` = palet amber Tailwind; `danger` = palet red Tailwind; `info` = palet blue Tailwind. Merah harus berarti bahaya di tema apa pun.
3. `warning` dipisah dari emas brand (sebelumnya sama dengan accent). Nilai brand emas hanya milik `secondary`.
4. **Netral (`gray`)** tetap skala Tailwind untuk border dan tingkatan; latar halaman dan teks utama memakai `light` dan `dark`.
5. Aturan pemakaian: hanya token di atas; palet bawaan lain dilarang (dijaga `npm run check:colors`). Peta ringkas ada di `arsitektur-color.md`.
6. **Sumber nilai (tahap berikutnya, belum dikerjakan):** empat warna brand menjadi CSS variable yang dibaca dari settings di root layout (tanpa kedip), skala 50–900 diturunkan otomatis dari satu warna dasar; Tailwind membaca variable itu. Nilai di `tailwind.config.js` saat ini = brand tenant pertama dan menjadi default.
7. Urutan kerja: ADR + pemisahan token (ini) → migrasi sisa palet liar ke token → antarmuka setting brand di admin → admin app memakai kontrak yang sama.

## Alternatif yang Dipertimbangkan
- **Semua token dapat diatur klien (success/warning/danger/info juga)** — risiko makna warna berubah antar tema, antarmuka rumit, klien dapat memilih warna bahaya yang tidak terbaca sebagai bahaya.
- **Hanya satu warna brand (`primary`)** — tidak cukup: aksen, terang, dan gelap brand tetap tertanam dan tidak dapat disesuaikan.
- **Bangun antarmuka setting dulu, migrasi belakangan** — tidak bisa dibuktikan bahwa semua halaman mengikuti tema selama masih ada ratusan warna liar.

## Konsekuensi
- Tampilan berubah halus di tempat yang memakai `success` (lime → hijau primary), `warning` (emas → amber), `danger` (marun `#8f132f` → merah Tailwind), dan `info` (teal-biru `#296585` → biru Tailwind). Tema klien lain nanti hanya mengganti empat token brand.
- `light`/`dark` baru berlaku penuh setelah latar halaman dan teks utama dimigrasi dari `gray-50`/`gray-900` (bagian migrasi tahap berikutnya).
- Admin (`apps/admin`) memiliki token sendiri dan belum diselaraskan; dikerjakan setelah web.
- Perubahan makna token (mis. menjadikan `warning` ikut brand) wajib lewat ADR baru yang `Supersedes` ADR ini.

---
> Aturan: file ADR TIDAK diedit setelah Accepted. Kalau keputusan berubah,
> buat ADR baru dan tulis "Supersedes ADR-XXXX" di file baru itu.
