import type { DocumentationPage } from "../types";

export const kodeUnikDoc: DocumentationPage = {
    slug: "kode-unik",
    title: "Sistem Kode Unik Transaksi",
    category: "Keuangan",
    summary:
        "Penjelasan mengenai fungsi kode unik pada transfer bank manual, cara kerjanya, dan bagaimana pelaporannya di sistem keuangan.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "apa-itu-kode-unik",
            heading: "Apa Itu Kode Unik?",
            bodyHtml: `
                <p><strong>Kode Unik</strong> adalah sistem otomatis penambahan nominal acak berskala sangat kecil (mulai dari Rp 1 hingga Rp 999) pada total tagihan donatur.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Contoh Kasus:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-blue-900 font-mono text-sm">
                        <li>Total Donasi: Rp 100.000</li>
                        <li>Kode Unik: Rp 347 <span className="text-gray-500 italic">(Otomatis oleh sistem)</span></li>
                        <li className="border-t border-blue-200 mt-2 pt-2 font-bold">Total Transfer: Rp 100.347</li>
                    </ul>
                </div>
                <p>Tujuannya adalah untuk <strong>memudahkan Admin Finance dalam mengidentifikasi</strong> transferan siapa yang masuk ke rekening mutasi Bank Yayasan, terutama jika ada dua orang atau lebih yang berdonasi dengan nominal yang sama persis di waktu yang bersamaan.</p>
            `,
        },
        {
            id: "kapan-muncul",
            heading: "Kapan Kode Unik Ditampilkan?",
            bodyHtml: `
                <p>Kode unik <strong>TIDAK BERLAKU</strong> dan tidak akan ditambahkan jika donatur memilih metode pembayaran otomatis/payment gateway, karena sistem gateway sudah punya cara pelacakannya sendiri (seperti nomor Virtual Account spesifik atau QRIS).</p>
                <table className="w-full border-collapse mt-4">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="py-2 px-4 text-left font-semibold">Metode Pembayaran</th>
                            <th className="py-2 px-4 text-left font-semibold">Gunakan Kode Unik?</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-2 px-4">Manual Bank Transfer</td>
                            <td className="py-2 px-4 font-bold text-green-600">YA</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4">Virtual Account (Gateway)</td>
                            <td className="py-2 px-4 text-red-600">TIDAK</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4">QRIS</td>
                            <td className="py-2 px-4 text-red-600">TIDAK</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 px-4">E-Wallet (Ovo, Dana, Shopee, dll)</td>
                            <td className="py-2 px-4 text-red-600">TIDAK</td>
                        </tr>
                    </tbody>
                </table>
            `,
        },
        {
            id: "pencatatan-laporan",
            heading: "Bagaimana Kode Unik Dicatat di Laporan?",
            bodyHtml: `
                <p>Dalam ilmu akuntansi/keuangan konvensional, penambahan kode unik sering membuat bingung saat pencatatan karena nominal "Donasi" berbeda dengan nominal "Uang Kas Masuk".</p>
                <p>Tetapi di sistem Bantuanku, kami sudah menata pelaporannya agar sangat transparan:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-2">
                    <li><strong>Saldo Bank Valid:</strong> Saat transaksi disahkan (Paid), saldo bank akan otomatis bertambah sebesar total transfer (Donasi + Kode Unik). Jika donasi 100rb dan kode unik 347, maka saldo bank bertambah riil Rp 100.347.</li>
                    <li><strong>Laporan Arus Kas (Cash Flow):</strong> Di menu Laporan Arus Kas, transaksi tersebut akan terpisah menjadi dua baris agar pembukuannya rapi:
                        <ul className="list-disc pl-5 mt-1">
                            <li>Baris 1: Pemasukan Donasi (Rp 100.000)</li>
                            <li>Baris 2: Pendapatan Kode Unik (Rp 347)</li>
                        </ul>
                    </li>
                </ol>
            `,
        },
        {
            id: "laporan-khusus",
            heading: "Laporan Khusus Kode Unik",
            bodyHtml: `
                <p>Jika Yayasan Anda menjadikan hasil "recehan" dari Kode Unik ini sebagai pemasukan khusus (misal: disedekahkan ke anak yatim, atau dicatat sebagai dana operasional ekstra), Anda bisa melihat total akumulasinya secara langsung.</p>
                <p>Silakan buka menu <strong><a href="/dashboard/reports/unique-codes" className="text-blue-600 underline">Laporan → Kode Unik Transaksi</a></strong> di Admin Panel.</p>
                <p>Di halaman tersebut, Anda bisa melihat:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Total Pendapatan Kode Unik</strong> (Akumulasi seluruh Rp 100, Rp 200, dst).</li>
                    <li><strong>Breakdown per Bulan</strong> (Melihat tren kode unik dari bulan ke bulan).</li>
                    <li><strong>Breakdown per Produk</strong> (Berapa kode unik yang terkumpul dari Campaign vs dari Zakat vs Qurban).</li>
                    <li><strong>Daftar Detail Transaksi</strong> mana saja yang menyumbangkan nominal kode unik tersebut.</li>
                </ul>
            `,
        },
    ]
};
