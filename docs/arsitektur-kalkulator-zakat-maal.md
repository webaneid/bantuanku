# Arsitektur Kalkulator Zakat Maal

## Status Implementasi

| Layer | Status | Catatan |
|-------|--------|---------|
| DB Schema (`zakat_types`, `zakat_calculator_configs`, `zakat_calculation_logs`) | ✅ Ada | Schema lengkap, tabel sudah exist |
| API config endpoint (`GET /zakat/config`) | ✅ Ada | Return harga emas, fitrah, fidyah + nisabGoldGrams + zakatMaalRateBps |
| API types endpoint (`GET /zakat/types`) | ✅ Ada | Return semua jenis zakat aktif + owner enrichment |
| API periods endpoint (`GET /zakat/periods`) | ✅ Ada | Filter by status=active, optional by zakatTypeId |
| Backend calculation service | ✅ Ada | `apps/api/src/services/zakat.ts` — lengkap |
| API calculate endpoints (`POST /zakat/calculate/maal`) | ✅ Ada | Hitung + log ke `zakat_calculation_logs`, auth opsional |
| Frontend kalkulator web (`/zakat/calculator/zakat-maal`) | ✅ Ada | Kalkulasi client-side, nisab/rate baca dari config API |
| Frontend dynamic route (`/zakat/[slug]`) | ✅ Ada | Routing ke calculator component lewat `calculatorType` |
| Admin kalkulator internal | ✅ Ada | `/dashboard/zakat/calculator` — baca settings API |
| Calculation logging (`zakat_calculation_logs`) | ✅ Ada | Diisi otomatis via `POST /zakat/calculate/maal` |
| Infaq fallback (di bawah nisab) | ✅ Ada | `ProgramSelectionModal` — pilih campaign |

---

## Database Schema

### `zakat_types` — Master jenis zakat
```
id              text PK (nanoid)
name            text NOT NULL
slug            text UNIQUE NOT NULL        -- e.g. "zakat-maal"
calculatorType  text                        -- maps ke component: "maal", "zakat-maal", dll
hasCalculator   boolean default true
isActive        boolean default true
displayOrder    integer default 0
fitrahAmount    numeric(15,2)               -- nominal khusus untuk fitrah (per jiwa)
createdBy       text FK users.id            -- jika diisi mitra, ownerType = "mitra"
imageUrl, description, icon                -- display
metaTitle, metaDescription, ...            -- SEO fields
```

### `zakat_calculator_configs` — Konfigurasi nisab/rate per jenis (belum dipakai dari web)
```
id              text PK
type            text UNIQUE NOT NULL        -- "maal", "income", "trade", "gold", "fitrah"
nisabGoldGram   decimal(10,2)              -- default 85
rateBps         integer                    -- default 250 (= 2.5%)
config          jsonb                      -- data tambahan fleksibel
isActive        boolean
```

### `zakat_calculation_logs` — Log setiap kalkulasi (belum diisi)
```
id              text PK
userId          text FK users.id (nullable) -- null jika tidak login
calculatorType  text NOT NULL
inputData       jsonb NOT NULL             -- semua input user
nisabValue      bigint
resultAmount    bigint NOT NULL
isConverted     boolean default false      -- apakah sudah jadi donasi
createdAt       timestamp
```

### `zakat_periods` — Periode aktif
```
id              text PK
name            text NOT NULL
year            integer
hijriYear       text
startDate, endDate  timestamp
status          text                       -- "active" | "inactive" | "closed"
zakatTypeId     text FK zakat_types.id     -- null = berlaku untuk semua
```

### `settings` (category = "zakat") — Harga dan nilai default
```
zakat_gold_price        → goldPricePerGram (default 1.200.000)
zakat_fitrah_amount     → nominal fitrah per jiwa (default 50.000)
zakat_rice_price        → harga beras/kg (default 15.000)
zakat_fidyah_amount     → fidyah per hari (default 50.000)
zakat_nisab_gold        → dipakai admin calculator (default 85)
zakat_mal_percentage    → dipakai admin calculator (default 2.5)
```

---

## Routing & Component Map

```
/zakat/calculator/zakat-maal        → ZakatMaalCalculatorPage (static route)
/zakat/[slug]                       → fetch ZakatType by slug
                                      → lookup calculatorType atau slug
                                      → render ZakatDisplayMetaProvider + Calculator component
```

### Map `calculatorType` → Component

| calculatorType (DB) | Component |
|---------------------|-----------|
| `maal`, `zakat-maal` | `ZakatMaalCalculatorPage` |
| `fitrah`, `zakat-fitrah` | `ZakatFitrahCalculatorPage` |
| `profesi`, `zakat-profesi`, `penghasilan`, `zakat-penghasilan` | `ZakatProfesiCalculatorPage` |
| `pertanian`, `zakat-pertanian` | `ZakatPertanianCalculatorPage` |
| `peternakan`, `zakat-peternakan` | `ZakatPeternakanCalculatorPage` |
| `bisnis`, `zakat-bisnis` | `ZakatBisnisCalculatorPage` |

`ZakatDisplayMetaProvider` context menyuntikkan data dari `ZakatType` (nama, deskripsi, image, owner) ke dalam calculator component — ini yang membuat mitra bisa punya "versi branded" kalkulator lewat slug mereka sendiri tanpa buat halaman baru.

---

## Alur Data Kalkulator Zakat Maal (Saat Ini)

```
User buka /zakat/calculator/zakat-maal
    │
    ├── GET /v1/zakat/config          → goldPricePerGram
    ├── GET /v1/zakat/types           → cari type dengan slug "maal"
    ├── GET /v1/zakat/periods         → list periode aktif
    ├── GET /v1/campaigns?...         → kampanye aktif (untuk infaq modal)
    └── fetchPublicSettings()         → nama & WA organisasi
    │
    ▼
  User isi form:
    uangTunai, saham, realEstate, emas, mobil (aset)
    hutang (kewajiban)
    selectedPeriod
    │
    ▼
  Kalkulasi CLIENT-SIDE (hardcoded):
    nisabGoldGrams = 85 (hardcoded)
    zakatMalPercentage = 0.025 (hardcoded)
    nishabEmas = 85 × goldPricePerGram
    jumlahHarta = uangTunai + saham + realEstate + emas + mobil
    hartaBersih = jumlahHarta − hutang
    zakatTahunan = hartaBersih ≥ nishabEmas ? hartaBersih × 0.025 : 0
    zakatBulanan = zakatTahunan / 12
    │
    ├── Jika ≥ nisab → ZakatConfirmModal
    │     → addToCart({ itemType:"zakat", zakatData:{...}, periodId })
    │     → /checkout atau /keranjang-bantuan
    │
    └── Jika < nisab → input infaq manual → ProgramSelectionModal
          → pilih campaign → checkout sebagai donasi biasa
```

---

## Formula Zakat Maal

```
Rumus:
  Nisab  = nisabGoldGrams × harga emas per gram   (dari zakatCalculatorConfigs, default 85g)
  Emas   = (emasGram × goldPricePerGram) + emasRupiah   ← dua cara input
  Harta  = uang tunai + saham + real estate + Emas + kendaraan
  Bersih = Harta − Hutang jatuh tempo
  Zakat  = Bersih × (zakatMaalRateBps / 10000)    (dari zakatCalculatorConfigs, default 250 = 2.5%)

Label field mengikuti urutan huruf BAZNAS:
  a. Uang Tunai, Tabungan, Deposito   → state: uangTunai
  b. Saham / Surat Berharga           → state: saham
  c. Real Estate (bukan rumah tinggal) → state: realEstate
  d. Emas, Perak, Permata             → state: emasGram (gram) + emasRupiah (Rp) → computed: emas
  e. Kendaraan (melebihi kebutuhan)   → state: mobil
  f. Jumlah Harta (A+B+C+D+E)
  g. Hutang Pribadi jatuh tempo       → state: hutang
  h. Harta Kena Zakat (F−G)
  i. Zakat Tahunan (rate × H)
  j. Zakat Bulanan (I / 12)
```

---

## File-File Kunci

| File | Fungsi |
|------|--------|
| `apps/web/src/app/zakat/calculator/zakat-maal/page.tsx` | Halaman kalkulator utama (web) |
| `apps/web/src/app/zakat/[slug]/page.tsx` | Dynamic route → maps slug/calculatorType → component |
| `apps/web/src/components/zakat/ZakatDisplayMetaContext.tsx` | Context untuk mitra branding |
| `apps/web/src/components/zakat/ZakatConfirmModal.tsx` | Modal konfirmasi → add to cart |
| `apps/web/src/components/zakat/ProgramSelectionModal.tsx` | Modal pilih program (infaq) |
| `apps/web/src/services/zakat.ts` | Fetch helpers (types, config, periods) |
| `apps/api/src/routes/zakat.ts` | Public API: config, types, periods |
| `apps/api/src/services/zakat.ts` | Business logic kalkulasi (belum di-expose) |
| `apps/admin/src/app/dashboard/zakat/calculator/page.tsx` | Kalkulator internal admin |
| `packages/db/src/schema/zakat.ts` | Schema: `zakatCalculatorConfigs`, `zakatCalculationLogs` |
| `packages/db/src/schema/zakat-types.ts` | Schema: `zakatTypes` |
| `packages/db/src/schema/zakat-periods.ts` | Schema: `zakatPeriods` |

---

## Gap & Masalah yang Ada

### 1. ~~Backend service tidak terekspos ke API~~ — FIXED ✅
`POST /v1/zakat/calculate/maal` sudah ada di `apps/api/src/routes/zakat.ts`. Menerima field nama Indonesia (`uangTunai`, `saham`, `realEstate`, `emas`, `kendaraan`, `hutang`), baca nisab/rate dari `zakatCalculatorConfigs`, log hasil ke `zakat_calculation_logs`. Auth opsional (userId di-log jika user login).

### 2. ~~Dead code di frontend service~~ — FIXED ✅
`calculateZakatMaal` di `apps/web/src/services/zakat.ts` di-rename menjadi `logZakatMaalCalculation`, dengan signature field Indonesia (`uangTunai`, `saham`, dst.) dan return type `ZakatMaalResult | null`. Fungsi bersifat fire-and-forget (return `null` jika gagal, tidak throw). Web page memanggil fungsi ini saat user klik "Tunaikan Zakat" untuk log analytics. Fungsi lain (`calculateZakatIncome`, `calculateZakatTrade`, `calculateZakatFitrah`) masih call endpoint yang belum exist — akan diaddress saat endpoint masing-masing diimplementasikan.

### 3. ~~Konstanta hardcoded di page (web)~~ — FIXED ✅
`GET /zakat/config` sekarang mengembalikan `nisabGoldGrams` dan `zakatMaalRateBps` dari tabel `zakatCalculatorConfigs`. Web page membaca keduanya dari config response; fallback ke 85g dan 250bps jika DB belum di-seed.

### 4. Field naming tidak konsisten
| Layer | Field names |
|-------|-------------|
| Web page | `uangTunai`, `saham`, `realEstate`, `emas`, `mobil`, `hutang` |
| API service | `savings`, `deposits`, `stocks`, `otherAssets`, `debts` |
| Admin page | `uangTunai`, `saham`, `realEstate`, `emas`, `mobil`, `hutang` |

Web dan admin pakai naming Indonesia, API service pakai English. Tidak kompatibel.

### 5. ~~`zakatCalculationLogs` tidak pernah diisi dari web~~ — FIXED ✅
`POST /zakat/calculate/maal` memanggil `saveCalculationLog()` otomatis. Web page memanggil endpoint ini (fire-and-forget) saat user klik "Tunaikan Zakat", sehingga setiap konversi ke pembayaran ter-log.

### 6. `zakatCalculatorConfigs` tidak dipakai dari web
Web baca gold price dari `GET /zakat/config` (ambil dari `settings` table). Tabel `zakatCalculatorConfigs` yang punya `nisabGoldGram` dan `rateBps` per jenis hanya dipakai oleh backend service (yang tidak di-expose).

---

## Status Perbaikan

### ✅ Priority 1 — Fix hardcoded nisab/rate
`GET /v1/zakat/config` sekarang include `nisabGoldGrams` dan `zakatMaalRateBps` dari tabel `zakatCalculatorConfigs`. Web page membaca keduanya dari config; fallback ke 85g / 250bps jika DB belum di-seed.

### ✅ Priority 2 — Expose calculate endpoint
`POST /v1/zakat/calculate/maal` tersedia di `apps/api/src/routes/zakat.ts`. Menerima field Indonesia, baca nisab/rate dari DB, return breakdown lengkap.

### ✅ Priority 3 — Calculation logging
`POST /zakat/calculate/maal` memanggil `saveCalculationLog()` setiap request. Web page fire-and-forget saat user klik "Tunaikan Zakat".

### ✅ Priority 4 — Clean up dead code
`calculateZakatMaal` di-rename ke `logZakatMaalCalculation` dengan signature + endpoint yang benar. Return `null` jika gagal (tidak blokir user flow).

### Sisa (belum diimplementasikan)
- `POST /zakat/calculate/income`, `/calculate/trade`, `/calculate/fitrah` — endpoint belum ada, fungsi di services masih call URL yang invalid. Akan diaddress jika halaman kalkulator lain butuh logging yang sama.

---

## Catatan Integrasi Mitra

Mitra bisa punya "kalkulator branded" sendiri lewat flow:
1. Buat `ZakatType` baru dengan `createdBy = mitra.userId` dan `calculatorType = "maal"`
2. Slug unik (e.g. `zakat-maal-pondok-xyz`)
3. URL `/zakat/zakat-maal-pondok-xyz` otomatis render `ZakatMaalCalculatorPage` dengan nama/logo mitra via `ZakatDisplayMetaProvider`
4. Komisi fundraiser tetap jalan jika ada `referred_by_fundraiser_code` (lihat sistem influencer)
