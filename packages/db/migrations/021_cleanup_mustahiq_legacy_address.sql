-- Migration: Cleanup legacy address column from mustahiqs table
-- Description: Drop the old text-based address column after migration to address codes

-- Safety check: Only run this after verifying address codes are properly populated
-- DROP COLUMN IF EXISTS address;

ALTER TABLE mustahiqs
  DROP COLUMN IF EXISTS address;

-- Clean up comments
COMMENT ON COLUMN mustahiqs.detail_address IS 'Street name, house number, RT/RW, etc. For complete address, join with indonesia_* tables using the code columns.';
