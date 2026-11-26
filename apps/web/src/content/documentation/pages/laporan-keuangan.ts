import type { DocumentationPage } from "../types";

export const laporanKeuanganDoc: DocumentationPage = {
  slug: "laporan-keuangan",
  title: "Laporan Keuangan",
  category: "Keuangan",
  summary: "Panduan membaca buku kas (menu Keuangan) dan laporan di menu Reports.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "dua-menu",
      heading: "Dua Menu: Keuangan dan Reports",
      bodyHtml: `
<p>Kedua menu hanya tampil untuk Super Admin dan Admin Finance.</p>
<ul>
<li><strong>Keuangan</strong> (buku kas) — sumber angka resmi uang masuk dan keluar. Mulailah dari sini.</li>
<li><strong>Reports</strong> — laporan analitik dan ekspor untuk pelaporan kepada pengurus atau auditor.</li>
</ul>
<p>Prinsipnya: satu sumber dan satu definisi. Setiap angka di buku kas dapat ditelusuri sampai ke satu pembayaran atau satu pencairan.</p>`,
    },
    {
      id: "menu-keuangan",
      heading: "Menu Keuangan (Buku Kas)",
      bodyHtml: `
<table>
<thead><tr><th>Halaman</th><th>Menjawab pertanyaan</th></tr></thead>
<tbody>
<tr><td>Arus Kas</td><td>Berapa uang masuk dan keluar, dari dana apa, lewat metode apa.</td></tr>
<tr><td>Sirkulasi Rekening</td><td>Berapa saldo dan mutasi tiap rekening (bank, QRIS, gateway, tunai).</td></tr>
<tr><td>Dana per Sumber</td><td>Rincian per jenis dana: zakat, qurban, campaign, wakaf, fidyah, operasional.</td></tr>
<tr><td>Bagi Hasil</td><td>Hak amil, developer, mitra, dan influencer: hak − sudah dibayar = sisa.</td></tr>
<tr><td>Per Mitra / Per Influencer / Per Program</td><td>Rincian per entitas beserta settlement-nya.</td></tr>
<tr><td>Perlu Ditinjau</td><td>Entri yang butuh perhatian, misalnya metode bayar tidak dikenal.</td></tr>
</tbody>
</table>
<p>Buku kas bersifat <em>append-only</em>: entri tidak diubah atau dihapus. Jika ada kesalahan, buat <strong>entri pembalik</strong> dengan catatan alasan.</p>`,
    },
    {
      id: "menu-reports",
      heading: "Menu Reports",
      bodyHtml: `
<table>
<thead><tr><th>Kelompok</th><th>Laporan</th></tr></thead>
<tbody>
<tr><td>Keuangan inti</td><td>Dashboard Laporan, Laporan Cash Flow, Catatan Mutasi, Neraca, Saldo Titipan Dana, Audit Kategori COA, Laporan Kode Unik</td></tr>
<tr><td>Pendapatan</td><td>Bagi Hasil Amil, Laporan Zakat, Laporan Qurban, Penyembelihan Qurban</td></tr>
<tr><td>Per entitas</td><td>Per Program, Per Rekening, Per Donatur</td></tr>
</tbody>
</table>
<p><strong>Saldo Titipan Dana</strong> menunjukkan dana yang masih berstatus titipan (misalnya tabungan qurban) sehingga tidak dihitung sebagai pendapatan lembaga.</p>`,
    },
    {
      id: "fitur-laporan",
      heading: "Filter, Ekspor, dan Cetak",
      bodyHtml: `
<ul>
<li><strong>Filter tanggal</strong> — preset cepat (hari ini, 7 hari, bulan ini, tahun ini, semua waktu) atau rentang kustom. Tanggal memakai zona waktu WIB.</li>
<li><strong>Export Excel</strong> — tersedia di laporan utama, lengkap dengan judul dan baris total. Laporan kompleks seperti Per Program diekspor multi-sheet.</li>
<li><strong>Cetak</strong> — tampilan siap cetak atau simpan sebagai PDF.</li>
</ul>`,
    },
    {
      id: "catatan-sistem",
      heading: "Catatan Penting",
      bodyHtml: `
<ul>
<li>Pemasukan dihitung dari pembayaran yang <strong>terverifikasi</strong>, bukan dari tagihan. Kode unik dan kelebihan bayar ikut tercatat sebagai uang masuk (lihat <a href="/documentation/kode-unik">Kode Unik</a>).</li>
<li>Setiap pembayaran wajib punya metode bayar yang jelas; pembayaran bermetode kosong atau generik tidak dapat disetujui.</li>
<li>Laporan lama sedang dipensiunkan bertahap. Jika angka di Reports berbeda dengan buku kas, buku kas yang menjadi acuan.</li>
</ul>`,
    },
  ],
};
