-- Create donatur table (terpisah dari users yang untuk admin)
CREATE TABLE IF NOT EXISTS donatur (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  avatar TEXT,

  -- Stats donasi
  total_donations BIGINT DEFAULT 0 NOT NULL,
  total_amount BIGINT DEFAULT 0 NOT NULL,

  -- Verification
  email_verified_at TIMESTAMP,
  phone_verified_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_anonymous BOOLEAN DEFAULT false NOT NULL,

  -- Timestamps
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donatur_email ON donatur(email);
CREATE INDEX IF NOT EXISTS idx_donatur_phone ON donatur(phone);
CREATE INDEX IF NOT EXISTS idx_donatur_created_at ON donatur(created_at);

-- Add donatur_id to donations table (nullable untuk backward compatibility)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donatur_id TEXT REFERENCES donatur(id);
CREATE INDEX IF NOT EXISTS idx_donations_donatur_id ON donations(donatur_id);

-- Note: user_id tetap ada untuk backward compatibility dengan data lama
-- Untuk data baru, gunakan donatur_id
