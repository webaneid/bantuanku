-- Migration 033: Refactor package-period relationship from 1:1 to many-to-many
-- This allows one package to be sold in multiple periods with different prices
-- Example: "Sapi Premium 7 Orang" can be sold in 2026, 2027, 2028 with different prices

-- Step 1: Create junction table for package-period pricing
CREATE TABLE IF NOT EXISTS qurban_package_periods (
  id TEXT PRIMARY KEY NOT NULL,
  package_id TEXT NOT NULL REFERENCES qurban_packages(id) ON DELETE CASCADE,
  period_id TEXT NOT NULL REFERENCES qurban_periods(id) ON DELETE CASCADE,

  -- Period-specific data (moved from qurban_packages)
  price BIGINT NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  stock_sold INTEGER DEFAULT 0 NOT NULL,
  slots_filled INTEGER DEFAULT 0 NOT NULL, -- For shared packages only

  -- Availability can differ per period
  is_available BOOLEAN DEFAULT true NOT NULL,

  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,

  -- Ensure unique package-period combination
  UNIQUE(package_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_qurban_package_periods_package ON qurban_package_periods(package_id);
CREATE INDEX IF NOT EXISTS idx_qurban_package_periods_period ON qurban_package_periods(period_id);
CREATE INDEX IF NOT EXISTS idx_qurban_package_periods_availability ON qurban_package_periods(is_available);

-- Step 2: Migrate existing package data to junction table
-- Each existing package will become a package-period association
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
SELECT
  'qpp_' || id as id,
  id as package_id,
  period_id,
  price,
  stock,
  stock_sold,
  COALESCE(slots_filled, 0) as slots_filled,
  is_available
FROM qurban_packages
ON CONFLICT (package_id, period_id) DO NOTHING;

-- Step 3: Remove period-specific columns from qurban_packages
-- First, drop the foreign key constraint
ALTER TABLE qurban_packages DROP CONSTRAINT IF EXISTS qurban_packages_period_id_qurban_periods_id_fk;

-- Drop the columns
ALTER TABLE qurban_packages DROP COLUMN IF EXISTS period_id;
ALTER TABLE qurban_packages DROP COLUMN IF EXISTS price;
ALTER TABLE qurban_packages DROP COLUMN IF EXISTS stock;
ALTER TABLE qurban_packages DROP COLUMN IF EXISTS stock_sold;
ALTER TABLE qurban_packages DROP COLUMN IF EXISTS slots_filled;

-- Note: is_available stays in qurban_packages as master availability
-- Individual period availability is in qurban_package_periods

-- Step 4: Update qurban_orders to reference package-period
-- Add new column for package_period reference
ALTER TABLE qurban_orders ADD COLUMN IF NOT EXISTS package_period_id TEXT;

-- Populate package_period_id based on existing packageId
-- We need to find the matching package-period combination
UPDATE qurban_orders o
SET package_period_id = (
  SELECT qpp.id
  FROM qurban_package_periods qpp
  JOIN qurban_packages qp ON qpp.package_id = qp.id
  WHERE qp.id = o.package_id
  LIMIT 1
)
WHERE o.package_period_id IS NULL;

-- Add foreign key constraint
ALTER TABLE qurban_orders
ADD CONSTRAINT qurban_orders_package_period_id_fkey
FOREIGN KEY (package_period_id) REFERENCES qurban_package_periods(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_qurban_orders_package_period ON qurban_orders(package_period_id);

-- Step 5: Update qurban_savings to reference package-period
ALTER TABLE qurban_savings ADD COLUMN IF NOT EXISTS target_package_period_id TEXT;

-- Populate target_package_period_id based on existing target_package_id and target_period_id
UPDATE qurban_savings qs
SET target_package_period_id = (
  SELECT qpp.id
  FROM qurban_package_periods qpp
  WHERE qpp.package_id = qs.target_package_id
    AND qpp.period_id = qs.target_period_id
  LIMIT 1
)
WHERE qs.target_package_period_id IS NULL;

-- Add foreign key constraint
ALTER TABLE qurban_savings
ADD CONSTRAINT qurban_savings_target_package_period_id_fkey
FOREIGN KEY (target_package_period_id) REFERENCES qurban_package_periods(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_qurban_savings_package_period ON qurban_savings(target_package_period_id);

-- Note: We keep the old columns (target_package_id, target_period_id) for backward compatibility
-- They can be removed in a future migration after all APIs are updated
