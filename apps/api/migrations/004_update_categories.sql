-- Update categories from pillar to actual campaign categories
DELETE FROM categories;

INSERT INTO categories (id, slug, name, description, icon, color, sort_order, is_active, created_at, updated_at) VALUES
  ('cat_pendidikan', 'pendidikan', 'Pendidikan', 'Program pendidikan dan beasiswa', 'academic-cap', '#3b82f6', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_kesehatan', 'kesehatan', 'Kesehatan', 'Bantuan kesehatan dan pengobatan', 'heart', '#ef4444', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_bencana', 'bencana', 'Bencana Alam', 'Tanggap bencana dan pemulihan', 'exclamation-triangle', '#f97316', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_sosial', 'sosial', 'Sosial', 'Program sosial kemasyarakatan', 'users', '#22c55e', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_kemanusiaan', 'kemanusiaan', 'Kemanusiaan', 'Bantuan kemanusiaan', 'hand-heart', '#8b5cf6', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_lingkungan', 'lingkungan', 'Lingkungan', 'Pelestarian lingkungan', 'globe', '#10b981', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
