-- Add calculator_type column to zakat_types table
-- Maps to fixed calculator slugs: zakat-fitrah, zakat-maal, zakat-profesi, zakat-pertanian, zakat-peternakan
ALTER TABLE zakat_types ADD COLUMN calculator_type TEXT;

-- Backfill existing records from their slug
UPDATE zakat_types SET calculator_type = slug;
