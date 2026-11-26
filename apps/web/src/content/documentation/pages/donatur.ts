import type { DocumentationPage } from "../types";

export const donaturDoc: DocumentationPage = {
  slug: "donatur",
  title: "Donatur & Import Data",
  category: "Operasional",
  summary: "Mengelola data donatur, mengimpor dari spreadsheet, dan menghormati permintaan berhenti pesan WhatsApp.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "data",
      heading: "Data Donatur",
      bodyHtml: `<figure class="doc-figure"><img src="/docs/screenshot-donatur.png" alt="Daftar donatur (data pribadi diburamkan)" loading="lazy" /><figcaption>Daftar donatur (data pribadi diburamkan)</figcaption></figure><p>Menu <strong>Master → Donatur</strong> (Super Admin, Admin Campaign, Admin Finance) menampilkan seluruh donatur beserta kontak, status, dan tanggal bergabung. Klik satu donatur untuk melihat profil dan riwayat donasinya, atau mengedit datanya, termasuk alamat lengkap bertingkat provinsi sampai desa.</p>
<p>Donatur dapat berasal dari akun yang dibuat sendiri di website, dari donasi sebagai tamu, atau dari import. Sistem mencocokkan donatur lewat email dan nomor HP agar satu orang tidak terpecah menjadi banyak data.</p>`,
    },
    {
      id: "import",
      heading: "Import dari Excel/CSV",
      bodyHtml: `<ol class="doc-steps">
<li>Di halaman Donatur klik <strong>Import</strong>.</li>
<li>Unduh template, isi data. Kolom wajib: <strong>Nama</strong> dan <strong>WhatsApp</strong>. Kolom lain opsional: email, telepon, alamat lengkap, jenis kelamin (laki-laki/perempuan), NIK (16 digit), NPWP, tempat dan tanggal lahir (<code>YYYY-MM-DD</code>).</li>
<li>Unggah file. Sistem menampilkan <strong>pratinjau</strong> beserta kesalahan per baris; belum ada data yang tersimpan.</li>
<li>Pilih perlakuan duplikat: <strong>skip</strong> (default) atau <strong>update</strong>, lalu konfirmasi.</li>
</ol>
<p>Duplikat dikenali dari nomor WhatsApp dan email. Alamat dari import hanya berupa teks; lengkapi pilihan provinsi sampai desa lewat form edit bila perlu.</p>`,
    },
    {
      id: "opt-out",
      heading: "Berhenti Berlangganan WhatsApp",
      bodyHtml: `<p>Donatur dapat berhenti menerima pesan non-transaksi (broadcast program, ulang tahun, pengingat) lewat tautan di pesan atau lewat toggle di profil akunnya. Status ini terlihat di data donatur di admin dan <strong>selalu dihormati</strong> oleh semua pengiriman massal. Notifikasi transaksi (tagihan, bukti bayar) tidak terpengaruh.</p>`,
    },
  ],
};
