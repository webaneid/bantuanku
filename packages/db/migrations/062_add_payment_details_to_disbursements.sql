-- Add payment execution details to disbursements
ALTER TABLE disbursements
ADD COLUMN transfer_proof_url TEXT,
ADD COLUMN transfer_date TIMESTAMP(3),
ADD COLUMN transferred_amount BIGINT,
ADD COLUMN additional_fees BIGINT DEFAULT 0,
ADD COLUMN destination_bank_id TEXT REFERENCES bank_accounts(id);
