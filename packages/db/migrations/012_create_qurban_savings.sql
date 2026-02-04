-- Create qurban_savings table
CREATE TABLE IF NOT EXISTS qurban_savings (
  id TEXT PRIMARY KEY NOT NULL,
  savings_number TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT NOT NULL,
  target_period_id TEXT NOT NULL REFERENCES qurban_periods(id),
  target_package_id TEXT REFERENCES qurban_packages(id),
  target_amount BIGINT NOT NULL,
  current_amount BIGINT DEFAULT 0 NOT NULL,
  installment_frequency TEXT NOT NULL,
  installment_amount BIGINT NOT NULL,
  installment_day INTEGER,
  start_date DATE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  converted_to_order_id TEXT REFERENCES qurban_orders(id),
  converted_at TIMESTAMP(3),
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_savings_frequency CHECK (installment_frequency IN ('weekly', 'monthly', 'custom')),
  CONSTRAINT valid_savings_status CHECK (status IN ('active', 'paused', 'completed', 'converted', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_qurban_savings_user ON qurban_savings(user_id);
CREATE INDEX IF NOT EXISTS idx_qurban_savings_period ON qurban_savings(target_period_id);
CREATE INDEX IF NOT EXISTS idx_qurban_savings_status ON qurban_savings(status);
