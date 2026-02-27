-- Update activity_reports Table to Use Indonesia Address System

-- Step 1: Add new address columns
ALTER TABLE activity_reports
  ADD COLUMN IF NOT EXISTS detail_address TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT;

-- Step 2: Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_reports_province'
  ) THEN
    ALTER TABLE activity_reports
      ADD CONSTRAINT fk_activity_reports_province
        FOREIGN KEY (province_code)
        REFERENCES indonesia_provinces(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_reports_regency'
  ) THEN
    ALTER TABLE activity_reports
      ADD CONSTRAINT fk_activity_reports_regency
        FOREIGN KEY (regency_code)
        REFERENCES indonesia_regencies(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_reports_district'
  ) THEN
    ALTER TABLE activity_reports
      ADD CONSTRAINT fk_activity_reports_district
        FOREIGN KEY (district_code)
        REFERENCES indonesia_districts(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_reports_village'
  ) THEN
    ALTER TABLE activity_reports
      ADD CONSTRAINT fk_activity_reports_village
        FOREIGN KEY (village_code)
        REFERENCES indonesia_villages(code)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_reports_province ON activity_reports(province_code);
CREATE INDEX IF NOT EXISTS idx_activity_reports_regency ON activity_reports(regency_code);
CREATE INDEX IF NOT EXISTS idx_activity_reports_district ON activity_reports(district_code);
CREATE INDEX IF NOT EXISTS idx_activity_reports_village ON activity_reports(village_code);
