-- 124: Uang masuk wajib punya metode pembayaran yang jelas (ADR-0016, Fase 5).
-- Lapis kedua di database (lapis pertama: validasi di API). Hanya berlaku pada PERISTIWA baru:
--   * transaction_payments menjadi 'verified' (INSERT verified, atau UPDATE yang mengubah status/metode ke verified)
--   * transactions menjadi 'paid' (bukan non-tunai, nominal > 0)
-- Baris lama tidak diubah dan tetap dapat di-reject/di-update tanpa terblokir.
-- Metode valid: gateway_code terisi | bank-/qris- (id dari settings) | kode gateway dikenal | cash.
-- "Metode Lain" adalah nama akun kas untuk data lama saja, bukan metode yang boleh dipilih.

CREATE OR REPLACE FUNCTION is_valid_payment_method(method TEXT, gateway TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(NULLIF(btrim(gateway), '') IS NOT NULL, FALSE)
      OR lower(btrim(COALESCE(method, ''))) ~ '^(bank_bank|qris_qris|bank|qris)-[0-9]+$'
      OR lower(btrim(COALESCE(method, ''))) IN ('flip', 'ipaymu', 'midtrans', 'xendit', 'cash')
$$;

CREATE OR REPLACE FUNCTION enforce_payment_method_on_verified() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'verified' AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM 'verified'
       OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
       OR OLD.gateway_code IS DISTINCT FROM NEW.gateway_code
     ) AND NOT is_valid_payment_method(NEW.payment_method, NEW.gateway_code) THEN
    RAISE EXCEPTION 'Metode pembayaran wajib dipilih (rekening, QRIS, atau gateway terdaftar); nilai "%" tidak valid', COALESCE(NEW.payment_method, '')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payment_method_required ON transaction_payments;
CREATE TRIGGER trg_payment_method_required
  BEFORE INSERT OR UPDATE OF status, payment_method, gateway_code ON transaction_payments
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_method_on_verified();

CREATE OR REPLACE FUNCTION enforce_payment_method_on_paid() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid')
     AND COALESCE(NEW.total_amount, 0) > 0
     AND COALESCE((NEW.type_specific_data->>'is_non_cash')::boolean, FALSE) = FALSE
     AND NOT is_valid_payment_method(NEW.payment_method_id, NULL)
     -- transaksi gateway: metode ada pada catatan pembayarannya (gateway_code terisi sejak dibuat)
     AND NOT EXISTS (
       SELECT 1 FROM transaction_payments p
       WHERE p.transaction_id = NEW.id AND is_valid_payment_method(p.payment_method, p.gateway_code)
     ) THEN
    RAISE EXCEPTION 'Transaksi tidak dapat berstatus paid tanpa metode pembayaran yang jelas (nilai "%")', COALESCE(NEW.payment_method_id, '')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_transaction_method_required ON transactions;
CREATE TRIGGER trg_transaction_method_required
  BEFORE INSERT OR UPDATE OF payment_status, payment_method_id ON transactions
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_method_on_paid();

-- Akun kas untuk metode tak terpetakan: ganti nama tampilan.
UPDATE cash_accounts SET name = 'Metode Lain', updated_at = NOW() WHERE ref_key = 'unmapped' AND name <> 'Metode Lain';
