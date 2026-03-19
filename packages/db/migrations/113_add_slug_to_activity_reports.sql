-- Add slug column to activity_reports for public URL access
ALTER TABLE activity_reports ADD COLUMN slug TEXT;

-- Generate slugs for existing reports from title
UPDATE activity_reports
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(title), '[^\w\s-]', '', 'g'), '[\s_-]+', '-', 'g'));

-- Handle duplicate slugs by appending id suffix
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM activity_reports
)
UPDATE activity_reports ar
SET slug = ar.slug || '-' || SUBSTRING(ar.id, 1, 6)
FROM duplicates d
WHERE ar.id = d.id AND d.rn > 1;

-- Make slug unique and not null
ALTER TABLE activity_reports ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_activity_reports_slug ON activity_reports(slug);
