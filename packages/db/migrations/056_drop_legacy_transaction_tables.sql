-- Migration: Drop legacy transaction tables
-- All transaction data should now use the universal transactions table

-- Drop legacy tables
DROP TABLE IF EXISTS qurban_payments CASCADE;
DROP TABLE IF EXISTS qurban_orders CASCADE;
DROP TABLE IF EXISTS zakat_payments CASCADE;
DROP TABLE IF EXISTS zakat_donations CASCADE;
DROP TABLE IF EXISTS donation_payments CASCADE;
DROP TABLE IF EXISTS donation_evidence CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Update qurban_savings to use transaction_id instead of order_id
ALTER TABLE qurban_savings
  DROP COLUMN IF EXISTS converted_to_order_id CASCADE;

-- Update qurban_executions to use transaction_id instead of order_id
ALTER TABLE qurban_executions
  DROP COLUMN IF EXISTS order_id CASCADE;
