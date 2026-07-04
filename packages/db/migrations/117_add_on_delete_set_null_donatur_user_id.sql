-- Migration 117: Add ON DELETE SET NULL to donatur.user_id FK
-- Sebelumnya FK tanpa ON DELETE constraint — jika user dihapus, donatur.user_id menjadi dangling reference
-- Dengan SET NULL: jika user dihapus, donatur tetap ada dengan user_id = NULL (data donatur tidak ikut hilang)

ALTER TABLE donatur
  DROP CONSTRAINT IF EXISTS donatur_user_id_users_id_fk;

ALTER TABLE donatur
  ADD CONSTRAINT donatur_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
