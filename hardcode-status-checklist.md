# Status Checklist: Hardcode Migration
**Last Updated**: 2026-02-02
**Berdasarkan**: hardcode-front-end.md

---

## Legend
- ✅ **Sudah Migrasi** - Settings sudah ada dan digunakan
- 🟡 **Partial** - Settings ada tapi masih ada hardcode fallback
- ❌ **Belum Migrasi** - Masih 100% hardcode
- ⚪ **OK (Fallback)** - Boleh hardcode sebagai fallback

---

## 1. Header Component
**File**: `apps/web/src/components/organisms/Header/Header.tsx`

| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Fallback Menu Items | ⚪ OK | - | Fallback jika settings kosong |
| Search Placeholder ("Cari program...") | ❌ | `frontend_search_placeholder` | Hardcode di line 150, 284 |
| User Menu Labels | ❌ | - | "Dashboard", "Riwayat", "Tabungan Qurban", dll |
| Login/Register Button Text | ❌ | - | "Masuk", "Daftar", "Keluar" |

**Summary**: 0/4 items migrated

---

## 2. Footer Component
**File**: `apps/web/src/components/organisms/Footer/Footer.tsx`

| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Program Links | ✅ | `frontend_service_categories` | Line 140-154, dengan fallback ke defaultProgramLinks |
| Footer Menu Columns | ✅ | `frontend_footer_menu` | Line 158-176, dynamic columns termasuk About/Info links |
| About/Info Links | ✅ | `frontend_footer_menu` | Included in dynamic columns, fallback ke aboutLinks jika kosong |
| Social Media URLs | ✅ | `social_media_facebook`, `social_media_instagram`, dll | Line 179-185 |
| Section Titles | ✅ | `frontend_footer_menu` | Dynamic dari column titles dalam settings |
| Contact Labels | ❌ | - | "WhatsApp:", "Semua hak cipta dilindungi", dll |
| Organization Name/Tagline | ✅ | `organization_name`, `organization_tagline` | Sudah digunakan |

**Summary**: 6/7 categories migrated

---

## 3. Homepage (Landing Page)
**File**: `apps/web/src/app/page.tsx`

### 3.1 Hero Slider
| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Hero Slides | ✅ | `frontend_hero_slides` | Line 261-266, dengan fallback hardcode |

### 3.2 Section Configurations
| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Service Categories | ✅ | `frontend_service_categories` | Line 269-274 |
| Featured Section | ✅ | `frontend_featured_section` | Line 285-289 |
| Programs Section | ✅ | `frontend_programs_section` | Line 293-297 |
| Funfact Section | ✅ | `frontend_funfact_section` | Line 301-305 |
| Why Choose Us Section | ✅ | `frontend_why_choose_us_section` | Line 309-313 |
| CTA Section | ✅ | `frontend_cta_section` | Line 317-321 |

### 3.3 Inline UI Text
| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| "Unggulan" Badge | ❌ | - | Line 62, hardcode |
| "Program" Fallback | ⚪ OK | - | Line 69, fallback category name |
| Empty State Messages | ❌ | - | "Tidak ada program tersedia saat ini" |
| Button Labels | ❌ | - | "Lihat Semua Program" |
| Qurban Section Title/Desc | ❌ | - | Line 423-424, hardcode |

**Summary**: 7/12 items migrated

---

## 4. Zakat Page
**File**: `apps/web/src/app/zakat/page.tsx`

| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Fallback Zakat Types | ⚪ OK | - | Line 5-50, fallback data |
| Page Title | ✅ | `frontend_zakat_page.title` | Sudah dinamis dari settings |
| Page Description | ✅ | `frontend_zakat_page.description` | Sudah dinamis dari settings |
| Info Box Title | ✅ | `frontend_zakat_page.infoTitle` | Sudah dinamis dari settings |
| Info Box Items | ✅ | `frontend_zakat_page.infoItems` | Sudah dinamis dari settings |

**Summary**: 4/5 items migrated (excluding OK fallback)

---

## 5. Qurban Page
**File**: `apps/web/src/app/qurban/page.tsx`

| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Page Title | ✅ | `frontend_qurban_page.title` | Sudah dinamis dari settings |
| Page Description | ✅ | `frontend_qurban_page.description` | Sudah dinamis dari settings |
| Badge Text | ❌ | - | "Populer" di line 39 |
| Form Labels | ❌ | - | "Pilih Periode" di line 133 |
| Filter Buttons | ❌ | - | "Semua Paket", "Sapi", "Kambing", "Individu", "Patungan" |
| Empty State | ❌ | - | "Belum Ada Paket Qurban" di line 227 |
| Info Box Title | ✅ | `frontend_qurban_page.infoTitle` | Sudah dinamis dari settings |
| Info Box Items | ✅ | `frontend_qurban_page.infoItems` | Sudah dinamis dari settings |

**Summary**: 4/8 items migrated

---

## 6. Wakaf Page
**File**: `apps/web/src/app/wakaf/page.tsx`

| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Page Title | ✅ | `frontend_wakaf_page.title` | Sudah dinamis dari settings |
| Page Description | ✅ | `frontend_wakaf_page.description` | Sudah dinamis dari settings |
| Loading Text | ❌ | - | "Memuat program wakaf..." di line 113 |
| Pagination Labels | ❌ | - | "Sebelumnya", "Selanjutnya" di line 144, 170 |

**Summary**: 2/4 items migrated

---

## 7. Program Page
**File**: `apps/web/src/app/program/page.tsx`

| Item | Status | Setting Key | Notes |
|------|--------|-------------|-------|
| Page Title | ✅ | `frontend_program_page.title` | Sudah dinamis dari settings |
| Page Description | ✅ | `frontend_program_page.description` | Sudah dinamis dari settings |
| Fallback Category Name | ⚪ OK | - | 'Program' di line 13 |
| Pagination Labels | ❌ | - | Same as Wakaf page |

**Summary**: 2/3 items migrated (excluding fallback)

---

## 📊 Overall Summary

| Area | Items Checked | Migrated | Partial | Not Migrated | Fallback OK |
|------|--------------|----------|---------|--------------|-------------|
| **Header** | 4 | 0 | 0 | 4 | 0 |
| **Footer** | 7 | 6 | 0 | 1 | 0 |
| **Homepage** | 12 | 7 | 0 | 4 | 1 |
| **Zakat Page** | 5 | 4 | 0 | 0 | 1 |
| **Qurban Page** | 8 | 4 | 0 | 4 | 0 |
| **Wakaf Page** | 4 | 2 | 0 | 2 | 0 |
| **Program Page** | 3 | 2 | 0 | 0 | 1 |
| **TOTAL** | **43** | **25** (58%) | **0** (0%) | **15** (35%) | **3** (7%) |

---

## 🎯 Priority Actions (Berdasarkan Impact)

### 🔴 Critical (Do First)
1. ~~**Footer About Links**~~ ✅ - Sudah dinamis via `frontend_footer_menu`
   - Setting: `frontend_footer_menu` (JSON array with URL autocomplete)
   - Status: DONE - Bisa manage dari admin

2. ~~**Zakat Page Content**~~ ✅ - Title, description, info box
   - Settings: `frontend_zakat_page`
   - Status: DONE

3. ~~**Qurban Page Content**~~ ✅ - Title, description, info box
   - Settings: `frontend_qurban_page`
   - Status: DONE

### 🟡 Medium Priority
4. ~~**Page Titles & Descriptions**~~ ✅ - All pages done (Zakat, Qurban, Wakaf, Program)
   - Settings: All page settings completed

5. **UI Labels** - Filter buttons, pagination, empty states
   - Solution: Translation file (i18n)
   - Impact: Medium - Reusable di banyak tempat

### 🟢 Low Priority
6. **Header Menu Labels** - "Dashboard", "Riwayat", dll
   - Solution: Translation file (i18n)
   - Impact: Low - Standard UI text

7. **Search Placeholder** - "Cari program..."
   - Setting: `frontend_search_placeholder`
   - Impact: Low - Nice to have

---

## ✅ What's Working Well

1. **Homepage Sections** ✅
   - Hero slider
   - Featured section
   - Programs section
   - Funfact section
   - Why choose us section
   - CTA section
   - Semuanya sudah dinamis!

2. **Footer Columns** ✅
   - Baru saja dibuat `frontend_footer_menu`
   - Dynamic columns dengan URL autocomplete

3. **Service Categories** ✅
   - `frontend_service_categories` dengan iconSvg
   - Digunakan di Homepage CategoryGrid & Footer

4. **Social Media** ✅
   - All social media links dari settings

---

## 📝 Recommended Next Steps

### Phase 1: Complete Footer (Week 1)
- [ ] Add `frontend_footer_info_links` setting
- [ ] Create UI in admin `/dashboard/settings/frontend`
- [ ] Update Footer component to use setting
- [ ] Test & verify

### Phase 2: Page Content Settings (Week 2)
- [ ] Add settings untuk Zakat page: title, description, info box
- [ ] Add settings untuk Qurban page: title, info box
- [ ] Add settings untuk Wakaf page: title, description
- [ ] Create admin UI for all page settings
- [ ] Update page components

### Phase 3: Translation/i18n (Week 3)
- [ ] Setup i18n library (next-i18next)
- [ ] Create translation files (id.json, en.json)
- [ ] Migrate all UI labels ke translation
- [ ] Update components to use translation hook

### Phase 4: Admin UI Polish (Week 4)
- [ ] Group settings by page in admin
- [ ] Add JSON editor for complex settings
- [ ] Add preview/validation
- [ ] Documentation

---

**Progress**: 25/43 (58%) migrated to settings
**Target**: 38/43 (88%) migrated (keep fallback hardcode)
**Estimated Time**: 1-2 weeks for complete migration
