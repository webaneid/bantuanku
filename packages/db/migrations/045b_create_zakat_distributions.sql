-- Create zakat_distributions table
-- Note: This may be legacy (replaced by universal disbursements),
-- but the route and schema still reference it.
-- Created to prevent fresh install errors.

CREATE TABLE IF NOT EXISTS zakat_distributions (
  id TEXT PRIMARY KEY NOT NULL,
  reference_id TEXT UNIQUE NOT NULL,
  zakat_type_id TEXT NOT NULL REFERENCES zakat_types(id),

  -- Penerima (8 Asnaf)
  recipient_type TEXT,
  coordinator_id TEXT,
  mustahiq_id TEXT,
  recipient_category TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_contact TEXT,

  -- For coordinator type
  distribution_location TEXT,
  recipient_count BIGINT,

  -- Jumlah
  amount BIGINT NOT NULL,

  -- Detail
  purpose TEXT NOT NULL,
  description TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'draft' NOT NULL,

  -- Transfer Info
  source_bank_id TEXT,
  source_bank_name TEXT,
  source_bank_account TEXT,
  target_bank_name TEXT,
  target_bank_account TEXT,
  target_bank_account_name TEXT,
  transfer_proof TEXT,

  -- Workflow
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP(3),
  disbursed_by TEXT REFERENCES users(id),
  disbursed_at TIMESTAMP(3),

  -- Activity Report
  report_date TIMESTAMP(3),
  report_description TEXT,
  report_photos TEXT,
  report_added_by TEXT REFERENCES users(id),
  report_added_at TIMESTAMP(3),

  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP(3) DEFAULT now() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT now() NOT NULL
);
