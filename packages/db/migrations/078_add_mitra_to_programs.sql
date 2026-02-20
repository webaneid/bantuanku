-- Add mitra_id to campaigns, zakat_periods, and qurban_periods

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS mitra_id TEXT REFERENCES mitra(id);
CREATE INDEX IF NOT EXISTS idx_campaigns_mitra ON campaigns(mitra_id);

ALTER TABLE zakat_periods ADD COLUMN IF NOT EXISTS mitra_id TEXT REFERENCES mitra(id);
CREATE INDEX IF NOT EXISTS idx_zakat_periods_mitra ON zakat_periods(mitra_id);

ALTER TABLE qurban_periods ADD COLUMN IF NOT EXISTS mitra_id TEXT REFERENCES mitra(id);
CREATE INDEX IF NOT EXISTS idx_qurban_periods_mitra ON qurban_periods(mitra_id);
