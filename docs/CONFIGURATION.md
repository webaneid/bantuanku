# Configuration Management

Dokumentasi lengkap tentang configuration management untuk memastikan aplikasi stable, mudah upgrade, dan modular.

---

## Philosophy

1. **Never hardcode** - Semua URL, credentials, dan configuration menggunakan environment variables
2. **Environment-specific** - Development dan production punya configuration terpisah
3. **Security first** - Secrets tidak pernah di-commit ke git
4. **Easy to upgrade** - Deployment tidak memerlukan code changes untuk configuration

---

## Environment Files Structure

```
apps/
├── api/
│   ├── .dev.vars              # Local secrets (gitignored)
│   ├── .dev.vars.example      # Template (committed)
│   └── wrangler.toml          # Cloudflare config (committed)
│       └── [dev] port         # ONLY for local dev, ignored in production
│
└── admin/
    ├── .env.local             # Local config (gitignored)
    ├── .env.example           # Template (committed)
    └── .env.production        # Production template (committed)
```

---

## How It Works

### Development (Local)

**API** (`apps/api`):
- Configuration: `.dev.vars` (copied from `.dev.vars.example`)
- Port: `50245` (defined in `wrangler.toml` `[dev]` section)
- Command: `npm run dev` → runs `wrangler dev`
- Result: API available at `http://localhost:50245`

**Admin** (`apps/admin`):
- Configuration: `.env.local` (copied from `.env.example`)
- Port: `3001` (passed via command line)
- Command: `npm run dev -- --port 3001`
- Result: Admin available at `http://localhost:3001`
- Connects to: `http://localhost:50245/v1` (from `NEXT_PUBLIC_API_URL`)

### Production

**API** (Cloudflare Workers):
- Configuration: Cloudflare Secrets (set via `wrangler secret put`)
- Port: **N/A** (runs on Cloudflare edge network, no port concept)
- Command: `npm run deploy` → runs `wrangler deploy`
- Result: API available at `https://bantuanku-api.workers.dev` or custom domain
- **IMPORTANT**: `[dev] port = 50245` in `wrangler.toml` is **IGNORED** during production deployment

**Admin** (Vercel/Netlify):
- Configuration: Platform environment variables (set in dashboard)
- Port: **N/A** (handled by platform)
- Command: `vercel --prod` or `netlify deploy --prod`
- Result: Admin available at `https://admin.bantuanku.com`
- Connects to: `https://api.bantuanku.com/v1` (from `NEXT_PUBLIC_API_URL` platform env)

---

## Why This is Production-Ready

### 1. No Port Hardcoding Issues

❌ **Common misconception**:
> "Port 50245 in wrangler.toml will affect production"

✅ **Reality**:
- `[dev]` section in `wrangler.toml` **ONLY affects local development**
- `wrangler deploy` (production) **completely ignores** `[dev]` section
- Production Cloudflare Workers run on their edge network without ports
- Custom domains (like `api.bantuanku.com`) are configured in Cloudflare dashboard

### 2. Environment Separation

```bash
# Development
.env.local           → NEXT_PUBLIC_API_URL=http://localhost:50245/v1
.dev.vars            → DATABASE_URL=postgresql://localhost:5432/bantuanku

# Production
Platform Env Vars    → NEXT_PUBLIC_API_URL=https://api.bantuanku.com/v1
Cloudflare Secrets   → DATABASE_URL=postgresql://prod-host:5432/bantuanku
```

No overlap, no conflict.

### 3. Atomic Deployments

Both Cloudflare Workers and modern hosting platforms (Vercel/Netlify) use **atomic deployments**:

- **Build** → Create new instance
- **Test** → Run health checks
- **Switch** → Atomic cutover to new version
- **Rollback** → Instant revert if needed

**Zero downtime** for upgrades.

### 4. Easy to Upgrade

```bash
# Update API code
cd apps/api
git pull
npm run deploy          # Deploys immediately, no config changes needed

# Update Admin code
cd apps/admin
git pull
vercel --prod          # Deploys immediately, no config changes needed

# Update database schema
cd packages/db
git pull
DATABASE_URL="..." npm run db:push    # Run migrations
```

No configuration changes required unless you're changing actual URLs/secrets.

---

## Configuration Variables

### API (apps/api)

#### Development (.dev.vars)
```env
DATABASE_URL=postgresql://user@localhost:5432/bantuanku
JWT_SECRET=local-dev-secret-min-32-chars
JWT_EXPIRES_IN=15m
API_URL=http://localhost:50245
```

#### Production (Cloudflare Secrets)
```bash
# Set once, persists across deployments
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put JWT_EXPIRES_IN
wrangler secret put API_URL
```

**To update a secret**:
```bash
wrangler secret put JWT_SECRET
# Enter new value
# Redeploy: npm run deploy
```

### Admin (apps/admin)

#### Development (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:50245/v1
```

#### Production (Platform Environment Variables)

**Vercel**:
1. Dashboard → Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL` = `https://api.bantuanku.com/v1`
3. Scope: Production
4. Redeploy

**Netlify**:
1. Dashboard → Site → Site Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL` = `https://api.bantuanku.com/v1`
3. Redeploy

---

## Modular Architecture

### Independent Deployments

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │────▶│     API     │────▶│  Database   │
│  (Next.js)  │     │  (Workers)  │     │ (Postgres)  │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     │                    │                    │
  Deploy              Deploy             Migrate
independently       independently      separately
```

### Benefits

1. **Deploy API without touching Admin** - Backend updates don't require frontend rebuild
2. **Deploy Admin without touching API** - Frontend updates don't affect backend
3. **Migrate database independently** - Schema changes don't require app deployment
4. **Scale independently** - Can scale API and Admin separately based on load

### Shared Code (packages/db)

```typescript
// packages/db - Shared between API and Admin
export { schema, db, migrations }
```

- Used by API for database operations
- Used by Admin for type definitions
- Used by migration scripts
- Single source of truth for data models

---

## Stability Guarantees

### 1. Configuration Never Changes After Setup

Once you set:
- Cloudflare secrets for API
- Platform env vars for Admin

They **persist across all deployments**. You only change them when:
- Moving to new database
- Rotating security credentials
- Changing API domain

### 2. No Code Changes for Configuration

```typescript
// ✅ Good - Uses environment variable
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ Bad - Hardcoded
const apiUrl = "http://localhost:50245/v1";
```

All our code uses environment variables. No hardcoded URLs/secrets.

### 3. Type Safety

```typescript
// packages/db/src/schema/*
export const users = pgTable("users", { ... });

// API and Admin both use same types
import { users } from "@bantuanku/db";
```

TypeScript ensures schema consistency across the monorepo.

### 4. Git-based Workflow

```bash
# Developer workflow
git pull              # Get latest code
npm install           # Update dependencies
npm run dev           # Start development (uses .env.local)

# Production deployment
git push              # Push to main branch
# CI/CD auto-deploys using platform env vars
```

---

## Troubleshooting

### "API port keeps changing"

**Cause**: `[dev] port` not set in `wrangler.toml`
**Fix**: Already set to `50245` in `wrangler.toml` - no action needed
**Note**: This ONLY affects local dev, not production

### "Admin can't connect to API"

**Development**:
1. Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:50245/v1`
2. Verify API is running on 50245: `lsof -i :50245`
3. Restart admin server to pick up env changes

**Production**:
1. Check platform env var `NEXT_PUBLIC_API_URL` points to correct API URL
2. Verify API is deployed and accessible
3. Check CORS settings in API

### "Database connection fails"

**Development**:
1. Check `.dev.vars` has correct `DATABASE_URL`
2. Verify PostgreSQL is running: `pg_isready`
3. Test connection: `psql $DATABASE_URL`

**Production**:
1. Check Cloudflare secret: `wrangler secret list`
2. Verify database allows connections from Cloudflare IPs
3. Check database URL format includes `?sslmode=require` for production

---

## Best Practices

### ✅ DO

- Use environment variables for all configuration
- Keep `.dev.vars` and `.env.local` in `.gitignore`
- Commit `.example` files for documentation
- Set production secrets via CLI/Dashboard, not code
- Test locally before deploying to production
- Use atomic deployments (Cloudflare, Vercel, Netlify all support this)

### ❌ DON'T

- Hardcode URLs, ports, or credentials in code
- Commit `.env.local` or `.dev.vars` to git
- Mix development and production configuration
- Deploy without testing migrations locally first
- Change production secrets frequently (rotate only when needed)

---

## Migration Path (Future)

If you need to change infrastructure:

### Change Database
```bash
# Update Cloudflare secret
wrangler secret put DATABASE_URL
# Enter new database URL

# Deploy (will use new database)
npm run deploy
```

### Change API Domain
```bash
# Update Admin platform env var
# Vercel: Dashboard → Environment Variables → NEXT_PUBLIC_API_URL
# Set to new domain

# Redeploy admin
vercel --prod
```

### Change Hosting Platform

**API**: Cloudflare Workers → Other platform
- Update `apps/api/package.json` scripts
- Update deployment pipeline
- Admin only needs new API URL in env var

**Admin**: Vercel → Netlify (or vice versa)
- Deploy to new platform
- Set `NEXT_PUBLIC_API_URL` in new platform
- Update DNS

---

## Summary

**Your concern**: "Agar ketika production, aplikasi ini benar-benar langsung running, mudah di upgrade, dan modular, juga stabil"

**Our solution**:

✅ **Langsung running**: Environment variables set once, persist forever
✅ **Mudah upgrade**: `npm run deploy` - atomic deployments, zero downtime
✅ **Modular**: API, Admin, Database deploy independently
✅ **Stabil**: Type-safe, no hardcoded values, tested workflow

**Port 50245 is SAFE**: It's only for local development (`[dev]` section), production completely ignores it and runs on Cloudflare's edge network.
