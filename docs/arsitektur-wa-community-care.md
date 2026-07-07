# Arsitektur WhatsApp Community Care

> Status: SELESAI — Fase 1–7 selesai, live di VPS  
> Dibuat: 2026-07-05 | Diperbarui: 2026-07-06 (async cron, variable substitution fix)  
> Bergantung pada: `arsitektur-notifikasi.md`, `arsitektur-donatur.md`, `arsitektur-donasi.md`, `arsitektur-activity-reports.md`

---

## Latar Belakang

Donatur yang terdaftar di Bantuanku adalah komunitas dan ekosistem LAZ. Fitur ini dirancang untuk merawat hubungan dengan komunitas tersebut: menginformasikan program baru, menyampaikan laporan kegiatan, menjaga keterlibatan donatur yang mulai pasif, dan memberikan apresiasi personal di hari ulang tahun mereka.

Berbeda dari `arsitektur-notifikasi.md` yang scope-nya event-driven per transaksi (order masuk → WA kirim), Community Care adalah **audience-driven**: kita yang memilih siapa yang dihubungi, kapan, dan dengan konten apa.

---

## Prinsip Desain

1. **Opt-out wajib dihormati** — setiap pengiriman harus cek `waOptOut = false`. Tidak ada pengecualian.
2. **Rate-limit natural** — broadcast dikirim bertahap (`batch_size` per jam) agar tidak memicu deteksi spam GOWA/WhatsApp. Tidak perlu kirim sekaligus.
3. **Async by default** — broadcast besar tidak boleh memblokir HTTP request. Insert job → proses di background via cron.
4. **Anti-spam built-in** — cek `wa_broadcast_logs` agar donatur tidak dapat pesan yang sama berulang dalam periode singkat.
5. **Audit trail** — setiap job dan setiap pesan punya log. Admin bisa lihat progress, success rate, dan failed recipients.

---

## Ruang Lingkup Fitur

| Fitur | Trigger | Audience | Status |
|-------|---------|----------|--------|
| **1a. Campaign baru** | Admin centang saat publish campaign | Semua donatur aktif + punya WA + opt-in | ✅ Selesai (Fase 6) |
| **1b. Broadcast manual konten lama** | Admin pilih campaign/laporan lama | Semua / per-program / pilihan | ✅ Selesai (Fase 7) |
| **1c. Broadcast manual pesan bebas** | Admin tulis pesan langsung | Semua / per-program / pilihan | ✅ Selesai (Fase 7) |
| **2. Re-engagement** | Cron harian | Donatur yang 62+ hari tidak donasi | ✅ Selesai (Fase 4) |
| **3. Ulang Tahun** | Cron harian | Donatur dengan `birthDate` = hari ini | ✅ Selesai (Fase 3) |

> **Sudah live di VPS (deploy 2026-07-05 s/d 2026-07-06):**
> - **Fase 1** — Migration 119: `wa_broadcast_jobs`, `wa_broadcast_logs`, `donatur.waOptOut`, `campaigns.broadcastWa`
> - **Fase 2** — Opt-out: `GET /v1/wa/unsubscribe`, `POST /v1/wa/opt-in`, toggle profil web & admin, halaman `/berhenti`
> - **Fase 3** — Birthday cron: `GET /cron/wa-birthday` (08:00 WIB), `services/birthday-reminder.ts`
> - **Fase 4** — Re-engagement cron: `GET /cron/wa-reengagement` (10:00 WIB), `services/reengagement-reminder.ts`
> - **Fase 5** — Broadcast processor: `GET /cron/wa-broadcast` (setiap 30 menit, async response), `services/broadcast-processor.ts`, CRUD `/admin/whatsapp/broadcasts`, halaman admin `/dashboard/whatsapp/broadcasts`
> - **Fase 6** — Campaign form: toggle "Sebarkan ke donatur via WA" di edit campaign, auto-create broadcast job saat pertama publish; `publishedAt` juga di-set dari PUT endpoint
> - **Fase 7** — Modal buat broadcast: campaign autocomplete, preview pesan real-time, estimasi penerima + waktu selesai. API: `GET /admin/whatsapp/templates/:key` + `GET /admin/whatsapp/broadcasts/estimate`

---

## Perubahan Database

### Migration 119: Opt-out + Broadcast Infrastructure

```sql
-- 1. Opt-out field di donatur
ALTER TABLE donatur
  ADD COLUMN wa_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN wa_opt_out_at TIMESTAMPTZ;

-- 2. Broadcast job tracking
CREATE TABLE wa_broadcast_jobs (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL,
  -- 'campaign_new' | 'manual_content' | 'manual_free' | 'reengagement' | 'birthday'
  template_key     TEXT,            -- null jika type=manual_free (free text)
  content_override TEXT,            -- pesan bebas untuk type=manual_free
  reference_id     TEXT,            -- campaign.id atau activity_report.id
  reference_name   TEXT,            -- snapshot nama campaign/laporan saat job dibuat
  audience_scope   TEXT NOT NULL DEFAULT 'all',
  -- 'all' | 'campaign_donors' | 'inactive_62d' | 'birthday_today'
  batch_size       INTEGER NOT NULL DEFAULT 50,
  -- jumlah penerima per batch (tunable via job)
  batch_interval_minutes INTEGER NOT NULL DEFAULT 60,
  -- jeda antar batch dalam menit (default: 1 jam)
  current_offset   INTEGER NOT NULL DEFAULT 0,
  -- posisi offset batch saat ini
  next_batch_at    TIMESTAMPTZ,
  -- kapan batch berikutnya dijadwalkan
  status           TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_recipients INTEGER DEFAULT 0,  -- diisi saat job mulai diproses
  sent_count       INTEGER NOT NULL DEFAULT 0,
  failed_count     INTEGER NOT NULL DEFAULT 0,
  skipped_count    INTEGER NOT NULL DEFAULT 0,
  error_message    TEXT,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Log per-penerima (untuk audit + anti-spam)
CREATE TABLE wa_broadcast_logs (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL REFERENCES wa_broadcast_jobs(id) ON DELETE CASCADE,
  donatur_id   TEXT REFERENCES donatur(id) ON DELETE SET NULL,
  template_key TEXT,
  phone        TEXT NOT NULL,
  status       TEXT NOT NULL,  -- 'sending' | 'sent' | 'failed' | 'skipped_opt_out' | 'skipped_no_phone'
  -- 'sending' = claim sebelum kirim (claim-before-send), diupdate ke 'sent'/'failed' setelah response WA
  error_message TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk anti-spam check yang efisien
CREATE INDEX idx_wa_broadcast_logs_donatur_template
  ON wa_broadcast_logs(donatur_id, template_key, sent_at);

CREATE INDEX idx_wa_broadcast_jobs_status
  ON wa_broadcast_jobs(status, next_batch_at);
```

### Campaign Schema Tambahan

```sql
-- Field untuk toggle broadcast saat campaign publish
ALTER TABLE campaigns
  ADD COLUMN broadcast_wa BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## Mekanisme Batch Rate-Limiting

### Masalah

GOWA menggunakan protokol WhatsApp Web yang tidak resmi. Mengirim ratusan pesan sekaligus dalam waktu singkat → high risk ban nomor. `WhatsAppService.sendBulk()` saat ini memang ada `delay()` antar pesan (default 2s), tapi tetap mengirim semua sekaligus dalam satu proses.

Asumsi worst case: 5.000 donatur × 2 detik = **2,8 jam** per broadcast, dan semua dari satu proses → satu malam request yang tidak selesai.

### Solusi: Batch + Cron

Broadcast tidak dikirim sekaligus. Dikirim per **batch kecil** (default 50 penerima), dengan jeda antar batch (default 60 menit). Proses dikendalikan oleh cron yang berjalan setiap **30 menit** (bukan setiap jam — interval default batch 60 menit bisa lebih panjang dari frekuensi cron).

```
Contoh: 500 donatur, batch_size=50, batch_interval=60 menit
→ 10 batch × 60 menit = selesai dalam 10 jam
→ Terkesan natural: 50 pesan keluar per jam, bukan 500 sekaligus
```

```
Contoh: 2.000 donatur, batch_size=50, batch_interval=60 menit
→ 40 batch → 40 jam → terlalu lama
→ Solusi: naikkan batch_size=100 dan/atau turunkan interval=30 menit
→ 20 batch × 30 menit = 10 jam — masih aman
```

`batch_size` dan `batch_interval_minutes` bisa dikonfigurasi per job oleh admin.

### Alur Proses Job

```
Admin buat job (POST /admin/whatsapp/broadcasts)
  → INSERT wa_broadcast_jobs (status=pending, next_batch_at=NOW())
  → return 201 Created

Cron berjalan setiap 30 menit: GET /cron/wa-broadcast (dengan Authorization header)
  → Validasi cron secret
  → Return 202 Accepted LANGSUNG (async — tidak menunggu batch selesai)
  → Background (setImmediate):
      → Query: SELECT * FROM wa_broadcast_jobs
          WHERE status IN ('pending', 'processing')
            AND next_batch_at <= NOW()
            AND type NOT IN ('birthday', 'reengagement')  -- synthetic jobs dikecualikan
          LIMIT 1  -- satu job per run, serialized

      → Ambil recipients batch berikutnya
          WHERE NOT EXISTS log untuk job ini  ← satu-satunya penjaga, tanpa OFFSET
          ORDER BY donatur.id                 ← deterministik
          LIMIT batch_size
      → Kirim satu per satu via sendBulk (dengan delay 2s)
      → INSERT ke wa_broadcast_logs (status per penerima)
      → UPDATE wa_broadcast_jobs:
          sent_count += batch.sent
          failed_count += batch.failed
          current_offset += batch.size    ← progress counter UI, bukan query offset
          next_batch_at = NOW() + batch_interval_minutes
          status = batch.size < batch_size ? 'completed' : 'processing'
          ↑ jika batch lebih kecil dari batchSize = tidak ada sisa penerima
```

### Crontab VPS (tambahan)

> **Prasyarat:** Buat folder log dulu — user `bantuanku` tidak punya write access ke `/var/log/`:
> ```bash
> mkdir -p ~/logs
> ```

```cron
CRON_SECRET=<isi_dengan_nilai_CRON_SECRET_dari_.env>

# Birthday: setiap hari jam 08:00 WIB (01:00 UTC)
0 1 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://api.bantuanku.org/cron/wa-birthday >> ~/logs/cron-wa-birthday.log 2>&1

# Re-engagement: setiap hari jam 10:00 WIB (03:00 UTC)
0 3 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://api.bantuanku.org/cron/wa-reengagement >> ~/logs/cron-wa-reengagement.log 2>&1

# Broadcast processor: setiap 30 menit — endpoint respond 202 langsung, proses di background
*/30 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://api.bantuanku.org/cron/wa-broadcast >> ~/logs/cron-wa-broadcast.log 2>&1

# Savings reminder
0 7 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://api.bantuanku.org/cron/savings-reminder >> ~/logs/cron-savings-reminder.log 2>&1
```

> **Catatan auth cron:** Secret dikirim via `Authorization: Bearer` header (bukan query param `?secret=` — query param muncul di access log server). Env var `CRON_SECRET` (atau fallback ke `JWT_SECRET` jika `CRON_SECRET` belum di-set di `.env` VPS).

> **Catatan async:** `/cron/wa-broadcast` **tidak memblokir HTTP response**. Endpoint langsung return `202 Accepted` dan memproses batch di background via `setImmediate`. Ini wajib karena satu batch (50 pesan × 2s delay) ≈ 100 detik — melebihi timeout Cloudflare. Endpoint lain (birthday, reengagement) juga berpotensi timeout jika base donatur besar; pertimbangkan pola yang sama jika mulai lambat.

---

## Detail Per Fitur

### 1a. Campaign Baru — Broadcast Otomatis

**Trigger:** Admin centang `broadcast_wa = true` saat membuat atau mengubah status campaign ke `active`.

**Field baru di Zod schema campaign admin:**
```typescript
broadcastWa: z.boolean().optional().default(false),
```

**Logika saat `status` berubah ke `active` dan `broadcast_wa = true`:**
```typescript
// di PUT /admin/campaigns/:id/status
if (status === "active" && body.broadcastWa && !campaign.publishedAt) {
  // Insert broadcast job — proses dilanjutkan oleh cron
  await db.insert(waBroadcastJobs).values({
    id: createId(),
    name: `Campaign Baru: ${campaign.title}`,
    type: "campaign_new",
    templateKey: "wa_tpl_campaign_new",
    referenceId: campaign.id,
    referenceName: campaign.title,
    audienceScope: "all",
    batchSize: 50,
    batchIntervalMinutes: 60,
    nextBatchAt: new Date(),
    status: "pending",
    createdBy: user!.id,
    createdAt: now,
  });
}
```

**Template baru: `wa_tpl_campaign_new`**
```
Assalamu'alaikum, {customer_name}

{store_name} memiliki program kebaikan baru yang mungkin ingin Bapak/Ibu ikuti:

*{campaign_title}*
{campaign_description}

Target: {campaign_target}
Info lengkap: {campaign_url}

Semoga Allah memudahkan langkah kebaikan kita bersama. Aamiin 🤲

_{store_name}_
Balas *BERHENTI* untuk berhenti menerima info ini.
```

Variables: `customer_name`, `campaign_title`, `campaign_description`, `campaign_target`, `campaign_url`, + global vars.

> **Catatan implementasi:** Variable `campaign_description`, `campaign_target`, `campaign_url` di-populate di `buildSharedVars()` (`broadcast-processor.ts`) saat `type === "campaign_new"`. Field di schema DB: `campaign.description`, `campaign.goal` (bukan `targetAmount`), `campaign.slug`. `campaign_url` di-build: `${frontendUrl}/program/${campaign.slug}`.

**Catatan untuk UI Admin Campaign:**
- Tambahkan toggle "Sebarkan ke donatur via WhatsApp" di form campaign (tersembunyi di draft, muncul saat status di-set ke active)
- Label yang jelas: "Pesan akan dikirim bertahap ke semua donatur aktif yang punya nomor WA"

---

### 1b & 1c. Broadcast Manual

**1b — Konten Lama (campaign/laporan yang sudah ada):**
- Admin pilih tipe konten: Campaign atau Laporan
- Dropdown pilih campaign/laporan (autocomplete)
- Template otomatis: `wa_tpl_campaign_new` untuk campaign, `wa_tpl_report_published` untuk laporan
- Pilih audience: Semua / Hanya donatur program ini / Donatur inaktif 62+ hari

**1c — Pesan Bebas:**
- Textarea tulis pesan langsung
- Bisa pakai placeholder `{customer_name}`, `{store_name}`, dll
- Tidak ada template key → `content_override` disimpan langsung
- Pilih audience: Semua donatur / Donatur program tertentu

**Shared behavior 1b & 1c:**
- Preview pesan sebelum submit
- Konfirmasi: "Pesan akan dikirim ke ~N donatur secara bertahap selama ~X jam"
- Insert ke `wa_broadcast_jobs` → return immediately
- Progress bisa dipantau di halaman daftar jobs

---

### 2. Re-engagement (62 Hari Tidak Donasi)

**Trigger:** Cron harian via `GET /cron/wa-reengagement?secret=...`

**Query audience:**
```sql
SELECT d.id, d.name, COALESCE(d.whatsapp_number, d.phone) AS phone
FROM donatur d
WHERE d.is_active = true
  AND d.wa_opt_out = false
  AND COALESCE(d.whatsapp_number, d.phone) IS NOT NULL
  AND d.total_donations > 0
  AND (
    SELECT MAX(t.paid_at)
    FROM transactions t
    WHERE t.donatur_id = d.id
      AND t.payment_status = 'paid'
  ) < NOW() - INTERVAL '62 days'
  -- Anti-spam: belum pernah dapat wa_tpl_reengagement dalam 62 hari terakhir
  AND NOT EXISTS (
    SELECT 1 FROM wa_broadcast_logs wbl
    WHERE wbl.donatur_id = d.id
      AND wbl.template_key = 'wa_tpl_reengagement'
      AND wbl.status = 'sent'
      AND wbl.sent_at > NOW() - INTERVAL '62 days'
  )
```

**Implementasi:** `apps/api/src/services/reengagement-reminder.ts` + `GET /cron/wa-reengagement` di `apps/api/src/index.ts`

**Catatan implementasi:**
- Filter `donatur.totalDonations > 0` memastikan hanya donatur yang pernah donasi yang dikirim
- Correlated subquery via Drizzle `sql` template: `MAX(transactions.paid_at) < 62 hari lalu` — filter di DB, tidak in-memory
- Anti-spam 62 hari: batch query ke `wa_broadcast_logs` (1 query untuk semua kandidat)
- Synthetic job entry per run cron (sama dengan Fase 3 — lesson learned: `wa_broadcast_logs.job_id NOT NULL`)
- Delay 2s antar pesan

**Perbedaan dari broadcast biasa:** Re-engagement tidak dibatch via job table — volume diharapkan lebih kecil dan targeted, dikirim langsung oleh cron (masih dengan delay 2s antar pesan). Tapi tetap log ke `wa_broadcast_logs` untuk anti-spam.

**Template baru: `wa_tpl_reengagement`** (bisa diedit admin)
```
Assalamu'alaikum {customer_name} 🌿

Lama tidak mendengar kabar, semoga Allah selalu melindungi dan memberkahi Bapak/Ibu sekeluarga.

Kami dari {store_name} alhamdulillah dalam keadaan sehat dan terus bersemangat menyalurkan amanah donatur.

Saat ini kami memiliki beberapa program yang mungkin menarik perhatian Bapak/Ibu untuk ikut menyalurkan infaq terbaiknya:
{frontend_url}/program

Semoga Allah memudahkan setiap langkah kebaikan. Aamiin 🤲

_{store_name}_
Balas *BERHENTI* untuk berhenti menerima info ini.
```

Variables: `customer_name`, + global vars.

---

### 3. Ucapan Ulang Tahun

**Trigger:** Cron harian via `GET /cron/wa-birthday?secret=...`

**Query audience:**
```sql
SELECT d.id, d.name, COALESCE(d.whatsapp_number, d.phone) AS phone
FROM donatur d
WHERE d.is_active = true
  AND d.wa_opt_out = false
  AND COALESCE(d.whatsapp_number, d.phone) IS NOT NULL
  AND d.birth_date IS NOT NULL
  AND EXTRACT(MONTH FROM d.birth_date::date) = EXTRACT(MONTH FROM NOW() AT TIME ZONE 'Asia/Jakarta')
  AND EXTRACT(DAY FROM d.birth_date::date) = EXTRACT(DAY FROM NOW() AT TIME ZONE 'Asia/Jakarta')
  -- Anti-spam: belum pernah dapat birthday WA hari ini (jaga-jaga cron double-run)
  AND NOT EXISTS (
    SELECT 1 FROM wa_broadcast_logs wbl
    WHERE wbl.donatur_id = d.id
      AND wbl.template_key = 'wa_tpl_birthday'
      AND wbl.sent_at > NOW() - INTERVAL '23 hours'
  )
```

**Field `birthDate` sudah ada di schema `donatur` (migration lama) — tidak perlu migration baru untuk query.**

**Implementasi:** `apps/api/src/services/birthday-reminder.ts` + `GET /cron/wa-birthday` di `apps/api/src/index.ts`

**Catatan implementasi:**
- Query DB langsung filter via `EXTRACT(MONTH/DAY FROM birth_date::date)` dalam WIB — tidak perlu in-memory filter
- Anti-spam check via satu query batch ke `wa_broadcast_logs` (1 query untuk semua kandidat, bukan N+1)
- Arsitektur awal tidak menyebut `wa_broadcast_jobs` untuk birthday, tapi karena `wa_broadcast_logs.job_id NOT NULL` (schema DB), maka dibuat **synthetic job entry** per run cron. Ini lebih baik: memberikan audit trail run harian yang bisa dilihat admin di masa depan.
- Status log: `sent`, `failed`, `skipped_no_phone`, `skipped_recently_sent`
- Delay 2s antar kirim pesan (sama dengan pattern sendBulk)

**Template baru: `wa_tpl_birthday`** (bisa diedit admin)
```
Assalamu'alaikum {customer_name} 🌟

Hari ini adalah hari istimewa untuk Bapak/Ibu. Selamat ulang tahun!

Semoga Allah senantiasa memberikan kesehatan, keberkahan, dan umur yang panjang penuh amal kebaikan.

Terima kasih telah menjadi bagian dari keluarga besar {store_name}. Dukungan Bapak/Ibu berarti sangat besar bagi kami dan para penerima manfaat.

Semoga di hari istimewa ini Allah melipatgandakan kebaikan dan rezeki Bapak/Ibu. Aamiin 🤲

_{store_name}_
```

Variables: `customer_name`, + global vars.

**UI tambahan (rekomendasi):** Di halaman profil donatur web (`/account/profile`), jika `birthDate` belum diisi, tampilkan prompt lembut:
```
"Isi tanggal lahir Anda untuk mendapatkan kejutan di hari istimewa 🎂"
```
Ini incentive natural agar donatur melengkapi profil.

---

## Opt-Out Mechanism

### Alur Unsubscribe

```
Pesan WA broadcast → footer "Balas BERHENTI untuk berhenti"
  → Donatur balas "BERHENTI" ke bot WA
  → Bot handler cek keyword → PATCH /account/wa/opt-out
  → donatur.waOptOut = true, waOptOutAt = NOW()
```

Atau via **link unsubscribe** di pesan (lebih reliable):
```
Pesan WA broadcast → "Berhenti: {unsubscribe_url}"
  → unsubscribe_url = {frontend_url}/berhenti?t=SIGNED_TOKEN
  → Token = JWT sign({ donaturId }, JWT_SECRET, { expiresIn: "30d" })
  → GET /v1/wa/unsubscribe?t=TOKEN → publik, no auth
  → Validasi token → set waOptOut = true → tampilkan halaman konfirmasi
```

### Opt-In Kembali

- Via link unsubscribe: tombol "Berlangganan kembali" di halaman `/berhenti` → `POST /v1/wa/opt-in` (redirect ke login jika belum login)
- Via profil web: toggle "Notifikasi WhatsApp" di `/account/profile` (auto-save saat toggle)
- Via admin panel: toggle status WA di detail donatur (`/dashboard/donatur/[id]`)

### Field Baru di Profil

`PATCH /v1/auth/me` terima field baru: `waOptOut: boolean` — juga muncul di response `GET /v1/auth/me`  
`PUT /v1/admin/donatur/:id` juga menerima dan menyimpan field ini.

---

## API Endpoints Baru

### Admin Broadcast

```
POST   /v1/admin/whatsapp/broadcasts         super_admin, admin_campaign
GET    /v1/admin/whatsapp/broadcasts         staff — list jobs + status + progress
GET    /v1/admin/whatsapp/broadcasts/:id     staff — detail job
GET    /v1/admin/whatsapp/broadcasts/:id/logs  staff — log per penerima (paginated)
POST   /v1/admin/whatsapp/broadcasts/:id/cancel  super_admin — cancel pending/processing
```

### Cron Endpoints (tambahan)

```
GET  /cron/wa-broadcast?secret=...        — batch processor (setiap 30 menit)
GET  /cron/wa-reengagement?secret=...     — re-engagement harian
GET  /cron/wa-birthday?secret=...         — birthday harian
```

Pola auth: sama dengan `/cron/savings-reminder` — secret dikirim via header `Authorization: Bearer $CRON_SECRET` (fallback ke `JWT_SECRET` jika `CRON_SECRET` belum di-set).

### Publik (Opt-out)

```
GET  /v1/wa/unsubscribe?t=TOKEN           — publik, no auth
POST /v1/wa/opt-in                        — login required (donatur opt-in kembali)
```

---

## Halaman Admin Baru

Masuk ke submenu **WhatsApp** di Sidebar Admin:

| Halaman | Path Admin | Role |
|---------|------------|------|
| Daftar Broadcast Jobs | `/dashboard/whatsapp/broadcasts` | staff |
| Buat Broadcast | `/dashboard/whatsapp/broadcasts/new` | super_admin, admin_campaign |
| Detail Job + Logs | `/dashboard/whatsapp/broadcasts/[id]` | staff |

**Form Buat Broadcast (`/broadcasts/new`):**
1. Pilih tipe: Campaign / Laporan / Pesan Bebas
2. (Jika Campaign/Laporan) Autocomplete pilih konten
3. Pilih audience: Semua / Donatur program ini / Inaktif 62+ hari
4. Konfigurasi: Batch size (default 50, min 10, max 200), Interval (default 60 menit, min 30)
5. Preview pesan (render template dengan data contoh)
6. Estimasi: "~N penerima, selesai dalam ~X jam"
7. Tombol Mulai

---

## Template WA Baru (Migration 119)

| Template Key | Keterangan | Variables Tambahan |
|-------------|------------|-------------------|
| `wa_tpl_campaign_new` | Notifikasi campaign baru | `campaign_title`, `campaign_description`, `campaign_target`, `campaign_url` |
| `wa_tpl_reengagement` | Re-engagement 62 hari inaktif | — (hanya global vars) |
| `wa_tpl_birthday` | Ucapan ulang tahun | — (hanya global vars) |

Semua template punya pasangan `{key}_enabled` toggle. Default: `enabled = true`.

---

## Urutan Implementasi

| Fase | Scope | Dependensi | Status |
|------|-------|------------|--------|
| **Fase 1** | Migration 119 (opt-out + broadcast tables + campaign field) | — | ✅ Selesai 2026-07-05 |
| **Fase 2** | Opt-out: API (unsubscribe endpoint, patch me), UI profil web, UI admin donatur | Fase 1 | ✅ Selesai 2026-07-05 |
| **Fase 3** | Birthday cron + template | Fase 1 | ✅ Selesai 2026-07-05 |
| **Fase 4** | Re-engagement cron + template + anti-spam log | Fase 1, 3 | ✅ Selesai 2026-07-05 |
| **Fase 5** | Broadcast job service (batch processor cron) + halaman admin | Fase 1 | ✅ Selesai 2026-07-05 |
| **Fase 6** | Campaign broadcast toggle di form + auto-job saat publish | Fase 5 | ✅ Selesai 2026-07-05 |
| **Fase 7** | Manual broadcast UI (1b & 1c) + audience selection | Fase 5 | ✅ Selesai 2026-07-05 |

Urutan dipilih supaya hal paling kritikal (opt-out) jalan duluan, dan kompleksitas naik bertahap. Fase 3 dan 4 bisa dikerjakan paralel dengan Fase 5.

### Rencana Eksekusi Fase 7

**API (2 endpoint baru di `admin/whatsapp.ts`):**

```
GET /admin/whatsapp/templates/:key
  → Ambil isi template dari settings (untuk preview di form)
  → Return: { key, content, enabled }

GET /admin/whatsapp/broadcasts/estimate?audienceScope=X&referenceId=Y
  → Hitung jumlah calon penerima berdasarkan scope
  → Return: { count, estimatedHours } — estimatedHours = ceil(count / batchSize) * batchInterval / 60
```

**Frontend — enhance modal buat broadcast di `broadcasts/page.tsx`:**

1. **`manual_content` type** — campaign autocomplete:
   - Gunakan `GET /v1/autocomplete/campaigns` (sudah ada)
   - Pilih campaign → auto-fill: `referenceId`, `referenceName`, `templateKey = "wa_tpl_campaign_new"`
   - Auto-set `audienceScope = "campaign_donors"` (bisa diubah manual)

2. **Preview pesan** — setelah template dipilih/isi konten:
   - Fetch `GET /admin/whatsapp/templates/:key`
   - Render dengan sample vars: `{customer_name}` → "Budi Santoso", `{store_name}` → nama org
   - Tampilkan preview di panel kanan modal

3. **Estimasi penerima** — debounced saat `audienceScope` atau `referenceId` berubah:
   - Fetch `GET /admin/whatsapp/broadcasts/estimate?...`
   - Tampilkan: "~N penerima · selesai ±X jam dengan batch 50/jam"

---

## Bug Kritis di Algoritma Batching (Ditemukan 2026-07-07)

> Audit code dilakukan terhadap `apps/api/src/services/broadcast-processor.ts`.
> Semua klaim di bawah telah diverifikasi terhadap kode aktual — bukan hanya klaim auditor.

### Bug 1 — OFFSET + NOT EXISTS = Baris Terlewat *(Kritis)*

**File:** `broadcast-processor.ts` baris 86, 98, 108

**Masalah:**
`queryAudienceBatch` menggunakan dua mekanisme sekaligus yang secara matematis bertentangan:
1. `NOT EXISTS (... wa_broadcast_logs ...)` — mengecualikan donatur yang sudah punya log untuk job ini
2. `.offset(currentOffset)` — skip N baris dari hasil query

Ini **salah secara algoritma**. Setelah batch pertama (50 donatur) dikirim dan dicatat di log, query batch kedua:
- `NOT EXISTS` mengecualikan 50 donatur yang sudah masuk log → dataset tersisa = 70 baris (dari total 120)
- `.offset(50)` skip 50 baris dari dataset yang sudah mengerut 70 baris itu → hanya dapat 20 baris (posisi 51–70 dari dataset terfilter)
- Baris 1–50 dari dataset terfilter (= donatur posisi 51–100 dari total asli) **tidak pernah dikirim**
- Batch pendek (20 < 50) → `isLastBatch = true` → job ditandai `completed` padahal baru ~58% terkirim

**Bukti kode aktual:**
```typescript
// Ketiga branch memiliki pola yang sama
.where(and(..., notSent))   // NOT EXISTS mengecualikan sudah-dikirim
.limit(limit)
.offset(offset)             // ← ini menyebabkan skip
```

**Fix:**
Hapus `offset` parameter dari `queryAudienceBatch` sepenuhnya. Dengan NOT EXISTS sudah menjadi filter, query `LIMIT batch_size` tanpa OFFSET selalu mengambil batch pertama dari **sisa yang belum dikirim**. Tambahkan `orderBy(donatur.id)` untuk urutan deterministik.

Setelah fix, `isLastBatch = batch.length < batchSize` menjadi benar dan efisien — tidak perlu COUNT ekstra. `currentOffset` tetap diupdate sebagai progress counter UI (bukan untuk pagination query).

---

### Bug 2 — Tidak Ada ORDER BY = Urutan Tidak Deterministik *(Sedang)*

**File:** `broadcast-processor.ts` baris 80–111 (semua branch `queryAudienceBatch`) dan baris 156–162 (job `findFirst`)

**Masalah:**
- Tanpa `ORDER BY`, PostgreSQL bisa mengembalikan baris dalam urutan berbeda antar eksekusi.
- Untuk `findFirst` job: tanpa order, job mana yang diproses duluan tidak bisa diprediksi.
- Untuk recipient query: tanpa order stabil, pagination (meski sudah tanpa OFFSET) bisa menghasilkan duplikasi jika ada concurrent query.

**Fix:**
- `queryAudienceBatch`: tambahkan `.orderBy(donatur.id)` di semua tiga branch.
- `findFirst` job: tambahkan `orderBy: [asc(waBroadcastJobs.createdAt)]` agar job terlama diproses duluan.

---

### Bug 3 — Unique Constraint Saja Tidak Cukup: WA Dobel Tetap Bisa Terjadi *(Sedang)*

**File:** `packages/db/src/schema/wa-broadcast-logs.ts`, `broadcast-processor.ts`

**Masalah:**
Jika unique constraint `(job_id, donatur_id)` ditambahkan tanpa mengubah urutan operasi, race condition tetap memungkinkan pesan dobel:
1. Process A select donatur X
2. Process B select donatur X (belum ada log — NOT EXISTS tidak memblokir)
3. Process A kirim WA ke X ← pesan pertama terkirim
4. Process B kirim WA ke X ← pesan kedua terkirim
5. Process A insert log (sukses)
6. Process B insert log (conflict — ditolak DB)

DB menolak log kedua, tapi **WA kedua sudah terlanjur terkirim**. Unique constraint saja tidak cukup.

**Fix yang benar — Claim-before-send:**
Ubah urutan operasi dari "send → log" menjadi "claim (INSERT log status='sending') → send → update log":
1. INSERT log dengan `status = 'sending'` terlebih dahulu — jika conflict, proses lain sudah claim donatur ini, skip
2. Kirim WA
3. UPDATE log ke `status = 'sent'` atau `'failed'`

Dengan pola ini, unique constraint mencegah dua proses claim donatur yang sama sebelum WA dikirim. Ini adalah satu-satunya cara mencegah duplicate send tanpa job-level lock penuh.

**Kasus edge — process crash antara INSERT dan UPDATE:**
Log tetap sebagai `'sending'` permanen → donatur ini excluded dari sisa batch job ini. Ini acceptable (edge case langka) dan bisa dibersihkan via job cleanup jika diperlukan di masa depan.

**Catatan soal job-level lock:**
Untuk single-VPS single PM2 process, risiko dua cron concurrent sangat rendah (cron 30 menit, satu batch ≤ 100 detik). Claim-before-send cukup sebagai mitigation. Job-level lock (`locked_at`, `locked_by`) direkomendasikan jika sistem di-scale ke multiple worker di masa depan.

---

### Bug 4 — Error Background Tidak Update Job ke `failed` *(Sedang)*

**File:** `apps/api/src/index.ts` baris 159

**Masalah:**
```typescript
processBroadcastBatch(db, frontendUrl).catch((err) =>
  console.error("[cron/wa-broadcast] background error:", err)
);
```
Jika `processBroadcastBatch` throw error (DB connection drop, unhandled exception), hanya `console.error` yang dipanggil. Job tetap di status `processing` selamanya. Admin tidak bisa melihat bahwa job gagal dari UI — hanya bisa tahu dari PM2 log.

**Fix:**
Bungkus `processBroadcastBatch` dengan try-catch yang update job ke `failed`:
```typescript
setImmediate(async () => {
  const { processBroadcastBatch } = await import("./services/broadcast-processor");
  try {
    await processBroadcastBatch(db, frontendUrl);
  } catch (err) {
    console.error("[cron/wa-broadcast] fatal error:", err);
    // update job yang sedang processing ke failed
    // (broadcast-processor harus expose currentJobId, atau handle di dalam processBroadcastBatch)
  }
});
```

Pendekatan lebih bersih: tambahkan try-catch di DALAM `processBroadcastBatch` setelah job dipick up, sehingga `job.id` sudah diketahui:
```typescript
try {
  // ... logika batch ...
} catch (err) {
  await db.update(waBroadcastJobs).set({
    status: "failed",
    errorMessage: String(err),
  }).where(eq(waBroadcastJobs.id, job.id));
  throw err; // re-throw untuk console.error di caller
}
```

---

### Bug 5 — Retry untuk Recipient Gagal: Keputusan Desain yang Harus Eksplisit *(Dokumentasi)*

**File:** `broadcast-processor.ts` baris 24–28

**Masalah (bukan bug, tapi keputusan tersembunyi):**
```typescript
NOT EXISTS (
  SELECT 1 FROM wa_broadcast_logs
  WHERE donatur_id = X AND job_id = Y
  -- tidak ada filter by status
)
```
Semua status — `sent`, `failed`, `skipped_no_phone`, `sending` — menyebabkan donatur excluded dari batch berikutnya. Recipient yang gagal karena GOWA timeout tidak akan dicoba ulang dalam job yang sama.

**Keputusan yang diambil:** "Sekali attempt per job per recipient." Jika ingin retry, harus buat job baru atau jalankan ulang dengan `audienceScope` yang lebih targeted.

Ini keputusan yang **valid** untuk MVP. Yang penting didokumentasikan agar tidak dianggap bug.

---

### Apa yang TIDAK diubah dari arsitektur sebelumnya

| Item | Keputusan |
|------|-----------|
| `setImmediate` untuk async batch | **Tetap** — return 202 langsung adalah desain yang benar (lesson learned 2026-07-06). Yang difix adalah error handling di dalamnya, bukan pola async-nya. |
| `isLastBatch = batch.length < batchSize` | **Tetap setelah OFFSET difix** — termination condition yang benar dan efisien untuk cursor-less pagination. Tidak perlu COUNT ekstra. |
| `currentOffset` sebagai field DB | **Tetap sebagai progress counter** — berguna untuk UI progress bar. Tidak lagi dipakai sebagai query offset. |
| Tidak ada job-level lock (lockedAt/lockedBy) | **Tidak diimplementasikan Fase 8** — single-VPS single PM2, risiko concurrent processor sangat rendah. Claim-before-send cukup. Lock mekanisme penuh direkomendasikan bila scale ke multiple worker. |

---

### Rencana Fix (Fase 8)

**Scope:** 2 file kode + 1 schema + 1 migration SQL baru

#### Perubahan 1 — `broadcast-processor.ts`

| Sub-perubahan | Detail |
|---------------|--------|
| Hapus `offset` dari `queryAudienceBatch` | Hapus parameter `offset: number`, hapus `.offset(offset)` di 3 branch |
| Tambah `ORDER BY` di queryAudienceBatch | `.orderBy(donatur.id)` di semua 3 branch (deterministik) |
| Tambah `ORDER BY` di job `findFirst` | `orderBy: [asc(waBroadcastJobs.createdAt)]` — job terlama diproses duluan |
| Ubah urutan "send → log" menjadi "claim → send → update" | Lihat detail di bawah |
| Tambah try-catch outer per job | Tangkap fatal error, update job ke `status = 'failed'` |

**Detail claim-before-send:**
```typescript
// Sebelum: send → insert log
// Sesudah: insert log (status='sending') → send → update log

const logId = createId();

// Gunakan onConflictDoNothing().returning() — JANGAN bare catch.
// Bare catch menelan semua error termasuk DB down / column error.
const claimed = await db.insert(waBroadcastLogs)
  .values({
    id: logId, jobId: job.id, donaturId: d.id,
    templateKey: job.templateKey, phone,
    status: "sending",  // ← claim sebelum kirim
    sentAt: new Date(),
  })
  .onConflictDoNothing()
  .returning({ id: waBroadcastLogs.id });

if (!claimed.length) {
  // Row tidak di-insert = conflict — recipient sudah di-claim proses lain.
  // JANGAN increment batchSkipped — ini bukan skip karena data,
  // tapi concurrency artifact. Gunakan counter lokal untuk observability.
  claimConflicts++;
  continue;
}

// Kirim WA
const sent = await wa.send(...);

// Update ke status final
await db.update(waBroadcastLogs)
  .set({ status: sent ? "sent" : "failed", errorMessage: sent ? null : errorMsg })
  .where(eq(waBroadcastLogs.id, logId));
```

> **Mengapa `onConflictDoNothing()` bukan `catch { ... }`:**
> Bare `catch` menelan semua exception — termasuk DB connection drop, column type error, FK violation. Semua kasus itu akan salah dianggap sebagai "sudah di-claim proses lain" dan recipient di-skip. `onConflictDoNothing` hanya silent pada actual unique conflict; error lain tetap throw dan ditangkap oleh outer try-catch yang update job ke `failed`.

> **Mengapa `claimConflicts++` bukan `batchSkipped++`:**
> `skippedCount` di job record adalah metrik bisnis yang terlihat admin di UI — menggambarkan recipient yang legitimately tidak bisa dikirim (no phone, etc.). Conflict dari concurrent processor bukan skip bisnis; memasukkannya ke `skippedCount` menyebabkan angka misleading. Counter lokal `claimConflicts` cukup untuk di-log ke console untuk debugging.

**Detail outer try-catch:**
```typescript
export async function processBroadcastBatch(db, frontendUrl) {
  const job = await pickJob(db);
  if (!job) return { status: "no_job", ... };

  try {
    // ... seluruh logika batch ...
  } catch (err) {
    await db.update(waBroadcastJobs).set({
      status: "failed",
      errorMessage: String(err).slice(0, 500),
    }).where(eq(waBroadcastJobs.id, job.id));
    throw err;
  }
}
```

#### Perubahan 2 — `wa-broadcast-logs.ts` (schema)

Tambahkan unique constraint:
```typescript
}, (t) => ({
  uniqueJobDonatur: unique().on(t.jobId, t.donaturId),
}));
```

#### Perubahan 3 — Migration SQL baru (120)

```sql
-- Migration 120: wa_broadcast unique constraint + sending status
ALTER TABLE wa_broadcast_logs
  ADD CONSTRAINT wa_broadcast_logs_job_donatur_unique UNIQUE (job_id, donatur_id);
```

> **Nama file:** `120_wa_broadcast_unique_constraint.sql`

---

**Tidak perlu diubah:**
- `currentOffset` field DB — tetap ada sebagai progress counter
- API endpoint — tidak ada perubahan kontrak
- Frontend — tidak ada perubahan UI
- Migration 119 — tidak ada perubahan retroaktif

**Risiko backward compat:**
- Job yang sedang `processing` dengan `currentOffset > 0` tidak perlu di-reset. Karena OFFSET sudah dihapus, query berikutnya akan menggunakan NOT EXISTS + LIMIT saja. Donatur yang sudah masuk log (termasuk status `sending` dari proses yang crash) otomatis excluded.
- Unique constraint bisa conflict jika ada data lama dengan duplikasi `(job_id, donatur_id)` di production. Perlu cek sebelum apply migration: `SELECT job_id, donatur_id, COUNT(*) FROM wa_broadcast_logs GROUP BY job_id, donatur_id HAVING COUNT(*) > 1;`

---

## Gap Implementasi (Ditemukan saat Eksekusi Fase 1–6)

Gap berikut ditemukan antara arsitektur dan implementasi aktual. Masing-masing sudah dikategorikan:
- ✅ **Sudah difix** — tidak perlu tindakan lanjut
- ⚠️ **Belum difix** — perlu dikerjakan
- 🗒️ **Disengaja** — keputusan desain yang tidak akan diimplementasikan

### Gap yang Sudah Difix

| # | Item | Fix |
|---|------|-----|
| 1 | Arsitektur menyebut `POST /v1/account/wa/opt-in` tapi implementasi pakai `/v1/wa/opt-in` | Arsitektur diupdate mengikuti kode aktual (Fase 2) |
| 2 | `publishedAt` hanya di-set dari `PATCH /:id/status`, tidak dari `PUT /:id` | Fixed di Fase 6 — PUT sekarang juga set `publishedAt` saat pertama kali aktif |
| 3 | Arsitektur birthday/re-engagement tidak menyebut `wa_broadcast_jobs` entry, tapi schema DB: `job_id NOT NULL` | Dibuat **synthetic job entry** per run cron sebagai audit trail (Fase 3 & 4) |

### Gap yang Belum Difix

| # | Item | Prioritas | Fase Target |
|---|------|-----------|-------------|
| 1 | **Fase 7 — UX form buat broadcast masih kasar**: referenceId diketik manual (bukan autocomplete), tidak ada preview pesan, tidak ada estimasi penerima + waktu selesai | Tinggi | ✅ Selesai Fase 7 |
| 2 | **PATCH `/admin/campaigns/:id/status` tidak trigger broadcast job** — jika admin pakai endpoint status terpisah (bukan form edit), `broadcastWa` tidak bisa di-pass. Selama UI admin menggunakan form edit (PUT), ini tidak masalah. | Rendah | Post-Fase 7 |
| 3 | **Broadcast untuk laporan kegiatan (activity reports)** — template `wa_tpl_report_published` disebut di arsitektur tapi belum dibuat di settings dan belum ada trigger dari halaman laporan | Sedang | Post-Fase 7 |
| 4 | ~~**Crontab di VPS**~~ | ~~Kritis~~ | ✅ Resolved 2026-07-06 — secret diupdate, path log dipindah ke `~/logs/` (user tidak punya write access ke `/var/log/`) |
| 5 | **Prompt "isi tanggal lahir" di profil web** — arsitektur merekomendasikan prompt lembut di `/account/profile` jika `birthDate` kosong, agar birthday reminder bisa jalan | Rendah | Post-Fase 7 |
| 6 | **Unsubscribe via balas "BERHENTI" ke bot WA** — link unsubscribe sudah ada, tapi keyword bot belum dihandle | Rendah | Post-Fase 7 |

### Hal yang Disengaja Tidak Dimasukkan

| Item | Keputusan |
|------|-----------|
| Audience segmentasi lanjut (filter provinsi, gender, income range) | **Tidak dimasukkan** — terlalu kompleks untuk MVP. Cukup: semua / per-program / inaktif. |
| A/B testing template | **Tidak dimasukkan** — bisa dipertimbangkan setelah sistem stabil. |
| Email broadcast sebagai channel paralel | **Tidak dimasukkan** — email service belum production-ready. |
| Scheduling broadcast (kirim di jam tertentu) | **Tidak dimasukkan Fase awal** — `next_batch_at` sudah support ini secara teknis, UI scheduler bisa ditambahkan nanti. |

---

## Gap & Hal yang Disengaja Tidak Dimasukkan (Arsitektur Awal)

> Catatan: section ini adalah keputusan desain dari arsitektur awal. Gap yang ditemukan saat implementasi ada di section "Gap Implementasi" di atas.

| Item | Keputusan |
|------|-----------|
| Unsubscribe via balas "BERHENTI" ke bot | **Tidak dimasukkan Fase awal** — bot perlu enhanced, dipertimbangkan di fase lanjutan. Pakai link unsubscribe dulu sebagai primary. |
| Audience segmentasi lanjut (filter provinsi, gender, income range) | **Tidak dimasukkan** — terlalu kompleks untuk MVP. Cukup: semua / per-program / inaktif. |
| A/B testing template | **Tidak dimasukkan** — bisa dipertimbangkan setelah sistem stabil. |
| Laporan broadcast → tambah audience "semua donatur" | **Tidak dimasukkan** — existing behavior (per-program donors) sudah tepat secara relevansi. Admin bisa pakai Manual Broadcast jika ingin jangkauan lebih luas. |
| Email broadcast sebagai channel paralel | **Tidak dimasukkan** — email service belum production-ready. |
| Scheduling broadcast (kirim di jam tertentu) | **Tidak dimasukkan Fase awal** — `next_batch_at` sudah support ini secara teknis, UI scheduler bisa ditambahkan nanti. |
