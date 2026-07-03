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
| `GET` | `/admin/campaigns` | List semua (termasuk draft) |
| `POST` | `/admin/campaigns` | Buat kampanye baru |
| `PUT` | `/admin/campaigns/:id` | Update kampanye |
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
