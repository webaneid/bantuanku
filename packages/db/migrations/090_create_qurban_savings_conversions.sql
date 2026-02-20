-- Fase C: Non-cash conversion log untuk tabungan qurban
-- Menyimpan jejak konversi tabungan -> order tanpa menambah kas masuk baru.

CREATE TABLE IF NOT EXISTS qurban_savings_conversions (
  id text PRIMARY KEY NOT NULL,
  savings_id text NOT NULL REFERENCES qurban_savings(id) ON DELETE CASCADE,
  converted_amount bigint NOT NULL,
  order_id text,
  order_number text,
  order_transaction_id text,
  source_legacy_transaction_id text,
  notes text,
  converted_by text REFERENCES users(id),
  converted_at timestamp(3) DEFAULT now() NOT NULL,
  created_at timestamp(3) DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qurban_savings_conversions_savings
  ON qurban_savings_conversions(savings_id);

CREATE INDEX IF NOT EXISTS idx_qurban_savings_conversions_order
  ON qurban_savings_conversions(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_qurban_savings_conversions_legacy_source
  ON qurban_savings_conversions(source_legacy_transaction_id)
  WHERE source_legacy_transaction_id IS NOT NULL;
