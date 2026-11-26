import type { DocumentationPage } from "../types";

export const wakafDoc: DocumentationPage = {
  slug: "wakaf",
  title: "Wakaf",
  category: "Campaign & Donasi",
  summary: "Wakaf adalah campaign dengan pilar Wakaf; ketentuan khususnya dalam bagi hasil dan pembukuan.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "konsep",
      heading: "Cara Kerja",
      bodyHtml: `<p>Wakaf bukan modul terpisah. Wakaf adalah <strong>campaign dengan pilar "Wakaf"</strong>. Cara membuatnya sama dengan <a href="/documentation/cara-membuat-campaign">campaign biasa</a>; pada kolom <strong>Pilar</strong> pilih Wakaf.</p>
<p>Program tampil di halaman publik <code>/wakaf</code> dan juga di <code>/program/[slug]</code>. Donasinya mengikuti alur checkout yang sama dengan donasi lain.</p>`,
    },
    {
      id: "ketentuan",
      heading: "Ketentuan Khusus",
      bodyHtml: `<ul>
<li><strong>Tidak ada potongan.</strong> Seluruh dana wakaf utuh: tanpa bagian amil, platform, influencer, maupun mitra. Sistem otomatis melewati perhitungan bagi hasil untuk pilar Wakaf.</li>
<li>Di buku kas, dana ini tercatat sebagai dana <strong>wakaf</strong> terpisah dari campaign biasa (lihat Keuangan → Dana per Sumber).</li>
<li>Pastikan pilar diisi benar sejak awal. Salah memilih pilar mengubah perlakuan bagi hasil dan pembukuan.</li>
</ul>`,
    },
  ],
};
