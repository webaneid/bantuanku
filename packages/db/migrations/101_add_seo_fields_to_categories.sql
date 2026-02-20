-- Migration: Add SEO fields to categories table
-- Date: 2026-02-20

ALTER TABLE categories
  ADD COLUMN meta_title VARCHAR(70),
  ADD COLUMN meta_description VARCHAR(170),
  ADD COLUMN focus_keyphrase VARCHAR(100),
  ADD COLUMN canonical_url TEXT,
  ADD COLUMN no_index BOOLEAN DEFAULT false,
  ADD COLUMN no_follow BOOLEAN DEFAULT false,
  ADD COLUMN og_title VARCHAR(70),
  ADD COLUMN og_description VARCHAR(200),
  ADD COLUMN og_image_url TEXT,
  ADD COLUMN seo_score INTEGER DEFAULT 0;
