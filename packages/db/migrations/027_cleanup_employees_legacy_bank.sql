-- Cleanup Employees Legacy Bank Columns
-- Remove old bank columns that are now replaced by entity_bank_accounts table

-- IMPORTANT: Only run this AFTER all features are working with new bank account system!

-- Drop legacy bank columns
ALTER TABLE employees
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account,
  DROP COLUMN IF EXISTS bank_account_name;
