-- Migration 120: Add unique constraint (job_id, donatur_id) to wa_broadcast_logs
-- Dibutuhkan untuk claim-before-send dengan onConflictDoNothing() di broadcast-processor
-- Mencegah double-send jika cron overlap atau proses restart saat batch berjalan

-- Hapus dulu row 'sending' yang mungkin stuck dari proses sebelumnya
-- (jika ada row stuck 'sending' dari implementasi lama, ubah ke 'failed')
UPDATE wa_broadcast_logs
SET status = 'failed', error_message = 'stuck sending — cleaned up by migration 120'
WHERE status = 'sending';

-- Tambahkan unique constraint
-- Hanya berlaku untuk donatur_id NOT NULL (NULL dianggap distinct oleh PostgreSQL)
ALTER TABLE wa_broadcast_logs
  ADD CONSTRAINT wa_broadcast_logs_job_donatur_unique
  UNIQUE (job_id, donatur_id);
