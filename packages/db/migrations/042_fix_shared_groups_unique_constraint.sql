-- Fix unique constraint for qurban_shared_groups to use package_period_id

-- 1. Update existing shared groups with package_period_id from their orders
UPDATE qurban_shared_groups sg
SET package_period_id = (
  SELECT DISTINCT o.package_period_id
  FROM qurban_orders o
  WHERE o.shared_group_id = sg.id
  LIMIT 1
)
WHERE sg.package_period_id IS NULL
AND EXISTS (
  SELECT 1 FROM qurban_orders o
  WHERE o.shared_group_id = sg.id
);

-- 2. Drop old unique constraint on (package_id, group_number)
ALTER TABLE qurban_shared_groups
DROP CONSTRAINT IF EXISTS qurban_shared_groups_package_id_group_number_key;

-- 3. Add new unique constraint on (package_period_id, group_number)
ALTER TABLE qurban_shared_groups
ADD CONSTRAINT qurban_shared_groups_package_period_id_group_number_key
UNIQUE (package_period_id, group_number);
