import type { DocumentationPage } from "../types";

export const loginDanAksesDoc: DocumentationPage = {
    slug: "login-dan-akses",
    title: "Login & Hak Akses",
    category: "Memulai",
    summary:
        "Panduan login ke admin panel dan memahami hak akses berdasarkan role.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "cara-login",
            heading: "Cara Login",
            bodyHtml:
                '<ol>' +
                '<li>Buka panel admin di <code>https://admin.bantuanku.org</code> (atau <code>http://localhost:3001</code> untuk development).</li>' +
                '<li>Masukkan <strong>Email</strong> dan <strong>Password</strong> akun Anda.</li>' +
                '<li>Klik tombol <strong>Login</strong>.</li>' +
                '</ol>' +
                '<img src="/docs/screenshot-login.png" alt="Halaman Login Bantuanku Admin" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p><em>Tampilan halaman login admin panel Bantuanku.</em></p>',
        },
        {
            id: "role-sistem",
            heading: "Role Dalam Sistem",
            bodyHtml:
                '<p>Bantuanku menggunakan <strong>Role-Based Access Control (RBAC)</strong> dengan 6 role:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Role</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Akses</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>super_admin</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Akses penuh ke seluruh sistem</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>admin_finance</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Keuangan, pencairan, ledger, laporan, export</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>admin_campaign</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Campaign, pages, kategori, pilar</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>program_coordinator</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Koordinator program — mengelola kampanye yang ditugaskan</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>employee</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Staff — akses dasar ke data operasional</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>mitra</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Lembaga partner — hanya melihat data miliknya sendiri</td></tr>' +
                '</tbody></table>',
        },
        {
            id: "hak-akses-mitra",
            heading: "Batasan Akses Mitra",
            bodyHtml:
                '<p>Role <strong>mitra</strong> memiliki akses terbatas. Mitra <strong>BISA</strong> mengakses:</p>' +
                '<ul>' +
                '<li>Campaigns (miliknya sendiri)</li>' +
                '<li>Categories & Pillars (lihat saja)</li>' +
                '<li>Media Library (upload gambar)</li>' +
                '<li>Zakat Types & Periods (miliknya)</li>' +
                '<li>Qurban (miliknya)</li>' +
                '<li>Disbursements (pengajuan pencairan)</li>' +
                '<li>Activity Reports (miliknya)</li>' +
                '<li>Address lookup & Profile</li>' +
                '</ul>' +
                '<p>Mitra <strong>TIDAK BISA</strong> mengakses: Dashboard statistik, Users, Roles, Finance/Ledger, Reports, Analytics, Settings, Audit log, Export, Vendors, Employees.</p>',
        },
    ],
};
