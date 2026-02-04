-- Migration: Create accounting system tables
-- This migration creates the double-entry accounting tables (ledger_entries and ledger_lines)

-- Create ledger_entries table (Journal Entries)
CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "entry_number" text UNIQUE NOT NULL,
  "ref_type" text NOT NULL,
  "ref_id" text,
  "posted_at" timestamp(3) NOT NULL,
  "memo" text,
  "status" text DEFAULT 'posted' NOT NULL,
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp(3) DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Create ledger_lines table (Individual debit/credit lines)
CREATE TABLE IF NOT EXISTS "ledger_lines" (
  "id" text PRIMARY KEY NOT NULL,
  "entry_id" text NOT NULL REFERENCES "ledger_entries"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL REFERENCES "chart_of_accounts"("id"),
  "description" text,
  "debit" bigint DEFAULT 0 NOT NULL,
  "credit" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_ledger_entries_ref" ON "ledger_entries"("ref_type", "ref_id");
CREATE INDEX IF NOT EXISTS "idx_ledger_entries_posted_at" ON "ledger_entries"("posted_at");
CREATE INDEX IF NOT EXISTS "idx_ledger_lines_entry_id" ON "ledger_lines"("entry_id");
CREATE INDEX IF NOT EXISTS "idx_ledger_lines_account_id" ON "ledger_lines"("account_id");
