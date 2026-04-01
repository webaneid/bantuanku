import type { DocumentationPage } from "../types";

export const seoDoc: DocumentationPage = {
    slug: "seo",
    title: "Tutorial SEO Lengkap",
    category: "Operasional",
    summary:
        "Panduan komprehensif optimasi SEO: komponen SEO Panel, SEO per campaign/zakat/qurban, SEO halaman arsip, dan SEO kategori & pilar.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "overview",
            heading: "Overview SEO di Bantuanku",
            bodyHtml:
                '<p>Bantuanku memiliki sistem SEO terintegrasi yang memungkinkan optimasi pencarian di setiap konten. SEO dikelola di <strong>4 tempat berbeda</strong> sesuai jenis konten:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Konten</th><th style="padding:10px; text-align:left; border:1px solid #e5e7eb;">Lokasi Pengaturan SEO</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Campaign, Zakat, Qurban</td><td style="padding:10px; border:1px solid #e5e7eb;">Di form <strong>Create / Edit</strong> masing-masing (ada panel SEO di bagian bawah)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Homepage, Arsip Program, Arsip Zakat, Arsip Qurban, Arsip Wakaf</td><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Settings → SEO Halaman</strong></td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Kategori Campaign</td><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Campaigns → Categories</strong> (edit kategori)</td></tr>' +
                '<tr><td style="padding:10px; border:1px solid #e5e7eb;">Pilar Campaign</td><td style="padding:10px; border:1px solid #e5e7eb;"><strong>Campaigns → Pillars</strong> (edit pilar)</td></tr>' +
                '</tbody></table>' +
                '<p>Semua pengaturan SEO menggunakan <strong>komponen SEO Panel</strong> yang sama, dengan fitur analisis real-time dan skor otomatis.</p>',
        },
        {
            id: "seo-panel",
            heading: "Komponen SEO Panel",
            bodyHtml:
                '<p>SEO Panel adalah komponen terpadu yang muncul di setiap form create/edit. Panel ini terdiri dari 3 bagian utama:</p>' +
                '<img src="/docs/screenshot-seo-panel.png" alt="SEO Panel pada Campaign Edit" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p><em>Tampilan SEO Panel saat mengedit campaign — menampilkan Preview Google, Analisis SEO, dan menu Social Media & Advanced.</em></p>' +

                '<h4 style="margin-top:20px;">1. SEO Dasar</h4>' +
                '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Field</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Rekomendasi</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Focus Keyphrase</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Kata kunci utama yang ingin ditargetkan</td><td style="padding:8px; border:1px solid #e5e7eb;">Contoh: "donasi pendidikan anak"</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>SEO Title</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Judul yang tampil di hasil Google</td><td style="padding:8px; border:1px solid #e5e7eb;">50–60 karakter, keyphrase di awal</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Meta Description</strong></td><td style="padding:8px; border:1px solid #e5e7eb;">Deskripsi di bawah judul Google</td><td style="padding:8px; border:1px solid #e5e7eb;">120–155 karakter, mengandung keyphrase</td></tr>' +
                '</tbody></table>' +
                '<p>SEO Title dan Meta Description akan <strong>otomatis terisi</strong> dari judul dan deskripsi konten jika dikosongkan. Tapi sangat disarankan untuk mengisinya secara manual untuk hasil yang lebih optimal.</p>' +

                '<h4 style="margin-top:20px;">2. Social Media (Open Graph)</h4>' +
                '<p>Bagian ini mengatur tampilan saat link dishare ke Facebook, WhatsApp, LinkedIn, dan platform lainnya:</p>' +
                '<ul>' +
                '<li><strong>OG Title</strong> — Judul untuk social media (kosongkan untuk pakai SEO Title)</li>' +
                '<li><strong>OG Description</strong> — Deskripsi untuk social media (kosongkan untuk pakai Meta Description)</li>' +
                '<li><strong>OG Image</strong> — Gambar yang muncul saat link dishare (rekomendasi: 1200×630 px). Kosongkan untuk pakai featured image.</li>' +
                '</ul>' +

                '<h4 style="margin-top:20px;">3. Advanced</h4>' +
                '<ul>' +
                '<li><strong>Canonical URL</strong> — URL kanonik jika konten ini duplikat dari halaman lain. Biasanya dikosongkan.</li>' +
                '<li><strong>noIndex</strong> — Centang untuk mencegah Google mengindex halaman ini.</li>' +
                '<li><strong>noFollow</strong> — Centang untuk mencegah Google mengikuti link di halaman ini.</li>' +
                '</ul>',
        },
        {
            id: "seo-score",
            heading: "Skor SEO & Analisis Real-Time",
            bodyHtml:
                '<p>SEO Panel menghitung <strong>skor 0–100</strong> secara real-time berdasarkan 15 pengecekan:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:16px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Pengecekan</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Focus keyphrase</td><td style="padding:8px; border:1px solid #e5e7eb;">Apakah keyphrase sudah diisi</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Keyphrase di SEO title</td><td style="padding:8px; border:1px solid #e5e7eb;">Idealnya di awal judul</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Keyphrase di meta description</td><td style="padding:8px; border:1px solid #e5e7eb;">Harus mengandung keyphrase</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Keyphrase di URL/slug</td><td style="padding:8px; border:1px solid #e5e7eb;">Slug mengandung keyphrase</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Keyphrase di paragraf awal</td><td style="padding:8px; border:1px solid #e5e7eb;">Muncul dalam 100 kata pertama konten</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Keyphrase density</td><td style="padding:8px; border:1px solid #e5e7eb;">Idealnya 1–3% dari total kata</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Panjang SEO title</td><td style="padding:8px; border:1px solid #e5e7eb;">Ideal: 50–60 karakter</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Panjang meta description</td><td style="padding:8px; border:1px solid #e5e7eb;">Ideal: 120–155 karakter</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Panjang konten</td><td style="padding:8px; border:1px solid #e5e7eb;">Minimal 300 kata (disarankan)</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Internal links</td><td style="padding:8px; border:1px solid #e5e7eb;">Minimal 2 link ke halaman internal</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Gambar dengan alt keyphrase</td><td style="padding:8px; border:1px solid #e5e7eb;">Setidaknya 1 gambar memiliki alt text mengandung keyphrase</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Featured image / OG image</td><td style="padding:8px; border:1px solid #e5e7eb;">Gambar unggulan sudah diset</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Panjang slug</td><td style="padding:8px; border:1px solid #e5e7eb;">Idealnya ≤ 75 karakter</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Subheadings (H2/H3)</td><td style="padding:8px; border:1px solid #e5e7eb;">Minimal 2 subheading untuk struktur konten</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Keyphrase di subheading</td><td style="padding:8px; border:1px solid #e5e7eb;">Salah satu H2/H3 mengandung keyphrase</td></tr>' +
                '</tbody></table>' +

                '<p>Indikator skor:</p>' +
                '<ul>' +
                '<li>🟢 <strong>71–100 (Bagus)</strong> — SEO sudah optimal</li>' +
                '<li>🟡 <strong>41–70 (Perlu Perbaikan)</strong> — Ada beberapa hal yang perlu ditingkatkan</li>' +
                '<li>🔴 <strong>0–40 (Buruk)</strong> — SEO perlu banyak perbaikan</li>' +
                '</ul>' +
                '<p>Skor ini tersimpan ke database bersama konten saat disimpan.</p>',
        },
        {
            id: "seo-campaign",
            heading: "SEO di Campaign, Zakat & Qurban",
            bodyHtml:
                '<p>Saat <strong>membuat atau mengedit</strong> Campaign, Zakat Type, atau Qurban Package, SEO Panel akan muncul di bagian bawah form:</p>' +
                '<ol>' +
                '<li>Buka halaman <strong>Create</strong> atau <strong>Edit</strong> konten.</li>' +
                '<li>Isi semua field konten terlebih dahulu (judul, deskripsi, gambar, dll).</li>' +
                '<li>Scroll ke bawah — Anda akan melihat <strong>panel SEO</strong>.</li>' +
                '<li>Isi <strong>Focus Keyphrase</strong> — kata kunci yang ingin Anda ranking-kan di Google.</li>' +
                '<li>SEO Title dan Meta Description akan otomatis terisi dari konten, tapi Anda bisa mengeditnya secara manual.</li>' +
                '<li>Perhatikan <strong>Preview Google</strong> — ini adalah tampilan konten Anda di hasil pencarian Google.</li>' +
                '<li>Perhatikan <strong>Analisis SEO</strong> — perbaiki item yang berstatus 🔴 (merah) dan 🟡 (kuning).</li>' +
                '<li>Buka section <strong>Social Media</strong> untuk mengatur OG title, description, dan image.</li>' +
                '<li>Klik <strong>Simpan / Update</strong> — data SEO tersimpan bersama konten.</li>' +
                '</ol>' +
                '<p>Panel SEO mendukung entity type berikut beserta URL prefix-nya:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Entity</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">URL Preview</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Campaign</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org<strong>/program</strong>/[slug]</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Zakat Type</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org<strong>/zakat</strong>/[slug]</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Qurban Package</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org<strong>/qurban</strong>/[slug]</td></tr>' +
                '</tbody></table>',
        },
        {
            id: "seo-arsip",
            heading: "SEO Halaman Home & Arsip",
            bodyHtml:
                '<p>Halaman-halaman yang tidak memiliki form create/edit individu dikelola SEO-nya secara global melalui <strong>Settings → SEO Halaman</strong>:</p>' +
                '<img src="/docs/screenshot-seo-settings.png" alt="SEO Settings" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p>Tersedia 5 tab halaman:</p>' +
                '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
                '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Tab</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Halaman</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">URL</th></tr></thead>' +
                '<tbody>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">🏠 Homepage</td><td style="padding:8px; border:1px solid #e5e7eb;">Halaman utama website</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org/</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">📋 Arsip Program</td><td style="padding:8px; border:1px solid #e5e7eb;">Daftar semua program</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org/program</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">🕌 Arsip Zakat</td><td style="padding:8px; border:1px solid #e5e7eb;">Daftar jenis zakat</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org/zakat</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">🐄 Arsip Qurban</td><td style="padding:8px; border:1px solid #e5e7eb;">Daftar paket qurban</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org/qurban</td></tr>' +
                '<tr><td style="padding:8px; border:1px solid #e5e7eb;">🤲 Arsip Wakaf</td><td style="padding:8px; border:1px solid #e5e7eb;">Daftar program wakaf</td><td style="padding:8px; border:1px solid #e5e7eb;">bantuanku.org/wakaf</td></tr>' +
                '</tbody></table>' +

                '<p><strong>Cara menggunakan:</strong></p>' +
                '<ol>' +
                '<li>Buka <strong>Settings → SEO Halaman</strong> di sidebar.</li>' +
                '<li>Pilih tab halaman yang ingin dioptimasi (Homepage, Arsip Program, dll).</li>' +
                '<li>Isi Focus Keyphrase, SEO Title, dan Meta Description.</li>' +
                '<li>Perhatikan skor SEO — badge skor juga ditampilkan di setiap tab.</li>' +
                '<li>Klik <strong>Simpan Semua SEO</strong> — menyimpan pengaturan SEO untuk semua halaman sekaligus.</li>' +
                '</ol>',
        },
        {
            id: "seo-kategori-pilar",
            heading: "SEO Kategori & Pilar",
            bodyHtml:
                '<p>Kategori dan pilar campaign juga memiliki pengaturan SEO sendiri karena setiap kategori/pilar menghasilkan halaman arsip di website publik.</p>' +
                '<img src="/docs/screenshot-categories.png" alt="Daftar Kategori" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
                '<p><em>Daftar kategori campaign — klik ikon edit (✏️) untuk mengatur SEO.</em></p>' +

                '<h4 style="margin-top:16px;">Kategori</h4>' +
                '<ol>' +
                '<li>Buka <strong>Campaigns → Categories</strong>.</li>' +
                '<li>Klik ikon <strong>✏️ Edit</strong> pada kategori yang ingin dioptimasi.</li>' +
                '<li>Di form edit, Anda akan menemukan <strong>panel SEO</strong> dengan semua field standar.</li>' +
                '<li>URL preview: <code>bantuanku.org/program/kategori/[slug]</code></li>' +
                '<li>Simpan perubahan.</li>' +
                '</ol>' +

                '<h4 style="margin-top:16px;">Pilar</h4>' +
                '<ol>' +
                '<li>Buka <strong>Campaigns → Pillars</strong>.</li>' +
                '<li>Klik ikon <strong>✏️ Edit</strong> pada pilar yang ingin dioptimasi.</li>' +
                '<li>Di form edit, Anda akan menemukan <strong>panel SEO</strong> dengan field standar.</li>' +
                '<li>URL preview: <code>bantuanku.org/program/pilar/[slug]</code></li>' +
                '<li>Simpan perubahan.</li>' +
                '</ol>' +
                '<p>Dengan mengoptimasi SEO kategori dan pilar, setiap halaman arsip kategori/pilar akan memiliki meta title, description, dan Open Graph yang tepat.</p>',
        },
        {
            id: "google-preview",
            heading: "Preview Google (SERP)",
            bodyHtml:
                '<p>SEO Panel menyediakan <strong>preview real-time</strong> tampilan konten Anda di hasil pencarian Google:</p>' +
                '<ul>' +
                '<li><strong>Judul biru</strong> — Dari SEO Title (di-truncate jika &gt; 60 karakter)</li>' +
                '<li><strong>URL hijau</strong> — Dari slug konten dengan prefix sesuai entity type</li>' +
                '<li><strong>Deskripsi abu-abu</strong> — Dari Meta Description (di-truncate jika &gt; 155 karakter)</li>' +
                '</ul>' +
                '<p>Gunakan preview ini untuk memastikan konten Anda tampil menarik dan informatif di hasil pencarian.</p>',
        },
        {
            id: "tips",
            heading: "Tips & Best Practice",
            bodyHtml:
                '<ul>' +
                '<li>✅ <strong>Selalu isi Focus Keyphrase</strong> — Ini adalah dasar dari seluruh analisis SEO.</li>' +
                '<li>✅ <strong>Tempatkan keyphrase di awal SEO Title</strong> — Contoh: "Donasi Pendidikan Anak — Bantuanku".</li>' +
                '<li>✅ <strong>Tulis meta description yang menarik</strong> — Ini adalah "iklan gratis" Anda di Google. Buat pembaca ingin klik.</li>' +
                '<li>✅ <strong>Gunakan slug yang pendek dan mengandung keyphrase</strong> — Contoh: <code>donasi-pendidikan-anak</code>.</li>' +
                '<li>✅ <strong>Sebutkan keyphrase di paragraf pertama</strong> — Google memprioritaskan konten di awal halaman.</li>' +
                '<li>✅ <strong>Gunakan subheading (H2/H3)</strong> — Minimal 2 subheading, salah satunya mengandung keyphrase.</li>' +
                '<li>✅ <strong>Tambahkan gambar dengan alt text</strong> — Alt text harus deskriptif dan mengandung keyphrase.</li>' +
                '<li>✅ <strong>Set OG Image</strong> — Gambar 1200×630 px agar tampilan share ke WhatsApp/Facebook optimal.</li>' +
                '<li>✅ <strong>Targetkan skor hijau (71+)</strong> — Tapi jangan mengorbankan kualitas konten demi skor.</li>' +
                '<li>⚠️ <strong>Hindari keyword stuffing</strong> — Keyphrase density idealnya 1–3%, jangan berlebihan.</li>' +
                '<li>⚠️ <strong>Jangan centang noIndex</strong> kecuali Anda benar-benar tidak ingin halaman muncul di Google.</li>' +
                '</ul>',
        },
    ],
};
