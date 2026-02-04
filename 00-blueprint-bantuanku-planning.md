# Bantuanku — Planning Document (Comprehensive)

> Dokumen perencanaan lengkap untuk aplikasi donasi "Bantuanku"
> Versi: 1.0.0 | Tanggal: 2026-01-18
> Domain: **bantuanku.org**
> Hosting: **Cloudflare Workers** (100% Edge Compatible)

---

## ⚠️ PENTING: Cloudflare Workers Compatibility

Semua teknologi yang dipilih **WAJIB** compatible dengan Cloudflare Workers runtime:

### Yang BOLEH digunakan:
- ✅ Hono (framework web untuk Workers)
- ✅ Drizzle ORM (bukan Prisma - tidak support Workers)
- ✅ PostgreSQL via Hyperdrive atau Neon Serverless Driver
- ✅ Cloudflare D1 (SQLite edge)
- ✅ Cloudflare R2 (object storage)
- ✅ Cloudflare KV (key-value cache)
- ✅ Cloudflare Queues (background jobs)
- ✅ Web Crypto API (bukan Node.js crypto)
- ✅ jose (JWT library untuk edge)
- ✅ bcryptjs atau @node-rs/bcrypt (password hashing)

### Yang TIDAK BOLEH digunakan:
- ❌ Prisma (tidak support Workers runtime)
- ❌ Node.js native modules (fs, path, crypto, etc)
- ❌ Express.js (tidak compatible)
- ❌ Sequelize, TypeORM (tidak support)
- ❌ node-postgres (pg) - gunakan @neondatabase/serverless
- ❌ Long-running processes (Workers max 30s CPU time)

### Development Offline:
- Local development menggunakan `wrangler dev`
- Database lokal: PostgreSQL atau SQLite
- Simulasi R2/KV dengan miniflare

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Database Schema Lengkap](#3-database-schema-lengkap)
4. [Modul & Fitur](#4-modul--fitur)
5. [Payment Gateway](#5-payment-gateway)
6. [Settings & Konfigurasi](#6-settings--konfigurasi)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [API Endpoints](#8-api-endpoints)
9. [Frontend Routes](#9-frontend-routes)
10. [Security & Compliance](#10-security--compliance)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Roadmap & Milestones](#12-roadmap--milestones)

---

## 1) Ringkasan Eksekutif

### 1.1 Tentang Bantuanku

Bantuanku adalah platform donasi digital yang memungkinkan:
- Penggalangan dana untuk berbagai kampanye (donasi, wakaf, sedekah, zakat, kurban)
- Pembayaran donasi melalui berbagai payment gateway
- Pengelolaan keuangan dengan sistem double-entry ledger
- Pelaporan keuangan yang transparan dan teraudit
- Kalkulator zakat untuk berbagai jenis zakat

### 1.2 Target Pengguna

| Pengguna | Deskripsi |
|----------|-----------|
| Donatur | Masyarakat umum yang ingin berdonasi |
| Admin Campaign | Mengelola kampanye dan konten |
| Admin Finance | Mengelola keuangan, disbursement, laporan |
| Super Admin | Akses penuh ke semua fitur dan konfigurasi |

### 1.3 Unique Selling Points

- Multi payment gateway (Midtrans, Xendit, Flip, manual transfer)
- Kalkulator zakat lengkap (penghasilan, maal, emas, perdagangan, fitrah, fidyah)
- Laporan keuangan teraudit (double-entry ledger)
- Invoice otomatis untuk setiap donasi
- Transparansi penyaluran dana

---

## 2) Arsitektur Sistem

### 2.1 Domain Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN STRUCTURE                        │
├─────────────────────────────────────────────────────────────┤
│  https://bantuanku.org          → Public Website (Donatur)  │
│  https://admin.bantuanku.org    → Admin Dashboard           │
│  https://api.bantuanku.org      → Backend API               │
└─────────────────────────────────────────────────────────────┘

Development (Offline):
┌─────────────────────────────────────────────────────────────┐
│  http://localhost:3000          → Public Website            │
│  http://localhost:3001          → Admin Dashboard           │
│  http://localhost:8787          → Backend API (wrangler)    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack (Cloudflare Workers Compatible)

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| **Frontend Public** | Next.js 14+ (Static Export) / Astro | Deploy ke Cloudflare Pages |
| **Frontend Admin** | Next.js 14+ (Static Export) / Astro | Deploy ke Cloudflare Pages |
| **Backend API** | **Hono + TypeScript** | Cloudflare Workers runtime |
| **ORM** | **Drizzle ORM** | Edge-compatible (bukan Prisma!) |
| **Database** | PostgreSQL via **Neon Serverless** | @neondatabase/serverless driver |
| **Database Alt** | Cloudflare D1 (SQLite) | Untuk data yang sering diakses |
| **Cache** | Cloudflare KV | Session, rate limiting, config |
| **Storage** | Cloudflare R2 | Images, PDF, documents |
| **Queue** | Cloudflare Queues | Background jobs, webhooks |
| **Cron** | Cloudflare Cron Triggers | Scheduled tasks |
| **Email** | Resend (edge-compatible) | Transactional emails |
| **Auth Library** | jose + bcryptjs | JWT & password (edge-safe) |

### 2.3 Package Dependencies (Workers-Safe)

```json
{
  "dependencies": {
    "hono": "^4.x",
    "drizzle-orm": "^0.30.x",
    "@neondatabase/serverless": "^0.9.x",
    "jose": "^5.x",
    "bcryptjs": "^2.4.x",
    "zod": "^3.x",
    "nanoid": "^5.x"
  },
  "devDependencies": {
    "wrangler": "^3.x",
    "drizzle-kit": "^0.21.x",
    "@cloudflare/workers-types": "^4.x",
    "typescript": "^5.x"
  }
}
```

### 2.4 System Architecture Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Donatur    │     │    Admin     │     │   Payment    │
│   Browser    │     │   Browser    │     │   Provider   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                        │
│              (CDN, WAF, DDoS Protection)                 │
└──────────────────────────┬───────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Public Web  │   │  Admin Web   │   │   API        │
│  (CF Pages)  │   │  (CF Pages)  │   │ (CF Workers) │
└──────────────┘   └──────────────┘   └──────┬───────┘
                                             │
          ┌──────────────────────────────────┼──────────────────────────────────┐
          ▼                    ▼             ▼              ▼                   ▼
   ┌──────────────┐   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  PostgreSQL  │   │ Cloudflare   │ │ Cloudflare   │ │ Cloudflare   │ │ Cloudflare   │
   │ (Neon Edge)  │   │     R2       │ │     KV       │ │   Queues     │ │     D1       │
   └──────────────┘   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        Database         Storage          Cache         Background       SQLite Edge
```

---

## 3) Database Schema Lengkap

### 3.1 Overview ERD

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│  UserRole   │>────│    Role     │
└─────────────┘     └─────────────┘     └──────┬──────┘
      │                                        │
      │                                        ▼
      │                                 ┌─────────────┐
      │                                 │ Permission  │
      │                                 └─────────────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Donation   │────>│  Campaign   │────>│  Category   │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Invoice   │     │   Payment   │────>│PaymentGateway│
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ LedgerEntry │────>│ LedgerLine  │────>│LedgerAccount│
└─────────────┘     └─────────────┘     └─────────────┘
```

### 3.2 Tabel: User

```sql
CREATE TABLE "User" (
    id              TEXT PRIMARY KEY,           -- UUID
    email           TEXT UNIQUE NOT NULL,
    passwordHash    TEXT,                       -- nullable untuk social login
    name            TEXT NOT NULL,
    phone           TEXT,
    avatar          TEXT,                       -- URL avatar
    emailVerifiedAt TIMESTAMP(3),
    phoneVerifiedAt TIMESTAMP(3),
    isActive        BOOLEAN DEFAULT true,
    lastLoginAt     TIMESTAMP(3),
    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL
);
```

### 3.3 Tabel: Role

```sql
CREATE TABLE "Role" (
    id          TEXT PRIMARY KEY,               -- UUID
    slug        TEXT UNIQUE NOT NULL,           -- super_admin, admin_finance, admin_campaign, user
    name        TEXT NOT NULL,
    description TEXT,
    isSystem    BOOLEAN DEFAULT false,          -- role bawaan sistem
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.4 Tabel: Permission

```sql
CREATE TABLE "Permission" (
    id          TEXT PRIMARY KEY,               -- UUID
    key         TEXT UNIQUE NOT NULL,           -- campaign.create, donation.view, etc
    name        TEXT NOT NULL,
    module      TEXT NOT NULL,                  -- campaign, donation, finance, setting
    description TEXT,
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 Tabel: UserRole

```sql
CREATE TABLE "UserRole" (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    roleId    TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
    createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, roleId)
);
```

### 3.6 Tabel: RolePermission

```sql
CREATE TABLE "RolePermission" (
    id           TEXT PRIMARY KEY,
    roleId       TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
    permissionId TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
    createdAt    TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(roleId, permissionId)
);
```

### 3.7 Tabel: Category

```sql
CREATE TABLE "Category" (
    id          TEXT PRIMARY KEY,               -- UUID
    slug        TEXT UNIQUE NOT NULL,           -- donasi, wakaf, sedekah, zakat, kurban
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,                           -- icon name atau URL
    color       TEXT,                           -- hex color
    sortOrder   INTEGER DEFAULT 0,
    isActive    BOOLEAN DEFAULT true,
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.8 Tabel: Campaign

```sql
CREATE TABLE "Campaign" (
    id              TEXT PRIMARY KEY,           -- UUID
    categoryId      TEXT REFERENCES "Category"(id),
    category        TEXT NOT NULL,              -- legacy: slug kategori
    title           TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    description     TEXT NOT NULL,
    content         TEXT,                       -- rich text / markdown
    imageUrl        TEXT NOT NULL,
    images          JSONB,                      -- array of image URLs
    videoUrl        TEXT,
    goal            BIGINT NOT NULL,            -- target donasi
    collected       BIGINT DEFAULT 0,           -- jumlah terkumpul (materialized)
    donorCount      INTEGER DEFAULT 0,          -- jumlah donatur (materialized)
    pillar          TEXT DEFAULT 'Kemanusiaan',
    startDate       TIMESTAMP(3),
    endDate         TIMESTAMP(3),
    isFeatured      BOOLEAN DEFAULT false,
    isUrgent        BOOLEAN DEFAULT false,
    status          TEXT DEFAULT 'draft',       -- draft, active, completed, cancelled
    publishedAt     TIMESTAMP(3),
    createdBy       TEXT REFERENCES "User"(id),
    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL
);
```

### 3.9 Tabel: CampaignUpdate

```sql
CREATE TABLE "CampaignUpdate" (
    id          TEXT PRIMARY KEY,
    campaignId  TEXT NOT NULL REFERENCES "Campaign"(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    images      JSONB,
    createdBy   TEXT REFERENCES "User"(id),
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.10 Tabel: PaymentGateway

```sql
CREATE TABLE "PaymentGateway" (
    id              TEXT PRIMARY KEY,           -- UUID
    code            TEXT UNIQUE NOT NULL,       -- midtrans, xendit, flip, manual
    name            TEXT NOT NULL,
    description     TEXT,
    logo            TEXT,                       -- URL logo
    type            TEXT NOT NULL,              -- auto, manual
    isActive        BOOLEAN DEFAULT true,
    sortOrder       INTEGER DEFAULT 0,
    config          JSONB,                      -- konfigurasi umum (non-sensitive)
    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL
);
```

### 3.11 Tabel: PaymentGatewayCredential

```sql
CREATE TABLE "PaymentGatewayCredential" (
    id              TEXT PRIMARY KEY,
    gatewayId       TEXT NOT NULL REFERENCES "PaymentGateway"(id) ON DELETE CASCADE,
    environment     TEXT NOT NULL,              -- sandbox, production
    credentials     TEXT NOT NULL,              -- encrypted JSON
    isActive        BOOLEAN DEFAULT true,
    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL,
    UNIQUE(gatewayId, environment)
);
```

### 3.12 Tabel: PaymentMethod

```sql
CREATE TABLE "PaymentMethod" (
    id              TEXT PRIMARY KEY,
    gatewayId       TEXT NOT NULL REFERENCES "PaymentGateway"(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,              -- bca_va, mandiri_va, gopay, qris, etc
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,              -- va, ewallet, qris, bank_transfer, retail
    icon            TEXT,
    fee             JSONB,                      -- {type: 'fixed'|'percent', value: 2500}
    minAmount       BIGINT DEFAULT 10000,
    maxAmount       BIGINT,
    isActive        BOOLEAN DEFAULT true,
    sortOrder       INTEGER DEFAULT 0,
    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL,
    UNIQUE(gatewayId, code)
);
```

### 3.13 Tabel: Donation

```sql
CREATE TABLE "Donation" (
    id              TEXT PRIMARY KEY,           -- UUID
    referenceId     TEXT UNIQUE NOT NULL,       -- public reference (DNT-YYYYMMDD-XXXX)
    campaignId      TEXT NOT NULL REFERENCES "Campaign"(id),
    userId          TEXT REFERENCES "User"(id), -- nullable untuk guest
    source          TEXT NOT NULL,              -- user, admin

    -- Donor info
    donorName       TEXT NOT NULL,
    donorEmail      TEXT,
    donorPhone      TEXT,
    isAnonymous     BOOLEAN DEFAULT false,

    -- Amount
    amount          BIGINT NOT NULL,
    feeAmount       BIGINT DEFAULT 0,
    totalAmount     BIGINT NOT NULL,            -- amount + feeAmount

    -- Payment
    paymentMethodId TEXT REFERENCES "PaymentMethod"(id),
    paymentStatus   TEXT DEFAULT 'pending',     -- pending, processing, success, failed, expired, refunded
    paidAt          TIMESTAMP(3),
    expiredAt       TIMESTAMP(3),

    -- Additional
    message         TEXT,
    note            TEXT,                       -- internal note
    metadata        JSONB,                      -- additional data

    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL
);
```

### 3.14 Tabel: Payment

```sql
CREATE TABLE "Payment" (
    id                  TEXT PRIMARY KEY,
    donationId          TEXT NOT NULL REFERENCES "Donation"(id),
    gatewayId           TEXT NOT NULL REFERENCES "PaymentGateway"(id),
    methodId            TEXT REFERENCES "PaymentMethod"(id),

    -- Gateway response
    externalId          TEXT,                   -- ID dari payment gateway
    externalStatus      TEXT,

    -- Payment details
    amount              BIGINT NOT NULL,
    feeAmount           BIGINT DEFAULT 0,

    -- VA / Payment info
    paymentCode         TEXT,                   -- VA number, payment code
    paymentUrl          TEXT,                   -- redirect URL / deep link
    qrCode              TEXT,                   -- QR code string

    -- Status
    status              TEXT DEFAULT 'pending', -- pending, success, failed, expired
    paidAt              TIMESTAMP(3),
    expiredAt           TIMESTAMP(3),

    -- Raw response
    requestPayload      JSONB,
    responsePayload     JSONB,
    webhookPayload      JSONB,

    createdAt           TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt           TIMESTAMP(3) NOT NULL
);
```

### 3.15 Tabel: Invoice

```sql
CREATE TABLE "Invoice" (
    id              TEXT PRIMARY KEY,
    invoiceNumber   TEXT UNIQUE NOT NULL,       -- INV-YYYYMM-XXXX
    donationId      TEXT NOT NULL REFERENCES "Donation"(id),

    -- Invoice details
    issuedAt        TIMESTAMP(3) NOT NULL,
    issuedBy        TEXT,                       -- system / adminUserId
    dueDate         TIMESTAMP(3),

    -- Amount
    subtotal        BIGINT NOT NULL,
    feeAmount       BIGINT DEFAULT 0,
    totalAmount     BIGINT NOT NULL,
    currency        TEXT DEFAULT 'IDR',

    -- Payer info
    payerName       TEXT NOT NULL,
    payerEmail      TEXT,
    payerPhone      TEXT,
    payerAddress    TEXT,

    -- Status
    status          TEXT DEFAULT 'issued',      -- issued, paid, void, cancelled
    paidAt          TIMESTAMP(3),

    -- File
    pdfUrl          TEXT,

    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.16 Tabel: LedgerAccount

```sql
CREATE TABLE "LedgerAccount" (
    id          TEXT PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,           -- 1010, 1020, 4010, etc
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,                  -- asset, liability, equity, revenue, expense
    normalSide  TEXT NOT NULL,                  -- debit, credit
    parentId    TEXT REFERENCES "LedgerAccount"(id),
    description TEXT,
    isActive    BOOLEAN DEFAULT true,
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.17 Tabel: LedgerEntry

```sql
CREATE TABLE "LedgerEntry" (
    id          TEXT PRIMARY KEY,
    entryNumber TEXT UNIQUE NOT NULL,           -- JE-YYYYMM-XXXX
    refType     TEXT NOT NULL,                  -- donation, disbursement, adjustment, opening
    refId       TEXT,                           -- ID transaksi terkait
    postedAt    TIMESTAMP(3) NOT NULL,
    memo        TEXT,
    status      TEXT DEFAULT 'posted',          -- draft, posted, void
    createdBy   TEXT REFERENCES "User"(id),
    approvedBy  TEXT REFERENCES "User"(id),
    approvedAt  TIMESTAMP(3),
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.18 Tabel: LedgerLine

```sql
CREATE TABLE "LedgerLine" (
    id          TEXT PRIMARY KEY,
    entryId     TEXT NOT NULL REFERENCES "LedgerEntry"(id) ON DELETE CASCADE,
    accountId   TEXT NOT NULL REFERENCES "LedgerAccount"(id),
    description TEXT,
    debit       BIGINT DEFAULT 0,
    credit      BIGINT DEFAULT 0,
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.19 Tabel: Disbursement

```sql
CREATE TABLE "Disbursement" (
    id              TEXT PRIMARY KEY,
    referenceId     TEXT UNIQUE NOT NULL,       -- DSB-YYYYMM-XXXX
    campaignId      TEXT REFERENCES "Campaign"(id),

    -- Amount
    amount          BIGINT NOT NULL,

    -- Recipient
    recipientName   TEXT NOT NULL,
    recipientBank   TEXT,
    recipientAccount TEXT,
    recipientPhone  TEXT,

    -- Purpose
    purpose         TEXT NOT NULL,
    description     TEXT,
    attachments     JSONB,                      -- array of file URLs

    -- Status
    status          TEXT DEFAULT 'pending',     -- pending, approved, processed, completed, rejected

    -- Approval
    requestedBy     TEXT REFERENCES "User"(id),
    requestedAt     TIMESTAMP(3),
    approvedBy      TEXT REFERENCES "User"(id),
    approvedAt      TIMESTAMP(3),
    rejectedBy      TEXT REFERENCES "User"(id),
    rejectedAt      TIMESTAMP(3),
    rejectionReason TEXT,

    -- Processing
    processedAt     TIMESTAMP(3),
    completedAt     TIMESTAMP(3),
    proofUrl        TEXT,                       -- bukti transfer

    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL
);
```

### 3.20 Tabel: ZakatCalculatorConfig

```sql
CREATE TABLE "ZakatCalculatorConfig" (
    id          TEXT PRIMARY KEY,
    type        TEXT UNIQUE NOT NULL,           -- income, maal, gold, trade, fitrah, fidyah
    name        TEXT NOT NULL,
    description TEXT,

    -- Nisab config
    nisabValue  BIGINT,                         -- nilai nisab (rupiah)
    nisabUnit   TEXT,                           -- rupiah, gram_gold, gram_silver
    nisabGoldGram DECIMAL(10,2),                -- gram emas untuk nisab

    -- Rate
    rateBps     INTEGER,                        -- rate basis point (250 = 2.5%)

    -- Additional config
    config      JSONB,                          -- konfigurasi tambahan per tipe

    isActive    BOOLEAN DEFAULT true,
    updatedBy   TEXT REFERENCES "User"(id),
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.21 Tabel: ZakatCalculationLog

```sql
CREATE TABLE "ZakatCalculationLog" (
    id              TEXT PRIMARY KEY,
    userId          TEXT REFERENCES "User"(id), -- nullable untuk guest
    calculatorType  TEXT NOT NULL,

    -- Input & Result
    inputData       JSONB NOT NULL,
    nisabValue      BIGINT,
    resultAmount    BIGINT NOT NULL,

    -- Conversion
    donationId      TEXT REFERENCES "Donation"(id),
    isConverted     BOOLEAN DEFAULT false,

    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.22 Tabel: Page

```sql
CREATE TABLE "Page" (
    id          TEXT PRIMARY KEY,
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,                  -- HTML atau Markdown
    excerpt     TEXT,

    -- SEO
    metaTitle   TEXT,
    metaDescription TEXT,

    -- Status
    isPublished BOOLEAN DEFAULT true,
    publishedAt TIMESTAMP(3),

    createdBy   TEXT REFERENCES "User"(id),
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.23 Tabel: Setting

```sql
CREATE TABLE "Setting" (
    id          TEXT PRIMARY KEY,
    key         TEXT UNIQUE NOT NULL,
    value       TEXT NOT NULL,                  -- JSON string
    type        TEXT DEFAULT 'string',          -- string, number, boolean, json, image
    label       TEXT NOT NULL,
    description TEXT,
    category    TEXT NOT NULL,                  -- general, branding, payment, zakat, email, seo
    sortOrder   INTEGER DEFAULT 0,
    isPublic    BOOLEAN DEFAULT false,          -- apakah bisa diakses public API
    updatedBy   TEXT REFERENCES "User"(id),
    updatedAt   TIMESTAMP(3) NOT NULL
);
```

### 3.24 Tabel: AuditLog

```sql
CREATE TABLE "AuditLog" (
    id          TEXT PRIMARY KEY,
    userId      TEXT REFERENCES "User"(id),
    action      TEXT NOT NULL,                  -- create, update, delete, login, logout
    entity      TEXT NOT NULL,                  -- campaign, donation, user, setting
    entityId    TEXT,
    oldData     JSONB,
    newData     JSONB,
    ipAddress   TEXT,
    userAgent   TEXT,
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.25 Tabel: Notification

```sql
CREATE TABLE "Notification" (
    id          TEXT PRIMARY KEY,
    userId      TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,                  -- donation, campaign, system
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    data        JSONB,
    isRead      BOOLEAN DEFAULT false,
    readAt      TIMESTAMP(3),
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.26 Tabel: Media

```sql
CREATE TABLE "Media" (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType    TEXT NOT NULL,
    size        BIGINT NOT NULL,                -- bytes
    url         TEXT NOT NULL,
    path        TEXT NOT NULL,                  -- path di storage
    folder      TEXT DEFAULT 'uploads',         -- campaigns, invoices, receipts, etc
    uploadedBy  TEXT REFERENCES "User"(id),
    createdAt   TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### 3.27 Tabel: BankAccount

```sql
CREATE TABLE "BankAccount" (
    id              TEXT PRIMARY KEY,
    bankCode        TEXT NOT NULL,              -- bca, mandiri, bni, bsi
    bankName        TEXT NOT NULL,
    accountNumber   TEXT NOT NULL,
    accountName     TEXT NOT NULL,
    branch          TEXT,
    isActive        BOOLEAN DEFAULT true,
    isDefault       BOOLEAN DEFAULT false,
    sortOrder       INTEGER DEFAULT 0,
    createdAt       TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP(3) NOT NULL
);
```

---

## 4) Modul & Fitur

### 4.1 Modul Public (Donatur)

| Modul | Fitur |
|-------|-------|
| **Landing** | Hero, kategori, campaign trending, statistik, testimoni |
| **Campaign List** | Filter, search, sort, pagination |
| **Campaign Detail** | Info, progress, donatur list, updates, share |
| **Donasi** | Form donasi, pilih payment, konfirmasi |
| **Payment** | VA, e-wallet, QRIS, transfer manual |
| **Status Donasi** | Cek status, download invoice |
| **Zakat** | Kalkulator (6 jenis), langsung donasi |
| **Akun** | Register, login, profile, riwayat donasi |
| **Pages** | Tentang, FAQ, kontak, kebijakan |

### 4.2 Modul Admin

| Modul | Fitur | Role |
|-------|-------|------|
| **Dashboard** | Statistik, grafik, aktivitas terbaru | All Admin |
| **Campaign** | CRUD, update, media | Admin Campaign, Super Admin |
| **Donasi** | List, detail, tambah manual, export | Admin Finance, Super Admin |
| **Keuangan** | Ledger, disbursement, rekonsiliasi | Admin Finance, Super Admin |
| **Laporan** | Generate, download, schedule | Admin Finance, Super Admin |
| **User** | CRUD user, assign role | Super Admin |
| **Role & Permission** | Kelola role, permission | Super Admin |
| **Pages** | CRUD halaman statis | Super Admin |
| **Settings** | Semua konfigurasi | Super Admin |
| **Audit Log** | Lihat semua aktivitas | Super Admin |

---

## 5) Payment Gateway

### 5.1 Supported Gateways

| Gateway | Tipe | Payment Methods |
|---------|------|-----------------|
| **Midtrans** | Auto | VA (BCA, BNI, Mandiri, Permata, BRI), GoPay, ShopeePay, QRIS, Credit Card |
| **Xendit** | Auto | VA (semua bank), OVO, DANA, LinkAja, QRIS, Retail (Alfamart, Indomaret) |
| **Flip** | Auto | VA, E-wallet, QRIS |
| **Manual** | Manual | Transfer bank manual (konfirmasi admin) |

### 5.2 Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Donatur   │────>│  Pilih      │────>│  Create     │────>│  Redirect/  │
│   Donasi    │     │  Payment    │     │  Payment    │     │  Show VA    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                    ┌─────────────┐     ┌─────────────┐            │
                    │  Update     │<────│  Webhook    │<───────────┘
                    │  Status     │     │  Callback   │
                    └──────┬──────┘     └─────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Generate   │     │  Update     │     │   Send      │
│  Invoice    │     │  Ledger     │     │   Email     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5.3 Gateway Configuration (Admin Settings)

```json
{
  "midtrans": {
    "environment": "sandbox|production",
    "merchantId": "xxx",
    "clientKey": "xxx",
    "serverKey": "xxx (encrypted)",
    "enabledMethods": ["bca_va", "gopay", "qris"],
    "callbackUrl": "https://api.domain.com/v1/payments/midtrans/callback",
    "notificationUrl": "https://api.domain.com/v1/payments/midtrans/webhook"
  },
  "xendit": {
    "environment": "sandbox|production",
    "publicKey": "xxx",
    "secretKey": "xxx (encrypted)",
    "callbackToken": "xxx (encrypted)",
    "enabledMethods": ["bca_va", "ovo", "qris"]
  }
}
```

---

## 6) Settings & Konfigurasi

### 6.1 Kategori Settings

#### 6.1.1 General

| Key | Label | Type | Default |
|-----|-------|------|---------|
| `site_name` | Nama Situs | string | Bantuanku |
| `site_tagline` | Tagline | string | Platform Donasi Terpercaya |
| `site_description` | Deskripsi | text | - |
| `contact_email` | Email Kontak | string | - |
| `contact_phone` | Telepon | string | - |
| `contact_whatsapp` | WhatsApp | string | - |
| `contact_address` | Alamat | text | - |
| `social_facebook` | Facebook URL | string | - |
| `social_instagram` | Instagram URL | string | - |
| `social_twitter` | Twitter URL | string | - |
| `social_youtube` | YouTube URL | string | - |

#### 6.1.2 Branding

| Key | Label | Type |
|-----|-------|------|
| `logo_light` | Logo (Light Mode) | image |
| `logo_dark` | Logo (Dark Mode) | image |
| `favicon` | Favicon | image |
| `primary_color` | Warna Primer | color |
| `secondary_color` | Warna Sekunder | color |

#### 6.1.3 Payment

| Key | Label | Type |
|-----|-------|------|
| `payment_environment` | Environment | select (sandbox/production) |
| `payment_expiry_hours` | Expiry (jam) | number |
| `minimum_donation` | Donasi Minimum | number |
| `enable_fee_on_donor` | Fee ditanggung donatur | boolean |
| `enabled_gateways` | Gateway Aktif | multi-select |

#### 6.1.4 Zakat

| Key | Label | Type |
|-----|-------|------|
| `gold_price_per_gram` | Harga Emas/gram | number |
| `silver_price_per_gram` | Harga Perak/gram | number |
| `nisab_gold_gram` | Nisab Emas (gram) | number |
| `nisab_silver_gram` | Nisab Perak (gram) | number |
| `zakat_fitrah_amount` | Zakat Fitrah/jiwa | number |
| `fidyah_amount_per_day` | Fidyah/hari | number |

#### 6.1.5 Email

| Key | Label | Type |
|-----|-------|------|
| `email_provider` | Provider | select (resend/sendgrid/smtp) |
| `email_from_name` | Nama Pengirim | string |
| `email_from_address` | Email Pengirim | string |
| `email_api_key` | API Key | password (encrypted) |

#### 6.1.6 SEO

| Key | Label | Type |
|-----|-------|------|
| `meta_title` | Default Title | string |
| `meta_description` | Default Description | text |
| `meta_keywords` | Keywords | string |
| `og_image` | OG Image | image |
| `google_analytics_id` | GA4 ID | string |
| `facebook_pixel_id` | FB Pixel ID | string |

### 6.2 Settings UI (Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │  General     │  ← Tab Navigation                             │
│  │  Branding    │                                               │
│  │  Payment     │                                               │
│  │  Zakat       │                                               │
│  │  Email       │                                               │
│  │  SEO         │                                               │
│  └──────────────┘                                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  General Settings                                          │ │
│  │                                                            │ │
│  │  Nama Situs        [Bantuanku                        ]    │ │
│  │  Tagline           [Platform Donasi Terpercaya       ]    │ │
│  │  Email Kontak      [info@bantuanku.id                ]    │ │
│  │  Telepon           [021-1234567                      ]    │ │
│  │  WhatsApp          [6281234567890                    ]    │ │
│  │                                                            │ │
│  │                              [ Batal ]  [ Simpan ]         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7) User Roles & Permissions

### 7.1 Default Roles

| Role | Slug | Deskripsi |
|------|------|-----------|
| Super Admin | `super_admin` | Akses penuh ke semua fitur |
| Admin Finance | `admin_finance` | Kelola keuangan, laporan, disbursement |
| Admin Campaign | `admin_campaign` | Kelola campaign, konten |
| User | `user` | Donatur terdaftar |

### 7.2 Permission Matrix

| Permission | Super Admin | Admin Finance | Admin Campaign | User |
|------------|:-----------:|:-------------:|:--------------:|:----:|
| `dashboard.view` | ✓ | ✓ | ✓ | - |
| `campaign.view` | ✓ | ✓ | ✓ | - |
| `campaign.create` | ✓ | - | ✓ | - |
| `campaign.update` | ✓ | - | ✓ | - |
| `campaign.delete` | ✓ | - | - | - |
| `donation.view` | ✓ | ✓ | ✓ | - |
| `donation.create_manual` | ✓ | ✓ | - | - |
| `donation.export` | ✓ | ✓ | - | - |
| `finance.ledger` | ✓ | ✓ | - | - |
| `finance.disbursement` | ✓ | ✓ | - | - |
| `finance.approve` | ✓ | ✓ | - | - |
| `report.view` | ✓ | ✓ | - | - |
| `report.generate` | ✓ | ✓ | - | - |
| `user.view` | ✓ | - | - | - |
| `user.create` | ✓ | - | - | - |
| `user.update` | ✓ | - | - | - |
| `user.delete` | ✓ | - | - | - |
| `role.manage` | ✓ | - | - | - |
| `page.manage` | ✓ | - | - | - |
| `setting.view` | ✓ | - | - | - |
| `setting.update` | ✓ | - | - | - |
| `audit.view` | ✓ | - | - | - |

---

## 8) API Endpoints

### 8.1 Authentication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/v1/auth/register` | Register user baru |
| POST | `/v1/auth/login` | Login |
| POST | `/v1/auth/logout` | Logout |
| POST | `/v1/auth/refresh` | Refresh token |
| POST | `/v1/auth/forgot-password` | Request reset password |
| POST | `/v1/auth/reset-password` | Reset password |
| GET | `/v1/auth/me` | Get current user |
| PATCH | `/v1/auth/me` | Update profile |
| PATCH | `/v1/auth/me/password` | Change password |

### 8.2 Public - Campaigns

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/campaigns` | List campaigns |
| GET | `/v1/campaigns/:idOrSlug` | Detail campaign |
| GET | `/v1/campaigns/:id/donations` | List donatur |
| GET | `/v1/campaigns/:id/updates` | List updates |
| GET | `/v1/categories` | List categories |

### 8.3 Public - Donations

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/v1/donations` | Create donation |
| GET | `/v1/donations/:id` | Get donation status |
| GET | `/v1/donations/:id/invoice` | Download invoice |
| GET | `/v1/donations/check/:referenceId` | Check by reference |

### 8.4 Public - Payment

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/payment-methods` | List available methods |
| POST | `/v1/payments/create` | Create payment |
| POST | `/v1/payments/:gateway/webhook` | Webhook callback |

### 8.5 Public - Zakat

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/zakat/config` | Get zakat config |
| POST | `/v1/zakat/calculate` | Calculate zakat |

### 8.6 Public - Pages & Settings

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/pages/:slug` | Get page content |
| GET | `/v1/settings/public` | Get public settings |

### 8.7 Admin - Dashboard

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/dashboard/stats` | Get statistics |
| GET | `/v1/admin/dashboard/charts` | Get chart data |
| GET | `/v1/admin/dashboard/activities` | Recent activities |

### 8.8 Admin - Campaigns

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/campaigns` | List all campaigns |
| POST | `/v1/admin/campaigns` | Create campaign |
| GET | `/v1/admin/campaigns/:id` | Get campaign |
| PATCH | `/v1/admin/campaigns/:id` | Update campaign |
| DELETE | `/v1/admin/campaigns/:id` | Delete campaign |
| POST | `/v1/admin/campaigns/:id/updates` | Add update |
| PATCH | `/v1/admin/campaigns/:id/status` | Change status |

### 8.9 Admin - Donations

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/donations` | List donations |
| GET | `/v1/admin/donations/:id` | Get donation |
| POST | `/v1/admin/donations/manual` | Create manual donation |
| GET | `/v1/admin/donations/export` | Export to Excel |

### 8.10 Admin - Finance

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/finance/ledger` | Get ledger entries |
| GET | `/v1/admin/finance/accounts` | Get accounts |
| POST | `/v1/admin/finance/entries` | Create journal entry |
| GET | `/v1/admin/finance/disbursements` | List disbursements |
| POST | `/v1/admin/finance/disbursements` | Create disbursement |
| PATCH | `/v1/admin/finance/disbursements/:id` | Update disbursement |
| POST | `/v1/admin/finance/disbursements/:id/approve` | Approve |
| POST | `/v1/admin/finance/disbursements/:id/reject` | Reject |

### 8.11 Admin - Reports

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/reports/donations` | Donation report |
| GET | `/v1/admin/reports/campaigns` | Campaign report |
| GET | `/v1/admin/reports/finance` | Finance report |
| POST | `/v1/admin/reports/generate` | Generate PDF report |

### 8.12 Admin - Users

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/users` | List users |
| POST | `/v1/admin/users` | Create user |
| GET | `/v1/admin/users/:id` | Get user |
| PATCH | `/v1/admin/users/:id` | Update user |
| DELETE | `/v1/admin/users/:id` | Delete user |
| PATCH | `/v1/admin/users/:id/roles` | Assign roles |

### 8.13 Admin - Roles & Permissions

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/roles` | List roles |
| POST | `/v1/admin/roles` | Create role |
| PATCH | `/v1/admin/roles/:id` | Update role |
| DELETE | `/v1/admin/roles/:id` | Delete role |
| GET | `/v1/admin/permissions` | List permissions |
| PATCH | `/v1/admin/roles/:id/permissions` | Update role permissions |

### 8.14 Admin - Pages

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/pages` | List pages |
| POST | `/v1/admin/pages` | Create page |
| GET | `/v1/admin/pages/:id` | Get page |
| PATCH | `/v1/admin/pages/:id` | Update page |
| DELETE | `/v1/admin/pages/:id` | Delete page |

### 8.15 Admin - Settings

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/settings` | Get all settings |
| GET | `/v1/admin/settings/:category` | Get by category |
| PATCH | `/v1/admin/settings` | Update settings |
| GET | `/v1/admin/settings/payment-gateways` | List gateways |
| PATCH | `/v1/admin/settings/payment-gateways/:id` | Update gateway |

### 8.16 Admin - Media

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/media` | List media |
| POST | `/v1/admin/media/upload` | Upload file |
| DELETE | `/v1/admin/media/:id` | Delete file |

### 8.17 Admin - Audit Log

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/v1/admin/audit-logs` | List audit logs |
| GET | `/v1/admin/audit-logs/:id` | Get detail |

---

## 9) Frontend Routes

### 9.1 Public Website (bantuanku.id)

| Route | Page | Deskripsi |
|-------|------|-----------|
| `/` | Landing | Homepage |
| `/campaigns` | Campaign List | Daftar campaign |
| `/campaigns/:slug` | Campaign Detail | Detail campaign |
| `/donate/:campaignId` | Donation Form | Form donasi |
| `/donation/:id` | Donation Status | Status donasi |
| `/donation/:id/invoice` | Invoice | Lihat invoice |
| `/zakat` | Zakat Landing | Pilih kalkulator |
| `/zakat/:type` | Zakat Calculator | Kalkulator zakat |
| `/p/:slug` | Static Page | Halaman statis |
| `/login` | Login | Login donatur |
| `/register` | Register | Daftar donatur |
| `/forgot-password` | Forgot Password | Lupa password |
| `/reset-password` | Reset Password | Reset password |
| `/account` | Account Dashboard | Dashboard donatur |
| `/account/donations` | My Donations | Riwayat donasi |
| `/account/profile` | Profile | Edit profile |

### 9.2 Admin Dashboard (admin.bantuanku.id)

| Route | Page | Deskripsi |
|-------|------|-----------|
| `/login` | Admin Login | Login admin |
| `/` | Dashboard | Overview |
| `/campaigns` | Campaigns | List campaign |
| `/campaigns/create` | Create Campaign | Tambah campaign |
| `/campaigns/:id` | Edit Campaign | Edit campaign |
| `/campaigns/:id/updates` | Campaign Updates | Kelola updates |
| `/donations` | Donations | List donasi |
| `/donations/:id` | Donation Detail | Detail donasi |
| `/donations/manual` | Manual Donation | Input manual |
| `/finance` | Finance Overview | Overview keuangan |
| `/finance/ledger` | Ledger | Journal entries |
| `/finance/accounts` | Accounts | Chart of accounts |
| `/finance/disbursements` | Disbursements | Penyaluran dana |
| `/finance/bank-accounts` | Bank Accounts | Rekening bank |
| `/reports` | Reports | Daftar laporan |
| `/reports/donations` | Donation Report | Laporan donasi |
| `/reports/finance` | Finance Report | Laporan keuangan |
| `/users` | Users | Kelola user |
| `/users/:id` | User Detail | Detail user |
| `/roles` | Roles | Kelola role |
| `/pages` | Pages | Halaman statis |
| `/pages/:id` | Edit Page | Edit halaman |
| `/settings` | Settings | Pengaturan |
| `/settings/general` | General Settings | Umum |
| `/settings/branding` | Branding | Logo, warna |
| `/settings/payment` | Payment Settings | Payment gateway |
| `/settings/zakat` | Zakat Settings | Konfigurasi zakat |
| `/settings/email` | Email Settings | Email provider |
| `/settings/seo` | SEO Settings | Meta, analytics |
| `/audit-logs` | Audit Logs | Log aktivitas |
| `/profile` | Admin Profile | Profile admin |

---

## 10) Security & Compliance

### 10.1 Authentication & Authorization

- **JWT + Refresh Token**: Access token (15 menit), Refresh token (7 hari) di httpOnly cookie
- **Password**: Bcrypt dengan cost factor 12
- **Rate Limiting**: Login attempts, API calls
- **RBAC**: Role-based access control dengan permission granular

### 10.2 Data Protection

- **Encryption at rest**: Credentials payment gateway dienkripsi (AES-256)
- **HTTPS only**: Force HTTPS di semua domain
- **Input validation**: Zod schema validation di semua endpoint
- **SQL Injection prevention**: Parameterized queries (Prisma/Drizzle)
- **XSS prevention**: HTML sanitization, CSP headers

### 10.3 Payment Security

- **PCI DSS awareness**: Tidak menyimpan data kartu kredit langsung
- **Webhook validation**: Signature verification dari payment gateway
- **Idempotency**: Prevent duplicate transactions

### 10.4 Audit & Compliance

- **Audit log**: Semua aksi admin tercatat
- **Ledger immutability**: Journal entry tidak bisa diedit, hanya void
- **Data retention**: Sesuai regulasi

---

## 11) Deployment & Infrastructure

### 11.1 Cloudflare Stack

| Service | Fungsi | Local Equivalent |
|---------|--------|------------------|
| **Workers** | Backend API (Hono) | `wrangler dev` (miniflare) |
| **Pages** | Frontend hosting | `npm run dev` |
| **D1** | SQLite edge database | Local SQLite file |
| **Hyperdrive** | Postgres connection pooler | Direct Neon connection |
| **R2** | Object storage | Local folder / miniflare R2 |
| **KV** | Key-value cache | miniflare KV |
| **Queues** | Background jobs | miniflare Queues |
| **Cron Triggers** | Scheduled tasks | Manual trigger |

### 11.2 Environment

| Environment | Domain | Database | Purpose |
|-------------|--------|----------|---------|
| **Development** | localhost:8787 | Local PostgreSQL / SQLite | Offline development |
| **Staging** | staging.bantuanku.org | Neon (staging branch) | Testing |
| **Production** | bantuanku.org | Neon (main branch) | Live |

### 11.3 Local Development Setup

```bash
# 1. Clone repository
git clone <repo>
cd bantuanku

# 2. Install dependencies
npm install

# 3. Setup local database
# Option A: PostgreSQL lokal
docker run -d --name bantuanku-db -p 5432:5432 \
  -e POSTGRES_DB=bantuanku \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16

# Option B: SQLite (D1 local)
# Otomatis via wrangler

# 4. Run migrations
npm run db:migrate

# 5. Seed data
npm run db:seed

# 6. Start development
npm run dev          # Frontend (port 3000, 3001)
npm run dev:api      # Backend (wrangler dev, port 8787)
```

### 11.4 Wrangler Configuration (wrangler.toml)

```toml
name = "bantuanku-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

# Local development bindings
[[d1_databases]]
binding = "DB"
database_name = "bantuanku"
database_id = "local"

[[kv_namespaces]]
binding = "CACHE"
id = "local"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "bantuanku-storage"

[[queues.producers]]
binding = "QUEUE"
queue = "bantuanku-queue"

# Production overrides via wrangler.toml or dashboard
```

### 11.5 Environment Variables

```env
# .dev.vars (local development)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bantuanku
JWT_SECRET=local-dev-secret-change-in-production
RESEND_API_KEY=re_xxxx

# Production (set via Cloudflare Dashboard > Workers > Settings > Variables)
# DATABASE_URL=postgresql://...@neon.tech/bantuanku
# JWT_SECRET=<secure-random-string>
# RESEND_API_KEY=re_xxxx
```

### 11.6 CI/CD Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────>│   Build &   │────>│   Deploy    │────>│  Cloudflare │
│   Push      │     │   Test      │     │   Preview   │     │   Workers   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 12) Roadmap & Milestones

### Phase 1: Foundation (MVP)

- [ ] Setup project structure
- [ ] Database schema & migrations
- [ ] Authentication (register, login, JWT)
- [ ] Basic RBAC
- [ ] Campaign CRUD
- [ ] Donation flow (1 payment gateway)
- [ ] Basic admin dashboard
- [ ] Landing page

### Phase 2: Payment & Finance

- [ ] Multi payment gateway integration
- [ ] Payment webhook handling
- [ ] Invoice generation
- [ ] Double-entry ledger
- [ ] Disbursement management
- [ ] Basic reports

### Phase 3: Features Enhancement

- [ ] Zakat calculator (all types)
- [ ] Campaign updates
- [ ] Donor dashboard
- [ ] Email notifications
- [ ] Advanced search & filter
- [ ] Export functionality

### Phase 4: Advanced

- [ ] Full settings management
- [ ] Advanced reporting
- [ ] Audit logs
- [ ] Media library
- [ ] SEO optimization
- [ ] Performance optimization

### Phase 5: Scale & Polish

- [ ] Mobile responsiveness
- [ ] PWA support
- [ ] Multi-language
- [ ] Advanced analytics
- [ ] A/B testing
- [ ] Documentation

---

## Catatan Akhir

Dokumen ini adalah panduan komprehensif untuk pengembangan aplikasi Bantuanku. Setiap section dapat dikembangkan lebih detail sesuai kebutuhan. Pastikan untuk:

1. Review dan validasi requirement dengan stakeholder
2. Prioritaskan fitur berdasarkan MVP
3. Iterasi dan update dokumen seiring development
4. Maintain konsistensi antara dokumentasi dan implementasi

---

*Dokumen ini dibuat pada 2026-01-18 dan akan terus diperbarui seiring perkembangan proyek.*
