import type { DocumentationPage } from "../types";

export const alurPencairanDoc: DocumentationPage = {
  slug: "alur-pencairan",
  title: "Alur Pencairan Dana",
  category: "Keuangan",
  summary: "Cara mengajukan, menyetujui, dan membayar pencairan dana keluar, sampai tercatat di buku kas.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "overview",
      heading: "Overview Sistem Pencairan",
      bodyHtml: `
<p>Semua dana keluar diajukan lewat menu <strong>Disbursements</strong>. Ada 6 tipe pencairan:</p>
<ul>
<li><strong>Campaign</strong> — penyaluran dana program ke penerima manfaat.</li>
<li><strong>Zakat</strong> — penyaluran ke mustahiq (8 asnaf).</li>
<li><strong>Qurban</strong> — pembelian hewan dan biaya penyembelihan/distribusi.</li>
<li><strong>Operational</strong> — biaya operasional lembaga.</li>
<li><strong>Vendor</strong> — pembayaran ke vendor/supplier.</li>
<li><strong>Revenue Share</strong> — pencairan bagi hasil mitra, influencer, atau developer.</li>
</ul>
<figure class="doc-figure"><img src="/docs/screenshot-disbursements.png" alt="Halaman Disbursements" loading="lazy" /><figcaption>Halaman Disbursements</figcaption></figure>
<p>Submenu: <strong>Semua Pencairan</strong>, <strong>Pengajuan</strong>, dan <strong>Disetujui</strong>. Akun mitra hanya melihat pencairan program miliknya.</p>`,
    },
    {
      id: "pengajuan",
      heading: "1. Pengajuan (Draft → Submitted)",
      bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-disbursement-create.png" alt="Form Buat Pencairan" loading="lazy" /><figcaption>Form Buat Pencairan</figcaption></figure>
<ol class="doc-steps">
<li>Buka <strong>Disbursements</strong> lalu klik <strong>Buat Pencairan</strong>.</li>
<li>Pilih tipe pencairan, program/periode terkait, dan kategori pengeluaran.</li>
<li>Isi jumlah, tujuan, dan data penerima (nama, bank, nomor rekening).</li>
<li>Simpan sebagai <strong>Draft</strong>, lalu <strong>Submit</strong> agar diproses admin.</li>
</ol>
<p>Sistem memvalidasi kecukupan dana dan kesesuaian kategori. Lihat <a href="/documentation/kategori-keuangan">Sistem Kategori Keuangan</a>.</p>`,
    },
    {
      id: "approval",
      heading: "2. Persetujuan (Submitted → Approved / Rejected)",
      bodyHtml: `
<p>Admin keuangan memeriksa kelengkapan data dan ketersediaan dana. Jika disetujui statusnya menjadi <code>approved</code>; jika ditolak menjadi <code>rejected</code> beserta catatan alasan, dan pengaju dapat memperbaiki lalu mengajukan ulang.</p>`,
    },
    {
      id: "pembayaran",
      heading: "3. Pembayaran (Approved → Paid)",
      bodyHtml: `
<ol class="doc-steps">
<li>Transfer dana ke rekening penerima.</li>
<li>Unggah bukti transfer, isi tanggal dan jumlah yang ditransfer.</li>
<li>Status berubah ke <code>paid</code>.</li>
</ol>
<p>Pencairan berstatus <code>paid</code> otomatis tercatat sebagai <strong>uang keluar</strong> di buku kas (menu <strong>Keuangan → Arus Kas</strong>), mengurangi saldo rekening sumber, dan masuk ke laporan keuangan. Pencairan Revenue Share juga mengurangi sisa hak bagi hasil pihak terkait.</p>`,
    },
    {
      id: "status-flow",
      heading: "Alur Status",
      bodyHtml: `
<p><code>draft → submitted → approved → paid</code></p>
<p>Dari <code>submitted</code> pencairan dapat berakhir <code>rejected</code> dan diajukan ulang. Kesalahan pencatatan setelah <code>paid</code> dikoreksi lewat entri pembalik di buku kas, bukan dengan mengubah data lama.</p>`,
    },
  ],
};
