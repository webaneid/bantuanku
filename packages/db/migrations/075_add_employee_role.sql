-- Add employee and program_coordinator roles
INSERT INTO roles (id, slug, name, description, is_system, created_at, updated_at)
VALUES
  ('role_employee_001', 'employee', 'Employee', 'Karyawan dengan akses terbatas ke dashboard admin', true, NOW(), NOW()),
  ('role_progcoord_001', 'program_coordinator', 'Program Coordinator', 'Koordinator program yang mengelola campaign yang ditugaskan', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
