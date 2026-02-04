-- Migration: Update donatur table for consistent contact system
-- Add website field and rename whatsapp to whatsapp_number for consistency

-- Add website field
ALTER TABLE donatur ADD COLUMN IF NOT EXISTS website TEXT;

-- Rename whatsapp to whatsapp_number for consistency
ALTER TABLE donatur RENAME COLUMN whatsapp TO whatsapp_number;

-- Add comments for documentation
COMMENT ON COLUMN donatur.email IS 'Email address (stored in lowercase)';
COMMENT ON COLUMN donatur.phone IS 'Phone number (stored as 08xxxxxxxxxx format)';
COMMENT ON COLUMN donatur.whatsapp_number IS 'WhatsApp number (stored as 08xxxxxxxxxx format)';
COMMENT ON COLUMN donatur.website IS 'Website URL (stored with https:// protocol)';
