-- Check if iPaymu settings exist in database
SELECT
  key,
  value,
  category,
  label,
  is_public,
  updated_at
FROM settings
WHERE key LIKE '%ipaymu%'
ORDER BY key;

-- Expected keys:
-- payment_ipaymu_enabled = "true"
-- payment_ipaymu_va = "your VA number"
-- payment_ipaymu_api_key = "your API key"
-- payment_ipaymu_mode = "sandbox" or "production"
