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
<tr><td>General Settings</td><td>Tab Informasi Organisasi (logo, favicon, nama, tagline), Setting Zakat, Setting Fidyah, dan Akun Sosmed.</td></tr>
<tr><td>Warna Brand</td><td>Warna brand yang mewarnai website publik.</td></tr>
<tr><td>Front-end</td><td>Header menu, footer menu, hero slider, kategori layanan, dan section unggulan di beranda.</td></tr>
<tr><td>Payments</td><td>Rekening, QRIS, dan gateway. Lihat <a href="/documentation/pengaturan-pembayaran">Pengaturan Pembayaran</a>.</td></tr>
<tr><td>Administrasi Amil</td><td>Persentase bagi hasil. Lihat <a href="/documentation/bagi-hasil-amil">Bagi Hasil Amil</a>.</td></tr>
<tr><td>SEO Halaman</td><td>Meta judul/deskripsi halaman utama. Lihat <a href="/documentation/seo">Tutorial SEO</a>.</td></tr>
<tr><td>Notifikasi WhatsApp</td><td>Konfigurasi koneksi (GOWA) dan template pesan. Lihat <a href="/documentation/whatsapp-notifikasi">Notifikasi WhatsApp</a>.</td></tr>
<tr><td>Integration, Testimoni Google Maps</td><td>Integrasi pihak ketiga dan testimoni Google Maps.</td></tr>
<tr><td>Platform Provider</td><td>Khusus Super Admin pengembang platform: rekening dan pendapatan developer.</td></tr>
<tr><td>Users, Employees</td><td>Akun dashboard dan karyawan.</td></tr>
</tbody>
</table>`,
    },
    {
      id: "identitas",
      heading: "Identitas dan Nama Lembaga",
      bodyHtml: `<p>Nama lembaga, logo, dan tautan media sosial diisi di <strong>Settings → General Settings</strong> (tab Informasi Organisasi dan Akun Sosmed). Nama ini dipakai di seluruh website, email, dan pesan WhatsApp, jadi isi dengan benar sebelum lembaga mulai menerima donasi.</p>`,
    },
    {
      id: "warna",
      heading: "Warna Brand",
      bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-settings-branding.png" alt="Settings → Warna Brand" loading="lazy" /><figcaption>Settings → Warna Brand</figcaption></figure><p>Di <strong>Settings → Warna Brand</strong> (khusus Super Admin) tentukan warna utama, sekunder, terang, dan gelap dalam format hex. Pratinjau menampilkan contoh tampilan; perbaiki warna yang ditandai bermasalah sebelum menyimpan. Perubahan berlaku di seluruh website publik, termasuk tombol dan latar.</p>`,
    },
    {
      id: "menu",
      heading: "Menu dan Beranda",
      bodyHtml: `<p>Di <strong>Settings → Front-end</strong> atur tab Body Landingpage (hero slider, kategori layanan, section unggulan), Header Menu, Footer Menu, dan Pages. Untuk menautkan halaman baru, pilih URL dari daftar tautan internal.</p>`,
    },
  ],
};
