-- Migration: Remove foreign key constraints from payment_method_id
-- Karena sekarang payment methods diambil dari settings, bukan dari table payment_methods

-- Drop foreign key constraint di tabel donations
ALTER TABLE "donations" DROP CONSTRAINT IF EXISTS "donations_payment_method_id_payment_methods_id_fk";

-- Drop foreign key constraint di tabel payments
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_method_id_payment_methods_id_fk";

-- Sekarang payment_method_id dan method_id adalah string biasa (code dari settings)
