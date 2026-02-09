-- Add admin_fee column to qurban_orders table
ALTER TABLE qurban_orders
ADD COLUMN IF NOT EXISTS admin_fee BIGINT NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN qurban_orders.admin_fee IS 'Biaya administrasi penyembelihan dan dokumentasi';
