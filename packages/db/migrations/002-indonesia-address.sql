-- Create Indonesia Address Tables
-- Provinces (Provinsi)
CREATE TABLE IF NOT EXISTS indonesia_provinces (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Regencies (Kabupaten/Kota)
CREATE TABLE IF NOT EXISTS indonesia_regencies (
  code TEXT PRIMARY KEY,
  province_code TEXT NOT NULL REFERENCES indonesia_provinces(code),
  name TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Districts (Kecamatan)
CREATE TABLE IF NOT EXISTS indonesia_districts (
  code TEXT PRIMARY KEY,
  regency_code TEXT NOT NULL REFERENCES indonesia_regencies(code),
  name TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Villages (Kelurahan/Desa)
CREATE TABLE IF NOT EXISTS indonesia_villages (
  code TEXT PRIMARY KEY,
  district_code TEXT NOT NULL REFERENCES indonesia_districts(code),
  name TEXT NOT NULL,
  postal_code TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_regencies_province ON indonesia_regencies(province_code);
CREATE INDEX IF NOT EXISTS idx_districts_regency ON indonesia_districts(regency_code);
CREATE INDEX IF NOT EXISTS idx_villages_district ON indonesia_villages(district_code);
CREATE INDEX IF NOT EXISTS idx_villages_postal ON indonesia_villages(postal_code) WHERE postal_code IS NOT NULL;
