-- Add user_id column to transactions table
ALTER TABLE transactions ADD COLUMN user_id TEXT REFERENCES users(id);

-- Create index for user_id lookups
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
