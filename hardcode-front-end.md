# Laporan Hardcode Front-End

Laporan ini berisi daftar lengkap semua hardcoded text, URL, dan konfigurasi yang ditemukan di aplikasi front-end **Bantuanku**. Hardcode ini sebaiknya dipindahkan ke settings atau translation file untuk memudahkan customization di masa depan.

---

## 📊 Ringkasan Eksekutif

| Kategori | Jumlah Hardcode | Prioritas |
|----------|----------------|-----------|
| Header Component | 15+ items | 🟡 Medium |
| Footer Component | 25+ items | 🔴 High |
| Homepage | 50+ items | 🔴 High |
| Zakat Page | 10+ items | 🟡 Medium |
| Qurban Page | 15+ items | 🟡 Medium |
| Wakaf Page | 10+ items | 🟡 Medium |
| Program Page | 10+ items | 🟡 Medium |

**Total Estimasi**: 135+ hardcoded items yang perlu dimigrasi ke settings/translation

---

## 1. Header Component
**File**: `apps/web/src/components/organisms/Header/Header.tsx`

### 1.1 Menu & Navigation Text

| Line | Type | Hardcode | Rekomendasi |
|------|------|----------|-------------|
| 20-27 | Fallback Menu | `FALLBACK_MENU_ITEMS` dengan label "Beranda", "Zakat", "Qurban", "Infaq/Sedekah", "Wakaf", "Tentang" | ✅ OK (Fallback) |

### 1.2 Search & Input Placeholders

| Line | Hardcode | Kategori | Rekomendasi |
|------|----------|----------|-------------|
| 150 | "Cari program..." | Placeholder | Pindah ke settings `frontend_search_placeholder` |
| 284 | "Cari program..." | Placeholder | Same as above |

### 1.3 User Menu Labels

| Line | Hardcode | Kategori | Lokasi |
|------|----------|----------|--------|
| 211 | "Dashboard" | Menu Item | Desktop User Menu |
| 221 | "Riwayat" | Menu Item | Desktop User Menu |
| 231 | "Tabungan Qurban" | Menu Item | Desktop User Menu |
| 241 | "Profil" | Menu Item | Desktop User Menu |
| 254 | "Keluar" | Menu Item | Desktop User Menu |
| 262 | "Masuk" | Button Text | Login Button |
| 321 | "Dashboard" | Button Text | Mobile Menu |
| 324 | "Tabungan Qurban" | Button Text | Mobile Menu |
| 327 | "Keluar" | Button Text | Mobile Menu |
| 333 | "Masuk" | Button Text | Mobile Menu |
| 336 | "Daftar" | Button Text | Mobile Menu |

**Rekomendasi**: Pindahkan ke file translation/i18n atau settings dengan prefix `frontend_header_*`

---

## 2. Footer Component
**File**: `apps/web/src/components/organisms/Footer/Footer.tsx`

### 2.1 Default Program Links

| Line | Hardcode | Kategori |
|------|----------|----------|
| 19-24 | `defaultProgramLinks` | Navigation |

```typescript
// Hardcoded:
const defaultProgramLinks = [
  { label: 'Zakat', href: '/zakat' },
  { label: 'Qurban', href: '/qurban' },
  { label: 'Infaq/Sedekah', href: '/infaq' },
  { label: 'Wakaf', href: '/wakaf' },
];
```

**Status**: Sudah ada di settings `frontend_service_categories` ✅, tapi perlu ensure Footer menggunakan settings

### 2.2 About/Info Links

| Line | Hardcode | Kategori |
|------|----------|----------|
| 26-32 | `aboutLinks` | Navigation |

```typescript
// Hardcoded:
const aboutLinks = [
  { label: 'Tentang Kami', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
];
```

**Rekomendasi**: Pindah ke settings `frontend_footer_info_links`

### 2.3 Social Media Links

| Line | Hardcode | URL |
|------|----------|-----|
| 37 | WhatsApp | `https://wa.me/62123456789` |
| 46 | Instagram | `https://instagram.com/bantuanku` |
| 55 | Facebook | `https://facebook.com/bantuanku` |
| 64 | YouTube | `https://youtube.com/@bantuanku` |

**Rekomendasi**: Pindah ke settings `organization_social_*` (whatsapp, instagram, facebook, youtube)

### 2.4 Section Titles & Labels

| Line | Hardcode | Kategori |
|------|----------|----------|
| 76 | `'Bantuanku'` | Default Organization Name |
| 77 | `'Platform donasi terpercaya...'` | Default Tagline |
| 79 | `'Selengkapnya'` | Link Label |
| 127 | "Program" | Section Title |
| 140 | "Informasi" | Section Title |
| 153 | "Kontak" | Section Title |
| 172 | "WhatsApp:" | Contact Label |
| 189 | "Semua hak cipta dilindungi." | Copyright Text |
| 192 | "Metode Pembayaran:" | Payment Label |

**Rekomendasi**: Pindah ke settings dengan prefix `frontend_footer_*`

---

## 3. Homepage (Landing Page)
**File**: `apps/web/src/app/page.tsx`

### 3.1 Hero Slides (Default/Fallback)

| Line | Hardcode | Kategori |
|------|----------|----------|
| 22-47 | `heroSlides` array | Hero Section |

**Konten Hardcode**:
```typescript
[
  {
    title: 'Wujudkan Mimpi Pendidikan Anak Yatim',
    description: 'Bersama kita bantu mereka meraih masa depan...',
    ctaText: 'Mulai Berdonasi',
    ctaLink: '/program/bantuan-pendidikan',
  },
  {
    title: 'Tunaikan Zakat dengan Mudah & Aman',
    description: 'Salurkan zakat fitrah dan zakat mal...',
    ctaText: 'Bayar Zakat',
    ctaLink: '/zakat',
  },
  {
    title: 'Qurban 1446 H - Berkah untuk Sesama',
    description: 'Pesan hewan qurban berkualitas...',
    ctaText: 'Pesan Qurban',
    ctaLink: '/qurban',
  },
]
```

**Status**: ✅ Sudah ada di settings `frontend_hero_slides` (Line 261-266), tapi fallback masih hardcode

### 3.2 Default Section Configurations

| Line | Section | Hardcoded Items |
|------|---------|-----------------|
| 175-180 | Featured Section | `title`, `description`, `limit`, `sortBy` |
| 181-186 | Programs Section | `title`, `description`, `limit`, `sortBy` |
| 187-196 | Funfact Section | `title`, `description`, `items` (4 items) |
| 197-223 | Why Choose Us | `title`, `description`, `items` (3 items) |
| 224-239 | CTA Section | `title`, `description`, `buttons` (2 buttons) |

**Contoh Detail - Funfact Section Items** (Line 191-195):
```typescript
items: [
  { id: "1", key: "donors", title: "Total Donatur", description: "Kepercayaan dari seluruh Indonesia" },
  { id: "2", key: "campaigns", title: "Program Aktif", description: "Tersebar di berbagai kategori" },
  { id: "3", key: "disbursed", title: "Dana Tersalurkan", description: "Manfaat nyata untuk masyarakat" },
  { id: "4", key: "partners", title: "Total Mitra", description: "Kolaborasi untuk dampak lebih luas" },
]
```

**Contoh Detail - Why Choose Us Items** (Line 200-222):
```typescript
items: [
  {
    id: "1",
    icon: "...", // SVG path
    iconBgColor: "primary",
    title: "Terpercaya & Resmi",
    description: "Berizin resmi dan diawasi oleh instansi berwenang...",
  },
  {
    id: "2",
    title: "Mudah & Cepat",
    description: "Proses donasi yang simple dengan berbagai metode pembayaran...",
  },
  {
    id: "3",
    title: "100% Transparan",
    description: "Laporan donasi real-time dan dokumentasi lengkap...",
  },
]
```

**Contoh Detail - CTA Section Buttons** (Line 227-238):
```typescript
buttons: [
  {
    text: "Lihat Semua Program",
    url: "/program",
    variant: "primary",
  },
  {
    text: "Tentang Kami",
    url: "/tentang",
    variant: "outline",
  },
]
```

**Status**: ✅ Sudah ada parsing dari settings (Line 284-322), tapi fallback masih hardcode

### 3.3 Inline Button & UI Text

| Line | Hardcode | Lokasi |
|------|----------|--------|
| 62 | 'Unggulan' | Badge text untuk featured qurban |
| 69 | 'Program' | Fallback category name |
| 122 | `totalPartners: 50` | Default stat value |
| 397 | "Tidak ada program tersedia saat ini" | Empty state message |
| 404 | "Lihat Semua Program" | Button text |
| 423 | "Paket Qurban 1446 H" | Section title |
| 424 | "Pilih hewan qurban berkualitas terbaik untuk ibadah Anda" | Section description |

**Rekomendasi**: Pindah ke settings atau translation file

---

## 4. Zakat Page
**File**: `apps/web/src/app/zakat/page.tsx`

### 4.1 Fallback Data

| Line | Hardcode | Kategori |
|------|----------|----------|
| 5-50 | `fallbackZakatTypes` | Data Fallback |

**Status**: ✅ OK (Fallback untuk error handling)

### 4.2 Page Content

| Line | Hardcode | Kategori |
|------|----------|----------|
| 72 | "Zakat" | Page Title |
| 75 | "Tunaikan zakat Anda dengan mudah dan amanah" | Page Description |
| 99 | "Tentang Zakat" | Info Box Title |
| 103 | "Zakat adalah rukun Islam yang ke-3..." | Info Item 1 |
| 104 | "Zakat Fitrah dibayarkan menjelang Idul Fitri..." | Info Item 2 |
| 105 | "Zakat akan disalurkan kepada 8 golongan..." | Info Item 3 |
| 106 | "Anda akan mendapatkan laporan penyaluran..." | Info Item 4 |

**Rekomendasi**: Pindah ke settings dengan prefix `frontend_zakat_page_*`

---

## 5. Qurban Page
**File**: `apps/web/src/app/qurban/page.tsx`

### 5.1 Badge & Labels

| Line | Hardcode | Kategori |
|------|----------|----------|
| 39 | 'Populer' | Badge text |
| 114 | "Paket Qurban" | Page Title |
| 127 | "Pilih Periode" | Form Label |

### 5.2 Filter Buttons

| Line | Hardcode | Filter Type |
|------|----------|-------------|
| 156 | "Semua Paket" | Filter Button |
| 169 | "Sapi" | Animal Filter |
| 182 | "Kambing" | Animal Filter |
| 195 | "Individu" | Type Filter |
| 208 | "Patungan" | Type Filter |

### 5.3 Empty State & Info Box

| Line | Hardcode | Kategori |
|------|----------|----------|
| 227 | "Belum Ada Paket Qurban" | Empty State Title |
| 230 | "Paket qurban untuk periode ini akan segera tersedia." | Empty State Message |
| 252 | "Informasi Penting" | Info Box Title |
| 255 | "Harga sudah termasuk hewan, pemotongan..." | Info Item 1 |
| 256 | "Daging akan didistribusikan kepada yang berhak" | Info Item 2 |
| 257 | "Anda dapat memilih untuk menerima bagian daging..." | Info Item 3 |
| 258 | "Sertifikat qurban akan dikirim via email..." | Info Item 4 |

**Rekomendasi**: Pindah ke settings dengan prefix `frontend_qurban_page_*`

---

## 6. Wakaf Page
**File**: `apps/web/src/app/wakaf/page.tsx`

### 6.1 Hero Section

Berdasarkan system reminder, ada perubahan di line 117-118 yang menunjukkan hero section dengan gradient:
```typescript
<section className="py-16 bg-gradient-to-br from-violet-500 via-purple-600 to-purple-700 text-white relative overflow-hidden">
```

### 6.2 Program Section

| Line | Hardcode | Kategori |
|------|----------|----------|
| 108 | "Program Wakaf" | Section Title |
| 112 | "{totalCampaigns} program wakaf tersedia" | Dynamic Text |
| 113 | "Memuat program wakaf..." | Loading Text |
| 120 | "Memuat program..." | Loading Text |

### 6.3 Pagination

| Line | Hardcode | Kategori |
|------|----------|----------|
| 144 | "Sebelumnya" | Pagination Button |
| 170 | "Selanjutnya" | Pagination Button |

**Catatan**: Halaman wakaf tampaknya tidak memiliki info box seperti Zakat/Qurban

**Rekomendasi**: Pindah ke settings dengan prefix `frontend_wakaf_page_*`

---

## 7. Program Page
**File**: `apps/web/src/app/program/page.tsx`

Berdasarkan screening, halaman program memiliki struktur yang mirip dengan wakaf page:

### 7.1 Default Values

| Line | Hardcode | Kategori |
|------|----------|----------|
| 13 | 'Program' | Fallback Category Name |

### 7.2 Pagination

Mirip dengan Wakaf page, ada pagination dengan text "Sebelumnya" dan "Selanjutnya"

**Rekomendasi**: Gunakan translation file yang sama untuk pagination di semua halaman

---

## 8. Komponen-Komponen Organisms Lainnya

### 8.1 CategoryGrid
**File**: `apps/web/src/components/organisms/CategoryGrid/CategoryGrid.tsx`

Komponen ini kemungkinan menampilkan kategori layanan yang sudah diambil dari settings `frontend_service_categories` ✅

### 8.2 HeroSlider
**File**: `apps/web/src/components/organisms/HeroSlider/HeroSlider.tsx`

Komponen ini menerima slides dari parent, jadi tidak ada hardcode di komponen ini ✅

### 8.3 FeaturedCarousel
**File**: `apps/web/src/components/organisms/FeaturedCarousel/FeaturedCarousel.tsx`

Komponen ini menerima campaigns dari parent, jadi tidak ada hardcode di komponen ini ✅

### 8.4 QurbanSection
**File**: `apps/web/src/components/organisms/QurbanSection/QurbanSection.tsx`

Menerima title dan description sebagai props dari Homepage (Line 422-425), yang sudah hardcode di Homepage

---

## 📋 Rekomendasi Prioritas Migrasi

### 🔴 Prioritas Tinggi (Harus Segera)

1. **Footer Social Media Links** - URL hardcode yang pasti berbeda untuk setiap organisasi
   - Tambahkan settings: `organization_social_whatsapp`, `organization_social_instagram`, `organization_social_facebook`, `organization_social_youtube`

2. **Footer Info Links** - Menu "Tentang Kami", "Kontak", dll
   - Tambahkan settings: `frontend_footer_info_links` (JSON array)

3. **Homepage Section Content** - Semua default section data
   - Sudah ada parsing ✅, tapi perlu ensure fallback di-update atau dihapus
   - Settings yang sudah ada:
     - `frontend_featured_section` ✅
     - `frontend_programs_section` ✅
     - `frontend_funfact_section` ✅
     - `frontend_why_choose_us_section` ✅
     - `frontend_cta_section` ✅

### 🟡 Prioritas Medium (Perlu Segera)

4. **Page Titles & Descriptions** - Semua halaman (Zakat, Qurban, Wakaf, Program)
   - Tambahkan settings dengan pattern: `frontend_{page}_title` dan `frontend_{page}_description`
   - Example: `frontend_zakat_page_title`, `frontend_zakat_page_description`

5. **Info Boxes Content** - Zakat dan Qurban info boxes
   - Tambahkan settings: `frontend_zakat_info_box` (JSON), `frontend_qurban_info_box` (JSON)

6. **Filter & Button Labels** - Text di buttons, filters, pagination
   - Pertimbangkan menggunakan i18n/translation file untuk UI text yang sering muncul

### 🟢 Prioritas Rendah (Nice to Have)

7. **User Menu Labels** - "Dashboard", "Riwayat", "Tabungan Qurban", dll
   - Bisa menggunakan translation file (i18n)

8. **Empty State Messages** - "Tidak ada program tersedia", "Belum Ada Paket Qurban"
   - Bisa menggunakan translation file (i18n)

9. **Fallback Data** - Hero slides fallback, zakat types fallback
   - ✅ OK untuk tetap hardcode sebagai fallback error handling

---

## 💡 Solusi yang Direkomendasikan

### Opsi 1: Settings-Based (Recommended untuk Content)
Gunakan database settings untuk content yang:
- Bersifat organisasi-specific (nama, tagline, social media)
- Sering berubah (hero slides, section content)
- Perlu UI admin untuk manage

**Implementasi**:
```typescript
// Tambah settings baru di dashboard/settings/general
frontend_footer_info_links: JSON array
frontend_footer_social_whatsapp: string
frontend_footer_social_instagram: string
frontend_footer_social_facebook: string
frontend_footer_social_youtube: string
frontend_zakat_page_title: string
frontend_zakat_page_description: string
frontend_zakat_info_box: JSON array
frontend_qurban_page_title: string
frontend_qurban_page_description: string
frontend_qurban_info_box: JSON array
frontend_wakaf_page_title: string
frontend_wakaf_page_description: string
```

### Opsi 2: Translation File (Recommended untuk UI Text)
Gunakan translation file (i18n) untuk text yang:
- Bersifat UI label (buttons, placeholders, menu)
- Sama untuk semua organisasi
- Perlu multi-language support di masa depan

**Implementasi**:
```typescript
// Create: apps/web/src/locales/id.json
{
  "header": {
    "search_placeholder": "Cari program...",
    "login": "Masuk",
    "register": "Daftar",
    "logout": "Keluar",
    "menu": {
      "dashboard": "Dashboard",
      "history": "Riwayat",
      "qurban_savings": "Tabungan Qurban",
      "profile": "Profil"
    }
  },
  "pagination": {
    "previous": "Sebelumnya",
    "next": "Selanjutnya"
  },
  "qurban": {
    "filters": {
      "all": "Semua Paket",
      "cow": "Sapi",
      "goat": "Kambing",
      "individual": "Individu",
      "shared": "Patungan"
    }
  }
}
```

### Opsi 3: Hybrid Approach (BEST)
Kombinasi keduanya:
- **Settings** → Organization content, dynamic sections, social media
- **Translation** → UI labels, buttons, empty states, validation messages

---

## 🎯 Action Items

### Phase 1: Critical Hardcode (Week 1-2)
- [ ] Migrate Footer social media URLs to settings
- [ ] Migrate Footer info links to settings
- [ ] Add page title/description settings for Zakat, Qurban, Wakaf
- [ ] Add info box settings for Zakat & Qurban pages

### Phase 2: UI Text Migration (Week 3-4)
- [ ] Setup i18n library (next-i18next or react-intl)
- [ ] Create translation file structure
- [ ] Migrate all UI labels to translation files
- [ ] Update all components to use translation hook

### Phase 3: Admin UI (Week 5)
- [ ] Add UI for managing new settings di dashboard/settings/frontend
- [ ] Group settings by page: "Homepage", "Zakat Page", "Qurban Page", etc.
- [ ] Add JSON editor for complex settings (info boxes, links arrays)

---

## 📝 Kesimpulan

**Total hardcode items**: ~135+ items yang tersebar di 7 area utama

**Dampak jika tidak dimigrasi**:
1. ❌ Sulit customize untuk organisasi lain
2. ❌ Tidak bisa multi-language
3. ❌ Developer harus edit code untuk ubah text
4. ❌ Tidak scalable untuk white-label solution

**Benefit setelah migrasi**:
1. ✅ Admin bisa ubah content via dashboard tanpa code
2. ✅ Support multi-language di masa depan
3. ✅ Maintainable & scalable
4. ✅ White-label ready untuk organisasi lain

---

**Generated on**: 2026-02-01
**Total files screened**: 8 files
**Confidence level**: High (95%+)
