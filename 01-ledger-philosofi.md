# Bantuanku — Panduan AI: Filosofi Akuntansi (Donasi & Penyaluran)

> Dokumen ini adalah **instruction set** untuk AI/developer agar implementasi keuangan Bantuanku **konsisten, akuntabel, dan siap audit**. Fokus awal: **Donasi (uang masuk) + Penyaluran (uang keluar)**.

---

## 1) Tujuan Sistem

Sistem keuangan Bantuanku harus bisa menjawab dengan jelas:
- uang datang dari mana
- masuk lewat apa
- kapan masuk
- berapa nominalnya
- disalurkan ke siapa
- kapan disalurkan
- bukti transaksi apa

Setiap transaksi harus **traceable** dan bisa ditelusuri kembali ke bukti dan aktor (user/admin).

---

## 2) Definisi Kunci (Wajib Dipahami)

### 2.1 Donasi = Dana Titipan (Liability)
- Donasi **bukan** pendapatan milik Bantuanku.
- Donasi adalah **uang titipan** yang harus disalurkan.
- Karena itu, donasi harus dicatat sebagai **LIABILITY**.

### 2.2 Penyaluran = Menunaikan Titipan (Reduce Liability)
- Penyaluran **bukan** expense pada fase awal.
- Penyaluran adalah **pengurangan kewajiban** (liability) karena titipan sudah disalurkan.

### 2.3 Cash Flow dilihat dari Kas/Bank
- Uang masuk: **Kas/Bank bertambah → Debit Kas/Bank**.
- Uang keluar: **Kas/Bank berkurang → Credit Kas/Bank**.

---

## 3) Aturan Akuntansi Inti (Non-Negotiable)

1) **Single Source of Truth**
- Semua donasi sukses dan semua penyaluran paid **wajib** memposting ledger.
- Tidak boleh ada transaksi uang masuk/keluar yang tidak punya jejak di ledger.

2) **Double-Entry Ledger**
- Setiap posting harus balance:
  - total debit = total credit

3) **Tipe akun dan Normal Balance tidak boleh kontradiksi**
- Asset: normal balance = Debit
- Liability: normal balance = Credit
- Income: normal balance = Credit
- Expense: normal balance = Debit

4) **MVP Donasi & Penyaluran menggunakan model Liability (titipan)**
- Tidak menggunakan Income/Expense untuk penyaluran di tahap awal.

---

## 4) Chart of Accounts Minimum (Wajib Ada)

AI harus memastikan 3 akun ini tersedia (seed / migration):

### 4.1 Asset
- `Kas` (Asset, normal Debit)
- `Bank Utama` (Asset, normal Debit)

### 4.2 Liability
- `Dana Donasi Belum Disalurkan` (Liability, normal Credit)

> Catatan: bila ada kategori donasi (wakaf/sedekah), boleh dibuat 1 liability per kategori. Untuk MVP boleh 1 akun dulu.

---

## 5) Skema Data Minimal (Keuangan)

### 5.1 `Donation` (uang masuk)
- Sumber bisa user/admin (manual)
- Status: pending/success/failed
- Posting ledger hanya saat `success`

### 5.2 `Disbursement` (uang keluar / penyaluran)
- Wajib punya payee/penerima
- Wajib punya evidence/bukti sebelum paid
- Posting ledger hanya saat status `paid`

### 5.3 Ledger
- `LedgerEntry` (header)
- `LedgerLine` (detail)

---

## 6) Jurnal Wajib (Template Posting)

### 6.1 Donasi Masuk (Donor bayar → success)
**RULE:** saat donasi sukses, sistem harus posting:

- Debit  : `Kas/Bank`
- Credit : `Dana Donasi Belum Disalurkan`

Contoh:
- Donasi 1.000.000 masuk ke Bank

Debit  Bank Utama                       1.000.000
Credit Dana Donasi Belum Disalurkan     1.000.000

### 6.2 Penyaluran (Disbursement paid)
**RULE:** saat penyaluran paid, sistem harus posting:

- Debit  : `Dana Donasi Belum Disalurkan`
- Credit : `Kas/Bank`

Contoh:
- Penyaluran 600.000 dibayar dari Bank

Debit  Dana Donasi Belum Disalurkan       600.000
Credit Bank Utama                          600.000

---

## 7) Rule Validasi (Agar Program Tidak Salah)

### 7.1 Validasi Posting Ledger
- Tidak boleh membuat `LedgerEntry` jika total debit != total credit.
- Tidak boleh posting untuk donasi selain status `success`.
- Tidak boleh posting untuk disbursement selain status `paid`.

### 7.2 Validasi Akun
- Akun dengan `type=Expense` **wajib** `normalBalance=Debit`.
- Akun dengan `type=Liability` **wajib** `normalBalance=Credit`.
- Jika user/admin salah set, sistem harus menolak (error jelas).

### 7.3 Validasi Disbursement (evidence-first)
- Disbursement tidak boleh `paid` jika:
  - belum ada `payeeId`
  - belum ada minimal 1 `evidence`
  - belum ada metode bayar

---

## 8) Laporan Minimal (MVP)

AI harus memastikan sistem bisa menghasilkan:

1) **Saldo Dana Titipan**
- saldo `Dana Donasi Belum Disalurkan` = total donasi sukses - total penyaluran paid

2) **Mutasi Kas/Bank**
- rekap debit/credit akun Kas/Bank per periode

3) **Rekap Donasi**
- per campaign, per metode, per waktu

4) **Rekap Penyaluran**
- per payee/penerima, per waktu, per campaign

---

## 9) Catatan Implementasi (NodeJS + Workers)

- Gunakan transaksi DB (Postgres) saat:
  - update status donation → success + posting ledger
  - update disbursement → paid + posting ledger

- `Campaign.collected` harus menjadi materialized value:
  - dihitung dari donasi sukses (job/trigger)
  - bukan angka manual

---

## 10) Golden Rules (Cheat Sheet)

- **UANG MASUK  → Kas/Bank DEBIT**
- **UANG KELUAR → Kas/Bank CREDIT**
- **DONASI = TITIPAN (LIABILITY)**
- **PENYALURAN = REDUCE LIABILITY**
- **LEDGER HARUS BALANCE**
- **DISBURSEMENT WAKTU PAID = WAJIB ADA BUKTI**
