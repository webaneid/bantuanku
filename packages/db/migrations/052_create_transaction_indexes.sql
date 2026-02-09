-- Indexes for transactions table
CREATE INDEX idx_transactions_product ON transactions(product_type, product_id);
CREATE INDEX idx_transactions_status ON transactions(payment_status);
CREATE INDEX idx_transactions_donor ON transactions(donor_email);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Indexes for transaction_payments table
CREATE INDEX idx_payments_transaction ON transaction_payments(transaction_id);
CREATE INDEX idx_payments_status ON transaction_payments(status);
CREATE INDEX idx_payments_created ON transaction_payments(created_at DESC);
