import type { DocumentationPage } from "../types";

export const pengaturanUmumDoc: DocumentationPage = {
  slug: "pengaturan-umum",
  title: "Pengaturan Umum & Tampilan",
  category: "Pengaturan",
  summary: "Peta menu Settings: identitas lembaga, logo, warna brand, menu website, SEO, WhatsApp, dan lainnya.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "peta",
      heading: "Peta Menu Settings",
      bodyHtml: `<p>Menu <strong>Settings</strong> tersedia untuk Super Admin dan sebagian Admin Finance. Isinya:</p>
<table>
<thead><tr><th>Halaman</th><th>Fungsi</th></tr></thead>
<tbody>
<tr><td>General</td><td>Identitas lembaga, logo, favicon, media sosial, parameter zakat (harga emas/perak, nisab, persentase), CDN media.</td></tr>
<tr><td>Branding</td><td>Warna brand yang mewarnai website publik.</td></tr>
<tr><td>Frontend</td><td>Header menu, footer menu, hero slider, kategori layanan, dan section unggulan di beranda.</td></tr>
<tr><td>Payments</td><td>Rekening, QRIS, dan gateway. Lihat <a href="/documentation/pengaturan-pembayaran">Pengaturan Pembayaran</a>.</td></tr>
<tr><td>Amil</td><td>Persentase bagi hasil. Lihat <a href="/documentation/bagi-hasil-amil">Bagi Hasil Amil</a>.</td></tr>
<tr><td>SEO</td><td>Meta judul/deskripsi halaman utama. Lihat <a href="/documentation/seo">Tutorial SEO</a>.</td></tr>
<tr><td>WhatsApp</td><td>Koneksi dan template pesan. Lihat <a href="/documentation/whatsapp-notifikasi">Notifikasi WhatsApp</a>.</td></tr>
<tr><td>Integration, Google Maps</td><td>Integrasi pihak ketiga dan testimoni Google Maps.</td></tr>
<tr><td>Users, Employees</td><td>Akun dashboard dan karyawan.</td></tr>
</tbody>
</table>`,
    },
    {
      id: "identitas",
      heading: "Identitas dan Nama Lembaga",
      bodyHtml: `<p>Nama lembaga, logo, dan tautan media sosial diisi di <strong>Settings → General</strong>. Nama ini dipakai di seluruh website, email, dan pesan WhatsApp, jadi isi dengan benar sebelum lembaga mulai menerima donasi.</p>`,
    },
    {
      id: "warna",
      heading: "Warna Brand",
      bodyHtml: `<p>Di <strong>Settings → Branding</strong> (khusus Super Admin) tentukan warna utama, sekunder, terang, dan gelap dalam format hex. Pratinjau menampilkan contoh tampilan; perbaiki warna yang ditandai bermasalah sebelum menyimpan. Perubahan berlaku di seluruh website publik, termasuk tombol dan latar.</p>`,
    },
    {
      id: "menu",
      heading: "Menu dan Beranda",
      bodyHtml: `<p>Di <strong>Settings → Frontend</strong> atur menu header dan footer, slide hero, kategori layanan, dan program unggulan. Untuk menautkan halaman baru, pilih URL dari daftar tautan internal.</p>`,
    },
  ],
};
