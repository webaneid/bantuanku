-- Migration: Add bank_account_id to transactions table
-- Purpose: Track which bank account receives the payment (sesuai blueprint COA)
-- Author: Claude Code
-- Date: 2026-02-12

-- Step 1: Add bank_account_id field (nullable for now to not break existing data)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS bank_account_id TEXT REFERENCES bank_accounts(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account
ON transactions(bank_account_id);

-- Step 3: Backfill existing transactions with default bank account
-- Note: This uses the first active operational bank account as default
-- If you have specific bank accounts for zakat/campaign, update accordingly
UPDATE transactions
SET bank_account_id = (
  SELECT id FROM bank_accounts
  WHERE is_active = true
  AND is_for_zakat = false
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1
)
WHERE bank_account_id IS NULL
AND payment_status = 'paid';

-- Step 4: Add comment for documentation
COMMENT ON COLUMN transactions.bank_account_id IS 'Bank account yang menerima pembayaran (sesuai blueprint COA - untuk tracking saldo bank)';

-- Note: We keep this nullable to not break existing pending transactions
-- New transactions MUST have bank_account_id set via application logic
