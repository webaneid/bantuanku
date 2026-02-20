-- File: packages/db/migrations/059_create_unified_disbursements.sql

CREATE TABLE IF NOT EXISTS disbursements (
  id TEXT PRIMARY KEY,
  disbursement_number TEXT UNIQUE NOT NULL,

  -- Type discrimination
  disbursement_type TEXT NOT NULL CHECK (disbursement_type IN ('campaign', 'zakat', 'qurban', 'operational')),

  -- Basic info
  amount BIGINT NOT NULL CHECK (amount > 0),
  transaction_type TEXT DEFAULT 'expense' NOT NULL,
  category TEXT NOT NULL,

  -- References
  product_id TEXT,
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),

  -- Recipient
  recipient_type TEXT CHECK (recipient_type IN ('individual', 'vendor', 'employee', 'coordinator')),
  recipient_id TEXT,
  recipient_name TEXT NOT NULL,
  recipient_bank TEXT,
  recipient_account TEXT,
  recipient_phone TEXT,

  -- Purpose
  purpose TEXT,
  description TEXT,
  notes TEXT,

  -- Evidence
  payment_proof TEXT,

  -- Approval workflow
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  rejection_reason TEXT,

  created_by TEXT NOT NULL REFERENCES users(id),
  submitted_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  rejected_by TEXT REFERENCES users(id),
  paid_by TEXT REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  paid_at TIMESTAMP,

  -- Backward compatibility (OPTIONAL)
  expense_account_id TEXT REFERENCES chart_of_accounts(id),
  ledger_entry_id TEXT REFERENCES ledger_entries(id),

  -- Type-specific data
  type_specific_data JSONB
);

-- Indexes
CREATE INDEX idx_disbursements_category ON disbursements(category);
CREATE INDEX idx_disbursements_type ON disbursements(disbursement_type);
CREATE INDEX idx_disbursements_status ON disbursements(status);
CREATE INDEX idx_disbursements_bank ON disbursements(bank_account_id);
CREATE INDEX idx_disbursements_created_at ON disbursements(created_at);
CREATE INDEX idx_disbursements_paid_at ON disbursements(paid_at);

-- Note: updated_at will be managed by application layer
