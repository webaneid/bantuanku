-- Cleanup Vendors Legacy Address Column
-- Remove old address column that is now replaced by Indonesia Address System

-- IMPORTANT: Only run this AFTER all features are working with new address system!

-- Drop legacy address column
ALTER TABLE vendors
  DROP COLUMN IF EXISTS address;
