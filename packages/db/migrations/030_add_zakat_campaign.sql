-- Migration: Add default Zakat campaign
-- This campaign is used for all zakat donations from calculators

-- Insert Zakat campaign if it doesn't exist
INSERT INTO campaigns (
  id,
  slug,
  title,
  description,
  image_url,
  goal,
  category,
  pillar,
  is_featured,
  is_urgent,
  status,
  published_at,
  created_at,
  updated_at
)
SELECT
  'zakat-campaign-default',
  'zakat',
  'Zakat',
  'Tunaikan zakat Anda melalui platform kami. Zakat akan disalurkan kepada yang berhak menerimanya.',
  'https://placehold.co/800x600/10b981/white?text=Zakat',
  999999999999,
  'zakat',
  'Keagamaan',
  false,
  false,
  'active',
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM campaigns WHERE id = 'zakat-campaign-default'
);
