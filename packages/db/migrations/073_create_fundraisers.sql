-- Create fundraisers table
CREATE TABLE fundraisers (
  id TEXT PRIMARY KEY,
  donatur_id TEXT REFERENCES donatur(id),
  employee_id TEXT REFERENCES employees(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP,
  commission_percentage DECIMAL(5,2) DEFAULT 5.00,
  total_referrals INT DEFAULT 0,
  total_donation_amount BIGINT DEFAULT 0,
  total_commission_earned BIGINT DEFAULT 0,
  current_balance BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  CONSTRAINT fundraiser_type_check CHECK (
    (donatur_id IS NOT NULL AND employee_id IS NULL) OR
    (donatur_id IS NULL AND employee_id IS NOT NULL)
  )
);

CREATE INDEX idx_fundraisers_code ON fundraisers(code);
CREATE INDEX idx_fundraisers_status ON fundraisers(status);
