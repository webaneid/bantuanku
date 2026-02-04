# SOP Alur Donasi - Bantuanku Platform

## Overview
Dokumen ini menjelaskan flow lengkap sistem donasi di platform Bantuanku, dari halaman detail campaign hingga konfirmasi pembayaran.

---

## 1. Halaman Detail Campaign (`/program/[slug]`)

### Komponen Utama
- **CampaignSidebar**: Form pemilihan nominal donasi
- **DonationAmountSelector**: Komponen untuk memilih nominal
- **DonationConfirmModal**: Modal konfirmasi donasi

### Flow di Detail Page

#### 1.1 User Memilih Nominal Donasi
- User dapat memilih dari **recommended amounts** (diambil dari settings `utilities_campaign_amounts` atau `utilities_wakaf_amounts`)
- Atau memasukkan **custom amount** (nominal lainnya)
- Default amounts jika setting tidak ada:
  - Campaign: Rp 50.000, Rp 100.000, Rp 200.000
  - Wakaf: Rp 100.000, Rp 500.000, Rp 1.000.000

#### 1.2 User Klik Tombol "DONASI SEKARANG" atau "WAKAF SEKARANG"
- Validasi: nominal harus > 0
- Jika valid, buka **DonationConfirmModal**

#### 1.3 Modal Konfirmasi Donasi Muncul
Modal menampilkan:
- **Nominal donasi** yang dipilih
- **Program** yang akan didukung
- **4 Pilihan Aksi**:

##### Opsi 1: "Donasi Sekarang" (Direct Checkout)
```typescript
handleDirectCheckout()
- Add item to cart (CartContext)
- Toast success: "Mengarahkan ke checkout..."
- Redirect ke /checkout
```

##### Opsi 2: "Tambah ke Keranjang & Lihat"
```typescript
handleGoToCart()
- Add item to cart (CartContext)
- Toast success: "Program berhasil ditambahkan ke keranjang!"
- Redirect ke /keranjang-bantuan
```

##### Opsi 3: "Tambah ke Keranjang"
```typescript
handleAddToCart()
- Add item to cart (CartContext)
- Toast success: "Program berhasil ditambahkan ke keranjang!"
- Close modal, tetap di halaman detail campaign
```

##### Opsi 4: "Cari Program Lain"
```typescript
- Close modal
- Redirect ke /program
```

---

## 2. Keranjang Bantuan (`/keranjang-bantuan`)

### Fitur Keranjang
- Menampilkan semua program yang sudah ditambahkan
- User dapat:
  - **Edit nominal** donasi per program
  - **Hapus program** dari keranjang
  - **Clear all** (kosongkan keranjang)
- Menampilkan **Total** keseluruhan donasi
- Tombol **"Lanjut ke Checkout"** → redirect ke `/checkout`

### Cart Context (localStorage)
```typescript
interface CartItem {
  campaignId: string;
  slug: string;
  title: string;
  amount: number;
  category?: string;
  programType: string; // zakat, infaq, wakaf, qurban
  organizationName?: string;
}
```

Data disimpan di `localStorage` dengan key: `bantuanku_cart`

---

## 3. Checkout - Data Donor (`/checkout`)

### Flow Checkout

#### 3.1 Validasi Awal
- Jika cart kosong → redirect ke `/keranjang-bantuan`

#### 3.2 Form Data Donor
User mengisi:
- **Nama Lengkap** (required, min 2 karakter)
- **Email** (required, valid email format)
- **Nomor Telepon** (required, min 10 digit)
- **Nomor WhatsApp** (opsional, auto-fill dari telepon)
- **Pesan/Doa** (opsional)
- **Checkbox**: "Sembunyikan nama saya (Hamba Allah)" → `isAnonymous`

#### 3.3 Auto-Fill Existing Donatur
```typescript
// Ketika user blur dari field email atau phone
checkExistingDonatur(email?, phone?)
  - Call: GET /donatur/search?email=xxx&phone=xxx
  - Jika donatur ditemukan:
    - Auto-fill: name, phone, whatsapp
    - Set donaturId untuk tracking
    - Toast: "Data Anda ditemukan! Nama telah diisi otomatis."
```

**Normalisasi Nomor Telepon:**
- `+62` → `0`
- `62xxx` → `0xxx`
- Jika tidak dimulai `0`, tambahkan `0` di depan
- Hasil akhir: `08521234567` (format standar)

#### 3.4 Submit Checkout Form

**Validasi:**
- Nama min 2 karakter
- Email valid format
- Phone min 10 digit
- Cart tidak kosong
- Setiap item minimal Rp 10.000

**Create Donations:**
```typescript
// Loop untuk setiap item di cart
for (item in items) {
  POST /donations
  {
    campaignId: string,
    amount: number,
    donorName: string,        // Selalu simpan nama asli
    donorEmail: string,       // Normalized & lowercase
    donorPhone: string,       // Normalized (08xxx)
    isAnonymous: boolean,     // Flag untuk display
    message?: string
  }
}
```

**Create Donatur Record (jika belum ada):**
```typescript
// Jika donaturId tidak ditemukan sebelumnya
POST /donatur
{
  name: string,
  email: string,
  phone: string,
  whatsappNumber: string
}
```

**Redirect:**
```typescript
// Simpan donation IDs ke sessionStorage
sessionStorage.setItem('pendingDonations', JSON.stringify([
  { id: donationId1, program: 'zakat' },
  { id: donationId2, program: 'infaq' },
  ...
]))

// Redirect ke payment method
router.push('/checkout/payment-method')
```

---

## 4. Payment Method Selection (`/checkout/payment-method`)

### Flow Payment Method
1. Load `pendingDonations` dari sessionStorage
2. Tampilkan daftar metode pembayaran aktif
3. User pilih metode pembayaran (Bank Transfer, E-Wallet, dll)
4. Submit payment method selection
5. Redirect ke `/checkout/payment-detail` dengan invoice IDs

---

## 5. Payment Detail (`/checkout/payment-detail`)

### Informasi yang Ditampilkan
- **Detail Donasi**: Campaign, nominal, total
- **Metode Pembayaran**: Bank/E-Wallet yang dipilih
- **Instruksi Pembayaran**: Nomor rekening, cara transfer, dll
- **Batas Waktu Pembayaran**: Countdown timer
- **Status**: Menunggu pembayaran

### Setelah User Melakukan Pembayaran
1. User upload bukti pembayaran (opsional)
2. Admin verifikasi pembayaran di dashboard
3. Status donation berubah: `pending` → `paid` → `verified`
4. User mendapat notifikasi konfirmasi

---

## Data Model Summary

### CartItem (Client-side, localStorage)
```typescript
{
  campaignId: string
  slug: string
  title: string
  amount: number
  category?: string
  programType: string    // zakat | infaq | wakaf | qurban
  organizationName?: string
}
```

### Donation (Database)
```typescript
{
  id: string
  campaignId: string
  amount: number
  donorName: string      // Nama asli (untuk record internal)
  donorEmail: string
  donorPhone: string
  isAnonymous: boolean   // Jika true, display sebagai "Hamba Allah"
  message?: string
  status: 'pending' | 'paid' | 'verified' | 'cancelled'
  createdAt: Date
}
```

### Donatur (Database)
```typescript
{
  id: string
  name: string
  email: string
  phone: string
  whatsappNumber?: string
  createdAt: Date
}
```

---

## Important Notes

### 1. Cart Persistence
- Cart disimpan di localStorage
- Persist across page reloads
- Cart items dihapus setelah payment berhasil

### 2. Donatur Auto-Fill
- System mencari donatur existing berdasarkan email ATAU phone
- Jika ditemukan, auto-fill name, phone, whatsapp
- Mengurangi friction untuk donatur repeat

### 3. Anonymous Donation
- `donorName` **SELALU** disimpan untuk audit trail
- `isAnonymous` flag menentukan apakah nama ditampilkan di public
- Jika `isAnonymous = true`, tampilkan sebagai "Hamba Allah" di campaign page

### 4. Multi-Campaign Donation
- User dapat donasi ke multiple campaigns sekaligus
- Setiap campaign = 1 donation record
- Semua donations dalam 1 checkout = 1 invoice group

### 5. Phone Normalization
- Semua nomor telepon dinormalisasi ke format: `08xxxxxxxxxx`
- Memastikan konsistensi data di database
- Memudahkan pencarian donatur existing

---

## File Structure Reference

```
apps/web/src/app/
├── program/[slug]/
│   ├── page.tsx                    # Campaign detail page
│   ├── CampaignSidebar.tsx         # Sidebar dengan donation form
│   ├── DonationAmountSelector.tsx  # Selector nominal donasi
│   └── DonationConfirmModal.tsx    # Modal konfirmasi + 4 opsi
├── keranjang-bantuan/
│   └── page.tsx                    # Cart page
├── checkout/
│   ├── page.tsx                    # Checkout form (data donor)
│   ├── payment-method/
│   │   └── page.tsx                # Payment method selection
│   └── payment-detail/
│       └── page.tsx                # Payment detail & instruksi
└── contexts/
    └── CartContext.tsx             # Cart management (localStorage)
```

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/donatur/search?email=&phone=` | Cari existing donatur |
| POST | `/donatur` | Create donatur record |
| POST | `/donations` | Create donation |
| GET | `/settings` | Get recommended amounts |
| GET | `/campaigns/:slug` | Get campaign detail |

---

## Testing Checklist

- [ ] User dapat pilih nominal recommended
- [ ] User dapat input custom amount
- [ ] Modal konfirmasi muncul dengan 4 opsi
- [ ] Donasi Sekarang → langsung ke checkout
- [ ] Tambah ke Keranjang & Lihat → ke cart page
- [ ] Tambah ke Keranjang → tetap di detail page
- [ ] Cart page menampilkan items dengan benar
- [ ] Edit nominal di cart berfungsi
- [ ] Hapus item dari cart berfungsi
- [ ] Checkout form auto-fill existing donatur
- [ ] Phone normalization bekerja
- [ ] Create donations untuk multiple items
- [ ] Redirect ke payment method
- [ ] sessionStorage menyimpan pendingDonations

---

**Last Updated:** 2026-01-30
**Version:** 1.0
