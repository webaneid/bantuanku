# ADR-0004: Auth Cron Memakai `CRON_SECRET` via Header Bearer

**Status:** Accepted
**Tanggal:** 2026-07-05

## Context
Endpoint cron (`/cron/wa-birthday`, `/cron/wa-reengagement`, `/cron/wa-broadcast`, `/cron/savings-reminder`) awalnya memakai `?secret=JWT_SECRET`. `JWT_SECRET` juga menandatangani session donatur, query param muncul di access log Nginx/proxy, dan perbandingan `!==` rentan timing attack.

## Decision
- Env var khusus `CRON_SECRET` (bukan `JWT_SECRET`).
- Dikirim via `Authorization: Bearer $CRON_SECRET`.
- Dibandingkan dengan `crypto.timingSafeEqual`.
- Endpoint yang prosesnya bisa > 30 detik membalas `202` segera dan menjalankan proses via `setImmediate` (batas Cloudflare ~60 detik).

## Alternatif yang Dipertimbangkan
- Tetap `?secret=` — ditolak: bocor lewat access log.

## Konsekuensi
- Crontab VPS harus memakai header; format lama `?secret=` masih diterima sementara untuk kompatibilitas dan harus dimigrasikan.
- Log cron ditulis ke `~/logs/` (bukan `/var/log/`).

Lihat juga: `docs/lessons-learned.md` (2026-07-05, 2026-07-06 — Cron).
