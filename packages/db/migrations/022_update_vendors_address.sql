-- Update Vendors Table to Use Indonesia Address System
-- Add new address columns and foreign key constraints

-- Step 1: Add new address columns
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS detail_address TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT;

-- Step 2: Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_province'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT fk_vendors_province
        FOREIGN KEY (province_code)
        REFERENCES indonesia_provinces(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_regency'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT fk_vendors_regency
        FOREIGN KEY (regency_code)
        REFERENCES indonesia_regencies(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_district'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT fk_vendors_district
        FOREIGN KEY (district_code)
        REFERENCES indonesia_districts(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendors_village'
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT fk_vendors_village
        FOREIGN KEY (village_code)
        REFERENCES indonesia_villages(code)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_province ON vendors(province_code);
CREATE INDEX IF NOT EXISTS idx_vendors_regency ON vendors(regency_code);
CREATE INDEX IF NOT EXISTS idx_vendors_district ON vendors(district_code);
CREATE INDEX IF NOT EXISTS idx_vendors_village ON vendors(village_code);

-- Note: Legacy columns (address, city, province, postal_code) are kept for backward compatibility
-- They will be removed in cleanup migration after all features are working
