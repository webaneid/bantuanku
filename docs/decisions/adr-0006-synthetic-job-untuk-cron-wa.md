# ADR-0006: Cron WA Membuat Synthetic Job untuk Audit Trail

**Status:** Accepted
**Tanggal:** 2026-07-05

## Context
`wa_broadcast_logs.job_id` adalah `NOT NULL` dengan FK ke `wa_broadcast_jobs`. Cron birthday/re-engagement awalnya didesain tanpa job entry, yang mustahil dengan skema ini.

## Decision
Setiap run cron birthday/re-engagement membuat satu baris `wa_broadcast_jobs` sintetis (`type = 'birthday' | 'reengagement'`, `processing → completed`). `broadcast-processor` **wajib** mengecualikan tipe ini (`notInArray(waBroadcastJobs.type, ["birthday", "reengagement"])`).

## Alternatif yang Dipertimbangkan
- Membuat `job_id` nullable — ditolak: kehilangan audit trail per run.

## Konsekuensi
- Admin bisa melihat riwayat run harian.
- Tipe job baru yang dimiliki cron sendiri harus ditambahkan ke daftar pengecualian processor.

Lihat juga: `docs/arsitektur-wa-community-care.md`.
