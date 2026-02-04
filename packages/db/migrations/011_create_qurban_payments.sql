-- Create qurban_payments table
CREATE TABLE IF NOT EXISTS qurban_payments (
  id TEXT PRIMARY KEY NOT NULL,
  payment_number TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES qurban_orders(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  payment_date TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  payment_method TEXT NOT NULL,
  payment_channel TEXT,
  installment_number INTEGER,
  payment_proof TEXT,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP(3),
  status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_qurban_payments_order ON qurban_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_qurban_payments_status ON qurban_payments(status);
