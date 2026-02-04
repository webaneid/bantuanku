# Setup Guide - Bantuanku Development

## Prerequisites

- Node.js 18+ installed
- npm installed
- Akun Neon (PostgreSQL) - https://neon.tech (gratis)

## Step-by-Step Setup

### 1. Clone & Install Dependencies

```bash
cd /Users/webane/sites/bantuanku
npm install
```

### 2. Setup Database (Neon PostgreSQL)

#### A. Create Neon Database

1. Buka https://console.neon.tech
2. Sign up / Login
3. Click "Create Project"
4. Nama project: `bantuanku`
5. Region: Singapore (atau terdekat)
6. Copy connection string yang diberikan

Connection string format:
```
postgresql://username:password@ep-xxx.region.aws.neon.tech/bantuanku?sslmode=require
```

#### B. Configure Database Connection

Buat file `.env` di `packages/db`:

```bash
cd packages/db
cat > .env << 'EOF'
DATABASE_URL=postgresql://your-username:your-password@ep-xxx.region.aws.neon.tech/bantuanku?sslmode=require
EOF
```

Replace dengan connection string dari Neon.

#### C. Push Schema & Seed Data

```bash
# Push database schema
npm run db:push

# Seed initial data (roles, permissions, admin user, etc)
node -e "
import('./src/seed.ts').then(m => m.seed()).catch(console.error)
"
```

Atau buat script seed di package.json:

```bash
# Add to packages/db/package.json scripts:
"db:seed": "node --loader ts-node/esm src/seed.ts"

# Then run:
npm run db:seed
```

### 3. Configure API Environment

Update file `apps/api/.dev.vars` dengan Neon DATABASE_URL yang sama:

```bash
cd apps/api
cat > .dev.vars << 'EOF'
DATABASE_URL=postgresql://your-username:your-password@ep-xxx.region.aws.neon.tech/bantuanku?sslmode=require
JWT_SECRET=dev-secret-key-min-32-characters-long-change-in-production
JWT_EXPIRES_IN=7d
ENVIRONMENT=development
RESEND_API_KEY=re_xxx_optional
FROM_EMAIL=dev@localhost
EOF
```

### 4. Start Development Server

```bash
cd apps/api
npm run dev
```

Server akan running di: `http://localhost:8787`

### 5. Test API

```bash
# Health check
curl http://localhost:8787/health

# Get API info
curl http://localhost:8787/

# List campaigns (after database setup)
curl http://localhost:8787/v1/campaigns

# Register user
curl -X POST http://localhost:8787/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bantuanku.org",
    "password": "Admin123!",
    "name": "Admin User"
  }'

# Login
curl -X POST http://localhost:8787/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bantuanku.org",
    "password": "Admin123!"
  }'
```

## Default Seed Data

Setelah seed, akan tersedia:

### Roles & Permissions
- `super_admin` - Full access
- `admin_finance` - Finance management
- `admin_campaign` - Campaign management
- `donor` - Regular donor

### Admin User
- Email: `admin@bantuanku.org`
- Password: `Admin123!`
- Role: `super_admin`

### Categories
- Pendidikan
- Kesehatan
- Kemanusiaan
- Ekonomi
- Lingkungan

### Sample Campaigns
- 2-3 sample campaigns untuk testing

### Zakat Configs
- Nisab configurations
- Zakat rates

### Payment Gateways
- Midtrans (sandbox)
- Xendit (sandbox)
- Manual Transfer

### Ledger Accounts
- Chart of accounts untuk double-entry accounting

## Troubleshooting

### Database Connection Error

```bash
# Test connection
cd packages/db
node -e "
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
console.log('Connected!');
"
```

### Wrangler Version Warning

```bash
# Update wrangler
npm install -D wrangler@latest
```

### Port Already in Use

```bash
# Kill process on port 8787
lsof -ti:8787 | xargs kill -9

# Or use different port
wrangler dev --port 8788
```

### TypeScript Errors

```bash
# Check types
npx tsc --noEmit --project apps/api/tsconfig.json

# Regenerate types
cd apps/api
npm run cf-typegen
```

## Database Management

### View Database (Drizzle Studio)

```bash
cd packages/db
npm run db:studio
```

Buka: `https://local.drizzle.studio`

### Generate Migration

```bash
cd packages/db

# After changing schema
npm run db:generate

# Apply migration
npm run db:migrate
```

### Reset Database

```bash
# Drop all tables (hati-hati!)
# Login ke Neon Console > SQL Editor
# Run: DROP SCHEMA public CASCADE; CREATE SCHEMA public;

# Then push schema again
npm run db:push
npm run db:seed
```

## Production Deployment

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan deploy ke Cloudflare Workers.

## Development Tips

1. **Hot Reload**: Wrangler auto-reload saat file berubah
2. **Logs**: Check terminal untuk request logs
3. **Database**: Gunakan Drizzle Studio untuk view data
4. **API Testing**: Gunakan Postman atau Thunder Client VSCode extension
5. **Environment**: Jangan commit `.dev.vars` atau `.env` files

## Next Steps

1. ✅ Setup database
2. ✅ Start API server
3. 🔄 Test all endpoints
4. 🔄 Integrate payment gateways
5. 🔄 Setup email service (Resend)
6. 🔄 Build frontend
7. 🔄 Deploy to production

## Support

Jika ada masalah:
1. Check logs di terminal
2. Check Neon dashboard untuk database issues
3. Lihat dokumentasi di README.md dan API.md
