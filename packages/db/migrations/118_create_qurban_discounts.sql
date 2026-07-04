-- Migration 118: Qurban Discount & Voucher System
-- Creates qurban_discounts and qurban_discount_usages tables
-- Adds discount columns to qurban_orders and qurban_savings

-- Table: qurban_discounts
CREATE TABLE IF NOT EXISTS qurban_discounts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,           -- 'automatic' | 'voucher'
  discount_type   TEXT NOT NULL,           -- 'percentage' | 'nominal'
  discount_value  BIGINT NOT NULL,
  max_discount    BIGINT,
  scope_type      TEXT NOT NULL DEFAULT 'all',  -- 'all' | 'package' | 'package_period' | 'animal_type'
  scope_id        TEXT,
  code            TEXT UNIQUE,
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ NOT NULL,
  max_usage       INTEGER,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qurban_discounts_type_active_idx ON qurban_discounts (type, is_active);
CREATE INDEX IF NOT EXISTS qurban_discounts_scope_idx ON qurban_discounts (scope_type, scope_id);
CREATE INDEX IF NOT EXISTS qurban_discounts_code_idx ON qurban_discounts (code) WHERE code IS NOT NULL;

-- Table: qurban_discount_usages
CREATE TABLE IF NOT EXISTS qurban_discount_usages (
  id              TEXT PRIMARY KEY,
  discount_id     TEXT NOT NULL REFERENCES qurban_discounts(id) ON DELETE RESTRICT,
  order_id        TEXT UNIQUE REFERENCES qurban_orders(id) ON DELETE RESTRICT,
  savings_id      TEXT REFERENCES qurban_savings(id) ON DELETE RESTRICT,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  donor_phone     TEXT,
  discount_amount BIGINT NOT NULL,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qurban_discount_usages_discount_id_idx ON qurban_discount_usages (discount_id);
CREATE INDEX IF NOT EXISTS qurban_discount_usages_user_id_idx ON qurban_discount_usages (user_id);
CREATE INDEX IF NOT EXISTS qurban_discount_usages_donor_phone_idx ON qurban_discount_usages (donor_phone);
CREATE INDEX IF NOT EXISTS qurban_discount_usages_savings_id_idx ON qurban_discount_usages (savings_id);

-- Modify qurban_orders: add discount columns
ALTER TABLE qurban_orders
  ADD COLUMN IF NOT EXISTS discount_id     TEXT REFERENCES qurban_discounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT NOT NULL DEFAULT 0;

-- Modify qurban_savings: add discount columns
ALTER TABLE qurban_savings
  ADD COLUMN IF NOT EXISTS discount_id     TEXT REFERENCES qurban_discounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT NOT NULL DEFAULT 0;
