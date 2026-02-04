# Bantuanku — Blueprint Ledger & Disbursements

> Benchmark utama: **Ledger & laporan keuangan Toko Ambu**. Dokumen ini berdiri sendiri dan fokus khusus pada sistem keuangan (uang masuk, uang keluar, invoice, nota, audit).

---

## 1) Tujuan & Filosofi

Blueprint ini memastikan Bantuanku memiliki **laporan keuangan minimal akuntabel**, mampu menjawab:
- uang datang dari mana
- masuk lewat apa
- keluar untuk apa
- dikirim ke siapa
- kapan transaksi terjadi
- berapa nominalnya
- apa buktinya

Semua transaksi **wajib tercatat**, bisa ditelusuri, dan siap diaudit.

---

## 2) Prinsip Inti (Non‑Negotiable)

- **Single Source of Truth** — tidak ada transaksi di luar sistem
- **Double‑Entry Ledger** — debit = kredit
- **Traceability (6W + 1H)** pada setiap transaksi
- **Unified Donation Table** — donasi user & admin manual di tabel yang sama
- **Immutable Invoice** — invoice read‑only
- **Evidence‑First Disbursement** — uang keluar wajib bukti
- **Approval Flow** untuk setiap pengeluaran

---

## 3) Chart of Accounts (COA)

### 3.1 Tabel `LedgerAccount`

Kolom | Tipe | Keterangan
---|---|---
id | TEXT | PK UUID
code | TEXT | UNIQUE (contoh: 1010)
name | TEXT | nama akun
category | TEXT | asset / liability / income / expense
normalSide | TEXT | debit / credit
isActive | BOOLEAN | default true
createdAt | TIMESTAMP(3) | default now
updatedAt | TIMESTAMP(3) | not null

### 3.2 COA Minimal (Starter Pack)

**Asset**
- 1010 Kas
- 1020 Bank Utama

**Liability (Titipan Dana)**
- 2010 Dana Donasi Belum Disalurkan
- 2020 Dana Wakaf Belum Disalurkan
- 2030 Dana Sedekah Belum Disalurkan

**Income (opsional)**
- 4010 Pendapatan Donasi

**Expense**
- 5010 Beban Penyaluran Program
- 5020 Beban Operasional
- 5030 Beban Gaji
- 5040 Beban Administrasi

> Disarankan memakai **model Liability (titipan)** agar saldo dana publik transparan.

---

## 4) Uang Masuk — Donations

### 4.1 Tabel `Donation` (Single Table)

Kolom | Tipe | Keterangan
---|---|---
id | TEXT | PK UUID
campaignId | TEXT | FK Campaign
userId | TEXT | nullable (guest / admin)
source | TEXT | user / admin
amount | BIGINT | nominal
paymentMethod | TEXT | cash / transfer / ewallet / va
paymentStatus | TEXT | pending / success / failed
reference | TEXT | nomor transfer / keterangan
note | TEXT | catatan
paidAt | TIMESTAMP(3) | nullable
createdAt | TIMESTAMP(3) | default now
updatedAt | TIMESTAMP(3) | not null

### 4.2 Posting Ledger Donasi

**Model Titipan (recommended)**
- Debit: Bank / Kas
- Credit: Dana (Liability sesuai kategori)

**Model Revenue langsung (opsional)**
- Debit: Bank / Kas
- Credit: Pendapatan Donasi

---

## 5) Invoice Donasi

### 5.1 Prinsip
- 1 Donasi = 1 Invoice
- Otomatis saat donasi `success`
- Tidak bisa diedit manual

### 5.2 Tabel `Invoice`

Kolom | Tipe | Keterangan
---|---|---
id | TEXT | PK UUID
invoiceNumber | TEXT | UNIQUE (INV‑YYYYMM‑XXXX)
donationId | TEXT | FK Donation
issuedAt | TIMESTAMP(3) | tanggal
issuedBy | TEXT | system / admin
totalAmount | BIGINT | nominal
currency | TEXT | IDR
payerName | TEXT | nama donatur
payerEmail | TEXT | email
status | TEXT | issued / void
pdfUrl | TEXT | lokasi PDF
createdAt | TIMESTAMP(3) | default now

---

## 6) Uang Keluar — Disbursements

### 6.1 Tabel `ExpenseCategory` (Custom)

Kolom | Tipe | Keterangan
---|---|---
id | TEXT | PK UUID
slug | TEXT | unique
name | TEXT | contoh: Gaji, Operasional, Penyaluran
isActive | BOOLEAN | default true

### 6.2 Tabel `Payee`

Kolom | Tipe | Keterangan
---|---|---
id | TEXT | PK UUID
type | TEXT | person / org / vendor
name | TEXT | NOT NULL
bankName | TEXT | nullable
bankAccount | TEXT | nullable
bankAccountName | TEXT | nullable

### 6.3 Tabel `Disbursement`

Kolom | Tipe | Keterangan
---|---|---
id | TEXT | PK UUID
number | TEXT | UNIQUE (DS‑YYYYMM‑XXXX)
type | TEXT | program / operational / payroll / purchase
campaignId | TEXT | nullable
expenseCategoryId | TEXT | FK ExpenseCategory
payeeId | TEXT | FK Payee
amount | BIGINT | nominal
method | TEXT | bank_transfer / cash
status | TEXT | draft / submitted / approved / paid / rejected
paidAt | TIMESTAMP(3) | nullable
createdBy | TEXT | userId
approvedBy | TEXT | userId nullable
createdAt | TIMESTAMP(3) | default now
updatedAt | TIMESTAMP(3) | not null

### 6.4 Bukti Pengeluaran

**Table: `DisbursementEvidence`**
- disbursementId
- mediaId (PDF/foto)
- type (receipt / transfer_proof)

Minimal 1 bukti wajib sebelum `paid`.

### 6.5 Posting Ledger Disbursement

**Penyaluran Program (Titipan)**
- Debit: Dana Belum Disalurkan
- Credit: Bank / Kas

**Operasional / Gaji / Pembelian**
- Debit: Beban sesuai kategori
- Credit: Bank / Kas

---

## 7) Workflow Disbursement

1. Draft — input data + upload bukti awal
2. Submitted — data terkunci
3. Approved — oleh Admin Finance / Super Admin
4. Paid — upload bukti final + posting ledger
5. Rejected — wajib alasan

---

## 8) Laporan Keuangan Minimal

Wajib tersedia:
- Mutasi Kas / Bank
- Rekap Donasi (harian & bulanan)
- Rekap Donasi per Campaign
- Rekap Pengeluaran per Kategori
- Rekap Penyaluran per Campaign
- Rekap Invoice
- Audit Trail Transaksi

Export:
- CSV (internal)
- PDF ringkas (publik / auditor)

---

## 9) Kesimpulan

Blueprint ini menjadikan **ledger Toko Ambu sebagai fondasi** sistem keuangan Bantuanku. Dengan struktur ini:
- uang masuk & keluar jelas
- bukti lengkap
- laporan rapi
- siap audit sejak hari pertama

