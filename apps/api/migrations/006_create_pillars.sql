-- Create pillars table (jenis donasi)
CREATE TABLE IF NOT EXISTS pillars (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default pillars (jenis donasi: Wakaf, Sedekah, Zakat, dll)
INSERT INTO pillars (id, slug, name, description, icon, color, sort_order, is_active, created_at, updated_at) VALUES
  ('pillar_wakaf', 'wakaf', 'Wakaf', 'Donasi wakaf untuk aset produktif', 'building-library', '#8b5cf6', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pillar_sedekah', 'sedekah', 'Sedekah', 'Sedekah umum untuk berbagai kebutuhan', 'hand-heart', '#22c55e', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pillar_zakat', 'zakat', 'Zakat', 'Zakat mal dan fitrah', 'banknotes', '#3b82f6', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pillar_infaq', 'infaq', 'Infaq', 'Infaq untuk pembangunan dan operasional', 'currency-dollar', '#f59e0b', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pillar_qurban', 'qurban', 'Qurban', 'Penyaluran hewan qurban', 'gift', '#ef4444', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
