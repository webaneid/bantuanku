ALTER TABLE "donatur" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "users"("id");
