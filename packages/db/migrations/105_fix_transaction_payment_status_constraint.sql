-- Fix payment_status check constraint to include all valid statuses
-- Original constraint only had: pending, partial, paid, cancelled
-- Code also uses: processing, failed, expired

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_status_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_payment_status_check
  CHECK (payment_status IN ('pending', 'processing', 'partial', 'paid', 'failed', 'expired', 'cancelled'));
