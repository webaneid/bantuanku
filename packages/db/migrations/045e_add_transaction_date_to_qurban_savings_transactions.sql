-- Add transaction_date column to qurban_savings_transactions
-- Migration 037 created this table without transaction_date
-- Migration 013 (not in manifest) had it, but 037 doesn't

ALTER TABLE qurban_savings_transactions
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP(3) DEFAULT now() NOT NULL;
