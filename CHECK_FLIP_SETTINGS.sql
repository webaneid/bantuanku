-- Check if Flip settings exist in database
SELECT
  key,
  value,
  category,
  label,
  is_public,
  updated_at
FROM settings
WHERE key LIKE '%flip%'
ORDER BY key;

-- Expected keys:
-- payment_flip_enabled = "true"
-- payment_flip_secret_key = "your secret key"
-- payment_flip_validation_token = "your validation token"
-- payment_flip_mode = "sandbox" or "production"
