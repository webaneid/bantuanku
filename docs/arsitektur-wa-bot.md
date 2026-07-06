# Arsitektur WA Bot AI — Chatbot Donasi WhatsApp

Dokumen ini menjelaskan arsitektur sistem WA AI Chatbot yang berjalan di atas GOWA (Go WhatsApp API). Sistem ini terpisah dari WA Community Care (broadcast/birthday/reengagement) — keduanya berbagi `WhatsAppService` dan GOWA sebagai transport, tapi alur logikanya independen.

---

## Gambaran Umum

Bot AI menerima pesan WhatsApp masuk, memahami konteks, dan melayani donatur untuk:
- Donasi ke campaign
- Zakat (fitrah, maal, penghasilan, profesi, pertanian, peternakan, bisnis)
- Fidyah
- Qurban (individu dan patungan)
- Tabungan Qurban (cicilan)
- Konfirmasi pembayaran via bukti transfer

Flow transaksi dieksekusi oleh **deterministic state machine** (bukan AI), sedangkan AI berperan sebagai router/interpreter yang memahami intent dan memanggil tools.

---

## File Utama

| File | Baris | Fungsi |
|------|-------|--------|
| `apps/api/src/routes/whatsapp.ts` | 136 | Webhook receiver, dedup, routing ke `processIncomingMessage` |
| `apps/api/src/services/whatsapp-ai.ts` | ~2423 | Logika AI: tools, context, provider adapters, gold scraper |
| `apps/api/src/services/whatsapp-flow.ts` | ~2324 | State machine semua flow transaksi |

---

## A. Webhook Entry Point

### Route

```
POST /v1/whatsapp/webhook
```

Mount di `apps/api/src/index.ts` → `app.route("/v1/whatsapp", whatsappWebhookRoutes)`.

### Payload GOWA (format yang diterima)

```json
{
  "device_id": "628xxx@s.whatsapp.net",
  "event": "message",
  "payload": {
    "body": "Halo saya mau donasi",
    "chat_id": "628xxx@s.whatsapp.net",
    "from": "628xxx@s.whatsapp.net",
    "from_name": "Ahmad",
    "id": "3B26C3756EC451645DDF",
    "is_from_me": false,
    "timestamp": "2026-02-18T18:13:58Z",
    "image": { "url": "statics/media/xxx.jpeg", "mimetype": "image/jpeg" }
  }
}
```

### Filter di Webhook

1. **Group chat** — `chat_id` berisi `@g.us` → return OK tanpa proses
2. **Pesan dari diri sendiri** — `is_from_me = true` → return OK tanpa proses
3. **Dedup** — `processedMessages Map<id, timestamp>` TTL 60 detik; jika messageId sudah ada → skip
4. **Bot disabled** — setting `whatsapp_bot_enabled !== "true"` → return OK tanpa proses
5. **AI key kosong** — log warning → return OK tanpa proses

### Pra-processing URL Gambar

Sebelum dikirim ke `processIncomingMessage`, URL gambar dikonversi:
- Path relatif `statics/media/xxx.jpg` → `__gowa_path__:statics/media/xxx.jpg`
- Object `{ url: "statics/..." }` → sama
- Object `{ id: "media-id" }` → `__gowa_media__:media-id`
- Full URL `https://...` → diteruskan as-is

---

## B. Conversation Context

### Struktur In-Memory

```typescript
interface ConversationContext {
  phone: string;           // nomor HP (tanpa @s.whatsapp.net)
  profileName: string;     // nama profil WA
  history: Array<{ role: "user" | "assistant"; content: string }>;
  donaturId?: string;      // ID dari DB jika terdaftar
  donorName?: string;      // nama dari DB (lebih presisi dari profileName)
  flowState?: FlowState;   // active flow, undefined jika tidak ada
  lastActivity: number;    // timestamp ms
}
```

**Storage:** `Map<string, ConversationContext>` dengan key = nomor HP.

**TTL:** 30 menit inaktif → entry dihapus saat `getConversation()` dipanggil (lazy cleanup).

**History limit:** Max 20 pesan (slice -20 saat overflow). Saat flow aktif, slot assistant diisi `"[Flow otomatis]"`.

**Lookup donatur:** Saat percakapan baru, cari di DB by phone (`ilike(donatur.phone, ...)`). Jika ditemukan, set `ctx.donaturId` dan `ctx.donorName`.

---

## C. Provider AI

### Setting Keys (category: `"whatsapp"`)

| Key | Tipe | Default | Keterangan |
|-----|------|---------|------------|
| `whatsapp_bot_enabled` | `"true"/"false"` | — | Master switch bot |
| `whatsapp_bot_ai_provider` | string | `"gemini"` | Provider yang aktif |
| `whatsapp_bot_ai_api_key` | string | — | API key provider |
| `whatsapp_bot_ai_model` | string | `"gemini-2.0-flash"` | Model yang dipakai |
| `whatsapp_bot_system_prompt` | string | (lihat bawah) | Override system prompt |

### Provider yang Didukung

| Provider | Endpoint | Format |
|----------|----------|--------|
| `gemini` | `generativelanguage.googleapis.com/v1beta` | Google Generative AI |
| `claude` | `api.anthropic.com/v1/messages` | Anthropic Messages API |
| `grok` | `api.x.ai/v1/chat/completions` | OpenAI-compatible |

### System Prompt Default

System prompt multi-bagian yang hardcoded sebagai fallback. Konten: peran asisten donasi islami, aturan (wajib pakai tool untuk aksi, jangan mengarang data), flow registrasi donatur, alur setiap jenis transaksi, konfirmasi pembayaran (wajib ada gambar). Template variables `{store_name}`, `{store_website}`, `{store_whatsapp}` di-inject dari `WhatsAppService.getGlobalVariables()`.

### Loop AI

```
processIncomingMessage()
  └─ loop MAX_ROUNDS = 5
       ├─ call AI API (dengan history + tool definitions)
       ├─ jika ada tool call → execute tool, append result, lanjut loop
       ├─ jika flow trigger terdeteksi → break loop
       └─ jika hanya teks → kirim ke donatur, break loop
```

**Gemini khusus:** Mode `"ANY"` — harus selalu return tool call (tidak bisa reply teks langsung). Retry 2x saat rate limit 429, delay 3 detik.

---

## D. Tools AI (19 Tools)

### Info / Lookup Tools

| Tool | Fungsi |
|------|--------|
| `get_program_overview` | Ringkasan semua program: donasi, zakat, qurban, fidyah, wakaf |
| `search_campaigns` | Cari campaign by keyword (filter status=active) |
| `get_campaign_detail` | Detail campaign + progress donasi |
| `check_transaction_status` | Cek status transaksi by phone atau kode TRX-... |
| `get_zakat_menu` | Menu jenis zakat (info saja, bukan bayar) |
| `get_zakat_programs` | Daftar program per jenis zakat |
| `get_bank_details` | Info rekening bank, filter by program type (zakat/qurban/wakaf/umum) |
| `check_qurban_savings` | Cek status/progress tabungan qurban donatur |
| `get_payment_link` | Generate link invoice by transactionId |

### Flow Trigger Tools

| Tool | Flow yang Dimulai |
|------|------------------|
| `start_zakat_flow` | Flow zakat |
| `start_donation_flow` | Flow donasi |
| `start_fidyah_flow` | Flow fidyah |
| `start_qurban_flow` | Flow qurban |
| `start_qurban_savings_flow` | Flow tabungan qurban |
| `start_savings_deposit_flow` | Flow setor tabungan |

**Mekanisme trigger:** Tool return `execState.flowTrigger = FlowState`. Loop AI break. `processIncomingMessage` memanggil `generateFirstFlowMessage()` untuk kirim pesan pertama ke donatur.

**Guard pre-trigger:** Semua flow trigger tools cek `donaturId` terlebih dahulu. Jika donatur belum terdaftar → return error string, AI diminta jalankan `register_donatur` dulu.

### Aksi Tools

| Tool | Fungsi |
|------|--------|
| `register_donatur` | Daftarkan donatur baru (nama, email, phone) |
| `send_qris` | Kirim QRIS PNG (dinamis dari EMV payload, atau fallback ke static) via GOWA |
| `confirm_payment` | Konfirmasi pembayaran — **wajib ada `imageBuffer`** |
| `respond_to_user` | Kirim teks biasa (shortcut tanpa masuk tool chain) |

### Guard Rails

1. **`confirm_payment` tanpa gambar** → blocked, return "minta bukti transfer dulu"
2. **`respond_to_user` dengan frasa konfirmasi pembayaran** (10+ frasa hardcoded) → blocked, return "minta bukti transfer dulu"

---

## E. Flow State Machine

### Struktur FlowState

```typescript
interface FlowState {
  type: "zakat" | "donation" | "fidyah" | "qurban" | "qurban_savings" | "qurban_savings_deposit";
  step: string;
  data: Record<string, any>;
  startedAt: number;
}
```

### Kapan Flow Di-Clear

- User ketik batal/cancel/tidak jadi/dll → `matchCancel()` → `ctx.flowState = undefined`
- Step confirm selesai → `ctx.flowState = undefined`
- Error di step → `ctx.flowState = undefined` + kirim pesan error generik
- User kirim gambar saat flow aktif → clear flow, fall through ke AI (diasumsikan bukti transfer)
- Conversation TTL (30 menit) expired → entry Map dihapus

---

## F. Detail Setiap Flow

### Flow `zakat`

Entry: `createZakatFlowState({ calculatorType? })`. Jika `calculatorType` sudah diketahui → mulai di `select_program`. Jika tidak → mulai di `select_type`.

| Step | Deskripsi |
|------|-----------|
| `select_type` | Tampilkan menu jenis zakat; tunggu input nomor/keyword |
| `select_program` | Tampilkan daftar program zakat; tunggu pilihan |
| `ask_data` | Tanya data spesifik per calculatorType: fitrah→jumlah jiwa; maal→total harta; penghasilan/profesi→gaji bulanan; pertanian→nilai panen; peternakan→nilai ternak; bisnis→modal usaha |
| `ask_data_hutang` | (maal only) Tanya hutang yang dikurangi |
| `ask_data_irigasi` | (pertanian only) Tanya jenis irigasi (5% atau 10%) |
| `ask_data_bisnis_keuntungan` | (bisnis) Tanya keuntungan usaha |
| `ask_data_bisnis_piutang` | (bisnis) Tanya piutang usaha |
| `ask_data_bisnis_hutang` | (bisnis) Tanya hutang usaha → calculate |
| `ask_on_behalf` | (fitrah only) Tanya atas nama siapa |
| `confirm` | Tampilkan ringkasan + niat + nominal; Ya → `TransactionService.create({ product_type: "zakat" })` |

### Flow `donation`

Entry: `createDonationFlowState({ campaignId, campaignName, amount? })`. Jika `amount` sudah ada → langsung ke `confirm`.

| Step | Deskripsi |
|------|-----------|
| `ask_amount` | Tanya nominal (min Rp 10.000) |
| `confirm` | Tampilkan ringkasan; Ya → `TransactionService.create({ product_type: "campaign" })` |

### Flow `fidyah`

Entry: `createFidyahFlowState({ campaignId, campaignName })`. Selalu mulai di `ask_person_count`.

| Step | Deskripsi |
|------|-----------|
| `ask_person_count` | Tanya jumlah orang (1–999) |
| `ask_day_count` | Tanya jumlah hari (1–366) |
| `ask_on_behalf` | Tanya nama penerima fidyah; hitung: orang × hari × `fidyah_amount_per_day` (setting DB, default 45.000) |
| `confirm` | Tampilkan ringkasan + formula + niat; Ya → `TransactionService.create({ type_specific_data: { fidyah_person_count, fidyah_day_count, ... } })` |

### Flow `qurban`

Entry: `createQurbanFlowState()`. Selalu mulai di `select_period`.

| Step | Deskripsi |
|------|-----------|
| `select_period` | Tampilkan periode qurban aktif; auto-select jika hanya 1 |
| `select_package` | Tampilkan paket (kambing/sapi, individu/patungan) + sisa stok/slot |
| `ask_quantity` | (individual only) Tanya jumlah ekor; validasi vs stok |
| `ask_on_behalf` | Tanya nama atas nama siapa; hitung admin fee dari settings `amil_qurban_sapi_fee` / `amil_qurban_perekor_fee` |
| `confirm` | Tampilkan ringkasan + niat + total + kode unik; Ya → `TransactionService.create({ product_type: "qurban", type_specific_data: { period_id, package_id, ... } })` |

### Flow `qurban_savings` (Buat Tabungan Baru)

Entry: `createQurbanSavingsFlowState()`. Mulai di `select_period`.

| Step | Deskripsi |
|------|-----------|
| `select_period` | Tampilkan periode aktif; auto-select jika 1 |
| `select_package` | Tampilkan paket; hitung target_amount = harga + admin fee |
| `ask_frequency` | Tanya frekuensi: 1=Bulanan, 2=Mingguan |
| `ask_installment_count` | Tanya jumlah cicilan: bulanan→[3,6,12,24]x; mingguan→[12,24,48]x |
| `ask_installment_day` | Tanya jadwal: bulanan→tanggal 1–28; mingguan→hari 1=Senin..7=Minggu |
| `confirm` | Tampilkan ringkasan lengkap; Ya → `db.insert(qurban_savings)` |

### Flow `qurban_savings_deposit` (Setor Tabungan)

Entry: `createQurbanSavingsDepositFlowState()`. Mulai di `show_savings`.

| Step | Deskripsi |
|------|-----------|
| `show_savings` | Cari tabungan aktif by phone; jika 1 → auto ke `ask_amount`; jika >1 → ke `select_savings` |
| `select_savings` | Tunggu pilihan nomor tabungan |
| `ask_amount` | Tampilkan info tabungan (progress, sisa, nominal cicilan); tanya konfirmasi Ya atau ketik nominal berbeda (min 10.000); Ya → `TransactionService.create({ type_specific_data: { payment_type: "savings", savings_id } })` |

---

## G. Penanganan Gambar & Bukti Transfer

### Download dari GOWA

```
__gowa_path__:xxx       → GET {gowaApiUrl}/xxx (Basic Auth + X-Device-Id)
__gowa_media__:ID       → GET {gowaApiUrl}/media/download/ID (Basic Auth)
https://...             → fetch tanpa auth → jika gagal + hostname sama → retry GOWA auth
                          → jika masih gagal → try {gowaApiUrl}/media/download/{filename}
```

### Saat Terima Gambar

1. Buffer gambar disimpan di `ToolContext.imageBuffer`
2. Dikirim ke AI sebagai inline base64 (multimodal — didukung Gemini, Claude, Grok)
3. Jika AI trigger `confirm_payment`:
   - Upload ke GCS jika `cdn_enabled = "true"`: path `payment-proofs/transaction/{txId}/{timestamp}-wa-proof.{ext}`
   - Insert row ke `transaction_payments`
   - Update `transactions.paymentStatus = "processing"`

### Gambar Saat Flow Aktif

Flow di-clear, pesan diteruskan ke AI. AI menginterpretasi sebagai bukti transfer dan memanggil `confirm_payment`.

---

## H. Gold Price Scraper

**Digunakan untuk:** Kalkulasi zakat maal (menentukan nisab berbasis harga emas).

**Sumber:** `https://pluang.com/asset/gold` — scrape HTML `__NEXT_DATA__` JSON, ambil `props.pageProps.goldAssetPerformance.currentMidPrice`.

**Cache:** In-memory `{ price, fetchedAt }`. TTL 1 jam. Timeout fetch 5 detik.

**Fallback:** Jika scrape gagal / harga < 100.000 (sanity check) → baca setting DB `zakat_gold_price`.

---

## I. Integrasi dengan Sistem Lain

### TransactionService

Dipanggil di 5 titik (semua pakai `include_unique_code: true` kecuali savings deposit):

| Flow | product_type | Keterangan |
|------|-------------|------------|
| donation confirm | `campaign` | campaignId = referenceId |
| zakat confirm | `zakat` | zakatPeriodId = referenceId |
| fidyah confirm | `campaign` | type_specific_data: fidyah info |
| qurban confirm | `qurban` | type_specific_data: period_id, package_id |
| savings deposit | `qurban` | type_specific_data: payment_type="savings", savings_id |

### WhatsAppService

- `wa.sendMessage(phone, text)` — kirim teks ke donatur
- `wa.getConfig()` — ambil GOWA config (apiUrl, username, password, deviceId)
- `wa.getGlobalVariables()` — inject variabel ke system prompt

### Database

- `settings` — baca konfigurasi bot, template WA, fidyah_amount_per_day, QRIS setting
- `donatur` — lookup by phone, register baru
- `campaigns`, `zakatPeriods`, `qurbanPackagePeriods` — data program
- `transactions`, `transactionPayments` — konfirmasi pembayaran
- `qurban_savings` — buat tabungan baru

---

## J. Settings Admin untuk Bot

Semua konfigurasi bot di-set via admin panel (Settings → WhatsApp) dan tersimpan di tabel `settings` category `"whatsapp"`:

| Key | Keterangan |
|-----|-----------|
| `whatsapp_bot_enabled` | Master switch |
| `whatsapp_bot_ai_provider` | `gemini` / `claude` / `grok` |
| `whatsapp_bot_ai_api_key` | API key provider |
| `whatsapp_bot_ai_model` | Nama model |
| `whatsapp_bot_system_prompt` | Custom prompt (opsional, ada default hardcoded) |
| `fidyah_amount_per_day` | Nominal fidyah per hari (default: 45.000) |
| `amil_qurban_sapi_fee` | Admin fee sapi qurban |
| `amil_qurban_perekor_fee` | Admin fee per ekor kambing |

---

## K. Keterbatasan & Edge Cases yang Diketahui

| Kondisi | Perilaku |
|---------|----------|
| Group chat | Di-ignore |
| Pesan dari bot sendiri | Di-ignore |
| Bot disabled | Return OK tanpa reply |
| AI API key kosong | Log warning, return OK tanpa reply |
| AI error (exception) | Reply "terjadi gangguan" — flow tidak ikut di-clear |
| Conversation TTL expired | Context hilang, percakapan mulai dari awal |
| Donatur belum terdaftar saat trigger flow | Error string ke AI, AI diminta register dulu |
| Gambar saat flow aktif | Flow di-clear, diproses sebagai bukti transfer |
| QRIS tidak ada | Return error string ke AI |
| Gold scraper gagal | Fallback ke setting DB |
| History overflow | Slice 20 pesan terakhir |

---

## L. Gap Implementasi

| Gap | Dampak | Prioritas |
|-----|--------|-----------|
| Conversation context hilang saat API restart | Donatur yang sedang di-flow harus mulai ulang | Medium |
| Gold price scraper bergantung pada struktur HTML Pluang | Bisa rusak jika Pluang update halaman | Medium |
| Tidak ada mechanism retry pengiriman WA dari bot | Jika GOWA down saat reply, pesan hilang tanpa notifikasi | Medium |
| History 20 pesan tidak persistent | Jika API restart di tengah percakapan panjang, konteks hilang | Low |
| Bot tidak handle sticker/voice/video/dokumen secara eksplisit | Dokumen → `"[Pengguna mengirim dokumen]"` (treated as no image) | Low |
| Tidak ada rate limit per user | Donatur bisa spam bot tanpa throttle | Low |

---

## M. Cara Menambah Flow Baru

1. **Definisikan FlowState type baru** di `FlowState.type` union
2. **Buat `createXxxFlowState()`** di `whatsapp-flow.ts` yang return `FlowState` awal
3. **Implementasikan `handleXxxFlow()`** di `whatsapp-flow.ts` dengan switch per step
4. **Tambahkan tool trigger** `start_xxx_flow` di `TOOL_DEFINITIONS` di `whatsapp-ai.ts`
5. **Implementasikan tool handler** di `executeTool()` switch case
6. **Update system prompt** untuk mendeskripsikan kapan dan bagaimana trigger flow ini
7. **Tambahkan case** di `handleFlowStep()` dispatcher di `whatsapp-ai.ts`
8. **Test:** pastikan cancel, timeout, dan error path semua clear `ctx.flowState`
