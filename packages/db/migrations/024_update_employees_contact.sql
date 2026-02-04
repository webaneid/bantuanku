-- Migration: Add contact fields to employees table
-- Created: 2026-01-24
-- Purpose: Add whatsapp_number and website columns for standardized contact system

-- Add whatsapp_number column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add website column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS website TEXT;

-- Add comments for documentation
COMMENT ON COLUMN employees.whatsapp_number IS 'WhatsApp number in standard format (08xxx)';
COMMENT ON COLUMN employees.website IS 'Website URL with protocol (https://)';
