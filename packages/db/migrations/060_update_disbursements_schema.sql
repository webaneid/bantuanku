-- Migration 060: Update disbursements schema to match blueprint unifikasi
-- Adds missing fields and updates constraints

-- Step 1: Add missing fields to disbursements table
ALTER TABLE disbursements
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS reference_name TEXT,
ADD COLUMN IF NOT EXISTS source_bank_id TEXT,
ADD COLUMN IF NOT EXISTS source_bank_name TEXT,
ADD COLUMN IF NOT EXISTS source_bank_account TEXT,
ADD COLUMN IF NOT EXISTS recipient_contact TEXT,
ADD COLUMN IF NOT EXISTS recipient_bank_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_bank_account TEXT,
ADD COLUMN IF NOT EXISTS recipient_bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Step 2: Migrate existing data (rename columns)
-- recipient_bank → recipient_bank_name
UPDATE disbursements SET recipient_bank_name = recipient_bank WHERE recipient_bank IS NOT NULL;
-- recipient_account → recipient_bank_account
UPDATE disbursements SET recipient_bank_account = recipient_account WHERE recipient_account IS NOT NULL;
-- recipient_phone → recipient_contact
UPDATE disbursements SET recipient_contact = recipient_phone WHERE recipient_phone IS NOT NULL;
-- bank_account_id → source_bank_id
UPDATE disbursements SET source_bank_id = bank_account_id WHERE bank_account_id IS NOT NULL;

-- Step 3: Drop old columns (after data migrated)
ALTER TABLE disbursements
DROP COLUMN IF EXISTS recipient_bank,
DROP COLUMN IF EXISTS recipient_account,
DROP COLUMN IF EXISTS recipient_phone;

-- Step 4: Update CHECK constraints
-- Drop old constraints first
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_disbursement_type_check;
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_recipient_type_check;

-- Add new constraints
ALTER TABLE disbursements
ADD CONSTRAINT disbursements_disbursement_type_check
  CHECK (disbursement_type IN ('campaign', 'zakat', 'qurban', 'operational', 'payroll', 'vendor'));

ALTER TABLE disbursements
ADD CONSTRAINT disbursements_recipient_type_check
  CHECK (recipient_type IN ('vendor', 'employee', 'coordinator', 'mustahiq', 'manual'));

-- Step 5: Update existing 'individual' to 'manual' (backward compat)
UPDATE disbursements SET recipient_type = 'manual' WHERE recipient_type = 'individual';

-- Step 6: Add reference_type constraint
ALTER TABLE disbursements
ADD CONSTRAINT disbursements_reference_type_check
  CHECK (reference_type IN ('campaign', 'zakat_type', 'qurban_period', NULL));

-- Step 7: Rename product_id to reference_id for clarity
ALTER TABLE disbursements RENAME COLUMN product_id TO reference_id;

-- Step 8: Add foreign key for source_bank_id
ALTER TABLE disbursements
DROP CONSTRAINT IF EXISTS disbursements_bank_account_id_fkey;

ALTER TABLE disbursements
ADD CONSTRAINT disbursements_source_bank_id_fkey
  FOREIGN KEY (source_bank_id) REFERENCES bank_accounts(id);

-- Step 9: Create missing indexes
CREATE INDEX IF NOT EXISTS idx_disbursements_reference ON disbursements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_recipient ON disbursements(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_source_bank ON disbursements(source_bank_id);

-- Step 10: Drop old bank_account_id index (replaced by source_bank_id)
DROP INDEX IF EXISTS idx_disbursements_bank;

-- Step 11: Create disbursement_activity_reports table
CREATE TABLE IF NOT EXISTS disbursement_activity_reports (
  id TEXT PRIMARY KEY,
  disbursement_id TEXT NOT NULL REFERENCES disbursements(id) ON DELETE CASCADE,

  -- Activity Details
  report_date TIMESTAMP NOT NULL,
  report_description TEXT NOT NULL,
  photos TEXT, -- JSON array of photo URLs
  video_url TEXT,

  -- Recipients Detail (for coordinator type)
  recipient_count INTEGER,
  recipient_list TEXT, -- JSON array of recipient details

  added_by TEXT REFERENCES users(id),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 12: Create index for activity reports
CREATE INDEX IF NOT EXISTS idx_activity_reports_disbursement
  ON disbursement_activity_reports(disbursement_id);
