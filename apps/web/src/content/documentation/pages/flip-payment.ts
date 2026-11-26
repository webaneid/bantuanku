import type { DocumentationPage } from "../types";

export const flipPaymentDoc: DocumentationPage = {
    slug: "flip-payment",
    title: "Gateway Pembayaran: Flip",
    category: "Keuangan",
    summary:
        "Panduan integrasi dan pengaturan Flip Payment Gateway untuk menerima donasi secara otomatis melalui berbagai bank dan e-wallet.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "pengenalan-flip",
            heading: "Pengenalan Flip Payment (Accept Payment)",
            bodyHtml: `
                <p>Platform Jaladana terintegrasi langsung dengan <strong>Big Flip (Accept Payment / PWF)</strong>. Fitur ini memungkinkan donatur untuk membayar donasi (Zakat, Campaign, Qurban) melalui Virtual Account berbagai bank atau e-wallet tanpa harus melakukan konfirmasi manual.</p>
                <p>Begitu donatur melakukan transfer ke rekening Flip, sistem Jaladana akan langsung menerima notifikasi (Webhook) dan mengubah status donasi menjadi <strong>Berhasil (Paid)</strong> dalam hitungan detik.</p>
            `,
        },
        {
            id: "persiapan-akun",
            heading: "Langkah 1: Persiapan Akun & Kredensial",
            bodyHtml: `
                <p>Sebelum fitur ini bisa digunakan, Anda harus memiliki akun Flip for Business dan menyalin beberapa kunci rahasia (Kredensial) ke dalam sistem Jaladana.</p>
                <ol class="doc-steps">
                    <li>Login ke dashboard Flip for Business di <a href="https://business.flip.id" target="_blank" rel="noreferrer">https://business.flip.id</a>.</li>
                    <li>Masuk ke menu <strong>Developer</strong> di bilah sebelah kiri, lalu pilih tab <strong>Credentials</strong>.</li>
                    <li>Di sana Anda akan menemukan bagian <strong>Accept Payment</strong>.</li>
                    <li>Catat atau salin dua hal penting berikut:
                        <ul>
                            <li><strong>Secret Key</strong> (Ini adalah kunci utama API Anda).</li>
                            <li><strong>Validation Token</strong> (Keamanan tambahan untuk webhook).</li>
                        </ul>
                    </li>
                </ol>
                <div class="doc-callout doc-callout-warn">
                    <p>
                        <strong>⚠️ Penting:</strong> Di dashboard Flip, Anda akan melihat tab <em>Production</em> (untuk transaksi uang asli) dan <em>Sandbox</em> (untuk ujicoba). Kredensial di kedua tab ini <strong>berbeda</strong>. Pastikan Anda menyalin dari tab yang sesuai dengan kebutuhan Anda saat ini.
                    </p>
                </div>
            `,
        },
        {
            id: "pengaturan-sistem",
            heading: "Langkah 2: Pengaturan di Aplikasi Jaladana",
            bodyHtml: `
                <p>Setelah mendapatkan kunci kredensial dari Flip, masukkan kunci tersebut ke dalam pengaturan aplikasi Jaladana:</p>
                <ol class="doc-steps">
                    <li>Masuk ke Dashboard Admin Jaladana, lalu tuju menu <strong>Settings &rarr; Payments</strong>.</li>
                    <li>Cari kartu gateway <strong>Flip</strong> lalu aktifkan.</li>
                    <li>Pilih <strong>Environment</strong> yang sesuai (Production untuk uang asli, atau Sandbox untuk simulasi).</li>
                    <li>Masukkan <strong>API Key</strong> (ini adalah <em>Secret Key</em> dari Flip tadi).</li>
                    <li>Masukkan <strong>Webhook Token</strong> (ini adalah <em>Validation Token</em> dari Flip tadi).</li>
                    <li>Pastikan status Gateway dicentang sebagai <strong>Aktif</strong>.</li>
                    <li>Simpan pengaturan.</li>
                </ol>
            `,
        },
        {
            id: "pengaturan-webhook",
            heading: "Langkah 3: Menghubungkan Webhook (Sangat Penting!)",
            bodyHtml: `
                <p>Langkah ini adalah yang <strong>paling sering terlupa</strong>. Jika Anda tidak mengatur Webhook, maka setiap kali donatur membayar, status di aplikasi Jaladana akan terus <em>"Pending"</em> selamanya.</p>
                <ol class="doc-steps">
                    <li>Kembali ke Dashboard Flip (menu <strong>Developer &rarr; Credentials</strong>).</li>
                    <li>Cari kolom isian <strong>Callback URL</strong> (atau Webhook URL) di bagian <em>Accept Payment</em>.</li>
                    <li>Masukkan URL Webhook sistem Jaladana Anda. Pola umumnya adalah:
                        <br/>
                        <code>https://api.domain-anda.com/v1/payments/flip/webhook</code>
                    </li>
                    <li>Simpan pengaturan di Flip.</li>
                </ol>
                <p>Sekarang, Flip tahu ke mana dia harus "menelepon" sistem Anda setiap kali ada uang masuk.</p>
            `,
        },
        {
            id: "info-tambahan",
            heading: "Informasi Tambahan & Limitasi",
            bodyHtml: `
                <ul>
                    <li><strong>Minimal Transaksi:</strong> Flip memiliki ketentuan nominal batas bawah yaitu Rp 10.000,- per transaksi. Pastikan nominal donasi minimum program Anda tidak di bawah angka ini bila Flip diaktifkan.</li>
                    <li><strong>Masa Berlaku Link (Expired):</strong> Tautan pembayaran atau nomor Virtual Account memiliki masa berlaku yang ditentukan Flip. Jika sudah kedaluwarsa, donatur perlu membuat transaksi donasi baru.</li>
                    <li><strong>Channel Pembayaran:</strong> Dengan metode Payment Link, Flip memungkinkan donatur untuk memilih bank atau e-wallet mereka langsung di halaman situs Flip yang sudah terenkripsi aman.</li>
                </ul>
            `,
        },
    ]
};
