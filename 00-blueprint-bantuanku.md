# Bantuanku — Struktur Lengkap (Full Blueprint)

> Target: aplikasi donasi (front-end domain utama) + admin panel (subdomain admin.domain) dengan backend NodeJS yang compatible Cloudflare Workers. UI modern, responsive, Tailwind + SCSS, Heroicons, font Poppins (heading) + Inter (body).

---

## 0) Arsitektur & Domain

### 0.1 Domain

* **Front-end (public):** `https://domain.com`
* **Admin:** `https://admin.domain.com`
* **API (disarankan terpisah):** `https://api.domain.com`

  * Alternatif: API di subpath `https://domain.com/api` (tapi karena kamu minta URL admin vs user jelas dan gak tabrakan, paling aman tetap subdomain).

### 0.2 Routing prinsip anti-tabrakan

* Public routes selalu prefix **tanpa** `/admin`.
* Admin routes **selalu** prefix `/admin` di app admin, tapi host-nya sudah admin subdomain.
* API routes **selalu** prefix `/v1`.

### 0.3 Stack (Cloudflare-friendly)

* **Backend:** NodeJS runtime di **Cloudflare Workers**

  * Framework kandidat: Hono / itty-router / Workerd-compatible.
* **Database:** Postgres (Neon/Supabase) atau Cloudflare D1 (kalau mau SQLite). Karena butuh ledger audit + transaksi, **Postgres** recommended.
* **Auth:** JWT + refresh token (httpOnly cookie) + RBAC.
* **Storage Image:** Cloudflare R2 (campaign images, proof docs, report pdf).
* **Queue/Jobs:** Cloudflare Queues / Cron Triggers (rekonsiliasi payment, generate laporan periodik).

---

## 1) ERD Ringkas (konsep)

Entitas utama:

* Users, Roles, Permissions
* Campaigns, Categories
* Donations, PaymentIntents/Payments
* LedgerAccounts, LedgerEntries, LedgerLines (double-entry)
* Disbursements (uang keluar)
* Reports (monthly/annual), AuditLogs
* ZakatCalculators (config), ZakatCalculationLogs
* Pages (halaman umum), Settings

---

## 2) Database: Campaign (Existing Table)

### 2.1 Tabel `Campaign`

| Kolom       | Tipe         | Keterangan                      |
| ----------- | ------------ | ------------------------------- |
| id          | TEXT         | Primary Key (UUID)              |
| title       | TEXT         | NOT NULL                        |
| description | TEXT         | NOT NULL                        |
| imageUrl    | TEXT         | NOT NULL                        |
| collected   | INTEGER      | NOT NULL (jumlah terkumpul)     |
| goal        | INTEGER      | NOT NULL (target donasi)        |
| category    | TEXT         | NOT NULL (donasi/wakaf/sedekah) |
| pillar      | TEXT         | Default: 'Kemanusiaan'          |
| createdAt   | TIMESTAMP(3) | Default: CURRENT_TIMESTAMP      |
| updatedAt   | TIMESTAMP(3) | NOT NULL                        |

### 2.2 Catatan perbaikan kompatibilitas (tanpa mengubah inti tabel)

* `category` sebaiknya **mengacu ke Category** lewat `categoryId` supaya konsisten. Karena tabel sudah ada, kita buat bridging:

  * Opsi A: tetap pakai `category` (string) untuk MVP.
  * Opsi B: tambah kolom `categoryId` di fase berikutnya + migrasi.
* `collected` sebaiknya dihitung dari transaksi sukses, tapi karena sudah ada kolom, kita jadikan **materialized value**:

  * Update otomatis lewat trigger/job setelah payment sukses.

---

## 3) Category Campaign

### 3.1 Tabel `Category`

| Kolom     | Tipe         | Keterangan                                               |
| --------- | ------------ | -------------------------------------------------------- |
| id        | TEXT         | PK UUID                                                  |
| slug      | TEXT         | UNIQUE, NOT NULL (donasi, wakaf, sedekah, zakat, kurban) |
| name      | TEXT         | NOT NULL                                                 |
| sortOrder | INT          | default 0                                                |
| isActive  | BOOLEAN      | default true                                             |
| createdAt | TIMESTAMP(3) | default now                                              |
| updatedAt | TIMESTAMP(3) | not null                                                 |

### 3.2 Relasi

* Campaign -> Category:

  * MVP: `Campaign.category` (string) harus match `Category.slug`.
  * Next: `Campaign.categoryId` FK.

---

## 4) Zakat Calculator (berbagai macam)

### 4.1 Tipe kalkulator yang disiapkan

* Zakat Penghasilan
* Zakat Maal (harta simpanan)
* Zakat Emas/Perak
* Zakat Perdagangan
* Zakat Fitrah
* Fidyah

### 4.2 Tabel `ZakatCalculatorConfig`

| Kolom      | Tipe         | Keterangan                                         |
| ---------- | ------------ | -------------------------------------------------- |
| id         | TEXT         | PK UUID                                            |
| type       | TEXT         | UNIQUE (income, maal, gold, trade, fitrah, fidyah) |
| name       | TEXT         | NOT NULL                                           |
| nisabValue | BIGINT       | nilai nisab (rupiah)                               |
| nisabUnit  | TEXT         | rupiah/gram_gold/etc                               |
| rateBps    | INT          | rate basis point (mis: 250 = 2.5%)                 |
| notes      | TEXT         | penjelasan                                         |
| isActive   | BOOLEAN      | default true                                       |
| updatedAt  | TIMESTAMP(3) | not null                                           |

### 4.3 Tabel `ZakatCalculationLog`

| Kolom          | Tipe         | Keterangan             |
| -------------- | ------------ | ---------------------- |
| id             | TEXT         | PK UUID                |
| userId         | TEXT         | nullable (boleh guest) |
| calculatorType | TEXT         | FK by type             |
| inputJson      | JSON         | input detail           |
| resultAmount   | BIGINT       | hasil perhitungan      |
| createdAt      | TIMESTAMP(3) | default now            |

---

## 5) Halaman Umum (Pages)

### 5.1 Laman publik minimal

* Tentang Kami
* Program & Transparansi (Laporan)
* FAQ
* Kontak
* Kebijakan Privasi
* Syarat & Ketentuan
* Pengaduan

### 5.2 Tabel `Page`

| Kolom       | Tipe         | Keterangan         |
| ----------- | ------------ | ------------------ |
| id          | TEXT         | PK UUID            |
| slug        | TEXT         | UNIQUE             |
| title       | TEXT         | NOT NULL           |
| contentHtml | TEXT         | NOT NULL (atau MD) |
| isPublished | BOOLEAN      | default true       |
| updatedAt   | TIMESTAMP(3) | not null           |

---

## 6) Landing Page (Marketing)

### 6.1 Komponen landing

* Hero + CTA Donasi
* Kategori cepat (chips)
* Campaign urgent / trending
* Statistik (total donasi, transaksi, penyaluran)
* Trust badges (audit, legalitas, mitra)
* Testimoni
* Footer lengkap

### 6.2 Route publik

* `/` landing
* `/campaigns` listing
* `/campaigns/:slugOrId` detail
* `/zakat` landing kalkulator

---

## 7) Settings Page (Admin)

### 7.1 Area setting

* Identitas brand (nama, logo, warna)
* Domain & SEO meta
* Payment methods toggle
* Nisab zakat (update berkala)
* Rekening penyaluran
* Template receipt/invoice
* Roles & permissions

### 7.2 Tabel `Setting`

| Kolom     | Tipe         | Keterangan  |
| --------- | ------------ | ----------- |
| key       | TEXT         | PK (string) |
| valueJson | JSON         | value       |
| updatedAt | TIMESTAMP(3) | not null    |

---

## 8) User Hierarchy (RBAC)

Role:

* **Super Admin**: all access
* **Admin Finance**: lihat sirkulasi keuangan + laporan + ledger, approve disbursement
* **Admin Campaign**: CRUD campaign, upload update, moderasi konten
* **User/Donatur**: donasi, riwayat donasi, profile

### 8.1 Tabel `User`

| Kolom        | Tipe         | Keterangan                    |
| ------------ | ------------ | ----------------------------- |
| id           | TEXT         | PK UUID                       |
| email        | TEXT         | UNIQUE                        |
| passwordHash | TEXT         | nullable (kalau social login) |
| name         | TEXT         | NOT NULL                      |
| phone        | TEXT         | nullable                      |
| isActive     | BOOLEAN      | default true                  |
| createdAt    | TIMESTAMP(3) | default now                   |
| updatedAt    | TIMESTAMP(3) | not null                      |

### 8.2 Tabel `Role`

* id, name, slug

### 8.3 Tabel `UserRole`

* userId, roleId

### 8.4 Tabel `Permission` (optional)

* key, description

### 8.5 Tabel `RolePermission` (optional)

* roleId, permissionKey

---

## 9) Front-end vs Back-end (jelas alamatnya)

### 9.1 Apps

* **Public Web (domain):** UI donatur
* **Admin Web (admin subdomain):** dashboard admin
* **API (api subdomain):** layanan data + auth + payment

### 9.2 URL rules

* Public: `/campaigns`, `/donate/:campaignId`, `/zakat/*`, `/pages/:slug`
* Admin: `/admin/login`, `/admin/dashboard`, `/admin/campaigns`, `/admin/finance`, `/admin/settings`
* API: `/v1/auth/*`, `/v1/campaigns/*`, `/v1/donations/*`, `/v1/finance/*`

---

## 10) Routes Detail (Anti Tabarakan)

### 10.1 Public Web (domain.com)

* `GET /` Landing
* `GET /campaigns` Listing
* `GET /campaigns/:id` Detail
* `POST /donate/:campaignId` start donate (front triggers API)
* `GET /donation/:donationId/status` status
* `GET /zakat` zakat landing
* `GET /zakat/:type` calculator detail
* `GET /p/:slug` halaman umum
* `GET /account/login`
* `GET /account/donations`

### 10.2 Admin Web (admin.domain.com)

* `GET /admin/login`
* `GET /admin/dashboard`
* `GET /admin/campaigns` + CRUD
* `GET /admin/campaigns/:id/updates`
* `GET /admin/finance/ledger`
* `GET /admin/finance/disbursements`
* `GET /admin/reports`
* `GET /admin/pages`
* `GET /admin/settings`

### 10.3 API (api.domain.com)

* `POST /v1/auth/login`
* `POST /v1/auth/refresh`
* `POST /v1/auth/logout`
* `GET /v1/campaigns`
* `GET /v1/campaigns/:id`
* `POST /v1/admin/campaigns` (admin only)
* `PATCH /v1/admin/campaigns/:id`
* `DELETE /v1/admin/campaigns/:id`
* `POST /v1/donations/intent` (create payment intent)
* `POST /v1/payments/webhook` (provider callback)
* `GET /v1/donations/:id`
* `GET /v1/admin/finance/ledger`
* `POST /v1/admin/finance/disbursements`

---

## 11) Laporan Keuangan (teraudit) — Model “Toko Ambu style”

### 11.1 Prinsip

* Semua uang masuk/keluar harus masuk **double-entry ledger**.
* Tidak boleh ada transaksi yang hanya “angka total” tanpa jejak.
* **Donasi user dan donasi manual admin WAJIB masuk ke tabel yang sama** agar laporan konsisten.
* Laporan periodik dihasilkan dari ledger + donations (single source of truth).

### 11.2 Tabel inti Ledger

#### `LedgerAccount`

| Kolom      | Tipe    | Keterangan                                         |
| ---------- | ------- | -------------------------------------------------- |
| id         | TEXT    | PK UUID                                            |
| code       | TEXT    | UNIQUE (mis: 1010)                                 |
| name       | TEXT    | (Cash, Bank, Donation Revenue, Donation Liability) |
| normalSide | TEXT    | debit/credit                                       |
| isActive   | BOOLEAN | default true                                       |

#### `LedgerEntry` (header)

| Kolom     | Tipe         | Keterangan                           |
| --------- | ------------ | ------------------------------------ |
| id        | TEXT         | PK UUID                              |
| refType   | TEXT         | donation/payment/disbursement/manual |
| refId     | TEXT         | id transaksi terkait                 |
| postedAt  | TIMESTAMP(3) | tanggal posting                      |
| memo      | TEXT         | catatan                              |
| createdBy | TEXT         | userId                               |

#### `LedgerLine` (detail)

| Kolom     | Tipe   | Keterangan       |
| --------- | ------ | ---------------- |
| id        | TEXT   | PK UUID          |
| entryId   | TEXT   | FK LedgerEntry   |
| accountId | TEXT   | FK LedgerAccount |
| debit     | BIGINT | default 0        |
| credit    | BIGINT | default 0        |

### 11.3 Tabel Donasi (Single Table)

#### `Donation`

| Kolom         | Tipe         | Keterangan                          |
| ------------- | ------------ | ----------------------------------- |
| id            | TEXT         | PK UUID                             |
| campaignId    | TEXT         | FK Campaign                         |
| userId        | TEXT         | nullable (guest / admin entry)      |
| source        | TEXT         | user / admin                        |
| amount        | BIGINT       | nominal donasi                      |
| paymentMethod | TEXT         | transfer / cash / ewallet / va      |
| paymentStatus | TEXT         | pending / success / failed          |
| reference     | TEXT         | nomor referensi / keterangan manual |
| note          | TEXT         | catatan tambahan                    |
| createdAt     | TIMESTAMP(3) | default now                         |
| updatedAt     | TIMESTAMP(3) | not null                            |

> **Catatan penting:**
>
> * Donasi manual admin **menggunakan tabel `Donation` yang sama** dengan donasi user.
> * Perbedaan hanya di kolom `source` dan `paymentMethod`.
> * Ini membuat laporan keuangan dan rekap campaign **100% konsisten**.

### 11.4 Flow Donasi Manual oleh Admin

1. Admin membuka **Admin → Donasi → Tambah Donasi Manual**
2. Form **SAMA** dengan form donasi user:

   * Pilih campaign
   * Isi nominal
   * Pilih metode (cash / transfer / dll)
   * Isi nama donatur (opsional)
   * Catatan
3. Submit → simpan ke tabel `Donation` (source=admin)
4. Sistem otomatis membuat **LedgerEntry**:

   * Debit: Cash / Bank
   * Credit: Donation Revenue atau Donation Liability
5. `Campaign.collected` ikut terupdate

### 11.5 Invoice Donasi (Resmi & Teraudit)

### 11.5.1 Prinsip Invoice

* **Setiap donasi yang berstatus `success` WAJIB memiliki invoice**.
* Invoice bersifat **read-only**, tidak boleh diedit manual.
* Invoice berlaku untuk:

  * Donasi user (online)
  * Donasi manual oleh admin
* Invoice menjadi **dokumen resmi** untuk:

  * Donatur
  * Arsip internal
  * Audit keuangan

### 11.5.2 Tabel `Invoice`

| Kolom         | Tipe         | Keterangan                       |
| ------------- | ------------ | -------------------------------- |
| id            | TEXT         | PK UUID                          |
| invoiceNumber | TEXT         | UNIQUE (format: INV-YYYYMM-XXXX) |
| donationId    | TEXT         | FK Donation                      |
| issuedAt      | TIMESTAMP(3) | tanggal invoice                  |
| issuedBy      | TEXT         | system / adminUserId             |
| totalAmount   | BIGINT       | total donasi                     |
| currency      | TEXT         | IDR                              |
| payerName     | TEXT         | nama donatur                     |
| payerEmail    | TEXT         | email donatur                    |
| status        | TEXT         | issued / void                    |
| pdfUrl        | TEXT         | lokasi file PDF di Media Library |
| createdAt     | TIMESTAMP(3) | default now                      |

### 11.5.3 Relasi Data

* **Donation (1) → (1) Invoice**
* Invoice dibuat otomatis ketika:

  * Payment user `success`
  * Admin submit donasi manual (langsung `success`)

### 11.5.4 Flow Pembuatan Invoice

1. Donasi berstatus `success`
2. Sistem generate `invoiceNumber`
3. Generate **Invoice PDF** (template resmi Bantuanku)
4. Simpan PDF ke **Media Library** (`/reports/invoices/...`)
5. Simpan metadata ke tabel `Invoice`
6. Kirim invoice ke email donatur (jika ada)

### 11.5.5 Invoice Numbering (Standar Akuntansi)

Contoh:

* `INV-202601-0001`
* `INV-202601-0002`

Reset per bulan, increment otomatis.

### 11.5.6 Akses Invoice

**User / Donatur**

* Dashboard → Riwayat Donasi → Download Invoice

**Admin**

* Admin → Donasi → Detail Donasi → Lihat Invoice
* Admin → Finance → Invoice List

### 11.5.7 Laporan yang wajib ada

* Rekap pemasukan (gabungan user + admin manual)
* Rekap per campaign
* Rekap per metode pembayaran
* Rekap invoice (issued / void)
* Mutasi rekening (Cash/Bank)
* Audit trail: siapa input, kapan, dan sumbernya
