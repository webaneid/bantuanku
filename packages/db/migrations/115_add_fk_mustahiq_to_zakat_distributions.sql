-- Migration 115: Add FK constraint mustahiq_id → mustahiqs(id) ON DELETE SET NULL
-- Sebelum tambah constraint, bersihkan orphan mustahiq_id (jika ada)
UPDATE zakat_distributions
SET mustahiq_id = NULL
WHERE mustahiq_id IS NOT NULL
  AND mustahiq_id NOT IN (SELECT id FROM mustahiqs);

-- Tambah FK constraint dengan ON DELETE SET NULL
-- (sesuai pola: FK ke master data → SET NULL agar data distribusi historis terjaga)
ALTER TABLE zakat_distributions
ADD CONSTRAINT fk_zakat_distributions_mustahiq
FOREIGN KEY (mustahiq_id) REFERENCES mustahiqs(id) ON DELETE SET NULL;
