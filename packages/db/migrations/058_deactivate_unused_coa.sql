-- File: packages/db/migrations/058_deactivate_unused_coa.sql

-- Nonaktifkan 18 COA expense yang tidak pernah dipakai
UPDATE chart_of_accounts
SET is_active = false,
    description = COALESCE(description, '') || ' [DEPRECATED: Replaced by category system]'
WHERE code IN (
  -- Beban Program yang tidak dipakai
  '5110', '5120', '5130',

  -- Beban Operasional yang tidak dipakai
  '5200', '5210', '5220', '5230', '5240', '5250',
  '5260', '5270', '5280',

  -- Penyaluran Zakat (7xxx) yang tidak dipakai
  '7200', '7201', '7202', '7203', '7204', '7205'
)
AND is_active = true;

-- Tambah note ke COA yang masih aktif
UPDATE chart_of_accounts
SET description = COALESCE(description, '') || ' [LEGACY: Keep for backward compatibility]'
WHERE code IN ('5000', '5100', '5140', '5290', '6201', '62001')
AND is_active = true;
