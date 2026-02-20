import type { DocumentationPage } from "../types";

export const caraMembuatCampaignDoc: DocumentationPage = {
  slug: "cara-membuat-campaign",
  title: "Cara Membuat Campaign",
  category: "Campaign & Donasi",
  summary:
    "Panduan lengkap membuat campaign dari nol sampai siap menerima donasi, dilengkapi screenshot step-by-step.",
  updatedAt: "2026-02-20",
  sections: [
    {
      id: "prasyarat",
      heading: "1. Prasyarat",
      bodyHtml:
        '<p>Sebelum membuat campaign, pastikan:</p>' +
        '<ul>' +
        '<li>Akun Anda memiliki role <strong>super_admin</strong>, <strong>admin_campaign</strong>, atau <strong>mitra</strong>.</li>' +
        '<li>Data <strong>Kategori</strong> sudah tersedia (misal: Pendidikan, Kesehatan, Lingkungan).</li>' +
        '<li><strong>Gambar utama</strong> campaign sudah disiapkan (rekomendasi: 1200×630 px).</li>' +
        '<li>Deskripsi singkat dan cerita lengkap campaign sudah dirancang.</li>' +
        '</ul>',
    },
    {
      id: "buka-halaman",
      heading: "2. Buka Halaman Campaign",
      bodyHtml:
        '<p>Dari sidebar, klik menu <strong>Campaigns → All Campaigns</strong>. Anda akan melihat daftar semua campaign yang ada:</p>' +
        '<img src="/docs/screenshot-campaigns-list.png" alt="Daftar Campaign" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
        '<p>Pada halaman ini Anda bisa:</p>' +
        '<ul>' +
        '<li>Mencari campaign menggunakan <strong>search bar</strong></li>' +
        '<li>Filter berdasarkan <strong>Kategori</strong> dan <strong>Status</strong></li>' +
        '<li>Melihat detail Goal, Collected, Donors, dan Status setiap campaign</li>' +
        '<li>Klik ikon <strong>👁 View</strong>, <strong>✏️ Edit</strong>, atau <strong>🗑 Delete</strong></li>' +
        '</ul>' +
        '<p>Klik tombol <strong class="text-primary">+ Buat Campaign</strong> di pojok kanan atas untuk memulai.</p>',
    },
    {
      id: "isi-form",
      heading: "3. Isi Form Campaign",
      bodyHtml:
        '<p>Form pembuatan campaign terbagi menjadi beberapa bagian:</p>' +
        '<img src="/docs/screenshot-campaign-form-top.png" alt="Form Campaign Bagian Atas" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +

        '<h4 style="margin-top:20px;">Bagian Utama (Kiri)</h4>' +
        '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
        '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Field</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Wajib</th></tr></thead>' +
        '<tbody>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Judul Campaign</td><td style="padding:8px; border:1px solid #e5e7eb;">Nama program yang akan tampil ke publik</td><td style="padding:8px; border:1px solid #e5e7eb;">✅</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Deskripsi Singkat</td><td style="padding:8px; border:1px solid #e5e7eb;">Ringkasan 1-2 kalimat tentang program</td><td style="padding:8px; border:1px solid #e5e7eb;">✅</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Deskripsi Lengkap</td><td style="padding:8px; border:1px solid #e5e7eb;">Rich text editor — cerita lengkap dengan format bold, list, dll</td><td style="padding:8px; border:1px solid #e5e7eb;">—</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Target Donasi (Rp)</td><td style="padding:8px; border:1px solid #e5e7eb;">Target dana yang ingin dicapai</td><td style="padding:8px; border:1px solid #e5e7eb;">✅</td></tr>' +
        '</tbody></table>' +

        '<h4 style="margin-top:20px;">Bagian Sidebar (Kanan)</h4>' +
        '<table style="width:100%; border-collapse:collapse; margin:12px 0;">' +
        '<thead><tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Field</th><th style="padding:8px; text-align:left; border:1px solid #e5e7eb;">Keterangan</th></tr></thead>' +
        '<tbody>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Gambar Utama</td><td style="padding:8px; border:1px solid #e5e7eb;">Klik "Tetapkan gambar unggulan" untuk upload/pilih dari Media Library</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">URL Video</td><td style="padding:8px; border:1px solid #e5e7eb;">Opsional — link YouTube untuk video campaign</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Galeri Gambar</td><td style="padding:8px; border:1px solid #e5e7eb;">Opsional — tambahkan beberapa gambar galeri</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Kategori</td><td style="padding:8px; border:1px solid #e5e7eb;">Pilih kategori program (wajib)</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Status</td><td style="padding:8px; border:1px solid #e5e7eb;">Draft (belum tampil) atau Active (tampil ke publik)</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Campaign Unggulan</td><td style="padding:8px; border:1px solid #e5e7eb;">Toggle — tampilkan di carousel beranda</td></tr>' +
        '<tr><td style="padding:8px; border:1px solid #e5e7eb;">Campaign Mendesak</td><td style="padding:8px; border:1px solid #e5e7eb;">Toggle — tandai prioritas tinggi</td></tr>' +
        '</tbody></table>',
    },
    {
      id: "form-lanjutan",
      heading: "4. Field Lanjutan",
      bodyHtml:
        '<p>Scroll ke bawah untuk mengisi field tambahan:</p>' +
        '<img src="/docs/screenshot-campaign-form-bottom.png" alt="Form Campaign Bagian Bawah" style="width:100%; border-radius:8px; border:1px solid #e5e7eb; margin:16px 0;" />' +
        '<ul>' +
        '<li><strong>Pilar</strong> — Opsional, pilih pilar program (mis: Kemanusiaan, Pendidikan)</li>' +
        '<li><strong>Penanggung Jawab Program</strong> — Opsional, pilih employee sebagai koordinator. Bisa juga tambahkan employee baru langsung dari sini.</li>' +
        '<li><strong>Tanggal Mulai & Berakhir</strong> — Opsional, tentukan periode kampanye</li>' +
        '<li><strong>SEO</strong> — Panel SEO untuk optimasi mesin pencari (Focus Keyphrase, Meta Title, Meta Description, dll). Skor SEO ditampilkan real-time.</li>' +
        '</ul>',
    },
    {
      id: "simpan-publish",
      heading: "5. Simpan & Publish",
      bodyHtml:
        '<ol>' +
        '<li>Setelah semua field terisi, klik tombol <strong>Simpan</strong> di bagian bawah form.</li>' +
        '<li>Campaign akan tersimpan dengan status sesuai yang dipilih (Draft atau Active).</li>' +
        '<li>Jika statusnya <strong>Active</strong>, campaign akan langsung muncul di website publik pada URL <code>/program/[slug]</code>.</li>' +
        '<li>Untuk mengubah status, kembali ke daftar campaign dan klik ikon Edit.</li>' +
        '</ol>',
    },
    {
      id: "validasi",
      heading: "6. Validasi Hasil",
      bodyHtml:
        '<p>Pastikan campaign berhasil dibuat dengan mengecek:</p>' +
        '<ul>' +
        '<li>✅ Campaign muncul di daftar <strong>All Campaigns</strong> admin panel</li>' +
        '<li>✅ Slug campaign dapat diakses di website publik: <code>/program/[slug]</code></li>' +
        '<li>✅ Informasi target dana, kategori, pilar, dan gambar tampil dengan benar</li>' +
        '<li>✅ SEO score menunjukkan nilai yang memadai (hindari skor merah/Buruk)</li>' +
        '</ul>',
    },
  ],
};
