-- Add rejected_by and rejected_at fields to transaction_payments table
ALTER TABLE transaction_payments ADD COLUMN rejected_by TEXT REFERENCES users(id);
ALTER TABLE transaction_payments ADD COLUMN rejected_at TIMESTAMP(3);
