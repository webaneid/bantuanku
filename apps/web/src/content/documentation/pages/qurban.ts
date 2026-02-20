import type { DocumentationPage } from "../types";

export const qurbanDoc: DocumentationPage = {
    slug: "qurban",
    title: "Modul Qurban",
    category: "Operasional",
    summary:
        "Panduan mengelola periode qurban, paket, pesanan, tabungan qurban, dan eksekusi penyembelihan.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "overview",
            heading: "Overview Modul Qurban",
            bodyHtml:
                '<p>Modul qurban mendukung seluruh siklus qurban dari pendaftaran hingga eksekusi:</p>' +
                '<img src="/docs/screenshot-qurban.png" alt="Halaman Qurban" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p>Sub-modul yang tersedia:</p>' +
                '<ul>' +
                '<li><strong>Periods</strong> — Periode qurban (mis: Idul Adha 1447H)</li>' +
                '<li><strong>Packages</strong> — Paket hewan qurban (kambing, sapi utuh, sapi 1/7, dll)</li>' +
                '<li><strong>Orders</strong> — Pesanan qurban yang masuk</li>' +
                '<li><strong>Savings</strong> — Tabungan qurban dengan cicilan</li>' +
                '<li><strong>Executions</strong> — Dokumentasi pelaksanaan penyembelihan</li>' +
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
                '<ol>' +
                '<li>Admin mengatur jadwal penyembelihan per paket/grup.</li>' +
                '<li>Setelah penyembelihan, catat <strong>execution</strong> beserta foto/video dokumentasi.</li>' +
                '<li>Status pesanan berubah ke <strong>executed</strong>.</li>' +
                '<li>Donatur bisa melihat dokumentasi di akun mereka.</li>' +
                '</ol>',
        },
    ],
};
