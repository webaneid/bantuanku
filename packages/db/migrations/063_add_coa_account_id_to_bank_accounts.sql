-- Add coa_account_id column to bank_accounts table
ALTER TABLE bank_accounts
ADD COLUMN coa_account_id TEXT REFERENCES chart_of_accounts(id);

-- Update existing bank accounts to link to COA based on coa_code
UPDATE bank_accounts ba
SET coa_account_id = (
  SELECT id FROM chart_of_accounts WHERE code = ba.coa_code LIMIT 1
)
WHERE coa_code IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_bank_accounts_coa_account_id ON bank_accounts(coa_account_id);
