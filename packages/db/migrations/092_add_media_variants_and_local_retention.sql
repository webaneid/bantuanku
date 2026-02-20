-- Add metadata fields for media processing pipeline
ALTER TABLE media
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS variants JSONB,
  ADD COLUMN IF NOT EXISTS original_local_path TEXT,
  ADD COLUMN IF NOT EXISTS original_local_expires_at TIMESTAMP(3);

