import type { DocumentationPage } from "../types";

export const zakatDoc: DocumentationPage = {
    slug: "zakat",
    title: "Modul Zakat",
    category: "Operasional",
    summary:
        "Panduan mengelola jenis zakat, periode pengumpulan, distribusi ke mustahiq, dan kalkulator zakat.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "overview",
            heading: "Overview Modul Zakat",
            bodyHtml:
                '<p>Modul zakat di Jaladana mencakup pengumpulan, penghitungan, dan distribusi zakat secara lengkap.</p>' +
                '<figure class="doc-figure"><img src="/docs/screenshot-zakat.png" alt="Halaman Zakat" loading="lazy" /><figcaption>Halaman Zakat</figcaption></figure>' +
                '<p>Sub-modul yang tersedia di admin panel:</p>' +
                '<ul>' +
                '<li><strong>Jenis Zakat</strong> — Kelola jenis zakat yang ditawarkan</li>' +
                '<li><strong>Periode Zakat</strong> — Periode pengumpulan zakat (mis: Ramadhan 2026)</li>' +
                '<li><strong>Pembayaran Zakat</strong> — Pembayaran zakat yang masuk</li>' +
                '<li><strong>Penyaluran</strong> — Penyaluran zakat ke penerima (mustahiq)</li>' +
                '<li><strong>Dashboard Zakat</strong> dan <strong>Kalkulator Zakat</strong> — ringkasan dan alat hitung di sisi admin. Laporan lengkap ada di Reports → Laporan Zakat.</li>' +
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
                '<p>Nilai yang dipakai kalkulator (harga emas/perak per gram, nisab, persentase zakat maal dan profesi, nominal fitrah, fidyah) diatur di <strong>Settings → General Settings</strong> pada tab Setting Zakat. Perubahan langsung dipakai kalkulator web, admin, dan bot WhatsApp. Jenis zakat yang tampil ke donatur diatur di <strong>Zakat → Jenis Zakat</strong>.</p>',
        },
        {
            id: "distribusi",
            heading: "Distribusi Zakat",
            bodyHtml:
                '<p>Alur distribusi zakat:</p>' +
                '<ol class="doc-steps">' +
                '<li>Pastikan data <strong>Mustahiq</strong> (penerima zakat) sudah diinput di menu Master.</li>' +
                '<li>Buka <strong>Zakat → Penyaluran</strong> dan buat distribusi baru.</li>' +
                '<li>Pilih mustahiq, jumlah, dan periode zakat.</li>' +
                '<li>Distribusi akan tercatat dan mempengaruhi laporan penyaluran zakat.</li>' +
                '</ol>' +
                '<p>Penyaluran zakat juga bisa dilakukan via <strong>Disbursements</strong> dengan tipe <em>zakat</em>.</p>',
        },
    ],
};
