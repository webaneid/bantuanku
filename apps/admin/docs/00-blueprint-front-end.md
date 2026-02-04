# Blueprint: Front-End Bantuanku

## 1. Visi & Prinsip Desain

### Visi
Membangun platform donasi online yang **modern, trustworthy, dan user-friendly** dengan pengalaman pengguna yang seamless dari landing hingga completion donasi.

### Prinsip Desain
1. **Mobile-First**: Optimized untuk mobile, enhanced untuk desktop
2. **Consistency**: Reusable components dengan design system yang kuat
3. **Trust & Transparency**: Clear information, real-time updates, transparent reporting
4. **Ease of Use**: Simple flows, minimal friction, fast checkout
5. **Accessibility**: WCAG compliant, semantic HTML, keyboard navigation
6. **Performance**: Fast loading, optimized images, lazy loading
7. **Islamic Values**: Sesuai dengan nilai-nilai Islam, Arabic typography support

---

## 2. Tech Stack

### Core Framework
- **Next.js 14+** (App Router) untuk SSR/SSG
- **TypeScript** untuk type safety
- **React 18+** dengan hooks

### Styling
- **Tailwind CSS** sebagai base utility framework
- **Custom SCSS** untuk complex components & themes
- **CSS Modules** untuk component-scoped styles
- **CSS Variables** untuk theming & customization

### State Management
- **React Query (TanStack Query)** untuk server state
- **Zustand** untuk client state (cart, filters, preferences)
- **Context API** untuk theme & settings

### UI Components
- **Headless UI** untuk accessible components
- **Radix UI** untuk complex primitives
- **Framer Motion** untuk animations
- **React Hook Form** untuk form management
- **Zod** untuk validation

### Media & Assets
- **Next Image** untuk optimized images
- **Swiper** untuk carousels/sliders
- **React Icons** atau **Heroicons** untuk icons

### Utilities
- **date-fns** untuk date manipulation
- **clsx / cn** untuk conditional classes
- **react-hot-toast** untuk notifications
- **next-intl** untuk i18n (Arab + Indonesia)

---

## 3. Design System & SCSS Architecture

### 3.1 Color System

Base colors sudah defined di admin (sesuai branding Darunnajah):

```scss
// _variables.scss
$colors: (
  // Primary (Hijau Darunnajah)
  'primary': (
    50: #e6f4f3,
    100: #b3e0dc,
    500: #035a52,  // Main
    600: #024741,
    700: #023831,
    900: #011a17,
  ),

  // Success (Hijau)
  'success': (
    50: #f3f8e6,
    100: #dceab3,
    500: #678f0c,  // Main
    700: #4a6a09,
  ),

  // Warning (Emas)
  'warning': (
    50: #fdf8ed,
    100: #f7eacc,
    500: #d2aa55,  // Main
    700: #9e7f3f,
  ),

  // Danger (Merah)
  'danger': (
    50: #fce8ec,
    100: #f5bdc7,
    500: #8f132f,  // Main
    700: #6b0e23,
  ),

  // Info (Biru)
  'info': (
    50: #e8f1f5,
    100: #bdd8e4,
    500: #296585,  // Main
    700: #1e4b63,
  ),

  // Accent (sama dengan Warning - Emas)
  'accent': (
    50: #fdf8ed,
    500: #d2aa55,
    700: #9e7f3f,
  ),

  // Gray Scale
  'gray': (
    50: #f9fafb,
    100: #f3f4f6,
    200: #e5e7eb,
    300: #d1d5db,
    400: #9ca3af,
    500: #6b7280,
    600: #4b5563,
    700: #374151,
    800: #1f2937,
    900: #111827,
  ),
);
```

### 3.2 Typography System

```scss
// _typography.scss

// Font Families
$font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-arabic: 'Scheherazade New', 'Traditional Arabic', serif;
$font-mono: 'JetBrains Mono', 'Courier New', monospace;

// Font Sizes (Mobile-First)
$font-sizes: (
  'xs': (mobile: 0.75rem, desktop: 0.75rem),    // 12px
  'sm': (mobile: 0.875rem, desktop: 0.875rem),  // 14px
  'base': (mobile: 1rem, desktop: 1rem),        // 16px
  'lg': (mobile: 1.125rem, desktop: 1.125rem),  // 18px
  'xl': (mobile: 1.25rem, desktop: 1.25rem),    // 20px
  '2xl': (mobile: 1.5rem, desktop: 1.5rem),     // 24px
  '3xl': (mobile: 1.875rem, desktop: 1.875rem), // 30px
  '4xl': (mobile: 2.25rem, desktop: 2.25rem),   // 36px
  '5xl': (mobile: 2.5rem, desktop: 3rem),       // 40px → 48px
  '6xl': (mobile: 3rem, desktop: 3.75rem),      // 48px → 60px
);

// Heading Styles
@mixin heading-1 {
  font-size: map-get(map-get($font-sizes, '5xl'), mobile);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;

  @media (min-width: 768px) {
    font-size: map-get(map-get($font-sizes, '5xl'), desktop);
  }
}

@mixin heading-2 {
  font-size: map-get(map-get($font-sizes, '4xl'), mobile);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;

  @media (min-width: 768px) {
    font-size: map-get(map-get($font-sizes, '4xl'), desktop);
  }
}

// ... dst untuk h3, h4, h5, h6

// Body Text
@mixin body-lg {
  font-size: map-get(map-get($font-sizes, 'lg'), mobile);
  line-height: 1.6;
}

@mixin body-base {
  font-size: map-get(map-get($font-sizes, 'base'), mobile);
  line-height: 1.5;
}

// Arabic Text
@mixin arabic-text {
  font-family: $font-arabic;
  font-size: 1.25em; // Slightly larger for readability
  line-height: 1.8;
  direction: rtl;
  text-align: right;
}
```

### 3.3 Spacing System

```scss
// _spacing.scss
$spacing: (
  0: 0,
  1: 0.25rem,   // 4px
  2: 0.5rem,    // 8px
  3: 0.75rem,   // 12px
  4: 1rem,      // 16px
  5: 1.25rem,   // 20px
  6: 1.5rem,    // 24px
  8: 2rem,      // 32px
  10: 2.5rem,   // 40px
  12: 3rem,     // 48px
  16: 4rem,     // 64px
  20: 5rem,     // 80px
  24: 6rem,     // 96px
  32: 8rem,     // 128px
);

// Container Padding (Responsive)
$container-padding: (
  mobile: map-get($spacing, 4),   // 16px
  tablet: map-get($spacing, 6),   // 24px
  desktop: map-get($spacing, 8),  // 32px
);
```

### 3.4 Component Architecture (Atomic Design)

```
src/
├── styles/
│   ├── _variables.scss         # Colors, fonts, spacing
│   ├── _mixins.scss            # Reusable mixins
│   ├── _typography.scss        # Typography system
│   ├── _reset.scss             # CSS reset
│   ├── globals.scss            # Global styles
│   └── components/
│       ├── _buttons.scss       # Button variants
│       ├── _cards.scss         # Card variants
│       ├── _forms.scss         # Form styles
│       ├── _badges.scss        # Badge variants
│       └── _animations.scss    # Animation utilities
│
├── components/
│   ├── atoms/                  # Smallest components
│   │   ├── Button/
│   │   ├── Badge/
│   │   ├── Icon/
│   │   ├── Input/
│   │   ├── Label/
│   │   └── Spinner/
│   │
│   ├── molecules/              # Combination of atoms
│   │   ├── FormField/
│   │   ├── SearchBox/
│   │   ├── ProgressBar/
│   │   ├── ShareButtons/
│   │   ├── AmountSelector/
│   │   └── CategoryBadge/
│   │
│   ├── organisms/              # Complex components
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── HeroSlider/
│   │   ├── ProgramCard/
│   │   ├── DonationForm/
│   │   ├── CartSidebar/
│   │   └── TestimonialSlider/
│   │
│   └── templates/              # Page layouts
│       ├── MainLayout/
│       ├── SingleLayout/
│       ├── ArchiveLayout/
│       └── CheckoutLayout/
```

### 3.5 Reusable Component Classes

```scss
// _cards.scss

// Base Card (Reusable across all content types)
.card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  // Card Image
  &__image {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    &:hover img {
      transform: scale(1.05);
    }
  }

  // Card Badge (Category/Type)
  &__badge {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 1;
  }

  // Card Body
  &__body {
    padding: map-get($spacing, 6);
  }

  // Card Title
  &__title {
    @include heading-4;
    margin-bottom: map-get($spacing, 2);
    color: $gray-900;

    // Clamp to 2 lines
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  // Card Description
  &__description {
    @include body-sm;
    color: $gray-600;
    margin-bottom: map-get($spacing, 4);

    // Clamp to 3 lines
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  // Card Meta (date, location, etc)
  &__meta {
    display: flex;
    align-items: center;
    gap: map-get($spacing, 4);
    margin-bottom: map-get($spacing, 4);
    color: $gray-500;
    font-size: $font-sm;
  }

  // Card Progress (for campaigns)
  &__progress {
    margin-bottom: map-get($spacing, 4);
  }

  // Card Stats (amount raised, donors, etc)
  &__stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: map-get($spacing, 4);
    margin-bottom: map-get($spacing, 4);
    padding-top: map-get($spacing, 4);
    border-top: 1px solid $gray-200;
  }

  // Card Footer (Action buttons)
  &__footer {
    display: flex;
    gap: map-get($spacing, 3);
    padding-top: map-get($spacing, 4);
    border-top: 1px solid $gray-200;
  }
}

// Progress Bar Component
.progress {
  width: 100%;
  height: 8px;
  background: $gray-200;
  border-radius: 999px;
  overflow: hidden;

  &__bar {
    height: 100%;
    background: linear-gradient(90deg, $primary-500, $primary-600);
    border-radius: 999px;
    transition: width 0.5s ease;
  }

  &__label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: map-get($spacing, 2);
    font-size: $font-sm;
    color: $gray-600;

    .percentage {
      font-weight: 600;
      color: $primary-600;
    }
  }
}
```

---

## 4. URL Structure & Sitemap

### 4.1 Public Pages

```
# Homepage
/                                    → Home with hero, featured programs, stats, testimonials

# Programs
/programs                            → All programs archive (mix of all types)
/programs/infaq                      → Infaq campaigns archive
/programs/zakat                      → Zakat programs archive
/programs/qurban                     → Qurban packages archive
/programs/wakaf                      → Wakaf programs archive

# Single Pages (Dynamic)
/programs/:slug                      → Single program detail
/zakat/:slug                         → Single zakat program detail
/qurban/:slug                        → Single qurban package detail

# Donation Flow
/donate                              → Donation form (multi-step)
/donate/zakat-calculator             → Zakat calculator tool
/cart                                → Shopping cart (for qurban, multiple donations)
/checkout                            → Checkout page
/payment                             → Payment gateway
/payment/success/:id                 → Success page with receipt
/payment/pending/:id                 → Pending payment status
/payment/failed/:id                  → Failed payment page

# User Account
/login                               → Login page
/register                            → Registration
/forgot-password                     → Password reset
/account                             → User dashboard
/account/profile                     → Edit profile
/account/donations                   → Donation history
/account/certificates                → Download certificates (zakat, wakaf)
/account/mitra                       → Mitra dashboard (jika user jadi mitra)

# Reports & Transparency
/reports                             → Public reports landing
/reports/financial                   → Financial reports archive
/reports/programs                    → Program reports archive
/reports/:year/:month                → Monthly report detail

# Static Pages
/contact                             → Contact form
/faq                                 → FAQ
/terms                               → Terms & conditions
/privacy                             → Privacy policy

# Mitra (Referral System)
/mitra                               → Mitra landing page & registration
/m/:kode                             → Mitra referral redirect (short URL)

# Search
/search?q=keyword                    → Global search results
```

### 4.2 Admin Pages (Sudah ada)

```
/dashboard/*                         → Admin dashboard (existing)
```

---

## 5. Page Templates & Layouts

### 5.1 Homepage

**Layout Structure:**
```
├── Header (sticky)
├── Hero Slider (full-width, auto-play)
│   ├── Slide 1: Featured Campaign
│   ├── Slide 2: Zakat Appeal
│   ├── Slide 3: Qurban Promo
│   └── Slide 4: Custom Banner
├── Quick Stats Bar
│   ├── Total Donasi
│   ├── Donatur
│   ├── Program Aktif
│   └── Mustahiq Terbantu
├── Featured Programs (Grid)
│   ├── Urgent Campaign
│   ├── Zakat Highlight
│   └── Qurban Package
├── Donation Categories (Icon Grid)
│   ├── Infaq/Sedekah
│   ├── Zakat
│   ├── Qurban
│   ├── Wakaf
│   ├── Pendidikan
│   └── Kesehatan
├── How It Works (3 Steps)
├── Recent Donations (Live Feed)
├── Testimonials (Slider)
├── Transparency Section
│   ├── Financial Report Link
│   └── Trust Badges
├── Call to Action
└── Footer
```

**Hero Slider Features:**
- Auto-play dengan controls
- Dot navigation
- Swipe untuk mobile
- Background overlay untuk readability
- CTA button di setiap slide
- Admin bisa manage slides via CMS

**Configurable via Settings:**
- Hero slides (judul, deskripsi, gambar, CTA link)
- Primary color theme
- Featured programs selection
- Testimonials
- Stats visibility

### 5.2 Programs Archive

**Layout: Grid dengan Filters**

```
├── Header
├── Page Header
│   ├── Title & Description
│   └── Breadcrumb
├── Filters Sidebar (Desktop) / Toggle (Mobile)
│   ├── Category
│   ├── Status (Active, Completed)
│   ├── Urgency
│   ├── Sort by
│   └── Search
├── Programs Grid
│   ├── ProgramCard (reusable)
│   ├── ProgramCard
│   └── ...
├── Pagination
└── Footer
```

**ProgramCard Component (Reusable):**
```jsx
<ProgramCard>
  <ProgramCard.Image src="..." alt="..." />
  <ProgramCard.Badge category="Zakat" urgency="urgent" />
  <ProgramCard.Body>
    <ProgramCard.Title>Program Title</ProgramCard.Title>
    <ProgramCard.Description>Short description...</ProgramCard.Description>
    <ProgramCard.Meta>
      <MetaItem icon="calendar" label="Deadline: 30 hari" />
      <MetaItem icon="location" label="Jakarta" />
    </ProgramCard.Meta>
    <ProgramCard.Progress
      current={75000000}
      target={100000000}
      percentage={75}
    />
    <ProgramCard.Stats>
      <Stat label="Terkumpul" value="Rp 75 juta" />
      <Stat label="Donatur" value="1.234" />
    </ProgramCard.Stats>
  </ProgramCard.Body>
  <ProgramCard.Footer>
    <Button variant="primary" fullWidth>Donasi Sekarang</Button>
  </ProgramCard.Footer>
</ProgramCard>
```

### 5.3 Single Program Detail

**Layout:**
```
├── Header
├── Breadcrumb
├── Hero Section
│   ├── Image Gallery (Swiper)
│   ├── Program Badge (Category + Urgency)
│   └── Share Buttons
├── Content Grid (Desktop: 2 cols)
│   ├── Main Content (Left - 70%)
│   │   ├── Program Title
│   │   ├── Progress Bar
│   │   ├── Stats (Terkumpul, Target, Donatur)
│   │   ├── Description (Rich Text)
│   │   ├── Program Details
│   │   ├── Updates/Timeline
│   │   ├── Photos/Videos
│   │   └── Related Programs
│   │
│   └── Sidebar (Right - 30%, Sticky)
│       ├── Donation Form Card
│       │   ├── Quick Amounts
│       │   ├── Custom Amount
│       │   ├── Anonymous Option
│       │   └── Submit Button
│       ├── Organizer Info
│       ├── Recent Donors (List)
│       └── Share CTA
└── Footer
```

**Donation Form (Sticky Sidebar):**
```scss
.donation-sidebar {
  position: sticky;
  top: 100px; // Below sticky header

  .donation-card {
    background: white;
    border: 2px solid $primary-500;
    border-radius: 16px;
    padding: map-get($spacing, 6);
    box-shadow: 0 4px 20px rgba($primary-500, 0.1);
  }

  .quick-amounts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: map-get($spacing, 3);
    margin-bottom: map-get($spacing, 4);

    button {
      @extend .btn;
      @extend .btn--outline;
    }
  }

  .custom-amount {
    margin-bottom: map-get($spacing, 4);
  }

  .submit-btn {
    @extend .btn;
    @extend .btn--primary;
    @extend .btn--lg;
    width: 100%;
  }
}
```

### 5.4 Donation Flow (Multi-Step)

**Step 1: Select Program & Amount**
```
├── Progress Indicator (1/4)
├── Program Summary (if from single page)
├── Amount Selection
│   ├── Quick amounts
│   └── Custom amount input
├── Add to Cart (for qurban) or Continue
└── Cart Summary (sidebar)
```

**Step 2: Donor Information**
```
├── Progress Indicator (2/4)
├── Form Fields
│   ├── Nama Lengkap
│   ├── Email
│   ├── No. WhatsApp
│   ├── Alamat (optional)
│   └── Anonim checkbox
├── Mitra Code (optional - if dari referral)
└── Continue Button
```

**Step 3: Payment Method**
```
├── Progress Indicator (3/4)
├── Payment Options
│   ├── Bank Transfer (list rekening)
│   ├── QRIS (show QR code)
│   ├── Virtual Account (Xendit/iPaymu)
│   └── E-wallet (jika ada)
├── Selected Method Details
└── Confirm Button
```

**Step 4: Confirmation & Payment**
```
├── Progress Indicator (4/4)
├── Donation Summary
│   ├── Program
│   ├── Amount
│   ├── Donor Info
│   └── Payment Method
├── Payment Instructions
│   ├── Account Number/QR Code
│   ├── Copy Button
│   ├── Amount to Pay
│   └── Timer (if applicable)
├── Upload Proof Button
└── Finish / WhatsApp Admin
```

### 5.5 Zakat Calculator Page

**Layout:**
```
├── Header
├── Page Hero
│   ├── Title: "Kalkulator Zakat"
│   └── Description
├── Calculator Tabs
│   ├── Zakat Mal (Harta)
│   ├── Zakat Profesi
│   ├── Zakat Perdagangan
│   ├── Zakat Emas/Perak
│   └── Zakat Pertanian
├── Calculator Form (per tab)
│   ├── Input fields
│   ├── Nisab display
│   ├── Auto-calculate
│   └── Result card
├── Action Buttons
│   ├── Bayar Zakat Sekarang
│   └── Download Hasil
├── Information Sidebar
│   ├── Hukum Zakat
│   ├── Nisab Terkini
│   └── FAQ
└── Footer
```

**Calculator Logic:**
```jsx
// Zakat Mal Calculator
const calculateZakatMal = (assets: number, liabilities: number, nisab: number) => {
  const netAssets = assets - liabilities;
  if (netAssets < nisab) return 0;
  return netAssets * 0.025; // 2.5%
};

// Zakat Profesi Calculator
const calculateZakatProfesi = (monthlyIncome: number, nisab: number) => {
  const yearlyIncome = monthlyIncome * 12;
  if (yearlyIncome < nisab) return 0;
  return yearlyIncome * 0.025;
};
```

---

## 6. Reusable Components Library

### 6.1 Content Card Variants

**Variant 1: Default (All programs)**
```jsx
<Card variant="default">
  <Card.Image />
  <Card.Badge />
  <Card.Body>
    <Card.Title />
    <Card.Description />
    <Card.Progress />
    <Card.Stats />
  </Card.Body>
  <Card.Footer>
    <Button>Donasi</Button>
  </Card.Footer>
</Card>
```

**Variant 2: Qurban Package**
```jsx
<Card variant="qurban">
  <Card.Image />
  <Card.Badge type="Kambing/Sapi" />
  <Card.Body>
    <Card.Title />
    <Card.Price amount={3000000} />
    <Card.Features>
      <Feature icon="check">Berat 20-25 kg</Feature>
      <Feature icon="check">Sehat & berkualitas</Feature>
    </Card.Features>
    <Card.Stock available={50} total={100} />
  </Card.Body>
  <Card.Footer>
    <QuantitySelector />
    <Button icon="cart">Tambah Keranjang</Button>
  </Card.Footer>
</Card>
```


### 6.2 Progress Bar Component

```scss
// _progress.scss
.progress {
  &--default {
    .progress__bar {
      background: linear-gradient(90deg, $primary-500, $primary-600);
    }
  }

  &--success {
    .progress__bar {
      background: linear-gradient(90deg, $success-500, $success-600);
    }
  }

  &--warning {
    .progress__bar {
      background: linear-gradient(90deg, $warning-500, $warning-600);
    }
  }

  &--danger {
    .progress__bar {
      background: linear-gradient(90deg, $danger-500, $danger-600);
    }
  }

  // Size variants
  &--sm {
    height: 6px;
  }

  &--md {
    height: 8px;
  }

  &--lg {
    height: 12px;
  }
}
```

### 6.3 Button System

```scss
// _buttons.scss
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: map-get($spacing, 2);
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: $font-base;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  outline: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // Variants
  &--primary {
    background: $primary-500;
    color: white;

    &:hover:not(:disabled) {
      background: $primary-600;
      box-shadow: 0 4px 12px rgba($primary-500, 0.3);
    }
  }

  &--success {
    background: $success-500;
    color: white;

    &:hover:not(:disabled) {
      background: $success-600;
    }
  }

  &--secondary {
    background: $gray-100;
    color: $gray-900;

    &:hover:not(:disabled) {
      background: $gray-200;
    }
  }

  &--outline {
    background: transparent;
    border: 2px solid $primary-500;
    color: $primary-500;

    &:hover:not(:disabled) {
      background: $primary-50;
    }
  }

  &--ghost {
    background: transparent;
    color: $primary-600;

    &:hover:not(:disabled) {
      background: $primary-50;
    }
  }

  // Sizes
  &--sm {
    padding: 0.5rem 1rem;
    font-size: $font-sm;
  }

  &--md {
    padding: 0.625rem 1.25rem;
    font-size: $font-base;
  }

  &--lg {
    padding: 0.875rem 1.75rem;
    font-size: $font-lg;
  }

  // Full width
  &--full {
    width: 100%;
  }

  // With icon
  &__icon {
    width: 1.25em;
    height: 1.25em;
  }
}
```

### 6.4 Form Components

```scss
// _forms.scss
.form {
  &-field {
    margin-bottom: map-get($spacing, 4);
  }

  &-label {
    display: block;
    margin-bottom: map-get($spacing, 2);
    font-weight: 600;
    color: $gray-700;
    font-size: $font-sm;

    &--required::after {
      content: ' *';
      color: $danger-500;
    }
  }

  &-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid $gray-300;
    border-radius: 8px;
    font-size: $font-base;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: $primary-500;
      box-shadow: 0 0 0 3px rgba($primary-500, 0.1);
    }

    &--error {
      border-color: $danger-500;

      &:focus {
        box-shadow: 0 0 0 3px rgba($danger-500, 0.1);
      }
    }
  }

  &-textarea {
    @extend .form-input;
    min-height: 120px;
    resize: vertical;
  }

  &-select {
    @extend .form-input;
    appearance: none;
    background-image: url("data:image/svg+xml,..."); // Chevron down
    background-repeat: no-repeat;
    background-position: right 1rem center;
    padding-right: 3rem;
  }

  &-error {
    display: block;
    margin-top: map-get($spacing, 2);
    color: $danger-500;
    font-size: $font-sm;
  }

  &-help {
    display: block;
    margin-top: map-get($spacing, 2);
    color: $gray-500;
    font-size: $font-sm;
  }
}

// Checkbox & Radio
.form-checkbox,
.form-radio {
  display: flex;
  align-items: center;
  gap: map-get($spacing, 2);
  cursor: pointer;

  input {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }

  label {
    cursor: pointer;
    margin: 0;
  }
}
```

### 6.5 Badge Component

```scss
// _badges.scss
.badge {
  display: inline-flex;
  align-items: center;
  gap: map-get($spacing, 1);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: $font-xs;
  font-weight: 600;

  // Variants
  &--primary {
    background: $primary-50;
    color: $primary-700;
  }

  &--success {
    background: $success-50;
    color: $success-700;
  }

  &--warning {
    background: $warning-50;
    color: $warning-700;
  }

  &--danger {
    background: $danger-50;
    color: $danger-700;
  }

  &--info {
    background: $info-50;
    color: $info-700;
  }

  // Category badges
  &--zakat {
    @extend .badge--success;
  }

  &--qurban {
    @extend .badge--warning;
  }

  &--infaq {
    @extend .badge--primary;
  }

  &--wakaf {
    @extend .badge--info;
  }

  // Urgency badges
  &--urgent {
    background: $danger-500;
    color: white;
    animation: pulse 2s infinite;
  }

  &--new {
    background: $success-500;
    color: white;
  }
}
```

---

## 7. Layout Components

### 7.1 Header (Sticky Navigation)

```jsx
<Header>
  {/* Top Bar (optional) */}
  <TopBar>
    <Container>
      <ContactInfo>
        <PhoneNumber />
        <Email />
        <SocialLinks />
      </ContactInfo>
      <LanguageSwitcher /> {/* ID / AR */}
    </Container>
  </TopBar>

  {/* Main Nav */}
  <MainNav sticky>
    <Container>
      <Logo />
      <Navigation>
        <NavLink href="/">Beranda</NavLink>
        <NavLink href="/programs">Program</NavLink>
        <NavDropdown label="Zakat">
          <DropdownItem href="/zakat">Program Zakat</DropdownItem>
          <DropdownItem href="/zakat-calculator">Kalkulator Zakat</DropdownItem>
        </DropdownDropdown>
        <NavLink href="/qurban">Qurban</NavLink>
        <NavLink href="/reports">Laporan</NavLink>
        <NavLink href="/contact">Kontak</NavLink>
      </Navigation>
      <HeaderActions>
        <SearchButton />
        <CartButton badge={cartCount} />
        <UserMenu /> {/* Login/Register or Avatar */}
        <Button variant="primary">Donasi Sekarang</Button>
      </HeaderActions>
      <MobileMenuToggle />
    </Container>
  </MainNav>

  {/* Mobile Menu */}
  <MobileMenu isOpen={mobileMenuOpen}>
    {/* Navigation items */}
  </MobileMenu>
</Header>
```

**Sticky Header Behavior:**
```scss
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &.scrolled {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .top-bar {
      display: none; // Hide top bar on scroll
    }

    .main-nav {
      padding: 0.75rem 0; // Reduce padding
    }
  }
}
```

### 7.2 Footer

```jsx
<Footer>
  <FooterTop>
    <Container>
      <Grid cols={4} colsMd={2} colsSm={1}>
        {/* Column 1: About */}
        <FooterColumn>
          <Logo variant="light" />
          <Description />
          <SocialLinks />
        </FooterColumn>

        {/* Column 2: Quick Links */}
        <FooterColumn>
          <FooterTitle>Link Cepat</FooterTitle>
          <FooterLinks>
            <FooterLink href="/programs">Program</FooterLink>
            <FooterLink href="/reports">Laporan</FooterLink>
            <FooterLink href="/contact">Kontak</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
          </FooterLinks>
        </FooterColumn>

        {/* Column 3: Programs */}
        <FooterColumn>
          <FooterTitle>Program Kami</FooterTitle>
          <FooterLinks>
            <FooterLink href="/programs/zakat">Zakat</FooterLink>
            <FooterLink href="/programs/qurban">Qurban</FooterLink>
            <FooterLink href="/programs/infaq">Infaq</FooterLink>
            <FooterLink href="/programs/wakaf">Wakaf</FooterLink>
          </FooterLinks>
        </FooterColumn>

        {/* Column 4: Contact */}
        <FooterColumn>
          <FooterTitle>Hubungi Kami</FooterTitle>
          <ContactInfo>
            <ContactItem icon="phone">+62 xxx xxx xxx</ContactItem>
            <ContactItem icon="email">info@bantuanku.org</ContactItem>
            <ContactItem icon="location">Jakarta, Indonesia</ContactItem>
          </ContactInfo>
        </FooterColumn>
      </Grid>
    </Container>
  </FooterTop>

  <FooterBottom>
    <Container>
      <Copyright>&copy; 2026 Bantuanku. All rights reserved.</Copyright>
      <LegalLinks>
        <Link href="/terms">Syarat & Ketentuan</Link>
        <Link href="/privacy">Kebijakan Privasi</Link>
      </LegalLinks>
    </Container>
  </FooterBottom>
</Footer>
```

### 7.3 Cart Sidebar (Slide-over)

```jsx
<CartSidebar isOpen={isCartOpen} onClose={closeCart}>
  <CartHeader>
    <Title>Keranjang Donasi</Title>
    <CloseButton onClick={closeCart} />
  </CartHeader>

  <CartItems>
    {items.map(item => (
      <CartItem key={item.id}>
        <ItemImage src={item.image} />
        <ItemInfo>
          <ItemName>{item.name}</ItemName>
          <ItemPrice>{formatRupiah(item.price)}</ItemPrice>
          <QuantityControl
            value={item.quantity}
            onChange={(qty) => updateQuantity(item.id, qty)}
          />
        </ItemInfo>
        <RemoveButton onClick={() => removeItem(item.id)} />
      </CartItem>
    ))}
  </CartItems>

  <CartFooter>
    <CartSummary>
      <SummaryRow>
        <Label>Subtotal</Label>
        <Value>{formatRupiah(subtotal)}</Value>
      </SummaryRow>
      <SummaryRow bold>
        <Label>Total</Label>
        <Value>{formatRupiah(total)}</Value>
      </SummaryRow>
    </CartSummary>

    <CheckoutButton fullWidth>
      Lanjut ke Pembayaran
    </CheckoutButton>

    <ContinueShoppingLink onClick={closeCart}>
      Lanjut Donasi
    </ContinueShoppingLink>
  </CartFooter>
</CartSidebar>
```

**Slide-over Animation:**
```scss
.cart-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 1100;
  transform: translateX(100%);
  transition: transform 0.3s ease;

  &.open {
    transform: translateX(0);
  }

  // Mobile: Full width
  @media (max-width: 640px) {
    max-width: 100%;
  }
}

// Backdrop
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;

  &.open {
    opacity: 1;
    pointer-events: auto;
  }
}
```

---

## 8. Front-End Settings & Configuration

### 8.1 Settings API Structure

Settings yang bisa dikonfigurasi via admin dashboard:

```typescript
// Site Settings
interface SiteSettings {
  // General
  site_name: string;
  site_tagline: string;
  site_logo: string;
  site_favicon: string;

  // Theme Colors
  primary_color: string;      // #035a52
  secondary_color: string;    // #678f0c
  accent_color: string;       // #d2aa55

  // Contact
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  contact_whatsapp: string;

  // Social Media
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_youtube: string;

  // Features Toggle
  enable_qurban: boolean;
  enable_zakat_calculator: boolean;
  enable_mitra: boolean;

  // Homepage Settings
  hero_slides: HeroSlide[];
  featured_programs: string[]; // Array of program IDs
  show_stats: boolean;
  show_testimonials: boolean;
  show_recent_donations: boolean;
}

// Hero Slide
interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta_text: string;
  cta_link: string;
  enabled: boolean;
  order: number;
}

// Testimonial
interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
  enabled: boolean;
}
```

### 8.2 Settings Management UI (Admin)

Lokasi: `/dashboard/settings/website`

**Sections:**
1. **General Settings**
   - Site name, tagline, logo, favicon

2. **Theme Customization**
   - Primary color picker
   - Secondary color picker
   - Accent color picker
   - Preview mode

3. **Contact Information**
   - Phone, email, address, WhatsApp

4. **Social Media**
   - Facebook, Instagram, Twitter, YouTube URLs

5. **Homepage Settings**
   - Hero Slider Management (add/edit/delete/reorder slides)
   - Featured Programs Selection
   - Toggle stats section
   - Toggle testimonials section

6. **Feature Toggles**
   - Enable/disable Qurban module
   - Enable/disable Zakat Calculator
   - Enable/disable Mitra system

### 8.3 Theme Customization

CSS Variables untuk dynamic theming:

```scss
:root {
  // Colors (can be overridden via settings)
  --color-primary-50: #{$primary-50};
  --color-primary-500: #{$primary-500};
  --color-primary-600: #{$primary-600};
  --color-primary-700: #{$primary-700};

  --color-secondary-50: #{$success-50};
  --color-secondary-500: #{$success-500};
  --color-secondary-600: #{$success-600};

  --color-accent-50: #{$accent-50};
  --color-accent-500: #{$accent-500};
  --color-accent-600: #{$accent-600};

  // ... other color variables
}

// Dynamic theme application
[data-theme="custom"] {
  --color-primary-500: var(--custom-primary, #035a52);
  --color-secondary-500: var(--custom-secondary, #678f0c);
  --color-accent-500: var(--custom-accent, #d2aa55);
}
```

**Apply custom colors from settings:**
```tsx
// In _app.tsx or layout.tsx
const { data: settings } = useQuery(['site-settings'], fetchSiteSettings);

useEffect(() => {
  if (settings?.primary_color) {
    document.documentElement.style.setProperty('--custom-primary', settings.primary_color);
  }
  if (settings?.secondary_color) {
    document.documentElement.style.setProperty('--custom-secondary', settings.secondary_color);
  }
  if (settings?.accent_color) {
    document.documentElement.style.setProperty('--custom-accent', settings.accent_color);
  }
}, [settings]);
```

---

## 9. Mobile-First Responsive Design

### 9.1 Breakpoints

```scss
$breakpoints: (
  'xs': 0,
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  '2xl': 1536px,
);

// Mixins
@mixin respond-to($breakpoint) {
  @media (min-width: map-get($breakpoints, $breakpoint)) {
    @content;
  }
}
```

### 9.2 Mobile Navigation

**Hamburger Menu:**
```jsx
<MobileMenu isOpen={isOpen}>
  <MobileMenuHeader>
    <Logo />
    <CloseButton onClick={toggleMenu} />
  </MobileMenuHeader>

  <MobileMenuBody>
    <MobileNavLinks>
      <MobileNavLink href="/">Beranda</MobileNavLink>

      <MobileNavAccordion label="Program">
        <MobileNavLink href="/programs/infaq">Infaq</MobileNavLink>
        <MobileNavLink href="/programs/zakat">Zakat</MobileNavLink>
        <MobileNavLink href="/programs/qurban">Qurban</MobileNavLink>
      </MobileNavAccordion>

      <MobileNavLink href="/reports">Laporan</MobileNavLink>
      <MobileNavLink href="/contact">Kontak</MobileNavLink>
    </MobileNavLinks>

    <MobileMenuActions>
      {isLoggedIn ? (
        <UserAccount />
      ) : (
        <>
          <Button variant="outline" fullWidth>Masuk</Button>
          <Button variant="primary" fullWidth>Daftar</Button>
        </>
      )}
    </MobileMenuActions>
  </MobileMenuBody>
</MobileMenu>
```

**Full-screen overlay:**
```scss
.mobile-menu {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 1200;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  overflow-y: auto;

  &.open {
    transform: translateX(0);
  }

  // Desktop: Hide
  @include respond-to('lg') {
    display: none;
  }
}
```

### 9.3 Touch-Friendly Elements

```scss
// Minimum touch target: 44x44px (Apple HIG)
.btn,
.nav-link,
.card__footer button {
  min-height: 44px;
  min-width: 44px;

  @include respond-to('md') {
    min-height: auto;
    min-width: auto;
  }
}

// Larger tap areas for mobile
.mobile-nav-link {
  padding: 1rem 1.5rem;
  font-size: 1.125rem;
}
```

### 9.4 Mobile-Optimized Cards

```scss
.program-card {
  // Mobile: Full width, stacked
  width: 100%;

  @include respond-to('sm') {
    // Tablet: 2 columns
    width: calc(50% - 1rem);
  }

  @include respond-to('lg') {
    // Desktop: 3 columns
    width: calc(33.333% - 1rem);
  }

  // Mobile: Horizontal layout option
  &--horizontal {
    display: flex;
    flex-direction: row;

    .card__image {
      width: 120px;
      flex-shrink: 0;
    }

    .card__body {
      flex: 1;
      padding: 1rem;
    }

    @include respond-to('md') {
      flex-direction: column;

      .card__image {
        width: 100%;
      }
    }
  }
}
```

---

## 10. Performance Optimization

### 10.1 Image Optimization

```tsx
// Using Next.js Image component
import Image from 'next/image';

<Image
  src={program.image}
  alt={program.title}
  width={800}
  height={450}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading="lazy"
  placeholder="blur"
  blurDataURL={program.blurHash}
/>
```

### 10.2 Code Splitting

```tsx
// Dynamic imports for heavy components
const HeroSlider = dynamic(() => import('@/components/HeroSlider'), {
  loading: () => <SliderSkeleton />,
  ssr: false
});

const ZakatCalculator = dynamic(() => import('@/components/ZakatCalculator'), {
  loading: () => <CalculatorSkeleton />
});
```

### 10.3 Lazy Loading

```tsx
// Lazy load below-the-fold content
import { useInView } from 'react-intersection-observer';

const TestimonialSection = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section ref={ref}>
      {inView ? <TestimonialSlider /> : <SectionSkeleton />}
    </section>
  );
};
```

### 10.4 Font Loading

```tsx
// _app.tsx or layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-primary'
});

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

---

## 11. SEO & Meta Tags

### 11.1 Page Meta Structure

```tsx
// Per-page metadata
export const metadata = {
  title: 'Program Zakat | Bantuanku',
  description: 'Salurkan zakat Anda melalui program-program terpercaya...',
  openGraph: {
    title: 'Program Zakat | Bantuanku',
    description: '...',
    images: ['/og-image-zakat.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Program Zakat | Bantuanku',
    description: '...',
    images: ['/og-image-zakat.jpg'],
  }
};
```

### 11.2 Structured Data (JSON-LD)

```tsx
// For donation campaigns
const campaignStructuredData = {
  "@context": "https://schema.org",
  "@type": "DonateAction",
  "name": program.title,
  "description": program.description,
  "recipient": {
    "@type": "Organization",
    "name": "Bantuanku"
  },
  "amount": {
    "@type": "MonetaryAmount",
    "currency": "IDR",
    "value": program.target_amount
  }
};

// Inject in page
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(campaignStructuredData) }}
/>
```

---

## 12. Accessibility (A11y)

### 12.1 ARIA Labels

```tsx
// Navigation
<nav aria-label="Primary navigation">
  <ul role="list">
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// Buttons
<button aria-label="Close menu" onClick={closeMenu}>
  <XIcon aria-hidden="true" />
</button>

// Forms
<label htmlFor="donation-amount">Jumlah Donasi</label>
<input
  id="donation-amount"
  type="number"
  aria-describedby="amount-help"
  aria-required="true"
/>
<span id="amount-help">Minimal donasi Rp 10.000</span>
```

### 12.2 Keyboard Navigation

```scss
// Focus styles
*:focus-visible {
  outline: 2px solid $primary-500;
  outline-offset: 2px;
}

// Skip to content link
.skip-to-content {
  position: absolute;
  top: -100px;
  left: 0;
  background: $primary-500;
  color: white;
  padding: 1rem;
  z-index: 9999;

  &:focus {
    top: 0;
  }
}
```

### 12.3 Color Contrast

Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text):

```scss
// Check contrast before finalizing colors
// Primary text on white: $gray-900 (#111827) ✓
// Secondary text on white: $gray-600 (#4b5563) ✓
// Button text on $primary-500: white ✓
```

---

## 13. Internationalization (i18n)

### 13.1 Language Support

Support 2 languages:
- **Bahasa Indonesia** (default)
- **Arabic** (optional, for Quranic texts & duas)

```tsx
// Using next-intl
import { useTranslations } from 'next-intl';

const ProgramCard = () => {
  const t = useTranslations('ProgramCard');

  return (
    <div>
      <h3>{t('title')}</h3>
      <Button>{t('donate_now')}</Button>
    </div>
  );
};
```

### 13.2 Translation Files

```json
// locales/id.json
{
  "ProgramCard": {
    "title": "Program",
    "donate_now": "Donasi Sekarang",
    "target": "Target",
    "collected": "Terkumpul"
  },
  "DonationForm": {
    "amount": "Jumlah Donasi",
    "name": "Nama Lengkap",
    "email": "Email",
    "phone": "No. WhatsApp",
    "anonymous": "Donasi sebagai Anonim",
    "submit": "Lanjutkan"
  }
}

// locales/ar.json
{
  "ProgramCard": {
    "title": "البرنامج",
    "donate_now": "تبرع الآن"
  }
}
```

### 13.3 RTL Support

```scss
[dir="rtl"] {
  // Flip layout for Arabic
  .card__badge {
    left: auto;
    right: 12px;
  }

  .btn__icon {
    margin-left: 0;
    margin-right: map-get($spacing, 2);
  }
}
```

---

## 14. State Management

### 14.1 Global State (Zustand)

```typescript
// stores/useCartStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  type: 'program' | 'qurban';
  name: string;
  amount: number;
  quantity: number;
  image: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),

      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),

      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map(item =>
          item.id === id ? { ...item, quantity } : item
        )
      })),

      clearCart: () => set({ items: [] }),

      totalAmount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
      }
    }),
    {
      name: 'cart-storage'
    }
  )
);
```

### 14.2 Server State (React Query)

```typescript
// hooks/usePrograms.ts
import { useQuery } from '@tanstack/react-query';

export const usePrograms = (filters?: ProgramFilters) => {
  return useQuery({
    queryKey: ['programs', filters],
    queryFn: () => fetchPrograms(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProgram = (slug: string) => {
  return useQuery({
    queryKey: ['program', slug],
    queryFn: () => fetchProgram(slug),
    staleTime: 10 * 60 * 1000,
  });
};
```

---

## 15. Animation & Transitions

### 15.1 Page Transitions

```tsx
// Using Framer Motion
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export default function PageTemplate({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### 15.2 Component Animations

```scss
// Fade in on scroll
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-on-scroll {
  animation: fadeInUp 0.6s ease-out;
}

// Pulse for urgent badges
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.badge--urgent {
  animation: pulse 2s ease-in-out infinite;
}
```

---

## 16. Testing Strategy

### 16.1 Component Testing

```typescript
// __tests__/components/ProgramCard.test.tsx
import { render, screen } from '@testing-library/react';
import ProgramCard from '@/components/ProgramCard';

describe('ProgramCard', () => {
  it('renders program information correctly', () => {
    const program = {
      title: 'Test Program',
      description: 'Test Description',
      target_amount: 100000000,
      current_amount: 50000000,
    };

    render(<ProgramCard program={program} />);

    expect(screen.getByText('Test Program')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // Progress
  });
});
```

### 16.2 E2E Testing

```typescript
// e2e/donation-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete donation flow', async ({ page }) => {
  // Navigate to program
  await page.goto('/programs/zakat-fitrah');

  // Click donate button
  await page.click('button:has-text("Donasi Sekarang")');

  // Fill form
  await page.fill('input[name="amount"]', '50000');
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="email"]', 'john@example.com');

  // Submit
  await page.click('button[type="submit"]');

  // Verify redirect to payment
  await expect(page).toHaveURL(/\/payment/);
});
```

---

## 17. Deployment & Build

### 17.1 Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=https://api.bantuanku.org
NEXT_PUBLIC_SITE_URL=https://bantuanku.org
NEXT_PUBLIC_GTM_ID=GTM-XXXXXX
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Payment Gateway
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_xxx
NEXT_PUBLIC_IPAYMU_PUBLIC_KEY=xxx

# Feature Flags
NEXT_PUBLIC_ENABLE_MITRA=true
NEXT_PUBLIC_ENABLE_QURBAN=true
```

### 17.2 Build Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['api.bantuanku.org', 'cdn.bantuanku.org'],
    formats: ['image/avif', 'image/webp'],
  },

  i18n: {
    locales: ['id', 'ar'],
    defaultLocale: 'id',
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.bantuanku.org/:path*',
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/m/:code',
        destination: '/donate?ref=:code',
        permanent: false,
      },
    ];
  },
};
```

---

## 18. Analytics & Tracking

### 18.1 Google Analytics Events

```typescript
// Track donation events
export const trackDonation = (data: {
  program: string;
  amount: number;
  method: string;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'donation', {
      event_category: 'Donation',
      event_label: data.program,
      value: data.amount,
      payment_method: data.method,
    });
  }
};

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }
};
```

### 18.2 Conversion Tracking

```tsx
// In payment success page
useEffect(() => {
  if (donation) {
    // Google Analytics
    trackDonation({
      program: donation.program_name,
      amount: donation.amount,
      method: donation.payment_method,
    });

    // Facebook Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: donation.amount,
        currency: 'IDR',
      });
    }
  }
}, [donation]);
```

---

## 19. Security

### 19.1 Input Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize user input before rendering
const SafeHTML = ({ html }: { html: string }) => {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};
```

### 19.2 CSRF Protection

```typescript
// All forms include CSRF token
const DonationForm = () => {
  const { data: csrfToken } = useQuery(['csrf-token'], fetchCSRFToken);

  return (
    <form>
      <input type="hidden" name="_csrf" value={csrfToken} />
      {/* Other fields */}
    </form>
  );
};
```

### 19.3 Rate Limiting

```typescript
// Client-side rate limiting for API calls
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute'
});

export const rateLimitedFetch = async (url: string, options?: RequestInit) => {
  await limiter.removeTokens(1);
  return fetch(url, options);
};
```

---

## 20. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Setup Next.js project structure
- [ ] Implement design system (colors, typography, spacing)
- [ ] Build atomic components (Button, Badge, Input, etc.)
- [ ] Setup SCSS architecture
- [ ] Implement responsive layout (Header, Footer)
- [ ] Setup state management (Zustand, React Query)

### Phase 2: Core Pages (Weeks 3-4)
- [ ] Homepage with hero slider
- [ ] Programs archive page
- [ ] Single program detail page
- [ ] Donation form (multi-step)
- [ ] Cart functionality
- [ ] Checkout flow

### Phase 3: Specialized Features (Weeks 5-6)
- [ ] Zakat calculator
- [ ] Qurban packages & cart
- [ ] User authentication (login/register)
- [ ] User dashboard
- [ ] Payment integration

### Phase 4: Reports & Static Pages (Week 7)
- [ ] Reports pages (financial, programs)
- [ ] Contact page with form
- [ ] FAQ page
- [ ] Search functionality

### Phase 5: Advanced Features (Week 8)
- [ ] Mitra system (front-end)
- [ ] Share buttons & tracking
- [ ] Live donation feed
- [ ] Testimonials management

### Phase 6: Optimization & Launch (Weeks 9-10)
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Accessibility audit
- [ ] Mobile testing
- [ ] Cross-browser testing
- [ ] Analytics setup
- [ ] Launch!

---

## 21. Maintenance & Updates

### Regular Tasks
- **Weekly**: Review analytics, user feedback
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Performance audit, A/B testing results
- **Yearly**: Major feature updates, design refresh

### Monitoring
- Uptime monitoring (Pingdom, UptimeRobot)
- Error tracking (Sentry)
- Analytics (Google Analytics, Hotjar)
- Performance (Lighthouse CI, WebPageTest)

---

## Appendix A: Component Checklist

### Atoms
- [ ] Button (all variants)
- [ ] Badge
- [ ] Icon
- [ ] Input
- [ ] Textarea
- [ ] Select
- [ ] Checkbox
- [ ] Radio
- [ ] Label
- [ ] Spinner
- [ ] Avatar
- [ ] Divider

### Molecules
- [ ] FormField (label + input + error)
- [ ] SearchBox
- [ ] ProgressBar
- [ ] ShareButtons
- [ ] AmountSelector
- [ ] CategoryBadge
- [ ] QuantityControl
- [ ] PriceDisplay
- [ ] DateDisplay
- [ ] Pagination

### Organisms
- [ ] Header
- [ ] Footer
- [ ] HeroSlider
- [ ] ProgramCard
- [ ] DonationForm
- [ ] CartSidebar
- [ ] TestimonialSlider
- [ ] StatsCounter
- [ ] DonorList
- [ ] MobileMenu
- [ ] FilterSidebar

### Templates
- [ ] MainLayout
- [ ] SingleLayout
- [ ] ArchiveLayout
- [ ] CheckoutLayout
- [ ] DashboardLayout

---

**Document Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: Draft - Ready for Review & Implementation

---

**Next Steps:**
1. Review & approve blueprint
2. Setup development environment
3. Begin Phase 1 implementation
4. Regular sync meetings for progress updates
