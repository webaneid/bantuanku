-- Create media table (if not exists from Drizzle schema)
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  folder TEXT DEFAULT 'uploads' NOT NULL,
  uploaded_by TEXT REFERENCES users(id),
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
