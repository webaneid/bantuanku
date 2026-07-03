# Arsitektur Platform

> Terakhir di-sync: 2026-07-02

---

## Struktur Monorepo

```
bantuanku/
├── apps/
│   ├── api/          Hono (Node.js via tsx)
│   ├── admin/        Next.js 15 (admin panel)
│   └── web/          Next.js 14 (website publik)
├── packages/
│   ├── db/           Drizzle ORM + PostgreSQL
│   └── shared/       Types & utils bersama
├── docs/             Dokumentasi teknis
└── package.json      npm workspaces root
```

npm workspaces: semua `apps/*` dan `packages/*` terdaftar.

---

## Port Aplikasi

| App | Dev (`npm run dev`) | Start (`npm run start`) |
|-----|---------------------|-------------------------|
| `apps/api` | 50245 | 50245 |
| `apps/admin` | 3001 | 3002 |
| `apps/web` | 3002 | 3003 |

Port API dibaca dari env `API_PORT`, default `50245`. Host default `127.0.0.1`.

---

## Stack per Layer

### API (`apps/api`)
| Library | Versi | Fungsi |
|---------|-------|--------|
| Hono | ^4.6.16 | HTTP framework |
| tsx | ^4.21.0 | TypeScript runtime (dev & prod) |
| jose | ^5.9.6 | JWT sign/verify |
| drizzle-orm | — | Database ORM via `@bantuanku/db` |
| zod + @hono/zod-validator | — | Request validation |
| @hono/node-server | — | Node.js adapter untuk Hono |

Entry point: `server-node.ts` → `src/index.ts`

Detail routing, mount `/v1/*`, webhook, dan gap middleware API dicatat di `arsitektur-api-routing.md`.
Script build, lint, type-check, test gap, dan SOP QA dicatat di `arsitektur-testing-qa.md`.
Pipeline CI/CD dan gap deploy automation dicatat di `arsitektur-ci-cd.md`.

### Admin (`apps/admin`)
| Library | Versi | Fungsi |
|---------|-------|--------|
| Next.js | ^15.1.6 | Framework |
| React | ^19.0.0 | UI |
| Zustand + persist | — | Auth state |
| axios | — | API client |

### Web (`apps/web`)
| Library | Versi | Fungsi |
|---------|-------|--------|
| Next.js | ^14.2.0 | Framework |
| React | ^18.3.0 | UI |
| @tanstack/react-query | ^5.28.0 | Server state |
| Zustand + persist | — | Auth state |
| axios | — | API client |
| react-hook-form | ^7.51.0 | Form handling |

### Database (`packages/db`)
| Library | Fungsi |
|---------|--------|
| drizzle-orm | ORM |
| drizzle-kit | CLI migrations |
| pg + drizzle-orm/node-postgres | PostgreSQL connection runtime |
| postgres | Dipakai script production manifest |

---

## Scripts Root

```bash
npm run dev              # dev semua app serentak
npm run dev:api          # dev API saja
npm run dev:admin        # dev admin saja
npm run dev:web          # dev web saja

npm run build            # build semua app

npm run db:generate      # drizzle-kit generate (buat migration dari schema)
npm run db:migrate       # drizzle-kit migrate (jalankan migration Drizzle)
npm run db:push          # drizzle-kit push (skip migration, langsung push schema)
npm run db:studio        # buka Drizzle Studio UI
npm run db:manifest:run  # jalankan custom production manifest
npm run db:manifest:run:dry   # dry-run manifest (preview saja)
npm run db:manifest:run:fresh # jalankan manifest dari awal (fresh install)
```

---

## Environment Variables API

| Variabel | Wajib | Default | Keterangan |
|----------|-------|---------|------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret untuk sign/verify JWT |
| `JWT_EXPIRES_IN` | — | `15m` | Masa berlaku access token |
| `ENVIRONMENT` | — | — | `development` / `production` |
| `API_PORT` | — | `50245` | Port server |
| `API_HOST` | — | `127.0.0.1` | Host server |
| `FRONTEND_URL` | — | — | URL web publik |
| `ADMIN_URL` | — | — | URL admin panel |
| `RESEND_API_KEY` | — | — | Email transaksional |
| `FROM_EMAIL` | — | — | Pengirim email |

---

## Global Middleware API (urutan)

Semua request melewati middleware berikut sebelum sampai ke route handler:

```
logger → cors → securityHeaders → compressionMiddleware
→ prettyJSON → apiRateLimit → validateContentType → dbMiddleware
```

- **cors**: whitelist `localhost:*`, `bantuanku.org`, `admin.bantuanku.org`
- **dbMiddleware**: inject `c.get("db")` dari `DATABASE_URL`
- **apiRateLimit**: rate limiting global
- **validateContentType**: tolak body non-JSON kecuali multipart

Catatan: implementasi CORS aktual masih memantulkan origin lain di luar whitelist. Detail dan rekomendasi ada di `arsitektur-api-routing.md`.

---

## API Client (frontend)

Kedua app (admin & web) pakai `axios` instance di `src/lib/api.ts` dengan:
- `baseURL` mengarah ke API
- Interceptor: auto-attach `Authorization: Bearer <token>` dari `localStorage["token"]`

---

## Konvensi Umum

- **TypeScript strict**: semua app wajib 0 error `tsc --noEmit`
- **Response format** (API): target konvensi adalah helper `success()`, `error()`, `paginated()` dari `apps/api/src/lib/response.ts`, tetapi beberapa route legacy masih memakai `c.json()` langsung.
- **Error handling**: detail envelope, status code, validasi, dan gap legacy dicatat di `arsitektur-error-handling.md`.
- **Timestamps**: semua tabel pakai `timestamptz` (precision 3, withTimezone: true)
- **i18n (web)**: nested object di `apps/web/src/lib/i18n/locales/{id,en}.ts`
- **Upload files**: folder lokal `uploads/` dibuat dari `process.cwd()` saat server Node start. Endpoint media dan qurban bisa fallback lokal; upload bukti transaksi universal saat ini GCS-only.

---

## Background Scheduler API

`apps/api/server-node.ts` juga menyalakan scheduler jika `DATABASE_URL` tersedia:
- `startSavingsReminderScheduler()` — reminder tabungan qurban harian.
- `startDeveloperAutoDisbursementScheduler()` — auto-disbursement developer revenue share.
