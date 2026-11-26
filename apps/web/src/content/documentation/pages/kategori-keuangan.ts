import type { DocumentationPage } from "../types";

export const kategoriKeuanganDoc: DocumentationPage = {
    slug: "kategori-keuangan",
    title: "Sistem Kategori Keuangan",
    category: "Keuangan",
    summary: "Kategori pemasukan yang otomatis dan kategori pengeluaran yang dipilih saat membuat pencairan.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "konsep-dasar",
            heading: "Konsep Dasar",
            bodyHtml: `
<p>Jaladana mencatat keuangan dengan <strong>kategori</strong>, bukan jurnal debit-kredit. Anda cukup memilih tujuan uang keluar, dan sistem mengelompokkan uang masuk berdasarkan jenis programnya.</p>
<ul>
<li>Kategori <strong>pemasukan</strong> ditentukan otomatis dari program yang dipilih donatur.</li>
<li>Kategori <strong>pengeluaran</strong> dipilih admin saat membuat <a href="/documentation/alur-pencairan">pencairan</a>.</li>
<li>Keduanya menjadi dasar pengelompokan di <a href="/documentation/buku-kas">Buku Kas</a> dan <a href="/documentation/laporan-keuangan">Reports</a>.</li>
</ul>`,
        },
        {
            id: "kategori-income",
            heading: "Kategori Pemasukan",
            bodyHtml: `
<p>Setiap transaksi otomatis mendapat kategori. Anda dapat menyaring daftar Transactions menurut kategori ini.</p>
<table>
<thead><tr><th>Grup</th><th>Kategori</th><th>Keterangan</th></tr></thead>
<tbody>
<tr><td>Campaign</td><td><code>campaign_donation</code></td><td>Donasi campaign (termasuk wakaf dan fidyah)</td></tr>
<tr><td rowspan="5">Zakat</td><td><code>zakat_fitrah</code></td><td>Zakat Fitrah</td></tr>
<tr><td><code>zakat_maal</code></td><td>Zakat Maal</td></tr>
<tr><td><code>zakat_profesi</code></td><td>Zakat Profesi</td></tr>
<tr><td><code>zakat_pertanian</code></td><td>Zakat Pertanian</td></tr>
<tr><td><code>zakat_peternakan</code></td><td>Zakat Peternakan</td></tr>
<tr><td rowspan="3">Qurban</td><td><code>qurban_payment</code></td><td>Pembayaran hewan qurban</td></tr>
<tr><td><code>qurban_savings</code></td><td>Tabungan qurban (cicilan)</td></tr>
<tr><td><code>qurban_admin_fee</code></td><td>Biaya administrasi qurban</td></tr>
</tbody>
</table>`,
        },
        {
            id: "kategori-expense",
            heading: "Kategori Pengeluaran",
            bodyHtml: `
<p>Saat <strong>Buat Pencairan</strong>, pilih tipe pencairan lalu kategorinya:</p>
<table>
<thead><tr><th>Tipe</th><th>Kategori yang tersedia</th></tr></thead>
<tbody>
<tr><td>Zakat</td><td>Penyaluran ke Fakir, Miskin, Amil, Mualaf, Riqab, Gharim, Fisabilillah, Ibnus Sabil (8 asnaf)</td></tr>
<tr><td>Campaign</td><td>Pencairan untuk Penerima Manfaat; Pembayaran Vendor</td></tr>
<tr><td>Qurban</td><td>Pembelian Sapi; Pembelian Kambing; Biaya Penyembelihan &amp; Distribusi</td></tr>
<tr><td>Operational</td><td>Gaji &amp; Tunjangan, Sewa Kantor, Listrik &amp; Air, Internet &amp; Telekomunikasi, Marketing &amp; Promosi, Biaya Payment Gateway, Biaya Administrasi Bank, Perlengkapan Kantor, Beban Lain-lain</td></tr>
<tr><td>Vendor</td><td>Pembayaran Vendor Umum</td></tr>
<tr><td>Revenue Share</td><td>Pencairan Bagi Hasil Mitra; Komisi Influencer; Fee Platform Provider</td></tr>
</tbody>
</table>`,
        },
        {
            id: "validasi-pencairan",
            heading: "Validasi Saat Pencairan",
            bodyHtml: `
<div class="doc-callout doc-callout-warn"><span class="doc-callout-title">Rekening zakat</span>Pencairan bertipe zakat (kategori Penyaluran ke 8 asnaf) hanya dapat dibayar dari rekening yang peruntukannya mencakup <strong>Zakat</strong>. Pemeriksaan dilakukan saat admin keuangan menandai pencairan <code>paid</code> dan memilih rekening sumber. Atur peruntukan di <a href="/documentation/pengaturan-pembayaran">Settings → Payments</a>.</div>
<ul>
<li><strong>Bagi hasil:</strong> jumlah pencairan Revenue Share tidak boleh melebihi hak yang tersedia bagi pihak tersebut (hak dikurangi yang sudah dibayar).</li>
<li><strong>Dana program:</strong> form menampilkan dana yang tersedia untuk campaign, jenis zakat, atau periode qurban yang dipilih agar Anda tidak mencairkan melebihi sisa.</li>
</ul>`,
        },
    ],
};
