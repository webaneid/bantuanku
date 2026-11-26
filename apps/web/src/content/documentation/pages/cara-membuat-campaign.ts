import type { DocumentationPage } from "../types";

export const caraMembuatCampaignDoc: DocumentationPage = {
    slug: "cara-membuat-campaign",
    title: "Cara Membuat Campaign",
    category: "Campaign & Donasi",
    summary: "Panduan membuat campaign dari nol sampai siap menerima donasi.",
    updatedAt: "2026-11-26",
    sections: [
        {
            id: "prasyarat",
            heading: "1. Prasyarat",
            bodyHtml: `
<ul>
<li>Akun Anda berperan <code>super_admin</code>, <code>admin_campaign</code>, atau <code>mitra</code>.</li>
<li>Kategori sudah tersedia di <strong>Campaigns → Categories</strong>.</li>
<li>Gambar utama siap (rekomendasi 1200×630 px). Lihat <a href="/documentation/panduan-upload-gambar">Panduan Upload Gambar</a>.</li>
<li>Deskripsi singkat dan cerita lengkap program sudah disiapkan.</li>
</ul>`,
        },
        {
            id: "buka-halaman",
            heading: "2. Buka Halaman Campaign",
            bodyHtml: `
<p>Dari sidebar klik <strong>Campaigns → All Campaigns</strong>, lalu klik <strong>Buat Campaign</strong> di pojok kanan atas.</p>
<figure class="doc-figure"><img src="/docs/screenshot-campaigns-list.png" alt="Daftar Campaign" loading="lazy" /><figcaption>Daftar Campaign</figcaption></figure>
<p>Di daftar ini Anda bisa mencari, menyaring menurut kategori dan status, serta melihat, mengedit, atau menghapus campaign.</p>`,
        },
        {
            id: "isi-form",
            heading: "3. Isi Form Campaign",
            bodyHtml: `
<p>Kolom utama:</p>
<table>
<thead><tr><th>Field</th><th>Keterangan</th><th>Wajib</th></tr></thead>
<tbody>
<tr><td>Judul Campaign</td><td>Nama program (minimal 5 karakter).</td><td>Ya</td></tr>
<tr><td>URL Campaign (slug)</td><td>Terbentuk dari judul; klik ubah untuk mengeditnya secara manual.</td><td>—</td></tr>
<tr><td>Deskripsi Singkat</td><td>Ringkasan, minimal 20 karakter.</td><td>Ya</td></tr>
<tr><td>Deskripsi Lengkap</td><td>Cerita program dengan editor teks kaya.</td><td>—</td></tr>
<tr><td>Target Donasi (Rp)</td><td>Target dana. Tidak wajib untuk pilar Fidyah.</td><td>Ya*</td></tr>
<tr><td>Kategori</td><td>Pilih dari daftar kategori.</td><td>Ya</td></tr>
<tr><td>Gambar Utama</td><td>Pilih/unggah dari Media Library.</td><td>—</td></tr>
</tbody>
</table>
<figure class="doc-figure"><img src="/docs/screenshot-campaign-form-top.png" alt="Form Campaign Bagian Atas" loading="lazy" /><figcaption>Form Campaign Bagian Atas</figcaption></figure>
<p>Kolom kanan/bawah:</p>
<ul>
<li><strong>Status</strong> — Draft, Aktif, Selesai, atau Dibatalkan. Akun mitra selalu Draft sampai ditinjau admin.</li>
<li><strong>Campaign Unggulan</strong> — tampil di carousel beranda (tidak tersedia untuk mitra).</li>
<li><strong>Campaign Mendesak</strong> — penanda prioritas (tidak tersedia untuk mitra).</li>
<li><strong>URL Video</strong> dan <strong>Galeri Gambar</strong> — opsional.</li>
</ul>`,
        },
        {
            id: "form-lanjutan",
            heading: "4. Field Lanjutan",
            bodyHtml: `
<ul>
<li><strong>Pilar</strong> (opsional) — mis. Kemanusiaan, Pendidikan, Fidyah.</li>
<li><strong>Mitra</strong> — kaitkan campaign dengan lembaga mitra bila ada.</li>
<li><strong>Penanggung Jawab Program</strong> (opsional) — pilih karyawan sebagai koordinator; ia hanya melihat campaign yang ditugaskan.</li>
<li><strong>Tanggal Mulai &amp; Berakhir</strong> (opsional).</li>
<li><strong>Panel SEO</strong> — focus keyphrase, meta title, dan meta description. Lihat <a href="/documentation/seo">Tutorial SEO</a>.</li>
</ul>
<figure class="doc-figure"><img src="/docs/screenshot-campaign-form-bottom.png" alt="Form Campaign Bagian Bawah" loading="lazy" /><figcaption>Form Campaign Bagian Bawah</figcaption></figure>`,
        },
        {
            id: "simpan-publish",
            heading: "5. Simpan & Publikasikan",
            bodyHtml: `
<p>Klik <strong>Simpan</strong>. Campaign berstatus <strong>Aktif</strong> langsung tampil di website publik pada <code>/program/[slug]</code>.</p>
<p>Saat status Aktif dan campaign belum pernah dipublikasikan, muncul toggle <strong>Sebarkan ke donatur via WhatsApp</strong>. Jika diaktifkan, notifikasi program baru dikirim bertahap ke donatur aktif yang belum berhenti berlangganan. Toggle ini tidak tersedia untuk mitra.</p>`,
        },
        {
            id: "validasi",
            heading: "6. Validasi Hasil",
            bodyHtml: `
<ul>
<li>Campaign muncul di daftar All Campaigns.</li>
<li>Halaman <code>/program/[slug]</code> dapat dibuka dan menampilkan target, kategori, dan gambar dengan benar.</li>
<li>Skor SEO tidak berwarna merah.</li>
<li>Lakukan donasi uji untuk memastikan alur pembayaran berjalan.</li>
</ul>`,
        },
    ],
};
