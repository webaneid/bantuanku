-- Add admin_fee column to qurban_orders
-- This was added via db:push and was missing from migrations

ALTER TABLE qurban_orders ADD COLUMN IF NOT EXISTS admin_fee BIGINT DEFAULT 0;
