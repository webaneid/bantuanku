-- Create zakat_types table
CREATE TABLE IF NOT EXISTS zakat_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  has_calculator BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Create zakat_donations table
CREATE TABLE IF NOT EXISTS zakat_donations (
  id TEXT PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,
  zakat_type_id TEXT NOT NULL REFERENCES zakat_types(id),

  -- Donatur
  donatur_id TEXT REFERENCES donatur(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,

  -- Amount
  amount BIGINT NOT NULL,

  -- Calculator data
  calculator_data JSONB,
  calculated_zakat BIGINT,

  -- Payment
  payment_method_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_gateway TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMP(3),

  -- Metadata
  notes TEXT,
  message TEXT,

  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Create zakat_distributions table
CREATE TABLE IF NOT EXISTS zakat_distributions (
  id TEXT PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,
  zakat_type_id TEXT NOT NULL REFERENCES zakat_types(id),

  -- Recipient (8 Asnaf)
  recipient_category TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_contact TEXT,

  -- Amount
  amount BIGINT NOT NULL,

  -- Detail
  purpose TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',

  -- Workflow
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP(3),
  disbursed_by TEXT REFERENCES users(id),
  disbursed_at TIMESTAMP(3),

  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_zakat_donations_zakat_type_id ON zakat_donations(zakat_type_id);
CREATE INDEX IF NOT EXISTS idx_zakat_donations_donatur_id ON zakat_donations(donatur_id);
CREATE INDEX IF NOT EXISTS idx_zakat_donations_payment_status ON zakat_donations(payment_status);
CREATE INDEX IF NOT EXISTS idx_zakat_distributions_zakat_type_id ON zakat_distributions(zakat_type_id);
CREATE INDEX IF NOT EXISTS idx_zakat_distributions_status ON zakat_distributions(status);
CREATE INDEX IF NOT EXISTS idx_zakat_distributions_recipient_category ON zakat_distributions(recipient_category);
