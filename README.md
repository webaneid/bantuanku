# Bantuanku - Donation Platform

Platform donasi online yang komprehensif untuk mengelola campaign, donasi, zakat, dan penyaluran dana.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle
- **Language**: TypeScript
- **Email**: Resend
- **Payment**: Midtrans, Xendit

## Project Structure

```
bantuanku/
├── apps/
│   └── api/              # Hono API (Cloudflare Workers)
├── packages/
│   ├── db/              # Database schema & seed
│   └── shared/          # Shared utilities
└── docs/                # Documentation
```

## Features

### Phase 1 - Foundation/MVP
- ✅ Authentication (register, login, JWT)
- ✅ RBAC (Role-Based Access Control)
- ✅ Campaign CRUD
- ✅ Donation flow
- ✅ Admin dashboard

### Phase 2 - Payment & Finance
- ✅ Payment gateway integration (Midtrans, Xendit, Manual)
- ✅ Invoice generation
- ✅ Double-entry ledger
- ✅ Disbursement management

### Phase 3 - Features Enhancement
- ✅ Zakat calculator (6 types)
- ✅ Email notifications
- ✅ Search & filter with autocomplete
- ✅ Export functionality (CSV)
- ✅ Donor dashboard
- ✅ Static pages

### Phase 4 - Admin Features & Reporting
- ✅ Advanced reports (donations, campaigns, finance)
- ✅ Analytics dashboard
- ✅ Settings management
- ✅ Audit logs

### Phase 5 - Optimization & Security
- ✅ Rate limiting
- ✅ Caching
- ✅ Security headers
- ✅ Input validation
- ✅ Compression

## Getting Started

### Prerequisites

- Node.js 18+
- npm/pnpm
- PostgreSQL database (Neon recommended)

### Installation

```bash
# Install dependencies
npm install

# Setup database
cd packages/db
npm run db:push
npm run db:seed

# Start development server
cd ../../apps/api
npm run dev
```

### Environment Variables

Create `.env` file in `apps/api`:

```env
# Database
DATABASE_URL=postgresql://user:password@host/database

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Email
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@bantuanku.org

# Payment Gateways
MIDTRANS_SERVER_KEY=xxx
MIDTRANS_CLIENT_KEY=xxx
XENDIT_SECRET_KEY=xxx

# Environment
ENVIRONMENT=development
```

## API Endpoints

### Public Endpoints

#### Authentication
- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh token
- `GET /v1/auth/me` - Get current user

#### Campaigns
- `GET /v1/campaigns` - List campaigns
- `GET /v1/campaigns/:slug` - Get campaign detail
- `GET /v1/campaigns/:id/updates` - Get campaign updates

#### Donations
- `POST /v1/donations` - Create donation
- `GET /v1/donations/:id` - Get donation detail
- `GET /v1/donations/check/:referenceId` - Check donation status

#### Payments
- `GET /v1/payments/methods` - List payment methods
- `POST /v1/payments/create` - Create payment
- `POST /v1/payments/:gateway/webhook` - Payment webhook

#### Zakat
- `GET /v1/zakat/config` - Get zakat config
- `POST /v1/zakat/calculate/income` - Calculate income zakat
- `POST /v1/zakat/calculate/maal` - Calculate wealth zakat
- `POST /v1/zakat/calculate/gold` - Calculate gold zakat
- `POST /v1/zakat/calculate/trade` - Calculate trade zakat
- `POST /v1/zakat/calculate/fitrah` - Calculate fitrah zakat
- `POST /v1/zakat/calculate/fidyah` - Calculate fidyah

#### Search
- `GET /v1/search?q=keyword&type=all|campaigns|donations|users`
- `GET /v1/search/campaigns` - Advanced campaign search
- `GET /v1/search/donations` - Advanced donation search

#### Autocomplete
- `GET /v1/autocomplete/campaigns?q=keyword`
- `GET /v1/autocomplete/categories?q=keyword`
- `GET /v1/autocomplete/pillars`
- `GET /v1/autocomplete/payment-status`

### Authenticated Endpoints

#### Account (Donor Dashboard)
- `GET /v1/account/donations` - My donations
- `GET /v1/account/donations/:id` - Donation detail
- `GET /v1/account/donations/:id/invoice` - Download invoice
- `GET /v1/account/stats` - Donation statistics
- `GET /v1/account/zakat-history` - Zakat history
- `GET /v1/account/notifications` - Notifications

### Admin Endpoints

All admin endpoints require authentication and appropriate role.

#### Dashboard
- `GET /v1/admin/dashboard/stats` - Dashboard statistics

#### Campaigns Management
- `GET /v1/admin/campaigns` - List campaigns
- `POST /v1/admin/campaigns` - Create campaign
- `GET /v1/admin/campaigns/:id` - Get campaign
- `PATCH /v1/admin/campaigns/:id` - Update campaign
- `DELETE /v1/admin/campaigns/:id` - Delete campaign
- `PATCH /v1/admin/campaigns/:id/status` - Update status
- `POST /v1/admin/campaigns/:id/updates` - Post update

#### Donations Management
- `GET /v1/admin/donations` - List donations
- `GET /v1/admin/donations/:id` - Get donation detail

#### Users Management
- `GET /v1/admin/users` - List users
- `POST /v1/admin/users` - Create user
- `GET /v1/admin/users/:id` - Get user
- `PATCH /v1/admin/users/:id` - Update user
- `DELETE /v1/admin/users/:id` - Delete user

#### Roles Management
- `GET /v1/admin/roles` - List roles
- `POST /v1/admin/roles` - Create role
- `GET /v1/admin/roles/:id` - Get role
- `PATCH /v1/admin/roles/:id` - Update role
- `DELETE /v1/admin/roles/:id` - Delete role

#### Finance
- `GET /v1/admin/finance/balance-sheet` - Balance sheet
- `GET /v1/admin/finance/income-statement` - Income statement
- `GET /v1/admin/finance/cash-flow` - Cash flow
- `GET /v1/admin/finance/ledger` - Ledger entries

#### Disbursements
- `GET /v1/admin/disbursements` - List disbursements
- `POST /v1/admin/disbursements` - Create disbursement
- `GET /v1/admin/disbursements/:id` - Get disbursement
- `PATCH /v1/admin/disbursements/:id/status` - Update status

#### Reports
- `GET /v1/admin/reports/donations-summary` - Donation summary
- `GET /v1/admin/reports/campaigns-performance` - Campaign performance
- `GET /v1/admin/reports/financial-statement` - Financial statement
- `GET /v1/admin/reports/disbursements-summary` - Disbursement summary
- `GET /v1/admin/reports/donor-analytics` - Donor analytics

#### Analytics
- `GET /v1/admin/analytics/overview` - Analytics overview
- `GET /v1/admin/analytics/conversion` - Conversion rates
- `GET /v1/admin/analytics/growth` - Growth metrics

#### Export
- `GET /v1/admin/export/campaigns` - Export campaigns (CSV)
- `GET /v1/admin/export/donations` - Export donations (CSV)
- `GET /v1/admin/export/disbursements` - Export disbursements (CSV)
- `GET /v1/admin/export/users` - Export users (CSV)
- `GET /v1/admin/export/ledger` - Export ledger (CSV)

#### Settings
- `GET /v1/admin/settings` - List settings
- `GET /v1/admin/settings/:key` - Get setting
- `PATCH /v1/admin/settings/:key` - Update setting
- `POST /v1/admin/settings` - Create setting
- `DELETE /v1/admin/settings/:key` - Delete setting

#### Audit Logs
- `GET /v1/admin/audit` - List audit logs
- `GET /v1/admin/audit/stats` - Audit statistics

## Security Features

- Rate limiting (15 req/15min for auth, 60 req/min for API)
- JWT authentication
- RBAC (Role-Based Access Control)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Input sanitization
- SQL injection protection via Drizzle ORM
- Password hashing with bcrypt

## Performance Optimizations

- Response caching
- Gzip compression
- Database query optimization
- Cloudflare Workers edge computing

## Database Schema

### Core Tables
- `users` - User accounts
- `roles` - User roles
- `permissions` - Role permissions
- `user_roles` - User-role mapping
- `role_permissions` - Role-permission mapping

### Campaign Tables
- `categories` - Campaign categories
- `campaigns` - Campaigns
- `campaign_updates` - Campaign updates

### Transaction Tables
- `donations` - Donations
- `payments` - Payment transactions
- `invoices` - Donation invoices
- `payment_gateways` - Gateway configurations
- `payment_methods` - Payment methods
- `payment_gateway_credentials` - Gateway credentials

### Finance Tables
- `ledger_accounts` - Chart of accounts
- `ledger_entries` - Journal entries
- `ledger_lines` - Journal lines
- `disbursements` - Disbursements
- `bank_accounts` - Bank accounts

### Other Tables
- `zakat_configs` - Zakat configurations
- `pages` - Static pages
- `settings` - Application settings
- `audit_logs` - Audit trail
- `notifications` - User notifications
- `media` - Media files

## Deployment

### Cloudflare Workers

```bash
# Build for production
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

### Environment Variables (Production)

Set these in Cloudflare Workers dashboard:

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
RESEND_API_KEY=...
MIDTRANS_SERVER_KEY=...
XENDIT_SECRET_KEY=...
ENVIRONMENT=production
```

## License

Proprietary - All rights reserved

## Contact

- Website: https://bantuanku.org
- Email: support@bantuanku.org
