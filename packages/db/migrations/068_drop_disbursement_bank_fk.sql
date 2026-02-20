-- Drop foreign key constraints for bank_account_id and source_bank_id
-- These reference settings JSON, not the bank_accounts table
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_bank_account_id_fkey;
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_source_bank_id_fkey;
ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_destination_bank_id_fkey;
