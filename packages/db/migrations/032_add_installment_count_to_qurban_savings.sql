-- Add installment_count field to qurban_savings table
-- This field stores how many installments the user chose (3x, 6x, 12x, 24x)
-- It helps calculate the installment_amount automatically: target_amount ÷ installment_count

ALTER TABLE qurban_savings
ADD COLUMN IF NOT EXISTS installment_count INTEGER;

-- Set default value for existing records based on calculation
-- installment_count = target_amount ÷ installment_amount (rounded up)
UPDATE qurban_savings
SET installment_count = CASE
  WHEN installment_amount > 0 THEN CEIL(target_amount::NUMERIC / installment_amount::NUMERIC)::INTEGER
  ELSE 6 -- default to 6 if calculation fails
END
WHERE installment_count IS NULL;

-- Add NOT NULL constraint after setting defaults
ALTER TABLE qurban_savings
ALTER COLUMN installment_count SET NOT NULL;

-- Add check constraint to ensure valid installment counts
ALTER TABLE qurban_savings
ADD CONSTRAINT valid_installment_count CHECK (installment_count > 0 AND installment_count <= 100);
