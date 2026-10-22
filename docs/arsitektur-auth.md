# Arsitektur Auth

> Terakhir di-sync: 2026-07-02

---

## Overview

Sistem auth berbasis **JWT stateless**. Token disimpan di `localStorage` — tidak menggunakan cookie/session server-side.

Detail otorisasi role, permission table, route guard, dan gap RBAC dicatat terpisah di `arsitektur-permission-rbac.md`.
Threat model auth, token storage, secret, logging sensitif, dan prioritas hardening dicatat di `arsitektur-security.md`.

- Access token: berlaku `15m` (default, bisa diubah via `JWT_EXPIRES_IN`), membawa claim `typ: "access"`.
- Refresh token: berlaku `7d`, juga stateless JWT, membawa `typ: "refresh"`. Tidak ada tabel/session refresh token di DB. Access token **ditolak** di `/auth/refresh`, dan refresh token ditolak sebagai Bearer (ADR-0009).
- Token unsubscribe WA (`purpose: "wa-unsubscribe"`) ditolak oleh `verifyToken` dan `verifyRefreshToken`.
- Login password dan penukaran kode Google memakai penerbit sesi yang sama: `services/session.ts` (`buildSession`).
- Algoritma: `HS256` via library `jose`
- Secret: `JWT_SECRET` dari env API

---

## Struktur JWT Payload

```ts
interface JWTPayload {
  sub: string;          // user.id
  email: string;
  name: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  roles: string[];      // ["super_admin", "admin_finance", ...]
  isDeveloper?: boolean;
}
```

Roles di-embed langsung ke dalam token — tidak di-fetch dari DB per request.

---

## Auth Endpoints (`/v1/auth`)

| Method | Path | Fungsi |
|--------|------|--------|
| `POST` | `/auth/register` | Daftar akun baru (donatur). Email disimpan huruf kecil; lookup case-insensitive. Tidak mengembalikan token dan **tidak mengambil alih** record donatur lama; mengirim link verifikasi. Email yang sudah **terverifikasi** → 400. Email yang ada tapi **belum terverifikasi** → **daftar ulang** (password/nama/telepon/WA ditimpa, sesi dicabut, link baru). Respons: `emailVerificationRequired`, `verificationEmail` (`sent`/`cooldown`/`failed`). WA selamat datang tidak lagi dikirim di sini |
| `POST` | `/auth/email/verify` | Body `{token, password}`. **Dua bukti** (ADR-0011): token dari mailbox + password akun; token dicek (`peek`), password diperiksa, baru token dihanguskan (salah password tidak membakar link; kode `INVALID_PASSWORD` vs `INVALID_TOKEN`). Sukses → `email_verified_at`, tautkan donatur + transaksi guest, WA selamat datang (background), dan **sesi langsung** (`accessToken`, `refreshToken`, `user`) |
| `POST` | `/auth/email/resend` | Kirim ulang link verifikasi; respons generik (tidak membocorkan apakah email terdaftar), cooldown 60 dtk |
| `POST` | `/auth/login` | Login, return `accessToken` + `refreshToken` |
| `POST` | `/auth/refresh` | Perbarui access token dengan refresh token |
| `GET` | `/auth/me` | Profil user saat ini (butuh token) |
| `PATCH` | `/auth/me` | Update profil donatur/user legacy |
| `GET` | `/auth/me/profile-data` | Profil unified untuk employee/mitra/donatur |
| `PATCH` | `/auth/me/profile` | Update profil unified |
| `PATCH` | `/auth/me/password` | Ganti password (butuh token) |
| `GET` | `/auth/check-registration` | Cek email/phone sudah terdaftar. Hanya `{exists, registered}` (tanpa data pribadi), kena `authRateLimit`. Auto-isi data di halaman register dihapus |
| `POST` | `/auth/forgot-password/email/request` | Minta link reset via email (1 jam, sekali pakai). Respons generik identik untuk email terdaftar/tidak; pengiriman di background (tidak ada beda waktu respons) |
| `POST` | `/auth/forgot-password/email/reset` | Reset password dengan token + password baru (8–128). Memakai link otomatis menandai email terverifikasi dan menautkan data guest |
| `POST` | `/auth/forgot-password/request-otp` | Kirim OTP via WhatsApp |
| `POST` | `/auth/forgot-password/reset` | Reset password dengan OTP |

### Pencabutan sesi (ADR-0011, migrasi 122)
`users.sessions_valid_after` diisi saat reset password (email dan OTP WA), ganti password (`PATCH /auth/me/password`), daftar ulang akun belum terverifikasi, dan klaim Google. `POST /auth/refresh` menolak refresh token yang `iat`-nya (detik) lebih lama dari nilai itu (jadi token yang terbit di detik yang sama dengan reset masih sah), dan menolak akun yang belum terverifikasi. Access token (15 menit) tidak dicek ke DB sehingga berlaku sampai kedaluwarsa. Web saat ini hanya menyimpan access token.

### Login: gate verifikasi email
`POST /auth/login` menolak akun dengan `email_verified_at IS NULL` dengan `403 {code: "EMAIL_NOT_VERIFIED"}` setelah password terbukti benar, dan mengirim ulang link verifikasi. Akun yang dibuat admin (users, employees, donatur, mitra ×2) dan akun seed diberi `email_verified_at` saat dibuat; migrasi 121 mem-backfill semua user ber-peran selain `user`.

### Login/daftar Google (Fase 3)
Aktif hanya bila `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` terisi (`GET /auth/methods` → `{google: boolean}`; tombol web tersembunyi bila `false`). Redirect URI yang didaftarkan di Google Cloud Console: `{API_URL}/v1/auth/google/callback` (override `GOOGLE_REDIRECT_URI`).

| Langkah | Endpoint | Keterangan |
|---------|----------|------------|
| 1 | `GET /auth/google/start?returnTo=/path` | Buat `state`, `nonce`, PKCE `verifier`; simpan di cookie `g_oauth` (JWT HS256 10 menit, httpOnly, SameSite=Lax, Secure di production); redirect 302 ke Google (`openid email profile`, `code_challenge` S256). `returnTo` hanya path relatif (`//host`, `\`, URL absolut dinetralkan ke `/account`) |
| 2 | `GET /auth/google/callback` | Cek `state` (timing-safe) terhadap cookie lalu hapus cookie; tukar `code` + `code_verifier`; verifikasi ID token (JWKS Google, RS256 saja, `iss`, `aud`, `exp`, `nonce`, `email_verified === true`); tentukan akun; redirect ke `{FRONTEND_URL}/auth/google?code=<kode 60 dtk>&next=<path>`. Gagal → `/login?error=google_*` |
| 3 | `POST /auth/google/exchange` | Tukar kode sekali pakai (`auth_email_tokens.purpose='google_exchange'`, 60 detik) dengan sesi (`buildSession`, sama seperti login). Token sesi tidak pernah ada di URL |

Aturan akun (`services/google-account.ts`, diperketat ADR-0011): cocokkan lewat `sub` Google, lalu lewat email. Akun lokal yang sudah terverifikasi **ditautkan**. Akun lokal yang **belum terverifikasi di-KLAIM** oleh pemilik email (Google membuktikan kepemilikan): `password_hash` dihapus (mungkin ditanam penyerang yang mendaftar dengan email korban), email ditandai terverifikasi, token tertunda dihanguskan, `sessions_valid_after` diisi, lalu ditautkan. Akun ber-peran selain `user` ditolak (`google_staff`), akun nonaktif ditolak (`google_inactive`). Email tak dikenal → akun baru: terverifikasi, tanpa password, peran `user`, record donatur dibuat/ditautkan, `whatsappNumber` kosong (web mengarahkan ke `/account/profile`; tidak ada flag `needsProfileCompletion`). Foto profil Google tidak disimpan.

Env uji: `GOOGLE_OAUTH_AUTH_URL`, `GOOGLE_OAUTH_TOKEN_URL`, `GOOGLE_OAUTH_JWKS_URL` meng-override endpoint Google **hanya** untuk uji dengan server tiruan; jangan diset di produksi.

### Reset password via email
Token `reset_password` (1 jam) tidak bisa dipakai untuk verifikasi, dan sebaliknya (kolom `purpose` ikut dicek saat konsumsi). Permintaan baru menghanguskan token lama. Reset mengganti `users.password_hash` dan `donatur.password_hash` (donatur dengan `user_id` akun itu). **Gap yang diketahui:** refresh token yang sudah terbit tetap berlaku sampai kedaluwarsa (7 hari) karena tidak ada revocation (lihat `arsitektur-security.md`); reset password tidak mencabut sesi yang ada.

### Kepemilikan transaksi di akun
`GET /account/donations` dan `/account/donations/:id` mengenali transaksi lewat `transactions.user_id` atau `donor_email` yang cocok dengan email akun **yang sudah terverifikasi**. Nomor telepon/WA tidak lagi dipakai (klaim tak terverifikasi).

### Register schema
```ts
{ email, password (min 8), name (min 2), phone?, whatsappNumber (required) }
```

Register tidak langsung mengembalikan token. Frontend web melakukan auto-login setelah register berhasil.

### Login response
```json
{
  "data": {
    "user": { "id", "email", "name", "roles" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Forgot Password flow (OTP via WhatsApp)
1. `POST /auth/forgot-password/request-otp` — input: `phone`
   - Normalise phone (handle +62/62/0 prefix)
   - Cari user dengan variasi format phone
   - Generate 6-digit OTP, simpan hash di `auth_otp_codes.code_hash` dengan TTL 5 menit
   - Kirim OTP via WhatsApp
2. `POST /auth/forgot-password/reset` — input: `phone`, `otp`, `newPassword`
   - Verifikasi OTP (max 5 attempts)
   - Update `password_hash`
   - Invalidasi OTP

Tidak ada endpoint `/auth/logout` di API saat ini. Logout frontend hanya menghapus `localStorage["token"]`, `localStorage["user"]`, dan state auth.

---

## Middleware (`apps/api/src/middleware/auth.ts`)

### `authMiddleware`
Wajib login. Jika tidak ada / token invalid → 401.

```ts
// Inject ke context:
c.set("user", { id, email, name, phone, whatsappNumber, roles, isDeveloper })
```

### `optionalAuthMiddleware`
Tidak wajib login. Jika ada token yang valid → inject user ke context. Jika tidak ada / invalid → lanjut tanpa user.

Dipakai untuk endpoint publik yang butuh context user opsional (contoh: `POST /zakat/calculate/maal` untuk log userId).

### `requireRole(...roles: string[])`
Guard berbasis role. Harus dipakai setelah `authMiddleware`.

```ts
// Contoh: hanya super_admin dan admin_finance
app.use("/admin/finance/*", requireRole("super_admin", "admin_finance"));
```

Cek dengan `user.roles.some(role => roles.includes(role))` — user hanya perlu punya **satu** dari role yang listed.

### `requireDeveloper`
Cek `user.isDeveloper === true`. Untuk fitur internal developer saja.

### Alias
```ts
export const requireAuth = authMiddleware;
export const requireRoles = requireRole;
```

---

## Roles Sistem

| Role | Slug | Deskripsi |
|------|------|-----------|
| Super Admin | `super_admin` | Akses penuh semua fitur |
| Admin Keuangan | `admin_finance` | Kelola transaksi, ledger, disbursement |
| Admin Kampanye | `admin_campaign` | Kelola campaign, program, pages |
| Koordinator Program | `program_coordinator` | Kelola activity reports, program |
| Karyawan | `employee` | Akses terbatas, lihat data sendiri |
| Mitra | `mitra` | Lembaga partner, kelola campaign & qurban miliknya |
| User/Donatur | `user` | Role default untuk registrasi donatur |

Roles disimpan di tabel `roles` + junction `user_roles`. Saat login, semua role user di-embed ke JWT.

---

## Guard Admin Panel (`/v1/admin/*`)

Semua route admin melewati dua lapis guard di `apps/api/src/routes/admin/index.ts`:

**Lapis 1 — Auth global:**
```ts
admin.use("*", authMiddleware);
admin.use("*", requireRole("super_admin", "admin_finance", "admin_campaign",
                           "program_coordinator", "employee", "mitra"));
```
Semua role (termasuk mitra) boleh masuk admin panel.

**Lapis 2 — staffOnly (blokir mitra):**
```ts
const staffOnly = requireRole("super_admin", "admin_finance", "admin_campaign",
                              "program_coordinator", "employee");
admin.use("/dashboard/*", staffOnly);
admin.use("/donatur/*", staffOnly);
// ... dan banyak route lain
```

**Route yang tidak diblokir `staffOnly` dan berpotensi diakses mitra:**
- `/campaigns` — lihat & kelola campaign miliknya, dengan guard tambahan di handler.
- `/categories`, `/pillars` — lookup master data; mutasi tetap dibatasi role tertentu.
- `/mitra` — sebagian route list/detail/status tetap dibatasi handler, mayoritas mutasi hanya `super_admin`.
- `/media` — upload gambar.
- `/address` — lookup alamat.
- `/zakat/types` — kelola zakat type miliknya, dengan guard tambahan di handler.
- `/zakat/periods` — kelola periode zakat miliknya, dengan guard tambahan di handler.
- `/qurban` — kelola qurban miliknya, dengan guard tambahan di handler.
- `/disbursements` — ajukan pencairan, dengan guard dan workflow status di handler.

Catatan: `/activity-reports` tidak dipasang `staffOnly`, tetapi handler API saat ini tidak mengizinkan `mitra`. Detail mismatch UI/API dicatat di `arsitektur-permission-rbac.md` dan `arsitektur-activity-reports.md`.

---

## State Management Auth (Frontend)

### Admin (`apps/admin/src/lib/auth.ts`)
```ts
const useAuth = create<AuthState>()(persist(...))
// Simpan: user, token
// localStorage key: "token" dan "user"
// Logout: hapus localStorage, redirect ke /login
```

### Web (`apps/web/src/lib/auth.ts`)
```ts
const useAuth = create<AuthState>()(persist(...))
// Simpan: user, token, isHydrated
// Tambahan: register(), isHydrated flag untuk SSR safety
```

Token selalu disimpan di `localStorage["token"]` dan di-attach ke setiap request via axios interceptor di `src/lib/api.ts`.

---

## Rate Limiting

Route auth mendapat rate limit lebih ketat via `authRateLimit` middleware (terpisah dari `apiRateLimit` global).

---

## OTP Table (`auth_otp_codes`)

```
id              text PK
userId          text FK users.id
phone           text
codeHash        text              -- SHA-256 hash OTP + JWT_SECRET
purpose         text        — "forgot_password"
expiresAt       timestamptz
attemptCount    integer     — max 5
consumedAt      timestamptz       -- null = belum dipakai
createdAt / updatedAt timestamptz
```

TTL: 5 menit. Max attempts: 5 (setelah itu OTP hangus).

---

## Rencana: Verifikasi Email, Reset Email, dan Login Google (ADR-0010)

> Status: **diimplementasikan** (2026-10-22) dan diperketat oleh ADR-0011 setelah audit `security-auditor`. Belum deployed.

| Fase | Isi | Status |
|------|-----|--------|
| 1 | Verifikasi email (tabel token, kirim/verifikasi/kirim-ulang, gate login, perketat register, tutup `check-registration`, kepemilikan transaksi via email terverifikasi) | ✅ API + web (halaman `/verifikasi-email`, panel cek email di register/login) — diuji 28 kasus API + alur browser |
| 2 | Lupa password via email (link 1 jam) | ✅ API + web (`/forgot-password` tab Via Email default, `/reset-password`) — 20 kasus API + alur browser |
| 3 | Login/daftar Google (`/auth/methods`, `/auth/google/start|callback|exchange`, `user_oauth_accounts`) | ✅ API + web — E2E terhadap Google tiruan 47 kasus (`apps/api/scripts/e2e-google-oauth.ts`) + alur browser |
| 4 | Frontend web: `/verifikasi-email`, panel cek email, `/forgot-password` (tab email), `/reset-password`, tombol Google di login/register, halaman `/auth/google`, pesan error Google, nomor WA masuk daftar "Lengkapi Data Wajib" di profil. Halaman aksi auth sengaja tidak masuk `url-registry` (bukan tujuan tautan) | ✅ |

### Skema baru (migrasi 121)
```
auth_email_tokens
  id text PK, user_id FK users ON DELETE CASCADE, email text,
  purpose text   -- 'verify_email' | 'reset_password' | 'google_exchange'
  token_hash text UNIQUE   -- SHA-256 dari token acak; token mentah hanya ada di email/URL
  expires_at timestamptz, consumed_at timestamptz NULL, created_at timestamptz

user_oauth_accounts
  id text PK, user_id FK users ON DELETE CASCADE,
  provider text, provider_account_id text, email text, created_at,
  UNIQUE (provider, provider_account_id)
```
Backfill: `users.email_verified_at = NOW()` untuk semua user yang punya peran selain `user`.

### Aturan gate login
`POST /auth/login`: (1) password salah → `401` generik; (2) akun nonaktif → `403`; (3) `email_verified_at IS NULL` → `403 {code: "EMAIL_NOT_VERIFIED"}` + kirim ulang link (cooldown 60 dtk). Semua jalur pembuatan akun oleh admin wajib mengisi `email_verified_at` (`admin/users.ts`, `admin/employees.ts`, `admin/donatur.ts`, `admin/mitra.ts` ×2).

