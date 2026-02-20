-- File: packages/db/migrations/057_add_category_to_transactions.sql

-- Add category field
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'income' NOT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_transactions_category
ON transactions(category);

-- Backfill category based on product_type and product_name
UPDATE transactions
SET category = CASE
  -- Zakat categories
  WHEN product_type = 'zakat' AND product_name ILIKE '%fitrah%' THEN 'zakat_fitrah'
  WHEN product_type = 'zakat' AND product_name ILIKE '%maal%' THEN 'zakat_maal'
  WHEN product_type = 'zakat' AND product_name ILIKE '%profesi%' THEN 'zakat_profesi'
  WHEN product_type = 'zakat' AND product_name ILIKE '%pertanian%' THEN 'zakat_pertanian'
  WHEN product_type = 'zakat' AND product_name ILIKE '%peternakan%' THEN 'zakat_peternakan'
  WHEN product_type = 'zakat' THEN 'zakat_maal' -- default zakat

  -- Qurban categories
  WHEN product_type = 'qurban' AND type_specific_data->>'payment_type' = 'savings' THEN 'qurban_savings'
  WHEN product_type = 'qurban' THEN 'qurban_payment'

  -- Campaign default
  WHEN product_type = 'campaign' THEN 'campaign_donation'

  -- Fallback
  ELSE 'campaign_donation'
END
WHERE category IS NULL;

-- Make category required for future rows
ALTER TABLE transactions
ALTER COLUMN category SET NOT NULL;
