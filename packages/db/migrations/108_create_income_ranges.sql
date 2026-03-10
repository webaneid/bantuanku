-- Migration 108: Create income_ranges table and add FK to donatur

-- 1. Create income_ranges table
CREATE TABLE IF NOT EXISTS income_ranges (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- 2. Add income_range_id to donatur
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'donatur' AND column_name = 'income_range_id'
    ) THEN
        ALTER TABLE donatur ADD COLUMN income_range_id INT;
        ALTER TABLE donatur ADD CONSTRAINT fk_donatur_income_range
            FOREIGN KEY (income_range_id) REFERENCES income_ranges(id) ON DELETE SET NULL;
        CREATE INDEX idx_donatur_income_range_id ON donatur(income_range_id);
    END IF;
END $$;

-- 3. Insert master data
INSERT INTO income_ranges (id, label, display_order) VALUES
(1, '< Rp 4.000.000', 1),
(2, 'Rp 4.000.000 – Rp 8.000.000', 2),
(3, 'Rp 8.000.000 – Rp 12.000.000', 3),
(4, 'Rp 12.000.000 – Rp 16.000.000', 4),
(5, 'Rp 16.000.000 – Rp 20.000.000', 5),
(6, '> Rp 20.000.000', 6)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('income_ranges_id_seq', (SELECT MAX(id) FROM income_ranges));
