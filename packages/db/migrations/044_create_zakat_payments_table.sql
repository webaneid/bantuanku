-- Create zakat_payments table for tracking payment records
CREATE TABLE IF NOT EXISTS zakat_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  zakat_donation_id TEXT NOT NULL REFERENCES zakat_donations(id) ON DELETE CASCADE,

  -- Payment Details
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  payment_method TEXT NOT NULL, -- 'bank_transfer', 'ewallet', 'qris', 'va'
  payment_channel TEXT, -- Bank code, QRIS ID, etc

  -- Proof & Verification
  payment_proof TEXT, -- URL bukti transfer
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP(3),

  -- Status
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, verified, rejected

  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_zakat_payments_zakat_donation_id ON zakat_payments(zakat_donation_id);
CREATE INDEX IF NOT EXISTS idx_zakat_payments_status ON zakat_payments(status);
CREATE INDEX IF NOT EXISTS idx_zakat_payments_payment_date ON zakat_payments(payment_date);

-- Add paid_amount column to zakat_donations table if not exists
ALTER TABLE zakat_donations ADD COLUMN IF NOT EXISTS paid_amount BIGINT DEFAULT 0 NOT NULL;

-- Create index for paid_amount
CREATE INDEX IF NOT EXISTS idx_zakat_donations_paid_amount ON zakat_donations(paid_amount);
