-- Add balance tracking to bank_accounts (sesuai blueprint COA)
-- Reference: 00-blueprint-COA.md line 629-634

ALTER TABLE bank_accounts
ADD COLUMN balance BIGINT DEFAULT 0 NOT NULL,
ADD COLUMN is_for_zakat BOOLEAN DEFAULT false NOT NULL;

-- Create index for balance queries
CREATE INDEX idx_bank_accounts_balance ON bank_accounts(balance);
CREATE INDEX idx_bank_accounts_is_for_zakat ON bank_accounts(is_for_zakat);

-- Update existing zakat banks
-- TODO: Manual - admin harus set is_for_zakat = true untuk rekening zakat

-- Calculate initial balance from transactions
-- NOTE: Ini harus disesuaikan dengan data real
-- Sementara set ke 0, nanti admin input manual

COMMENT ON COLUMN bank_accounts.balance IS 'Saldo rekening yang di-track secara real-time. Update via updateBankBalance helper.';
COMMENT ON COLUMN bank_accounts.is_for_zakat IS 'Flag untuk validasi: zakat disbursement hanya bisa dari rekening zakat.';
