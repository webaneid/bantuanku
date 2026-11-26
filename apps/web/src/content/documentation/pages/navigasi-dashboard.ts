import type { DocumentationPage } from "../types";

export const navigasiDashboardDoc: DocumentationPage = {
    slug: "navigasi-dashboard",
    title: "Navigasi Dashboard",
    category: "Memulai",
    summary: "Mengenal halaman dashboard dan menu sidebar beserta peran yang dapat mengaksesnya.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "overview-dashboard",
            heading: "Halaman Dashboard",
            bodyHtml: `
<p>Setelah login Anda masuk ke Dashboard yang berisi ringkasan data penting, antara lain total pemasukan, jumlah transaksi, campaign aktif, donatur, dan pencairan yang menunggu persetujuan.</p>
<figure class="doc-figure"><img src="/docs/screenshot-dashboard.png" alt="Dashboard admin" loading="lazy" /><figcaption>Dashboard admin</figcaption></figure>
<p>Di bagian tengah ada grafik tren pemasukan (7, 30, atau 90 hari) dan komposisi pemasukan menurut jenis: campaign, zakat, dan qurban. Angka yang tampil menyesuaikan peran Anda.</p>`,
        },
        {
            id: "menu-sidebar",
            heading: "Menu Sidebar",
            bodyHtml: `
<p>Menu di sisi kiri dikelompokkan per modul. Menu yang tidak diizinkan untuk peran Anda otomatis disembunyikan.</p>
<table>
<thead><tr><th>Menu</th><th>Isi</th><th>Peran</th></tr></thead>
<tbody>
<tr><td>Campaigns</td><td>All Campaigns, Donations, Categories, Pillars</td><td>Admin, koordinator, mitra (terbatas)</td></tr>
<tr><td>Zakat</td><td>Dashboard Zakat, Jenis, Periode, Pembayaran, Penyaluran, Kalkulator</td><td>Admin, mitra (jenis &amp; periode)</td></tr>
<tr><td>Qurban</td><td>Periode, Paket Hewan, Orders, Tabungan Qurban, Grup Patungan, Diskon &amp; Voucher</td><td>Admin, mitra (periode &amp; paket)</td></tr>
<tr><td>Pages</td><td>Halaman statis (CMS)</td><td>Super Admin, Admin Campaign</td></tr>
<tr><td>Laporan Kegiatan</td><td>Laporan penyaluran untuk donatur</td><td>Admin, koordinator</td></tr>
<tr><td>Transactions</td><td>Semua transaksi masuk</td><td>Super Admin, Admin Finance</td></tr>
<tr><td>Influencer</td><td>Influencer dan komisi referral</td><td>Admin</td></tr>
<tr><td>Mitra</td><td>Lembaga partner</td><td>Super Admin, Admin Campaign, mitra</td></tr>
<tr><td>Disbursements</td><td>Pengajuan dan persetujuan pencairan dana</td><td>Admin, koordinator, mitra</td></tr>
<tr><td>Master</td><td>Donatur, Vendors, Employees, Mustahiq, Penghasilan Bulanan</td><td>Admin</td></tr>
<tr><td>Statistics</td><td>Statistik donatur dan mustahiq</td><td>Admin</td></tr>
<tr><td>Keuangan</td><td>Buku kas: Arus Kas, Sirkulasi Rekening, Dana per Sumber, Bagi Hasil, per Mitra/Influencer/Program, Perlu Ditinjau</td><td>Super Admin, Admin Finance</td></tr>
<tr><td>Reports</td><td>Laporan keuangan (Cash Flow, Neraca, Zakat, Qurban, Bagi Hasil Amil, per Rekening, per Donatur, dan lainnya)</td><td>Super Admin, Admin Finance</td></tr>
<tr><td>WhatsApp</td><td>Broadcast ke donatur</td><td>Super Admin, Admin Finance</td></tr>
<tr><td>Influencer Saya</td><td>Kode referral dan komisi pribadi</td><td>Employee, koordinator</td></tr>
<tr><td>Settings</td><td>Pengaturan umum, pembayaran, branding, SEO, WhatsApp, integrasi, dan lainnya</td><td>Super Admin, Admin Finance (sebagian)</td></tr>
</tbody>
</table>`,
        },
    ],
};
