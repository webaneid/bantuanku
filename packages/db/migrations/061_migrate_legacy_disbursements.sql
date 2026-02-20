-- Migration: Migrate legacy ledger data to unified disbursements table
-- This migration moves historical ledger entries to the new disbursements system
-- Safe to run multiple times (uses WHERE NOT EXISTS)

-- Step 1: Migrate ledger entries to disbursements
INSERT INTO disbursements (
  id,
  disbursement_number,
  disbursement_type,
  reference_type,
  reference_id,
  reference_name,
  amount,
  transaction_type,
  category,
  source_bank_id,
  source_bank_name,
  source_bank_account,
  recipient_type,
  recipient_id,
  recipient_name,
  recipient_contact,
  recipient_bank_name,
  recipient_bank_account,
  recipient_bank_account_name,
  purpose,
  description,
  notes,
  payment_method,
  expense_account_id,
  type_specific_data,
  status,
  created_by,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  rejection_reason,
  paid_by,
  paid_at,
  created_at,
  updated_at
)
SELECT
  l.id,
  -- Generate disbursement number from reference_id
  COALESCE(l.reference_id, 'LEG-' || l.id),

  -- Determine disbursement_type
  CASE
    WHEN l.campaign_id IS NOT NULL THEN 'campaign'
    WHEN l.employee_id IS NOT NULL THEN 'payroll'
    WHEN l.vendor_id IS NOT NULL THEN 'vendor'
    ELSE 'operational'
  END,

  -- reference_type (only for campaign)
  CASE
    WHEN l.campaign_id IS NOT NULL THEN 'campaign'
    ELSE NULL
  END,

  -- reference_id
  l.campaign_id,

  -- reference_name (denormalized from campaign title)
  (SELECT title FROM campaigns WHERE id = l.campaign_id),

  -- amount
  l.amount,

  -- transaction_type (always expense for disbursements)
  'expense',

  -- category (determine based on type and context)
  CASE
    WHEN l.campaign_id IS NOT NULL AND l.vendor_id IS NOT NULL THEN 'campaign_to_vendor'
    WHEN l.campaign_id IS NOT NULL THEN 'campaign_to_beneficiary'
    WHEN l.employee_id IS NOT NULL THEN 'operational_salary'
    WHEN l.vendor_id IS NOT NULL THEN 'operational_other'
    ELSE 'operational_other'
  END,

  -- source_bank_id (NULL for legacy data)
  NULL,
  NULL,
  NULL,

  -- recipient_type
  CASE
    WHEN l.vendor_id IS NOT NULL THEN 'vendor'
    WHEN l.employee_id IS NOT NULL THEN 'employee'
    ELSE 'manual'
  END,

  -- recipient_id
  COALESCE(l.vendor_id, l.employee_id),

  -- recipient info
  l.recipient_name,
  l.recipient_phone,
  l.recipient_bank,
  l.recipient_account,
  NULL, -- recipient_bank_account_name (not in legacy)

  -- purpose and description
  l.purpose,
  l.description,
  l.notes,

  -- payment_method
  l.payment_method,

  -- expense_account_id (preserve COA reference)
  l.expense_account_id,

  -- type_specific_data (preserve original metadata)
  CASE
    WHEN l.metadata IS NOT NULL THEN l.metadata
    ELSE '{}'::jsonb
  END,

  -- workflow status and tracking
  l.status,
  l.created_by,
  l.submitted_by,
  l.submitted_at,
  l.approved_by,
  l.approved_at,
  l.rejected_by,
  l.rejected_at,
  l.rejection_reason,
  l.paid_by,
  l.paid_at,
  l.created_at,
  l.updated_at
FROM ledger l
WHERE NOT EXISTS (
  SELECT 1 FROM disbursements d WHERE d.id = l.id
);

-- Step 2: Validation queries (run these manually to verify)
-- DO $$
-- DECLARE
--   ledger_count INTEGER;
--   disbursement_count INTEGER;
--   migrated_count INTEGER;
-- BEGIN
--   SELECT COUNT(*) INTO ledger_count FROM ledger;
--   SELECT COUNT(*) INTO disbursement_count FROM disbursements WHERE disbursement_number LIKE 'LEG-%' OR disbursement_number NOT LIKE 'DSB-%';
--   SELECT COUNT(*) INTO migrated_count FROM disbursements d
--     INNER JOIN ledger l ON d.id = l.id;
--
--   RAISE NOTICE 'Ledger entries: %', ledger_count;
--   RAISE NOTICE 'Migrated to disbursements: %', disbursement_count;
--   RAISE NOTICE 'Matched entries: %', migrated_count;
--
--   IF ledger_count != migrated_count THEN
--     RAISE WARNING 'Migration incomplete! % ledger entries not migrated', (ledger_count - migrated_count);
--   ELSE
--     RAISE NOTICE 'Migration complete! All % entries migrated successfully', ledger_count;
--   END IF;
-- END $$;

-- Step 3: Create comment for tracking
COMMENT ON TABLE ledger IS 'LEGACY TABLE - Historical data migrated to disbursements. Keep for reference only. Do not insert new data.';
