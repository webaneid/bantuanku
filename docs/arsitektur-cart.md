# Arsitektur Cart dan Checkout

Dokumen ini adalah source of truth untuk cart frontend, halaman keranjang, dan checkout web. Standar final mengikuti implementasi kode aktual di `apps/web` dan API transaksi universal.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Cart context | `apps/web/src/contexts/CartContext.tsx` |
| Root provider | `apps/web/src/app/providers.tsx` |
| Header cart badge | `apps/web/src/components/organisms/Header/Header.tsx` |
| Halaman cart | `apps/web/src/app/keranjang-bantuan/page.tsx` |
| Halaman checkout | `apps/web/src/app/checkout/page.tsx` |
| Campaign add-to-cart | `apps/web/src/app/program/[slug]/DonationConfirmModal.tsx` |
| Qurban add-to-cart | `apps/web/src/app/qurban/[id]/QurbanConfirmModal.tsx` |
| Zakat add-to-cart | `apps/web/src/components/zakat/ZakatConfirmModal.tsx` |
| Referral storage | `apps/web/src/lib/referral.ts` |
| Transaction create API | `apps/api/src/routes/transactions.ts`, `apps/api/src/services/transaction.ts` |

## Root Provider

`CartProvider` dipasang di `apps/web/src/app/providers.tsx`:

```text
QueryClientProvider
  -> I18nProvider
    -> CartProvider
      -> ReferralCapture
      -> MetaPixel
      -> GoogleTagManager
      -> children
      -> FeedbackToastHost
```

Semua komponen web yang memanggil `useCart()` harus berada di bawah provider ini. Jika tidak, hook akan throw error:

```text
useCart must be used within a CartProvider
```

## Storage

Cart disimpan client-side di `localStorage`.

| Key | Isi |
|-----|-----|
| `bantuanku_cart` | JSON array `CartItem[]` |

Behavior:

- saat mount, provider membaca `localStorage.getItem("bantuanku_cart")`
- setelah load awal selesai, setiap perubahan `items` disimpan ulang ke localStorage
- error parse/read/write hanya dicatat ke console, tidak memblok UI

Cart tidak disimpan di server dan tidak di-sync antar device.

## CartItem

Interface aktual:

```text
CartItem {
  cartItemId: string
  itemType: "campaign" | "qurban" | "zakat"
  campaignId: string
  slug: string
  title: string
  amount: number
  category?: string
  pillar?: string
  programType: string
  organizationName?: string
  qurbanData?: {...}
  zakatData?: {...}
  fidyahData?: {...}
}
```

### Qurban Data

```text
qurbanData {
  packagePeriodId
  packageId
  periodId
  periodName
  quantity
  animalType
  packageType
  price
  adminFee
}
```

`packagePeriodId` adalah identifier utama untuk paket-periode. `packageId` dipertahankan sebagai field legacy compatibility.

### Zakat Data

```text
zakatData {
  zakatType
  zakatTypeId?
  zakatTypeSlug?
  quantity?
  pricePerUnit?
  periodId?
}
```

Checkout wajib menemukan `zakatTypeId` dan `periodId`; jika tidak ada, checkout gagal.

### Fidyah Data

```text
fidyahData {
  personCount
  dayCount
}
```

Fidyah saat ini masuk melalui item campaign dan disimpan di `type_specific_data` transaksi campaign.

## Cart API Frontend

`CartContext` expose:

| Function | Perilaku |
|----------|----------|
| `addToCart(item)` | Jika `cartItemId` sudah ada, replace item lama; jika belum, append |
| `removeFromCart(cartItemId)` | Hapus item berdasarkan `cartItemId` |
| `updateCartItem(cartItemId, updates)` | Merge partial update ke item |
| `clearCart()` | Set cart menjadi array kosong |
| `getCartTotal()` | Sum `item.amount` |
| `getCartCount()` | Jumlah baris item, bukan quantity total |

Catatan: `getCartCount()` tidak menjumlah `qurbanData.quantity` atau `zakatData.quantity`.

## Add-to-Cart Entry Points

### Campaign / Donasi / Wakaf

File: `apps/web/src/app/program/[slug]/DonationConfirmModal.tsx`.

Cart item:

```text
cartItemId = campaign-{campaign.id}
itemType = "campaign"
campaignId = campaign.id
slug = campaign.slug
title = campaignTitle
amount = selected amount
category = campaign.category
pillar = campaign.pillar
programType = passed programType
organizationName = campaign.organizationName
fidyahData = optional
```

Behavior:

- `handleAddToCart()` tambah item lalu tetap di halaman
- `handleGoToCart()` tambah item lalu redirect `/keranjang-bantuan`
- `handleDirectCheckout()` tambah item lalu redirect `/checkout`
- kirim Meta Pixel `AddToCart`

Karena `cartItemId` campaign berbasis `campaign.id`, menambahkan campaign yang sama dua kali akan replace amount item lama, bukan membuat baris baru.

### Qurban

File: `apps/web/src/app/qurban/[id]/QurbanConfirmModal.tsx`.

Cart item:

```text
cartItemId = qurban-{packagePeriodId}
itemType = "qurban"
campaignId = packagePeriodId
slug = packagePeriodId
title = package.name
amount = total
category = animalType label
programType = "qurban"
qurbanData = package/period/quantity/fee detail
```

Behavior:

- add to cart
- go to cart
- direct checkout
- kirim Meta Pixel `AddToCart`

Karena `cartItemId` qurban berbasis `packagePeriodId`, paket qurban yang sama pada periode yang sama akan replace item lama.

### Zakat

File: `apps/web/src/components/zakat/ZakatConfirmModal.tsx`.

Cart item:

```text
cartItemId = zakat-{zakatType}-{Date.now()}
itemType = "zakat"
campaignId = "zakat-campaign-default"
slug = zakat-{zakatType}
title = zakatName
amount = calculated amount
programType = "zakat"
zakatData = zakat type/period/quantity/price detail
```

Behavior:

- add to cart
- go to cart
- direct checkout

Karena `cartItemId` zakat memakai `Date.now()`, kalkulasi zakat yang sama bisa menghasilkan beberapa baris cart.

## Header Cart Badge

`Header` memakai:

```text
const { getCartCount } = useCart()
```

Badge tampil hanya jika count `> 0`, dan link selalu menuju:

```text
/keranjang-bantuan
```

Count yang tampil adalah jumlah item array, bukan total quantity qurban/zakat.

## Halaman Keranjang

Route:

```text
/keranjang-bantuan
```

File:

```text
apps/web/src/app/keranjang-bantuan/page.tsx
```

Behavior:

- jika cart kosong, tampil empty state + CTA ke `/program`
- render item berdasarkan `itemType`
- campaign amount bisa diedit manual
- qurban dan zakat amount tidak bisa diedit di cart
- item bisa dihapus per baris
- cart bisa dikosongkan total
- checkout redirect ke `/checkout`
- mobile memakai sticky bottom bar via `createPortal(document.body)`

### Tampilan Item

| Item Type | Tampilan |
|-----------|----------|
| `campaign` | category badge, title link ke `/program/{slug}`, organization, input nominal, formatted amount |
| `qurban` | badge qurban, title link ke `/qurban/{slug}`, period, animal/package type, quantity, price/admin fee breakdown |
| `zakat` | badge zakat, title, quantity x price jika ada, amount |

### Validasi Cart Page

Cart page hanya disable checkout jika:

```text
getCartTotal() === 0
```

Minimum amount sesungguhnya divalidasi di checkout.

## Checkout Page

Route:

```text
/checkout
```

File:

```text
apps/web/src/app/checkout/page.tsx
```

Behavior awal:

- jika cart kosong dan bukan sedang submit/success, redirect ke `/keranjang-bantuan`
- saat page load dengan item, kirim Meta Pixel `InitiateCheckout`
- ambil referral code dari localStorage via `getReferralCode()`
- jika user login, autofill data dari `useAuth()`
- jika guest mengisi email/phone/WA, cek donatur existing via `GET /v1/donatur/search`
- jika donatur existing tanpa user account, tampil popup ajakan register

## Checkout Validation

Validasi sebelum create transaction:

| Field | Rule |
|-------|------|
| `name` | wajib, minimal 2 karakter |
| `email` | wajib format email |
| `phone` | wajib, normalized length minimal 10 |
| `whatsapp` | wajib jika tidak sama dengan phone |
| cart | wajib tidak kosong |
| campaign item | `amount >= 1000` |
| zakat item | `amount >= 1000` |
| qurban item | wajib punya `qurbanData` |
| zakat item | wajib punya resolvable `zakatTypeId` dan `periodId` |

Phone/WA dinormalisasi ke format lokal `08...`.

## Create Transaction Flow

Checkout memisahkan item menjadi:

```text
campaignItems
zakatItems
qurbanItems
```

Lalu masing-masing item dibuat menjadi satu transaksi universal via:

```text
POST /v1/transactions
```

Artinya cart multi-item tidak menjadi satu order gabungan. Cart multi-item menghasilkan N transaksi terpisah.

### Campaign Transaction Payload

```text
product_type = "campaign"
product_id = item.campaignId
product_name = item.title
donor_name/email/phone
donatur_id = donaturId jika ada
is_anonymous = hideMyName
quantity = 1
unit_price = item.amount
admin_fee = 0
total_amount = item.amount
message = note
user_id = user.id jika login
referred_by_fundraiser_code = referral code jika ada
type_specific_data = meta cookies + meta_event_id + fidyah data jika ada
```

### Zakat Transaction Payload

Sebelum create, checkout fetch:

```text
GET /v1/zakat/types
```

Kemudian membuat map:

```text
zakat-fitrah -> id
fitrah -> id
...
```

Payload:

```text
product_type = "zakat"
product_id = item.zakatData.periodId
product_name = item.title
donor_name/email/phone
donatur_id = donaturId jika ada
is_anonymous = hideMyName
quantity = item.zakatData.quantity || 1
unit_price = item.zakatData.pricePerUnit || item.amount
admin_fee = 0
total_amount = item.amount
message = note
user_id = user.id jika login
referred_by_fundraiser_code = referral code jika ada
type_specific_data = zakat_type, zakat_type_id, quantity, price_per_unit, period_id, on_behalf_of, meta cookies, meta_event_id
```

### Qurban Transaction Payload

Payload:

```text
product_type = "qurban"
product_id = item.qurbanData.packagePeriodId
product_name = item.title
donor_name/email/phone
donatur_id = donaturId jika ada
quantity = item.qurbanData.quantity
unit_price = item.qurbanData.price
admin_fee = item.qurbanData.adminFee
total_amount = (unit_price * quantity) + (admin_fee * quantity)
notes = note
user_id = user.id jika login
referred_by_fundraiser_code = referral code jika ada
type_specific_data = period_id, package_id, package_period_id, onBehalfOf, animal_type, package_type, meta cookies, meta_event_id
```

## Donatur Auto-Create

Jika `donaturId` belum ditemukan, checkout mencoba membuat donatur guest setelah transaksi berhasil dibuat:

```text
POST /v1/donatur
{
  name,
  email,
  phone,
  whatsappNumber
}
```

Kegagalan create donatur tidak menggagalkan transaksi. Ini hanya dicatat ke console.

Catatan: transaksi sudah dibuat sebelum guest donatur auto-create ini. `TransactionService.create()` juga punya mekanisme find/create donatur sendiri jika `donatur_id` tidak dikirim.

## Success dan Redirect

Setelah semua transaksi berhasil:

1. tampilkan toast success berdasarkan kombinasi item
2. bentuk `transactionData` dari hasil API
3. set `checkoutSuccess = true`
4. `clearCart()`
5. simpan `pendingDonations` ke sessionStorage
6. redirect ke invoice payment method transaksi pertama:

```text
/invoice/{firstTransaction.id}/payment-method
```

`pendingDonations` disimpan dengan shape:

```text
[
  {
    id,
    type,
    program,
    amount,
    useUniversalInvoice
  }
]
```

Namun flow invoice universal saat ini memakai transaction id dari URL. `pendingDonations` lebih relevan untuk route checkout payment legacy.

## Referral dan Tracking

Referral:

- `ReferralCapture` membaca query `?ref=` di provider
- `saveReferralCode()` menyimpan ke localStorage key `bantuanku_ref`
- expiry disimpan di `bantuanku_ref_expiry`
- masa berlaku 24 jam
- checkout mengirim `referred_by_fundraiser_code` jika masih valid

Meta Pixel:

| Event | Lokasi |
|-------|--------|
| `AddToCart` | Campaign dan qurban confirm modal |
| `InitiateCheckout` | checkout page load jika cart punya item |
| Purchase event id | dibuat per transaksi di checkout dan dikirim via `type_specific_data.meta_event_id` |

Zakat confirm modal tidak mengirim `fbPixel.addToCart()` saat ini.

## Hubungan Dengan Universal Payment

Cart/checkout berhenti setelah transaksi dibuat dan redirect ke:

```text
/invoice/{transactionId}/payment-method
```

Detail flow metode pembayaran, upload proof, gateway, dan invoice didokumentasikan di `arsitektur-universal-payment.md`.

## Gap dan Rekomendasi

1. **Multi-item checkout membuat N transaksi, tapi UI hanya redirect ke transaksi pertama.** Transaksi lain tersimpan di `pendingDonations`, tetapi flow invoice universal tidak menampilkan daftar pending multi-transaction. Ini bisa membuat user hanya membayar transaksi pertama.
2. **Klaim UI cart menyebut “berbagai program sekaligus dalam satu transaksi”, tetapi implementasi membuat transaksi terpisah per item.** Copywriting cart perlu dikoreksi agar tidak menyesatkan.
3. **`pendingDonations` menjadi state warisan.** Setelah redirect ke invoice universal, data ini tidak menjadi sumber utama. Perlu audit apakah masih dipakai route legacy sebelum dihapus.
4. **Guest donatur dibuat setelah transaksi berhasil.** Karena `TransactionService.create()` juga find/create donatur, ada potensi duplikasi tanggung jawab dan race/hasil yang tidak terlihat di UI.
5. **Campaign/qurban add-to-cart replace item sama, zakat add-to-cart selalu membuat baris baru.** Ini mungkin valid, tetapi perlu keputusan UX eksplisit.
6. **Cart count menghitung baris item, bukan quantity.** Untuk qurban quantity > 1, badge tetap bertambah 1.
7. **Campaign amount bisa diedit menjadi 0 di cart.** Checkout akan menolak `< 1000`, tetapi cart page hanya disable jika total semua item 0.
8. **Zakat checkout masih punya `console.log('DEBUG zakatItems')`.** Ini sebaiknya dihapus atau diganti debug terstruktur.
9. **Zakat add-to-cart belum trigger Meta Pixel AddToCart.** Campaign dan qurban sudah trigger.
10. **Cart localStorage tidak punya schema migration/versioning.** Jika shape `CartItem` berubah, cart lama bisa error halus atau gagal checkout.
11. **No server-side cart.** Ini sengaja sederhana, tetapi user yang ganti device/browser kehilangan cart.
12. **Direct checkout bergantung pada localStorage async state.** Add-to-cart lalu `router.push('/checkout')` biasanya aman karena state React langsung update, tetapi localStorage persistence baru terjadi setelah effect.

## Keputusan Arsitektur Saat Ini

- Cart adalah client-only state berbasis `localStorage`.
- Cart item unik berdasarkan `cartItemId`.
- Campaign dan qurban item yang sama akan replace item lama.
- Zakat item memakai timestamp sehingga bisa punya beberapa baris.
- Checkout membuat satu universal transaction per cart item.
- Setelah checkout sukses, cart langsung dikosongkan.
- Redirect pembayaran menggunakan invoice universal untuk transaksi pertama.
- Legacy checkout payment route masih ada, tetapi checkout utama saat ini mengarah ke `/invoice/:id/payment-method`.
