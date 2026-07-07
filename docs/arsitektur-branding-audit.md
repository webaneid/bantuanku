# Branding Audit — Bantuanku → Jaladana SaaS

Dokumen ini adalah **checklist verifiable** untuk memastikan tidak ada string brand tenant (`Bantuanku`) yang bocor ke kode runtime.

Jalankan perintah di kolom **Cara Verifikasi** untuk mengecek status aktual. Output kosong = bersih.

---

## Status Fix

### Web — User-Facing

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 1 | `apps/web/src/lib/seo.tsx` | `twitter_handle \|\| '@bantuanku'` | ✅ Fixed | `grep "@bantuanku" apps/web/src/lib/seo.tsx` |
| 2 | `apps/web/src/lib/seo.tsx` | JSON-LD org name `\|\| 'Bantuanku'` | ✅ Fixed | `grep "'Bantuanku'" apps/web/src/lib/seo.tsx` |
| 3 | `apps/web/src/lib/seo.tsx` | Error fallback `site_name: 'Bantuanku'` | ✅ Fixed | `grep "site_name.*Bantuanku" apps/web/src/lib/seo.tsx` |
| 4 | `apps/web/src/services/settings.ts` | `DEFAULT_SETTINGS.site_name: 'Bantuanku'` | ✅ Fixed | `grep "Bantuanku" apps/web/src/services/settings.ts` |
| 5 | `apps/web/src/hooks/useSettings.ts` | `useState site_name: 'Bantuanku'` | ✅ Fixed | `grep "Bantuanku" apps/web/src/hooks/useSettings.ts` |
| 6 | `apps/web/src/components/organisms/Header/Header.tsx` | `site_name \|\| 'Bantuanku'` | ✅ Fixed | `grep "Bantuanku" apps/web/src/components/organisms/Header/Header.tsx` |
| 7 | `apps/web/src/components/organisms/Footer/Footer.tsx` | `organization_name \|\| 'Bantuanku'` | ✅ Fixed | `grep "Bantuanku" apps/web/src/components/organisms/Footer/Footer.tsx` |
| 8 | `apps/web/src/components/UniversalInvoice.tsx` | `alt \|\| 'Bantuanku'` pada logo | ✅ Fixed | `grep "Bantuanku" apps/web/src/components/UniversalInvoice.tsx` |
| 9 | `apps/web/src/app/mitra/[slug]/page.tsx` | `organization_name: 'Bantuanku'` default | ✅ Fixed | `grep "Bantuanku" "apps/web/src/app/mitra/[slug]/page.tsx"` |
| 10 | `apps/web/src/app/og/route.tsx` | `title \|\| 'Bantuanku'`, domain `bantuanku.org` | ✅ Fixed | `grep "Bantuanku\|bantuanku.org" apps/web/src/app/og/route.tsx` |
| 11 | `apps/web/src/app/page.tsx` | Beberapa `\|\| 'Bantuanku'` dan `'https://bantuanku.org'` | ✅ Fixed | `grep "Bantuanku\|bantuanku.org" apps/web/src/app/page.tsx` |
| 12 | `apps/web/src/app/zakat/page.tsx` | `\|\| 'Bantuanku'`, `'https://bantuanku.org'` | ✅ Fixed | `grep "Bantuanku\|bantuanku.org" apps/web/src/app/zakat/page.tsx` |
| 13 | `apps/web/src/app/documentation/DocumentationView.tsx` | "Dokumentasi Bantuanku" | ✅ Fixed → "Dokumentasi Jaladana" | `grep "Bantuanku" apps/web/src/app/documentation/DocumentationView.tsx` |
| 14 | `apps/web/src/app/documentation/layout.tsx` | "aplikasi Bantuanku" | ✅ Fixed → "aplikasi Jaladana" | `grep "Bantuanku" apps/web/src/app/documentation/layout.tsx` |
| 15 | `apps/web/public/logo.svg` | Teks "Bantuanku" di SVG placeholder | ✅ Fixed → "Logo" | `grep "Bantuanku" apps/web/public/logo.svg` |
| 16 | `apps/web/src/lib/i18n/locales/id.ts` | `whyChoose.title`, `organizationName`, dll | ✅ Fixed | `grep "Bantuanku" apps/web/src/lib/i18n/locales/id.ts` |
| 17 | `apps/web/src/lib/i18n/locales/en.ts` | Sama dengan id.ts | ✅ Fixed | `grep "Bantuanku" apps/web/src/lib/i18n/locales/en.ts` |

### Admin — User-Facing

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 18 | `apps/admin/src/app/layout.tsx` | `title: "Bantuanku Admin Dashboard"` | ✅ Fixed | `grep "Bantuanku" apps/admin/src/app/layout.tsx` |
| 19 | `apps/admin/src/app/(auth)/login/page.tsx` | Hardcode "Bantuanku" di h1 | ✅ Fixed | `grep "Bantuanku" apps/admin/src/app/\(auth\)/login/page.tsx` |
| 20 | `apps/admin/src/components/Sidebar.tsx` | `\|\| "Bantuanku"` fallback org name | ✅ Fixed | `grep "Bantuanku" apps/admin/src/components/Sidebar.tsx` |
| 21 | `apps/admin/src/app/dashboard/layout.tsx` | `organization_name \|\| "Bantuanku"` | ✅ Fixed | `grep "Bantuanku" apps/admin/src/app/dashboard/layout.tsx` |
| 22 | `apps/admin/src/components/SEOPanel.tsx` | URL fallback `"https://bantuanku.org"` | ✅ Fixed | `grep "bantuanku" apps/admin/src/components/SEOPanel.tsx` |
| 23 | `apps/admin/src/app/dashboard/settings/frontend/page.tsx` | Default invoice footer + `info@bantuanku.id` | ✅ Fixed | `grep -i "bantuanku" "apps/admin/src/app/dashboard/settings/frontend/page.tsx"` |
| 24 | `apps/admin/src/app/dashboard/settings/whatsapp/page.tsx` | SAMPLE_DATA `store_name: "Bantuanku"` | ✅ Fixed | `grep "Bantuanku" apps/admin/src/app/dashboard/settings/whatsapp/page.tsx` |
| 25 | `apps/admin/src/app/dashboard/reports/cash-flow/page.tsx` | "Bantuanku" di teks deskripsi | ✅ Fixed | `grep "Bantuanku" apps/admin/src/app/dashboard/reports/cash-flow/page.tsx` |
| 26 | `apps/admin/src/components/(public)/invoice/*.tsx` (3 file) | "hubungi admin Bantuanku", `<p>Bantuanku</p>` | ✅ Fixed | `grep -r "Bantuanku" apps/admin/src/components/\(public\)/invoice/` |

### Web — Ditemukan di Audit Lanjutan

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 35 | `apps/web/src/app/page/[slug]/page.tsx` | `twitter_handle \|\| "@bantuanku"` | ✅ Fixed | `grep "bantuanku" "apps/web/src/app/page/[slug]/page.tsx"` |
| 36 | `apps/web/src/app/qurban/[id]/page.tsx` | `twitter_handle \|\| '@bantuanku'` | ✅ Fixed | `grep "bantuanku" "apps/web/src/app/qurban/[id]/page.tsx"` |
| 37 | `apps/web/src/app/zakat/[slug]/page.tsx` | `twitter_handle \|\| '@bantuanku'` | ✅ Fixed | `grep "bantuanku" "apps/web/src/app/zakat/[slug]/page.tsx"` |
| 38 | `apps/web/next.config.js` | `hostname: 'api.bantuanku.org'`, `hostname: 'cdn.bantuanku.org'` | ✅ Fixed → env-based via `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_CDN_URL` | `grep "bantuanku" apps/web/next.config.js` |
| 39 | `apps/web/src/content/documentation/**` (14 file) | "Bantuanku" di konten dokumentasi platform | ✅ Fixed → "Jaladana" (platform name boleh di `/documentation`) | `grep -r "Bantuanku" apps/web/src/content/documentation/` |

### Admin — Ditemukan di Audit Lanjutan

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 40 | `apps/admin/src/app/dashboard/whatsapp/broadcasts/page.tsx` | `\|\| "https://bantuanku.org"` | ✅ Fixed | `grep "bantuanku" apps/admin/src/app/dashboard/whatsapp/broadcasts/page.tsx` |

### Packages — Ditemukan di Audit Lanjutan

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 41 | `packages/db/src/seed.ts` | `organization_website` fallback `"https://bantuanku.org"` | ✅ Fixed | `grep "bantuanku\.org" packages/db/src/seed.ts` |

### Web/Admin/API — Ditemukan di Audit Lanjutan (Batch 2)

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 42 | `apps/web/src/app/documentation/[slug]/page.tsx` | Fallback description `"...Bantuanku."` | ✅ Fixed → "Jaladana" | `grep "Bantuanku" apps/web/src/app/documentation/\[slug\]/page.tsx` |
| 43 | `apps/web/src/content/documentation/pages/login-dan-akses.ts` | URL contoh `https://admin.bantuanku.org` | ✅ Fixed → `admin.namadomain.com` | `grep "bantuanku" apps/web/src/content/documentation/pages/login-dan-akses.ts` |
| 44 | `apps/web/src/content/documentation/pages/seo.ts` | Domain contoh `bantuanku.org` di tabel URL | ✅ Fixed → `namadomain.com` | `grep "bantuanku" apps/web/src/content/documentation/pages/seo.ts` |
| 45 | `apps/web/src/app/test-molecules/page.tsx` | Dummy data URL & title "Bantuanku" | ✅ Fixed → `contoh.org` / "Jaladana" | `grep -i "bantuanku" apps/web/src/app/test-molecules/page.tsx` |
| 46 | `apps/admin/src/app/dashboard/settings/whatsapp/page.tsx` | SAMPLE_DATA `invoice_url`, `report_url` pakai `bantuanku.org` | ✅ Fixed → `contoh.org` | `grep "bantuanku" apps/admin/src/app/dashboard/settings/whatsapp/page.tsx` |
| 47 | `apps/api/src/routes/admin/settings.ts` | `User-Agent: Bantuanku/1.0` saat fetch harga emas/perak | ✅ Fixed → `Jaladana/1.0` | `grep "Bantuanku\|bantuanku" apps/api/src/routes/admin/settings.ts` |
| 48 | `apps/api/src/services/whatsapp-ai.ts` | `User-Agent: Bantuanku-ZakatBot/1.0` | ✅ Fixed → `Jaladana-ZakatBot/1.0` | `grep "Bantuanku\|bantuanku" apps/api/src/services/whatsapp-ai.ts` |

### API — Integrasi & Runtime

| # | File | Masalah Asal | Status | Cara Verifikasi |
|---|------|--------------|--------|-----------------|
| 27 | `apps/api/src/index.ts` | CORS hardcode `bantuanku.org` | ✅ Fixed → baca `FRONTEND_URL`/`ADMIN_URL` env | `grep "bantuanku.org" apps/api/src/index.ts` (hanya komentar tersisa) |
| 28 | `apps/api/src/index.ts` | API name `"Bantuanku API"` | ✅ Fixed → `"Jaladana API"` | `grep '"Bantuanku API"' apps/api/src/index.ts` |
| 29 | `apps/api/src/services/payment/ipaymu.ts` | Fallback email `donor@bantuanku.org` | ✅ Fixed → `donor@example.com` | `grep "bantuanku" apps/api/src/services/payment/ipaymu.ts` |
| 30 | `apps/api/src/services/payment/flip.ts` | Fallback email `donor@bantuanku.org` | ✅ Fixed → `donor@example.com` | `grep "bantuanku" apps/api/src/services/payment/flip.ts` |
| 31 | `apps/api/src/services/payment/xendit.ts` | Redirect URL `https://bantuanku.org/donation/...` | ✅ Fixed → `process.env.FRONTEND_URL` | `grep "bantuanku" apps/api/src/services/payment/xendit.ts` |
| 32 | `apps/api/src/routes/public-stats.ts` | `coalesce(mitra.name, 'Bantuanku')` + `programMap.set("organization", "Bantuanku")` | ✅ Fixed → query `site_name` dari DB | `grep "Bantuanku" apps/api/src/routes/public-stats.ts` |
| 33 | `apps/api/src/services/email.ts` | Hardcode brand di subject/body/copyright email | ✅ Fixed → `this.fromName`, `this.frontendUrl` | `grep -i "bantuanku" apps/api/src/services/email.ts` |
| 34 | `packages/db/src/seed.ts` | Hardcode `admin@bantuanku.org`, `site_name: "Bantuanku"` | ✅ Fixed → env vars `SEED_*` | `grep "bantuanku.org\|\"Bantuanku\"" packages/db/src/seed.ts` |

---

## Scan Sekaligus (One-liner)

Jalankan dari root project untuk sweep semua runtime code. One-liner ini **sudah exclude false positives**:

```bash
grep -rn "Bantuanku\|bantuanku\.org\|bantuanku\.id\|@bantuanku" \
  apps/web/src apps/admin/src apps/api/src packages/db/src \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  | grep -v "node_modules" \
  | grep -v "@bantuanku/db\|@bantuanku/shared\|@bantuanku/api" \
  | grep -v "bantuanku_cart\|bantuanku_ref\|bantuanku_auth" \
  | grep -v ":[[:space:]]*//"
```

Output kosong = tidak ada kebocoran brand di runtime code.

> **Catatan**: `next.config.js` tidak ter-cover karena ada di root `apps/web/`. Jalankan terpisah:
> ```bash
> grep "bantuanku" apps/web/next.config.js apps/admin/next.config.js 2>/dev/null
> ```

---

## Yang Boleh Tetap Ada (Bukan Bug)

| Pattern | Alasan |
|---------|--------|
| `@bantuanku/db` di import | Package name internal, tidak tampil ke user |
| `bantuanku_cart`, `bantuanku_ref` di localStorage key | Storage key internal |
| `// Usage: ... api.bantuanku.org ...` di komentar `apps/api/src/index.ts` | Dokumentasi crontab VPS, bukan runtime — one-liner sudah exclude ini |
| `@bantuanku/api` di error message `image-processor.ts` | Nama package internal (workspace), tidak tampil ke user |
| Folder/path repo mengandung `bantuanku` | Tidak tampil ke user |
| `apps/web/public/logo.svg` sebagai placeholder | SVG fallback, tidak ada teks "Bantuanku" lagi |

---

## Aturan Fallback

Per [CLAUDE.md](/Users/webane/sites/bantuanku/CLAUDE.md) section "Identitas Platform vs Tenant":

- Fallback untuk semua teks client-facing: `|| ''` (string kosong) — **BUKAN** `|| 'Bantuanku'`
- Satu-satunya tempat boleh sebut "Jaladana": `/dashboard/settings/developer` dan `/documentation`
- Nama tenant selalu dari `settings.site_name` atau `settings.organization_name` dari DB

**Mengapa `''` dan bukan `'Jaladana'`?** Karena ini SaaS multi-tenant. Jika settings belum dikonfigurasi, menampilkan string kosong jauh lebih baik daripada menampilkan nama platform yang tidak relevan bagi tenant.
