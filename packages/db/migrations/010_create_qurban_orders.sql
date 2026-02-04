-- Create qurban_orders table
CREATE TABLE IF NOT EXISTS qurban_orders (
  id TEXT PRIMARY KEY NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id),
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT NOT NULL,
  package_id TEXT NOT NULL REFERENCES qurban_packages(id),
  shared_group_id TEXT REFERENCES qurban_shared_groups(id),
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price BIGINT NOT NULL,
  total_amount BIGINT NOT NULL,
  payment_method TEXT NOT NULL,
  installment_frequency TEXT,
  installment_count INTEGER,
  installment_amount BIGINT,
  paid_amount BIGINT DEFAULT 0 NOT NULL,
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  order_status TEXT DEFAULT 'pending' NOT NULL,
  on_behalf_of TEXT NOT NULL,
  order_date TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMP(3),
  executed_at TIMESTAMP(3),
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('full', 'installment')),
  CONSTRAINT valid_installment_freq CHECK (installment_frequency IN ('weekly', 'monthly', 'custom') OR installment_frequency IS NULL),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  CONSTRAINT valid_order_status CHECK (order_status IN ('pending', 'confirmed', 'cancelled', 'executed'))
);

CREATE INDEX IF NOT EXISTS idx_qurban_orders_user ON qurban_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_qurban_orders_package ON qurban_orders(package_id);
CREATE INDEX IF NOT EXISTS idx_qurban_orders_group ON qurban_orders(shared_group_id);
CREATE INDEX IF NOT EXISTS idx_qurban_orders_status ON qurban_orders(payment_status, order_status);
