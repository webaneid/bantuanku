-- Cleanup Donatur Legacy Address Columns
-- Remove old address columns that are now replaced by Indonesia Address System

-- Drop legacy address columns
ALTER TABLE donatur
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS province,
  DROP COLUMN IF EXISTS postal_code;
