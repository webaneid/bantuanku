import type { DocumentationPage } from "../types";

export const pagesCmsDoc: DocumentationPage = {
  slug: "pages-cms",
  title: "Halaman Statis (Pages)",
  category: "Operasional",
  summary: "Membuat halaman seperti Tentang Kami dan menautkannya ke menu website.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "membuat",
      heading: "Membuat Halaman",
      bodyHtml: `<ol>
<li>Buka <strong>Pages</strong> di sidebar (Super Admin dan Admin Campaign) lalu buat halaman baru.</li>
<li>Isi judul, deskripsi singkat, isi lengkap dengan editor teks, dan gambar (Feature Image).</li>
<li>Pilih <strong>Status Publish</strong>: <code>Draft</code> (belum tampil) atau <code>Published</code>.</li>
<li>Atur panel SEO bila perlu, lalu simpan.</li>
</ol>
<p>Halaman terbit tampil di <code>/page/[slug]</code>.</p>`,
    },
    {
      id: "menu",
      heading: "Menautkan ke Menu",
      bodyHtml: `<p>Halaman tidak otomatis masuk menu. Buka <strong>Settings → Frontend</strong>, bagian <strong>Header Menu</strong> atau <strong>Footer Menu</strong>, tambahkan item baru, lalu pilih URL halaman Anda dari daftar tautan.</p>`,
    },
    {
      id: "tips",
      heading: "Catatan",
      bodyHtml: `<ul>
<li>Halaman ini untuk konten tetap. Laporan penyaluran gunakan <a href="/documentation/laporan-kegiatan">Laporan Kegiatan</a>.</li>
<li>Halaman dengan <em>noindex</em> tidak masuk mesin pencari maupun jawaban bot WhatsApp.</li>
</ul>`,
    },
  ],
};
