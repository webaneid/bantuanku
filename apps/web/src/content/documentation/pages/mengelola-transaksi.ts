import type { DocumentationPage } from "../types";

export const mengelolaTransaksiDoc: DocumentationPage = {
    slug: "mengelola-transaksi",
    title: "Mengelola Transaksi",
    category: "Campaign & Donasi",
    summary:
        "Panduan melihat, memverifikasi, dan mengelola transaksi donasi yang masuk.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "jenis-transaksi",
            heading: "Jenis Transaksi",
            bodyHtml:
                '<p>Semua donasi masuk tercatat sebagai <strong>Universal Transaction</strong> dengan 3 jenis produk:</p>' +
                '<ul>' +
                '<li><strong>Campaign</strong> — Donasi ke program/campaign tertentu</li>' +
                '<li><strong>Zakat</strong> — Pembayaran zakat (penghasilan, maal, emas, dll)</li>' +
                '<li><strong>Qurban</strong> — Pesanan paket qurban (langsung atau tabungan)</li>' +
                '</ul>' +
                '<p>Setiap transaksi memiliki nomor unik, data donor, jumlah, status pembayaran, dan referensi ke produk terkait.</p>',
        },
        {
            id: "halaman-transaksi",
            heading: "Halaman Transaksi",
            bodyHtml:
                '<p>Buka menu <strong>Transactions</strong> di sidebar untuk melihat semua transaksi masuk:</p>' +
                '<img src="/docs/screenshot-transactions.png" alt="Halaman Transaksi" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p>Fitur yang tersedia:</p>' +
                '<ul>' +
                '<li>Filter berdasarkan <strong>status pembayaran</strong> (pending, paid, cancelled)</li>' +
                '<li>Filter berdasarkan <strong>jenis produk</strong> (campaign, zakat, qurban)</li>' +
                '<li>Search berdasarkan <strong>nama donor</strong> atau <strong>nomor transaksi</strong></li>' +
                '<li>Lihat detail transaksi dengan klik pada baris</li>' +
                '</ul>',
        },
        {
            id: "status-pembayaran",
            heading: "Status Pembayaran",
            bodyHtml:
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Status</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🟡 <strong>pending</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Menunggu pembayaran dari donatur</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🟢 <strong>paid</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Pembayaran sudah diterima dan terverifikasi</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🔵 <strong>partial</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Pembayaran sebagian (untuk cicilan qurban)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🔴 <strong>cancelled</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Transaksi dibatalkan atau kedaluwarsa</td></tr>' +
                '</tbody></table>' +
                '<p>Untuk pembayaran <strong>manual via transfer bank</strong>, admin perlu memverifikasi bukti transfer secara manual dan mengubah status ke <em>paid</em>.</p>',
        },
        {
            id: "revenue-share",
            heading: "Revenue Share Otomatis",
            bodyHtml:
                '<p>Setiap transaksi yang berstatus <strong>paid</strong> akan otomatis menghitung pembagian pendapatan:</p>' +
                '<ul>' +
                '<li><strong>Program</strong> — Dana untuk program yang dituju</li>' +
                '<li><strong>Amil</strong> — Bagian operasional lembaga</li>' +
                '<li><strong>Developer</strong> — Fee platform (jika diset)</li>' +
                '<li><strong>Fundraiser</strong> — Komisi referral (jika ada fundraiser)</li>' +
                '<li><strong>Mitra</strong> — Bagian lembaga partner (jika campaign milik mitra)</li>' +
                '</ul>' +
                '<p>Konfigurasi persentase bisa diatur di menu <strong>Settings</strong>.</p>',
        },
    ],
};
