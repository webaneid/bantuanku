# Arsitektur Zakat

> Terakhir di-sync: 2026-07-02  
> Menggantikan: `arsitektur-kalkulator-zakat-maal.md`

---

## Overview

Modul zakat mencakup: jenis zakat (master), periode, kalkulator per jenis, log kalkulasi, dan distribusi ke mustahiq. Mitra bisa punya "zakat type" branded sendiri.

---

## Schema Database

### `zakat_types` — Master jenis zakat
```
id              text PK (createId)
name            text NOT NULL
slug            text UNIQUE NOT NULL        -- "zakat-maal", "zakat-fitrah", dll.
calculatorType  text                        -- maps ke komponen: "maal" | "fitrah" | "profesi" | dll.
hasCalculator   boolean DEFAULT true
isActive        boolean DEFAULT true
displayOrder    integer DEFAULT 0
fitrahAmount    numeric(15,2)               -- nominal khusus fitrah (per jiwa)
createdBy       text FK users.id            -- jika diisi → milik mitra
imageUrl, description, icon
metaTitle, metaDescription, ...             -- SEO fields
```

### `zakat_periods` — Periode aktif
```
id              text PK
zakatTypeId     text FK zakat_types.id NOT NULL  -- wajib, periode selalu terikat ke satu jenis
name            text NOT NULL
year            integer NOT NULL
hijriYear       text
startDate / endDate     timestamptz NOT NULL
executionDate   timestamptz
status          text DEFAULT "draft"    -- "draft" | "active" | "inactive" | "closed"
description     text
mitraId         text FK mitra.id        -- periode milik mitra tertentu
```

### `zakat_calculator_configs` — Konfigurasi nisab & rate per jenis
```
id          text PK
type        text UNIQUE     -- "maal" | "income" | "trade" | "gold" | "fitrah"
nisabGoldGram   decimal(10,2)   -- default 85 gram
rateBps     integer             -- default 250 (= 2.5%)
config      jsonb               -- data tambahan fleksibel
isActive    boolean
```

### `zakat_calculation_logs` — Log kalkulasi dari web
```
id              text PK
userId          text FK users.id (nullable)  -- null jika tidak login
calculatorType  text NOT NULL
inputData       jsonb NOT NULL               -- semua field input user
nisabValue      bigint
resultAmount    bigint NOT NULL
isConverted     boolean DEFAULT false        -- sudah jadi donasi?
createdAt       timestamptz
```

### Pembayaran Zakat — Tidak Lagi `zakat_donations`

Pembayaran zakat modern tidak memakai tabel domain khusus `zakat_donations` sebagai source of truth. Data pembayaran zakat dibaca dari universal `transactions`:

```
transactions.productType = "zakat"
transactions.productId   = zakat_periods.id atau zakat_types.id tergantung flow pemanggil
transactions.productName = nama zakat yang ditampilkan
transactions.paymentStatus = pending | processing | partial | paid | failed | cancelled | expired
```

Endpoint admin `/admin/zakat/donations` mengembalikan transaksi zakat dari tabel `transactions`, lalu mentransform field:
- `amount` = `transactions.totalAmount`
- `zakatTypeName` = `transactions.productName`

Query lama ke `zakat_donations.payment_status = 'success'` tidak valid untuk arsitektur saat ini. Status modern yang mewakili pembayaran selesai adalah `transactions.payment_status = 'paid'`.

### `zakat_distributions` — Distribusi ke mustahiq
```
id                  text PK
referenceId         text UNIQUE NOT NULL
zakatTypeId         text FK zakat_types.id NOT NULL
recipientType       text                    -- "coordinator" | "direct"
coordinatorId       text                    -- employee id jika coordinator
mustahiqId          text                    -- mustahiq id jika direct
recipientCategory   text NOT NULL           -- fakir, miskin, amil, mualaf, riqab, gharim, fisabilillah, ibnus_sabil
recipientName       text NOT NULL
recipientContact    text
distributionLocation text
recipientCount      bigint
amount              bigint NOT NULL
purpose             text NOT NULL
description, notes  text
status              text DEFAULT "draft"    -- draft | approved | disbursed
sourceBank*, targetBank*, transferProof
approvedBy/At, disbursedBy/At
reportDate, reportDescription, reportPhotos, reportAddedBy/At
createdBy           text FK users.id NOT NULL
createdAt, updatedAt
```

---

## API Endpoints

### Public (`/v1/zakat`)

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/zakat/config` | Harga emas, fitrah, fidyah, nisabGoldGrams, zakatMaalRateBps |
| `GET` | `/zakat/types` | List jenis zakat aktif + enrichment owner |
| `GET` | `/zakat/periods` | List periode aktif, query: `zakatTypeId` |
| `POST` | `/zakat/calculate/maal` | Hitung + log zakat maal (auth opsional) |

`GET /zakat/types/:slug` **tidak ada** di implementasi — hanya `GET /zakat/types`.

### Admin (`/v1/admin/zakat`)

| Method | Path | Guard |
|--------|------|-------|
| `GET/POST/PUT/DELETE` | `/admin/zakat/types/*` | Semua role (mitra bisa) |
| `GET/POST/PUT/DELETE` | `/admin/zakat/periods/*` | Semua role (mitra bisa) |
| `GET` | `/admin/zakat/donations/*` | staffOnly |
| `GET` | `/admin/zakat/distributions/*` | staffOnly |
| `GET` | `/admin/zakat/stats/*` | staffOnly |

---

## Statistik dan Sumber Data Admin

| Area | Sumber Aktual | Catatan |
|------|---------------|---------|
| List pembayaran zakat | `transactions` dengan `productType = "zakat"` | Route: `apps/api/src/routes/admin/zakat-donations.ts` |
| Statistik pembayaran zakat | `transactions` | Exclude admin fee via `typeSpecificData.is_admin_fee_entry = false` |
| Distribusi zakat operasional lama | `zakat_distributions` | Masih dipakai oleh route `/admin/zakat/distributions` |
| Statistik distribusi dashboard zakat | `disbursements` dengan `disbursementType = "zakat"` | Route: `apps/api/src/routes/admin/zakat-stats.ts` |

Ada dualisme distribusi yang masih harus dibereskan di implementasi: route CRUD distribusi zakat membaca/menulis `zakat_distributions`, tetapi dashboard stats zakat membaca universal `disbursements`. Ini sudah harus dianggap gap arsitektur sampai implementasi memilih satu sumber utama.

---

## GET /zakat/config — Response

```json
{
  "goldPricePerGram": 1950000,
  "zakatFitrahPerPerson": 50000,
  "ricePricePerKg": 15000,
  "fidyahPerDay": 50000,
  "nisabGoldGrams": 85,
  "zakatMaalRateBps": 250
}
```

Sumber:
- `goldPricePerGram`, `zakatFitrahPerPerson`, `ricePricePerKg`, `fidyahPerDay` → tabel `settings` (category = "zakat")
- `nisabGoldGrams`, `zakatMaalRateBps` → tabel `zakat_calculator_configs` (type = "maal"), fallback 85g / 250bps

---

## Harga Emas dan Auto-Update Pluang

Harga emas adalah input sensitif karena dipakai untuk menghitung nisab zakat maal/profesi/gold/peternakan dan ditampilkan di kalkulator web, admin, serta flow WhatsApp.

### Source of Truth Implementasi

| Area | File |
|------|------|
| API auto-update | `apps/api/src/routes/admin/settings.ts` |
| Script operasional | `apps/api/scripts/scrape-gold-price.mjs` |
| Cron wrapper | `apps/api/scripts/cron-update-gold-price.sh` |
| README script API | `apps/api/scripts/README.md` |
| Admin settings UI | `apps/admin/src/app/dashboard/settings/general/page.tsx` |
| Admin kalkulator zakat | `apps/admin/src/app/dashboard/zakat/calculator/page.tsx` |
| Public zakat API/service | `apps/api/src/routes/zakat.ts`, `apps/api/src/services/zakat.ts` |
| Web zakat service | `apps/web/src/services/zakat.ts` |
| WhatsApp zakat flow | `apps/api/src/services/whatsapp-flow.ts`, `apps/api/src/services/whatsapp-ai.ts` |

### Setting Utama

| Key | Category | Type | Pemakai |
|-----|----------|------|---------|
| `zakat_gold_price` | `zakat` | `number` string di DB | `GET /zakat/config`, kalkulator zakat, WhatsApp zakat, admin settings |

Nilai disimpan sebagai string di tabel `settings`, lalu diparse menjadi number oleh service/API pemakai.

### Endpoint Auto-Update

| Method | Path | Guard | Fungsi |
|--------|------|-------|--------|
| `POST` | `/v1/admin/settings/auto-update-gold-price` | `super_admin`, `admin_finance` | Fetch halaman Pluang, parse `__NEXT_DATA__`, ambil `props.pageProps.goldAssetPerformance.currentMidPrice`, update/upsert `settings.zakat_gold_price`. |

Error dari fetch/parse/update dikembalikan sebagai HTTP 500 melalui helper `error()`.

### Script dan Cron

Script `apps/api/scripts/scrape-gold-price.mjs` melakukan flow yang sama di luar request HTTP:

```bash
node apps/api/scripts/scrape-gold-price.mjs --dry-run
node apps/api/scripts/scrape-gold-price.mjs
```

Tanpa `--dry-run`, script upsert `settings.zakat_gold_price`. Koneksi DB memakai `DATABASE_URL`; jika env tidak diset, script masih memiliki fallback lokal `postgresql://webane@localhost:5432/bantuanku`.

`apps/api/scripts/cron-update-gold-price.sh` hanya wrapper operasional untuk menjalankan script tersebut. Contoh GitHub Actions masih berada di `apps/api/scripts/README.md`, tetapi workflow CI aktual untuk update harga emas belum ada di repo.

### Perilaku UI Aktual

Admin Settings General memiliki tab zakat. Saat `activeTab === "zakat"`, `useEffect` langsung memanggil:
- `POST /admin/settings/auto-update-gold-price`
- `POST /admin/settings/auto-update-silver-price`

Artinya update harga emas/perak saat ini bukan hanya aksi tombol manual; membuka/berpindah ke tab zakat dapat melakukan request eksternal dan mutasi database untuk role yang punya akses.

### Risiko dan Gap yang Harus Dicatat

1. Sumber Pluang saat ini adalah scraping HTML `https://pluang.com/asset/gold`, bukan API resmi yang terkontrak di kode.
2. Parser bergantung pada struktur Next.js `__NEXT_DATA__` dan field `goldAssetPerformance.currentMidPrice`; perubahan struktur Pluang akan membuat update gagal.
3. Repo belum menyimpan metadata khusus seperti `last_scraped_at`, `source`, `last_error`, atau historis harga; yang ada hanya nilai setting terakhir dan `updatedAt`.
4. Belum ada sanity check rentang harga sebelum update. Nilai yang berhasil diparse langsung disimpan.
5. Belum ada audit log domain khusus untuk perubahan harga emas; perubahan hanya tercermin pada metadata setting.
6. Auto-update pada load tab zakat memiliki side effect tersembunyi. Secara arsitektur lebih baik dipindah ke tombol eksplisit, scheduled job, atau background worker dengan observability.
7. Legal/ToS/robots.txt Pluang tidak diverifikasi oleh kode. Jika fitur ini dipertahankan, frekuensi scraping harus dibatasi dan lebih baik diganti API resmi bila tersedia.

---

## Legacy SQL Root yang Dihapus

`test-zakat-query.sql` dan `cleanup-zakat-donations.sql` adalah helper root lama, bukan source of truth:

- `test-zakat-query.sql` membaca `zakat_donations` dan `payment_status = 'success'`, sedangkan implementasi admin zakat saat ini membaca `transactions.productType = "zakat"` dan status lunas adalah `paid`.
- `cleanup-zakat-donations.sql` menjalankan `DELETE FROM zakat_donations` dan `DELETE FROM ledger WHERE purpose LIKE 'Penerimaan Zakat%'`. Ini tidak boleh menjadi SOP modern karena tabel pembayaran zakat sudah dimigrasikan ke `transactions`, sementara ledger modern memakai `ledger_entries`/`ledger_lines` dan workflow pencairan memakai `disbursements`.

Root `fix-zakat-routes.js` juga sudah dihapus. File itu adalah codemod sekali pakai yang mengubah import/Hono typing dan menyisipkan `const db = c.get("db")` ke route zakat. Ia bukan runtime, bukan migration, dan tidak boleh menjadi SOP perbaikan route. Perubahan route harus dilakukan langsung di source route terkait dan didokumentasikan di arsitektur domain/API.

Jika kelak dibutuhkan query verifikasi zakat baru, buat script baru yang membaca `transactions`, `zakat_periods`, `zakat_types`, `disbursements`, dan/atau `zakat_distributions` sesuai kebutuhan domain yang sedang diverifikasi.

---

## POST /zakat/calculate/maal

Auth: opsional (`optionalAuthMiddleware`)

Request body:
```json
{
  "uangTunai": 10000000,
  "saham": 5000000,
  "realEstate": 0,
  "emas": 2000000,
  "kendaraan": 0,
  "hutang": 1000000
}
```

Response:
```json
{
  "nisabGoldGrams": 85,
  "nisabValue": 165750000,
  "goldPricePerGram": 1950000,
  "totalAssets": 17000000,
  "hutang": 1000000,
  "hartaBersih": 16000000,
  "isWajib": false,
  "zakatTahunan": 0,
  "zakatBulanan": 0,
  "zakatMaalRateBps": 250
}
```

Side effect: simpan ke `zakat_calculation_logs` dengan `userId` (jika login) atau null.

---

## Kalkulator Zakat Maal (Web)

File: `apps/web/src/app/zakat/calculator/zakat-maal/page.tsx`

### Formula
```
Nisab      = nisabGoldGrams × goldPricePerGram   (dari config API)
Emas       = (emasGram × goldPricePerGram) + emasRupiah
Harta      = uangTunai + saham + realEstate + Emas + kendaraan
BersihHarta = Harta - Hutang
zakatTahunan = BersihHarta × (zakatMaalRateBps / 10000)   jika BersihHarta >= Nisab
zakatBulanan = zakatTahunan / 12
```

### Input Emas — Dua Cara
- **Gram**: Input gram → otomatis hitung ke Rp (`emasGram × goldPricePerGram`)
- **Rupiah**: Input nilai Rp langsung
- Total emas = jumlah keduanya

### Urutan Field (BAZNAS)
a. Uang Tunai, Tabungan, Deposito  
b. Saham / Surat Berharga  
c. Real Estate (bukan rumah tinggal)  
d. Emas, Perak, Permata (gram + Rp)  
e. Kendaraan (melebihi kebutuhan)  
f. Jumlah Harta (A+B+C+D+E)  
g. Hutang Pribadi jatuh tempo  
h. Harta Kena Zakat (F−G)  
i. Zakat Tahunan  
j. Zakat Bulanan

### Fire-and-Forget Logging
Saat user klik "Tunaikan Zakat" → `logZakatMaalCalculation()` dipanggil async sebelum tampilkan modal.
Fungsi return `null` jika gagal — tidak memblokir user flow.

---

## Routing Kalkulator

```
/zakat/calculator/zakat-maal    → static page ZakatMaalCalculatorPage
/zakat/[slug]                   → dynamic: fetch ZakatType by slug
                                  → lookup calculatorType
                                  → render komponen sesuai
```

### Map `calculatorType` → Komponen

| calculatorType | Komponen |
|----------------|----------|
| `maal`, `zakat-maal` | `ZakatMaalCalculatorPage` |
| `fitrah`, `zakat-fitrah` | `ZakatFitrahCalculatorPage` |
| `profesi`, `penghasilan` | `ZakatProfesiCalculatorPage` |
| `pertanian` | `ZakatPertanianCalculatorPage` |
| `peternakan` | `ZakatPeternakanCalculatorPage` |
| `bisnis` | `ZakatBisnisCalculatorPage` |

`ZakatDisplayMetaProvider` menyuntikkan nama/logo ke dalam kalkulator → mitra bisa branded calculator via slug unik tanpa buat halaman baru.

---

## Halaman Web

| Route | Fungsi |
|-------|--------|
| `/zakat` | Landing zakat |
| `/zakat/[slug]` | Kalkulator by jenis/slug |
| `/zakat/calculator/zakat-maal` | Kalkulator zakat maal (static) |

---

## Halaman Admin

| Route | Fungsi |
|-------|--------|
| `/dashboard/zakat/types` | CRUD jenis zakat |
| `/dashboard/zakat/periods` | CRUD periode |
| `/dashboard/zakat/donations` | List & verifikasi donasi zakat |
| `/dashboard/zakat/distributions` | Distribusi ke mustahiq |
| `/dashboard/zakat/calculator` | Kalkulator internal admin |

---

## File Kunci

| File | Fungsi |
|------|--------|
| `apps/web/src/app/zakat/calculator/zakat-maal/page.tsx` | Kalkulator maal |
| `apps/web/src/app/zakat/[slug]/page.tsx` | Dynamic route kalkulator |
| `apps/web/src/services/zakat.ts` | `logZakatMaalCalculation()`, `fetchZakatConfig()` |
| `apps/web/src/components/zakat/ZakatDisplayMetaContext.tsx` | Mitra branding |
| `apps/api/src/routes/zakat.ts` | Public API: config, types, periods, calculate |
| `apps/api/src/services/zakat.ts` | Business logic kalkulasi |
| `packages/db/src/schema/zakat.ts` | `zakatCalculatorConfigs`, `zakatCalculationLogs` |
| `packages/db/src/schema/zakat-types.ts` | `zakatTypes` |
| `packages/db/src/schema/zakat-periods.ts` | `zakatPeriods` |

---

## Revenue Share Zakat

Setiap pembayaran zakat yang lunas menghasilkan record `revenue_shares`:
- **Basis**: `totalAmount` (total zakat)
- **Amil**: default 12.5% (`amil_zakat_percentage`) — sesuai 1/8 asnaf amil
- **Mitra**: `amil_mitra_percentage` dipotong dari porsi amil, kalau period punya `mitraId`
- **Fundraiser**: `amil_fundraiser_percentage` dipotong dari porsi amil, kalau ada referral
- **Tidak ada skip** khusus zakat — semua jenis zakat dikalkulasi

> Detail formula dan semua pihak penerima: lihat `arsitektur-revenue-share.md`.

---

## Status Implementasi

| Fitur | Status |
|-------|--------|
| Config API (`nisabGoldGrams`, `zakatMaalRateBps`) | ✅ Selesai |
| `POST /zakat/calculate/maal` endpoint | ✅ Selesai |
| Logging ke `zakat_calculation_logs` | ✅ Selesai |
| Input emas dalam gram (web) | ✅ Selesai |
| `POST /zakat/calculate/income` | ❌ Belum ada |
| `POST /zakat/calculate/fitrah` | ❌ Belum ada |
| `POST /zakat/calculate/trade` | ❌ Belum ada |
