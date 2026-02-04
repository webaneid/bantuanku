-- Create mustahiqs table
CREATE TABLE IF NOT EXISTS "mustahiqs" (
	"id" text PRIMARY KEY NOT NULL,
	"mustahiq_id" text,
	"name" text NOT NULL,
	"asnaf_category" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"national_id" text,
	"date_of_birth" date,
	"gender" text,
	"bank_name" text,
	"bank_account" text,
	"bank_account_name" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "mustahiqs_mustahiq_id_unique" UNIQUE("mustahiq_id")
);
