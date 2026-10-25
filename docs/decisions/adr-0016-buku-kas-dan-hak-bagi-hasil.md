# ADR-0016: Buku Kas dan Hak Bagi Hasil sebagai sumber tunggal laporan keuangan

**Status:** Accepted
**Tanggal:** 2026-10-26

> Keputusan D1, D2, D4, D5, D6, D7, D8, D9 sudah dijawab pemilik produk pada 2026-10-26 dan tercermin di bawah. Yang tersisa hanya D3 (cara memasukkan data lama), ditentukan dari audit produksi dan tidak mengubah model. Disetujui pemilik produk untuk dieksekusi (Fase 1 offline) pada 2026-10-26. Rencana eksekusi lengkap: `docs/arsitektur-buku-kas.md`.

## Context

Audit 2026-10-26 (kode + data dev, lihat `arsitektur-laporan.md` dan `scripts/audit/`) menemukan:

1. **26 endpoint laporan** (`apps/api/src/routes/admin/reports.ts`, 2.915 baris) dan 16 halaman admin, masing-masing menghitung sendiri dari `transactions` dan `disbursements`. Definisi pendapatan, kolom tanggal, filter status, dan definisi donatur berbeda per endpoint. Contoh data dev, periode sama: `dashboard` = 4.295.000, `financial-statement` = 4.298.781.
2. **Pembukuan double-entry tidak terpakai.** `ledger_entries` dan `ledger_lines` kosong (0 baris), 0 transaksi bertaut jurnal. Neraca (`/financial-statement`) adalah lima agregat sintetis; kode akun hanya label.
3. **Sumber uang masuk yang salah.** Laporan memakai `transactions.total_amount` (+ `unique_code`), bukan `transaction_payments` verified. Data dev: satu transaksi punya 3 pembayaran terverifikasi (300.639 untuk tagihan 100.213); `paid_amount` tidak konsisten antar jalur bayar; kode unik dihitung sebagai pendapatan untuk semua transaksi paid padahal 3 dari 5 pembayaran Flip tidak menerimanya (nominal tidak diterima Rp 1.206); transaksi `partial` (cicilan) tidak terbaca sama sekali.
4. **Rekening tidak terhubung.** Daftar rekening ada di JSON `settings` (`payment_bank_accounts`, `payment_qris_accounts`); tabel `bank_accounts` kosong, `transactions.bank_account_id` tidak pernah terisi (0 dari 17), sehingga `updateBankBalance()` tidak berefek. Tidak ada saldo rekening yang bisa dipercaya, tidak ada saldo awal, tidak ada pencatatan saldo di payment gateway.
5. **Klasifikasi dana hanya implisit.** Zakat dan titipan qurban dilaporkan sebagai "pendapatan" dan menjadi "ekuitas"; liabilitas hanya campaign dan dihitung dari seluruh donasi termasuk porsi amil/developer. Wakaf dan fidyah hanya terbaca dari `campaigns.pillar` di `type_specific_data`.
6. **Bagi hasil** sudah dihitung (`revenue_shares`) tetapi status "sudah ditransfer atau belum" tidak tampil dalam laporan; tabel penghubung `disbursement_revenue_share_items` kosong; saldo fundraiser/mitra tersimpan di kolom terpisah.

Kebutuhan pemilik produk (2026-10-26), intinya sederhana: (1) tahu uang berasal dari mana (zakat fitrah/maal/…, qurban, campaign, wakaf, fidyah); (2) tahu uang disimpan di rekening mana dan berapa; (3) tahu metode bayar dan, bila gateway, gateway apa; (4) tahu uang masuk dan keluar lewat arus kas; (5) tahu bagi hasil: berapa hak amil, developer, mitra, influencer, dan sudah ditransfer atau belum. Tanpa jurnal berlapis dan tanpa belasan laporan.

## Decision

1. **Satu sumber tunggal: Buku Kas** (`cash_entries`), append-only, satu baris per pergerakan uang fisik, dengan label: arah, jumlah, **dana** (`zakat`/`qurban`/`campaign`/`wakaf`/`fidyah`/`operasional`/`lainnya`) + rincian dana, **akun kas** (`cash_accounts`: rekening bank, QRIS, gateway, tunai), **metode**, **gateway**, tanggal, dan rujukan ke asalnya.
2. **Uang masuk = pembayaran terverifikasi** (`transaction_payments.status = 'verified'`), bukan `transactions.total_amount`. **Uang keluar = `disbursements.status = 'paid'`.** Setiap peristiwa itu diposting ke buku kas dalam transaksi database yang sama dengan perubahan statusnya; posting idempoten (kunci unik rujukan + komponen).
3. **Setiap metode bayar adalah akun kas**, termasuk setiap payment gateway (Flip, iPaymu, Midtrans, Xendit): uang yang lewat gateway dicatat **ada di gateway itu** dan **dianggap sudah masuk** begitu pembayaran berhasil (D4). **Biaya gateway ditanggung donatur** (mis. Flip `charge_fee`), jadi **tidak ada** baris biaya gateway, **tidak ada** pindah kas gateway → bank, dan tidak ada pemotongan yang dicatat. Aplikasi hanya mencatat uang; laporan keuangan resmi lembaga dibuat di luar aplikasi. Laporan Sirkulasi Rekening menampilkan **per gateway**: percobaan, berhasil, tertunda, gagal/kedaluwarsa, dan total masuk berhasil; kolom potongan hanya bila payload gateway menyediakannya (mis. iPaymu `Fee`).
4. **Koreksi lewat entri pembalik**, bukan edit/hapus. **Tidak ada saldo awal, cut-off, atau rekonsiliasi dengan saldo bank** (keputusan D9): buku kas hanya mencatat *sirkulasi uang di sistem*, bukan audit rekening. "Saldo" per akun kas = Σ masuk − Σ keluar yang tercatat.
4a. **Semua uang yang diterima adalah pemasukan** (D1, D6): kode unik dan kelebihan bayar/pembayaran ganda dicatat sebagai pemasukan (komponen berlabel `kode_unik` / `kelebihan`), tidak dianggap anomali yang harus dibalik.
4b. **Pembagian hak 100% dari settings dan `revenue_shares`** (D2): tidak ada persentase di kode. Qurban (D7): pokok = dana pembelian hewan; biaya admin = hak amil yang dibagi menurut pengaturan bagi hasil (amil, developer, mitra, fundraiser).
4c. **Offline dulu** (D9): seluruh pembangunan dan uji dilakukan di lingkungan lokal (boleh dengan salinan data produksi); temuan dicatat di `docs/buku-kas-pelajaran.md` sebagai bekal sebelum menyentuh produksi. Perbaikan data eksisting menyusul.
5. **Hak bagi hasil memakai tabel yang sudah ada** (`revenue_shares` sebagai hak, `disbursements` bertipe `revenue_share` + `disbursement_revenue_share_items` sebagai pembayaran). Tidak ada tabel jurnal baru untuk bagi hasil; dibangun *read model* "hak − dibayar = sisa" per pihak (amil, developer, mitra, fundraiser/influencer), dengan drill-down per transaksi.
6. **Lima laporan** dibaca langsung dari buku kas dengan agregasi SQL di server (bukan di memori): Arus Kas, Sirkulasi Rekening (termasuk statistik per gateway), Dana per Sumber, Bagi Hasil, Rincian per Program. Satu formulir pemeliharaan: Koreksi (entri pembalik). **Sisa dana tetap sisa program** (D5): rumus `sisa = masuk − hak pihak lain − disalurkan`; tidak ada konsep "saldo amil dari sisa".
7. **Aditif dan bertahap.** Tabel baru ditambahkan tanpa mengubah tabel lama; laporan lama tetap berjalan sampai angka laporan baru terbukti cocok (paritas), lalu disembunyikan, dijadikan 410, dan dihapus. Tidak ada perubahan perilaku pembayaran atau pencairan bagi pengguna.
8. **Double-entry/COA tidak dilanjutkan** untuk laporan. `ledger_entries`, `ledger_lines`, `chart_of_accounts`, `bank_accounts` + `updateBankBalance()`, `/admin/finance`, dan `/admin/ledger` dibiarkan berdiri **terpisah** dan **tercatat sebagai komponen yang akan dihapus bertahap** mengikuti perbaikan database kelak (D8; daftar di `arsitektur-buku-kas.md` §6 Register Penghapusan). Tidak ada kode baru yang boleh bergantung padanya. Dimensi `dana` di buku kas sengaja dipilih agar format PSAK 109 kelak dapat dibuat sebagai lapisan penyajian, tanpa memposting ulang.

## Alternatif yang Dipertimbangkan

- **A. Memperbaiki 26 laporan yang ada.** Tidak menyentuh akar masalah (tiga definisi uang masuk, tak ada sumber tunggal, tak ada rekening); tiap perbaikan menambah satu definisi lagi.
- **B. Pembukuan double-entry penuh (COA + jurnal otomatis, format PSAK 109 sejak awal).** Paling lengkap, tetapi: ledger saat ini kosong dan skema COA tidak selaras dengan DB dev, butuh keputusan akuntansi yang belum ada (klasifikasi terikat/tidak terikat, hak amil, wakaf PSAK 112), dan bertentangan dengan permintaan "sederhana". Dimensi `dana` pada buku kas menjaga jalur ini tetap terbuka.
- **C. Buku kas satu tabel dengan label (dipilih).** Cukup menjawab lima kebutuhan, mudah diaudit per baris, murah di-backfill, dan dapat diperluas.
- **D. Event-sourcing penuh (setiap perubahan transaksi menjadi event).** Terlalu besar untuk kebutuhan; buku kas append-only sudah memberi jejak yang cukup.

## Konsekuensi

- Angka "uang masuk" di semua laporan baru **satu definisi**: jumlah pembayaran terverifikasi pada akun kas. Selisih dengan laporan lama akan muncul (pembayaran ganda, kode unik tak diterima, cicilan) dan **harus dijelaskan lewat laporan paritas**, bukan disembunyikan.
- Data lama tidak diubah. Bagaimana data lama masuk ke buku kas (backfill penuh atau mulai dari titik tertentu) diputuskan dari hasil audit produksi (D3), diuji dulu offline.
- Butuh pemetaan: setiap metode bayar (id rekening/QRIS di settings, kode gateway) → satu akun kas. Metode tak dikenal masuk akun "Belum dipetakan" yang ditandai.
- Tidak ada beban kerja baru bagi bendahara: tanpa saldo awal, tanpa pindah kas, tanpa rekonsiliasi bank. Penarikan dana dari gateway ke bank berada di luar aplikasi.
- Laporan menjadi lebih cepat dan skalabel (agregasi SQL berindeks, paginasi server) dibanding paginasi di memori.
- Risiko utama: posting yang terlewat pada jalur bayar yang tidak diketahui (webhook, input admin, tabungan qurban). Mitigasi: satu fungsi posting, pemeriksa rekonsiliasi harian "pembayaran verified tanpa baris buku kas", dan uji paritas sebelum laporan lama dimatikan.
- Perubahan makna kolom atau penambahan dimensi dana wajib lewat ADR baru yang `Supersedes` ADR ini.

---
> Aturan: file ADR TIDAK diedit setelah Accepted. Kalau keputusan berubah,
> buat ADR baru dan tulis "Supersedes ADR-XXXX" di file baru itu.
