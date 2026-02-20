import type { DocumentationPage } from "../types";

export const pengenalanDoc: DocumentationPage = {
    slug: "pengenalan",
    title: "Pengenalan Bantuanku",
    category: "Memulai",
    summary:
        "Pengenalan umum platform Bantuanku — fitur, arsitektur, dan teknologi yang digunakan.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "apa-itu-bantuanku",
            heading: "Apa Itu Bantuanku?",
            bodyHtml:
                '<p><strong>Bantuanku</strong> adalah platform donasi online yang komprehensif untuk mengelola campaign, donasi, zakat, qurban, tabungan qurban, dan penyaluran dana. Dikembangkan oleh <a href="https://webane.com" target="_blank">Webane Indonesia</a>.</p>' +
                '<p>Platform ini mendukung berbagai jenis program penggalangan dana termasuk:</p>' +
                '<ul>' +
                '<li><strong>Campaign / Program</strong> — Penggalangan dana untuk berbagai keperluan sosial</li>' +
                '<li><strong>Zakat</strong> — Kalkulator zakat, pengumpulan, dan distribusi</li>' +
                '<li><strong>Qurban</strong> — Pendaftaran, tabungan, dan eksekusi qurban</li>' +
                '<li><strong>Pencairan Dana</strong> — Disbursement terstruktur dengan approval workflow</li>' +
                '</ul>',
        },
        {
            id: "arsitektur",
            heading: "Arsitektur Sistem",
            bodyHtml:
                '<p>Bantuanku menggunakan arsitektur <strong>monorepo</strong> dengan tiga aplikasi utama:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Aplikasi</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Port</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Deskripsi</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>API</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">50245</td><td style="padding:10px; border:1px solid #e5e7eb;">Backend Hono + Node.js, 22 public routes, 41 admin routes</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Admin</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">3001</td><td style="padding:10px; border:1px solid #e5e7eb;">Next.js 15, panel administrasi 18 modul dashboard</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Web</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">3002</td><td style="padding:10px; border:1px solid #e5e7eb;">Next.js 14, website publik untuk donatur</td></tr>' +
                '</tbody></table>' +
                '<p>Database menggunakan <strong>PostgreSQL (Neon)</strong> dengan <strong>Drizzle ORM</strong> dan 49 tabel schema.</p>',
        },
        {
            id: "fitur-utama",
            heading: "Fitur Utama",
            bodyHtml:
                '<ul>' +
                '<li>✅ Multi-gateway pembayaran (Flip, iPaymu, Midtrans, Xendit, Manual, QRIS)</li>' +
                '<li>✅ Double-entry ledger & Chart of Accounts</li>' +
                '<li>✅ Revenue sharing otomatis (Amil, Developer, Fundraiser, Mitra)</li>' +
                '<li>✅ RBAC — 6 role: super_admin, admin_finance, admin_campaign, program_coordinator, employee, mitra</li>' +
                '<li>✅ Kalkulator zakat lengkap (penghasilan, maal, emas, perdagangan, fitrah, fidyah)</li>' +
                '<li>✅ Sistem qurban (tabungan, cicilan, grup patungan, eksekusi)</li>' +
                '<li>✅ Mitra / lembaga partner dengan data ownership</li>' +
                '<li>✅ Fundraiser referral system dengan komisi</li>' +
                '<li>✅ WhatsApp AI bot & notifikasi</li>' +
                '<li>✅ Media library, SEO, sitemap, multi-bahasa</li>' +
                '<li>✅ Laporan keuangan, export CSV/XLSX, audit log</li>' +
                '</ul>',
        },
    ],
};
