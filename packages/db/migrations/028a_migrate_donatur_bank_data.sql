-- Migrate Existing Bank Account Data from Donatur Table
-- Only migrate donatur that have complete bank account data

-- IMPORTANT: Only run this if you have existing donatur with bank account data!
-- Check first: SELECT COUNT(*) FROM donatur WHERE bank_name IS NOT NULL AND bank_name != '';

-- Note: Donatur table currently doesn't have bank columns, so this migration is a placeholder
-- If bank columns exist in future, uncomment and run:

-- INSERT INTO entity_bank_accounts (id, entity_type, entity_id, bank_name, account_number, account_holder_name, created_at, updated_at)
-- SELECT
--   'ba_' || substr(md5(random()::text), 1, 20) as id,
--   'donatur' as entity_type,
--   id as entity_id,
--   bank_name,
--   bank_account as account_number,
--   bank_account_name as account_holder_name,
--   created_at,
--   updated_at
-- FROM donatur
-- WHERE bank_name IS NOT NULL
--   AND bank_name != ''
--   AND bank_account IS NOT NULL
--   AND bank_account != ''
--   AND bank_account_name IS NOT NULL
--   AND bank_account_name != '';

-- Verify migration
-- SELECT COUNT(*) FROM entity_bank_accounts WHERE entity_type = 'donatur';
