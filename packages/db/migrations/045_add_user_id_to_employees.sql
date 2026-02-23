-- Add user_id column to employees table
-- Links employee to their user account for login/auth
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
