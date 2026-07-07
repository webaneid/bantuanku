# Program Mitra Bantuanku: Kolaborasi Lembaga untuk Mengelola Program Sosial Secara Transparan

Slug rekomendasi: `program-mitra-bantuanku`

Meta title: `Program Mitra Bantuanku: Cara Daftar, Manfaat, dan Sistem Bagi Hasil`

Meta description: `Program Mitra Bantuanku membuka peluang bagi lembaga partner untuk membuat program donasi, zakat, dan qurban dengan profil publik, dashboard, verifikasi, serta sistem bagi hasil transparan.`

Focus keyphrase: `program mitra Bantuanku`

CTA utama: `Daftar Mitra`

Link pendaftaran: `/daftar-mitra`

---

## Program Mitra Bantuanku: Kolaborasi Lembaga untuk Mengelola Program Sosial Secara Transparan

Program Mitra Bantuanku adalah jalur kolaborasi bagi lembaga, yayasan, komunitas, dan organisasi sosial yang ingin menjalankan program kebaikan melalui platform digital yang tertata. Melalui program ini, mitra dapat memiliki profil lembaga, mengelola program, menerima dukungan publik, memantau kinerja program, serta memperoleh bagi hasil sesuai kebijakan yang berlaku di sistem.

Di tengah meningkatnya kebutuhan tata kelola donasi yang transparan, program kemitraan seperti ini menjadi penting. Lembaga tidak cukup hanya memiliki niat baik dan jaringan penerima manfaat. Publik juga membutuhkan akses informasi yang jelas: siapa lembaganya, program apa yang dijalankan, bagaimana dana tercatat, dan ke mana hasil dukungan disalurkan.

Bantuanku menempatkan mitra sebagai partner program, bukan vendor. Artinya, mitra bukan sekadar penyedia barang atau jasa, melainkan lembaga pemilik atau pengelola program yang dapat menjalankan campaign, zakat, maupun qurban sesuai ruang lingkup kerja sama.

## Apa Itu Mitra Bantuanku?

Mitra Bantuanku adalah lembaga partner yang terdaftar dan diverifikasi di platform Bantuanku. Setelah disetujui, mitra dapat memiliki profil publik dan, bila akun pengguna diaktifkan oleh admin, dapat masuk ke dashboard untuk melihat data lembaga serta program yang menjadi miliknya.

Profil publik mitra hanya tampil setelah status mitra terverifikasi. Dengan begitu, donatur dan pengunjung situs hanya melihat lembaga yang telah melewati proses pemeriksaan internal.

Dalam ekosistem Bantuanku, mitra dapat terhubung dengan beberapa jenis program:

- Campaign donasi yang dimiliki atau dikelola mitra.
- Program zakat yang dibuat atau dikaitkan dengan mitra.
- Paket qurban yang dibuat oleh mitra.

Setiap program yang terkait dengan mitra akan tercatat sebagai bagian dari kepemilikan program mitra tersebut. Data ini menjadi dasar untuk dashboard, laporan, dan perhitungan bagi hasil.

## Mengapa Lembaga Perlu Bergabung?

Bergabung sebagai mitra memberi lembaga akses ke infrastruktur digital yang lebih siap untuk mengelola program sosial. Bantuanku menyediakan alur registrasi, verifikasi, profil publik, pencatatan rekening, dashboard, serta sistem transaksi yang terhubung dengan perhitungan revenue share.

Bagi lembaga, manfaat utamanya adalah efisiensi dan kejelasan data. Program tidak lagi hanya dipromosikan secara manual, tetapi dapat ditampilkan di halaman publik dan dipantau dari dashboard. Donatur juga lebih mudah melihat kredibilitas lembaga melalui profil mitra dan daftar program yang aktif.

Program Mitra juga membantu memisahkan peran secara jelas. Mitra berperan sebagai pemilik atau partner program, sementara vendor tetap berada di jalur berbeda sebagai penyedia barang atau jasa. Pemisahan ini penting untuk menjaga akuntabilitas operasional dan keuangan.

## Bagaimana Cara Kerja Program Mitra?

Alurnya dimulai dari pendaftaran publik melalui halaman `Daftar Mitra`. Calon mitra mengisi data lembaga, penanggung jawab, kontak, alamat, rekening bank, dan dokumen pendukung. Setelah formulir dikirim, status pendaftaran masuk sebagai `pending` atau menunggu verifikasi.

Admin kemudian memeriksa data tersebut. Jika memenuhi syarat, status mitra diubah menjadi `verified`. Setelah terverifikasi, profil publik mitra dapat ditampilkan di halaman `/mitra/[slug]`, dan admin dapat mengaktifkan akun pengguna mitra agar lembaga bisa masuk ke dashboard.

Di dashboard, mitra dapat melihat status verifikasi, total program, total donasi yang masuk, total bagi hasil, saldo berjalan, dokumen registrasi, serta daftar program yang dimiliki. Untuk program yang terkait dengan mitra, sistem membaca kepemilikan dari relasi program: campaign memakai `mitraId`, sedangkan zakat dan qurban dapat dikenali dari akun pembuat program yang terhubung ke mitra.

## Sistem Bagi Hasil Mitra

Bagi hasil mitra dihitung saat transaksi berstatus lunas atau `paid`. Setiap transaksi yang memenuhi syarat akan menghasilkan catatan revenue share yang membagi penerimaan ke beberapa pihak, termasuk amil, developer/platform, fundraiser bila ada referral, mitra, dan program.

Untuk campaign dan zakat, porsi mitra dihitung dari persentase yang dikonfigurasi di pengaturan sistem. Pada campaign, pengaturannya memakai `amil_mitra_donation_percentage`. Pada zakat, pengaturannya memakai `amil_mitra_percentage`. Besaran ini dapat bernilai 0 atau disesuaikan berdasarkan kebijakan yang sedang berlaku.

Secara sederhana, pola campaign dan zakat bekerja seperti ini:

- Nilai transaksi menjadi dasar perhitungan.
- Hak amil dihitung sesuai persentase program.
- Bagian developer, fundraiser, dan mitra dipotong dari porsi amil.
- Sisa dana program tetap dicatat sebagai bagian yang disalurkan ke tujuan program.

Untuk qurban, mekanismenya berbeda. Harga paket qurban pada dasarnya terkait dengan kebutuhan pelaksanaan qurban, sementara basis revenue share memakai admin fee. Jika paket qurban dikelola oleh mitra, bagian mitra dapat berasal dari sisa admin fee setelah porsi amil dihitung. Karena itu, skema qurban tidak sama dengan campaign atau zakat.

Setelah bagian mitra dihitung, sistem memperbarui tiga angka penting pada data mitra:

- `totalDonationReceived`, yaitu total basis donasi/transaksi yang masuk ke program milik mitra.
- `totalRevenueEarned`, yaitu total bagi hasil yang telah diperoleh mitra.
- `currentBalance`, yaitu saldo berjalan yang dapat diajukan untuk pencairan.

## Bagaimana Pencairan Bagi Hasil Dilakukan?

Saldo bagi hasil mitra terakumulasi di dashboard. Pencairan dilakukan melalui sistem disbursement dengan tipe `revenue_share` dan kategori `revenue_share_mitra`.

Dalam praktiknya, mitra dapat mengajukan pencairan melalui dashboard. Pengajuan tersebut tetap masuk ke alur persetujuan. Status pencairan berjalan dari draft, submitted, approved, hingga paid, atau dapat ditolak jika tidak memenuhi ketentuan. Transfer hanya dapat diarahkan ke rekening mitra yang tersimpan di sistem.

Ketentuan minimum pencairan dan biaya transfer mengikuti kebijakan operasional yang berlaku. Karena itu, mitra perlu memastikan data rekening benar dan dokumen pendukung telah lengkap sejak awal pendaftaran.

## Syarat dan Data yang Perlu Disiapkan

Calon mitra perlu menyiapkan data dasar lembaga sebelum mendaftar. Formulir pendaftaran meminta beberapa informasi utama:

- Nama lembaga.
- Deskripsi singkat lembaga.
- Nama penanggung jawab.
- Jabatan penanggung jawab.
- Email aktif.
- Nomor telepon dan WhatsApp.
- Website lembaga, bila ada.
- Alamat lengkap, mulai dari detail alamat hingga provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan.
- Rekening bank atas nama lembaga atau pihak yang ditunjuk.
- Dokumen pendukung berupa KTP penanggung jawab, buku rekening, dan NPWP bila tersedia.

Dokumen dapat diunggah dalam format gambar atau PDF. Batas unggah yang didukung adalah maksimal 5 MB untuk gambar dan 10 MB untuk PDF.

## Cara Mendaftar Menjadi Mitra Bantuanku

Pendaftaran dilakukan secara online melalui halaman:

`/daftar-mitra`

Langkah pendaftarannya adalah sebagai berikut:

1. Buka halaman `Daftar Mitra`.
2. Isi identitas lembaga dan deskripsi singkat.
3. Lengkapi data penanggung jawab.
4. Masukkan kontak resmi, termasuk email dan WhatsApp.
5. Isi alamat lembaga.
6. Tambahkan rekening bank yang akan digunakan untuk pencairan.
7. Unggah dokumen pendukung.
8. Klik tombol `Daftar sebagai Mitra`.

Setelah formulir dikirim, pendaftaran akan diverifikasi oleh admin. Calon mitra akan dihubungi melalui email setelah proses verifikasi selesai.

## Apa yang Terjadi Setelah Terverifikasi?

Setelah status lembaga menjadi `verified`, mitra dapat memiliki profil publik. Halaman profil ini menampilkan identitas lembaga, deskripsi, kontak, alamat bila tersedia, serta arsip program yang terkait dengan mitra. Program dapat tampil dalam kategori campaign, zakat, dan qurban.

Jika akun pengguna mitra telah diaktifkan, mitra juga dapat masuk ke dashboard untuk melihat data yang menjadi miliknya. Akses mitra dibatasi pada program sendiri, sehingga data lembaga lain tidak tercampur.

Pembatasan ini penting karena platform kemitraan biasanya melibatkan banyak lembaga. Dengan ownership yang jelas, setiap mitra dapat bekerja di ruang datanya sendiri, sementara admin tetap memiliki kendali verifikasi, pengawasan, laporan, dan persetujuan pencairan.

## Transparansi sebagai Fondasi Kemitraan

Program Mitra Bantuanku dirancang untuk membuat kerja sosial lebih mudah dipantau dan lebih mudah dipercaya. Lembaga bisa fokus pada kekuatan utamanya: merancang program, menjangkau penerima manfaat, dan membangun kedekatan dengan masyarakat. Di sisi lain, platform membantu menyediakan jalur pencatatan, publikasi, transaksi, dashboard, dan bagi hasil.

Bagi donatur, keberadaan profil mitra memberi informasi tambahan tentang siapa yang menjalankan program. Bagi lembaga, dashboard dan pencatatan bagi hasil membantu memastikan kerja sama berjalan lebih terukur.

Kemitraan yang baik tidak hanya dimulai dari niat, tetapi juga dari sistem yang jelas. Melalui Program Mitra, Bantuanku membuka ruang kolaborasi bagi lembaga yang ingin mengelola program sosial secara lebih tertib, transparan, dan profesional.

## Siap Menjadi Mitra?

Punya lembaga, komunitas, atau yayasan yang ingin menjalankan program sosial dengan sistem yang lebih rapi?

Daftarkan lembaga Anda sebagai Mitra Bantuanku dan mulai kelola program kebaikan secara lebih transparan.

`Daftar Mitra Sekarang`  
`/daftar-mitra`
