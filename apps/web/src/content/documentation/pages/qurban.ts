import type { DocumentationPage } from "../types";

export const qurbanDoc: DocumentationPage = {
    slug: "qurban",
    title: "Modul Qurban",
    category: "Operasional",
    summary:
        "Panduan mengelola periode qurban, paket, pesanan, tabungan qurban, dan eksekusi penyembelihan.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "overview",
            heading: "Overview Modul Qurban",
            bodyHtml:
                '<p>Modul qurban mendukung seluruh siklus qurban dari pendaftaran hingga eksekusi:</p>' +
                '<figure class="doc-figure"><img src="/docs/screenshot-qurban.png" alt="Halaman Qurban" loading="lazy" /><figcaption>Halaman Qurban</figcaption></figure>' +
                '<p>Sub-modul yang tersedia:</p>' +
                '<ul>' +
                '<li><strong>Periods</strong> — Periode qurban (mis: Idul Adha 1447H)</li>' +
                '<li><strong>Packages</strong> — Paket hewan qurban (kambing, sapi utuh, sapi 1/7, dll)</li>' +
                '<li><strong>Orders</strong> — Pesanan qurban yang masuk</li>' +
                '<li><strong>Tabungan Qurban</strong> dan <strong>Grup Patungan</strong> — cicilan dan patungan sapi</li>' +
                '<li><strong>Diskon &amp; Voucher</strong> — potongan harga hewan; dokumentasi penyembelihan ada di Reports → Penyembelihan Qurban</li>' +
                '</ul>',
        },
        {
            id: "periode-paket",
            heading: "Periode & Paket",
            bodyHtml:
                '<p><strong>Periode</strong> adalah satu musim qurban (biasanya tahunan). Setiap periode memiliki:</p>' +
                '<ul>' +
                '<li>Nama dan deskripsi</li>' +
                '<li>Tanggal mulai dan berakhir pendaftaran</li>' +
                '<li>Tanggal executioan/penyembelihan</li>' +
                '</ul>' +
                '<p><strong>Paket</strong> terhubung ke periode tertentu dan mendefinisikan:</p>' +
                '<ul>' +
                '<li>Jenis hewan (kambing, sapi, dll)</li>' +
                '<li>Harga per unit atau per slot (untuk patungan)</li>' +
                '<li>Kuota/stok tersedia</li>' +
                '<li>Apakah bisa patungan (shared group)</li>' +
                '</ul>',
        },
        {
            id: "tabungan-qurban",
            heading: "Tabungan Qurban",
            bodyHtml:
                '<p>Fitur <strong>Tabungan Qurban</strong> memungkinkan donatur menabung secara cicilan untuk qurban mendatang:</p>' +
                '<ul>' +
                '<li>Donatur memilih paket qurban dan frekuensi cicilan (bulanan)</li>' +
                '<li>Setiap cicilan tercatat sebagai <strong>savings transaction</strong></li>' +
                '<li>Saat tabungan mencukupi, bisa dikonversi menjadi <strong>pesanan qurban</strong></li>' +
                '<li>Sistem mengirim <strong>reminder</strong> otomatis via WhatsApp jika cicilan telat</li>' +
                '</ul>' +
                '<p>Pengingat dikirim otomatis setiap hari pukul 08:00 WIB untuk donatur yang memiliki cicilan tertunggak.</p>',
        },
        {
            id: "shared-group",
            heading: "Patungan (Shared Group)",
            bodyHtml:
                '<p>Untuk hewan besar seperti sapi, donatur bisa bergabung dalam <strong>shared group</strong>:</p>' +
                '<ul>' +
                '<li>Satu sapi dibagi menjadi 7 slot</li>' +
                '<li>Setiap donatur mengisi 1 slot</li>' +
                '<li>Grup otomatis terbentuk saat slot pertama diisi</li>' +
                '<li>Saat 7/7 slot terisi, grup siap untuk eksekusi</li>' +
                '</ul>',
        },
        {
            id: "eksekusi",
            heading: "Eksekusi & Dokumentasi",
            bodyHtml:
                '<p>Setelah seluruh pesanan terkonfirmasi dan pembayaran lunas:</p>' +
                '<ol class="doc-steps">' +
                '<li>Admin mengatur jadwal penyembelihan per paket/grup.</li>' +
                '<li>Setelah penyembelihan, catat <strong>execution</strong> beserta foto/video dokumentasi.</li>' +
                '<li>Status pesanan berubah ke <strong>executed</strong>.</li>' +
                '<li>Donatur bisa melihat dokumentasi di akun mereka.</li>' +
                '</ol>',
        },
        {
            id: "diskon-voucher",
            heading: "Diskon & Voucher",
            bodyHtml:
                '<figure class="doc-figure"><img src="/docs/screenshot-qurban-discounts.png" alt="Daftar Diskon & Voucher Qurban" loading="lazy" /><figcaption>Daftar Diskon & Voucher Qurban</figcaption></figure>' + '<p>Menu <strong>Qurban → Diskon &amp; Voucher</strong> (Super Admin dan Admin Campaign) memberi potongan pada harga hewan:</p>' +
                '<ul>' +
                '<li><strong>Otomatis</strong> — berlaku untuk semua pesanan yang cocok dengan cakupannya, tanpa kode.</li>' +
                '<li><strong>Voucher</strong> — donatur memasukkan kode saat memesan. Voucher ditolak bila paket sudah punya diskon otomatis aktif.</li>' +
                '</ul>' +
                '<p>Cakupan: satu paket-periode, satu paket, jenis hewan, atau semua paket. Jika beberapa diskon otomatis cocok, yang paling spesifik dipakai. Satu donatur (akun atau nomor HP) hanya dapat memakai satu diskon satu kali. Biaya admin tidak dipotong. Untuk tabungan qurban, diskon diterapkan saat tabungan dibuat.</p>' +
                '<p>Diskon berlaku mulai pukul 00:00 WIB tanggal mulai sampai 23:59 WIB tanggal berakhir.</p>',
        },
    ],
};
