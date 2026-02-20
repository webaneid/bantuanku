-- Add unique_code column to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS unique_code INTEGER DEFAULT 0;

-- Index for efficient uniqueness checking
CREATE INDEX IF NOT EXISTS idx_transactions_unique_code_lookup
  ON transactions(total_amount, payment_status)
  WHERE payment_status = 'pending' AND unique_code > 0;
