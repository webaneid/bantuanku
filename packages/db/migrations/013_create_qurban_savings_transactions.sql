-- Create qurban_savings_transactions table
CREATE TABLE IF NOT EXISTS qurban_savings_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  transaction_number TEXT UNIQUE NOT NULL,
  savings_id TEXT NOT NULL REFERENCES qurban_savings(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_date TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  payment_method TEXT,
  payment_channel TEXT,
  payment_proof TEXT,
  verified_by TEXT REFERENCES users(id),
  verified_at TIMESTAMP(3),
  status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('deposit', 'withdrawal', 'conversion')),
  CONSTRAINT valid_transaction_status CHECK (status IN ('pending', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_qurban_savings_trx_savings ON qurban_savings_transactions(savings_id);
CREATE INDEX IF NOT EXISTS idx_qurban_savings_trx_status ON qurban_savings_transactions(status);
