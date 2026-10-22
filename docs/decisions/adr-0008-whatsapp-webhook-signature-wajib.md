# ADR-0008: Webhook WhatsApp Wajib HMAC dan Fail-Closed

**Status:** Accepted
**Tanggal:** 2026-10-22

## Context
`POST /v1/whatsapp/webhook` publik dan sebelumnya tidak memverifikasi apa pun (komentar kode menyebut `X-Hub-Signature-256`, tetapi tidak ada implementasinya). Siapa pun bisa memalsukan `from`, sehingga bot memproses pesan sebagai nomor korban, membalas lewat gateway GOWA organisasi, memicu panggilan LLM berbayar, dan memakai nomor palsu sebagai identitas donatur. Audit `security-auditor` menandainya Critical.

## Decision
- Endpoint memverifikasi `X-Hub-Signature-256` = HMAC-SHA256(raw body, `WHATSAPP_WEBHOOK_SECRET`) dengan `timingSafeEqualString()` sebelum parse atau proses.
- **Fail-closed:** jika `WHATSAPP_WEBHOOK_SECRET` tidak diset, endpoint membalas `503` dan tidak memproses apa pun. Header hilang/salah → `401`.
- Secret hanya dari env (bukan tabel `settings`) dan harus identik dengan secret di GOWA.
- Payload webhook tidak boleh dicetak ke log.

## Alternatif yang Dipertimbangkan
- Fail-open saat secret kosong (log warning saja) — ditolak: default tidak aman, mudah terlupa.
- Allowlist IP di Nginx saja — ditolak sebagai satu-satunya lapis: di luar repo, tidak terverifikasi dari kode. Boleh ditambahkan sebagai lapis kedua.
- Shared secret di path/header kustom — tidak perlu: GOWA v8 mendukung HMAC native.

## Konsekuensi
- **Urutan deploy:** set `WHATSAPP_WEBHOOK_SECRET` di GOWA dan di env API (`pm2 restart bantuanku-api --update-env`) pada waktu yang berdekatan. Selama salah satu belum diset, bot tidak membalas (503/401).
- Setiap webhook publik baru harus mengikuti pola yang sama.

Lihat juga: `docs/arsitektur-wa-bot.md` § Autentikasi Webhook, `docs/arsitektur-security.md` § WhatsApp webhook.
