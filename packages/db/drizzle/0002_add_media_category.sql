-- Add category column to media table
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general' NOT NULL;

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS "media_category_idx" ON "media"("category");
