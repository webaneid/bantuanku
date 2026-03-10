-- Migration 110: Add personal fields to mustahiqs table
-- Fields: birth_place, mother_name, marital_status, dependents, job_title_id, income_range_id

ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100);
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS mother_name VARCHAR(100);
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30);
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS dependents INTEGER;
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS job_title_id INTEGER REFERENCES job_titles(id) ON DELETE SET NULL;
ALTER TABLE mustahiqs ADD COLUMN IF NOT EXISTS income_range_id INTEGER REFERENCES income_ranges(id) ON DELETE SET NULL;
