-- Universal Activity Reports Migration
-- Add polymorphic reference fields to support Campaign, Zakat, and Qurban reports

-- Add new columns
ALTER TABLE "activity_reports"
ADD COLUMN "reference_type" text,
ADD COLUMN "reference_id" text,
ADD COLUMN "reference_name" text,
ADD COLUMN "video_url" text,
ADD COLUMN "type_specific_data" jsonb;

-- Migrate existing campaign reports
UPDATE "activity_reports"
SET
  reference_type = 'campaign',
  reference_id = campaign_id,
  reference_name = (SELECT title FROM campaigns WHERE id = activity_reports.campaign_id)
WHERE campaign_id IS NOT NULL;

-- Make reference fields required after migration
ALTER TABLE "activity_reports"
ALTER COLUMN "reference_type" SET NOT NULL,
ALTER COLUMN "reference_id" SET NOT NULL;

-- Make campaign_id nullable for backward compatibility
ALTER TABLE "activity_reports"
ALTER COLUMN "campaign_id" DROP NOT NULL;

-- Drop foreign key constraint on campaign_id
ALTER TABLE "activity_reports"
DROP CONSTRAINT IF EXISTS activity_reports_campaign_id_campaigns_id_fk;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "activity_reports_reference_idx" ON "activity_reports" ("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "activity_reports_status_idx" ON "activity_reports" ("status");
CREATE INDEX IF NOT EXISTS "activity_reports_activity_date_idx" ON "activity_reports" ("activity_date");

-- Note: campaign_id column kept for backward compatibility
-- Will be removed in future phase after all code is updated
