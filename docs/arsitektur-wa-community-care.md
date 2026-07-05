# Arsitektur WhatsApp Community Care

> Status: SEBAGIAN DIIMPLEMENTASIKAN — Fase 1–5 selesai, Fase 6–7 dalam antrian  
> Dibuat: 2026-07-05 | Diperbarui: 2026-07-05 (Fase 5 selesai)  
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
| **1a. Campaign baru** | Admin centang saat publish campaign | Semua donatur aktif + punya WA + opt-in | Belum (Fase 6) |
| **1b. Broadcast manual konten lama** | Admin pilih campaign/laporan lama | Semua / per-program / pilihan | Belum (Fase 7) |
| **1c. Broadcast manual pesan bebas** | Admin tulis pesan langsung | Semua / per-program / pilihan | Belum (Fase 7) |
| **2. Re-engagement** | Cron harian | Donatur yang 62+ hari tidak donasi | ✅ Selesai (Fase 4) |
| **3. Ulang Tahun** | Cron harian | Donatur dengan `birthDate` = hari ini | ✅ Selesai (Fase 3) |

> **Sudah live di VPS (deploy 2026-07-05):**
> - **Fase 1** — Migration 119: `wa_broadcast_jobs`, `wa_broadcast_logs`, `donatur.waOptOut`, `campaigns.broadcastWa`
> - **Fase 2** — Opt-out: `GET /v1/wa/unsubscribe`, `POST /v1/wa/opt-in`, toggle profil web & admin, halaman `/berhenti`
> - **Fase 3** — Birthday cron: `GET /cron/wa-birthday` (08:00 WIB), `services/birthday-reminder.ts`
> - **Fase 4** — Re-engagement cron: `GET /cron/wa-reengagement` (10:00 WIB), `services/reengagement-reminder.ts`
> 
> **Selesai, siap deploy:**
> - **Fase 5** — Broadcast processor: `GET /cron/wa-broadcast` (setiap 30 menit), `services/broadcast-processor.ts`, CRUD `/admin/whatsapp/broadcasts`, halaman admin `/dashboard/whatsapp/broadcasts`

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
  status       TEXT NOT NULL,  -- 'sent' | 'failed' | 'skipped_opt_out' | 'skipped_no_phone'
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

Broadcast tidak dikirim sekaligus. Dikirim per **batch kecil** (default 50 penerima), dengan jeda antar batch (default 60 menit). Proses dikendalikan oleh cron yang berjalan setiap jam.

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

Cron berjalan setiap 30 menit: GET /cron/wa-broadcast?secret=...
  → Query: SELECT * FROM wa_broadcast_jobs
      WHERE status IN ('pending', 'processing')
        AND next_batch_at <= NOW()
      LIMIT 1  -- satu job per run, serialized

  → Ambil recipients batch berikutnya (OFFSET current_offset LIMIT batch_size)
  → Kirim satu per satu via sendBulk (dengan delay 2s)
  → INSERT ke wa_broadcast_logs (status per penerima)
  → UPDATE wa_broadcast_jobs:
      sent_count += batch.sent
      failed_count += batch.failed
      current_offset += batch.size
      next_batch_at = NOW() + batch_interval_minutes
      status = current_offset >= total_recipients ? 'completed' : 'processing'
```

### Crontab VPS (tambahan)

```cron
# Broadcast processor: setiap 30 menit
*/30 * * * * curl -s "https://api.bantuanku.org/cron/wa-broadcast?secret=JWT_SECRET"

# Re-engagement: setiap hari jam 10:00 WIB (03:00 UTC)
0 3 * * * curl -s "https://api.bantuanku.org/cron/wa-reengagement?secret=JWT_SECRET"

# Birthday: setiap hari jam 08:00 WIB (01:00 UTC)
0 1 * * * curl -s "https://api.bantuanku.org/cron/wa-birthday?secret=JWT_SECRET"
```

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

Pola auth: sama dengan `/cron/savings-reminder` — secret = `JWT_SECRET`.

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
| **Fase 6** | Campaign broadcast toggle di form + auto-job saat publish | Fase 5 | Belum |
| **Fase 7** | Manual broadcast UI (1b & 1c) + audience selection | Fase 5 | Belum |

Urutan dipilih supaya hal paling kritikal (opt-out) jalan duluan, dan kompleksitas naik bertahap. Fase 3 dan 4 bisa dikerjakan paralel dengan Fase 5.

---

## Gap & Hal yang Disengaja Tidak Dimasukkan

| Item | Keputusan |
|------|-----------|
| Unsubscribe via balas "BERHENTI" ke bot | **Tidak dimasukkan Fase awal** — bot perlu enhanced, dipertimbangkan di fase lanjutan. Pakai link unsubscribe dulu sebagai primary. |
| Audience segmentasi lanjut (filter provinsi, gender, income range) | **Tidak dimasukkan** — terlalu kompleks untuk MVP. Cukup: semua / per-program / inaktif. |
| A/B testing template | **Tidak dimasukkan** — bisa dipertimbangkan setelah sistem stabil. |
| Laporan broadcast → tambah audience "semua donatur" | **Tidak dimasukkan** — existing behavior (per-program donors) sudah tepat secara relevansi. Admin bisa pakai Manual Broadcast jika ingin jangkauan lebih luas. |
| Email broadcast sebagai channel paralel | **Tidak dimasukkan** — email service belum production-ready. |
| Scheduling broadcast (kirim di jam tertentu) | **Tidak dimasukkan Fase awal** — `next_batch_at` sudah support ini secara teknis, UI scheduler bisa ditambahkan nanti. |
