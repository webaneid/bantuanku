-- Create zakat_periods table
CREATE TABLE IF NOT EXISTS zakat_periods (
  id TEXT PRIMARY KEY,
  zakat_type_id TEXT NOT NULL REFERENCES zakat_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  hijri_year TEXT,
  start_date TIMESTAMP(3) NOT NULL,
  end_date TIMESTAMP(3) NOT NULL,
  deadline TIMESTAMP(3),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zakat_periods_type ON zakat_periods(zakat_type_id);
CREATE INDEX idx_zakat_periods_year ON zakat_periods(year);
CREATE INDEX idx_zakat_periods_active ON zakat_periods(is_active);
