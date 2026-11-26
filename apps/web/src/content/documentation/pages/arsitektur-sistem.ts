import type { DocumentationPage } from "../types";

export const arsitekturSistemDoc: DocumentationPage = {
    slug: "arsitektur-sistem",
    title: "Arsitektur Sistem",
    category: "Developer",
    summary:
        "Ringkasan teknis untuk developer dan tim IT: aplikasi, stack, dan struktur repositori Jaladana.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "aplikasi",
            heading: "Aplikasi dalam Monorepo",
            bodyHtml:
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Aplikasi</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Port (start)</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Deskripsi</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>API</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">50245</td><td style="padding:10px; border:1px solid #e5e7eb;">Backend Hono (Node.js)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Admin</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">3002</td><td style="padding:10px; border:1px solid #e5e7eb;">Dashboard administrasi (Next.js 15)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Web</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">3003</td><td style="padding:10px; border:1px solid #e5e7eb;">Website publik donatur (Next.js 14)</td></tr>' +
                '</tbody></table>' +
                '<p>Database memakai <strong>PostgreSQL</strong> dengan <strong>Drizzle ORM</strong>. Skema dan migrasi ada di paket <code>packages/db</code>.</p>',
        },
        {
            id: "keamanan-akses",
            heading: "Akses & Keamanan",
            bodyHtml:
                '<ul>' +
                '<li>Autentikasi memakai JWT Bearer token.</li>' +
                '<li>Otorisasi berbasis peran (RBAC): <code>super_admin</code>, <code>admin_finance</code>, <code>admin_campaign</code>, <code>program_coordinator</code>, <code>employee</code>, <code>mitra</code>.</li>' +
                '<li>Semua route API berada di bawah prefix <code>/v1</code>; route admin di <code>/v1/admin/*</code>.</li>' +
                '</ul>',
        },
        {
            id: "pengembang",
            heading: "Pengembang",
            bodyHtml:
                '<p>Jaladana dikembangkan oleh <a href="https://webane.com" target="_blank" rel="noopener noreferrer">Webane Indonesia</a>.</p>',
        },
    ],
};
