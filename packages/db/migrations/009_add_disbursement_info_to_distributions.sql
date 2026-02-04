-- Migration: Add disbursement documentation fields to zakat_distributions
-- Date: 2026-01-23
-- Purpose: Add fields for tracking actual disbursement activities with photos and description

ALTER TABLE zakat_distributions 
ADD COLUMN IF NOT EXISTS disbursement_date timestamp(3),
ADD COLUMN IF NOT EXISTS disbursement_description text,
ADD COLUMN IF NOT EXISTS disbursement_photos text;

-- Comments
COMMENT ON COLUMN zakat_distributions.disbursement_date IS 'Actual date when zakat was distributed to recipients';
COMMENT ON COLUMN zakat_distributions.disbursement_description IS 'Description of the disbursement activity';
COMMENT ON COLUMN zakat_distributions.disbursement_photos IS 'JSON array of photo URLs documenting the activity';
