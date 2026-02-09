-- Add package_period_id column to qurban_shared_groups table
ALTER TABLE qurban_shared_groups
ADD COLUMN IF NOT EXISTS package_period_id TEXT REFERENCES qurban_package_periods(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_qurban_shared_groups_package_period ON qurban_shared_groups(package_period_id);
