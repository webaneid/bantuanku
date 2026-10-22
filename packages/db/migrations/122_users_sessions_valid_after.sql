-- 122: pencabut sesi (ADR-0011). Refresh token yang diterbitkan sebelum waktu ini ditolak di /auth/refresh.
-- NULL = tidak ada pencabutan. Diisi saat reset/ganti password, daftar ulang akun belum terverifikasi, klaim Google.
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ;
