-- Migration 111: Convert all timestamp columns to timestamptz
--
-- Problem: All timestamp columns use "timestamp without time zone".
-- The PostgreSQL server timezone is Asia/Jakarta (WIB), so NOW() stores WIB values.
-- When Drizzle reads these, it interprets them as UTC, causing a +7 hour offset on display.
--
-- Fix: Convert to "timestamp with time zone" (timestamptz).
-- We first SET timezone = 'Asia/Jakarta' so PostgreSQL knows the existing values are WIB,
-- then the conversion correctly stores them as UTC internally.
-- After conversion, we SET timezone = 'UTC' so future NOW() calls return UTC.

BEGIN;

-- Tell PostgreSQL: "the existing naive timestamps are in WIB"
SET LOCAL timezone = 'Asia/Jakarta';

-- Convert ALL timestamp columns in public schema to timestamptz
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
    ORDER BY table_name, ordinal_position
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''Asia/Jakarta''',
      r.table_name, r.column_name, r.column_name
    );
    RAISE NOTICE 'Converted %.% to timestamptz', r.table_name, r.column_name;
  END LOOP;
END $$;

-- Set database timezone to UTC for future operations
ALTER DATABASE CURRENT SET timezone = 'UTC';

COMMIT;
