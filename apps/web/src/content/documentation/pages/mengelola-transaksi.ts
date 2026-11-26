import type { DocumentationPage } from "../types";

export const mengelolaTransaksiDoc: DocumentationPage = {
    slug: "mengelola-transaksi",
    title: "Mengelola Transaksi",
    category: "Campaign & Donasi",
    summary: "Melihat, menyaring, dan memeriksa transaksi donasi, zakat, dan qurban yang masuk.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "jenis-transaksi",
            heading: "Jenis Transaksi",
            bodyHtml: `
<p>Semua pembayaran masuk tercatat sebagai satu jenis data transaksi dengan tiga tipe produk:</p>
<ul>
<li><strong>Campaign</strong> — donasi ke program tertentu.</li>
<li><strong>Zakat</strong> — fitrah, maal, profesi, pertanian, peternakan, dan lainnya.</li>
<li><strong>Qurban</strong> — pembayaran paket, tabungan qurban, dan biaya admin.</li>
</ul>
<p>Setiap transaksi memiliki nomor unik, data donatur, jumlah, metode, status pembayaran, dan referensi ke produknya.</p>`,
        },
        {
            id: "halaman-transaksi",
            heading: "Halaman Transactions",
            bodyHtml: `
<p>Menu <strong>Transactions</strong> dapat dibuka oleh Super Admin dan Admin Finance. Admin Campaign melihat donasi campaign lewat <strong>Campaigns → Donations</strong>.</p>
<img src="/docs/screenshot-transactions.png" alt="Halaman Transactions" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />
<p>Yang bisa dilakukan:</p>
<ul>
<li>Cari berdasarkan <strong>email donatur</strong>.</li>
<li>Saring menurut <strong>Tipe</strong> (campaign/zakat/qurban), <strong>Status</strong>, <strong>Kategori</strong> (mis. Zakat Fitrah, Tabungan Qurban), dan <strong>rentang tanggal</strong>.</li>
<li>Klik baris untuk membuka detail transaksi.</li>
<li>Gunakan <strong>Create</strong> untuk mencatat transaksi manual (misalnya donasi tunai).</li>
</ul>`,
        },
        {
            id: "status-pembayaran",
            heading: "Status Pembayaran",
            bodyHtml: `
<table>
<thead><tr><th>Status</th><th>Arti</th></tr></thead>
<tbody>
<tr><td><code>pending</code></td><td>Menunggu pembayaran dari donatur.</td></tr>
<tr><td><code>partial</code></td><td>Terbayar sebagian (cicilan/tabungan qurban).</td></tr>
<tr><td><code>paid</code></td><td>Pembayaran diterima dan terverifikasi.</td></tr>
<tr><td><code>cancelled</code></td><td>Dibatalkan atau kedaluwarsa.</td></tr>
</tbody>
</table>
<p>Pembayaran lewat <strong>gateway</strong> (Flip, iPaymu, Xendit, Midtrans) berubah ke <code>paid</code> otomatis lewat webhook. Untuk <strong>transfer manual</strong>, periksa bukti transfer donatur lalu verifikasi dari halaman detail transaksi.</p>`,
        },
        {
            id: "revenue-share",
            heading: "Bagi Hasil Otomatis",
            bodyHtml: `
<p>Transaksi berstatus <code>paid</code> otomatis dihitung pembagiannya sesuai pengaturan: porsi program, amil, influencer (jika ada kode referral), dan mitra (jika campaign milik mitra). Hasilnya dapat dilihat di menu <strong>Keuangan → Bagi Hasil</strong> dan laporan Bagi Hasil Amil. Penjelasan lengkap ada di halaman <a href="/documentation/bagi-hasil-amil">Sistem Bagi Hasil Amil</a>.</p>`,
        },
    ],
};
