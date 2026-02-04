-- Create Entity Bank Accounts Table
-- Universal table for storing bank account information for any entity
-- (vendors, employees, donors, mustahiqs, etc)

CREATE TABLE IF NOT EXISTS entity_bank_accounts (
  id text PRIMARY KEY NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder_name text NOT NULL,
  created_at timestamp(3) DEFAULT now() NOT NULL,
  updated_at timestamp(3) DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_entity_bank_accounts_entity ON entity_bank_accounts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_bank_accounts_entity_id ON entity_bank_accounts(entity_id);
