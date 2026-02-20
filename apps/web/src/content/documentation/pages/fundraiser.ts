import type { DocumentationPage } from "../types";

export const fundraiserDoc: DocumentationPage = {
    slug: "fundraiser",
    title: "Sistem Fundraiser",
    category: "Operasional",
    summary:
        "Panduan mengelola fundraiser: pendaftaran, kode referral, tracking komisi, dan pencairan.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "apa-itu-fundraiser",
            heading: "Apa Itu Fundraiser?",
            bodyHtml:
                '<p><strong>Fundraiser</strong> adalah individu yang membantu mempromosikan program di Bantuanku dan mendapatkan <strong>komisi</strong> dari setiap donasi yang masuk melalui link referralnya.</p>' +
                '<p>Fundraiser bisa berasal dari 2 sumber:</p>' +
                '<ul>' +
                '<li><strong>Donatur</strong> — Donatur luar yang mendaftar sendiri secara mandiri lewat akun mereka di website publik</li>' +
                '<li><strong>Employee</strong> — Staff/karyawan yang mendaftar sendiri lewat admin panel atau didaftarkan admin</li>' +
                '</ul>' +
                '<img src="/docs/screenshot-fundraisers.png" alt="Halaman Fundraisers" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p><em>Tampilan halaman fundraiser pada admin panel — menampilkan kode, nama, tipe, status, total referral, total donasi, dan komisi.</em></p>',
        },
        {
            id: "alur-pendaftaran",
            heading: "Alur Pendaftaran",
            bodyHtml:
                '<h4 style="margin-top:12px;">Dari Website (Donatur)</h4>' +
                '<ol>' +
                '<li>Donatur login ke akun di website publik.</li>' +
                '<li>Buka menu Akun / Profil lalu pilih <strong>Fundraiser</strong>.</li>' +
                '<li>Klik tombol daftar/pengajuan sebagai Fundraiser.</li>' +
                '<li>Status pendaftaran akan masuk sebagai <strong>pending</strong> dan menunggu disetujui <em>(approve)</em> oleh Admin.</li>' +
                '</ol>' +
                '<h4 style="margin-top:16px;">Dari Admin Panel (Employee)</h4>' +
                '<ol>' +
                '<li>Employee login ke admin panel.</li>' +
                '<li>Buka menu <strong>My Fundraiser</strong> di sidebar.</li>' +
                '<li>Lengkapi data <strong>rekening bank</strong> terlebih dahulu.</li>' +
                '<li>Klik <strong>Daftar Sebagai Fundraiser</strong>.</li>' +
                '<li>Status: <strong>pending</strong> → admin harus approve.</li>' +
                '</ol>' +
                '<h4 style="margin-top:16px;">Dari Admin Panel (Admin membuat manual)</h4>' +
                '<ol>' +
                '<li>Buka menu <strong>Fundraisers</strong> → klik <strong>+ Tambah Fundraiser</strong>.</li>' +
                '<li>Pilih sumber: <strong>Donatur</strong> atau <strong>Employee</strong>.</li>' +
                '<li>Atur persentase komisi sesuai kebijakan.</li>' +
                '<li>Simpan — fundraiser langsung aktif.</li>' +
                '</ol>',
        },
        {
            id: "kode-referral",
            heading: "Kode Referral & Link Share",
            bodyHtml:
                '<p>Setiap fundraiser mendapatkan <strong>kode unik</strong> berformat <code>FRS62XXXXX</code> (contoh: FRS6200001).</p>' +
                '<p>Cara kerja referral:</p>' +
                '<ol>' +
                '<li>Fundraiser membagikan link dengan parameter <code>?ref=FRS6200001</code> ke program tertentu.</li>' +
                '<li>Saat donatur mengklik link, sistem menyimpan <strong>sesi referral</strong> di browser (hanya berlaku selama tab browser terbuka / belum ditutup).</li>' +
                '<li>Saat donatur berdonasi, cookie dicocokkan → referral tercatat.</li>' +
                '<li>Model atribusi: <strong>last-click</strong> (klik terakhir yang dihitung).</li>' +
                '</ol>' +
                '<p>Fundraiser bisa melihat daftar program aktif yang tersedia untuk dishare (campaign, zakat, qurban).</p>',
        },
        {
            id: "komisi",
            heading: "Perhitungan Komisi",
            bodyHtml:
                '<p>Komisi dihitung otomatis setiap kali transaksi referral berstatus <strong>paid</strong>:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Item</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Persentase Komisi</td><td style="padding:10px; border:1px solid #e5e7eb;">Disesuaikan oleh admin, bisa diatur secara global maupun per fundraiser</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Sumber Komisi</td><td style="padding:10px; border:1px solid #e5e7eb;">Dipotong dari bagian <strong>Amil</strong> (bukan dari dana program)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Pengaturan</td><td style="padding:10px; border:1px solid #e5e7eb;">Dikelola melalui menu <strong>Settings</strong> oleh admin</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Pencegahan Transaksi Sendiri</td><td style="padding:10px; border:1px solid #e5e7eb;">Jika donatur yang berdonasi adalah orang yang <strong>sama</strong> dengan fundraiser pemilik link, maka status referral akan dilewati (tidak dapat komisi)</td></tr>' +
                '</tbody></table>' +
                '<p>Tracking per fundraiser:</p>' +
                '<ul>' +
                '<li><strong>Total Referrals</strong> — Jumlah donasi yang direferensikan</li>' +
                '<li><strong>Total Donation Amount</strong> — Total nominal donasi masuk melalui referral</li>' +
                '<li><strong>Total Commission Earned</strong> — Total komisi yang sudah dikalkulasi</li>' +
                '<li><strong>Current Balance</strong> — Saldo yang bisa dicairkan</li>' +
                '<li><strong>Total Withdrawn</strong> — Total yang sudah dicairkan</li>' +
                '</ul>',
        },
        {
            id: "pencairan-komisi",
            heading: "Pencairan Komisi",
            bodyHtml:
                '<p>Fundraiser bisa mengajukan pencairan komisi:</p>' +
                '<ol>' +
                '<li>Buka halaman <strong>Fundraiser Portal</strong> (website) atau <strong>My Fundraiser</strong> (admin).</li>' +
                '<li>Pastikan <strong>rekening bank</strong> sudah terdaftar.</li>' +
                '<li>Cek <strong>saldo tersedia</strong> (Current Balance).</li>' +
                '<li>Isi jumlah yang ingin dicairkan dan tujuan pencairan.</li>' +
                '<li>Klik <strong>Ajukan Pencairan</strong>.</li>' +
                '</ol>' +
                '<p>Pencairan akan masuk ke sistem <strong>Disbursements</strong> dengan tipe <code>revenue_share</code> kategori <code>revenue_share_fundraiser</code>, lalu mengikuti alur approval standar (submitted → approved → paid).</p>',
        },
        {
            id: "status",
            heading: "Status Fundraiser",
            bodyHtml:
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Status</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🟡 <strong>pending</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Menunggu approval admin</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🟢 <strong>active</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Aktif — bisa mendapatkan referral & mengajukan pencairan</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">🔴 <strong>inactive</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Dinonaktifkan admin — referral tidak dihitung</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">⚫ <strong>rejected</strong></td><td style="padding:10px; border:1px solid #e5e7eb;">Pendaftaran ditolak</td></tr>' +
                '</tbody></table>' +
                '<p>Admin bisa mengubah status fundraiser kapan saja dari halaman detail fundraiser.</p>',
        },
    ],
};
