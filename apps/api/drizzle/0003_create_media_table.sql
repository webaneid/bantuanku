-- Create media table
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  alt TEXT,
  description TEXT,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
