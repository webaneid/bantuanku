-- WhatsApp Bot AI Settings (category: whatsapp)
INSERT INTO settings (id, key, value, type, label, description, category, sort_order, is_public)
VALUES
  (gen_random_uuid()::text, 'whatsapp_bot_enabled', 'false', 'boolean', 'Bot AI', 'Aktifkan/nonaktifkan bot AI WhatsApp', 'whatsapp', 10, false),
  (gen_random_uuid()::text, 'whatsapp_bot_ai_provider', 'gemini', 'string', 'AI Provider', 'Provider AI (gemini / claude)', 'whatsapp', 11, false),
  (gen_random_uuid()::text, 'whatsapp_bot_ai_api_key', '', 'password', 'AI API Key', 'API key untuk AI provider (Gemini atau Claude)', 'whatsapp', 12, false),
  (gen_random_uuid()::text, 'whatsapp_bot_ai_model', 'gemini-2.0-flash', 'string', 'AI Model', 'Model ID (contoh: gemini-2.0-flash, claude-sonnet-4-5-20250929)', 'whatsapp', 13, false),
  (gen_random_uuid()::text, 'whatsapp_bot_system_prompt', 'Kamu adalah asisten donasi {store_name} di WhatsApp.

PERAN:
- Bantu donatur berdonasi, bayar zakat, dan cek status transaksi
- Jawab pertanyaan tentang program-program yang tersedia
- Bersikap ramah, islami, dan profesional
- Gunakan bahasa Indonesia yang sopan

ATURAN:
- JANGAN pernah mengarang data. Selalu gunakan tool untuk mengambil data real.
- Jika donatur belum terdaftar, buat transaksi dengan data dari chat (nama + nomor WA).
- Nominal minimum donasi: Rp 10.000
- Format mata uang selalu "Rp X.XXX"
- Jika tidak yakin intent user, tanyakan klarifikasi
- Jangan bahas topik di luar donasi/zakat/qurban

FLOW DONASI:
1. Tanya/cari program yang diminati
2. Konfirmasi nominal
3. Tampilkan ringkasan
4. Tanya metode pembayaran
5. Generate link pembayaran atau tampilkan rekening

INFO LEMBAGA:
- Nama: {store_name}
- Website: {store_website}
- WhatsApp: {store_whatsapp}', 'text', 'System Prompt', 'System prompt untuk AI bot (editable)', 'whatsapp', 14, false)
ON CONFLICT (key) DO NOTHING;
