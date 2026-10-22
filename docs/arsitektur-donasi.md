# Arsitektur Donasi & Kampanye

> Terakhir di-sync: 2026-07-02

---

## Overview

Modul donasi mencakup: kampanye (program), keranjang donasi, checkout, dan pembayaran donatur. Donasi masuk ke sistem universal `transactions`.

---

## Schema Database

### `campaigns`
```
id              text PK (createId)
categoryId      text FK categories.id (SET NULL)
category        text NOT NULL           -- denormalized untuk display
title           text NOT NULL
slug            text UNIQUE NOT NULL
description     text NOT NULL
content         text                    -- HTML konten lengkap
imageUrl        text NOT NULL
images          jsonb                   -- array URL gambar tambahan
videoUrl        text
goal            bigint NOT NULL         -- target dana (rupiah)
collected       bigint DEFAULT 0        -- total terkumpul (denormalized)
donorCount      integer DEFAULT 0       -- jumlah donatur (denormalized)
pillar          text DEFAULT "Kemanusiaan"  -- Kemanusiaan | Wakaf | dll.
startDate       timestamptz
endDate         timestamptz
isFeatured      boolean DEFAULT false
isUrgent        boolean DEFAULT false
status          text DEFAULT "draft"    -- draft | active | closed | completed
createdBy       text FK users.id
coordinatorId   text FK employees.id
mitraId         text FK mitra.id (SET NULL)
metaTitle, metaDescription, ...         -- SEO fields
```

### `campaign_updates`
```
id          text PK
campaignId  text FK campaigns.id (CASCADE)
title       text NOT NULL
content     text NOT NULL
images      jsonb
createdBy   text FK users.id
createdAt   timestamptz
```

---

## API Endpoints

### Public (`/v1/campaigns`)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/campaigns` | List kampanye. Query: `page`, `limit`, `category`, `search`, `status` |
| `GET` | `/campaigns/featured` | Kampanye featured. Query: `limit` |
| `GET` | `/campaigns/urgent` | Kampanye urgent |
| `GET` | `/campaigns/:slug` | Detail campaign by slug |
| `GET` | `/campaigns/:id/updates` | Update/berita kampanye |

Response di-enrich dengan `categoryName` dari tabel `categories`.

### Admin (`/v1/admin/campaigns`)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/admin/campaigns` | List semua (termasuk draft), dipaginasi di server. Query: `page` (min 1), `limit` (default 10, dibatasi 1–1000), `status`, `categoryId`, `search` (judul atau deskripsi, tanpa membedakan huruf besar/kecil, wildcard `%`/`_` di-escape). Respons memuat `pagination {page, limit, total, totalPages}`. Filter coordinator/mitra digabung AND dengan filter lain |
| `POST` | `/admin/campaigns` | Buat kampanye baru |
| `PUT`/`PATCH` | `/admin/campaigns/:id` | Update kampanye. `slug` bisa diubah manual lewat body — **tidak** auto-regenerate mengikuti `title` (lihat Catatan Penting #6) |
| `DELETE` | `/admin/campaigns/:id` | Hapus kampanye |
| `POST` | `/admin/campaigns/:id/updates` | Tambah update berita |
| `PUT` | `/admin/campaigns/:id/toggle-featured` | Toggle featured |
| `PUT` | `/admin/campaigns/:id/toggle-urgent` | Toggle urgent |

Guard: mitra hanya bisa akses campaign miliknya (cek `mitraId`).

---

## Cart (`CartContext`)

File: `apps/web/src/contexts/CartContext.tsx`
Storage: `localStorage["bantuanku_cart"]` (persist antar session)

### CartItem interface
```ts
interface CartItem {
  cartItemId: string;       // "campaign-{id}" | "qurban-{packagePeriodId}" | "zakat-{type}"
  itemType: 'campaign' | 'qurban' | 'zakat';
  campaignId: string;
  slug: string;
  title: string;
  amount: number;
  category?: string;
  pillar?: string;
  programType: string;
  organizationName?: string;
  qurbanData?: { ... };     // Isi saat itemType = 'qurban'
  zakatData?: { ... };      // Isi saat itemType = 'zakat'
  fidyahData?: { ... };     // personCount, dayCount (fidyah)
}
```

### CartContext API
```ts
addToCart(item)             // upsert by cartItemId
removeFromCart(cartItemId)
updateCartItem(cartItemId, updates)
clearCart()
getCartTotal()              // sum of item.amount
getCartCount()
```

---

## Alur Donasi

```
User buka /program/[slug]
    │
    ├── GET /campaigns/:slug  →  detail campaign
    ├── User pilih nominal / isi nominal custom
    ├── addToCart({ itemType: "campaign", campaignId, amount, ... })
    │
    ▼
/keranjang-bantuan  (review cart)
    │
    ├── User cek items, pilih payment method
    ├── Untuk setiap item di cart → POST /v1/transactions (satu transaksi per item)
    │     body: {
    │       product_type: "campaign",
    │       product_id: campaignId,
    │       unit_price: amount,
    │       donor_name, donor_email, donor_phone,
    │       payment_method_id, is_anonymous,
    │       referred_by_fundraiser_code?
    │     }
    │
    └── Redirect ke halaman pembayaran / konfirmasi
```

**Multi-item cart = N transaksi terpisah** — tidak ada array `items[]` dalam satu request.

---

## Halaman Web

| Route | Fungsi |
|-------|--------|
| `/program` | List semua kampanye aktif |
| `/program/:slug` | Detail kampanye |
| `/program/pilar/:pilar` | Filter by pilar (Kemanusiaan, Wakaf, dll.) |
| `/program/kategori/:slug` | Filter by kategori |
| `/keranjang-bantuan` | Keranjang donasi |
| `/checkout` | Proses pembayaran |
| `/invoice/:transactionNumber` | Invoice donasi |

---

## Pilar Kampanye

Kolom `pillar` di tabel `campaigns`. Nilai adalah text bebas, tidak ada enum di DB.
Nilai yang dipakai saat ini: `Kemanusiaan`, `Wakaf`, `Zakat`, `Pendidikan`, dll.

Filter by pilar dilakukan di frontend (`/program/pilar/:pilar`) dengan query param ke API.
Halaman `/wakaf` juga filter campaign dengan `pillar = "Wakaf"` — bukan tabel terpisah.

---

## Revenue Share Campaign

Setiap donasi campaign yang lunas menghasilkan record `revenue_shares`:
- **Basis**: `totalAmount` (donasi penuh)
- **Amil**: default 20% (`amil_donation_percentage`)
- **Mitra**: `amil_mitra_donation_percentage` dipotong dari porsi amil, kalau campaign punya `mitraId`
- **Fundraiser**: `amil_fundraiser_percentage` dipotong dari porsi amil, kalau ada referral
- **Dikecualikan**: campaign dengan `pillar = "Wakaf"` atau `pillar = "Fidyah"` tidak mendapat revenue share

> Detail formula, kalkulasi, dan semua pihak penerima: lihat `arsitektur-revenue-share.md`.

---

## Catatan Penting

1. `collected` dan `donorCount` adalah **denormalized** — diupdate saat transaksi verified.
2. Mitra bisa punya campaign sendiri (`mitraId` filled) — akses via admin panel tapi dibatasi ke data miliknya.
3. Guest checkout diperbolehkan — `userId` dan `donaturId` nullable di `transactions`.
4. Referral fundraiser dikirim via body `referred_by_fundraiser_code`, diproses saat transaksi dibuat.
5. **Mengosongkan field nullable via edit form wajib kirim `null`, bukan omit key.** `PUT/PATCH /admin/campaigns/:id` hanya meng-update kolom yang keynya ada di body (`if (body.field !== undefined) updateData.field = ...`) — key yang di-set ke `undefined` di payload akan hilang saat `JSON.stringify` dan diam-diam gagal mengosongkan kolom. Field nullable (`videoUrl`, `content`, `startDate`, `endDate`) harus dikirim sebagai `null` saat dikosongkan. Field `imageUrl` dan `pillar` adalah `NOT NULL` di DB — jangan pernah kirim `null` untuk keduanya (frontend sengaja fallback ke `undefined`/skip agar nilai lama dipertahankan bila form tidak mengisi ulang).
6. **`slug` TIDAK auto-regenerate saat `title` diubah** — beda dengan `categories`/`pillars` yang regenerate slug otomatis setiap `name`/`title` berubah. Untuk campaign, keputusan desain: link yang sudah dibagikan (invoice, WA broadcast, share fundraiser) tidak boleh mendadak 404 hanya karena judul diedit. Admin bisa ubah slug secara manual lewat tombol "Ubah URL" di form edit (`apps/admin/src/components/CampaignForm.tsx`) — divalidasi format (`^[a-z0-9]+(-[a-z0-9]+)*$`) dan uniqueness (exclude diri sendiri) di `PUT/PATCH /admin/campaigns/:id`, return `409` jika slug sudah dipakai campaign lain. `activity_reports` mengikuti pola yang sama sejak 2026-09-22 (lihat `arsitektur-activity-reports.md`).
7. **`GET /campaigns/:idOrSlug` (publik) menolak campaign berstatus `draft`** sejak 2026-09-22 (404 "Campaign not found", sama seperti campaign yang benar-benar tidak ada — tidak membocorkan keberadaannya). Sebelum ini, draft campaign bisa dibuka siapa saja lewat URL/ID langsung (termasuk tombol donasi aktif) walau tidak muncul di `/campaigns` listing (default `status=active`). Status lain (`active`, `closed`, `completed`) tetap bisa diakses publik agar link lama tidak 404 saat campaign selesai. **Konsekuensi penting**: jika sebuah `activity_reports` row mereferensikan campaign yang kemudian di-set kembali ke `draft` (misalnya saat rename/reuse), laporan itu otomatis ikut tidak bisa diakses lewat tab "Kabar Terbaru" campaign tersebut (404) sampai campaign itu di-publish ulang — laporan tetap ada dan terlihat di arsip `/laporan`. Endpoint publik lain untuk campaign (`/:id/updates`, `/:id/donors`) **belum** diberi guard yang sama; dalam praktiknya tidak berdampak karena halaman depannya sudah 404 duluan, tapi API-nya sendiri masih bisa dipanggil langsung untuk draft campaign.
8. **Daftar campaign admin (`/dashboard/campaigns`) memaginasi di server** sejak 2026-10-23. Sebelumnya halaman memanggil `GET /admin/campaigns` tanpa parameter, API memakai `limit` default 10, lalu halaman memfilter dan memaginasi sendiri di browser — akibatnya hanya 10 campaign terbaru yang pernah tampil dan pencarian/filter tak menemukan campaign lama. Kini halaman mengirim `page`, `search` (debounce 400 ms), `categoryId`, `status` ke API dan memakai `pagination` dari respons dengan komponen `Pagination` yang sama seperti halaman lain. **Setiap pemanggil `/admin/campaigns` wajib sadar akan limit default 10**: dropdown memakai `limit` eksplisit (100–500); dropdown dengan lebih dari 100 campaign (donasi, ledger, disbursement) masih terpotong — gap, ganti ke pencarian server-side bila jumlah campaign mendekati itu.

---

## Perbaikan

| Tanggal | Perbaikan |
|---------|-----------|
| 2026-10-23 | Daftar campaign admin hanya menampilkan 10 campaign terbaru (paginasi client-side di atas respons ber-limit 10). Diganti paginasi server-side; `GET /admin/campaigns` menambah filter `categoryId`, pencarian judul+deskripsi case-insensitive, dan clamp `page`/`limit`. Dropdown campaign di activity-reports create/edit dinaikkan ke `limit: 500` (sebelumnya terpotong 10) |
