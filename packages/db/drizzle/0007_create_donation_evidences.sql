-- Create donation_evidences table
CREATE TABLE IF NOT EXISTS "donation_evidences" (
	"id" text PRIMARY KEY NOT NULL,
	"donation_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"uploaded_by" text,
	"uploaded_at" timestamp(3) DEFAULT now() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "donation_evidences" ADD CONSTRAINT "donation_evidences_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "donation_evidences" ADD CONSTRAINT "donation_evidences_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "donation_evidences_donation_id_idx" ON "donation_evidences" ("donation_id");
CREATE INDEX IF NOT EXISTS "donation_evidences_type_idx" ON "donation_evidences" ("type");
