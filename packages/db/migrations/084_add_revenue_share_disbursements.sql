-- Add revenue share disbursement support:
-- 1) New disbursement type: revenue_share
-- 2) New recipient types: fundraiser, mitra
-- 3) Item-level allocation table to prevent double payout

ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_disbursement_type_check;
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_recipient_type_check;

ALTER TABLE disbursements
ADD CONSTRAINT disbursements_disbursement_type_check
  CHECK (disbursement_type IN ('campaign', 'zakat', 'qurban', 'operational', 'vendor', 'revenue_share'));

ALTER TABLE disbursements
ADD CONSTRAINT disbursements_recipient_type_check
  CHECK (recipient_type IS NULL OR recipient_type IN ('vendor', 'employee', 'coordinator', 'mustahiq', 'manual', 'fundraiser', 'mitra'));

CREATE TABLE IF NOT EXISTS disbursement_revenue_share_items (
  id TEXT PRIMARY KEY,
  disbursement_id TEXT NOT NULL REFERENCES disbursements(id) ON DELETE CASCADE,
  revenue_share_id TEXT NOT NULL REFERENCES revenue_shares(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('mitra', 'fundraiser', 'developer')),
  allocated_amount BIGINT NOT NULL,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_disbursement_revenue_share_item
  ON disbursement_revenue_share_items(disbursement_id, revenue_share_id, share_type);

CREATE INDEX IF NOT EXISTS idx_disb_revenue_items_share_type
  ON disbursement_revenue_share_items(share_type);

CREATE INDEX IF NOT EXISTS idx_disb_revenue_items_revenue_share
  ON disbursement_revenue_share_items(revenue_share_id);
