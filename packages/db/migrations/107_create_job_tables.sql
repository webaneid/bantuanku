-- Migration 107: Create job_categories and job_titles tables
-- Also adds job_title_id FK to donatur table

-- 1. Create job_categories table
CREATE TABLE IF NOT EXISTS job_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

-- 2. Create job_titles table
CREATE TABLE IF NOT EXISTS job_titles (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES job_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_popular BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_titles_category_id ON job_titles(category_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_is_popular ON job_titles(is_popular);

-- 3. Add job_title_id to donatur
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'donatur' AND column_name = 'job_title_id'
    ) THEN
        ALTER TABLE donatur ADD COLUMN job_title_id INT;
        ALTER TABLE donatur ADD CONSTRAINT fk_donatur_job_title
            FOREIGN KEY (job_title_id) REFERENCES job_titles(id) ON DELETE SET NULL;
        CREATE INDEX idx_donatur_job_title_id ON donatur(job_title_id);
    END IF;
END $$;

-- 4. Insert master data: Kategori Pekerjaan
INSERT INTO job_categories (id, name, display_order) VALUES
(1, 'Aparatur Negara & Keamanan', 1),
(2, 'Pendidikan & Sains', 2),
(3, 'Tenaga Kesehatan', 3),
(4, 'Karyawan & Profesional', 4),
(5, 'Teknologi & Digital', 5),
(6, 'Wiraswasta & Usaha Mandiri', 6),
(7, 'Pekerja Lepas & Kreatif', 7),
(8, 'Transportasi & Logistik', 8),
(9, 'Sektor Agraris', 9),
(10, 'Umum / Lainnya', 10)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence to avoid conflict with future inserts
SELECT setval('job_categories_id_seq', (SELECT MAX(id) FROM job_categories));

-- 5. Insert master data: Detail Profesi
INSERT INTO job_titles (category_id, name, is_popular) VALUES
-- Aparatur Negara & Keamanan
(1, 'Pegawai Negeri Sipil (PNS)', TRUE),
(1, 'Anggota TNI / POLRI', TRUE),
(1, 'Pegawai Pemerintah (PPPK)', FALSE),
-- Pendidikan & Sains
(2, 'Guru', TRUE),
(2, 'Dosen', TRUE),
(2, 'Peneliti / Ilmuwan', FALSE),
-- Tenaga Kesehatan
(3, 'Dokter Umum / Spesialis', TRUE),
(3, 'Perawat / Bidan', TRUE),
(3, 'Apoteker', FALSE),
-- Karyawan & Profesional
(4, 'Karyawan Swasta', TRUE),
(4, 'Manager / Direktur', FALSE),
(4, 'Akuntan / Auditor', FALSE),
(4, 'Legal / Pengacara', FALSE),
-- Teknologi & Digital
(5, 'Software Engineer / Developer', TRUE),
(5, 'Data Scientist', FALSE),
(5, 'UI/UX Designer', FALSE),
-- Wiraswasta & Usaha Mandiri
(6, 'Pemilik Bisnis / UMKM', TRUE),
(6, 'Pedagang / Retail', TRUE),
-- Pekerja Lepas & Kreatif
(7, 'Freelancer', TRUE),
(7, 'Content Creator / Influencer', TRUE),
(7, 'Fotografer / Videografer', FALSE),
-- Transportasi & Logistik
(8, 'Driver Ojek / Taksi Online', TRUE),
(8, 'Kurir / Petugas Logistik', TRUE),
(8, 'Pilot / Nakhoda / Masinis', FALSE),
-- Sektor Agraris
(9, 'Petani', TRUE),
(9, 'Nelayan', FALSE),
(9, 'Peternak', FALSE),
-- Umum / Lainnya
(10, 'Ibu Rumah Tangga', TRUE),
(10, 'Pelajar / Mahasiswa', TRUE),
(10, 'Belum / Tidak Bekerja', FALSE),
(10, 'Pensiunan', FALSE);
