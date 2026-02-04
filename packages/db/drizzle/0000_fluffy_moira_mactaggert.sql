CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"phone" text,
	"avatar" text,
	"email_verified_at" timestamp (3),
	"phone_verified_at" timestamp (3),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donatur" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"phone" text,
	"whatsapp" text,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"avatar" text,
	"total_donations" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"email_verified_at" timestamp (3),
	"phone_verified_at" timestamp (3),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "donatur_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pillars" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pillars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "campaign_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"images" jsonb,
	"created_by" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"content" text,
	"image_url" text NOT NULL,
	"images" jsonb,
	"video_url" text,
	"goal" bigint NOT NULL,
	"collected" bigint DEFAULT 0 NOT NULL,
	"donor_count" integer DEFAULT 0 NOT NULL,
	"pillar" text DEFAULT 'Kemanusiaan' NOT NULL,
	"start_date" timestamp (3),
	"end_date" timestamp (3),
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp (3),
	"created_by" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"gateway_id" text NOT NULL,
	"environment" text NOT NULL,
	"credentials" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "payment_gateways_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"gateway_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"icon" text,
	"fee" jsonb,
	"min_amount" bigint DEFAULT 10000,
	"max_amount" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" text PRIMARY KEY NOT NULL,
	"reference_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"user_id" text,
	"donatur_id" text,
	"source" text NOT NULL,
	"donor_name" text NOT NULL,
	"donor_email" text,
	"donor_phone" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"amount" bigint NOT NULL,
	"fee_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"payment_method_id" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp (3),
	"expired_at" timestamp (3),
	"message" text,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "donations_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"donation_id" text NOT NULL,
	"gateway_id" text NOT NULL,
	"method_id" text,
	"external_id" text,
	"external_status" text,
	"amount" bigint NOT NULL,
	"fee_amount" bigint DEFAULT 0,
	"payment_code" text,
	"payment_url" text,
	"qr_code" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp (3),
	"expired_at" timestamp (3),
	"request_payload" jsonb,
	"response_payload" jsonb,
	"webhook_payload" jsonb,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"donation_id" text NOT NULL,
	"issued_at" timestamp (3) NOT NULL,
	"issued_by" text,
	"due_date" timestamp (3),
	"subtotal" bigint NOT NULL,
	"fee_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"payer_name" text NOT NULL,
	"payer_email" text,
	"payer_phone" text,
	"payer_address" text,
	"status" text DEFAULT 'issued' NOT NULL,
	"paid_at" timestamp (3),
	"pdf_url" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"normal_side" text NOT NULL,
	"parent_id" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_number" text NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" text,
	"posted_at" timestamp (3) NOT NULL,
	"memo" text,
	"status" text DEFAULT 'posted' NOT NULL,
	"created_by" text,
	"approved_by" text,
	"approved_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_entry_number_unique" UNIQUE("entry_number")
);
--> statement-breakpoint
CREATE TABLE "ledger_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"account_id" text NOT NULL,
	"description" text,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"normal_balance" text NOT NULL,
	"parent_id" text,
	"level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "chart_of_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "disbursements" (
	"id" text PRIMARY KEY NOT NULL,
	"reference_id" text NOT NULL,
	"campaign_id" text,
	"amount" bigint NOT NULL,
	"expense_account_id" text,
	"recipient_name" text NOT NULL,
	"recipient_bank" text,
	"recipient_account" text,
	"recipient_phone" text,
	"purpose" text NOT NULL,
	"description" text,
	"notes" text,
	"metadata" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"submitted_by" text,
	"submitted_at" timestamp (3),
	"approved_by" text,
	"approved_at" timestamp (3),
	"rejected_by" text,
	"rejected_at" timestamp (3),
	"rejection_reason" text,
	"paid_by" text,
	"paid_at" timestamp (3),
	"payment_method" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "disbursements_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE "evidences" (
	"id" text PRIMARY KEY NOT NULL,
	"disbursement_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"amount" bigint,
	"uploaded_by" text,
	"uploaded_at" timestamp (3) DEFAULT now() NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zakat_calculation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"calculator_type" text NOT NULL,
	"input_data" jsonb NOT NULL,
	"nisab_value" bigint,
	"result_amount" bigint NOT NULL,
	"donation_id" text,
	"is_converted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zakat_calculator_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"nisab_value" bigint,
	"nisab_unit" text,
	"nisab_gold_gram" numeric(10, 2),
	"rate_bps" integer,
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "zakat_calculator_configs_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"meta_title" text,
	"meta_description" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp (3),
	"created_by" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"type" text DEFAULT 'string' NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" bigint NOT NULL,
	"url" text NOT NULL,
	"path" text NOT NULL,
	"folder" text DEFAULT 'uploads' NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_code" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"branch" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD CONSTRAINT "campaign_updates_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD CONSTRAINT "campaign_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateway_credentials" ADD CONSTRAINT "payment_gateway_credentials_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donatur_id_donatur_id_fk" FOREIGN KEY ("donatur_id") REFERENCES "public"."donatur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_method_id_payment_methods_id_fk" FOREIGN KEY ("method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_entry_id_ledger_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_expense_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("expense_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_disbursement_id_disbursements_id_fk" FOREIGN KEY ("disbursement_id") REFERENCES "public"."disbursements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zakat_calculation_logs" ADD CONSTRAINT "zakat_calculation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zakat_calculation_logs" ADD CONSTRAINT "zakat_calculation_logs_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zakat_calculator_configs" ADD CONSTRAINT "zakat_calculator_configs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;