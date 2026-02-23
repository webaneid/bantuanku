-- Create zakat_types table
-- This was originally created via db:push and was missing from migrations

CREATE TABLE IF NOT EXISTS zakat_types (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  has_calculator BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP(3) DEFAULT now() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT now() NOT NULL
);
