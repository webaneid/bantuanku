# ADR-0012: Masa Berlaku Access Token 2 Jam, Refresh Otomatis Ditunda

**Status:** Accepted
**Tanggal:** 2026-10-23

## Context
Klien melaporkan pengguna (terutama admin yang sedang menulis berita) logout sendiri dalam hitungan menit dan kehilangan pekerjaan yang belum disimpan. Penyebab terbukti: access token berumur 15 menit, API sudah menerbitkan `refreshToken` 7 hari dan punya `POST /auth/refresh`, tetapi admin dan web membuang `refreshToken` dan interceptor axios tidak punya logika refresh; setiap `401` langsung menghapus token dan mengalihkan ke `/login`.

## Decision
Di produksi set `JWT_EXPIRES_IN=2h` (access token 2 jam). Tidak ada perubahan kode: `routes/auth.ts` (`/refresh`) dan `services/session.ts` (login, Google, verifikasi email) sama-sama membaca env itu; terbukti di lokal (login dan refresh menghasilkan token 120 menit). Default di kode tetap `15m`. Refresh otomatis di frontend ditunda.

## Alternatif yang Dipertimbangkan
- Cookie httpOnly untuk refresh token + refresh diam-diam di interceptor — paling aman dan menghilangkan logout mendadak, tetapi butuh endpoint logout, perubahan tiga jalur login, dan uji CORS/cookie di domain produksi. Ditunda atas keputusan pemilik produk; kandidat bila keluhan berlanjut.
- Refresh token di localStorage + auto-refresh — sederhana tetapi token 7 hari terbaca JavaScript (risiko XSS lebih besar).

## Konsekuensi
- Logout mendadak berkurang drastis, tetapi tidak hilang: setelah 2 jam pengguna tetap dilempar ke `/login`, dan pekerjaan yang belum disimpan tetap hilang pada saat itu.
- Access token tidak dicek ke DB. Reset/ganti password dan pencabutan sesi (`sessions_valid_after`) hanya menghentikan refresh; access token yang sudah terbit tetap sah sampai 2 jam (sebelumnya 15 menit). Token yang dicuri hidup lebih lama.
- Perlu diingat bila lingkungan baru memakai default kode (`15m`): setelan ini ada di env VPS, bukan di kode.
