-- Add donatur_id column to transactions table
-- donatur_id is the primary reference for all transactions (guest and registered users)
-- user_id is only filled for registered/logged-in users
ALTER TABLE transactions ADD COLUMN donatur_id TEXT REFERENCES donatur(id);

-- Create index for donatur_id lookups
CREATE INDEX idx_transactions_donatur_id ON transactions(donatur_id);
