# Bantuanku - Donation Platform

Platform donasi online yang komprehensif untuk mengelola campaign, donasi, zakat, qurban, tabungan qurban, dan penyaluran dana.

## Developed by Webane Indonesia

Aplikasi ini dibuat dan dikembangkan oleh **[Webane Indonesia](https://webane.com)** — penyedia solusi digital kreatif yang berbasis di Indonesia. Webane Indonesia adalah creative digital squad yang menghadirkan layanan komprehensif meliputi **Web Design**, **Web-based App Development**, **Branding**, **Graphic Design**, **Social Media Management**, **Copywriting**, dan **Course**. Dengan prinsip **Fast & Unique**, **High Quality**, dan **Affordable**, Webane Indonesia merancang solusi digital yang inovatif dan terpersonalisasi untuk mendorong pertumbuhan bisnis klien.

📧 [salam@webane.com](mailto:salam@webane.com) · 🌐 [webane.com](https://webane.com)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js (Hono via `@hono/node-server`), PM2-ready |
| **API Framework** | Hono |
| **Frontend** | Next.js 15 (admin), Next.js 14 (web) |
| **UI** | React 19 (admin), React 18 (web), TailwindCSS 3 |
| **Database** | PostgreSQL (Neon) |
| **ORM** | Drizzle |
| **Language** | TypeScript |
| **Auth** | JWT (jose), bcryptjs |
| **Email** | Resend |
| **Payment** | Manual bank/cash, manual QRIS, Flip, iPaymu, Xendit, Midtrans (status per gateway docs) |
| **Storage** | Google Cloud Storage, local uploads fallback |
| **Image** | Sharp |
| **WhatsApp** | Custom AI bot, GoWA integration |
| **State** | Zustand (admin v5, web v4) |

## Project Structure

```
bantuanku/                        # npm workspaces monorepo
├── apps/
│   ├── api/                      # @bantuanku/api  — Hono API (default 50245, PM2 production 3001)
│   │   ├── src/
│   │   │   ├── routes/           # 22 public + 41 admin route modules
│   │   │   ├── services/         # 16 service modules (payment, whatsapp, ledger, etc)
│   │   │   ├── middleware/       # auth, db, cache, ratelimit, security, compression, coordinator-filter
│   │   │   ├── lib/              # jwt, password, response, gcs, image-processor, contact-helpers
│   │   │   └── utils/            # timezone, bank-balance
│   │   └── server-node.ts        # Node.js API entry point
│   ├── admin/                    # @bantuanku/admin — Next.js 15 admin panel (start port 3002)
│   │   └── src/
│   │       ├── app/dashboard/    # 18 dashboard modules
│   │       ├── components/       # CampaignForm, MediaLibrary, SEOPanel, Sidebar, etc
│   │       └── lib/              # api, auth, format, url-registry, category-utils
│   └── web/                      # @bantuanku/web  — Next.js 14 public website (start port 3003)
│       └── src/
│           ├── app/              # program, zakat, qurban, checkout, account, invoice, etc
│           ├── components/       # Atomic Design: atoms/molecules/organisms/templates
│           ├── services/         # 10 service modules (campaigns, zakat, qurban, settings, etc)
│           └── lib/              # api, auth, format, seo, i18n, timezone
├── packages/
│   ├── db/                       # @bantuanku/db — Drizzle ORM schemas + migrations
│   │   ├── src/schema/           # 49 schema files
│   │   └── migrations/           # 96 SQL migration files
│   └── shared/                   # @bantuanku/shared — constants + validators (Zod)
└── docs/                         # Documentation
```

## Features

### Phase 1 — Foundation/MVP
- ✅ Authentication (register, login, JWT)
- ✅ RBAC (super_admin, admin_finance, admin_campaign, program_coordinator, employee, mitra)
- ✅ Campaign CRUD with SEO fields
- ✅ Universal transaction flow (campaign, zakat, qurban)
- ✅ Admin dashboard

### Phase 2 — Payment & Finance
- ✅ Manual payment flow (bank transfer, cash, proof upload, admin verification)
- ✅ Manual QRIS configuration/display
- ⚠️ Payment gateway adapters documented per implementation status (Flip, iPaymu, Xendit, Midtrans)
- ✅ Invoice generation (PDF via jsPDF + html2canvas)
- ✅ Double-entry ledger (Chart of Accounts, Journal Entries, Ledger Lines)
- ✅ Unified disbursement management (campaign, zakat, qurban, operational, vendor, revenue_share)
- ✅ Revenue sharing (amil, developer, fundraiser, mitra splits)

#### Payment Gateway Status

| Gateway | Status README | Source of truth |
|---------|---------------|-----------------|
| Manual bank/cash | Active settings-based payment flow. | `docs/arsitektur-universal-payment.md` |
| Manual QRIS | Active settings-based QRIS display/configuration. | `docs/arsitektur-universal-payment.md` |
| Flip | Implemented and currently the healthiest gateway path, with documented risk around 19-digit provider IDs. | `docs/arsitektur-payment-gateway-flip.md` |
| iPaymu | Adapter exists, but checkout/webhook/settings gaps are documented; not treated as fully healthy end-to-end. | `docs/arsitektur-payment-gateway-ipaymu.md` |
| Xendit | Adapter/settings pieces exist, but frontend route/settings mismatch make it partial/dormant. | `docs/arsitektur-payment-gateway-xendit.md` |
| Midtrans | Adapter exists, but no normal admin/settings payment path and webhook signature handling is incomplete. | `docs/arsitektur-payment-gateway-midtrans.md` |

### Phase 3 — Features Enhancement
- ✅ Zakat system (types, periods, distributions, calculator configs)
- ✅ Qurban system (periods, packages, shared groups, orders, savings, executions)
- ✅ Tabungan Qurban (savings with installments, reminders, conversions)
- ✅ Mitra (partner organizations) management
- ✅ Fundraiser referral system with commission
- ✅ Email notifications (Resend)
- ✅ WhatsApp AI bot & notifications (GoWA)
- ✅ Search & filter with autocomplete
- ✅ Export functionality (CSV, XLSX)
- ✅ Donor dashboard & donatur management
- ✅ Static pages CMS
- ✅ Media library (GCS + local fallback, image processing via Sharp)
- ✅ Indonesia address system (provinsi → kabupaten → kecamatan → kelurahan)
- ✅ i18n (multi-language support)

### Phase 4 — Admin Features & Reporting
- ✅ Advanced reports (16 report sub-modules)
- ✅ Analytics dashboard
- ✅ Settings management (10 settings sub-modules)
- ✅ Audit logs
- ✅ Activity reports for disbursements
- ✅ Vendor, employee, mustahiq management

### Phase 5 — Optimization & Security
- ✅ Rate limiting
- ✅ Response caching
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Input validation (Zod)
- ✅ Compression
- ✅ SEO (dynamic sitemaps, meta tags, OG tags, canonical URLs)

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database (Neon recommended)

### Installation

```bash
# Install dependencies
npm install

# Setup database
cd packages/db
npm run db:push
npm run db:seed

# Start all dev servers
cd ../..
npm run dev

# Or start individually:
npm run dev:api     # API at http://127.0.0.1:50245
npm run dev:admin   # Admin at http://localhost:3001
npm run dev:web     # Web at http://localhost:3002
```

### Environment Variables

Create `.env` file in `apps/api`:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m

# URLs
API_URL=http://127.0.0.1:50245
FRONTEND_URL=http://localhost:3002
ADMIN_URL=http://localhost:3001

# Email
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@bantuanku.org

# Environment
ENVIRONMENT=development
```

Create `.env.local` in `apps/admin` and `apps/web`:

```env
NEXT_PUBLIC_API_URL=http://localhost:50245/v1
```

## API Routes

### Public Routes (22 modules)

| Route | Module |
|-------|--------|
| `/v1/auth` | Authentication (register, login, refresh, me) |
| `/v1/campaigns` | Campaign listing & detail |
| `/v1/categories` | Campaign categories |
| `/v1/pillars` | Campaign pillars |
| `/v1/donatur` | Donatur management |
| `/v1/payments` | Payment methods & webhooks |
| `/v1/transactions` | Universal transactions (campaign, zakat, qurban) |
| `/v1/qurban` | Qurban packages, orders, savings |
| `/v1/account` | Donor dashboard (donations, stats, invoices) |
| `/v1/pages` | Static pages |
| `/v1/settings` | Public settings |
| `/v1/search` | Search campaigns & donations |
| `/v1/autocomplete` | Autocomplete suggestions |
| `/v1/public-stats` | Public statistics |
| `/v1/address` | Indonesia address lookup |
| `/v1/activity-reports` | Public activity reports |
| `/v1/indonesia` | Indonesia region data |
| `/v1/zakat` | Zakat calculator & configs |
| `/v1/fundraisers` | Fundraiser profiles & referrals |
| `/v1/mitra` | Mitra (partner) public profiles |
| `/v1/whatsapp` | WhatsApp webhook |

### Admin Routes (41 modules under `/v1/admin`)

All require authentication. Staff-only routes blocked for `mitra` role.

| Route | Module |
|-------|--------|
| `/dashboard` | Dashboard statistics |
| `/campaigns` | Campaign CRUD (mitra accessible) |
| `/categories` | Category management (mitra accessible) |
| `/pillars` | Pillar management (mitra accessible) |
| `/donatur` | Donatur management |
| `/users` | User CRUD |
| `/roles` | Role & permission management |
| `/finance` | Balance sheet, income statement, cash flow |
| `/ledger` | Ledger entries & journal management |
| `/coa` | Chart of Accounts CRUD |
| `/evidences` | Payment evidences |
| `/export` | CSV/XLSX export (campaigns, donations, disbursements, users, ledger) |
| `/reports` | 16 report types |
| `/analytics` | Overview, conversion, growth metrics |
| `/settings` | Application settings management |
| `/audit` | Audit logs & statistics |
| `/media` | Media library (upload, manage) — mitra accessible |
| `/vendors` | Vendor management |
| `/employees` | Employee management |
| `/mustahiqs` | Mustahiq (zakat recipient) management |
| `/activity-reports` | Activity report management (mitra accessible) |
| `/donations` | Donation management |
| `/zakat/types` | Zakat type management (mitra accessible) |
| `/zakat/periods` | Zakat period management (mitra accessible) |
| `/zakat/donations` | Zakat donation management |
| `/zakat/distributions` | Zakat distribution management |
| `/zakat/stats` | Zakat statistics |
| `/qurban` | Qurban period, package, order management (mitra accessible) |
| `/qurban/savings` | Qurban savings management (mitra accessible) |
| `/address` | Address lookup (mitra accessible) |
| `/disbursements` | Unified disbursement management (mitra accessible) |
| `/ledger/categories` | Ledger category management |
| `/bank-accounts` | Bank account management |
| `/fundraisers` | Fundraiser management |
| `/mitra` | Mitra management (mitra accessible) |
| `/transactions` | Transaction management |
| `/revenue-shares` | Revenue share management |
| `/whatsapp` | WhatsApp notification settings |
| `/pages` | Static pages CMS (super_admin, admin_campaign only) |

## Security Features

- Rate limiting (15 req/15min for auth, 60 req/min for API)
- JWT authentication (jose library)
- RBAC with 6 roles (super_admin, admin_finance, admin_campaign, program_coordinator, employee, mitra)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Input validation (Zod schemas)
- SQL injection protection via Drizzle ORM
- Password hashing with bcryptjs

## Database Schema (49 tables)

### Users & Auth
`users`, `roles`, `permissions`, `user_roles`, `role_permissions`

### Donatur
`donatur` (with Indonesia address references)

### Campaigns
`campaigns` (with SEO & mitra/coordinator refs), `campaign_updates`, `categories`, `pillars`

### Transactions & Payments
`transactions` (polymorphic: campaign/zakat/qurban), `transaction_payments`, `payment_gateways`, `payment_gateway_credentials`, `payment_methods`

### Accounting & Finance
`chart_of_accounts` (hierarchical COA), `ledger_entries` (journal entries), `ledger_lines` (debit/credit), `ledger` (legacy disbursement), `disbursements` (unified), `disbursement_activity_reports`, `bank_accounts`

### Zakat
`zakat_calculator_configs`, `zakat_calculation_logs`, `zakat_types`, `zakat_periods`, `zakat_distributions`

### Qurban
`qurban_periods`, `qurban_packages`, `qurban_package_periods`, `qurban_shared_groups`, `qurban_orders` (legacy), `qurban_savings`, `qurban_savings_transactions`, `qurban_savings_conversions`, `qurban_executions`, `qurban_payments`

### Indonesia Address
`indonesia_provinces`, `indonesia_regencies`, `indonesia_districts`, `indonesia_villages`

### HR & Partners
`employees`, `vendors`, `mustahiqs`, `fundraisers`, `fundraiser_referrals`, `mitra`

### Revenue
`revenue_shares` (amil/developer/fundraiser/mitra/program splits)

### CMS & System
`pages`, `media`, `settings`, `audit_logs`, `notifications`, `activity_reports`, `evidences`

## Deployment

### Production (Node.js + PM2)

```bash
npm install
npm run db:manifest:run:dry
npm run db:manifest:run
npm run build
pm2 start ecosystem.config.cjs
```

Detail deployment resmi ada di `docs/arsitektur-deployment.md`.

### Environment Variables (Production)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
RESEND_API_KEY=...
API_URL=https://api.bantuanku.org
FRONTEND_URL=https://bantuanku.org
ADMIN_URL=https://admin.bantuanku.org
ENVIRONMENT=production
```

## License

Proprietary - All rights reserved

## Contact

- Website: https://bantuanku.org
- Email: support@bantuanku.org
