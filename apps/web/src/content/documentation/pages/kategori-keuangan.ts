import type { DocumentationPage } from "../types";

export const kategoriKeuanganDoc: DocumentationPage = {
    slug: "kategori-keuangan",
    title: "Sistem Kategori Keuangan (COA)",
    category: "Keuangan",
    summary:
        "Panduan konseptual Chart of Accounts (COA) dan Sistem Kategori untuk memudahkan pencatatan donasi (Income) dan pencairan (Expense) tanpa ilmu akuntansi.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "konsep-dasar",
            heading: "Konsep Dasar: Selamat Tinggal Debit & Kredit!",
            bodyHtml: `
                <p>Platform Bantuanku dirancang untuk memudahkan pengelola lembaga amal (yayasan) dalam mencatat keuangan <strong>tanpa harus mengerti ilmu akuntansi (Debit & Kredit)</strong>. Kami menggunakan sistem <strong>Kategori (Category System)</strong> yang jauh lebih human-friendly.</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
                    <h4 className="font-semibold text-green-800 mb-2">Mengapa Sistem Kategori?</h4>
                    <ul className="list-disc pl-5 space-y-1 text-green-900">
                        <li><strong>Lebih Mudah:</strong> Anda hanya perlu memilih "Uang Masuk" atau "Uang Keluar" beserta tujuannya (misal: "Penyaluran ke Fakir").</li>
                        <li><strong>Otomatis Update:</strong> Saldo rekening bank akan bertambah atau berkurang secara otomatis.</li>
                        <li><strong>Laporan Praktis:</strong> Pelacakan dana (Zakat, Campaign, Qurban, Operasional) langsung dikelompokkan berdasarkan kategori.</li>
                    </ul>
                </div>
            `,
        },
        {
            id: "kategori-income",
            heading: "Kategori Pemasukan (Income)",
            bodyHtml: `
                <p>Setiap donasi yang masuk atau berhasil terbayar (<em>paid</em>), sistem akan <strong>secara otomatis</strong> menetapkan kategorinya berdasarkan program yang dipilih donatur. Anda tidak perlu mengaturnya secara manual.</p>
                <div className="overflow-x-auto mt-4 mb-4">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="py-2 px-4 text-left font-semibold">Grup</th>
                                <th className="py-2 px-4 text-left font-semibold">Nama Kategori di Sistem</th>
                                <th className="py-2 px-4 text-left font-semibold">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-semibold">Campaign</td>
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">campaign_donation</td>
                                <td className="py-2 px-4">Donasi campaign umum / donasi reguler</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-semibold" rowSpan="5">Zakat</td>
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">zakat_fitrah</td>
                                <td className="py-2 px-4">Pembayaran Zakat Fitrah</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">zakat_maal</td>
                                <td className="py-2 px-4">Pembayaran Zakat Maal</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">zakat_profesi</td>
                                <td className="py-2 px-4">Pembayaran Zakat Profesi</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">zakat_pertanian</td>
                                <td className="py-2 px-4">Pembayaran Zakat Pertanian</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">zakat_peternakan</td>
                                <td className="py-2 px-4">Pembayaran Zakat Peternakan</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-semibold" rowSpan="3">Qurban</td>
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">qurban_payment</td>
                                <td className="py-2 px-4">Pembayaran lunas hewan Qurban</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">qurban_savings</td>
                                <td className="py-2 px-4">Tabungan hewan Qurban cicilan</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-4 font-mono text-sm text-blue-600">qurban_admin_fee</td>
                                <td className="py-2 px-4">Biaya tambahan administrasi Qurban</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `,
        },
        {
            id: "kategori-expense",
            heading: "Kategori Pengeluaran (Expense / Pencairan)",
            bodyHtml: `
                <p>Saat Anda ingin mencairkan dana (melalui menu <em>Buat Pencairan Dana</em>), Anda akan dihadapkan pada pilihan <strong>Dropdown Kategori Pengeluaran</strong>. Pilihlah sesuai dengan tujuan kemana uang tersebut digunakan:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="border border-gray-200 rounded p-4">
                        <h5 className="font-bold border-b pb-2 mb-2">Distribusi Zakat (8 Asnaf)</h5>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            <li>Penyaluran ke Fakir</li>
                            <li>Penyaluran ke Miskin</li>
                            <li>Penyaluran ke Amil</li>
                            <li>Penyaluran ke Mualaf</li>
                            <li>Penyaluran ke Riqab</li>
                            <li>Penyaluran ke Gharim</li>
                            <li>Penyaluran ke Fisabilillah</li>
                            <li>Penyaluran ke Ibnus Sabil</li>
                        </ul>
                    </div>
                    <div className="border border-gray-200 rounded p-4">
                        <h5 className="font-bold border-b pb-2 mb-2">Pencairan Campaign Umum</h5>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            <li>Pencairan untuk Penerima Manfaat</li>
                            <li>Pembayaran Vendor/Supplier</li>
                        </ul>
                    </div>
                    <div className="border border-gray-200 rounded p-4">
                        <h5 className="font-bold border-b pb-2 mb-2">Beban Operasional Yayasan</h5>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            <li>Gaji & Tunjangan</li>
                            <li>Sewa Kantor</li>
                            <li>Listrik & Air</li>
                            <li>Internet & Telekomunikasi</li>
                            <li>Marketing & Promosi</li>
                            <li>Biaya Payment Gateway & Bank</li>
                            <li>Perlengkapan Kantor</li>
                            <li>Beban Lain-lain</li>
                        </ul>
                    </div>
                    <div className="border border-gray-200 rounded p-4">
                        <h5 className="font-bold border-b pb-2 mb-2">Qurban & Bagi Hasil</h5>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                            <li>Pembelian Hewan (Sapi/Kambing/Domba)</li>
                            <li>Biaya Penyembelihan & Distribusi</li>
                            <li>Pencairan Bagi Hasil Mitra</li>
                            <li>Pencairan Komisi Fundraiser</li>
                            <li>Pencairan Fee Developer</li>
                        </ul>
                    </div>
                </div>
            `,
        },
        {
            id: "validasi-pencairan",
            heading: "Validasi Pintar Saat Pencairan",
            bodyHtml: `
                <p>Sistem Kategori Bantuanku melarang manipulasi asal-asalan demi kepatuhan Syariat dan transparansi logis. Contoh penerapan peringatan di sistem kami:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>⚠️ <strong>Kepatuhan Rekening Zakat:</strong> Jika Anda memilih Kategori <em>"Penyaluran ke Fakir"</em> (Grup Zakat), maka sistem otomatis <strong>mewajibkan</strong> akun Bank Sumber berasal dari Bank Khusus Zakat. Anda tidak bisa menggunakan Bank Operasional.</li>
                    <li>⚠️ <strong>Validasi Saldo:</strong> Jika jumlah pencairan yang diminta <strong>melebihi</strong> sisa saldo riil di Bank Pemotong, sistem akan menolak atau memberikan peringatan.</li>
                </ul>
            `,
        },
    ]
};
