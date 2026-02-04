# Quick Start Guide - Bantuanku API

## Prerequisites

- Node.js 18+ installed
- npm or pnpm installed

## Setup Steps

### 1. Get Neon Database (Free)

1. Go to https://neon.tech
2. Sign up for free account
3. Create new project: `bantuanku`
4. Copy the connection string from dashboard (looks like):
   ```
   postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/bantuanku
   ```

### 2. Configure Database Connection

Create `packages/db/.env`:

```bash
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/bantuanku
```

Replace with your actual Neon connection string.

### 3. Run Setup Script

```bash
./setup-db.sh
```

This will:
- Install dependencies
- Push database schema to Neon
- Seed initial data (admin user, categories, sample campaigns)

### 4. Start Development Server

```bash
cd apps/api
npm run dev
```

Server will start at http://localhost:8787

### 5. Test API

Health check:
```bash
curl http://localhost:8787/health
```

Get campaigns:
```bash
curl http://localhost:8787/v1/campaigns
```

Login as admin:
```bash
curl -X POST http://localhost:8787/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bantuanku.org","password":"admin123"}'
```

## Default Credentials

After seeding, you can login with:

- **Super Admin**
  - Email: `admin@bantuanku.org`
  - Password: `admin123`

- **Campaign Admin**
  - Email: `campaign@bantuanku.org`
  - Password: `admin123`

- **Finance Admin**
  - Email: `finance@bantuanku.org`
  - Password: `admin123`

**⚠️ IMPORTANT**: Change these passwords in production!

## Next Steps

1. Read [API.md](./API.md) for complete API documentation
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
3. Configure payment gateways (optional):
   - Add `MIDTRANS_SERVER_KEY` to `apps/api/.dev.vars`
   - Add `XENDIT_SECRET_KEY` to `apps/api/.dev.vars`
4. Configure email service (optional):
   - Add `RESEND_API_KEY` to `apps/api/.dev.vars`

## Troubleshooting

### Database connection fails

Check:
- Is DATABASE_URL correct in `packages/db/.env`?
- Can you connect to Neon from your network?
- Is the database name correct?

### Server won't start

Check:
- Are you in the correct directory (`apps/api`)?
- Did you run `npm install` in the root directory?
- Check `apps/api/.dev.vars` for correct format

### Seed fails

Check:
- Did schema push succeed?
- Is the database empty? (Seed expects empty database)
- Check connection string has write permissions

## Project Structure

```
bantuanku/
├── apps/
│   └── api/          # Hono API (Cloudflare Workers)
├── packages/
│   └── db/           # Drizzle ORM + Schema
├── API.md            # API Documentation
├── DEPLOYMENT.md     # Deployment Guide
├── SETUP.md          # Detailed Setup Guide
└── QUICKSTART.md     # This file
```

## Support

For detailed documentation, see [SETUP.md](./SETUP.md)
