-- Migration: Add contact fields to mustahiq table
-- Created: 2026-01-24
-- Purpose: Add whatsapp_number and website columns for standardized contact system

-- Add whatsapp_number column
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add website column
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comments for documentation
COMMENT ON COLUMN mustahiqs.whatsapp_number IS 'WhatsApp number in standard format (08xxx)';
COMMENT ON COLUMN mustahiqs.website IS 'Website URL with protocol (https://)';
