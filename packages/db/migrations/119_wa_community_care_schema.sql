-- Migration 119: WhatsApp Community Care
-- Adds opt-out fields to donatur, broadcast_wa to campaigns,
-- creates wa_broadcast_jobs and wa_broadcast_logs tables,
-- and seeds 3 new WhatsApp template settings.

-- 1. Donatur opt-out
ALTER TABLE donatur
  ADD COLUMN IF NOT EXISTS wa_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wa_opt_out_at TIMESTAMPTZ;

-- 2. Campaign broadcast toggle
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS broadcast_wa BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Broadcast job tracking
CREATE TABLE IF NOT EXISTS wa_broadcast_jobs (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  type                   TEXT NOT NULL,
  -- 'campaign_new' | 'manual_content' | 'manual_free' | 'reengagement' | 'birthday'
  template_key           TEXT,
  -- null jika type = 'manual_free' (free text di content_override)
  content_override       TEXT,
  -- konten bebas untuk type = 'manual_free', bisa pakai {placeholder}
  reference_id           TEXT,
  -- campaign.id atau activity_report.id (snapshot saat job dibuat)
  reference_name         TEXT,
  audience_scope         TEXT NOT NULL DEFAULT 'all',
  -- 'all' | 'campaign_donors' | 'inactive_62d' | 'birthday_today'
  batch_size             INTEGER NOT NULL DEFAULT 50,
  batch_interval_minutes INTEGER NOT NULL DEFAULT 60,
  current_offset         INTEGER NOT NULL DEFAULT 0,
  next_batch_at          TIMESTAMPTZ,
  status                 TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_recipients       INTEGER NOT NULL DEFAULT 0,
  sent_count             INTEGER NOT NULL DEFAULT 0,
  failed_count           INTEGER NOT NULL DEFAULT 0,
  skipped_count          INTEGER NOT NULL DEFAULT 0,
  error_message          TEXT,
  created_by             TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_broadcast_jobs_status_next_idx
  ON wa_broadcast_jobs (status, next_batch_at)
  WHERE status IN ('pending', 'processing');

-- 4. Per-recipient log (audit + anti-spam)
CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES wa_broadcast_jobs(id) ON DELETE CASCADE,
  donatur_id    TEXT REFERENCES donatur(id) ON DELETE SET NULL,
  template_key  TEXT,
  phone         TEXT NOT NULL,
  status        TEXT NOT NULL,
  -- 'sent' | 'failed' | 'skipped_opt_out' | 'skipped_no_phone'
  error_message TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_broadcast_logs_donatur_template_idx
  ON wa_broadcast_logs (donatur_id, template_key, sent_at);

CREATE INDEX IF NOT EXISTS wa_broadcast_logs_job_idx
  ON wa_broadcast_logs (job_id);

-- 5. New WA template settings (Community Care)
INSERT INTO settings (id, key, value, type, label, description, category, sort_order, is_public)
VALUES
  -- Campaign new
  (gen_random_uuid()::text, 'wa_tpl_campaign_new_enabled', 'true', 'boolean',
   'Aktif', 'Toggle template Campaign Baru', 'whatsapp_template', 70, false),
  (gen_random_uuid()::text, 'wa_tpl_campaign_new',
   'Assalamu''alaikum, {customer_name}

{store_name} memiliki program kebaikan baru yang mungkin menarik perhatian Bapak/Ibu:

*{campaign_title}*
{campaign_description}

Target: {campaign_target}
Info lengkap: {campaign_url}

Semoga Allah memudahkan langkah kebaikan kita bersama. Aamiin 🤲

_{store_name}_
Balas *BERHENTI* untuk berhenti menerima info ini.',
   'text', 'Campaign Baru', 'Dikirim ke semua donatur saat campaign baru dipublikasikan', 'whatsapp_template', 71, false),

  -- Re-engagement
  (gen_random_uuid()::text, 'wa_tpl_reengagement_enabled', 'true', 'boolean',
   'Aktif', 'Toggle template Re-engagement', 'whatsapp_template', 72, false),
  (gen_random_uuid()::text, 'wa_tpl_reengagement',
   'Assalamu''alaikum {customer_name} 🌿

Lama tidak mendengar kabar, semoga Allah selalu melindungi dan memberkahi Bapak/Ibu sekeluarga.

Kami dari {store_name} alhamdulillah dalam keadaan sehat dan terus bersemangat menyalurkan amanah donatur.

Saat ini kami memiliki beberapa program yang mungkin menarik perhatian Bapak/Ibu untuk ikut menyalurkan infaq terbaiknya:
{frontend_url}/program

Semoga Allah memudahkan setiap langkah kebaikan. Aamiin 🤲

_{store_name}_
Balas *BERHENTI* untuk berhenti menerima info ini.',
   'text', 'Re-engagement Donatur', 'Dikirim ke donatur yang 62+ hari tidak donasi', 'whatsapp_template', 73, false),

  -- Birthday
  (gen_random_uuid()::text, 'wa_tpl_birthday_enabled', 'true', 'boolean',
   'Aktif', 'Toggle template Ulang Tahun', 'whatsapp_template', 74, false),
  (gen_random_uuid()::text, 'wa_tpl_birthday',
   'Assalamu''alaikum {customer_name} 🌟

Hari ini adalah hari istimewa untuk Bapak/Ibu. Selamat ulang tahun!

Semoga Allah senantiasa memberikan kesehatan, keberkahan, dan umur yang panjang penuh amal kebaikan.

Terima kasih telah menjadi bagian dari keluarga besar {store_name}. Dukungan Bapak/Ibu sangat berarti bagi kami dan para penerima manfaat.

Semoga di hari istimewa ini Allah melipatgandakan kebaikan dan rezeki Bapak/Ibu. Aamiin 🤲

_{store_name}_',
   'text', 'Ucapan Ulang Tahun', 'Dikirim ke donatur pada hari ulang tahun mereka', 'whatsapp_template', 75, false)

ON CONFLICT (key) DO NOTHING;
