CREATE TABLE transaction_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  -- Payment Details
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  payment_method TEXT NOT NULL,
  payment_channel TEXT,

  -- Installment Support
  installment_number INTEGER,

  -- Proof & Verification
  payment_proof TEXT,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,

  -- Ledger Integration
  ledger_entry_id TEXT,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
