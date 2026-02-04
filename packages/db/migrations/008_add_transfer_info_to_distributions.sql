-- Migration: Add transfer info fields to zakat_distributions
-- Date: 2026-01-23
-- Purpose: Add bank account and transfer proof fields for approval workflow

ALTER TABLE zakat_distributions 
ADD COLUMN IF NOT EXISTS source_bank_id text,
ADD COLUMN IF NOT EXISTS source_bank_name text,
ADD COLUMN IF NOT EXISTS source_bank_account text,
ADD COLUMN IF NOT EXISTS target_bank_name text,
ADD COLUMN IF NOT EXISTS target_bank_account text,
ADD COLUMN IF NOT EXISTS target_bank_account_name text,
ADD COLUMN IF NOT EXISTS transfer_proof text;

-- Comments
COMMENT ON COLUMN zakat_distributions.source_bank_id IS 'ID from payment_bank_accounts setting';
COMMENT ON COLUMN zakat_distributions.source_bank_name IS 'Source bank name (from yayasan accounts)';
COMMENT ON COLUMN zakat_distributions.source_bank_account IS 'Source account number';
COMMENT ON COLUMN zakat_distributions.target_bank_name IS 'Target bank name (from employee/mustahiq)';
COMMENT ON COLUMN zakat_distributions.target_bank_account IS 'Target account number';
COMMENT ON COLUMN zakat_distributions.target_bank_account_name IS 'Target account holder name';
COMMENT ON COLUMN zakat_distributions.transfer_proof IS 'URL or path to transfer proof file';
