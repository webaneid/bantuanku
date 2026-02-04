-- Migrate Existing Bank Account Data from Mustahiqs Table
-- Only migrate mustahiqs that have complete bank account data

-- IMPORTANT: Only run this if you have existing mustahiqs with bank account data!
-- Check first: SELECT COUNT(*) FROM mustahiqs WHERE bank_name IS NOT NULL AND bank_name != '';

INSERT INTO entity_bank_accounts (id, entity_type, entity_id, bank_name, account_number, account_holder_name, created_at, updated_at)
SELECT
  'ba_' || substr(md5(random()::text), 1, 20) as id,
  'mustahiq' as entity_type,
  id as entity_id,
  bank_name,
  bank_account as account_number,
  bank_account_name as account_holder_name,
  created_at,
  updated_at
FROM mustahiqs
WHERE bank_name IS NOT NULL
  AND bank_name != ''
  AND bank_account IS NOT NULL
  AND bank_account != ''
  AND bank_account_name IS NOT NULL
  AND bank_account_name != '';

-- Verify migration
-- SELECT COUNT(*) FROM entity_bank_accounts WHERE entity_type = 'mustahiq';
