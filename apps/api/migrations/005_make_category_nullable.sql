-- Make category column nullable since we use category_id now
ALTER TABLE campaigns ALTER COLUMN category DROP NOT NULL;
