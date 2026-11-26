import type { DocumentationPage } from "../types";

export const masterDataDoc: DocumentationPage = {
  slug: "master-data",
  title: "Data Master",
  category: "Operasional",
  summary: "Vendor, karyawan, mustahiq, penghasilan bulanan, kategori, pilar, dan statistik.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "menu",
      heading: "Menu Master",
      bodyHtml: `<p>Menu <strong>Master</strong> (Super Admin, Admin Campaign, Admin Finance) berisi data rujukan yang dipakai di banyak modul:</p>
<table>
<thead><tr><th>Menu</th><th>Fungsi</th></tr></thead>
<tbody>
<tr><td>Donatur</td><td>Lihat <a href="/documentation/donatur">Donatur &amp; Import Data</a>.</td></tr>
<tr><td>Vendors</td><td>Penyedia barang/jasa (misalnya penyedia hewan qurban) yang menerima pembayaran lewat pencairan tipe Vendor.</td></tr>
<tr><td>Employees</td><td>Karyawan lembaga; dapat dijadikan penanggung jawab campaign atau diaktifkan menjadi akun login.</td></tr>
<tr><td>Mustahiq Zakat</td><td>Penerima zakat (8 asnaf) yang dipilih saat penyaluran zakat.</td></tr>
<tr><td>Penghasilan Bulanan</td><td>Rentang penghasilan untuk pengisian profil donatur.</td></tr>
</tbody>
</table>
<p>Kategori dan pilar program ada di <strong>Campaigns → Categories</strong> dan <strong>Pillars</strong>.</p>`,
    },
    {
      id: "statistik",
      heading: "Statistik",
      bodyHtml: `<p>Menu <strong>Statistics</strong> menyajikan <strong>Statistik Donatur</strong> dan <strong>Statistik Mustahiq</strong>. Gunakan untuk memahami komunitas donatur dan penerima manfaat.</p>`,
    },
    {
      id: "tips",
      heading: "Praktik Baik",
      bodyHtml: `<ul>
<li>Lengkapi data master sebelum membuat pencairan agar kategori dan penerima tersedia.</li>
<li>Jangan menghapus data master yang sudah dipakai; nonaktifkan bila perlu. Data donatur dilindungi agar tidak hilang saat master dihapus.</li>
</ul>`,
    },
  ],
};
