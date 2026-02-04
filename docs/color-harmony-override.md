# Color Harmony Override - Laziswaf Darunnajah
## Rencana Komprehensif Implementasi Brand Colors

> **Tujuan**: Mengintegrasikan Color Harmony Laziswaf Darunnajah ke dalam sistem color Tailwind CSS dan SCSS, menggantikan default blue colors dengan brand identity yang konsisten.

---

## 📋 Executive Summary

### Current State (Sebelum Override)
- ❌ Primary color: Blue (`#0ea5e9`) - Tidak match dengan brand
- ❌ Success: Generic green (`#22c55e`)
- ❌ Semantic colors: Generic Tailwind defaults
- ✅ Gray scale: OK, bisa dipertahankan

### Target State (Setelah Override)
- ✅ Primary: **Darunnajah Green** (`#009B4C`)
- ✅ Secondary: **Trust Blue** (`#1B3C87`)
- ✅ Accent: **Laziswaf Gold** (`#F58220`)
- ✅ Success: Tetap green tapi adjust ke brand green
- ✅ Semantic colors: Sesuai color harmony guide

---

## 🎨 Color Mapping Strategy

### 1. Primary Color → Darunnajah Green
**Source**: Color Harmony - Warna Utama
**Brand Color**: `#009B4C` (Darunnajah Green)

| Shade | Old (Blue) | New (Green) | Usage |
|-------|-----------|-------------|-------|
| 50 | `#f0f9ff` | `#E5F5EA` | Ultra light background |
| 100 | `#e0f2fe` | `#CCF0DD` | Light background, hover states |
| 200 | `#bae6fd` | `#99E1BB` | Subtle borders |
| 300 | `#7dd3fc` | `#66D299` | Disabled states |
| 400 | `#38bdf8` | `#4EBC7A` | Light tint (hover button) |
| 500 | `#0ea5e9` | **`#009B4C`** | **Default brand green** |
| 600 | `#0284c7` | `#008040` | Hover/active states |
| 700 | `#0369a1` | `#006833` | Dark shade for text |
| 800 | `#075985` | `#005128` | Very dark green |
| 900 | `#0c4a6e` | `#00391E` | Darkest green |

**Implementasi:**
- Ganti semua `bg-primary-*`, `text-primary-*`, `border-primary-*`
- Buttons utama: `btn-primary` → Green
- Links: Default → Green
- Active nav: → Green

---

### 2. Secondary Color → Trust Blue
**Source**: Color Harmony - Warna Utama
**Brand Color**: `#1B3C87` (Trust Blue)

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#E8EBF5` | Ultra light blue background |
| 100 | `#C8D0E8` | Light background |
| 200 | `#A1AECF` | Subtle elements |
| 300 | `#7A8CB6` | Muted blue |
| 400 | `#53699D` | Medium blue |
| 500 | **`#1B3C87`** | **Default trust blue** |
| 600 | `#16306C` | Darker blue |
| 700 | `#112451` | Dark blue for text |
| 800 | `#0C1836` | Very dark blue |
| 900 | `#060C1B` | Darkest blue |

**Implementasi:**
- Headings utama: `text-secondary-700` atau `text-secondary-900`
- Secondary buttons: `btn-secondary` → Blue outline
- Professional elements: Badge, info cards
- Trust indicators: Security badges, verification

---

### 3. Accent Color → Laziswaf Gold
**Source**: Color Harmony - Warna Utama
**Brand Color**: `#F58220` (Laziswaf Gold)

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#FEF4E8` | Ultra light gold background |
| 100 | `#FDE4C8` | Light gold |
| 200 | `#FCC99A` | Soft gold |
| 300 | `#FAAE6C` | Medium gold |
| 400 | `#F7973E` | Light gold accent |
| 500 | **`#F58220`** | **Default Laziswaf gold** |
| 600 | `#E0721A` | Darker gold |
| 700 | `#C56215` | Dark gold |
| 800 | `#A35211` | Very dark gold |
| 900 | `#6B360B` | Darkest gold |

**Implementasi:**
- CTA buttons: "Donasi Sekarang" → Gold gradient
- Urgent badges: → Gold with pulse animation
- Featured tags: → Gold
- Progress bars: → Gold fill
- Notifications important: → Gold

---

### 4. Success Color → Adjusted Green (Tetap Hijau tapi Harmonis)
**Rationale**: Success tetap hijau, tapi kita adjust agar harmonis dengan Darunnajah Green

| Shade | Old | New (Harmonized) | Note |
|-------|-----|------------------|------|
| 50 | `#f0fdf4` | `#E8F5EF` | Slightly adjusted |
| 100 | `#dcfce7` | `#D1F0E0` | More teal undertone |
| 500 | `#22c55e` | **`#10B981`** | Keep this, already harmonious |
| 600 | `#16a34a` | `#059669` | Darker success |
| 700 | `#15803d` | `#047857` | Dark success |

**Implementasi:**
- Success messages: Keep current green
- Checkmarks, completion icons: Green
- Success banners: Light green background

---

### 5. Danger/Error Color → Adjusted Red (Komplementer)
**Source**: Color Harmony - Komplementer
**Brand Color**: `#C92424` (Merah Bata)

| Shade | Old | New | Note |
|-------|-----|-----|------|
| 50 | `#fef2f2` | `#FEF1F1` | Very light red |
| 100 | `#fee2e2` | `#FDD8D8` | Light red |
| 200 | `#fecaca` | `#FCADAD` | Soft red |
| 500 | `#ef4444` | **`#C92424`** | **Brand complementary red** |
| 600 | `#dc2626` | `#A81D1D` | Darker red |
| 700 | `#b91c1c` | `#871616` | Dark red |

**Implementasi:**
- Error messages: Red
- Delete buttons: Red with confirmation
- Critical warnings: Red
- **Gunakan sparingly** (sesuai guide: "Gunakan sangat sedikit")

---

### 6. Warning Color → Adjusted Orange/Gold
**Rationale**: Warning bisa pakai gold variant untuk consistency

| Shade | Old | New | Note |
|-------|-----|-----|------|
| 50 | `#fffbeb` | `#FEF8E8` | Very light warning |
| 100 | `#fef3c7` | `#FDF0CC` | Light warning |
| 200 | `#fde68a` | `#FCE499` | Soft warning |
| 500 | `#f59e0b` | **`#F58220`** | **Use Laziswaf Gold** |
| 600 | `#d97706` | `#E0721A` | Darker warning |
| 700 | `#b45309` | `#C56215` | Dark warning |

**Implementasi:**
- Warning banners: Gold background
- Info badges: Gold
- Pending status: Gold

---

## 📂 File Structure yang Perlu Diupdate

### 1. Tailwind Configuration
```
apps/admin/tailwind.config.ts
```
**Action**: Replace entire colors object dengan brand colors

### 2. SCSS Variables
```
apps/admin/src/styles/utils/_variables.scss
```
**Action**: Update all color variables

### 3. Global Styles
```
apps/admin/src/styles/main.scss
```
**Action**: Verify @layer base body colors

### 4. Component Styles (Review & Update)
```
apps/admin/src/styles/components/
├── _buttons.scss        ← Update primary button colors
├── _forms.scss          ← Update focus colors
├── _cards.scss          ← Update border/shadow colors
├── _modal.scss          ← Update backdrop/header colors
├── _table.scss          ← Update header colors
├── _autocomplete.scss   ← Update highlight colors
├── _pagination.scss     ← Update active state
└── _media-library.scss  ← Update selected state
```

### 5. Layout Styles
```
apps/admin/src/styles/layouts/
├── _sidebar.scss        ← Update active nav colors
└── _dashboard.scss      ← Update header/card colors
```

### 6. Documentation Update
```
COLORS.md                ← Update primary color documentation
docs/color-harmony.md    ← Keep as reference
```

---

## 🔧 Implementation Steps

### Phase 1: Preparation (15 mins)
- [ ] Backup current `tailwind.config.ts`
- [ ] Backup current `_variables.scss`
- [ ] Create branch: `feature/color-harmony-override`
- [ ] Review current usage dengan search: `bg-primary`, `text-primary`, `border-primary`

### Phase 2: Core Update (30 mins)
- [ ] Update `tailwind.config.ts`:
  - Replace `primary` colors → Darunnajah Green scale
  - Add `secondary` colors → Trust Blue scale
  - Add `accent` colors → Laziswaf Gold scale
  - Update `success` → Harmonized green
  - Update `danger` → Brand red
  - Update `warning` → Gold variant
  - Keep `gray` scale (unchanged)

- [ ] Update `_variables.scss`:
  - Mirror Tailwind colors as SCSS variables
  - Add gradient variables for gold CTA
  - Add harmony color groups (monochromatic, analogous)

### Phase 3: Component Updates (45 mins)
- [ ] **Buttons** (`_buttons.scss`):
  - `.btn-primary` → Green with white text
  - `.btn-primary:hover` → Darker green (`#006833`)
  - `.btn-secondary` → Blue outline
  - `.btn-accent` → Gold gradient
  
- [ ] **Forms** (`_forms.scss`):
  - Input focus: → Green border
  - Checkbox checked: → Green
  - Radio selected: → Green
  
- [ ] **Navigation** (`_sidebar.scss`):
  - Active state: → Green background
  - Hover state: → Light green
  
- [ ] **Links**:
  - Default link color: → Green
  - Hover: → Dark green

### Phase 4: Semantic Element Updates (30 mins)
- [ ] Success elements: Keep current green (already harmonious)
- [ ] Error elements: → Brand red (`#C92424`)
- [ ] Warning elements: → Gold (`#F58220`)
- [ ] Info elements: → Trust Blue (`#1B3C87`)

### Phase 5: Testing (30 mins)
- [ ] Test all pages:
  - [ ] Login page
  - [ ] Dashboard
  - [ ] Campaigns
  - [ ] Donations
  - [ ] Reports
  - [ ] Settings
  
- [ ] Test all components:
  - [ ] Buttons (primary, secondary, accent)
  - [ ] Forms (inputs, selects, checkboxes)
  - [ ] Modals (VendorModal, EmployeeModal, etc)
  - [ ] Tables (headers, pagination)
  - [ ] Cards (borders, shadows)
  
- [ ] Test states:
  - [ ] Hover states
  - [ ] Active states
  - [ ] Disabled states
  - [ ] Focus states

### Phase 6: Documentation (15 mins)
- [ ] Update `COLORS.md`:
  - Document new primary color (Green)
  - Document secondary color (Blue)
  - Document accent color (Gold)
  - Add usage examples
  - Add color harmony principles
  
- [ ] Create usage guide:
  - When to use primary (Green)
  - When to use secondary (Blue)
  - When to use accent (Gold)
  - Accessibility notes (contrast ratios)

---

## 📝 Detailed Code Changes

### 1. Tailwind Config Update

```typescript
// apps/admin/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY: Darunnajah Green
        primary: {
          50: '#E5F5EA',   // Ultra light
          100: '#CCF0DD',  // Light background
          200: '#99E1BB',  // Subtle borders
          300: '#66D299',  // Disabled
          400: '#4EBC7A',  // Light tint (hover)
          500: '#009B4C',  // Default brand green
          600: '#008040',  // Hover/active
          700: '#006833',  // Dark shade for text
          800: '#005128',  // Very dark
          900: '#00391E',  // Darkest
        },
        
        // SECONDARY: Trust Blue
        secondary: {
          50: '#E8EBF5',
          100: '#C8D0E8',
          200: '#A1AECF',
          300: '#7A8CB6',
          400: '#53699D',
          500: '#1B3C87',  // Default trust blue
          600: '#16306C',
          700: '#112451',
          800: '#0C1836',
          900: '#060C1B',
        },
        
        // ACCENT: Laziswaf Gold
        accent: {
          50: '#FEF4E8',
          100: '#FDE4C8',
          200: '#FCC99A',
          300: '#FAAE6C',
          400: '#F7973E',
          500: '#F58220',  // Default Laziswaf gold
          600: '#E0721A',
          700: '#C56215',
          800: '#A35211',
          900: '#6B360B',
        },
        
        // SUCCESS: Harmonized Green
        success: {
          50: '#E8F5EF',
          100: '#D1F0E0',
          200: '#A3E1C1',
          300: '#75D2A2',
          400: '#47C383',
          500: '#10B981',  // Keep harmonious green
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        
        // DANGER: Brand Complementary Red
        danger: {
          50: '#FEF1F1',
          100: '#FDD8D8',
          200: '#FCADAD',
          300: '#FA8282',
          400: '#F85757',
          500: '#C92424',  // Brand red
          600: '#A81D1D',
          700: '#871616',
          800: '#660F0F',
          900: '#450808',
        },
        
        // WARNING: Gold Variant
        warning: {
          50: '#FEF8E8',
          100: '#FDF0CC',
          200: '#FCE499',
          300: '#FAD866',
          400: '#F8CC33',
          500: '#F58220',  // Use Laziswaf Gold
          600: '#E0721A',
          700: '#C56215',
          800: '#A35211',
          900: '#6B360B',
        },
        
        // INFO: Trust Blue (same as secondary)
        info: {
          50: '#E8EBF5',
          100: '#C8D0E8',
          500: '#1B3C87',
          600: '#16306C',
          700: '#112451',
        },
        
        // GRAY: Keep current (neutral, works with all brands)
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      
      // GRADIENT UTILITIES
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #F58220 0%, #FFA726 100%)',
        'gradient-green': 'linear-gradient(135deg, #009B4C 0%, #4EBC7A 100%)',
        'gradient-blue': 'linear-gradient(135deg, #1B3C87 0%, #53699D 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 2. SCSS Variables Update

```scss
// apps/admin/src/styles/utils/_variables.scss

// ===========================
// BRAND COLORS - LAZISWAF DARUNNAJAH
// ===========================

// PRIMARY: Darunnajah Green
$primary-50: #E5F5EA;
$primary-100: #CCF0DD;
$primary-200: #99E1BB;
$primary-300: #66D299;
$primary-400: #4EBC7A;
$primary-500: #009B4C;  // Default
$primary-600: #008040;
$primary-700: #006833;
$primary-800: #005128;
$primary-900: #00391E;

// SECONDARY: Trust Blue
$secondary-50: #E8EBF5;
$secondary-100: #C8D0E8;
$secondary-200: #A1AECF;
$secondary-300: #7A8CB6;
$secondary-400: #53699D;
$secondary-500: #1B3C87;  // Default
$secondary-600: #16306C;
$secondary-700: #112451;
$secondary-800: #0C1836;
$secondary-900: #060C1B;

// ACCENT: Laziswaf Gold
$accent-50: #FEF4E8;
$accent-100: #FDE4C8;
$accent-200: #FCC99A;
$accent-300: #FAAE6C;
$accent-400: #F7973E;
$accent-500: #F58220;  // Default
$accent-600: #E0721A;
$accent-700: #C56215;
$accent-800: #A35211;
$accent-900: #6B360B;

// SUCCESS: Harmonized Green
$success-50: #E8F5EF;
$success-100: #D1F0E0;
$success-500: #10B981;
$success-600: #059669;
$success-700: #047857;

// DANGER: Brand Red
$danger-50: #FEF1F1;
$danger-100: #FDD8D8;
$danger-200: #FCADAD;
$danger-500: #C92424;
$danger-600: #A81D1D;
$danger-700: #871616;

// WARNING: Gold Variant
$warning-50: #FEF8E8;
$warning-100: #FDF0CC;
$warning-200: #FCE499;
$warning-500: #F58220;
$warning-600: #E0721A;
$warning-700: #C56215;

// INFO: Trust Blue
$info-50: #E8EBF5;
$info-100: #C8D0E8;
$info-500: #1B3C87;
$info-600: #16306C;
$info-700: #112451;

// GRAY: Keep current
$gray-50: #f9fafb;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-300: #d1d5db;
$gray-400: #9ca3af;
$gray-500: #6b7280;
$gray-600: #4b5563;
$gray-700: #374151;
$gray-800: #1f2937;
$gray-900: #111827;

// ===========================
// COLOR HARMONY GROUPS
// ===========================

// Monochromatic Green (untuk backgrounds halus)
$mono-green-base: $primary-500;
$mono-green-light: $primary-400;
$mono-green-ultra-light: $primary-50;
$mono-green-dark: $primary-700;

// Analogous Harmony (hijau + teal + lime)
$analogous-blue-green: #008080;  // Teal
$analogous-darunnajah-green: $primary-500;
$analogous-lime-green: #8CC63F;

// Complementary (untuk accents)
$complementary-green: $primary-500;
$complementary-red: $danger-500;
$complementary-gold: $accent-500;

// ===========================
// GRADIENTS
// ===========================
$gradient-gold: linear-gradient(135deg, #F58220 0%, #FFA726 100%);
$gradient-green: linear-gradient(135deg, #009B4C 0%, #4EBC7A 100%);
$gradient-blue: linear-gradient(135deg, #1B3C87 0%, #53699D 100%);

// ===========================
// SPACING (unchanged)
// ===========================
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;
$spacing-2xl: 3rem;

// ... rest of variables unchanged ...
```

### 3. Button Component Update

```scss
// apps/admin/src/styles/components/_buttons.scss

.btn-primary {
  background: $primary-500;  // Green
  color: white;
  
  &:hover {
    background: $primary-600;  // Darker green
  }
  
  &:active {
    background: $primary-700;
  }
  
  &:disabled {
    background: $primary-300;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: transparent;
  color: $secondary-500;  // Blue
  border: 2px solid $secondary-500;
  
  &:hover {
    background: $secondary-50;
    border-color: $secondary-600;
  }
}

.btn-accent {
  background: $gradient-gold;  // Gold gradient
  color: white;
  border: none;
  
  &:hover {
    filter: brightness(1.1);
  }
}

.btn-success {
  background: $success-500;
  color: white;
  
  &:hover {
    background: $success-600;
  }
}

.btn-danger {
  background: $danger-500;
  color: white;
  
  &:hover {
    background: $danger-600;
  }
}
```

---

## ✅ Verification Checklist

### Visual Consistency
- [ ] All primary buttons are green
- [ ] All headings use Trust Blue or dark gray
- [ ] CTA buttons use gold gradient
- [ ] Success messages are harmonious green
- [ ] Error messages use brand red (sparingly)
- [ ] Sidebar active states are green
- [ ] Form focus borders are green
- [ ] Links are green

### Accessibility
- [ ] Contrast ratio ≥ 4.5:1 for normal text
- [ ] Contrast ratio ≥ 3:1 for large text
- [ ] Color is not the only indicator (use icons too)
- [ ] Test with color blindness simulator

### Cross-browser
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

### Component Testing
- [ ] All helper modals (Vendor, Employee, etc)
- [ ] All forms (Login, Campaign, Donation)
- [ ] All tables (with pagination)
- [ ] All cards
- [ ] All badges and tags

---

## 📊 Impact Analysis

### Low Risk Areas (Safe to Change)
- Buttons (primary, secondary)
- Form focus states
- Link colors
- Badge colors
- Navigation active states

### Medium Risk Areas (Test Carefully)
- Charts and graphs (may have hardcoded colors)
- Rich text editor styles
- Third-party component overrides

### High Risk Areas (Change with Caution)
- Status indicators (success/error/warning) - users familiar with current colors
- Data visualization - may need gradual transition
- Print styles - verify printed documents still look good

---

## 🚀 Migration Strategy

### Option A: Big Bang (Recommended for MVP)
- Change all colors at once
- Test thoroughly
- Deploy in one release
- **Pros**: Consistent immediately, no mixed state
- **Cons**: Higher initial testing burden

### Option B: Gradual Rollout
- Phase 1: Buttons and links
- Phase 2: Forms and inputs
- Phase 3: Navigation
- Phase 4: Semantic colors
- **Pros**: Lower risk, easier to test
- **Cons**: Inconsistent state during transition

**Recommendation**: **Option A** - karena color system adalah fundamental change, lebih baik konsisten dari awal.

---

## 📚 Usage Guidelines (Post-Implementation)

### When to Use Primary (Green)
- Main CTA buttons
- Active navigation states
- Default links
- Primary icons
- Progress indicators

### When to Use Secondary (Blue)
- Headings (professional tone)
- Secondary buttons (outline)
- Trust indicators
- Info badges
- Professional elements

### When to Use Accent (Gold)
- "Donasi Sekarang" buttons (gradient)
- Urgent campaign badges
- Featured content
- Important notifications
- Progress bars (filled portion)

### When to Use Gray
- Body text (`gray-700` or `gray-800`)
- Borders (`gray-200` or `gray-300`)
- Disabled states (`gray-400`)
- Background surfaces (`gray-50`, `gray-100`)

---

## 🔗 References

1. **Color Harmony Guide**: `docs/color-harmony.md`
2. **Current Colors**: `COLORS.md`
3. **Tailwind Config**: `apps/admin/tailwind.config.ts`
4. **SCSS Variables**: `apps/admin/src/styles/utils/_variables.scss`
5. **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/

---

## 📞 Questions & Support

**Q: Bagaimana jika ada component third-party yang tidak mengikuti color system?**
A: Override dengan CSS classes atau wrapper component.

**Q: Apakah perlu update color di web (public site) juga?**
A: Ya, tapi bisa dilakukan terpisah. Admin panel dulu, lalu web.

**Q: Bagaimana handle dark mode di masa depan?**
A: Definisikan dark variants untuk setiap color scale (di luar scope override ini).

---

**Status**: 📝 **Planning Phase**  
**Next Step**: ✅ Approval from stakeholder → 🔧 Implementation Phase 1  
**Estimated Effort**: ~2-3 hours for complete override  
**Priority**: High (Brand consistency)
