-- Add coa_account_id column to bank_accounts table
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS coa_account_id TEXT REFERENCES chart_of_accounts(id);

-- Update existing bank accounts to link to COA based on coa_code (legacy migration)
-- Only runs if coa_code column exists (won't exist on fresh installs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_accounts' AND column_name = 'coa_code'
  ) THEN
    UPDATE bank_accounts ba
    SET coa_account_id = (
      SELECT id FROM chart_of_accounts WHERE code = ba.coa_code LIMIT 1
    )
    WHERE coa_code IS NOT NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_coa_account_id ON bank_accounts(coa_account_id);
