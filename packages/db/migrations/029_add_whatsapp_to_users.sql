-- Add whatsapp_number column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN users.whatsapp_number IS 'WhatsApp number for user notifications';
