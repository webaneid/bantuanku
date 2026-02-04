# Bantuanku — Blueprint Laporan Mutasi Kas (Cash Flow View)

> Dokumen ini khusus untuk **laman laporan Mutasi Kas / Cash Flow** (view pergerakan Kas/Bank). Ini **bukan** ledger akuntansi detail. Target user: Admin Finance, Super Admin, dan (opsional) Admin Campaign read-only.

---

## 1) Tujuan Laman

Laman ini harus bisa menjawab dengan cepat:
- saldo kas/bank saat ini
- uang masuk dari mana (donasi, top-up, koreksi)
- uang keluar untuk apa (penyaluran, operasional)
- kapan terjadi
- lewat rekening mana
- bukti transaksi ada atau tidak

Output utamanya: **mutasi rekening** berbasis data sistem (donation/disbursement/payment), dengan opsi rekonsiliasi bank.

---

## 2) Prinsip Tampilan (Simple Terms)

- Jangan pakai istilah debit/credit untuk user umum.
- Gunakan label:
  - **Kas Masuk** = debit pada akun kas/bank
  - **Kas Keluar** = credit pada akun kas/bank
- Semua angka di laporan ini adalah **pergerakan akun kas/bank**.

---

## 3) Data Sumber (Source of Truth)

Laporan ini dibangun dari:
- `LedgerEntry + LedgerLine` **yang difilter akun Kas/Bank**
- join ke:
  - `Donation` (uang masuk)
  - `Disbursement` (uang keluar)
  - `Payment` (provider ref & fee)
  - `Invoice` (download invoice donasi)
  - `Payee` (penerima uang keluar)
  - `Media` (bukti transfer/kwitansi)

**Rule utama:**
- Kas Masuk = total debit pada akun Kas/Bank
- Kas Keluar = total credit pada akun Kas/Bank

---

## 4) Struktur Laman (UI Blocks)

### 4.1 Header
- Judul: **Mutasi Kas & Bank**
- Subjudul: *Pergerakan uang masuk dan keluar berdasarkan data transaksi Bantuanku.*

### 4.2 Filter Bar (wajib)
Komponen filter yang harus ada:
- Range tanggal: hari ini / 7 hari / bulan ini / custom
- Pilih akun: **Kas** / **Bank Utama** (dropdown)
- Tipe transaksi: Semua / Donasi Masuk / Penyaluran / Operasional
- Status: Sukses/Paid saja (default) + toggle tampilkan pending
- Search: kata kunci (nama donatur, payee, no referensi)

### 4.3 Summary Cards (wajib)
Card ringkas di atas tabel:
1) **Saldo Awal** (opening balance)
2) **Total Kas Masuk** (period)
3) **Total Kas Keluar** (period)
4) **Saldo Akhir** (closing balance)

Tambahan (opsional):
- Jumlah transaksi masuk
- Jumlah transaksi keluar

### 4.4 Table / List Mutasi (inti)
Tabel harus punya kolom minimum:
- Tanggal & Jam
- Jenis (chip): Donasi Masuk / Penyaluran / Operasional / Koreksi
- Deskripsi singkat (contoh: Donasi campaign X dari Nama via BCA)
- **Kas Masuk** (angka, kalau tidak ada tampil “—”)
- **Kas Keluar** (angka, kalau tidak ada tampil “—”)
- Akun (Kas/Bank)
- Referensi (no. transfer / provider ref) (optional column)
- Bukti (badge): Ada / Belum
- Aksi: Lihat Detail

> Catatan UX: untuk mobile, table berubah jadi **card list** per transaksi.

### 4.5 Detail Drawer / Modal (wajib)
Saat klik satu transaksi, tampil drawer berisi:
- Ringkasan transaksi (tanggal, jenis, nominal)
- Sumber data:
  - jika Donasi: donor, campaign, metode, status, invoice download
  - jika Disbursement: payee, kategori pengeluaran, approval, bukti transfer
- Informasi rekening:
  - dari akun mana (Bank Utama/Kas)
  - ke mana (nama penerima + rekening jika ada)
- Bukti:
  - link file (PDF/jpg) dari Media Library
- Audit trail:
  - dibuat oleh siapa
  - disetujui oleh siapa
  - dibayar oleh siapa

### 4.6 Export (wajib)
- Export CSV (periode + filter yang aktif)
- Export PDF ringkas (opsional)

---

## 5) Cara Mengetahui Mutasi Bank dari Laman Ini

### 5.0 Prinsip Data Rekening (WAJIB DIPAHAMI)
- Sistem **TIDAK membuat ulang data rekening bank** di modul laporan.
- Semua informasi rekening **mengikuti data yang sudah ada** di modul **Payment Method → Bank Transfer**.
- Laporan Mutasi Kas **hanya membaca & mereferensikan** data tersebut secara dinamis.
- Jika admin menambah/mengubah rekening bank di Payment Method, maka:
  - otomatis muncul di filter akun (Kas/Bank)
  - otomatis digunakan di laporan mutasi

> Dengan prinsip ini, **tidak ada duplikasi data rekening**, dan laporan selalu konsisten dengan konfigurasi payment.

### 5.1 Mutasi “berdasarkan sistem”
Laman ini menunjukkan mutasi berdasarkan transaksi yang tercatat dan diposting ke ledger:
- Donasi sukses → Kas Masuk
- Disbursement paid → Kas Keluar

Setiap baris mutasi selalu memiliki referensi:
- `paymentMethodId` (untuk donasi masuk)
- `bankAccountId` (untuk rekening kas/bank yang dipakai)

### 5.2 Rekonsiliasi dengan Mutasi Bank asli (recommended)
Agar bisa cocok dengan rekening bank asli:
- tambahkan fitur **Bank Reconciliation** (fase berikutnya)

Minimum fitur rekonsiliasi:
- Import CSV mutasi bank (format BCA/BRI/Mandiri)
- Matching otomatis berdasarkan:
  - tanggal
  - amount
  - reference / last digits rekening

Status rekonsiliasi per transaksi:
- Matched (cocok)
- Unmatched (belum ada di sistem)
- Mismatch (beda nominal)

Output rekonsiliasi:
- transaksi bank yang belum tercatat (perlu input manual)
- transaksi sistem yang belum muncul di bank (pending/settlement)

---

## 6) Istilah Teknis yang Simple (Glossary)

- **Kas Masuk**: uang bertambah di rekening/kas
- **Kas Keluar**: uang berkurang di rekening/kas
- **Saldo Awal**: saldo sebelum periode filter
- **Saldo Akhir**: saldo setelah periode filter
- **Referensi**: nomor transfer / kode payment
- **Bukti**: file transfer/kwitansi
- **Rekonsiliasi**: mencocokkan data sistem dengan mutasi bank asli

---

## 7) UX Standard (Yang Wajib Dipenuhi)

- Default tampil data **sukses/paid** agar angka tidak menipu
- Angka selalu format IDR + pemisah ribuan
- Chip warna untuk jenis transaksi (tanpa hardcode warna di dokumen, cukup konsep)
- Table responsif: desktop = table, mobile = cards
- Detail transaksi tampil di drawer (tidak pindah halaman)
- Bukti mudah diakses (1 klik)
- Export mengikuti filter aktif

---

## 8) Acceptance Checklist (QA)

- Saldo Akhir = Saldo Awal + Total Masuk - Total Keluar
- Setiap row bisa dibuka detailnya
- Setiap transaksi keluar punya payee + bukti (untuk status paid)
- Donasi sukses punya invoice link
- Filter tanggal & akun mempengaruhi kartu ringkasan & tabel
- Export sesuai filter

