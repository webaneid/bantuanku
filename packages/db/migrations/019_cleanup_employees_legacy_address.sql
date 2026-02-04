-- Cleanup Employees Legacy Address Column
-- Remove old address column that is now replaced by Indonesia Address System

-- Drop legacy address column
ALTER TABLE employees
  DROP COLUMN IF EXISTS address;
