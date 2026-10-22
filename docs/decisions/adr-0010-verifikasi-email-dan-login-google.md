# ADR-0010: Verifikasi Email Wajib dan Login/Daftar Google

**Status:** Accepted
**Tanggal:** 2026-10-22

## Context
Pendaftaran dan pemulihan akun bergantung pada WhatsApp: `whatsappNumber` wajib, dan lupa password hanya lewat OTP WA, padahal gateway WA sering diblokir. Di sisi lain tidak ada bukti kepemilikan email: `POST /auth/register` menempelkan password ke record donatur lama yang emailnya sama dan menautkan transaksi guest berdasarkan klaim email/telepon (audit 2026-10-22, temuan P); `GET /auth/check-registration` membuka data donatur tanpa login; login tidak memeriksa `emailVerifiedAt`. Referensi desain: facport ADR-0030 dan smartai ADR-0022 (keduanya Better Auth; di sini polanya ditulis ulang di atas JWT custom + Hono, bukan mengganti auth).

## Decision
1. **Login wajib email terverifikasi** (`users.email_verified_at`). Login dengan password benar tetapi belum terverifikasi → `403` kode `EMAIL_NOT_VERIFIED` dan link verifikasi dikirim ulang otomatis (cooldown 60 detik). Pengecekan password dilakukan lebih dulu agar status akun tidak bocor ke penebak.
2. **Akun yang dibuat admin dianggap terverifikasi** (admin yang menjamin email; risiko salah ketik diterima, sama seperti tautan reset). Migrasi 121 mem-backfill `email_verified_at` untuk semua user yang punya peran selain `user`. Akun donatur biasa yang sudah ada diverifikasi sekali saat login berikutnya.
3. **Verifikasi lewat link sekali pakai, berlaku 24 jam.** Token acak 32 byte, hanya hash SHA-256 yang disimpan (`auth_email_tokens`). Link membuka halaman web `/verifikasi-email?token=…` yang memanggil `POST /auth/email/verify` (bukan GET yang mengubah state, agar tidak terkonsumsi prefetch/scanner email). Tidak ada auto-login setelah verifikasi.
4. **Kepemilikan data guest hanya lewat email terverifikasi.** Register tidak lagi mengambil alih record donatur lama. Penautan record donatur dan transaksi guest ke akun terjadi **saat email diverifikasi**, berdasarkan email yang baru terbukti. Penautan/otorisasi berdasarkan nomor telepon/WA (klaim tak terverifikasi) dihapus.
5. **Reset password via email** (link sekali pakai, 1 jam) sebagai alternatif OTP WA. Memakai link reset otomatis menandai email terverifikasi.
6. **Login dan daftar Google**, aktif hanya bila `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` diisi (tombol tersembunyi bila tidak). Authorization Code + PKCE ditangani API; ID token diverifikasi (JWKS Google, `iss`, `aud`, `nonce`, `exp`, `email_verified === true`).
   - Akun baru lewat Google: dibuat terverifikasi, peran `user` saja.
   - Akun lokal yang sudah ada ditautkan hanya bila emailnya sudah terverifikasi; bila belum, tolak dan kirim link verifikasi (mencegah pre-registration takeover).
   - Google **tidak berlaku untuk akun ber-peran selain `user`** (staf/mitra masuk dengan password).
   - Token sesi tidak pernah muncul di URL: callback mengarahkan ke web dengan kode tukar sekali pakai (60 detik) yang ditukar via `POST /auth/google/exchange`.
7. **Nomor WhatsApp tetap wajib.** Akun Google baru belum punya nomor WA, jadi web memaksa "lengkapi data" sebelum fitur akun dipakai (`needsProfileCompletion` pada `/auth/me`).
8. `GET /auth/check-registration` tidak lagi mengembalikan nama, email, telepon, atau WA; hanya `exists/registered`, dengan rate limit.

## Alternatif yang Dipertimbangkan
- Login boleh tanpa verifikasi, hanya data lama yang dikunci — ditolak pemilik: ingin kontrol penuh.
- Kode 6 digit via email — ditolak: link lebih sederhana untuk donatur di ponsel.
- Google hanya masuk ke akun yang ada (smartai) — ditolak: tidak membantu donatur baru.
- Tautkan Google ke akun lokal belum terverifikasi dengan menghapus password lama — ditolak sementara: mengejutkan pengguna yang sah; bisa dipertimbangkan nanti.
- Mengganti auth ke Better Auth — ditolak (RETROFIT-GAPS: auth custom tetap).

## Konsekuensi
- Pengiriman email via Resend menjadi jalur kritis pendaftaran: `RESEND_API_KEY`, domain pengirim terverifikasi (SPF/DKIM), dan folder spam jadi perhatian operasional. Kegagalan kirim tidak menggagalkan register; pengguna bisa kirim ulang.
- Perlu OAuth Client di Google Cloud Console; redirect URI `{API_URL}/v1/auth/google/callback`.
- Donatur lama yang akunnya belum terverifikasi akan melihat satu kali pesan verifikasi saat login.
- Transaksi guest yang sebelumnya terlihat lewat klaim nomor telepon tidak lagi muncul di akun sampai email dengan transaksi itu terverifikasi.
