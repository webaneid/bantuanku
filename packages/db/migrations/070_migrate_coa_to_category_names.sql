-- Migrate existing transactions from COA codes to category names
-- This migration converts category values from COA codes (e.g., "4100", "4200") to simple names (e.g., "campaign_donation", "zakat_fitrah")

-- Update campaign donations (4100 -> campaign_donation)
UPDATE transactions
SET category = 'campaign_donation'
WHERE category = '4100' AND product_type = 'campaign';

-- Update zakat transactions (4200 -> various zakat types based on product name)
-- Zakat Fitrah
UPDATE transactions
SET category = 'zakat_fitrah'
WHERE category = '4200'
  AND product_type = 'zakat'
  AND LOWER(product_name) LIKE '%fitrah%';

-- Zakat Maal
UPDATE transactions
SET category = 'zakat_maal'
WHERE category = '4200'
  AND product_type = 'zakat'
  AND LOWER(product_name) LIKE '%maal%';

-- Zakat Profesi/Penghasilan
UPDATE transactions
SET category = 'zakat_profesi'
WHERE category = '4200'
  AND product_type = 'zakat'
  AND (LOWER(product_name) LIKE '%profesi%' OR LOWER(product_name) LIKE '%penghasilan%');

-- Zakat Pertanian
UPDATE transactions
SET category = 'zakat_pertanian'
WHERE category = '4200'
  AND product_type = 'zakat'
  AND LOWER(product_name) LIKE '%pertanian%';

-- Zakat Peternakan
UPDATE transactions
SET category = 'zakat_peternakan'
WHERE category = '4200'
  AND product_type = 'zakat'
  AND LOWER(product_name) LIKE '%peternakan%';

-- Zakat Bisnis/Perdagangan
UPDATE transactions
SET category = 'zakat_bisnis'
WHERE category = '4200'
  AND product_type = 'zakat'
  AND (LOWER(product_name) LIKE '%bisnis%' OR LOWER(product_name) LIKE '%perdagangan%');

-- Remaining zakat transactions (default to zakat_maal)
UPDATE transactions
SET category = 'zakat_maal'
WHERE category = '4200' AND product_type = 'zakat';

-- Update qurban transactions
-- Check type_specific_data for payment_type to determine if savings or payment
-- Qurban Savings
UPDATE transactions
SET category = 'qurban_savings'
WHERE category = '4300'
  AND product_type = 'qurban'
  AND type_specific_data->>'payment_type' = 'savings';

-- Qurban Payment (default for remaining 4300)
UPDATE transactions
SET category = 'qurban_payment'
WHERE category = '4300'
  AND product_type = 'qurban'
  AND category != 'qurban_savings';

-- Update qurban admin fee (4310 -> qurban_admin_fee)
UPDATE transactions
SET category = 'qurban_admin_fee'
WHERE category = '4310' AND product_type = 'qurban';

-- Update any disbursement categories if they exist
-- Zakat disbursements
UPDATE transactions
SET category = 'zakat_to_fakir'
WHERE category = '5100' AND product_type = 'zakat';

UPDATE transactions
SET category = 'zakat_to_miskin'
WHERE category = '5110' AND product_type = 'zakat';

-- Qurban disbursements
UPDATE transactions
SET category = 'qurban_purchase_sapi'
WHERE category = '5200' AND product_type = 'qurban' AND LOWER(product_name) LIKE '%sapi%';

UPDATE transactions
SET category = 'qurban_purchase_kambing'
WHERE category = '5200' AND product_type = 'qurban' AND LOWER(product_name) LIKE '%kambing%';

UPDATE transactions
SET category = 'qurban_execution_fee'
WHERE category = '5210' AND product_type = 'qurban';

-- Campaign disbursements
UPDATE transactions
SET category = 'campaign_to_beneficiary'
WHERE category = '5300' AND product_type = 'campaign';
