import type { DocumentationPage } from "../types";

export const laporanKegiatanDoc: DocumentationPage = {
  slug: "laporan-kegiatan",
  title: "Laporan Kegiatan",
  category: "Campaign & Donasi",
  summary: "Membuat laporan kegiatan penyaluran yang tampil bagi donatur di website.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "apa-itu",
      heading: "Apa Itu Laporan Kegiatan?",
      bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-activity-reports.png" alt="Daftar laporan kegiatan" loading="lazy" /><figcaption>Daftar laporan kegiatan</figcaption></figure><p>Laporan kegiatan adalah laporan naratif tentang penyaluran dana: foto, ringkasan, penerima manfaat, dan lokasi. Laporan dikaitkan dengan salah satu:</p>
<ul>
<li><strong>Campaign</strong> — tampil di tab update halaman program.</li>
<li><strong>Periode zakat</strong> atau <strong>penyaluran zakat</strong> — tampil di laporan publik zakat.</li>
<li><strong>Periode qurban</strong> — tampil di laporan publik qurban, termasuk jumlah hewan dan penerima daging.</li>
</ul>
<p>Semua laporan terbit juga di arsip publik <code>/laporan</code>.</p>`,
    },
    {
      id: "membuat",
      heading: "Membuat Laporan",
      bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-activity-report-create.png" alt="Form Buat Laporan Kegiatan" loading="lazy" /><figcaption>Form Buat Laporan Kegiatan</figcaption></figure><ol class="doc-steps">
<li>Buka <strong>Laporan Kegiatan</strong> di sidebar lalu klik <strong>Buat Laporan Kegiatan</strong>.</li>
<li>Pilih jenis rujukan (campaign, periode zakat, penyaluran zakat, atau periode qurban) lalu pilih datanya.</li>
<li>Isi judul, ringkasan, tanggal, area distribusi, jumlah penerima manfaat, dan unggah galeri foto kegiatan. Video opsional.</li>
<li>Simpan sebagai <strong>Draft</strong> atau langsung <strong>Published</strong>.</li>
</ol>
<p>Tersedia untuk Super Admin, Admin Campaign, Admin Finance, dan Program Coordinator. Koordinator hanya melihat laporan miliknya.</p>`,
    },
    {
      id: "publikasi",
      heading: "Publikasi dan SEO",
      bodyHtml: `<ul>
<li>Hanya laporan <code>Published</code> yang tampil di website.</li>
<li>Laporan punya panel SEO seperti campaign. Aktifkan <em>noindex</em> bila tidak ingin muncul di mesin pencari; laporan seperti itu juga tidak dijawab oleh bot WhatsApp.</li>
<li>Arsip publik menampilkan 12 laporan per halaman.</li>
<li>Gunakan foto asli kegiatan; foto jelas menaikkan kepercayaan donatur.</li>
</ul>`,
    },
  ],
};
