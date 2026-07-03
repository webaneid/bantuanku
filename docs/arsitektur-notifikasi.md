# Arsitektur Notifikasi

Dokumen ini adalah source of truth untuk sistem notifikasi yang sudah ada di kode: WhatsApp via GOWA, bot WhatsApp, pengingat tabungan qurban, dan notifikasi akun berbasis tabel `notifications`.

Dokumen ini menyerap dan mengoreksi `03-Notifikasi-Whatsapp-Blueprint.md`. SOP toast/in-app feedback Admin Web tidak menjadi bagian dokumen ini karena scope tersebut dicatat di `docs/arsitektur-komponen-admin.md`.

## Ruang Lingkup

Sistem notifikasi terdiri dari empat jalur:

| Jalur | Status Implementasi | Source Code |
|-------|---------------------|-------------|
| WhatsApp outbound template | Aktif, best-effort, tanpa queue | `apps/api/src/services/whatsapp.ts`, `apps/api/src/services/whatsapp-gowa.ts` |
| WhatsApp inbound bot | Aktif jika `whatsapp_bot_enabled=true` | `apps/api/src/routes/whatsapp.ts`, `apps/api/src/services/whatsapp-ai.ts`, `apps/api/src/services/whatsapp-flow.ts` |
| Reminder tabungan qurban | Aktif via endpoint cron/manual admin | `apps/api/src/services/savings-reminder.ts`, `apps/api/src/index.ts`, `apps/api/src/routes/admin/whatsapp.ts` |
| Account notification | Aktif untuk baca/tandai notifikasi, producer belum jelas di scan domain ini | `packages/db/src/schema/notification.ts`, `apps/api/src/routes/account.ts` |

Tidak ada message queue, outbox table, retry table, delivery log, atau status pengiriman WhatsApp yang persisten. Pengiriman WhatsApp diperlakukan sebagai best-effort: gagal kirim dicatat ke log proses dan tidak otomatis diulang oleh database worker.

## Konfigurasi

Konfigurasi WhatsApp disimpan di tabel `settings`, bukan tabel khusus WhatsApp.

| Key | Fungsi | Dibaca Oleh |
|-----|--------|-------------|
| `whatsapp_enabled` | Toggle global pengiriman WhatsApp | `WhatsAppService.getConfig()` |
| `whatsapp_api_url` | Base URL GOWA REST API | `WhatsAppService`, `GOWAClient` |
| `whatsapp_username` | Basic Auth username | `GOWAClient` |
| `whatsapp_password` | Basic Auth password | `GOWAClient` |
| `whatsapp_device_id` | Device ID/JID GOWA | Header `X-Device-Id` |
| `whatsapp_sender_number` | Nomor pengirim, untuk administrasi UI | Settings UI |
| `whatsapp_admin_numbers` | JSON array nomor admin penerima notifikasi internal | `WhatsAppService.sendToAdmins()` |
| `whatsapp_message_delay` | Delay antar pesan bulk/admin | `GOWAClient.delay()` |
| `whatsapp_webhook_secret` | Tersedia di settings/UI, tetapi belum diverifikasi oleh route webhook | Gap keamanan |

Template WhatsApp disimpan di category `whatsapp_template` dengan pola dua setting:

| Setting | Fungsi |
|---------|--------|
| `{templateKey}_enabled` | Jika bukan `"true"`, template dianggap tidak aktif |
| `{templateKey}` | Isi pesan dengan placeholder `{variable}` |

Bot WhatsApp memakai key berawalan `whatsapp_bot_` di category `whatsapp`. API admin settings memperlakukan key berawalan `whatsapp_bot_` sebagai developer-only untuk user non-developer.

## Provider GOWA

Provider aktif adalah GOWA, yaitu REST API di atas WhatsApp Web protocol. Integrasi API berada di `GOWAClient`.

Outbound message:

```text
WhatsAppService.send/sendBulk/sendToAdmins
  -> render template
  -> GOWAClient.sendText()
  -> POST {whatsapp_api_url}/send/message
```

Detail implementasi:

| Area | Implementasi |
|------|--------------|
| Auth | Basic Auth dari `whatsapp_username:whatsapp_password` |
| Device | Header `X-Device-Id` dari `whatsapp_device_id` |
| Format nomor | `+628...`, `08...`, dan `6208...` dinormalisasi menjadi `628...@s.whatsapp.net` |
| Sukses kirim | Response JSON harus berisi `code === "SUCCESS"` |
| Test koneksi | Coba `/app/devices`, lalu `/devices` |
| Media | `sendImage()` dan `sendFile()` tersedia di client, tetapi jalur template utama memakai text |

Karena GOWA memakai protocol WhatsApp Web tidak resmi, risiko ban nomor dan reliabilitas provider harus dianggap risiko operasional. Nomor pengirim sebaiknya nomor khusus layanan, bukan nomor pribadi/penting.

## Template Variables

`WhatsAppService.getGlobalVariables()` menambahkan variable global ke semua template:

| Variable | Sumber Aktual |
|----------|---------------|
| `{store_name}` | `organization_name` atau `site_name` |
| `{store_phone}` | `organization_phone` atau `contact_phone` |
| `{store_whatsapp}` | `organization_whatsapp`, fallback ke phone/contact |
| `{store_email}` | `organization_email` atau `contact_email` |
| `{store_website}` | `organization_website` atau `site_url` |
| `{frontend_url}` | `FRONTEND_URL`, fallback ke `organization_website/site_url` |
| `{store_address}` | `organization_detail_address`, `organization_address`, atau `contact_address` |
| `{current_date}` | Runtime Asia/Jakarta |
| `{current_time}` | Runtime Asia/Jakarta |

Variable lain dikirim manual oleh trigger masing-masing. Jika placeholder tidak ditemukan di `variables`, placeholder dibiarkan apa adanya di pesan.

## Trigger Template Aktual

Daftar berikut adalah template yang benar-benar dipanggil di kode API.

| Template | Trigger Aktual |
|----------|----------------|
| `wa_tpl_register_welcome` | Registrasi user di `apps/api/src/routes/auth.ts` |
| `wa_tpl_register_verify` | OTP/verifikasi WhatsApp di `apps/api/src/routes/auth.ts` |
| `wa_tpl_order_campaign` | Transaksi campaign dibuat di `apps/api/src/routes/transactions.ts` |
| `wa_tpl_order_zakat` | Transaksi zakat dibuat di `apps/api/src/routes/transactions.ts` |
| `wa_tpl_order_qurban` | Transaksi qurban dibuat di `apps/api/src/routes/transactions.ts` |
| `wa_tpl_admin_new_transaction` | Notifikasi admin saat transaksi baru dibuat |
| `wa_tpl_payment_uploaded` | Donatur upload bukti bayar |
| `wa_tpl_admin_proof_uploaded` | Admin menerima notifikasi bukti bayar |
| `wa_tpl_payment_approved` | Pembayaran/transaksi disetujui admin |
| `wa_tpl_payment_rejected` | Pembayaran ditolak di transaksi/qurban savings |
| `wa_tpl_savings_created` | Admin membuat tabungan qurban |
| `wa_tpl_savings_deposit` | Setoran tabungan qurban diverifikasi |
| `wa_tpl_savings_completed` | Tabungan qurban mencapai target |
| `wa_tpl_savings_reminder` | Reminder cicilan tabungan qurban |
| `wa_tpl_report_published` | Laporan kegiatan dipublikasikan |
| `wa_tpl_disbursement_created` | Disbursement campaign dibuat dan dikirim ke donatur terkait |
| `wa_tpl_admin_disbursement_request` | Permintaan pencairan dikirim ke admin |
| `wa_tpl_mitra_donation_received` | Donasi masuk ke program milik mitra |
| `wa_tpl_fundraiser_referral` | Donasi masuk lewat referral fundraiser |
| `wa_tpl_payment_reminder` | Manual admin: reminder transaksi pending/partial |

Template berikut ada di migration/UI, tetapi tidak ditemukan sebagai trigger aktif di scan kode API:

| Template | Catatan |
|----------|---------|
| `wa_tpl_payment_expired` | Ada setting/template, belum ada trigger pengiriman saat transaksi expired/cancelled |
| `wa_tpl_savings_converted` | Ada setting/template, belum ada trigger pengiriman konversi tabungan ke pesanan qurban |

## Endpoint Admin WhatsApp

Semua endpoint admin berada di `/v1/admin/whatsapp` dan melewati guard staff/admin.

| Endpoint | Role | Fungsi |
|----------|------|--------|
| `POST /send-reminder` | `super_admin`, `admin_finance` | Mengirim `wa_tpl_payment_reminder` ke transaksi `pending`/`partial` yang punya `donorPhone` |
| `POST /send-savings-reminder` | `super_admin`, `admin_finance` | Menjalankan `runSavingsReminders()` manual |
| `POST /test-connection` | `super_admin`, `admin_finance` | Test koneksi GOWA via `/app/devices` atau `/devices` |
| `POST /test-send` | `super_admin`, `admin_finance` | Kirim pesan text test langsung via GOWA |
| `GET /bot-logs` | `super_admin` + developer | Membaca log percakapan in-memory dari `whatsapp-ai.ts` |

## Reminder Tabungan Qurban

File: `apps/api/src/services/savings-reminder.ts`

Reminder tabungan qurban diproses oleh `runSavingsReminders()`.

### Alur Lengkap

```text
1. Query semua qurban_savings dengan status = "active"
2. Hitung tanggal/hari sekarang di timezone Asia/Jakarta
3. Filter: installmentDay cocok dengan hari ini
   - monthly: installmentDay = dayOfMonth (day 29-31 → last day of month)
   - weekly:  installmentDay = dayOfWeek (1=Senin ... 7=Minggu)
4. Per saving yang lolos:
   a. Skip jika tidak ada donorPhone
   b. Hitung period bounds (weekly=Senin-Minggu, monthly=1st-last of month)
   c. Query qurban_savings_transactions: ada deposit verified di period ini?
      → Jika ya: skip (alreadyPaid)
   d. Hitung progress (installmentPaid, remaining)
5. sendBulk ke semua recipients via wa_tpl_savings_reminder
```

### Return Structure

```typescript
{
  totalActive:    number   // total savings aktif
  dueToday:       number   // filter cocok tanggal/hari ini
  alreadyPaid:    number   // sudah deposit di period ini
  sent:           number   // WA berhasil dikirim
  skippedNoPhone: number   // tidak ada nomor HP
  errors:         number   // error saat send
}
```

### Template Variables (`wa_tpl_savings_reminder`)

```
customer_name, savings_number, savings_target, savings_current,
savings_remaining, savings_progress (%), installment_amount,
installment_frequency, installment_count, installment_paid, installment_remaining
```

### Catatan Penting

- Cek "already paid" **masih membaca `qurban_savings_transactions`** (legacy table), bukan universal `transactions`. Ini karena deposit bisa dari kedua jalur (legacy + universal). **Gap**: universal deposits tidak terdeteksi sebagai "already paid" jika tidak ada entry di legacy table.
- Scheduler `startSavingsReminderScheduler()` tersedia di kode tapi **status pemasangan di `index.ts` perlu dicek** — pemicu aktual via cron HTTP atau manual admin.

### Pemicu

| Pemicu | Source |
|--------|--------|
| Cron HTTP | `GET /cron/savings-reminder?secret=...` memakai `JWT_SECRET` sebagai secret |
| Manual admin | `POST /v1/admin/whatsapp/send-savings-reminder` |
| Scheduler | `startSavingsReminderScheduler(db, frontendUrl, runAtHour=8)` — setiap hari jam 08:00 WIB |

## Webhook WhatsApp Inbound

Webhook publik berada di `POST /v1/whatsapp/webhook`.

Alur aktual:

```text
GOWA webhook event=message
  -> abaikan group
  -> abaikan pesan dari diri sendiri
  -> dedupe messageId selama 60 detik di Map in-memory
  -> ekstrak text/gambar/dokumen
  -> jika whatsapp_bot_enabled=true, panggil processIncomingMessage()
  -> selalu balas HTTP 200 OK
```

Catatan penting:

- Route komentar menyebut `X-Hub-Signature-256`, tetapi kode belum memverifikasi HMAC.
- `whatsapp_webhook_secret` tersedia di settings/UI, tetapi belum dipakai untuk validasi webhook.
- Deduplication hanya in-memory, hilang saat proses restart dan tidak aman untuk multi-instance.
- Security middleware memang melewati validasi content-type untuk `/whatsapp/webhook` agar GOWA bisa mengirim payload bervariasi.

## Bot WhatsApp

Bot diproses oleh `apps/api/src/services/whatsapp-ai.ts` dengan state percakapan in-memory.

Kapabilitas aktual:

| Area | Implementasi |
|------|--------------|
| Provider AI | `gemini`, `claude`, dan `grok` di kode; default setting migration adalah `gemini` |
| Context | `Map` in-memory per nomor WhatsApp, TTL 30 menit, history maksimum 20 pesan |
| Donatur lookup | Mencari `donatur.phone` berdasarkan digit akhir nomor WhatsApp |
| Flow deterministik | `whatsapp-flow.ts` menangani zakat, donasi, fidyah, qurban, qurban savings, dan deposit savings |
| Bukti transfer gambar | Bot mencoba download media dari GOWA untuk dianalisis dan dipakai dalam flow konfirmasi pembayaran |
| Gold price | Cache harga emas 1 jam, fallback ke setting zakat |

Flow deterministik aktif ketika AI memicu flow. Selama `ctx.flowState` aktif, pesan berikutnya diproses oleh `handleFlowStep()` tanpa memanggil AI, kecuali pesan berupa gambar yang dianggap bukti transfer dan membuat flow keluar ke jalur AI.

Keterbatasan:

- Percakapan, flow state, dan bot logs tidak persisten.
- Multi-instance API dapat memecah state percakapan karena tiap proses punya Map sendiri.
- Tidak ada audit trail permanen untuk prompt, tool call, atau jawaban AI.
- Jika AI API key kosong, pesan inbound hanya dicatat warning dan tidak dibalas.

## Account Notifications

Tabel `notifications` menyimpan notifikasi akun in-app:

| Kolom | Fungsi |
|-------|--------|
| `user_id` | Pemilik notifikasi |
| `type` | Jenis notifikasi text |
| `title` | Judul |
| `message` | Isi |
| `data` | Payload JSON opsional |
| `is_read` | Status baca |
| `read_at` | Waktu dibaca |
| `created_at` | Waktu dibuat |

Endpoint account:

| Endpoint | Fungsi |
|----------|--------|
| `GET /v1/account/notifications` | List notifikasi user login |
| `PATCH /v1/account/notifications/:id/read` | Tandai satu notifikasi sebagai read |
| `POST /v1/account/notifications/read-all` | Tandai semua notifikasi user sebagai read |

Gap implementasi: `unreadCount` di `GET /v1/account/notifications` saat ini menghitung semua notifikasi user, belum memfilter `is_read=false`.

## OTP WhatsApp

OTP/verifikasi WhatsApp memakai tabel `auth_otp_codes`:

| Kolom | Fungsi |
|-------|--------|
| `user_id` | User terkait, nullable |
| `phone` | Nomor tujuan |
| `purpose` | Tujuan OTP |
| `code_hash` | Hash kode, bukan kode mentah |
| `expires_at` | Waktu kedaluwarsa |
| `consumed_at` | Waktu dipakai |
| `attempt_count` | Jumlah percobaan |

Pengiriman pesan OTP memakai template `wa_tpl_register_verify` di route auth.

## Email Service

File: `apps/api/src/services/email.ts`

Provider: **Resend** (`https://api.resend.com/emails`). Tidak menggunakan SMTP atau SendGrid.

```typescript
new EmailService(apiKey, fromEmail, fromName?)
```

### Template yang Tersedia

| Method | Keterangan |
|--------|-----------|
| `send(params)` | Raw email (to, subject, html, from?) |
| `sendDonationConfirmation(params)` | Konfirmasi donasi — donorName, campaignTitle, amount, invoiceNumber, paymentMethod |
| `sendCampaignStatusNotification(params)` | Notifikasi status campaign ke admin |
| `sendDisbursementNotification(params)` | Notifikasi disbursement ke admin |

### Status Penggunaan

Email service ada di kode tapi **penggunaan aktif sangat terbatas** — hanya di `apps/api/src/routes/payments.ts` (legacy) dan memiliki TypeScript errors di sana. WhatsApp adalah channel notifikasi utama yang aktif.

> **Backlog**: Jika email ingin diaktifkan penuh, perlu: env var `RESEND_API_KEY` + `EMAIL_FROM`, dan routing dari approve-payment ke `sendDonationConfirmation()`.

---

## Gap dan Rekomendasi

1. **Webhook signature wajib diimplementasikan.** Saat ini `whatsapp_webhook_secret` ada di settings tetapi tidak diverifikasi. Tambahkan HMAC validation sebelum memproses payload.
2. **Tambahkan outbox/delivery log untuk WhatsApp.** Struktur minimal: `templateKey`, `recipient`, `payload`, `status`, `attemptCount`, `lastError`, `sentAt`, `createdAt`.
3. **Pindahkan bot conversation state ke storage persisten.** Redis atau table khusus diperlukan jika API berjalan multi-instance atau harus tahan restart.
4. **Savings-reminder: cek "already paid" belum cover universal transactions.** `runSavingsReminders()` query ke `qurban_savings_transactions` (legacy), sehingga deposit via universal `transactions` tidak terdeteksi. Fix: tambah join ke `transactions` dengan `category = "qurban_savings"` dan `paymentStatus = "paid"`.
5. **Email service belum production-ready.** `EmailService` ada dan fungsional, tapi belum terintegrasi ke approve-payment flow. WhatsApp jadi primary, email jadi secondary yang belum aktif.
4. **Perbaiki `unreadCount`.** Query harus memfilter `notifications.isRead=false`.
5. **Pisahkan template configured vs triggered di UI.** `wa_tpl_payment_expired` dan `wa_tpl_savings_converted` sebaiknya diberi status belum aktif atau ditambahkan trigger implementasinya.
6. **Tambahkan rate limit khusus webhook dan admin test-send.** Rate limit global ada, tetapi webhook publik dan direct send lebih baik punya guard spesifik.
7. **Tambahkan observability.** Minimal log structured untuk provider response, template key, recipient masked, dan correlation id transaksi.
8. **Dokumentasikan SOP nomor pengirim.** Gunakan nomor khusus, warm-up, delay, dan batas bulk agar risiko ban GOWA lebih terkendali.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `03-Notifikasi-Whatsapp-Blueprint.md` | Diserap dan dikoreksi di dokumen ini; boleh dihapus |
| `docs/SOP-notifikasi.md` | Bukan scope dokumen ini; sudah diserap di `docs/arsitektur-komponen-admin.md` |
