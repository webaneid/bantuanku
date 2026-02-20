-- Add created_by column to zakat_types table
-- This allows tracking who created the zakat type (especially for mitra-scoped types)
ALTER TABLE zakat_types ADD COLUMN created_by TEXT REFERENCES users(id);
