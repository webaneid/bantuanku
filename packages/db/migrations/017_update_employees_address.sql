-- Update Employees Table to Use Indonesia Address System
-- This migration adds foreign keys to the centralized address tables

-- Step 1: Add new address columns
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS detail_address TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT;

-- Step 2: Add foreign key constraints (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_province'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_province
        FOREIGN KEY (province_code)
        REFERENCES indonesia_provinces(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_regency'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_regency
        FOREIGN KEY (regency_code)
        REFERENCES indonesia_regencies(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_district'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_district
        FOREIGN KEY (district_code)
        REFERENCES indonesia_districts(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_village'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_village
        FOREIGN KEY (village_code)
        REFERENCES indonesia_villages(code)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_province ON employees(province_code);
CREATE INDEX IF NOT EXISTS idx_employees_regency ON employees(regency_code);
CREATE INDEX IF NOT EXISTS idx_employees_district ON employees(district_code);
CREATE INDEX IF NOT EXISTS idx_employees_village ON employees(village_code);

-- Note: Legacy column (address) is kept for backward compatibility
-- It can be removed in a future migration after all data has been migrated to the new system
