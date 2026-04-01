-- Preview duplicate published activity reports grouped by
-- (reference_type, reference_id, normalized title).
-- This query is read-only and safe to run in production.

WITH normalized AS (
  SELECT
    id,
    reference_type,
    reference_id,
    title,
    slug,
    no_index,
    canonical_url,
    published_at,
    created_at,
    trim(BOTH '-' FROM regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')) AS normalized_title
  FROM activity_reports
  WHERE status = 'published'
),
duplicate_groups AS (
  SELECT
    reference_type,
    reference_id,
    normalized_title,
    count(*) AS total
  FROM normalized
  GROUP BY reference_type, reference_id, normalized_title
  HAVING count(*) > 1
),
ranked AS (
  SELECT
    n.*,
    g.total,
    row_number() OVER (
      PARTITION BY n.reference_type, n.reference_id, n.normalized_title
      ORDER BY
        CASE WHEN n.slug = n.normalized_title THEN 0 ELSE 1 END,
        n.published_at NULLS LAST,
        n.created_at NULLS LAST,
        n.id
    ) AS preferred_rank
  FROM normalized n
  JOIN duplicate_groups g
    ON g.reference_type = n.reference_type
   AND g.reference_id = n.reference_id
   AND g.normalized_title = n.normalized_title
)
SELECT
  reference_type,
  reference_id,
  normalized_title,
  total,
  CASE WHEN preferred_rank = 1 THEN 'canonical' ELSE 'duplicate' END AS role,
  slug,
  no_index,
  canonical_url,
  published_at,
  created_at,
  title
FROM ranked
ORDER BY reference_type, reference_id, normalized_title, preferred_rank, slug;
