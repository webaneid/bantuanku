import type { DocumentationPage } from "../types";

export const alurPencairanDoc: DocumentationPage = {
  slug: "alur-pencairan",
  title: "Alur Pencairan Dana",
  category: "Keuangan",
  summary:
    "Panduan lengkap alur pengajuan, persetujuan, hingga pencairan dana pada sistem disbursements.",
  updatedAt: "2026-02-20",
  sections: [
    {
      id: "overview",
      heading: "Overview Sistem Pencairan",
      bodyHtml:
        '<p>Sistem <strong>Disbursements</strong> menangani seluruh pencairan dana keluar dengan 6 tipe:</p>' +
        '<ul>' +
        '<li><strong>Campaign</strong> — Pencairan dana kampanye ke penerima manfaat</li>' +
        '<li><strong>Zakat</strong> — Distribusi zakat ke mustahiq</li>' +
        '<li><strong>Qurban</strong> — Pembayaran ke vendor/penyedia hewan qurban</li>' +
        '<li><strong>Operational</strong> — Biaya operasional lembaga</li>' +
        '<li><strong>Vendor</strong> — Pembayaran ke vendor/supplier</li>' +
        '<li><strong>Revenue Share</strong> — Pencairan komisi ke fundraiser/mitra</li>' +
        '</ul>' +
        '<img src="/docs/screenshot-disbursements.png" alt="Halaman Disbursements" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
        '<p><em>Tampilan daftar pencairan pada admin panel.</em></p>',
    },
    {
      id: "pengajuan",
      heading: "1. Tahap Pengajuan (Draft → Submitted)",
      bodyHtml:
        '<ol>' +
        '<li>Buka menu <strong>Disbursements</strong> dan klik tombol <strong>Buat Pencairan</strong>.</li>' +
        '<li>Pilih <strong>tipe pencairan</strong> dan <strong>kategori</strong> yang sesuai.</li>' +
        '<li>Isi jumlah dana, tujuan pencairan, serta data penerima (nama, bank, nomor rekening).</li>' +
        '<li>Pilih <strong>sumber dana</strong> (bank account yang akan mengirim).</li>' +
        '<li>Klik <strong>Simpan</strong> (status: Draft) lalu <strong>Submit</strong> untuk diproses admin.</li>' +
        '</ol>' +
        '<p><em>Mitra juga dapat mengajukan pencairan untuk program miliknya sendiri.</em></p>',
    },
    {
      id: "approval",
      heading: "2. Tahap Persetujuan (Submitted → Approved/Rejected)",
      bodyHtml:
        '<ul>' +
        '<li>Admin memeriksa kelengkapan data dan ketersediaan dana.</li>' +
        '<li>Jika disetujui → status berubah ke <strong>approved</strong>.</li>' +
        '<li>Jika ditolak → status menjadi <strong>rejected</strong> dengan catatan alasan penolakan.</li>' +
        '<li>Pencairan yang ditolak bisa diperbaiki dan diajukan ulang.</li>' +
        '</ul>',
    },
    {
      id: "pembayaran",
      heading: "3. Tahap Pembayaran (Approved → Paid)",
      bodyHtml:
        '<ol>' +
        '<li>Admin melakukan transfer ke rekening penerima.</li>' +
        '<li>Upload <strong>bukti transfer</strong> (foto/screenshot).</li>' +
        '<li>Isi tanggal transfer dan jumlah yang ditransfer.</li>' +
        '<li>Status berubah ke <strong>paid</strong>.</li>' +
        '</ol>' +
        '<p>Semua mutasi pencairan akan:</p>' +
        '<ul>' +
        '<li>Tercatat di <strong>Ledger</strong> sebagai journal entry (double-entry)</li>' +
        '<li>Mempengaruhi laporan <strong>Cash Flow</strong></li>' +
        '<li>Muncul di histori pencairan dengan bukti transfer</li>' +
        '</ul>',
    },
    {
      id: "status-flow",
      heading: "Alur Status Lengkap",
      bodyHtml:
        '<div style="background:#f9fafb; padding:16px; border-radius:8px; font-family:monospace; text-align:center; margin:16px 0;">' +
        '<strong>draft</strong> → <strong>submitted</strong> → <strong>approved</strong> → <strong>paid</strong><br/>' +
        '<span style="color:#888;">↘ rejected (bisa submit ulang)</span>' +
        '</div>',
    },
  ],
};
