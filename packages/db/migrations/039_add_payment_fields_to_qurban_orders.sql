-- Add payment_method_id and metadata columns to qurban_orders table

ALTER TABLE qurban_orders
ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS metadata TEXT;
