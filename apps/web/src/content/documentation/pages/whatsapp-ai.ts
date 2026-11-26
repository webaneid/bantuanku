import type { DocumentationPage } from "../types";

export const whatsappAiDoc: DocumentationPage = {
    slug: "whatsapp-ai",
    title: "Robot AI WhatsApp (Chatbot)",
    category: "Fitur",
    summary: "Bot dua arah yang melayani donatur lewat WhatsApp: tanya jawab, donasi, zakat, qurban, dan konfirmasi pembayaran.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "konsep-dasar-ai",
            heading: "Apa itu Robot AI WhatsApp?",
            bodyHtml: `
<p>Berbeda dengan <a href="/documentation/whatsapp-notifikasi">notifikasi otomatis</a> yang satu arah, Robot AI bersifat <strong>dua arah</strong>: donatur mengirim pesan ke nomor WhatsApp lembaga dan dijawab otomatis, 24 jam.</p>
<p>Robot memakai model AI (Gemini, Claude, atau Grok) untuk memahami maksud pesan, tetapi <strong>proses transaksi dijalankan oleh alur baku di sistem</strong>, bukan oleh AI. Jadi nominal, tagihan, dan nomor rekening selalu berasal dari data Jaladana.</p>`,
        },
        {
            id: "kemampuan-ai",
            heading: "Yang Bisa Dilakukan Robot",
            bodyHtml: `
<ul>
<li><strong>Menjawab pertanyaan</strong> tentang program, laporan kegiatan, halaman informasi, harga emas, rekening, dan cara pembayaran.</li>
<li><strong>Memandu berdonasi</strong> ke campaign, <strong>membayar zakat</strong> (termasuk menghitungnya), <strong>fidyah</strong>, <strong>qurban</strong> (individu dan patungan), serta <strong>tabungan qurban</strong> dan setoran cicilannya.</li>
<li><strong>Mendaftarkan donatur baru</strong> memakai nomor pengirim.</li>
<li><strong>Mengecek status transaksi</strong> milik pengirim dan mengirimkan tautan pembayaran atau QRIS.</li>
<li><strong>Menerima bukti transfer</strong>: donatur mengirim foto bukti, lalu transaksi masuk antrean verifikasi admin.</li>
</ul>`,
        },
        {
            id: "pengaturan-bot",
            heading: "Mengaktifkan Robot",
            bodyHtml: `
<p>Pengaturan ada di <strong>Settings → Notifikasi WhatsApp</strong>, tab <strong>Bot</strong>. Tab ini hanya terlihat oleh akun Super Admin pengembang platform. Isinya:</p>
<ul>
<li>Saklar aktif/nonaktif bot.</li>
<li>Penyedia AI (<code>gemini</code>, <code>claude</code>, atau <code>grok</code>), API key, dan nama model.</li>
<li>Tambahan instruksi (system prompt) dari admin.</li>
<li>Log percakapan bot untuk ditinjau.</li>
</ul>
<p>Robot memerlukan koneksi WhatsApp (GOWA) yang sudah aktif. Lihat pengaturan koneksi di <a href="/documentation/whatsapp-notifikasi">Notifikasi WhatsApp</a>.</p>`,
        },
        {
            id: "batasan-dan-pengawasan",
            heading: "Batasan dan Keamanan",
            bodyHtml: `
<div class="doc-callout doc-callout-warn"><span class="doc-callout-title">Bukti bayar wajib gambar</span>Robot tidak akan mengonfirmasi pembayaran tanpa foto bukti transfer, dan tidak boleh mengatakan "pembayaran diterima" tanpa itu. Status <code>paid</code> tetap menunggu verifikasi admin.</div>
<ul>
<li><strong>Hanya data milik pengirim.</strong> Robot mengenali pengirim dari nomor WhatsApp-nya; transaksi milik nomor lain dijawab "tidak ditemukan".</li>
<li><strong>Tidak mengubah harga.</strong> Nominal berasal dari data program dan pengaturan; robot tidak dapat memberi diskon atau mengubah tagihan.</li>
<li><strong>Percakapan sementara.</strong> Konteks disimpan 30 menit tanpa aktivitas, maksimal 20 pesan terakhir, dan hilang bila server API dimulai ulang. Donatur yang sedang di tengah alur mungkin perlu memulai ulang.</li>
<li><strong>Batas antrean.</strong> Jika pesan beruntun dari satu nomor menumpuk (lebih dari 5), kelebihannya diabaikan.</li>
<li><strong>Tidak ada pengalihan otomatis ke admin.</strong> Untuk keluhan yang tidak terjawab, donatur perlu dihubungi manual oleh tim lewat nomor admin atau kontak lembaga.</li>
</ul>`,
        },
        {
            id: "tips",
            heading: "Praktik Baik",
            bodyHtml: `
<ul>
<li>Pastikan program, rekening, dan harga emas di sistem selalu mutakhir; itulah sumber jawaban robot.</li>
<li>Gunakan nomor WhatsApp khusus lembaga, bukan nomor pribadi.</li>
<li>Tinjau log percakapan secara berkala untuk menemukan pertanyaan yang belum terjawab baik.</li>
<li>Pantau biaya penggunaan API di akun penyedia AI.</li>
</ul>`,
        },
    ],
};
