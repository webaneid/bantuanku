-- Add SEO fields to activity_reports
ALTER TABLE activity_reports
  ADD COLUMN focus_keyphrase TEXT,
  ADD COLUMN meta_title VARCHAR(70),
  ADD COLUMN meta_description VARCHAR(160),
  ADD COLUMN canonical_url TEXT,
  ADD COLUMN no_index BOOLEAN DEFAULT FALSE,
  ADD COLUMN no_follow BOOLEAN DEFAULT FALSE,
  ADD COLUMN og_title VARCHAR(70),
  ADD COLUMN og_description VARCHAR(160),
  ADD COLUMN og_image_url TEXT,
  ADD COLUMN seo_score INTEGER DEFAULT 0;
