# Frontend Development - Bantuanku Public Website

> **Perencanaan Lengkap Pengembangan Front-End Public Website**
> 
> Platform Donasi Online - Website Publik untuk Donatur
> 
> Tanggal: 22 Januari 2026
> 
> Status: Planning Phase

---

## 📋 Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Technical Stack](#2-technical-stack)
3. [Project Structure](#3-project-structure)
4. [API Integration](#4-api-integration)
5. [Page Specifications](#5-page-specifications)
6. [Component Architecture](#6-component-architecture)
7. [State Management](#7-state-management)
8. [Responsive Design](#8-responsive-design)
9. [Development Roadmap](#9-development-roadmap)
10. [Deployment Strategy](#10-deployment-strategy)

---

## 1) Executive Summary

### 1.1 Tujuan Proyek

Membangun **front-end public website** untuk platform donasi Bantuanku yang:
- **Mobile-first** dan fully responsive
- **Modern UI/UX** dengan Tailwind CSS + Heroicons
- **Konsumsi API** yang sudah tersedia (tidak membuat database baru)
- **Terpisah dari Admin** dengan URL berbeda
- **SEO-friendly** dan fast loading
- **User-friendly** untuk semua kalangan donatur

### 1.2 Target Audience

- **Donatur Individual**: Masyarakat umum yang ingin berdonasi
- **Donatur Korporat**: Perusahaan yang ingin CSR
- **Muzakki**: Muslim yang ingin membayar zakat
- **Volunteer**: Relawan yang ingin membantu kampanye

### 1.3 Key Features

✅ **Landing Page** dengan hero section, featured campaigns, stats
✅ **Campaign Listing** dengan filter, search, dan sort
✅ **Campaign Detail** dengan progress bar, donor list, updates
✅ **Donation Flow** yang mudah dan cepat (3 steps)
✅ **Payment Gateway** terintegrasi (Midtrans, Xendit, Manual)
✅ **Zakat Calculator** untuk 6 jenis zakat
✅ **User Account** dengan riwayat donasi dan invoice
✅ **Static Pages** (About, FAQ, Contact, Privacy Policy)
✅ **Real-time Notifications** untuk status pembayaran
✅ **Social Sharing** untuk kampanye

### 1.4 Domain & Routing

| Domain | Fungsi |
|--------|--------|
| `https://bantuanku.org` | Public website (Front-end) |
| `https://admin.bantuanku.org` | Admin dashboard (Sudah ada) |
| `https://api.bantuanku.org` | Backend API (Sudah ada) |

---

## 2) Technical Stack

### 2.1 Core Framework

```json
{
  "framework": "Next.js 15.x",
  "runtime": "React 19",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS 3.4",
  "icons": "Heroicons 2.x"
}
```

**Alasan Pemilihan Next.js:**
- ✅ **App Router** untuk routing modern
- ✅ **Server Components** untuk performance
- ✅ **Static Generation** untuk SEO
- ✅ **Image Optimization** bawaan
- ✅ **API Routes** untuk middleware
- ✅ **Deployment** mudah ke Vercel/Cloudflare Pages

### 2.2 Dependencies

```json
{
  "dependencies": {
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.3",
    
    "@heroicons/react": "^2.2.0",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "sass": "^1.70.0",
    
    "axios": "^1.7.9",
    "@tanstack/react-query": "^5.62.11",
    "zustand": "^5.0.3",
    
    "react-hook-form": "^7.54.2",
    "@hookform/resolvers": "^3.9.1",
    "zod": "^3.24.1",
    
    "date-fns": "^4.1.0",
    "clsx": "^2.1.0",
    "react-hot-toast": "^2.6.0",
    "lucide-react": "^0.469.0",
    
    "framer-motion": "^11.0.0",
    "swiper": "^11.0.0",
    "react-intersection-observer": "^9.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.6",
    "@types/react-dom": "^19.0.2",
    "eslint": "^9.18.0",
    "eslint-config-next": "^15.1.6"
  }
}
```

### 2.3 Typography

```css
/* Font Family */
--font-heading: 'Poppins', sans-serif;
--font-body: 'Inter', sans-serif;

/* Font Weights */
Poppins: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
Inter: 400 (Regular), 500 (Medium), 600 (SemiBold)
```

### 2.4 Color Palette

**Brand Colors (dari Logo Laziswaf Darunnajah):**
- **Gold/Emas**: `#C9A961` - Melambangkan kemakmuran dan keberkahan
- **Teal/Hijau Tosca**: `#006B5C` - Melambangkan kepercayaan dan spiritualitas

**Color System Architecture:**

```css
/* ============================================
   CSS CUSTOM PROPERTIES - COLOR SYSTEM
   Based on Laziswaf Darunnajah Brand Colors
   ============================================ */

:root {
  /* PRIMARY COLOR - Gold/Emas */
  --color-primary: #C9A961;
  --color-primary-rgb: 201, 169, 97;
  --color-primary-light: #E5D4A8;
  --color-primary-light-rgb: 229, 212, 168;
  --color-primary-dark: #A68A4D;
  --color-primary-dark-rgb: 166, 138, 77;
  
  /* SECONDARY COLOR - Teal/Hijau Tosca */
  --color-secondary: #006B5C;
  --color-secondary-rgb: 0, 107, 92;
  --color-secondary-light: #008577;
  --color-secondary-light-rgb: 0, 133, 119;
  --color-secondary-dark: #004D42;
  --color-secondary-dark-rgb: 0, 77, 66;
  
  /* LIGHT COLORS - Background & Surfaces */
  --color-light: #F8F6F0;
  --color-light-rgb: 248, 246, 240;
  --color-light-secondary: #F0F4F3;
  --color-light-secondary-rgb: 240, 244, 243;
  
  /* ACCENT COLOR - Untuk CTA & Highlights */
  --color-accent: #D4AF37;
  --color-accent-rgb: 212, 175, 55;
  --color-accent-light: #E8C96F;
  --color-accent-light-rgb: 232, 201, 111;
  
  /* DARK COLORS - Typography */
  --color-dark: #1A1A1A;
  --color-dark-rgb: 26, 26, 26;
  --color-text: #333333;
  --color-text-rgb: 51, 51, 51;
  --color-text-muted: #666666;
  --color-text-muted-rgb: 102, 102, 102;
  
  /* WHITE & NEUTRAL */
  --color-white: #FFFFFF;
  --color-white-rgb: 255, 255, 255;
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;
  
  /* SEMANTIC COLORS */
  --color-success: #10B981;
  --color-success-rgb: 16, 185, 129;
  --color-success-light: #D1FAE5;
  --color-success-dark: #059669;
  
  --color-warning: #F59E0B;
  --color-warning-rgb: 245, 158, 11;
  --color-warning-light: #FEF3C7;
  --color-warning-dark: #D97706;
  
  --color-error: #EF4444;
  --color-error-rgb: 239, 68, 68;
  --color-error-light: #FEE2E2;
  --color-error-dark: #DC2626;
  
  --color-info: #3B82F6;
  --color-info-rgb: 59, 130, 246;
  --color-info-light: #DBEAFE;
  --color-info-dark: #2563EB;
}
```

**Usage Examples:**

```css
/* Solid Colors */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-white);
}

/* With Opacity using RGB */
.overlay {
  background-color: rgba(var(--color-dark-rgb), 0.8);
}

.card-shadow {
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.15);
}

/* Gradients */
.hero-gradient {
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    var(--color-secondary) 100%
  );
}

/* Hover States */
.btn-primary:hover {
  background-color: var(--color-primary-dark);
  box-shadow: 0 8px 16px rgba(var(--color-primary-rgb), 0.3);
}
```

### 2.5 SCSS Organization

**Philosophy:**
- Gunakan **Tailwind CSS** sebagai utility-first framework
- **Custom classes** hanya untuk styling yang tidak bisa di-handle Tailwind
- Semua custom styles **WAJIB** dalam file SCSS yang terstruktur
- **JANGAN** menulis inline styles atau style tag di component

**SCSS File Structure:**
```scss
// src/styles/globals.scss
@import './variables';
@import './mixins';
@import './animations';

@tailwind base;
@tailwind components;
@tailwind utilities;

// Component imports
@import './components/button';
@import './components/card';
@import './components/modal';
@import './components/navbar';
@import './components/footer';
@import './components/forms';

// Layout imports
@import './layouts/header';
@import './layouts/sidebar';
@import './layouts/container';

// Page imports
@import './pages/home';
@import './pages/campaign';
@import './pages/donation';
@import './pages/zakat';
```

**Variables Example:**
```scss
// src/styles/variables.scss

// ============================================
// COLORS - Sync with CSS Custom Properties
// ============================================

// Primary - Gold/Emas
$color-primary: #C9A961;
$color-primary-light: #E5D4A8;
$color-primary-dark: #A68A4D;

// Secondary - Teal/Hijau Tosca  
$color-secondary: #006B5C;
$color-secondary-light: #008577;
$color-secondary-dark: #004D42;

// Light - Background & Surfaces
$color-light: #F8F6F0;
$color-light-secondary: #F0F4F3;

// Accent - CTA & Highlights
$color-accent: #D4AF37;
$color-accent-light: #E8C96F;

// Dark - Typography
$color-dark: #1A1A1A;
$color-text: #333333;
$color-text-muted: #666666;

// White & Neutral
$color-white: #FFFFFF;

// Semantic Colors
$color-success: #10B981;
$color-warning: #F59E0B;
$color-error: #EF4444;
$color-info: #3B82F6;

// Spacing
$spacing-xs: 0.25rem;   // 4px
$spacing-sm: 0.5rem;    // 8px
$spacing-md: 1rem;      // 16px
$spacing-lg: 1.5rem;    // 24px
$spacing-xl: 2rem;      // 32px

// Border Radius
$radius-sm: 0.25rem;    // 4px
$radius-md: 0.5rem;     // 8px
$radius-lg: 0.75rem;    // 12px
$radius-xl: 1rem;       // 16px

// Transitions
$transition-fast: 150ms ease-in-out;
$transition-base: 250ms ease-in-out;
$transition-slow: 350ms ease-in-out;

// Z-index
$z-dropdown: 1000;
$z-sticky: 1020;
$z-fixed: 1030;
$z-modal-backdrop: 1040;
$z-modal: 1050;
$z-popover: 1060;
$z-tooltip: 1070;
```

**Mixins Example:**
```scss
// src/styles/mixins.scss

// Responsive breakpoints (sync with Tailwind)
@mixin mobile {
  @media (max-width: 639px) { @content; }
}

@mixin tablet {
  @media (min-width: 640px) and (max-width: 1023px) { @content; }
}

@mixin desktop {
  @media (min-width: 1024px) { @content; }
}

// Flexbox helpers
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// Text truncate
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// Card shadow
@mixin card-shadow {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  
  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
}

// Smooth scroll
@mixin smooth-scroll {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
```

**Component SCSS Example:**
```scss
// src/styles/components/_button.scss

.btn-custom-gradient {
  background: linear-gradient(135deg, $primary-500 0%, $primary-700 100%);
  transition: all $transition-base;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba($primary-500, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.btn-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Page SCSS Example:**
```scss
// src/styles/pages/_home.scss

.hero-section {
  position: relative;
  min-height: 100vh;
  
  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%);
  }
  
  &__content {
    position: relative;
    z-index: 10;
    @include flex-center;
    flex-direction: column;
  }
  
  @include mobile {
    min-height: 80vh;
  }
}

.campaign-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: $spacing-lg;
  
  @include mobile {
    grid-template-columns: 1fr;
  }
}
```

**Usage Guidelines:**

1. **Prefer Tailwind Utilities:**
   ```tsx
   // ✅ GOOD - Use Tailwind
   <div className="flex items-center justify-between p-4 bg-white rounded-lg">
   
   // ❌ BAD - Don't create custom class for this
   <div className="custom-flex-container">
   ```

2. **Use SCSS for Complex Styling:**
   ```tsx
   // ✅ GOOD - Complex gradient animation
   <button className="btn-custom-gradient pulse">
   
   // ❌ BAD - Complex inline style
   <button style={{ background: 'linear-gradient...' }}>
   ```

3. **Component-Specific Classes:**
   ```scss
   // ✅ GOOD - BEM naming in SCSS file
   .campaign-card {
     &__image { ... }
     &__title { ... }
     &__progress { ... }
   }
   
   // ❌ BAD - Random class names
   .card1 { ... }
   .title2 { ... }
   ```

4. **Never Inline Styles (kecuali dynamic values):**
   ```tsx
   // ✅ GOOD - Dynamic value
   <div style={{ width: `${progress}%` }}>
   
   // ❌ BAD - Static style
   <div style={{ padding: '16px', background: 'white' }}>
   ```

**SCSS Architecture Best Practices:**
- **Single source of truth**: All styles in SCSS files
- **BEM naming convention**: `.block__element--modifier`
- **Mobile-first**: Base styles for mobile, override for desktop
- **Modular**: One file per component/page
- **Reusable**: Use mixins & variables
- **Maintainable**: Well-organized & documented

---

## 3) Project Structure

```
apps/web/                           # Front-end Public Website
├── public/                         # Static assets
│   ├── images/
│   │   ├── logo.svg
│   │   ├── hero-bg.jpg
│   │   ├── placeholder.jpg
│   │   └── icons/
│   ├── fonts/
│   │   ├── poppins/
│   │   └── inter/
│   └── favicon.ico
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Homepage (landing)
│   │   ├── globals.css             # Global styles
│   │   │
│   │   ├── campaigns/              # Campaign routes
│   │   │   ├── page.tsx            # List campaigns
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx        # Campaign detail
│   │   │   │   └── donate/
│   │   │   │       └── page.tsx    # Donation form
│   │   │
│   │   ├── donate/                 # Donation flow
│   │   │   ├── [id]/
│   │   │   │   ├── payment/
│   │   │   │   │   └── page.tsx    # Payment methods
│   │   │   │   └── status/
│   │   │   │       └── page.tsx    # Payment status
│   │   │
│   │   ├── zakat/                  # Zakat calculators
│   │   │   ├── page.tsx            # Zakat landing
│   │   │   ├── penghasilan/
│   │   │   │   └── page.tsx
│   │   │   ├── maal/
│   │   │   │   └── page.tsx
│   │   │   ├── emas/
│   │   │   │   └── page.tsx
│   │   │   ├── perdagangan/
│   │   │   │   └── page.tsx
│   │   │   ├── fitrah/
│   │   │   │   └── page.tsx
│   │   │   └── fidyah/
│   │   │       └── page.tsx
│   │   │
│   │   ├── account/                # User account
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # User dashboard
│   │   │   ├── donations/
│   │   │   │   └── page.tsx        # Donation history
│   │   │   └── profile/
│   │   │       └── page.tsx        # Edit profile
│   │   │
│   │   ├── pages/                  # Static pages
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx        # Dynamic pages (About, FAQ, etc)
│   │   │
│   │   └── api/                    # API routes (jika perlu)
│   │       └── webhook/
│   │           └── route.ts        # Payment webhook handler
│   │
│   ├── components/                 # React components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── MobileMenu.tsx
│   │   │
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── CategoryChips.tsx
│   │   │   ├── FeaturedCampaigns.tsx
│   │   │   ├── UrgentCampaigns.tsx
│   │   │   ├── StatsSection.tsx
│   │   │   ├── TestimonialsSection.tsx
│   │   │   └── TrustBadges.tsx
│   │   │
│   │   ├── campaign/
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignGrid.tsx
│   │   │   ├── CampaignFilter.tsx
│   │   │   ├── CampaignSearch.tsx
│   │   │   ├── CampaignProgress.tsx
│   │   │   ├── DonorList.tsx
│   │   │   ├── CampaignUpdates.tsx
│   │   │   └── ShareButtons.tsx
│   │   │
│   │   ├── donation/
│   │   │   ├── DonationForm.tsx
│   │   │   ├── AmountSelector.tsx
│   │   │   ├── PaymentMethods.tsx
│   │   │   ├── PaymentInstructions.tsx
│   │   │   └── DonationSummary.tsx
│   │   │
│   │   ├── zakat/
│   │   │   ├── ZakatCalculatorCard.tsx
│   │   │   ├── IncomeCalculator.tsx
│   │   │   ├── MaalCalculator.tsx
│   │   │   ├── GoldCalculator.tsx
│   │   │   ├── TradeCalculator.tsx
│   │   │   ├── FitrahCalculator.tsx
│   │   │   └── FidyahCalculator.tsx
│   │   │
│   │   ├── account/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── DonationHistoryTable.tsx
│   │   │   └── InvoiceDownload.tsx
│   │   │
│   │   └── ui/                     # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Modal.tsx
│   │       ├── Tabs.tsx
│   │       ├── Pagination.tsx
│   │       ├── Loading.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Toast.tsx
│   │
│   ├── lib/                        # Utility libraries
│   │   ├── api/
│   │   │   ├── client.ts           # Axios instance
│   │   │   ├── endpoints.ts        # API endpoints
│   │   │   ├── campaigns.ts        # Campaign API calls
│   │   │   ├── donations.ts        # Donation API calls
│   │   │   ├── payments.ts         # Payment API calls
│   │   │   ├── zakat.ts            # Zakat API calls
│   │   │   ├── auth.ts             # Auth API calls
│   │   │   └── pages.ts            # Pages API calls
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCampaigns.ts
│   │   │   ├── useDonation.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── usePayment.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── format.ts           # Format currency, date, etc
│   │   │   ├── validation.ts       # Form validation helpers
│   │   │   ├── constants.ts        # App constants
│   │   │   └── helpers.ts          # General helpers
│   │   │
│   │   └── store/
│   │       ├── authStore.ts        # Zustand auth store
│   │       ├── cartStore.ts        # Zustand donation cart
│   │       └── uiStore.ts          # Zustand UI state
│   │
│   ├── types/                      # TypeScript types
│   │   ├── campaign.ts
│   │   ├── donation.ts
│   │   ├── payment.ts
│   │   ├── user.ts
│   │   ├── zakat.ts
│   │   └── api.ts
│   │
│   └── styles/                     # SCSS & CSS files
│       ├── globals.scss            # Global styles & Tailwind imports
│       ├── variables.scss          # SCSS variables (colors, spacing, etc)
│       ├── mixins.scss             # SCSS mixins (responsive, animations)
│       ├── animations.scss         # Custom animations
│       │
│       ├── components/             # Component-specific styles
│       │   ├── _button.scss
│       │   ├── _card.scss
│       │   ├── _modal.scss
│       │   ├── _navbar.scss
│       │   ├── _footer.scss
│       │   └── _forms.scss
│       │
│       ├── layouts/                # Layout styles
│       │   ├── _header.scss
│       │   ├── _sidebar.scss
│       │   └── _container.scss
│       │
│       └── pages/                  # Page-specific styles
│           ├── _home.scss
│           ├── _campaign.scss
│           ├── _donation.scss
│           └── _zakat.scss
│
├── .env.local                      # Environment variables
├── .env.example                    # Example env file
├── next.config.ts                  # Next.js config
├── tailwind.config.ts              # Tailwind config (with brand colors)
├── tsconfig.json                   # TypeScript config
├── postcss.config.mjs              # PostCSS config
├── package.json
├── README.md
└── COLORS.md                       # Color palette documentation
```

---

## 4) API Integration

### 4.1 API Client Setup

**File:** `src/lib/api/client.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bantuanku.org/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/account/login';
    }
    return Promise.reject(error);
  }
);
```

### 4.2 API Endpoints Mapping

**File:** `src/lib/api/endpoints.ts`

```typescript
export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },

  // Campaigns
  CAMPAIGNS: {
    LIST: '/campaigns',
    DETAIL: (slug: string) => `/campaigns/${slug}`,
    FEATURED: '/campaigns/featured',
    URGENT: '/campaigns/urgent',
    DONATIONS: (id: string) => `/campaigns/${id}/donations`,
    UPDATES: (id: string) => `/campaigns/${id}/updates`,
  },

  // Categories
  CATEGORIES: {
    LIST: '/categories',
  },

  // Pillars
  PILLARS: {
    LIST: '/pillars',
  },

  // Donations
  DONATIONS: {
    CREATE: '/donations',
    DETAIL: (id: string) => `/donations/${id}`,
    CHECK: (refId: string) => `/donations/check/${refId}`,
  },

  // Payments
  PAYMENTS: {
    METHODS: '/payments/methods',
    CREATE: '/payments/create',
    CHECK: (id: string) => `/payments/${id}/status`,
  },

  // Zakat
  ZAKAT: {
    CALCULATE: {
      INCOME: '/zakat/calculate/income',
      MAAL: '/zakat/calculate/maal',
      GOLD: '/zakat/calculate/gold',
      TRADE: '/zakat/calculate/trade',
      FITRAH: '/zakat/calculate/fitrah',
      FIDYAH: '/zakat/calculate/fidyah',
    },
  },

  // Account
  ACCOUNT: {
    DONATIONS: '/account/donations',
    PROFILE: '/account/profile',
    UPDATE_PROFILE: '/account/profile',
  },

  // Pages
  PAGES: {
    DETAIL: (slug: string) => `/pages/${slug}`,
  },

  // Settings (Public)
  SETTINGS: {
    PUBLIC: '/settings/public',
  },

  // Search
  SEARCH: {
    GLOBAL: '/search',
    CAMPAIGNS: '/search/campaigns',
  },
};
```

### 4.3 API Service Functions

**File:** `src/lib/api/campaigns.ts`

```typescript
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import type { Campaign, CampaignListParams, CampaignListResponse } from '@/types/campaign';

export const campaignService = {
  // Get campaign list
  async getList(params: CampaignListParams): Promise<CampaignListResponse> {
    return apiClient.get(ENDPOINTS.CAMPAIGNS.LIST, { params });
  },

  // Get campaign detail
  async getDetail(slug: string): Promise<{ data: Campaign }> {
    return apiClient.get(ENDPOINTS.CAMPAIGNS.DETAIL(slug));
  },

  // Get featured campaigns
  async getFeatured(): Promise<{ data: Campaign[] }> {
    return apiClient.get(ENDPOINTS.CAMPAIGNS.FEATURED);
  },

  // Get urgent campaigns
  async getUrgent(): Promise<{ data: Campaign[] }> {
    return apiClient.get(ENDPOINTS.CAMPAIGNS.URGENT);
  },

  // Get campaign donations
  async getDonations(id: string, page: number = 1) {
    return apiClient.get(ENDPOINTS.CAMPAIGNS.DONATIONS(id), {
      params: { page, limit: 10 },
    });
  },

  // Get campaign updates
  async getUpdates(id: string) {
    return apiClient.get(ENDPOINTS.CAMPAIGNS.UPDATES(id));
  },
};
```

**File:** `src/lib/api/donations.ts`

```typescript
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';
import type { CreateDonationInput, Donation } from '@/types/donation';

export const donationService = {
  // Create donation
  async create(data: CreateDonationInput): Promise<{ data: Donation }> {
    return apiClient.post(ENDPOINTS.DONATIONS.CREATE, data);
  },

  // Get donation detail
  async getDetail(id: string): Promise<{ data: Donation }> {
    return apiClient.get(ENDPOINTS.DONATIONS.DETAIL(id));
  },

  // Check donation status
  async checkStatus(referenceId: string) {
    return apiClient.get(ENDPOINTS.DONATIONS.CHECK(referenceId));
  },
};
```

**File:** `src/lib/api/payments.ts`

```typescript
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';

export const paymentService = {
  // Get payment methods
  async getMethods() {
    return apiClient.get(ENDPOINTS.PAYMENTS.METHODS);
  },

  // Create payment
  async create(data: { donationId: string; methodId: string }) {
    return apiClient.post(ENDPOINTS.PAYMENTS.CREATE, data);
  },

  // Check payment status
  async checkStatus(paymentId: string) {
    return apiClient.get(ENDPOINTS.PAYMENTS.CHECK(paymentId));
  },
};
```

### 4.4 React Query Hooks

**File:** `src/lib/hooks/useCampaigns.ts`

```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { campaignService } from '@/lib/api/campaigns';
import type { CampaignListParams } from '@/types/campaign';

export const useCampaigns = (params: CampaignListParams) => {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => campaignService.getList(params),
    staleTime: 60000, // 1 minute
  });
};

export const useCampaignDetail = (slug: string) => {
  return useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => campaignService.getDetail(slug),
    enabled: !!slug,
  });
};

export const useFeaturedCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns', 'featured'],
    queryFn: campaignService.getFeatured,
    staleTime: 300000, // 5 minutes
  });
};
```

---

## 5) Page Specifications

### 5.1 Homepage (Landing Page)

**Route:** `/`

**Sections:**
1. **Hero Section**
   - Heading besar: "Mari Berbagi Kebaikan"
   - Subheading: "Platform donasi terpercaya untuk berbagai program kemanusiaan"
   - CTA Button: "Mulai Donasi" → scroll ke campaign section
   - Background image dengan overlay gradient

2. **Category Chips**
   - Horizontal scroll chips: Donasi, Wakaf, Sedekah, Zakat, Kurban
   - Click → filter campaigns by category

3. **Featured Campaigns**
   - 3-4 campaign cards (featured)
   - Show: image, title, progress bar, goal, collected, donor count
   - CTA: "Donasi Sekarang"

4. **Urgent Campaigns**
   - 2-3 campaign cards (urgent)
   - Badge: "Mendesak"
   - Countdown timer jika ada deadline

5. **Stats Section**
   - Total Donasi Terkumpul: Rp X.XXX.XXX.XXX
   - Total Kampanye: XXX
   - Total Donatur: XXX
   - Animasi counter ketika scroll ke section

6. **Trust Badges**
   - Icon + text: "Teraudit", "Transparan", "Terpercaya"
   - Partner logos (jika ada)

7. **Testimonials**
   - Carousel 3-5 testimonials dari donatur
   - Avatar, nama, quote

8. **CTA Section**
   - "Ingin Membantu Lebih Banyak Orang?"
   - Button: "Lihat Semua Kampanye"

**Mobile Considerations:**
- Hero section dengan padding yang cukup
- Category chips dapat di-scroll horizontal
- Campaign cards stacked vertically (1 column)
- Stats dalam 2x2 grid

---

### 5.2 Campaign Listing Page

**Route:** `/campaigns`

**Components:**
1. **Header**
   - Title: "Semua Kampanye"
   - Breadcrumb: Home > Kampanye

2. **Filter & Search Bar**
   - Search input dengan autocomplete
   - Filter dropdown: Category, Pillar, Status
   - Sort dropdown: Terbaru, Terpopuler, Terkumpul, Mendesak, Segera Berakhir

3. **Campaign Grid**
   - Grid layout: 3 columns desktop, 2 tablet, 1 mobile
   - Campaign cards dengan hover effect
   - Lazy loading dengan intersection observer

4. **Pagination**
   - Page numbers dengan prev/next
   - Show: "Halaman 1 dari 10"

**API Integration:**
- `GET /campaigns?page=1&limit=12&category=pendidikan&sort=popular`

**Mobile Considerations:**
- Filter sidebar menjadi bottom sheet modal
- Search bar full width
- Single column grid

---

### 5.3 Campaign Detail Page

**Route:** `/campaigns/[slug]`

**Sections:**
1. **Header**
   - Breadcrumb: Home > Kampanye > {Title}
   - Share buttons: WhatsApp, Facebook, Twitter, Copy Link

2. **Hero Image**
   - Large featured image
   - Badge: Category, Status (Aktif/Selesai)
   - Image gallery (jika ada multiple images)

3. **Campaign Info**
   - Title (H1)
   - Campaign owner/organization
   - Progress bar dengan animasi
   - Collected / Goal (formatted currency)
   - Donor count
   - Days remaining (jika ada deadline)

4. **Donation CTA**
   - Sticky button di mobile: "Donasi Sekarang"
   - Desktop: Sidebar dengan quick donation

5. **Tabs Section**
   - Tab 1: Deskripsi Campaign
     - Full content HTML
     - Images, videos
   - Tab 2: Donatur (XX Orang)
     - List donatur dengan nama, jumlah, waktu
     - Pagination
   - Tab 3: Update (XX Update)
     - Timeline updates dari admin
     - Title, content, images, timestamp

6. **Related Campaigns**
   - 3-4 campaign cards dengan category/pillar yang sama

**API Integration:**
- `GET /campaigns/{slug}` → Detail
- `GET /campaigns/{id}/donations?page=1` → Donor list
- `GET /campaigns/{id}/updates` → Updates

**Mobile Considerations:**
- Sticky bottom CTA button
- Tabs dengan swipe gesture
- Collapsed donor list (show more)

---

### 5.4 Donation Flow

#### Page 1: Donation Form
**Route:** `/campaigns/[slug]/donate`

**Form Fields:**
1. **Amount Selection**
   - Preset amounts: 50k, 100k, 250k, 500k, 1jt, Custom
   - Custom amount input
   - Display: "Anda akan donasi: Rp XXX.XXX"

2. **Donor Information**
   - Nama Lengkap (required)
   - Email (required)
   - No. Handphone (required)
   - Pesan/Doa (optional)
   - Checkbox: Donasi sebagai anonim

3. **Summary**
   - Campaign: {Title}
   - Jumlah Donasi: Rp XXX.XXX
   - Biaya Admin: Rp 0 (ditanggung platform)
   - Total: Rp XXX.XXX

4. **CTA**
   - Button: "Lanjut ke Pembayaran"

**Validation:**
- Email format
- Phone number format (08xxx)
- Minimum donation amount (configurable)

**API Integration:**
- `POST /donations` → Create donation

#### Page 2: Payment Method Selection
**Route:** `/donate/[id]/payment`

**Components:**
1. **Donation Summary**
   - Reference ID: DNT-20260122-XXXXX
   - Campaign: {Title}
   - Jumlah: Rp XXX.XXX
   - Expired: 24 jam dari sekarang

2. **Payment Methods**
   - Grouped by type:
     - Transfer Bank (VA): BCA, BNI, Mandiri, BRI
     - E-Wallet: GoPay, OVO, DANA, ShopeePay
     - Retail: Indomaret, Alfamart
     - Manual Transfer

   - Show: Logo, Name, Fee (jika ada), Min/Max amount

3. **Terms & Conditions**
   - Checkbox: Saya menyetujui S&K

4. **CTA**
   - Button: "Bayar Sekarang"

**API Integration:**
- `GET /payments/methods` → Get payment methods
- `POST /payments/create` → Create payment

#### Page 3: Payment Instructions
**Route:** `/donate/[id]/status`

**Components:**
1. **Payment Info**
   - Status badge: Menunggu Pembayaran / Berhasil / Gagal
   - Payment method logo + name
   - Virtual Account / Payment Code (copyable)
   - QR Code (jika tersedia)
   - Amount
   - Expired at

2. **Instructions**
   - Step-by-step cara pembayaran
   - Contoh: 
     ```
     1. Buka aplikasi mobile banking
     2. Pilih menu Transfer > Virtual Account
     3. Masukkan nomor VA: 1234567890123456
     4. Masukkan jumlah: Rp 100.000
     5. Konfirmasi pembayaran
     ```

3. **Auto-refresh**
   - Polling setiap 10 detik untuk cek status
   - Notifikasi ketika status berubah

4. **CTA**
   - Button: "Saya Sudah Bayar" (manual check)
   - Button: "Batalkan Donasi" (cancel)

**API Integration:**
- `GET /donations/check/{referenceId}` → Check status
- Polling every 10 seconds

---

### 5.5 Zakat Calculator Pages

**Route:** `/zakat`

**Landing Page:**
- Hero: "Hitung Zakat Anda dengan Mudah"
- 6 Calculator cards:
  1. Zakat Penghasilan
  2. Zakat Maal (Harta)
  3. Zakat Emas & Perak
  4. Zakat Perdagangan
  5. Zakat Fitrah
  6. Fidyah

**Individual Calculator Pages:**

#### Zakat Penghasilan (`/zakat/penghasilan`)
**Form:**
- Penghasilan per bulan (Rp)
- Jumlah bulan
- Button: "Hitung Zakat"

**Result:**
- Total Penghasilan: Rp XXX
- Nisab: Rp XXX
- Status: Wajib Zakat / Belum Wajib
- Jumlah Zakat: Rp XXX (2.5%)
- CTA: "Bayar Zakat Sekarang"

**API:** `POST /zakat/calculate/income`

#### Zakat Maal (`/zakat/maal`)
**Form:**
- Uang Tunai (Rp)
- Tabungan (Rp)
- Saham (Rp)
- Piutang (Rp)
- Hutang (Rp)

**API:** `POST /zakat/calculate/maal`

#### Zakat Emas (`/zakat/emas`)
**Form:**
- Berat Emas (gram)
- Harga Emas per gram (auto-fetch dari API)

**API:** `POST /zakat/calculate/gold`

---

### 5.6 User Account Pages

#### Login Page (`/account/login`)
**Form:**
- Email
- Password
- Checkbox: Ingat saya
- Link: Lupa password?
- Button: "Masuk"
- Link: "Belum punya akun? Daftar"

**API:** `POST /auth/login`

#### Register Page (`/account/register`)
**Form:**
- Nama Lengkap
- Email
- No. Handphone
- Password
- Konfirmasi Password
- Checkbox: Saya menyetujui S&K
- Button: "Daftar"
- Link: "Sudah punya akun? Masuk"

**API:** `POST /auth/register`

#### Dashboard (`/account/dashboard`)
**Sections:**
1. Welcome message: "Halo, {Name}!"
2. Stats:
   - Total Donasi: Rp XXX
   - Jumlah Donasi: XX kali
   - Kampanye yang Dibantu: XX kampanye
3. Recent donations (5 terakhir)
4. Quick links: Donasi Lagi, Lihat Riwayat, Edit Profil

#### Donation History (`/account/donations`)
**Table:**
- Columns: Tanggal, Campaign, Jumlah, Status, Invoice
- Filter: Status, Tanggal
- Pagination
- Download Invoice button

**API:** `GET /account/donations`

---

### 5.7 Static Pages

**Route:** `/pages/[slug]`

**Slugs:**
- `tentang-kami` → About Us
- `faq` → Frequently Asked Questions
- `kontak` → Contact Us
- `kebijakan-privasi` → Privacy Policy
- `syarat-ketentuan` → Terms & Conditions
- `laporan-keuangan` → Financial Reports

**Layout:**
- Breadcrumb
- Page title
- Content (HTML from API)
- Last updated date

**API:** `GET /pages/{slug}`

---

## 6) Component Architecture

### 6.1 Layout Components

#### Header Component
```typescript
// components/layout/Header.tsx
interface HeaderProps {
  transparent?: boolean;
  sticky?: boolean;
}

Features:
- Logo (link to homepage)
- Navigation menu (Desktop)
  - Beranda
  - Kampanye
  - Zakat
  - Tentang
- Search icon (open search modal)
- User menu (jika logged in) atau Login button
- Mobile: Hamburger menu
- Sticky on scroll dengan backdrop blur
```

#### Footer Component
```typescript
// components/layout/Footer.tsx

Sections:
1. Brand & Description
2. Quick Links:
   - Tentang Kami
   - Cara Donasi
   - FAQ
   - Hubungi Kami
3. Kategori:
   - Donasi
   - Wakaf
   - Sedekah
   - Zakat
   - Kurban
4. Kontak:
   - Email
   - Phone
   - Address
5. Social Media Icons
6. Copyright & Legal Links
```

---

### 6.2 Home Components

#### HeroSection
```typescript
// components/home/HeroSection.tsx

Props: {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage: string;
}

Features:
- Full viewport height (min-h-screen)
- Background image dengan overlay
- Centered content
- Animated fade-in
- Responsive text size
```

#### CategoryChips
```typescript
// components/home/CategoryChips.tsx

Props: {
  categories: Category[];
  onSelect: (slug: string) => void;
}

Features:
- Horizontal scroll container
- Active state styling
- Icon + label
- Click to filter campaigns
```

#### FeaturedCampaigns
```typescript
// components/home/FeaturedCampaigns.tsx

Features:
- Grid layout (responsive)
- Use CampaignCard component
- Section title: "Kampanye Pilihan"
- "Lihat Semua" link
```

#### StatsSection
```typescript
// components/home/StatsSection.tsx

Props: {
  totalDonations: number;
  totalCampaigns: number;
  totalDonors: number;
}

Features:
- 3-4 stat cards
- Animated counter (count up when in viewport)
- Icon + value + label
- Background gradient atau pattern
```

---

### 6.3 Campaign Components

#### CampaignCard
```typescript
// components/campaign/CampaignCard.tsx

Props: {
  campaign: Campaign;
  variant?: 'default' | 'featured' | 'urgent';
}

Structure:
- Image (aspect ratio 16:9)
- Badge (category, status)
- Title (truncate 2 lines)
- Progress bar
- Stats: Collected / Goal, Donors
- CTA: "Donasi Sekarang"

Interactions:
- Hover: Scale up slightly
- Click: Navigate to detail
```

#### CampaignProgress
```typescript
// components/campaign/CampaignProgress.tsx

Props: {
  collected: number;
  goal: number;
  variant?: 'default' | 'large';
}

Features:
- Progress bar with gradient
- Percentage calculation
- Animated width on mount
- Tooltip dengan detail
```

#### CampaignFilter
```typescript
// components/campaign/CampaignFilter.tsx

Props: {
  categories: Category[];
  pillars: Pillar[];
  onFilterChange: (filters: FilterState) => void;
}

Fields:
- Search keyword
- Category multi-select
- Pillar select
- Status select
- Sort by select

Mobile: Bottom sheet modal
Desktop: Sidebar atau top bar
```

#### DonorList
```typescript
// components/campaign/DonorList.tsx

Props: {
  donors: Donor[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

Structure:
- List item: Avatar, Name, Amount, Time ago
- Anonymous donors: Show icon + "Hamba Allah"
- Pagination or infinite scroll
- Empty state
```

---

### 6.4 Donation Components

#### DonationForm
```typescript
// components/donation/DonationForm.tsx

Props: {
  campaign: Campaign;
  onSubmit: (data: DonationFormData) => void;
}

Sections:
1. Campaign summary card
2. Amount selector
3. Donor information form
4. Message/prayer textarea
5. Anonymous checkbox
6. Submit button

Validation:
- Zod schema
- React Hook Form
```

#### AmountSelector
```typescript
// components/donation/AmountSelector.tsx

Props: {
  presetAmounts: number[];
  value: number;
  onChange: (amount: number) => void;
  minAmount?: number;
  maxAmount?: number;
}

Features:
- Preset amount buttons (grid)
- Custom amount input
- Active state styling
- Validation message
```

#### PaymentMethods
```typescript
// components/donation/PaymentMethods.tsx

Props: {
  methods: PaymentMethod[];
  selected: string | null;
  onSelect: (methodId: string) => void;
}

Structure:
- Grouped by type
- Radio button list
- Logo + Name + Fee
- Expandable sections
```

---

### 6.5 Zakat Components

#### ZakatCalculatorCard
```typescript
// components/zakat/ZakatCalculatorCard.tsx

Props: {
  type: ZakatType;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
}

Features:
- Icon besar di atas
- Title + short description
- Click → navigate to calculator page
- Hover effect
```

#### IncomeCalculator
```typescript
// components/zakat/IncomeCalculator.tsx

Form:
- Monthly income (currency input)
- Number of months (number input)
- Calculate button

Result:
- Total income
- Nisab threshold
- Eligible status (badge)
- Zakat amount (highlighted)
- Formula explanation
- CTA: Pay now button
```

---

### 6.6 UI Components

#### Button
```typescript
// components/ui/Button.tsx

Props: {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

Variants:
- Primary: bg-primary-600 text-white
- Secondary: bg-gray-200 text-gray-900
- Outline: border-primary-600 text-primary-600
- Ghost: text-primary-600 hover:bg-primary-50
```

#### Card
```typescript
// components/ui/Card.tsx

Props: {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

Base styles:
- Rounded corners (rounded-lg)
- Box shadow (shadow-sm)
- White background
- Border (optional)
```

#### Modal
```typescript
// components/ui/Modal.tsx

Props: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

Features:
- Backdrop overlay (click to close)
- Animated enter/exit
- Close button (X)
- Scroll inside modal body
- Mobile: Full screen on small devices
```

#### Pagination
```typescript
// components/ui/Pagination.tsx

Props: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

Features:
- Previous/Next buttons
- Page numbers (max 5 visible)
- Ellipsis for many pages
- Disabled state for first/last page
```

---

## 7) State Management

### 7.1 Zustand Stores

#### Auth Store
```typescript
// lib/store/authStore.ts

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

#### Cart Store (Donation)
```typescript
// lib/store/cartStore.ts

interface CartState {
  campaignId: string | null;
  amount: number;
  donorInfo: DonorInfo | null;
  message: string;
  isAnonymous: boolean;
  setAmount: (amount: number) => void;
  setDonorInfo: (info: DonorInfo) => void;
  setMessage: (message: string) => void;
  toggleAnonymous: () => void;
  reset: () => void;
}
```

#### UI Store
```typescript
// lib/store/uiStore.ts

interface UIState {
  isMobileMenuOpen: boolean;
  isSearchModalOpen: boolean;
  theme: 'light' | 'dark';
  toggleMobileMenu: () => void;
  toggleSearchModal: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

---

### 7.2 React Query Configuration

```typescript
// app/providers.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## 8) Responsive Design

### 8.1 Breakpoints & Colors (Tailwind Config)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Gold/Emas
        primary: {
          DEFAULT: '#C9A961',
          light: '#E5D4A8',
          dark: '#A68A4D',
        },
        // Secondary - Teal
        secondary: {
          DEFAULT: '#006B5C',
          light: '#008577',
          dark: '#004D42',
        },
        // Accent - Gold Bright
        accent: {
          DEFAULT: '#D4AF37',
          light: '#E8C96F',
        },
        // Semantic
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark: '#2563EB',
        },
        // Custom
        light: '#F8F6F0',
        'light-secondary': '#F0F4F3',
        dark: '#1A1A1A',
        text: '#333333',
        'text-muted': '#666666',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
    screens: {
      'sm': '640px',   // Mobile landscape
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // Extra large
    },
  },
  plugins: [],
};

export default config;
```

### 8.2 Mobile-First Approach

**Principles:**
1. Design for mobile first (320px - 767px)
2. Progressively enhance for larger screens
3. Touch-friendly tap targets (min 44x44px)
4. Readable font sizes (min 16px body)
5. Adequate spacing between elements

**Mobile Optimizations:**
- Sticky bottom CTA buttons
- Full-width forms
- Collapsible sections
- Hamburger navigation
- Swipeable carousels
- Bottom sheet modals
- Optimized images (WebP, lazy loading)

### 8.3 Performance Targets

**Core Web Vitals:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Performance Strategies:**
- Next.js Image component for automatic optimization
- Route-based code splitting
- Lazy load components below the fold
- Prefetch critical routes
- Cache API responses
- Minimize bundle size
- Use CDN for static assets

---

## 9) Development Roadmap

### Phase 1: Foundation Setup (Week 1)
**Tasks:**
- [ ] Initialize Next.js 15 project in `apps/web`
- [ ] Setup Tailwind CSS with custom config
- [ ] Configure TypeScript strict mode
- [ ] Setup environment variables
- [ ] Install dependencies (React Query, Zustand, Axios, etc)
- [ ] Create project structure (folders)
- [ ] Setup ESLint + Prettier
- [ ] Create base layout components (Header, Footer)
- [ ] Setup API client and interceptors
- [ ] Create reusable UI components (Button, Input, Card, etc)

**Deliverables:**
✅ Working Next.js app with routing
✅ Styled components with Tailwind
✅ API integration ready

---

### Phase 2: Core Pages (Week 2-3)

#### Week 2: Homepage & Campaign List
**Tasks:**
- [ ] Build Homepage (`/`)
  - [ ] Hero section
  - [ ] Category chips
  - [ ] Featured campaigns section
  - [ ] Urgent campaigns section
  - [ ] Stats section
  - [ ] Trust badges
  - [ ] Testimonials carousel
  - [ ] CTA section
- [ ] Integrate API for featured & urgent campaigns
- [ ] Create CampaignCard component
- [ ] Build Campaign Listing page (`/campaigns`)
  - [ ] Search bar with debounce
  - [ ] Filter sidebar/modal
  - [ ] Campaign grid
  - [ ] Pagination
- [ ] Integrate campaigns list API

**Deliverables:**
✅ Fully functional homepage
✅ Campaign listing with filters

#### Week 3: Campaign Detail & Donation Flow
**Tasks:**
- [ ] Build Campaign Detail page (`/campaigns/[slug]`)
  - [ ] Hero image gallery
  - [ ] Campaign info card
  - [ ] Progress bar
  - [ ] Tabs (Description, Donors, Updates)
  - [ ] Donor list component
  - [ ] Share buttons
  - [ ] Related campaigns
- [ ] Build Donation Form page (`/campaigns/[slug]/donate`)
  - [ ] Amount selector
  - [ ] Donor info form
  - [ ] Validation with Zod + React Hook Form
- [ ] Build Payment Method Selection (`/donate/[id]/payment`)
  - [ ] Payment method list
  - [ ] Fee calculation
- [ ] Build Payment Status page (`/donate/[id]/status`)
  - [ ] Payment instructions
  - [ ] Auto-refresh status polling
  - [ ] Success/Failed states

**Deliverables:**
✅ Complete donation flow (3 pages)
✅ API integration for donations & payments

---

### Phase 3: Zakat & Account (Week 4)

**Tasks:**
- [ ] Build Zakat Landing page (`/zakat`)
  - [ ] Calculator cards grid
  - [ ] Educational content
- [ ] Build Zakat Calculator pages (6 types)
  - [ ] Income calculator
  - [ ] Maal calculator
  - [ ] Gold calculator
  - [ ] Trade calculator
  - [ ] Fitrah calculator
  - [ ] Fidyah calculator
- [ ] Integrate zakat calculation API
- [ ] Build Auth pages
  - [ ] Login page (`/account/login`)
  - [ ] Register page (`/account/register`)
- [ ] Build User Account pages (protected routes)
  - [ ] Dashboard (`/account/dashboard`)
  - [ ] Donation history (`/account/donations`)
  - [ ] Profile edit (`/account/profile`)
- [ ] Implement auth store with Zustand
- [ ] Add protected route middleware

**Deliverables:**
✅ 6 working zakat calculators
✅ User authentication system
✅ User dashboard with donation history

---

### Phase 4: Polish & Optimization (Week 5)

**Tasks:**
- [ ] Build Static Pages (`/pages/[slug]`)
  - [ ] Dynamic content from API
  - [ ] SEO meta tags
- [ ] Add loading states untuk semua API calls
- [ ] Add error boundaries
- [ ] Add toast notifications (success, error)
- [ ] Implement skeleton loaders
- [ ] Add empty states
- [ ] Mobile menu implementation
- [ ] Search modal implementation
- [ ] Optimize images (WebP, sizes)
- [ ] Add animations (Framer Motion)
- [ ] Test responsive design di berbagai devices
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization
  - [ ] Code splitting
  - [ ] Lazy loading
  - [ ] Bundle analysis
  - [ ] Lighthouse audit

**Deliverables:**
✅ Polished UI/UX
✅ Optimized performance
✅ Mobile-friendly
✅ Accessible

---

### Phase 5: Testing & Launch (Week 6)

**Tasks:**
- [ ] End-to-end testing (manual)
  - [ ] Test donation flow dari awal sampai akhir
  - [ ] Test semua payment methods
  - [ ] Test zakat calculators
  - [ ] Test user registration & login
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile testing (iOS, Android)
- [ ] Fix bugs dari testing
- [ ] Setup SEO meta tags untuk semua pages
- [ ] Add Google Analytics / Umami
- [ ] Setup error tracking (Sentry)
- [ ] Create user documentation
- [ ] Staging deployment
- [ ] Client review & feedback
- [ ] Production deployment

**Deliverables:**
✅ Tested & bug-free application
✅ Deployed to production
✅ Ready for users

---

## 10) Deployment Strategy

### 10.1 Hosting Options

**Recommended: Vercel**
- ✅ Native Next.js support
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments
- ✅ Analytics built-in
- ✅ Zero config deployment

**Alternative: Cloudflare Pages**
- ✅ Free hosting
- ✅ Global edge network
- ✅ Unlimited bandwidth
- ✅ GitHub integration

### 10.2 Environment Variables

**File:** `.env.example`
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.bantuanku.org/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=Bantuanku
NEXT_PUBLIC_APP_URL=https://bantuanku.org

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature Flags
NEXT_PUBLIC_ENABLE_DARK_MODE=false
```

### 10.3 CI/CD Pipeline

**Using GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 10.4 Domain Setup

**DNS Configuration:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**SSL Certificate:**
- Automatic via Vercel/Cloudflare
- Let's Encrypt free SSL

---

## 11) Best Practices & Guidelines

### 11.1 Code Quality

**TypeScript:**
- Enable strict mode
- Define types for all props
- Use type inference when possible
- Avoid `any` type

**React:**
- Use functional components
- Use custom hooks untuk logic reuse
- Memo expensive components
- Keep components small & focused

**Styling:**
- **Primary:** Use Tailwind utility classes
- **Custom classes:** WAJIB dalam file SCSS terstruktur
- **Never:** Inline styles atau <style> tags di component
- **BEM naming:** `.block__element--modifier` untuk SCSS classes
- **Mobile-first:** Base styles untuk mobile, override untuk desktop
- **Modular:** Satu file SCSS per component/page kategori

### 11.2 API Integration

**Rules:**
- Always handle loading states
- Always handle error states
- Use React Query untuk caching
- Implement retry logic
- Show user-friendly error messages
- Add request timeouts

### 11.3 Security

**Client-side:**
- Never store sensitive data in localStorage
- Use httpOnly cookies untuk tokens
- Sanitize user inputs
- Validate forms client-side & server-side
- Implement CSRF protection
- Use HTTPS only

### 11.4 Performance

**Optimization:**
- Code splitting per route
- Lazy load images
- Prefetch critical routes
- Minimize bundle size
- Use production builds
- Enable compression
- Cache static assets

### 11.5 Accessibility

**WCAG 2.1 AA:**
- Semantic HTML
- Alt text untuk images
- Keyboard navigation
- Focus indicators
- ARIA labels
- Color contrast ratios
- Screen reader support

---

## 12) Success Metrics

### 12.1 Technical KPIs

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 95 |
| Lighthouse SEO | > 95 |
| Page Load Time (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.5s |
| Bundle Size | < 300KB (gzipped) |
| Mobile Responsive | 100% |

### 12.2 User Experience KPIs

| Metric | Target |
|--------|--------|
| Donation Completion Rate | > 70% |
| Average Time to Donate | < 3 minutes |
| Mobile Traffic | > 60% |
| Bounce Rate | < 40% |
| Pages per Session | > 3 |

---

## 13) Maintenance & Support

### 13.1 Regular Updates

**Monthly:**
- Security patches
- Dependency updates
- Bug fixes
- Performance monitoring

**Quarterly:**
- Feature enhancements
- UX improvements
- A/B testing results
- Analytics review

### 13.2 Monitoring

**Tools:**
- Vercel Analytics (performance)
- Google Analytics (user behavior)
- Sentry (error tracking)
- Uptime monitoring (UptimeRobot)

### 13.3 Documentation

**User Documentation:**
- Cara berdonasi
- Cara membayar zakat
- FAQ lengkap
- Troubleshooting

**Developer Documentation:**
- Setup guide
- API integration guide
- Component library
- Deployment guide

---

## 14) Conclusion

Dengan mengikuti perencanaan ini, kita akan memiliki **front-end public website yang modern, responsif, dan user-friendly** untuk platform donasi Bantuanku.

**Key Success Factors:**
✅ Mobile-first design
✅ Fast & optimized performance
✅ Seamless API integration
✅ Intuitive donation flow
✅ Comprehensive zakat calculators
✅ User-friendly account management
✅ Secure & reliable

**Timeline:** 6 minggu (1.5 bulan)
**Technology:** Next.js 15 + React 19 + TypeScript + Tailwind CSS
**Deployment:** Vercel (recommended)
**Domain:** https://bantuanku.org

---

## 15) Next Steps

1. ✅ Review & approve this planning document
2. [ ] Setup development environment
3. [ ] Create `apps/web` project structure
4. [ ] Start Phase 1: Foundation Setup
5. [ ] Weekly progress meetings
6. [ ] Iterative development & testing
7. [ ] Staging deployment for review
8. [ ] Production launch

---

**Document Version:** 1.0.0
**Last Updated:** 22 Januari 2026
**Author:** GitHub Copilot
**Status:** Ready for Implementation 🚀
