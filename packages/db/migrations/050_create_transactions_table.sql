CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL,

  -- Product Reference (Polymorphic)
  product_type TEXT NOT NULL CHECK (product_type IN ('campaign', 'zakat', 'qurban')),
  product_id TEXT NOT NULL,

  -- Product Snapshot (Denormalized for display)
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image TEXT,

  -- Order Details
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price BIGINT NOT NULL,
  subtotal BIGINT NOT NULL,
  admin_fee BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL,

  -- Donor Information
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,

  -- Payment
  payment_method_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled')),
  paid_amount BIGINT DEFAULT 0,
  paid_at TIMESTAMP,

  -- Type-Specific Data (Conditional Fields as JSON)
  type_specific_data JSONB,

  message TEXT,
  notes TEXT,

  -- Ledger Integration
  ledger_entry_id TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
