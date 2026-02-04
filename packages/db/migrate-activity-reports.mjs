import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://webane@localhost:5432/bantuanku'
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sql = `
CREATE TABLE IF NOT EXISTS "activity_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "activity_date" timestamp(3) NOT NULL,
  "description" text NOT NULL,
  "gallery" jsonb DEFAULT '[]'::jsonb,
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" timestamp(3),
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp(3) DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) DEFAULT now() NOT NULL
);
    `;

    console.log('Running migration...');
    await client.query(sql);
    console.log('✓ Table activity_reports created successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
