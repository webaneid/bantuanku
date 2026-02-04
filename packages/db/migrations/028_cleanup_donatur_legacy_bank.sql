-- Cleanup Donatur Legacy Bank Columns
-- Remove old bank columns that are now replaced by entity_bank_accounts table

-- IMPORTANT: Only run this AFTER all features are working with new bank account system!

-- Note: Donatur table currently doesn't have bank columns, so this migration is a placeholder
-- If bank columns exist in future, uncomment and run:

-- DROP legacy bank columns
-- ALTER TABLE donatur
--   DROP COLUMN IF EXISTS bank_name,
--   DROP COLUMN IF EXISTS bank_account,
--   DROP COLUMN IF EXISTS bank_account_name;
