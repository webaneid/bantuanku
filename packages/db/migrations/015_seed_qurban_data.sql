-- Seed qurban periode dan packages untuk 2026

-- 1. Insert periode Qurban 1446 H / 2026
INSERT INTO qurban_periods (id, name, hijri_year, gregorian_year, start_date, end_date, execution_date, status, description)
VALUES (
  'qurban_period_1446',
  'Qurban 1446 H / 2026',
  '1446',
  2026,
  '2026-01-01',
  '2026-06-05',
  '2026-06-07',
  'active',
  'Periode Qurban tahun 1446 Hijriyah bertepatan dengan Idul Adha 2026. Penerimaan order dibuka sejak 1 Januari hingga 5 Juni 2026.'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert packages untuk periode 2026

-- Sapi Patungan 5 Orang
INSERT INTO qurban_packages (id, period_id, animal_type, package_type, name, description, price, max_slots, stock, is_available, is_featured)
VALUES (
  'pkg_sapi_5_2026',
  'qurban_period_1446',
  'cow',
  'shared',
  'Sapi A+ Patungan 5 Orang',
  'Sapi kualitas A+ dengan berat minimal 400kg, dibagi untuk 5 orang. Harga per slot Rp 5.000.000',
  5000000,
  5,
  20,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Sapi Patungan 7 Orang
INSERT INTO qurban_packages (id, period_id, animal_type, package_type, name, description, price, max_slots, stock, is_available)
VALUES (
  'pkg_sapi_7_2026',
  'qurban_period_1446',
  'cow',
  'shared',
  'Sapi Premium Patungan 7 Orang',
  'Sapi kualitas premium dengan berat minimal 500kg, dibagi untuk 7 orang. Harga per slot Rp 3.570.000',
  3570000,
  7,
  15,
  true
) ON CONFLICT (id) DO NOTHING;

-- Sapi Utuh
INSERT INTO qurban_packages (id, period_id, animal_type, package_type, name, description, price, max_slots, stock, is_available)
VALUES (
  'pkg_sapi_utuh_2026',
  'qurban_period_1446',
  'cow',
  'individual',
  'Sapi A+ Utuh (1 Ekor)',
  'Sapi kualitas A+ untuk 1 keluarga. Berat minimal 400kg. Dapat dibawa pulang atau didistribusikan ke mustahiq.',
  25000000,
  NULL,
  10,
  true
) ON CONFLICT (id) DO NOTHING;

-- Kambing Premium
INSERT INTO qurban_packages (id, period_id, animal_type, package_type, name, description, price, max_slots, stock, is_available, is_featured)
VALUES (
  'pkg_kambing_premium_2026',
  'qurban_period_1446',
  'goat',
  'individual',
  'Kambing Premium',
  'Kambing kualitas premium dengan berat minimal 25kg. Cocok untuk qurban perorangan.',
  3000000,
  NULL,
  50,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Kambing Reguler
INSERT INTO qurban_packages (id, period_id, animal_type, package_type, name, description, price, max_slots, stock, is_available)
VALUES (
  'pkg_kambing_reguler_2026',
  'qurban_period_1446',
  'goat',
  'individual',
  'Kambing Reguler',
  'Kambing kualitas baik dengan berat minimal 20kg. Harga terjangkau untuk qurban perorangan.',
  2500000,
  NULL,
  100,
  true
) ON CONFLICT (id) DO NOTHING;

-- Kambing Super
INSERT INTO qurban_packages (id, period_id, animal_type, package_type, name, description, price, max_slots, stock, is_available)
VALUES (
  'pkg_kambing_super_2026',
  'qurban_period_1446',
  'goat',
  'individual',
  'Kambing Super',
  'Kambing kualitas super dengan berat minimal 30kg. Pilihan terbaik untuk qurban.',
  3500000,
  NULL,
  30,
  true
) ON CONFLICT (id) DO NOTHING;
