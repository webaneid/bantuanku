-- Migration: 097_add_seo_fields_to_pages
-- Description: Add SEO fields to pages table

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(70),
  ADD COLUMN IF NOT EXISTS meta_description VARCHAR(170),
  ADD COLUMN IF NOT EXISTS focus_keyphrase VARCHAR(100),
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS no_index BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_follow BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS og_title VARCHAR(70),
  ADD COLUMN IF NOT EXISTS og_description VARCHAR(200),
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0;
