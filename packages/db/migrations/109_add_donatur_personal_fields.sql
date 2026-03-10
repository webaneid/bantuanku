-- Migration 109: Add personal fields to donatur (NIK, NPWP, birth place, birth date, gender)

ALTER TABLE donatur ADD COLUMN IF NOT EXISTS nik VARCHAR(16);
ALTER TABLE donatur ADD COLUMN IF NOT EXISTS npwp VARCHAR(25);
ALTER TABLE donatur ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100);
ALTER TABLE donatur ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE donatur ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
