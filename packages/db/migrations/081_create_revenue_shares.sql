CREATE TABLE IF NOT EXISTS revenue_shares (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  donation_amount BIGINT NOT NULL,

  amil_percentage NUMERIC(5, 2) NOT NULL,
  amil_total_amount BIGINT NOT NULL,

  developer_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  developer_amount BIGINT NOT NULL DEFAULT 0,

  fundraiser_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  fundraiser_amount BIGINT NOT NULL DEFAULT 0,
  fundraiser_id TEXT REFERENCES fundraisers(id),

  mitra_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  mitra_amount BIGINT NOT NULL DEFAULT 0,
  mitra_id TEXT REFERENCES mitra(id),

  amil_net_amount BIGINT NOT NULL,
  program_amount BIGINT NOT NULL,

  status TEXT NOT NULL DEFAULT 'calculated',
  calculated_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  distributed_at TIMESTAMP(3),

  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_shares_transaction
  ON revenue_shares(transaction_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_fundraiser
  ON revenue_shares(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_mitra
  ON revenue_shares(mitra_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_status
  ON revenue_shares(status);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_calculated_at
  ON revenue_shares(calculated_at DESC);
