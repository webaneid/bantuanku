import type { DocumentationPage } from "../types";

export const whatsappNotificationDoc: DocumentationPage = {
    slug: "whatsapp-notifikasi",
    title: "Notifikasi Otomatis WhatsApp",
    category: "Fitur",
    summary:
        "Panduan mengelola dan menyesuaikan template notifikasi WhatsApp otomatis untuk donatur dan admin.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "konsep-dasar",
            heading: "Konsep Dasar Notifikasi WA",
            bodyHtml: `
                <p>Sistem Jaladana terintegrasi dengan WhatsApp (menggunakan layanan GOWA / unofficial WhatsApp Web API) untuk mengirimkan <strong>notifikasi 1-arah secara otomatis</strong>.</p>
                <p>Notifikasi ini mencakup seluruh siklus hidup donatur, mulai dari pendaftaran akun, tagihan transaksi, konfirmasi pembayaran, pengingat cicilan qurban, hingga laporan penyaluran dana.</p>
                <div class="doc-callout doc-callout-info">
                    <h4>Tanpa Biaya Per Pesan (Gratis)</h4>
                    <p>Sistem ini berjalan di atas nomor WhatsApp Anda sendiri melalui metode scan QR Code (GOWA). Karena tidak menggunakan WhatsApp Cloud API resmi berbayar, maka pengiriman pesan ini <strong>100% Gratis</strong> tanpa biaya per template.</p>
                    <p><strong>Tips Anti-Ban:</strong> Gunakan nomor khusus Yayasan (bukan nomor pribadi) dan sistem kami sudah dilengkapi fitur <em>Delay Antar Pesan</em> untuk menghindari pemblokiran.</p>
                </div>
            `,
        },
        {
            id: "manajemen-template",
            heading: "Mengelola Template Pesan",
            bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-settings-whatsapp-templates.png" alt="Settings → Notifikasi WhatsApp, tab Template Pesan" loading="lazy" /><figcaption>Settings → Notifikasi WhatsApp, tab Template Pesan</figcaption></figure>
                <p>Seluruh teks notifikasi dapat Anda ubah melalui menu <strong>Settings → Notifikasi WhatsApp</strong> (tab Template Pesan). Terdapat lebih dari 20 template yang bisa Anda aktif/non-aktifkan (toggle), dibagi dalam beberapa kategori:</p>
                <ul>
                    <li><strong>Registrasi & Akun:</strong> Pesan selamat datang dan OTP verifikasi.</li>
                    <li><strong>Transaksi Baru:</strong> Tagihan Donasi Campaign, Zakat, dan Qurban (memuat nominal & rekening bank).</li>
                    <li><strong>Status Pembayaran:</strong> Notifikasi bukti bayar diterima, sukses dikonfirmasi, ditolak, atau kedaluwarsa.</li>
                    <li><strong>Tabungan Qurban:</strong> Pengingat otomatis untuk cicilan setoran qurban mingguan/bulanan.</li>
                    <li><strong>Laporan & Penyaluran:</strong> Pemberitahuan saat Admin mem-publish Laporan Kegiatan atau Distribusi Dana kepada donatur terkait.</li>
                    <li><strong>Notifikasi Internal:</strong> Pesan singkat otomatis ke nomor WhatsApp grup Admin ketika ada transaksi baru atau permintaan pencairan dana <em>(Disbursement Request)</em>.</li>
                </ul>
            `,
        },
        {
            id: "system-variable",
            heading: "Sistem Variabel (Dynamic Text)",
            bodyHtml: `
                <p>Saat Anda mengedit template, Anda dapat menyisipkan <em>Variabel</em> (diapit dengan tanda kurung kurawal <code>{}</code>) yang akan otomatis terganti dengan data aslinya sebelum pesan dikirim.</p>
                <p>Contoh penggunaan variabel dalam template pesan:</p>
                <pre>
                    <code>
Yth. Bapak/Ibu <strong>{customer_name}</strong>,

Terima kasih atas donasi Anda untuk program <strong>{product_name}</strong>.
Silahkan lakukan pembayaran sebesar:
Rp <strong>{transfer_amount}</strong>

Ke Rekening:
🏦 <strong>{bank_name}</strong>
💳 <strong>{bank_account}</strong> (a.n <strong>{bank_holder}</strong>)
                    </code>
                </pre>
                <p><em>Untuk melihat daftar lengkap ratusan variabel yang didukung (mulai dari data lembaga, transaksi, kalkulasi zakat, hingga data qurban), Anda dapat merujuk ke petunjuk di halaman pengaturan WhatsApp Templates.</em></p>
            `,
        },
        {
            id: "community-care",
            heading: "Pesan Terjadwal & Broadcast",
            bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-wa-broadcasts.png" alt="Halaman WhatsApp → Broadcast" loading="lazy" /><figcaption>Halaman WhatsApp → Broadcast</figcaption></figure>
                <p>Selain notifikasi per transaksi, sistem mengirim pesan untuk merawat hubungan dengan donatur:</p>
                <ul>
                    <li><strong>Broadcast program baru</strong> — aktifkan toggle <em>Sebarkan ke donatur via WhatsApp</em> saat mempublikasikan campaign. Pesan dikirim bertahap.</li>
                    <li><strong>Broadcast manual</strong> — buat dan pantau pengiriman di menu <strong>WhatsApp → Broadcast</strong> (Super Admin dan Admin Finance).</li>
                    <li><strong>Ucapan ulang tahun</strong> dan <strong>pengingat donatur lama tak aktif</strong> — dikirim otomatis setiap hari.</li>
                </ul>
                <p><strong>Berhenti berlangganan:</strong> donatur dapat menolak pesan non-transaksi lewat tautan berhenti di pesan atau di profil akunnya. Donatur yang berhenti tidak akan dikirimi broadcast, ulang tahun, maupun pengingat, dan status ini juga bisa dilihat di data donatur di admin.</p>
            `,
        },
    ]
};
