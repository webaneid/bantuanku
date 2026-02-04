# Deployment Guide - Bantuanku

Panduan deployment aplikasi Bantuanku ke Cloudflare Workers.

## Prerequisites

- Akun Cloudflare dengan Workers enabled
- Akun Neon (PostgreSQL database)
- Akun Resend (email service)
- Akun Midtrans/Xendit (payment gateway)
- Wrangler CLI installed (`npm install -g wrangler`)

## Setup Database (Neon)

### 1. Create Database

1. Login ke [Neon Console](https://console.neon.tech)
2. Create new project
3. Copy connection string

### 2. Setup Schema

```bash
cd packages/db

# Update DATABASE_URL di .env
echo "DATABASE_URL=postgresql://user:pass@host/db" > .env

# Push schema ke database
npm run db:push

# Seed data awal
npm run db:seed
```

## Setup Cloudflare Workers

### 1. Login Wrangler

```bash
wrangler login
```

### 2. Create Workers Project

```bash
cd apps/api

# Initialize wrangler config jika belum ada
wrangler init
```

### 3. Configure `wrangler.toml`

```toml
name = "bantuanku-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

# Database binding (jika pakai Neon)
[[env.production.vars]]
DATABASE_URL = ""  # Set via secrets

# KV binding untuk cache (optional)
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"
```

### 4. Set Secrets

```bash
# Database
wrangler secret put DATABASE_URL
# Paste: postgresql://user:pass@host/db

# JWT
wrangler secret put JWT_SECRET
# Paste: your-random-secret-key

# Email
wrangler secret put RESEND_API_KEY
# Paste: re_xxxxx

wrangler secret put FROM_EMAIL
# Paste: noreply@bantuanku.org

# Midtrans
wrangler secret put MIDTRANS_SERVER_KEY
# Paste: SB-Mid-server-xxx

wrangler secret put MIDTRANS_CLIENT_KEY
# Paste: SB-Mid-client-xxx

# Xendit
wrangler secret put XENDIT_SECRET_KEY
# Paste: xnd_xxx
```

## Build & Deploy

### 1. Build Project

```bash
cd apps/api
npm run build
```

### 2. Deploy to Production

```bash
# Deploy ke Cloudflare Workers
wrangler deploy

# Output:
# Published bantuanku-api
# https://bantuanku-api.your-subdomain.workers.dev
```

### 3. Setup Custom Domain

1. Login ke Cloudflare Dashboard
2. Go to Workers & Pages
3. Select `bantuanku-api`
4. Go to Settings > Triggers
5. Add Custom Domain: `api.bantuanku.org`

## Environment Configuration

### Development

```env
DATABASE_URL=postgresql://localhost/bantuanku_dev
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
ENVIRONMENT=development
RESEND_API_KEY=re_dev_xxx
FROM_EMAIL=dev@bantuanku.org
```

### Production

Set via Wrangler Secrets (lihat step 4 di atas).

## Database Migrations

### Run Migration

```bash
cd packages/db

# Generate migration dari schema changes
npm run db:generate

# Apply migration
npm run db:migrate
```

### Rollback Migration

```bash
npm run db:rollback
```

## Monitoring & Logs

### View Logs

```bash
# Real-time logs
wrangler tail

# Logs dengan filter
wrangler tail --status error
```

### Cloudflare Dashboard

1. Go to Workers & Pages
2. Select `bantuanku-api`
3. Go to Logs tab untuk live logs
4. Go to Analytics untuk metrics

## Performance Optimization

### 1. Enable Caching

Cache sudah diimplementasi via middleware, pastikan KV namespace sudah di-bind.

### 2. Database Connection Pooling

Neon sudah include connection pooling, pastikan gunakan connection string dengan pooling enabled:

```
postgresql://user:pass@host/db?sslmode=require&pool_timeout=30
```

### 3. Rate Limiting

Rate limiting sudah aktif:
- Auth endpoints: 5 req/15min
- Payment endpoints: 10 req/min
- General API: 60 req/min

## Security Checklist

- ✅ JWT secret strong & random
- ✅ Database credentials secure
- ✅ API keys stored as secrets (not in code)
- ✅ CORS configured dengan domain yang benar
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ Input validation via Zod
- ✅ SQL injection protection via Drizzle ORM

## Backup & Recovery

### Database Backup

Neon automatically backs up database. To manual backup:

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

### Restore dari Backup

1. Login ke Neon Console
2. Select project
3. Go to Backups tab
4. Click Restore untuk timestamp tertentu

## Troubleshooting

### Database Connection Error

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Drizzle connection
cd packages/db
npm run db:studio
```

### Workers Deployment Error

```bash
# Check wrangler version
wrangler --version

# Update wrangler
npm update -g wrangler

# Clear cache & redeploy
rm -rf .wrangler
wrangler deploy
```

### Rate Limit Issues

Edit rate limit config di `apps/api/src/middleware/ratelimit.ts`:

```typescript
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100, // Increase limit
});
```

## Rollback Deployment

```bash
# List deployments
wrangler deployments list

# Rollback ke deployment sebelumnya
wrangler rollback
```

## Custom Domain Setup

### 1. Add Domain to Cloudflare

1. Login ke Cloudflare Dashboard
2. Add site: `bantuanku.org`
3. Update nameservers di domain registrar

### 2. Configure Workers Route

1. Go to Workers & Pages
2. Select `bantuanku-api`
3. Settings > Triggers
4. Add route: `api.bantuanku.org/*`

### 3. SSL/TLS Settings

1. Go to SSL/TLS
2. Set to "Full (strict)"
3. Enable "Always Use HTTPS"

## Health Checks

```bash
# Check API health
curl https://api.bantuanku.org/health

# Response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}

# Check database connection
curl https://api.bantuanku.org/v1/campaigns
```

## Scaling

Cloudflare Workers automatically scales. Monitor usage:

1. Cloudflare Dashboard > Analytics
2. Check requests/day
3. Monitor CPU time
4. Check database connection pool usage di Neon

## Support

Jika ada masalah deployment:
- Check Cloudflare Workers docs: https://developers.cloudflare.com/workers
- Check Neon docs: https://neon.tech/docs
- Contact: tech@bantuanku.org
