-- Add fitrah_amount column to zakat_types table
-- Allows mitra to set custom zakat fitrah nominal per jiwa
ALTER TABLE zakat_types ADD COLUMN fitrah_amount NUMERIC(15,2);
