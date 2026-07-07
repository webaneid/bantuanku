-- Migration 120: Add unique constraint (job_id, donatur_id) to wa_broadcast_logs
-- Dibutuhkan untuk claim-before-send dengan onConflictDoNothing() di broadcast-processor
-- Mencegah double-send jika cron overlap atau proses restart saat batch berjalan

-- Hapus dulu row 'sending' yang mungkin stuck dari proses sebelumnya
-- (jika ada row stuck 'sending' dari implementasi lama, ubah ke 'failed')
UPDATE wa_broadcast_logs
SET status = 'failed', error_message = 'stuck sending — cleaned up by migration 120'
WHERE status = 'sending';

-- Tambahkan unique constraint (idempotent — aman dijalankan ulang)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wa_broadcast_logs_job_donatur_unique'
  ) THEN
    ALTER TABLE wa_broadcast_logs
      ADD CONSTRAINT wa_broadcast_logs_job_donatur_unique
      UNIQUE (job_id, donatur_id);
  END IF;
END $$;
