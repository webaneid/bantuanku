-- Create activity_reports table
CREATE TABLE IF NOT EXISTS "activity_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "activity_date" timestamp(3) NOT NULL,
  "description" text NOT NULL,
  "gallery" jsonb DEFAULT '[]'::jsonb,
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" timestamp(3),
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp(3) DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) DEFAULT now() NOT NULL
);
