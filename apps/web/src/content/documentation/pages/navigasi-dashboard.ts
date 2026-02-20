import type { DocumentationPage } from "../types";

export const navigasiDashboardDoc: DocumentationPage = {
    slug: "navigasi-dashboard",
    title: "Navigasi Dashboard",
    category: "Memulai",
    summary:
        "Mengenal tampilan dashboard admin dan menu-menu utama yang tersedia.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "overview-dashboard",
            heading: "Halaman Dashboard",
            bodyHtml:
                '<p>Setelah login, Anda akan masuk ke halaman <strong>Dashboard</strong> yang menampilkan ringkasan data penting:</p>' +
                '<img src="/docs/screenshot-dashboard.png" alt="Dashboard Admin Bantuanku" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p>Dashboard menampilkan:</p>' +
                '<ul>' +
                '<li><strong>Total Pemasukan</strong> — Total dana masuk dan persentase pertumbuhan</li>' +
                '<li><strong>Transaksi 30 Hari</strong> — Jumlah transaksi dalam 30 hari terakhir</li>' +
                '<li><strong>Campaign Aktif</strong> — Jumlah program yang sedang berjalan</li>' +
                '<li><strong>Donatur Unik</strong> — Total donatur yang pernah berdonasi</li>' +
                '<li><strong>Pencairan Menunggu</strong> — Jumlah pencairan yang menunggu persetujuan</li>' +
                '</ul>',
        },
        {
            id: "tren-chart",
            heading: "Grafik & Komposisi",
            bodyHtml:
                '<p>Pada bagian tengah dashboard terdapat:</p>' +
                '<ul>' +
                '<li><strong>Tren Pemasukan</strong> — Grafik garis yang menampilkan tren donasi masuk dalam 7, 30, atau 90 hari terakhir.</li>' +
                '<li><strong>Komposisi Pemasukan</strong> — Diagram donut yang menampilkan proporsi pemasukan berdasarkan jenis: Zakat, Campaign, dan Qurban.</li>' +
                '</ul>',
        },
        {
            id: "menu-sidebar",
            heading: "Menu Sidebar",
            bodyHtml:
                '<p>Panel navigasi di sisi kiri menyediakan akses ke seluruh modul:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Menu</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Fungsi</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Dashboard</td><td style="padding:10px; border:1px solid #e5e7eb;">Ringkasan statistik utama</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Campaigns</td><td style="padding:10px; border:1px solid #e5e7eb;">Kelola program (All Campaigns, Donations, Categories, Pillars)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Zakat</td><td style="padding:10px; border:1px solid #e5e7eb;">Kelola jenis zakat, periode, donasi, distribusi, statistik</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Qurban</td><td style="padding:10px; border:1px solid #e5e7eb;">Kelola periode, paket, pesanan, tabungan qurban</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Pages</td><td style="padding:10px; border:1px solid #e5e7eb;">CMS halaman statis</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Laporan Kegiatan</td><td style="padding:10px; border:1px solid #e5e7eb;">Activity reports untuk disbursement</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Transactions</td><td style="padding:10px; border:1px solid #e5e7eb;">Semua transaksi masuk (campaign, zakat, qurban)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Fundraisers</td><td style="padding:10px; border:1px solid #e5e7eb;">Kelola fundraiser dan komisi referral</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Profile</td><td style="padding:10px; border:1px solid #e5e7eb;">Profil pengguna yang sedang login</td></tr>' +
                '</tbody></table>' +
                '<p>Menu tambahan tersedia di dashboard tergantung role: <em>Donatur, Users, Ledger, Master, Mitra, Disbursements, Reports, Settings</em>, dan lainnya.</p>',
        },
    ],
};
