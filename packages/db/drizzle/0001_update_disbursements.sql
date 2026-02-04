-- Create chart_of_accounts table first
CREATE TABLE IF NOT EXISTS "chart_of_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "category" text,
  "normal_balance" text NOT NULL,
  "parent_id" text,
  "level" integer DEFAULT 1 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "description" text,
  "created_at" timestamp(3) DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Create evidences table
CREATE TABLE IF NOT EXISTS "evidences" (
  "id" text PRIMARY KEY NOT NULL,
  "disbursement_id" text NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "file_url" text NOT NULL,
  "amount" bigint,
  "uploaded_by" text,
  "uploaded_at" timestamp(3) DEFAULT now() NOT NULL,
  "created_at" timestamp(3) DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Add new columns to disbursements
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "expense_account_id" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "submitted_by" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp(3);
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "approved_at" timestamp(3);
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "rejected_by" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "rejected_at" timestamp(3);
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "paid_by" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "paid_at" timestamp(3);
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "disbursements" ADD COLUMN IF NOT EXISTS "metadata" jsonb;

-- Remove old columns
ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "requested_by";
ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "requested_at";
ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "processed_at";
ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "completed_at";
ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "proof_url";
ALTER TABLE "disbursements" DROP COLUMN IF EXISTS "attachments";

-- Update status default
ALTER TABLE "disbursements" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Add foreign keys for disbursements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disbursements_created_by_users_id_fk') THEN
    ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disbursements_expense_account_id_chart_of_accounts_id_fk') THEN
    ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_expense_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("expense_account_id") REFERENCES "chart_of_accounts"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disbursements_submitted_by_users_id_fk') THEN
    ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "users"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disbursements_approved_by_users_id_fk') THEN
    ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disbursements_rejected_by_users_id_fk') THEN
    ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "users"("id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disbursements_paid_by_users_id_fk') THEN
    ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "users"("id");
  END IF;
END $$;

-- Add foreign keys for evidences
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidences_disbursement_id_disbursements_id_fk') THEN
    ALTER TABLE "evidences" ADD CONSTRAINT "evidences_disbursement_id_disbursements_id_fk" FOREIGN KEY ("disbursement_id") REFERENCES "disbursements"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evidences_uploaded_by_users_id_fk') THEN
    ALTER TABLE "evidences" ADD CONSTRAINT "evidences_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id");
  END IF;
END $$;
