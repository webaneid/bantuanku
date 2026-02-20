import type { DocumentationPage } from "../types";

export const laporanKeuanganDoc: DocumentationPage = {
    slug: "laporan-keuangan",
    title: "Laporan Keuangan & Analitik",
    category: "Keuangan",
    summary:
        "Panduan lengkap membaca dan mengekspor laporan keuangan, kas, dan performa setiap entitas (Program, Mitra, Fundraiser, Rekening).",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "akses-reports",
            heading: "Dashboard Laporan",
            bodyHtml: `
                <p>Modul <strong>Laporan</strong> telah diperbarui secara komprehensif untuk memberikan visibilitas mutlak terhadap arus kas Yayasan. Anda bisa mengaksesnya melalui menu <strong>Reports</strong> di sidebar Admin Panel.</p>
                <p>Halaman utama (Dashboard Laporan) akan menampilkan ringkasan cepat:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Total Pemasukan & Pengeluaran</li>
                    <li>Saldo Kas & Bank saat ini</li>
                    <li>Ringkasan Pemasukan per Kategori (Zakat, Donasi Campaign, Qurban, dll)</li>
                </ul>
            `,
        },
        {
            id: "kategori-laporan",
            heading: "Kategori Laporan yang Tersedia",
            bodyHtml: `
                <p>Sistem Bantuanku kini membagi laporan menjadi beberapa kategori spesifik agar mudah dicari:</p>
                <table className="w-full border-collapse mt-4">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="py-2 px-4 text-left font-semibold">Grup Laporan</th>
                            <th className="py-2 px-4 text-left font-semibold">Jenis Laporan & Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 px-4 font-medium" rowSpan={3}>💰 Keuangan Inti</td>
                            <td className="py-2 px-4"><strong>Laporan Cash Flow:</strong> Mutasi uang keluar-masuk secara fisik.</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4"><strong>Catatan Mutasi:</strong> Riwayat seluruh transaksi di sistem.</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4"><strong>Neraca Saldo:</strong> Trial balance dari posisi keuangan (Aset, Kewajiban, Pendapatan, Beban).</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4 font-medium" rowSpan={3}>📈 Pendapatan</td>
                            <td className="py-2 px-4"><strong>Bagi Hasil Amil:</strong> Laporan hak amil dari setiap donasi.</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4"><strong>Laporan Zakat:</strong> Rincian penerimaan dan penyaluran zakat.</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4"><strong>Laporan Qurban:</strong> Rincian penerimaan dan pembelian hewan.</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4 font-medium" rowSpan={5}>📋 Per Entitas</td>
                            <td className="py-2 px-4"><strong>Per Program:</strong> Detail pemasukan vs pengeluaran spesifik per Campaign.</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4"><strong>Per Mitra:</strong> <em>Settlement statement</em> per mitra (Hak mitra vs yang sudah dibayar).</td>
                        </tr>
                         <tr className="border-b">
                            <td className="py-2 px-4"><strong>Per Fundraiser:</strong> Riwayat referral dan komisi per fundraiser.</td>
                        </tr>
                         <tr className="border-b">
                            <td className="py-2 px-4"><strong>Per Rekening:</strong> Mutasi gaya "buku tabungan" untuk setiap rekening bank yayasan.</td>
                        </tr>
                         <tr className="border-b">
                            <td className="py-2 px-4"><strong>Per Donatur:</strong> Analitik dan riwayat transaksi untuk tiap donatur (Repeat Donor, dll).</td>
                        </tr>
                    </tbody>
                </table>
            `,
        },
        {
            id: "fitur-laporan",
            heading: "Fitur Navigasi & Ekspor Laporan",
            bodyHtml: `
                <p>Seluruh halaman laporan kini telah dilengkapi dengan fitur standar berikut untuk memudahkan pelaporan kepada stakeholder:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-3">
                    <li>
                        <strong>Filter Tanggal Terpadu</strong>
                        <br/>
                        Anda dapat memfilter data dengan <em>preset</em> cepat seperti: <em>Hari Ini, 7 Hari Terakhir, Bulan Ini, Tahun Ini</em>, atau memilih rentang tanggal <em>Custom</em>.
                    </li>
                    <li>
                        <strong>Ekspor ke Excel (XLSX)</strong>
                        <br/>
                        Tombol <code>📥 Export Excel</code> tersedia di setiap laporan. Format Excel yang dihasilkan sudah sangat rapi, memiliki judul tabel, auto-width pada kolom, serta baris total rincian di bawah laporan (siap dikirim ke akuntan). Khusus untuk halaman kompleks seperti Laporan Per Program, sistem akan mengekspor ke dalam wujud <em>Multi-Sheet</em> (Ringkasan, Pemasukan, Pengeluaran, Bagi Hasil).
                    </li>
                    <li>
                        <strong>Fitur Cetak (Print-Friendly)</strong>
                        <br/>
                        Klik tombol <code>🖨️ Cetak</code> untuk mencetak laporan langsung ke printer atau menyimpannya sebagai PDF dengan format kertas yang sudah diatur serapih mungkin khusus untuk dokumen fisik.
                    </li>
                </ol>
            `,
        },
        {
            id: "catatan-sistem",
            heading: "Catatan Sistem Pencatatan",
            bodyHtml: `
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-2">
                    <h4 className="font-semibold text-yellow-800 mb-2">Category System vs Double-Entry Ledger</h4>
                    <p className="text-sm text-yellow-900 mb-2">Sistem pelaporan terbaru saat ini <strong>menitikberatkan pada sistem kategori keuangan (Category System)</strong> yang terbukti jauh lebih praktis dan mudah dipahami oleh Yayasan dibandingkan jurnal murni <em>Double-Entry (Ledger)</em> konvensional.</p>
                    <p className="text-sm text-yellow-900">Walaupun backend tetap mencatat Ledger Entries secara otomatis untuk kepentingan audit <em>Financial Statement</em> (Neraca Saldo), Anda cukup fokus membaca <strong>Laporan Cash Flow</strong> dan laporan <strong>Per Entitas</strong> untuk urusan operasional harian.</p>
                </div>
            `,
        },
    ]
};
