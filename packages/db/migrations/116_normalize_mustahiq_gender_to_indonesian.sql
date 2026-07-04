-- Migration 116: Normalize mustahiq gender values to Indonesian
-- Sebelumnya MustahiqModal mengirim "male"/"female" (English)
-- Standarisasi ke "laki-laki"/"perempuan" agar konsisten dengan DonorModal
UPDATE mustahiqs SET gender = 'laki-laki' WHERE gender = 'male';
UPDATE mustahiqs SET gender = 'perempuan' WHERE gender = 'female';
