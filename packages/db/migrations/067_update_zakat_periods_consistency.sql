-- Update zakat_periods to match qurban_periods structure
ALTER TABLE zakat_periods DROP COLUMN IF EXISTS is_active;
ALTER TABLE zakat_periods DROP COLUMN IF EXISTS deadline;
ALTER TABLE zakat_periods ADD COLUMN IF NOT EXISTS execution_date TIMESTAMP(3);
ALTER TABLE zakat_periods ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
