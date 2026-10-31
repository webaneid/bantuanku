# ADR-0019: Prompt Bot WA = Inti Ringkas Bawaan + Tambahan dari Admin

**Status:** Accepted
**Tanggal:** 2026-10-31

## Context
Setting `whatsapp_bot_system_prompt` sebelumnya menggantikan seluruh prompt bawaan (`aiConfig.systemPrompt || defaultPrompt`). Di produksi admin menyimpan prompt lama 879 karakter, sehingga aturan bawaan (registrasi, bukti transfer, fidyah, `calculate_zakat`, `get_info`, jangan tampilkan ID) tidak berlaku dan teks lama yang bertentangan ("buat transaksi dari data chat") justru berlaku. Prompt bawaan juga ±12 KB dan dikirim di setiap putaran.

## Decision
- Prompt disusun `buildBotSystemPrompt`: inti ringkas di kode (`BOT_CORE_PROMPT`) + teks admin sebagai "instruksi tambahan" + info lembaga + blok donatur. Inti menang bila bertentangan.
- Kolom "System Prompt" di admin berarti instruksi tambahan; hint form diubah. Provider/model/API key tidak terpengaruh.
- Definisi tool dipangkas; panduan pemilihan tool ada di inti.
- Perubahan prompt/tool divalidasi dengan `scripts/e2e-wa-bot.ts` (22 pertanyaan) sebelum deploy.

## Alternatif yang Dipertimbangkan
- Tetap menggantikan penuh — ditolak: aturan keamanan alur (registrasi, bukti transfer) bergantung pada teks admin.
- Mengunci prompt tanpa tambahan admin — ditolak: admin perlu mengatur gaya bahasa/info khusus.

## Konsekuensi
- Aturan inti selalu berlaku. Hasil uji: 22/22 lulus (sebelumnya 21/22); token per pertanyaan turun hanya ±3% (5.605 → 5.443) karena inti baru ditambahkan ke prompt admin yang sangat pendek. Penghematan nyata terhadap prompt bawaan lama (±12 KB) jauh lebih besar.
- Perubahan aturan inti butuh deploy kode, bukan edit di admin.
- `cached=0` (implicit cache) belum dimanfaatkan; context caching eksplisit dapat dievaluasi terpisah.
