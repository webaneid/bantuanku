-- Seed qurban data dengan schema baru

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

-- 2. Insert master packages (tanpa period_id)

-- Sapi Patungan 5 Orang
INSERT INTO qurban_packages (id, animal_type, package_type, name, description, max_slots, is_available, is_featured)
VALUES (
  'pkg_sapi_5',
  'cow',
  'shared',
  'Sapi A+ Patungan 5 Orang',
  'Sapi kualitas A+ dengan berat minimal 400kg, dibagi untuk 5 orang',
  5,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Sapi Patungan 7 Orang
INSERT INTO qurban_packages (id, animal_type, package_type, name, description, max_slots, is_available)
VALUES (
  'pkg_sapi_7',
  'cow',
  'shared',
  'Sapi Premium Patungan 7 Orang',
  'Sapi kualitas premium dengan berat minimal 500kg, dibagi untuk 7 orang',
  7,
  true
) ON CONFLICT (id) DO NOTHING;

-- Sapi Utuh
INSERT INTO qurban_packages (id, animal_type, package_type, name, description, max_slots, is_available)
VALUES (
  'pkg_sapi_utuh',
  'cow',
  'individual',
  'Sapi A+ Utuh (1 Ekor)',
  'Sapi kualitas A+ untuk 1 keluarga. Berat minimal 400kg. Dapat dibawa pulang atau didistribusikan ke mustahiq.',
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Kambing Premium
INSERT INTO qurban_packages (id, animal_type, package_type, name, description, max_slots, is_available, is_featured)
VALUES (
  'pkg_kambing_premium',
  'goat',
  'individual',
  'Kambing Premium',
  'Kambing kualitas premium dengan berat minimal 25kg. Cocok untuk qurban perorangan.',
  NULL,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Kambing Reguler
INSERT INTO qurban_packages (id, animal_type, package_type, name, description, max_slots, is_available)
VALUES (
  'pkg_kambing_reguler',
  'goat',
  'individual',
  'Kambing Reguler',
  'Kambing kualitas baik dengan berat minimal 20kg. Harga terjangkau untuk qurban perorangan.',
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- Kambing Super
INSERT INTO qurban_packages (id, animal_type, package_type, name, description, max_slots, is_available)
VALUES (
  'pkg_kambing_super',
  'goat',
  'individual',
  'Kambing Super',
  'Kambing kualitas super dengan berat minimal 30kg. Pilihan terbaik untuk qurban.',
  NULL,
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Link packages dengan period 2026 (qurban_package_periods)

-- Sapi Patungan 5 - Period 2026
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
VALUES (
  'pp_sapi_5_2026',
  'pkg_sapi_5',
  'qurban_period_1446',
  5000000,
  20,
  0,
  0,
  true
) ON CONFLICT (package_id, period_id) DO NOTHING;

-- Sapi Patungan 7 - Period 2026
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
VALUES (
  'pp_sapi_7_2026',
  'pkg_sapi_7',
  'qurban_period_1446',
  3570000,
  15,
  0,
  0,
  true
) ON CONFLICT (package_id, period_id) DO NOTHING;

-- Sapi Utuh - Period 2026
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
VALUES (
  'pp_sapi_utuh_2026',
  'pkg_sapi_utuh',
  'qurban_period_1446',
  25000000,
  10,
  0,
  0,
  true
) ON CONFLICT (package_id, period_id) DO NOTHING;

-- Kambing Premium - Period 2026
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
VALUES (
  'pp_kambing_premium_2026',
  'pkg_kambing_premium',
  'qurban_period_1446',
  3000000,
  50,
  0,
  0,
  true
) ON CONFLICT (package_id, period_id) DO NOTHING;

-- Kambing Reguler - Period 2026
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
VALUES (
  'pp_kambing_reguler_2026',
  'pkg_kambing_reguler',
  'qurban_period_1446',
  2500000,
  100,
  0,
  0,
  true
) ON CONFLICT (package_id, period_id) DO NOTHING;

-- Kambing Super - Period 2026
INSERT INTO qurban_package_periods (id, package_id, period_id, price, stock, stock_sold, slots_filled, is_available)
VALUES (
  'pp_kambing_super_2026',
  'pkg_kambing_super',
  'qurban_period_1446',
  3500000,
  30,
  0,
  0,
  true
) ON CONFLICT (package_id, period_id) DO NOTHING;
