-- 121: verifikasi email, reset password via email, login Google (ADR-0010)

CREATE TABLE IF NOT EXISTS auth_email_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_email_tokens_token_hash_idx ON auth_email_tokens (token_hash);
CREATE INDEX IF NOT EXISTS auth_email_tokens_user_purpose_idx ON auth_email_tokens (user_id, purpose);

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  email               TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_oauth_accounts_provider_account_idx
  ON user_oauth_accounts (provider, provider_account_id);

-- Backfill: akun ber-peran selain 'user' (staf/mitra/dst) dibuat/dijamin admin -> dianggap terverifikasi.
-- Akun donatur biasa (peran 'user') sengaja TIDAK di-backfill: diverifikasi sekali saat login berikutnya.
UPDATE users u
   SET email_verified_at = NOW()
 WHERE u.email_verified_at IS NULL
   AND EXISTS (
     SELECT 1 FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = u.id AND r.slug <> 'user'
   );

