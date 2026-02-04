-- Update Donatur Table to Use Indonesia Address System
-- This migration adds foreign keys to the centralized address tables

-- Step 1: Add new address columns
ALTER TABLE donatur
  ADD COLUMN IF NOT EXISTS detail_address TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT;

-- Step 2: Add foreign key constraints (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_donatur_province'
  ) THEN
    ALTER TABLE donatur
      ADD CONSTRAINT fk_donatur_province
        FOREIGN KEY (province_code)
        REFERENCES indonesia_provinces(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_donatur_regency'
  ) THEN
    ALTER TABLE donatur
      ADD CONSTRAINT fk_donatur_regency
        FOREIGN KEY (regency_code)
        REFERENCES indonesia_regencies(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_donatur_district'
  ) THEN
    ALTER TABLE donatur
      ADD CONSTRAINT fk_donatur_district
        FOREIGN KEY (district_code)
        REFERENCES indonesia_districts(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_donatur_village'
  ) THEN
    ALTER TABLE donatur
      ADD CONSTRAINT fk_donatur_village
        FOREIGN KEY (village_code)
        REFERENCES indonesia_villages(code)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_donatur_province ON donatur(province_code);
CREATE INDEX IF NOT EXISTS idx_donatur_regency ON donatur(regency_code);
CREATE INDEX IF NOT EXISTS idx_donatur_district ON donatur(district_code);
CREATE INDEX IF NOT EXISTS idx_donatur_village ON donatur(village_code);

-- Note: Legacy columns (address, city, province, postal_code) are kept for backward compatibility
-- They can be removed in a future migration after all data has been migrated to the new system
