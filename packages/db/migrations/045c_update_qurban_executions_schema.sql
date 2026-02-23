-- Update qurban_executions to match current Drizzle schema
-- Migration 037 created this table with old schema (order_id, animal_tag, slaughter_date, etc.)
-- Current schema uses transaction_id, execution_number, execution_date, butcher_name, etc.

-- Add new columns
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS execution_number TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS transaction_id TEXT REFERENCES transactions(id);
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS execution_date TIMESTAMP(3);
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS butcher_name TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS animal_type TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS animal_condition TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS distribution_method TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS distribution_notes TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS photos TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS recipient_count INTEGER;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS recipient_list TEXT;
ALTER TABLE qurban_executions ADD COLUMN IF NOT EXISTS executed_by TEXT REFERENCES users(id);

-- Backfill execution_date from slaughter_date if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qurban_executions' AND column_name = 'slaughter_date'
  ) THEN
    UPDATE qurban_executions SET execution_date = slaughter_date WHERE execution_date IS NULL;
  END IF;
END $$;

-- Backfill execution_number for existing rows that don't have one
DO $$
BEGIN
  UPDATE qurban_executions
  SET execution_number = 'EXE-QBN-' || EXTRACT(YEAR FROM created_at)::TEXT || '-' || LPAD(ROW_NUMBER::TEXT, 5, '0')
  FROM (
    SELECT id AS rid, ROW_NUMBER() OVER (ORDER BY created_at) AS row_number
    FROM qurban_executions WHERE execution_number IS NULL
  ) sub
  WHERE qurban_executions.id = sub.rid AND qurban_executions.execution_number IS NULL;
END $$;

-- Add unique constraint on execution_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qurban_executions_execution_number_unique'
  ) THEN
    -- Only add constraint if all values are unique and not null
    IF NOT EXISTS (SELECT 1 FROM qurban_executions WHERE execution_number IS NULL) THEN
      ALTER TABLE qurban_executions ADD CONSTRAINT qurban_executions_execution_number_unique UNIQUE (execution_number);
    END IF;
  END IF;
END $$;

-- Drop legacy columns that no longer exist in schema (safe with IF EXISTS)
ALTER TABLE qurban_executions DROP COLUMN IF EXISTS order_id;
ALTER TABLE qurban_executions DROP COLUMN IF EXISTS animal_tag;
ALTER TABLE qurban_executions DROP COLUMN IF EXISTS slaughter_date;
ALTER TABLE qurban_executions DROP COLUMN IF EXISTS officer_name;
ALTER TABLE qurban_executions DROP COLUMN IF EXISTS photo_url;
ALTER TABLE qurban_executions DROP COLUMN IF EXISTS notes;
