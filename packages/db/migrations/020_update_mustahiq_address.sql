-- Migration: Update mustahiq table to use centralized Indonesia address system
-- Description: Replace text-based address field with references to indonesia_* tables

-- Step 1: Add new address code columns
ALTER TABLE mustahiqs
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT,
  ADD COLUMN IF NOT EXISTS detail_address TEXT;

-- Step 2: Add foreign key constraints
ALTER TABLE mustahiqs
  ADD CONSTRAINT fk_mustahiq_province 
    FOREIGN KEY (province_code) 
    REFERENCES indonesia_provinces(code) 
    ON DELETE SET NULL,
  
  ADD CONSTRAINT fk_mustahiq_regency 
    FOREIGN KEY (regency_code) 
    REFERENCES indonesia_regencies(code) 
    ON DELETE SET NULL,
  
  ADD CONSTRAINT fk_mustahiq_district 
    FOREIGN KEY (district_code) 
    REFERENCES indonesia_districts(code) 
    ON DELETE SET NULL,
  
  ADD CONSTRAINT fk_mustahiq_village 
    FOREIGN KEY (village_code) 
    REFERENCES indonesia_villages(code) 
    ON DELETE SET NULL;

-- Step 3: Migrate existing data (if any exists)
-- Note: This copies the old text address to detail_address for manual review
UPDATE mustahiqs
SET detail_address = address
WHERE address IS NOT NULL AND address != '';

-- Step 4: Add comment for manual data migration reminder
COMMENT ON COLUMN mustahiqs.detail_address IS 'Street name, house number, RT/RW, etc. Old address field migrated here for manual review.';
COMMENT ON COLUMN mustahiqs.address IS 'DEPRECATED: Use province_code, regency_code, district_code, village_code instead';

-- Note: We keep the old 'address' column for now
-- It will be dropped in the next migration after verifying data migration
