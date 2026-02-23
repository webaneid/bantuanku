-- Add coordinator_id column to campaigns table
-- This was originally added via db:push and was missing from migrations

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS coordinator_id TEXT REFERENCES employees(id);
