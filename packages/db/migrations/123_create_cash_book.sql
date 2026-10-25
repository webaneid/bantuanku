-- 123: Buku Kas (ADR-0016). Aditif; tidak mengubah tabel lama.
-- cash_accounts = akun kas (rekening bank, QRIS, gateway, tunai, atau 'unmapped'); setiap metode bayar = satu akun.
-- cash_entries  = buku kas append-only: satu baris per pergerakan uang. Koreksi lewat entri pembalik (reverses_entry_id).
-- Tanpa FK ke transactions/disbursements/campaigns: jejak audit tidak boleh ikut hilang bila sumber dihapus.

CREATE TABLE IF NOT EXISTS cash_accounts (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,                      -- bank | qris | gateway | cash | unmapped
  name          TEXT NOT NULL,
  ref_key       TEXT NOT NULL UNIQUE,               -- id di settings (bank-<ts>, qris-<ts>) | kode gateway | cash | unmapped
  gateway_code  TEXT,
  purpose       TEXT NOT NULL DEFAULT 'umum',       -- umum | zakat
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_entries (
  id                 TEXT PRIMARY KEY,
  entry_date         TIMESTAMPTZ NOT NULL,
  direction          TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount             BIGINT NOT NULL CHECK (amount > 0),
  component          TEXT NOT NULL,                 -- pokok | kode_unik | kelebihan | biaya_transfer | koreksi
  fund               TEXT NOT NULL,                 -- zakat | qurban | campaign | wakaf | fidyah | operasional | bagi_hasil | lainnya
  fund_detail        TEXT,
  cash_account_id    TEXT NOT NULL REFERENCES cash_accounts(id),
  method             TEXT NOT NULL,                 -- bank_transfer | qris | gateway | cash | other
  gateway_code       TEXT,
  ref_type           TEXT NOT NULL,                 -- transaction_payment | disbursement | adjustment
  ref_id             TEXT NOT NULL,
  transaction_id     TEXT,
  campaign_id        TEXT,
  reverses_entry_id  TEXT REFERENCES cash_entries(id),
  note               TEXT,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cash_entries_ref UNIQUE (ref_type, ref_id, component)
);

CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON cash_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_cash_entries_fund_date ON cash_entries (fund, entry_date);
CREATE INDEX IF NOT EXISTS idx_cash_entries_account_date ON cash_entries (cash_account_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_cash_entries_transaction ON cash_entries (transaction_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_campaign ON cash_entries (campaign_id);
