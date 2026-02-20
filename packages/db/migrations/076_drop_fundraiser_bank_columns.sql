-- Drop redundant bank columns from fundraisers table
-- Bank data should use entity_bank_accounts table instead
ALTER TABLE fundraisers
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_account_name;
