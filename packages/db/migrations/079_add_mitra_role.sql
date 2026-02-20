INSERT INTO roles (id, name, slug, description, created_at, updated_at)
VALUES (
  'role_mitra_001',
  'Mitra',
  'mitra',
  'Akses dashboard mitra - kelola program dan laporan',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;
