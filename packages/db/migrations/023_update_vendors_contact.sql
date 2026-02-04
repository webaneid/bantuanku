-- Migration: Update vendors table for consistent contact system
-- Add website and whatsapp_number fields

-- Add new contact fields
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comments for documentation
COMMENT ON COLUMN vendors.email IS 'Email address (stored in lowercase)';
COMMENT ON COLUMN vendors.phone IS 'Phone number (stored as 08xxxxxxxxxx format)';
COMMENT ON COLUMN vendors.whatsapp_number IS 'WhatsApp number (stored as 08xxxxxxxxxx format)';
COMMENT ON COLUMN vendors.website IS 'Website URL (stored with https:// protocol)';
