-- Add package ownership so mitra package access no longer depends on period ownership
ALTER TABLE qurban_packages
ADD COLUMN IF NOT EXISTS created_by text REFERENCES users(id);

CREATE INDEX IF NOT EXISTS qurban_packages_created_by_idx
ON qurban_packages(created_by);

-- Backfill package owner from legacy mitra-owned periods (if any)
UPDATE qurban_packages qp
SET created_by = src.user_id
FROM (
  SELECT qpp.package_id, MIN(m.user_id) AS user_id
  FROM qurban_package_periods qpp
  INNER JOIN qurban_periods qpr ON qpr.id = qpp.period_id
  INNER JOIN mitra m ON m.id = qpr.mitra_id
  WHERE m.user_id IS NOT NULL
  GROUP BY qpp.package_id
) src
WHERE qp.id = src.package_id
  AND qp.created_by IS NULL;

-- Add per package-period execution override fields
ALTER TABLE qurban_package_periods
ADD COLUMN IF NOT EXISTS execution_date_override timestamp(3);

ALTER TABLE qurban_package_periods
ADD COLUMN IF NOT EXISTS execution_time_note text;

ALTER TABLE qurban_package_periods
ADD COLUMN IF NOT EXISTS execution_location text;

ALTER TABLE qurban_package_periods
ADD COLUMN IF NOT EXISTS execution_notes text;
