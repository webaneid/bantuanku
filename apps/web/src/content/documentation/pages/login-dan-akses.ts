import type { DocumentationPage } from "../types";

export const loginDanAksesDoc: DocumentationPage = {
    slug: "login-dan-akses",
    title: "Login & Hak Akses",
    category: "Memulai",
    summary: "Cara masuk ke dashboard admin dan memahami menu yang bisa diakses tiap peran.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "cara-login",
            heading: "Cara Login",
            bodyHtml: `
<ol class="doc-steps">
<li>Buka alamat dashboard admin lembaga Anda (contoh: <code>https://admin.domainlembaga.org</code>).</li>
<li>Masukkan <strong>Email</strong> dan <strong>Password</strong> akun Anda.</li>
<li>Klik <strong>Login</strong>. Anda akan masuk ke halaman Dashboard.</li>
</ol>
<figure class="doc-figure"><img src="/docs/screenshot-login.png" alt="Halaman login dashboard admin" loading="lazy" /><figcaption>Halaman login dashboard admin</figcaption></figure>
<p>Lupa password? Klik tautan <strong>Lupa password</strong> di bawah kolom password, lalu ikuti petunjuk yang dikirim ke email Anda.</p>
<p>Akun dashboard dibuat oleh Super Admin lewat <strong>Settings → Users</strong>. Akun donatur di website publik adalah akun terpisah dan tidak bisa masuk ke dashboard.</p>`,
        },
        {
            id: "role-sistem",
            heading: "Peran (Role) dalam Sistem",
            bodyHtml: `
<p>Menu dan data yang tampil bergantung pada peran akun. Ada 6 peran:</p>
<table>
<thead><tr><th>Peran</th><th>Akses utama</th></tr></thead>
<tbody>
<tr><td><code>super_admin</code></td><td>Seluruh sistem, termasuk Settings dan manajemen pengguna.</td></tr>
<tr><td><code>admin_finance</code></td><td>Transaksi, pencairan, Keuangan (buku kas), Reports, data master, dan WhatsApp Broadcast. Juga melihat Campaign, Zakat, dan Qurban.</td></tr>
<tr><td><code>admin_campaign</code></td><td>Campaign (termasuk donasinya), kategori &amp; pilar, Pages, Zakat, Qurban, Influencer, Mitra, data master, dan statistik.</td></tr>
<tr><td><code>program_coordinator</code></td><td>Mengelola campaign yang ditugaskan kepadanya, pencairan, dan laporan kegiatan.</td></tr>
<tr><td><code>employee</code></td><td>Akses dasar operasional dan menu Influencer Saya.</td></tr>
<tr><td><code>mitra</code></td><td>Lembaga partner; hanya melihat dan mengelola data miliknya sendiri.</td></tr>
</tbody>
</table>
<p>Satu akun bisa memiliki lebih dari satu peran. Jika menu yang Anda butuhkan tidak muncul, hubungi Super Admin untuk menyesuaikan peran.</p>`,
        },
        {
            id: "hak-akses-mitra",
            heading: "Batasan Akses Mitra",
            bodyHtml: `
<p>Akun mitra hanya melihat menu yang relevan dengan programnya:</p>
<ul>
<li>Dashboard dan <strong>Campaigns</strong> milik mitra (campaign baru selalu berstatus Draft sampai ditinjau admin).</li>
<li><strong>Zakat</strong> (jenis dan periode) dan <strong>Qurban</strong> (periode, paket) milik mitra.</li>
<li><strong>Disbursements</strong> untuk mengajukan pencairan.</li>
<li>Profil <strong>Mitra</strong> lembaganya sendiri.</li>
</ul>
<p>Mitra tidak dapat membuka Transactions, Keuangan, Reports, Settings, maupun data milik mitra lain.</p>`,
        },
    ],
};
