-- Add is_default column to pillars table
ALTER TABLE pillars ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false NOT NULL;

-- Insert or update 3 default pillars that cannot be edited or deleted
-- 1. Sedekah
INSERT INTO pillars (id, slug, name, description, icon, color, sort_order, is_active, is_default, created_at, updated_at) VALUES
  ('pillar_sedekah', 'sedekah', 'Sedekah', 'Sedekah umum untuk berbagai kebutuhan', 'hand-heart', '#22c55e', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_default = true,
  updated_at = CURRENT_TIMESTAMP;

-- 2. Fidyah
INSERT INTO pillars (id, slug, name, description, icon, color, sort_order, is_active, is_default, created_at, updated_at) VALUES
  ('pillar_fidyah', 'fidyah', 'Fidyah', 'Fidyah pengganti puasa yang terlewat', 'calendar', '#f59e0b', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_default = true,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Wakaf
INSERT INTO pillars (id, slug, name, description, icon, color, sort_order, is_active, is_default, created_at, updated_at) VALUES
  ('pillar_wakaf', 'wakaf', 'Wakaf', 'Donasi wakaf untuk aset produktif', 'building-library', '#8b5cf6', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_default = true,
  updated_at = CURRENT_TIMESTAMP;
