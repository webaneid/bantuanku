# Program Influencer Bantuanku: Bantu Sebarkan Kebaikan, Dapatkan Komisi Referral

Slug rekomendasi: `program-influencer-bantuanku`

Meta title: `Program Influencer Bantuanku: Cara Daftar, Link Referral, dan Komisi`

Meta description: `Program Influencer Bantuanku memungkinkan donatur dan karyawan membagikan link referral program donasi, zakat, dan qurban, lalu memperoleh komisi setelah transaksi berhasil dibayar.`

Focus keyphrase: `program influencer Bantuanku`

CTA utama: `Daftar sebagai Influencer`

Link pendaftaran donatur: `/account/fundraiser`

Link registrasi akun: `/register`

---

## Program Influencer Bantuanku: Bantu Sebarkan Kebaikan, Dapatkan Komisi Referral

Program Influencer Bantuanku adalah ruang kolaborasi bagi individu yang ingin ikut memperluas jangkauan program sosial melalui link referral. Di dalam sistem internal, fitur ini disebut `fundraiser`. Namun, untuk publik dan tampilan antarmuka, nama yang digunakan adalah Influencer.

Perannya sederhana tetapi strategis: influencer membagikan link program Bantuanku kepada jaringan mereka. Ketika seseorang berdonasi melalui link tersebut dan transaksinya berhasil dibayar, sistem mencatat referral dan menghitung komisi sesuai kebijakan yang berlaku.

Model ini mempertemukan dua kebutuhan sekaligus. Program sosial membutuhkan jangkauan yang lebih luas, sementara individu yang memiliki jaringan, audiens, komunitas, atau kedekatan sosial dapat ikut membantu penyebaran program secara lebih terukur. Setiap kontribusi promosi tidak hanya berhenti sebagai ajakan, tetapi juga tercatat di sistem.

## Apa Itu Influencer Bantuanku?

Influencer Bantuanku adalah individu yang membantu mempromosikan program donasi, zakat, dan qurban di platform Bantuanku melalui kode referral unik. Influencer bisa berasal dari dua sumber:

- Donatur yang mendaftar secara mandiri melalui akun di website publik.
- Karyawan atau staf yang mendaftar melalui admin panel atau didaftarkan oleh admin.

Setiap influencer memiliki kode unik dengan format seperti `FRS6200001`. Kode ini dipakai dalam link referral, misalnya dalam bentuk parameter `?ref=FRS6200001`. Ketika calon donatur mengakses link tersebut, sistem menyimpan kode referral di browser selama 24 jam. Jika donatur melakukan checkout dalam periode itu, transaksi akan dikaitkan dengan influencer pemilik kode.

## Mengapa Program Influencer Penting?

Banyak program sosial memiliki pesan yang kuat, tetapi tidak selalu memiliki kanal distribusi yang luas. Di sinilah influencer berperan. Mereka membantu membawa program ke lebih banyak orang melalui kanal yang sudah mereka miliki: WhatsApp, media sosial, komunitas, jaringan keluarga, lingkungan kerja, atau forum publik.

Bagi platform, referral membuat sumber donasi lebih mudah dilacak. Bantuanku dapat mengetahui berapa banyak transaksi yang datang melalui influencer tertentu, berapa total donasi yang berhasil direferensikan, dan berapa komisi yang sudah dihitung.

Bagi influencer, sistem ini memberi kejelasan. Mereka dapat melihat kode referral, membagikan link, memantau referral, melihat total donasi yang masuk melalui link mereka, serta mengajukan pencairan jika saldo komisi sudah memenuhi ketentuan.

## Cara Kerja Link Referral

Setelah influencer aktif, sistem menyediakan kode referral. Kode ini dapat ditempelkan ke link program, halaman utama, atau halaman program yang ingin dibagikan. Saat pengunjung membuka link dengan parameter `ref`, kode tersebut tersimpan sementara di browser.

Saat checkout, sistem mengirimkan kode referral ke API transaksi. Jika kode valid dan influencer aktif, transaksi akan menyimpan relasi ke influencer tersebut. Pada tahap awal, referral masih berstatus `pending` karena donasi belum tentu benar-benar selesai dibayar.

Komisi baru dihitung setelah transaksi berstatus `paid`. Ini penting, karena sistem tidak menaikkan saldo hanya karena transaksi dibuat. Saldo influencer naik setelah pembayaran benar-benar berhasil dan revenue share dihitung.

Secara ringkas, alurnya seperti ini:

1. Influencer membagikan link dengan kode referral.
2. Donatur membuka link tersebut.
3. Sistem menyimpan kode referral di browser selama 24 jam.
4. Donatur melakukan donasi atau checkout.
5. Transaksi tercatat dengan kode influencer.
6. Jika transaksi berhasil dibayar, komisi dihitung.
7. Saldo influencer bertambah dan dapat diajukan untuk pencairan.

## Program Apa Saja yang Bisa Dipromosikan?

Influencer dapat membagikan program aktif yang tersedia di Bantuanku. Secara sistem, cakupannya meliputi campaign donasi, zakat, dan qurban.

Namun, tidak semua transaksi menghasilkan komisi. Campaign dengan pilar Wakaf dan Fidyah dikecualikan dari perhitungan komisi. Dalam kasus tersebut, referral tetap dapat tercatat, tetapi komisi bernilai 0 sesuai ketentuan sistem.

Untuk qurban, dasar perhitungan komisi berbeda dari campaign dan zakat. Komisi qurban dihitung dari admin fee, bukan dari total harga paket. Hal ini karena harga paket qurban berkaitan langsung dengan kebutuhan pelaksanaan qurban, sedangkan pembagian revenue share hanya menggunakan komponen biaya administrasi.

## Bagaimana Komisi Influencer Dihitung?

Komisi influencer dihitung melalui mekanisme revenue share. Setiap transaksi yang lunas menghasilkan satu catatan pembagian penerimaan. Di dalam pembagian tersebut, porsi influencer dicatat sebagai `fundraiserAmount`.

Besaran komisi mengikuti pengaturan global `amil_fundraiser_percentage` pada kategori pengaturan amil. Nilainya dapat disesuaikan oleh pengelola sistem dan bisa bernilai 0 jika kebijakan komisi belum diaktifkan. Di database memang tersedia field komisi per influencer, tetapi kalkulasi saat ini memakai pengaturan global tersebut.

Untuk campaign dan zakat, komisi dihitung dari nilai transaksi sebagai basis, lalu dipotong dari porsi amil. Artinya, komisi influencer tidak mengambil dana program yang menjadi hak penerima manfaat. Untuk qurban, basisnya adalah admin fee.

Ada beberapa prinsip penting:

- Komisi dihitung hanya jika transaksi sudah `paid`.
- Saldo tidak bertambah saat transaksi baru dibuat.
- Referral awal dicatat sebagai `pending`, lalu berubah menjadi `paid` setelah pembayaran berhasil.
- Wakaf dan Fidyah tidak menghasilkan komisi.
- Persentase komisi mengikuti kebijakan pengaturan sistem yang berlaku.

## Apa Saja yang Bisa Dipantau Influencer?

Influencer memiliki dashboard untuk memantau performa referral. Donatur yang mendaftar sebagai influencer dapat mengakses halaman `/account/fundraiser` setelah login. Karyawan dapat mengakses dashboard melalui admin panel pada menu `Influencer Saya`.

Di dashboard, influencer dapat melihat beberapa indikator utama:

- Kode referral unik.
- Status influencer.
- Total referral.
- Total nominal donasi yang masuk melalui referral.
- Total komisi yang sudah diperoleh.
- Saldo berjalan yang tersedia.
- Total pencairan.
- Riwayat referral.
- Riwayat pengajuan pencairan.

Dashboard juga menyediakan tombol berbagi ke beberapa kanal, termasuk copy link dan media sosial, sehingga influencer dapat membagikan program dengan lebih mudah.

## Status Influencer

Pendaftaran influencer tidak otomatis langsung aktif untuk semua jalur. Status awal dapat masuk sebagai `pending` dan perlu persetujuan admin.

Status yang digunakan dalam sistem adalah:

- `pending`, yaitu pendaftaran sedang menunggu persetujuan.
- `active`, yaitu influencer sudah aktif dan dapat menerima referral.
- `inactive`, yaitu influencer dinonaktifkan.

Dalam tampilan tertentu juga ada status penolakan atau suspend sesuai kebutuhan pengelolaan. Intinya, hanya influencer yang aktif yang dapat menjalankan referral secara normal.

## Cara Daftar sebagai Influencer Bantuanku

Untuk donatur atau pengguna publik, pendaftaran dilakukan melalui akun Bantuanku.

Langkahnya:

1. Buat akun atau login ke Bantuanku.
2. Buka halaman `/account/fundraiser`.
3. Lengkapi data profil yang diminta.
4. Klik tombol `Daftar sebagai Influencer`.
5. Tunggu proses persetujuan admin.
6. Setelah aktif, gunakan kode referral untuk membagikan program.

Jika belum memiliki akun, pengguna dapat mendaftar terlebih dahulu melalui `/register`.

Untuk karyawan atau staf, pendaftaran dilakukan melalui admin panel:

1. Login ke admin panel.
2. Buka menu `Influencer Saya`.
3. Lengkapi rekening bank.
4. Ajukan pendaftaran sebagai influencer.
5. Tunggu persetujuan admin.

Admin juga dapat membuat influencer secara manual dari halaman pengelolaan influencer dengan memilih sumber donatur atau employee.

## Pencairan Komisi Influencer

Komisi yang sudah dihitung akan masuk ke saldo influencer. Pencairan dilakukan melalui sistem disbursement dengan tipe `revenue_share` dan kategori `revenue_share_fundraiser`.

Ketentuan yang berlaku:

- Minimum pencairan: Rp 500.000.
- Biaya transfer: Rp 6.500.
- Alur pencairan: `submitted` → `approved` → `paid`.
- Pengajuan dilakukan secara mandiri melalui endpoint dan dashboard influencer.

Saat influencer mengajukan pencairan, sistem menghitung saldo tersedia dari catatan revenue share dan alokasi pencairan yang belum ditolak. Ini membantu mencegah pencairan ganda untuk komisi yang sama.

## Transparansi untuk Promosi Program Sosial

Program Influencer Bantuanku bukan sekadar fitur link referral. Fitur ini adalah cara untuk membuat aktivitas promosi program sosial lebih terukur, transparan, dan bisa dipertanggungjawabkan.

Influencer dapat melihat dampak nyata dari link yang dibagikan. Pengelola dapat memantau siapa yang membawa transaksi. Donatur tetap mendapatkan pengalaman berdonasi yang sama, sementara sistem memastikan komisi hanya dihitung setelah pembayaran berhasil.

Dengan pola ini, Bantuanku membuka ruang bagi lebih banyak orang untuk ikut menyebarkan kebaikan. Siapa pun yang memiliki jaringan dan komitmen untuk membantu program sosial dapat mengambil peran sebagai influencer, membagikan link program, dan ikut memperluas dampak kebaikan secara profesional.

## Siap Jadi Influencer Kebaikan?

Punya jaringan, komunitas, atau audiens yang bisa diajak mendukung program sosial?

Gabung sebagai Influencer Bantuanku, bagikan link referral Anda, dan bantu lebih banyak program menjangkau orang yang tepat.

`Daftar sebagai Influencer`  
`/account/fundraiser`

Belum punya akun? Mulai dari `/register`.
