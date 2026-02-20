-- Create Mitra (Partner Organizations) Table

CREATE TABLE mitra (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,

  pic_name TEXT NOT NULL,
  pic_position TEXT,

  email TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  website TEXT,

  detail_address TEXT,
  province_code TEXT,
  regency_code TEXT,
  district_code TEXT,
  village_code TEXT,

  ktp_url TEXT,
  bank_book_url TEXT,
  npwp_url TEXT,

  status TEXT DEFAULT 'pending' NOT NULL,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP(3),
  rejection_reason TEXT,

  total_programs INTEGER DEFAULT 0,
  total_donation_received BIGINT DEFAULT 0,
  total_revenue_earned BIGINT DEFAULT 0,
  current_balance BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,

  user_id TEXT REFERENCES users(id),

  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- Foreign Keys for Address
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mitra_province') THEN
    ALTER TABLE mitra ADD CONSTRAINT fk_mitra_province FOREIGN KEY (province_code) REFERENCES indonesia_provinces(code) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mitra_regency') THEN
    ALTER TABLE mitra ADD CONSTRAINT fk_mitra_regency FOREIGN KEY (regency_code) REFERENCES indonesia_regencies(code) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mitra_district') THEN
    ALTER TABLE mitra ADD CONSTRAINT fk_mitra_district FOREIGN KEY (district_code) REFERENCES indonesia_districts(code) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mitra_village') THEN
    ALTER TABLE mitra ADD CONSTRAINT fk_mitra_village FOREIGN KEY (village_code) REFERENCES indonesia_villages(code) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mitra_slug ON mitra(slug);
CREATE INDEX IF NOT EXISTS idx_mitra_status ON mitra(status);
CREATE INDEX IF NOT EXISTS idx_mitra_user ON mitra(user_id);
CREATE INDEX IF NOT EXISTS idx_mitra_province ON mitra(province_code);
CREATE INDEX IF NOT EXISTS idx_mitra_regency ON mitra(regency_code);
