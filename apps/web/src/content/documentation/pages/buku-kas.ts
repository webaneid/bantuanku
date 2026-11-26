import type { DocumentationPage } from "../types";

export const bukuKasDoc: DocumentationPage = {
  slug: "buku-kas",
  title: "Buku Kas (Menu Keuangan)",
  category: "Keuangan",
  summary: "Cara membaca Arus Kas, Sirkulasi Rekening, Dana per Sumber, dan Bagi Hasil, serta cara membuat koreksi.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "konsep",
      heading: "Konsep Buku Kas",
      bodyHtml: `<p>Buku kas adalah catatan resmi uang masuk dan keluar di Jaladana. Aturannya sederhana:</p>
<ul>
<li><strong>Uang masuk</strong> dicatat saat pembayaran <em>terverifikasi</em>: otomatis untuk gateway, setelah admin menyetujui untuk transfer manual.</li>
<li><strong>Uang keluar</strong> dicatat saat pencairan berstatus <code>paid</code>.</li>
<li>Setiap baris berisi tanggal (WIB), arah, jumlah, <strong>dana</strong> (zakat, qurban, campaign, wakaf, fidyah, operasional, bagi hasil), <strong>rekening/akun kas</strong>, dan <strong>metode bayar</strong>.</li>
<li>Catatan <em>tidak pernah diubah atau dihapus</em>. Kesalahan dikoreksi dengan entri pembalik.</li>
</ul>
<p>Menu <strong>Keuangan</strong> hanya terlihat oleh Super Admin dan Admin Finance.</p>`,
    },
    {
      id: "arus-kas",
      heading: "Arus Kas",
      bodyHtml: `<p>Daftar semua baris uang masuk dan keluar beserta total masuk, keluar, dan netto. Gunakan filter tanggal, dana, rekening, metode, gateway, arah, dan komponen (pokok, kode unik, kelebihan). Data dapat diekspor ke Excel/CSV.</p>
<p>Setiap baris dapat ditelusuri ke donasi atau pencairan asalnya.</p>`,
    },
    {
      id: "sirkulasi",
      heading: "Sirkulasi Rekening",
      bodyHtml: `<p>Per rekening (bank, QRIS, gateway, tunai) tampil total masuk, total keluar, dan selisihnya, yaitu uang yang beredar di sistem lewat rekening itu.</p>
<p><strong>Penting:</strong> ini bukan saldo bank. Tidak ada saldo awal atau rekonsiliasi dengan mutasi bank, jadi gunakan untuk memeriksa kelengkapan pencatatan, bukan untuk menggantikan rekening koran. Tampil peringatan bila dana zakat masuk ke rekening yang bukan peruntukan zakat.</p>`,
    },
    {
      id: "dana-per-sumber",
      heading: "Dana per Sumber",
      bodyHtml: `<p>Menjawab "uang dari dana X tinggal berapa". Untuk tiap dana (zakat per jenis, qurban, campaign, wakaf, fidyah):</p>
<p><code>sisa = uang masuk − hak bagi hasil pihak lain (amil, developer, mitra, influencer) − penyaluran program</code></p>
<p>Klik satu dana untuk melihat rinciannya per program, jenis zakat, atau periode qurban (menu Per Program).</p>`,
    },
    {
      id: "bagi-hasil",
      heading: "Bagi Hasil, Per Mitra, dan Per Influencer",
      bodyHtml: `<p>Halaman <strong>Bagi Hasil</strong> menampilkan, untuk amil, developer, mitra, dan influencer: <em>hak</em>, <em>sudah dibayar</em>, dan <em>sisa</em> (hak − dibayar). Klik satu pihak untuk melihat rincian per transaksi dan per pencairan.</p>
<p>Pembayaran bagi hasil dilakukan lewat <a href="/documentation/alur-pencairan">pencairan</a> bertipe Revenue Share. <strong>Per Mitra</strong> dan <strong>Per Influencer</strong> adalah tampilan khusus tiap pihak.</p>
<p>Persentase diatur di <a href="/documentation/bagi-hasil-amil">Settings → Amil</a> dan berlaku untuk transaksi baru.</p>`,
    },
    {
      id: "koreksi",
      heading: "Perlu Ditinjau dan Koreksi",
      bodyHtml: `<p><strong>Perlu Ditinjau</strong> adalah daftar informasi, misalnya transaksi <code>paid</code> tanpa pembayaran terverifikasi, akun kas tak dikenal, dan pembayaran yang lebih besar dari tagihan. Tidak ada tindakan otomatis; gunakan untuk merapikan data.</p>
<p>Untuk memperbaiki kesalahan, buat <strong>entri pembalik</strong> pada baris yang salah atau <strong>koreksi</strong> manual, dengan catatan alasan (wajib). Hanya Super Admin dan Admin Finance yang dapat melakukannya, dan setiap koreksi tercatat di audit log.</p>`,
    },
  ],
};
