-- Migration: Update zakat types to set pertanian and peternakan as active with calculators
-- This enables the frontend calculators for these zakat types

UPDATE zakat_types
SET
  has_calculator = true,
  is_active = true,
  updated_at = NOW()
WHERE slug IN ('zakat-pertanian', 'zakat-peternakan');
