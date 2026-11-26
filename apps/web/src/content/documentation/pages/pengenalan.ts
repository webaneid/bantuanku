import type { DocumentationPage } from "../types";

export const pengenalanDoc: DocumentationPage = {
    slug: "pengenalan",
    title: "Pengenalan Jaladana",
    category: "Memulai",
    summary:
        "Gambaran umum platform Jaladana: apa yang bisa dilakukan, siapa yang memakai, dan dari mana mulai membaca panduan.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "apa-itu-jaladana",
            heading: "Apa Itu Jaladana?",
            bodyHtml:
                '<p><strong>Jaladana</strong> adalah platform untuk lembaga amil zakat dan lembaga sosial: menggalang donasi, menerima zakat dan qurban, mengelola keuangan, hingga melaporkan penyaluran dana kepada donatur.</p>' +
                '<p>Platform terdiri dari dua sisi:</p>' +
                '<ul>' +
                '<li><strong>Website publik</strong> — tempat donatur melihat program, berdonasi, membayar zakat, mendaftar qurban, dan memantau riwayat donasinya.</li>' +
                '<li><strong>Dashboard admin</strong> — tempat tim lembaga mengelola program, transaksi, keuangan, laporan, dan pengaturan.</li>' +
                '</ul>',
        },
        {
            id: "fitur-utama",
            heading: "Fitur Utama",
            bodyHtml:
                '<ul>' +
                '<li><strong>Program &amp; donasi</strong> — campaign, wakaf, keranjang bantuan, dan checkout donasi.</li>' +
                '<li><strong>Zakat</strong> — kalkulator zakat (penghasilan, maal, emas, perdagangan, fitrah, fidyah) dan pencatatan pembayaran.</li>' +
                '<li><strong>Qurban</strong> — paket hewan, pendaftaran, tabungan qurban, grup patungan, dan penyembelihan.</li>' +
                '<li><strong>Pembayaran</strong> — transfer bank manual, QRIS, dan gateway pembayaran (Flip, iPaymu, Xendit, Midtrans).</li>' +
                '<li><strong>Keuangan</strong> — buku kas, saldo rekening, pencairan dana, bagi hasil, dan laporan keuangan.</li>' +
                '<li><strong>Donatur</strong> — akun donatur, riwayat donasi, dan pengingat otomatis lewat WhatsApp.</li>' +
                '<li><strong>Mitra &amp; influencer</strong> — lembaga mitra dan program referral dengan komisi.</li>' +
                '<li><strong>Laporan &amp; SEO</strong> — laporan kegiatan publik, statistik, dan pengaturan SEO.</li>' +
                '</ul>',
        },
        {
            id: "peran-pengguna",
            heading: "Peran Pengguna Dashboard",
            bodyHtml:
                '<p>Menu yang terlihat di dashboard bergantung pada peran akun Anda:</p>' +
                '<ul>' +
                '<li><strong>Super Admin</strong> — akses penuh, termasuk pengaturan dan manajemen pengguna.</li>' +
                '<li><strong>Admin Keuangan</strong> — transaksi, pencairan, buku kas, dan laporan keuangan.</li>' +
                '<li><strong>Admin Campaign</strong> — mengelola program dan melihat donasinya.</li>' +
                '<li><strong>Program Coordinator</strong> — mengoordinasikan program yang ditugaskan.</li>' +
                '<li><strong>Karyawan</strong> — akses sesuai tugas operasional.</li>' +
                '<li><strong>Mitra</strong> — hanya data milik lembaga mitra sendiri.</li>' +
                '</ul>' +
                '<p>Detailnya ada di halaman <a href="/documentation/login-dan-akses">Login &amp; Hak Akses</a>.</p>',
        },
        {
            id: "mulai-dari-mana",
            heading: "Mulai Dari Mana?",
            bodyHtml:
                '<ol class="doc-steps">' +
                '<li>Baca <a href="/documentation/login-dan-akses">Login &amp; Hak Akses</a> lalu <a href="/documentation/navigasi-dashboard">Navigasi Dashboard</a> untuk mengenal tampilan.</li>' +
                '<li>Buat program pertama lewat <a href="/documentation/cara-membuat-campaign">Cara Membuat Campaign</a>.</li>' +
                '<li>Pelajari cara memeriksa donasi di <a href="/documentation/mengelola-transaksi">Mengelola Transaksi</a>.</li>' +
                '<li>Untuk sisi keuangan, lanjut ke bagian Keuangan di menu samping.</li>' +
                '</ol>' +
                '<p>Informasi teknis (arsitektur, port, stack) untuk developer ada di <a href="/documentation/arsitektur-sistem">Arsitektur Sistem</a>.</p>',
        },
    ],
};
