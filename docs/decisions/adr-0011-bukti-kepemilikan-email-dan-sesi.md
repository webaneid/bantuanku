# ADR-0011: Bukti Kepemilikan Email + Password saat Verifikasi, Pencabutan Sesi

**Status:** Accepted
**Tanggal:** 2026-10-22
**Mengubah (supersedes sebagian):** ADR-0010 poin 3 (verifikasi lewat link saja), poin 6 (Google ke akun lokal belum terverifikasi), dan poin 7 (`needsProfileCompletion` tidak pernah dibuat; web hanya mengarahkan ke `/account/profile`).

## Context
Audit `security-auditor` atas implementasi ADR-0010 menemukan pre-registration hijack yang **belum tertutup**: penyerang mendaftar dengan email korban dan password miliknya; akun tetap belum terverifikasi, tetapi bila PEMILIK email mengklik link verifikasi (dikirim saat register, saat login, atau saat korban mencoba Google), akun menjadi terverifikasi dengan password penyerang masih berlaku, data donatur/transaksi korban tertaut ke akun itu, dan penyerang bisa login. Audit juga menemukan: sesi tidak dicabut saat password berubah, `/refresh` tidak memeriksa verifikasi, admin bisa menambah peran staf ke user belum terverifikasi, nama tak di-escape di HTML email, `returnTo` lolos dengan karakter TAB, dan WA selamat datang dikirim ke nomor tak terverifikasi.

## Decision
1. **Verifikasi email butuh dua bukti:** token dari kotak surat **dan** password akun. `POST /auth/email/verify {token, password}` memeriksa token (tanpa menghanguskannya), lalu password, baru menghanguskan token secara atomik. Pendaftar yang sah tahu passwordnya; pemilik email yang dijadikan sasaran tidak. Setelah berhasil, API langsung menerbitkan sesi (pemakai baru saja membuktikan mailbox + password), jadi tidak perlu login ulang. Salah password tidak menghanguskan token.
2. **Register pada email yang sudah ada tetapi belum terverifikasi = daftar ulang**: password, nama, telepon, WA ditimpa, sesi dicabut, link baru dikirim. Aman karena verifikasi butuh mailbox + password terbaru. Risiko yang diterima: pihak ketiga bisa menimpa password akun yang belum terverifikasi (hanya membuat akun itu macet sampai pemilik email memakai "Lupa password"; penyerang tetap tidak bisa verifikasi). Email yang sudah terverifikasi tetap `400`.
3. **Google ke akun lokal belum terverifikasi = klaim oleh pemilik email**: Google sudah membuktikan kepemilikan email, jadi password lama (yang mungkin ditanam penyerang) dihapus (`password_hash = NULL`), email ditandai terverifikasi, semua token tertunda dihanguskan, sesi dicabut, lalu akun ditautkan. Pengguna sah yang pernah mendaftar dengan password tapi belum verifikasi akan kehilangan password itu dan memakai "Lupa password" bila mau password lagi.
4. **Pencabutan sesi:** kolom `users.sessions_valid_after`. Diisi saat reset password (email dan OTP WA), ganti password, daftar ulang, dan klaim Google. `/auth/refresh` menolak refresh token yang `iat`-nya lebih lama (granularitas detik) dan menolak akun belum terverifikasi.
5. **Peran staf hanya untuk akun terverifikasi:** `admin/employees.ts` menolak menautkan peran ke user dengan `email_verified_at IS NULL` (kedua jalur).
6. **Email transaksional:** semua nilai dinamis di-HTML-escape.
7. **`returnTo`/`next`:** divalidasi dengan `new URL()` terhadap origin tiruan dan menolak karakter kontrol (TAB/CR/LF), di API dan web.
8. **WA selamat datang** dikirim setelah email terverifikasi, bukan saat register.
9. **Override endpoint OAuth** (`GOOGLE_OAUTH_*_URL`) diabaikan bila `ENVIRONMENT=production`.
10. **Lookup email case-insensitive** (login, register, resend, lupa password); email baru disimpan huruf kecil.
11. **`GET /donatur/search`** (publik, dipakai autofill checkout) mengganti `userId` dengan `hasAccount` dan kena rate limit ketat. **Pembukaan PII-nya tetap ada** dan butuh keputusan produk (lihat Konsekuensi).

## Alternatif yang Dipertimbangkan
- Register tanpa password, password dibuat saat verifikasi — paling kuat, tetapi mengubah total alur daftar; dicatat sebagai opsi bila pendekatan ini dirasa kurang.
- Mengikat link verifikasi ke browser pendaftar (cookie) — gagal bila email dibuka di perangkat lain.
- Tetap menolak Google ke akun belum terverifikasi (ADR-0010) — aman tetapi memaksa pemilik email yang sah memverifikasi dulu, padahal Google sudah membuktikan kepemilikan.

## Konsekuensi
- Halaman `/verifikasi-email` meminta password. Pengguna yang lupa password memakai "Lupa password" (email), yang juga memverifikasi akun.
- Migrasi 122 (`sessions_valid_after`) harus dijalankan sebelum deploy kode.
- Masih terbuka: `/donatur/search` membuka nama/email/telepon/WA ke siapa pun yang tahu salah satunya. Opsi: hanya `exists` tanpa autofill, atau autofill setelah OTP/login. Perlu keputusan pemilik produk.
- Masih terbuka: limiter per-akun (login/resend) dan `TRUSTED_PROXY_HOPS` di VPS (email-bombing lewat banyak IP palsu).
