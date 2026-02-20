import type { DocumentationPage } from "../types";

export const zakatDoc: DocumentationPage = {
    slug: "zakat",
    title: "Modul Zakat",
    category: "Operasional",
    summary:
        "Panduan mengelola jenis zakat, periode pengumpulan, distribusi ke mustahiq, dan kalkulator zakat.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "overview",
            heading: "Overview Modul Zakat",
            bodyHtml:
                '<p>Modul zakat di Bantuanku mencakup pengumpulan, penghitungan, dan distribusi zakat secara lengkap.</p>' +
                '<img src="/docs/screenshot-zakat.png" alt="Halaman Zakat" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p>Sub-modul yang tersedia di admin panel:</p>' +
                '<ul>' +
                '<li><strong>Zakat Types</strong> — Kelola jenis zakat yang ditawarkan</li>' +
                '<li><strong>Zakat Periods</strong> — Periode pengumpulan zakat (mis: Ramadhan 2026)</li>' +
                '<li><strong>Zakat Donations</strong> — Donasi zakat yang masuk</li>' +
                '<li><strong>Zakat Distributions</strong> — Penyaluran zakat ke penerima (mustahiq)</li>' +
                '<li><strong>Zakat Stats</strong> — Statistik pengumpulan dan penyaluran</li>' +
                '</ul>',
        },
        {
            id: "jenis-zakat",
            heading: "Jenis Zakat",
            bodyHtml:
                '<p>Kalkulator zakat mendukung 6 jenis perhitungan:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Jenis</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Deskripsi</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Zakat Penghasilan</td><td style="padding:10px; border:1px solid #e5e7eb;">2.5% dari penghasilan yang melebihi nisab</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Zakat Maal</td><td style="padding:10px; border:1px solid #e5e7eb;">2.5% dari total kekayaan di atas nisab</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Zakat Emas</td><td style="padding:10px; border:1px solid #e5e7eb;">2.5% dari nilai emas yang dimiliki</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Zakat Perdagangan</td><td style="padding:10px; border:1px solid #e5e7eb;">2.5% dari modal + keuntungan - hutang dagang</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Zakat Fitrah</td><td style="padding:10px; border:1px solid #e5e7eb;">Zakat wajib di bulan Ramadhan, per jiwa</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Fidyah</td><td style="padding:10px; border:1px solid #e5e7eb;">Pengganti puasa bagi yang tidak mampu</td></tr>' +
                '</tbody></table>' +
                '<p>Konfigurasi nisab dan rate bisa diubah oleh admin di menu <strong>Zakat Types</strong>.</p>',
        },
        {
            id: "distribusi",
            heading: "Distribusi Zakat",
            bodyHtml:
                '<p>Alur distribusi zakat:</p>' +
                '<ol>' +
                '<li>Pastikan data <strong>Mustahiq</strong> (penerima zakat) sudah diinput di menu Master.</li>' +
                '<li>Buka <strong>Zakat Distributions</strong> dan buat distribusi baru.</li>' +
                '<li>Pilih mustahiq, jumlah, dan periode zakat.</li>' +
                '<li>Distribusi akan tercatat dan mempengaruhi laporan penyaluran zakat.</li>' +
                '</ol>' +
                '<p>Penyaluran zakat juga bisa dilakukan via <strong>Disbursements</strong> dengan tipe <em>zakat</em>.</p>',
        },
    ],
};
