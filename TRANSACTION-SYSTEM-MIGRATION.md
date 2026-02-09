# Transaction System Migration - Documentation

## Overview

Sistem transaksi telah dimigrasi dari 3 tabel terpisah menjadi 1 sistem universal yang menangani Campaign, Zakat, dan Qurban.

## Perubahan

### Tabel Baru

#### `transactions`
Tabel universal untuk semua transaksi (Campaign, Zakat, Qurban):
- **Polymorphic**: `product_type` + `product_id`
- **Type-specific data**: Field kondisional disimpan di JSONB `type_specific_data`
- **Payment tracking**: `payment_status`, `paid_amount`, `paid_at`

#### `transaction_payments`
Tabel unified untuk semua pembayaran:
- Support cicilan (Qurban)
- Bukti pembayaran & verifikasi admin
- Ledger integration ready

### Tabel Lama (Read-Only)

Tabel legacy tetap ada untuk historical data:
- `donations` → Migrasi ke `transactions` (product_type='campaign')
- `zakat_donations` → Migrasi ke `transactions` (product_type='zakat')
- `qurban_orders` → Migrasi ke `transactions` (product_type='qurban')
- `donation_payments`, `zakat_payments`, `qurban_payments` → Migrasi ke `transaction_payments`

**Total data yang dimigrasi:**
- 78 transactions (43 campaign, 15 zakat, 20 qurban)
- 21 payments
- Semua amount cocok 100%

## Form Admin

### Form Baru (Recommended)
`/dashboard/transactions/create` - Universal form untuk semua tipe transaksi

**Features:**
- Single-page form dengan semua field dalam satu halaman
- Autocomplete untuk semua dropdown (product type, product selection, payment method)
- Conditional fields berdasarkan product_type
- Support semua fitur unique (admin_fee untuk qurban, calculator untuk zakat)
- User-friendly untuk ratusan campaign dengan search capability

### Form Lama (Deprecated)
- `/dashboard/donations/create` - Donasi only
- `/dashboard/zakat/donations/new` - Zakat only

**Status:** Deprecated, ditampilkan warning untuk gunakan form universal

## API Endpoints

### Baru
- `POST /transactions` - Create transaction (semua tipe)
- `GET /transactions` - List dengan filter
- `GET /transactions/:id` - Detail
- `POST /transactions/:id/payments` - Upload payment proof
- `POST /transactions/:id/payments/:paymentId/verify` - Verify payment

### Legacy (Backward Compatible)
Endpoint lama masih berfungsi, tapi internal logic sudah check tabel baru terlebih dahulu.

## Public Invoice

URL invoice universal: `https://bantuanku.com/invoice/{transaction_number}`

System otomatis detect tipe transaksi (old vs new) dan render dengan benar.

## Migration Scripts

### Run Migration
```bash
cd packages/db
npx tsx scripts/migrate-to-transactions.ts
```

### Verify Migration
```bash
npx tsx scripts/verify-migration.ts
```

## Product Management (Unchanged)

Tabel product tetap digunakan untuk management:
- `campaigns` - Campaign management
- `zakat_types` - Jenis zakat
- `qurban_periods` - Periode Hijriah
- `qurban_packages` - Paket qurban
- `qurban_package_periods` - Harga per periode

## Developer Notes

### Status Mapping
Legacy payment_status dimap ke new format:
- `success` → `paid`
- `processing` → `pending`
- `pending` → `pending`
- `paid` → `paid`

### Type-Specific Data Examples

**Campaign:**
```json
{
  "campaign_id": "abc123",
  "pillar": "infaq"
}
```

**Zakat:**
```json
{
  "zakat_type_id": "xyz456",
  "calculator_data": {...},
  "calculated_zakat": 500000
}
```

**Qurban:**
```json
{
  "period_id": "1446H",
  "package_id": "kambing-patungan",
  "shared_group_id": "group-123",
  "on_behalf_of": "Bapak Ahmad"
}
```

## Rollback Plan

Jika diperlukan rollback:
1. Tabel legacy masih utuh dengan data original
2. Hapus data dari `transactions` dan `transaction_payments`
3. Update routing di admin untuk gunakan form lama

## Next Steps

1. Monitor sistem baru selama 2 minggu
2. Jika stabil, remove deprecation warnings
3. Archive atau drop legacy tables (optional, setelah 6 bulan)

---

**Migration Date:** 2026-02-08
**Status:** ✅ Completed
**Blueprint:** See `00-blueprint-invoice-unifikasi.md`
