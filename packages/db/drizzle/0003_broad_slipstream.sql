CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"contact_person" text,
	"email" text,
	"phone" text,
	"address" text,
	"bank_name" text,
	"bank_account" text,
	"bank_account_name" text,
	"tax_id" text,
	"business_license" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"department" text,
	"employment_type" text,
	"email" text,
	"phone" text,
	"address" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"join_date" date,
	"end_date" date,
	"salary" bigint,
	"allowance" bigint,
	"bank_name" text,
	"bank_account" text,
	"bank_account_name" text,
	"tax_id" text,
	"national_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
ALTER TABLE "disbursements" ADD COLUMN "vendor_id" text;--> statement-breakpoint
ALTER TABLE "disbursements" ADD COLUMN "employee_id" text;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;