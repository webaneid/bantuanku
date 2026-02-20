-- Create fundraiser_referrals table
CREATE TABLE fundraiser_referrals (
  id TEXT PRIMARY KEY,
  fundraiser_id TEXT NOT NULL REFERENCES fundraisers(id),
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  donation_amount BIGINT NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_fundraiser_referrals_fundraiser ON fundraiser_referrals(fundraiser_id);

-- Add referral tracking to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referred_by_fundraiser_id TEXT REFERENCES fundraisers(id);
