import type { DocumentationPage } from "../types";

export const kodeUnikDoc: DocumentationPage = {
    slug: "kode-unik",
    title: "Sistem Kode Unik Transaksi",
    category: "Keuangan",
    summary: "Apa itu kode unik, kapan muncul, dan bagaimana dicatat di buku kas dan laporan.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "apa-itu-kode-unik",
            heading: "Apa Itu Kode Unik?",
            bodyHtml: `
<p>Kode unik adalah nominal acak kecil (Rp 1 sampai Rp 999) yang ditambahkan ke total tagihan agar setiap transaksi punya jumlah transfer yang berbeda.</p>
<ul>
<li>Total donasi: Rp 100.000</li>
<li>Kode unik: Rp 347 (otomatis)</li>
<li>Total yang harus ditransfer: <strong>Rp 100.347</strong></li>
</ul>
<p>Tujuannya memudahkan admin keuangan mencocokkan mutasi bank dengan transaksi, terutama saat beberapa donatur berdonasi dengan nominal yang sama di waktu berdekatan. Sistem menghindari kode yang sama di antara transaksi <code>pending</code> dengan nominal yang sama.</p>`,
        },
        {
            id: "kapan-muncul",
            heading: "Kapan Kode Unik Dibuat?",
            bodyHtml: `
<p>Kode unik dibuat saat transaksi dibuat, sebelum donatur memilih metode bayar. Tagihan yang ditampilkan, baik di halaman instruksi maupun di invoice, sudah memuat kode unik, dan jumlah yang ditagihkan ke gateway juga memakai total yang sama.</p>
<p>Beberapa alur sengaja tidak memakai kode unik, misalnya setoran tabungan qurban yang dibuat oleh admin dan sebagian transaksi yang dibuat lewat bot WhatsApp. Jika sebuah transaksi tidak memiliki kode unik, nilainya 0.</p>
<p>Catatan: pada gateway, nominal yang tercatat di sisi gateway bisa saja tanpa kode unik. Jumlah uang yang benar-benar diterima itulah yang dicatat di buku kas.</p>`,
        },
        {
            id: "pencatatan-laporan",
            heading: "Pencatatan di Buku Kas",
            bodyHtml: `
<p>Saat pembayaran diverifikasi, buku kas mencatat uang masuk dan memecahnya menjadi komponen:</p>
<table>
<thead><tr><th>Komponen</th><th>Isi</th></tr></thead>
<tbody>
<tr><td><code>pokok</code></td><td>Sebesar total tagihan (donasi).</td></tr>
<tr><td><code>kode_unik</code></td><td>Kode unik yang ikut ditransfer.</td></tr>
<tr><td><code>kelebihan</code></td><td>Selisih jika donatur membayar lebih dari tagihan.</td></tr>
</tbody>
</table>
<p>Ketiganya tetap uang masuk di rekening. Pemecahan ini hanya untuk penelusuran, sehingga saldo rekening selalu sama dengan uang yang benar-benar masuk. Cicilan (qurban) dialokasikan kumulatif: pokok dulu, baru kode unik.</p>`,
        },
        {
            id: "laporan-khusus",
            heading: "Laporan Kode Unik",
            bodyHtml: `
<p>Buka <strong>Reports → Laporan Kode Unik</strong> untuk melihat total akumulasi kode unik, rinciannya per periode dan per produk, serta daftar transaksi yang menyumbangkannya. Gunakan untuk mengetahui jumlah "recehan" yang terkumpul bila lembaga menetapkan kebijakan khusus untuknya.</p>`,
        },
    ],
};
