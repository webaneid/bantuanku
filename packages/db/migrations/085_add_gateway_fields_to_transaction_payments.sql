-- Add gateway-specific fields to transaction_payments for payment gateway integration
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP(3);
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS gateway_code TEXT;
ALTER TABLE transaction_payments ADD COLUMN IF NOT EXISTS webhook_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_transaction_payments_external_id ON transaction_payments(external_id);
