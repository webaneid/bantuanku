-- Add COA accounts for Qurban and Admin Fee if not exists
-- 4300: Pendapatan Qurban (main qurban income)
-- 4310: Biaya Admin Qurban (admin fee income)

-- Insert 4300 if not exists
INSERT INTO chart_of_accounts (id, code, name, type, category, normal_balance, level, is_active, is_system, description, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  '4300',
  'Pendapatan Qurban',
  'income',
  'qurban',
  'credit',
  2,
  true,
  true,
  'Pendapatan dari penjualan paket qurban (tidak termasuk biaya admin)',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE code = '4300'
);

-- Insert 4310 if not exists
INSERT INTO chart_of_accounts (id, code, name, type, category, normal_balance, level, is_active, is_system, description, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  '4310',
  'Biaya Admin Qurban',
  'income',
  'qurban_admin',
  'credit',
  3,
  true,
  true,
  'Pendapatan dari biaya administrasi penyembelihan qurban',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts WHERE code = '4310'
);
