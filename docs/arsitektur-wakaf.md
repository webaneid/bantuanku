# Arsitektur Wakaf

> Terakhir di-sync: 2026-07-02

---

## Overview

Wakaf **bukan modul terpisah** — wakaf adalah kampanye (`campaigns`) dengan `pillar = "Wakaf"`. Tidak ada tabel khusus untuk wakaf.

---

## Implementasi

### Filter di Frontend
Halaman `/wakaf` mengambil semua kampanye aktif lalu filter di client:

```ts
// apps/web/src/app/wakaf/page.tsx
const wakafCampaigns = allCampaigns.filter(
  (campaign) => campaign.pillar?.toLowerCase() === "wakaf"
);
```

### Membuat Kampanye Wakaf
Admin set `pillar = "Wakaf"` saat buat/edit campaign di `/dashboard/campaigns`.

### Donasi Wakaf
Flow sama persis dengan donasi kampanye biasa:
- Cart → Checkout → `POST /v1/transactions` (satu transaksi per item)
- `category` di transaksi = `"campaign_donation"` — **bukan** `"wakaf"`. Wakaf hanya ditandai via pillar di `typeSpecificData`.

---

## Perbedaan dengan Donasi Biasa

| Aspek | Donasi | Wakaf |
|-------|--------|-------|
| Tabel DB | `campaigns` | `campaigns` (pillar = "Wakaf") |
| Flow checkout | Sama | Sama |
| Komisi fundraiser | Dihitung | **Dikecualikan** |
| Halaman web | `/program` | `/wakaf` |

---

## Halaman Web

| Route | Fungsi |
|-------|--------|
| `/wakaf` | List program wakaf (filter campaign by pillar) |
| `/program/:slug` | Detail campaign wakaf (sama dengan campaign biasa) |

---

## Catatan

Jika ke depan wakaf berkembang menjadi produk dengan karakteristik unik (wakaf produktif, sertifikat, dll.), perlu dibuat modul terpisah dengan tabel sendiri. Untuk saat ini cukup dengan filter pillar.
