import type { DocumentationPage } from "../types";

export const konsepMitraDoc: DocumentationPage = {
  slug: "konsep-mitra",
  title: "Konsep Mitra",
  category: "Operasional",
  summary:
    "Memahami model mitra lembaga, pendaftaran, hak akses, dan batasan data kepemilikan.",
  updatedAt: "2026-02-20",
  sections: [
    {
      id: "definisi",
      heading: "Apa Itu Mitra?",
      bodyHtml:
        '<p><strong>Mitra</strong> adalah lembaga/organisasi partner yang memiliki akun sendiri di admin panel untuk mengelola program yang dimilikinya. Mitra bisa membuat campaign, mengelola zakat, dan mengatur paket qurban sesuai otorisasi.</p>' +
        '<img src="/docs/screenshot-mitra.png" alt="Halaman Mitra" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
        '<p><em>Tampilan daftar mitra pada admin panel.</em></p>',
    },
    {
      id: "pendaftaran",
      heading: "Pendaftaran Mitra",
      bodyHtml:
        '<p>Alur pendaftaran mitra:</p>' +
        '<ol>' +
        '<li>Calon mitra mendaftar melalui halaman <strong>Daftar Mitra</strong> di website publik.</li>' +
        '<li>Mengisi data: nama lembaga, PIC, kontak, alamat, dan dokumen pendukung (KTP, buku rekening, NPWP).</li>' +
        '<li>Admin memverifikasi dan meng-approve pendaftaran.</li>' +
        '<li>Setelah disetujui, mitra mendapatkan akun login ke admin panel dengan role <strong>mitra</strong>.</li>' +
        '</ol>' +
        '<p>Status mitra: <strong>pending</strong> → <strong>verified</strong> (atau <strong>rejected</strong> dengan alasan).</p>',
    },
    {
      id: "ownership",
      heading: "Ownership Data",
      bodyHtml:
        '<ul>' +
        '<li>Mitra <strong>hanya bisa melihat data yang menjadi miliknya</strong>. Campaign, qurban, dan zakat yang dibuat oleh mitra otomatis ter-link ke profil mitra tersebut.</li>' +
        '<li>Laporan dan ringkasan dana untuk mitra difilter berdasarkan ownership program.</li>' +
        '<li>Aksi keuangan (pencairan dana) tetap mengikuti alur approval admin.</li>' +
        '</ul>',
    },
    {
      id: "keuangan-mitra",
      heading: "Keuangan Mitra",
      bodyHtml:
        '<p>Setiap mitra memiliki tracking keuangan:</p>' +
        '<ul>' +
        '<li><strong>Total Programs</strong> — Jumlah program yang dimiliki</li>' +
        '<li><strong>Total Donation Received</strong> — Total donasi yang masuk ke program miliknya</li>' +
        '<li><strong>Total Revenue Earned</strong> — Pendapatan dari revenue share</li>' +
        '<li><strong>Current Balance</strong> — Saldo yang bisa dicairkan</li>' +
        '<li><strong>Total Withdrawn</strong> — Total yang sudah dicairkan</li>' +
        '</ul>' +
        '<p>Mitra bisa mengajukan pencairan melalui menu <strong>Disbursements</strong>.</p>',
    },
    {
      id: "best-practice",
      heading: "Praktik Terbaik",
      bodyHtml:
        '<ul>' +
        '<li>Pastikan profil lembaga mitra <strong>lengkap</strong> sebelum publish program.</li>' +
        '<li>Gunakan <strong>rekening mitra yang valid</strong> untuk pencairan.</li>' +
        '<li>Audit periodik status transaksi paid/pending/rejected.</li>' +
        '<li>Unggah dokumen pendukung (KTP, NPWP, buku rekening) untuk mempercepat verifikasi.</li>' +
        '</ul>',
    },
  ],
};
