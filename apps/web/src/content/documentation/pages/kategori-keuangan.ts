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
                <p>Platform Jaladana dirancang untuk memudahkan pengelola lembaga amal (yayasan) dalam mencatat keuangan <strong>tanpa harus mengerti ilmu akuntansi (Debit & Kredit)</strong>. Kami menggunakan sistem <strong>Kategori (Category System)</strong> yang jauh lebih human-friendly.</p>
                <div class="doc-callout">
                    <h4>Mengapa Sistem Kategori?</h4>
                    <ul>
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
                <div>
                    <table>
                        <thead>
                            <tr>
                                <th>Grup</th>
                                <th>Nama Kategori di Sistem</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Campaign</td>
                                <td>campaign_donation</td>
                                <td>Donasi campaign umum / donasi reguler</td>
                            </tr>
                            <tr>
                                <td rowSpan="5">Zakat</td>
                                <td>zakat_fitrah</td>
                                <td>Pembayaran Zakat Fitrah</td>
                            </tr>
                            <tr>
                                <td>zakat_maal</td>
                                <td>Pembayaran Zakat Maal</td>
                            </tr>
                            <tr>
                                <td>zakat_profesi</td>
                                <td>Pembayaran Zakat Profesi</td>
                            </tr>
                            <tr>
                                <td>zakat_pertanian</td>
                                <td>Pembayaran Zakat Pertanian</td>
                            </tr>
                            <tr>
                                <td>zakat_peternakan</td>
                                <td>Pembayaran Zakat Peternakan</td>
                            </tr>
                            <tr>
                                <td rowSpan="3">Qurban</td>
                                <td>qurban_payment</td>
                                <td>Pembayaran lunas hewan Qurban</td>
                            </tr>
                            <tr>
                                <td>qurban_savings</td>
                                <td>Tabungan hewan Qurban cicilan</td>
                            </tr>
                            <tr>
                                <td>qurban_admin_fee</td>
                                <td>Biaya tambahan administrasi Qurban</td>
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
                <div>
                    <div>
                        <h5>Distribusi Zakat (8 Asnaf)</h5>
                        <ul>
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
                    <div>
                        <h5>Pencairan Campaign Umum</h5>
                        <ul>
                            <li>Pencairan untuk Penerima Manfaat</li>
                            <li>Pembayaran Vendor/Supplier</li>
                        </ul>
                    </div>
                    <div>
                        <h5>Beban Operasional Yayasan</h5>
                        <ul>
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
                    <div>
                        <h5>Qurban & Bagi Hasil</h5>
                        <ul>
                            <li>Pembelian Hewan (Sapi/Kambing/Domba)</li>
                            <li>Biaya Penyembelihan & Distribusi</li>
                            <li>Pencairan Bagi Hasil Mitra</li>
                            <li>Pencairan Komisi Influencer</li>
                            <li>Pencairan Fee Platform Provider</li>
                        </ul>
                    </div>
                </div>
            `,
        },
        {
            id: "validasi-pencairan",
            heading: "Validasi Pintar Saat Pencairan",
            bodyHtml: `
                <p>Sistem Kategori Jaladana melarang manipulasi asal-asalan demi kepatuhan Syariat dan transparansi logis. Contoh penerapan peringatan di sistem kami:</p>
                <ul>
                    <li>⚠️ <strong>Kepatuhan Rekening Zakat:</strong> Jika Anda memilih Kategori <em>"Penyaluran ke Fakir"</em> (Grup Zakat), maka sistem otomatis <strong>mewajibkan</strong> akun Bank Sumber berasal dari Bank Khusus Zakat. Anda tidak bisa menggunakan Bank Operasional.</li>
                    <li>⚠️ <strong>Validasi Saldo:</strong> Jika jumlah pencairan yang diminta <strong>melebihi</strong> sisa saldo riil di Bank Pemotong, sistem akan menolak atau memberikan peringatan.</li>
                </ul>
            `,
        },
    ]
};
