# Arsitektur Auth

> Terakhir di-sync: 2026-07-02

---

## Overview

Sistem auth berbasis **JWT stateless**. Token disimpan di `localStorage` — tidak menggunakan cookie/session server-side.

Detail otorisasi role, permission table, route guard, dan gap RBAC dicatat terpisah di `arsitektur-permission-rbac.md`.
Threat model auth, token storage, secret, logging sensitif, dan prioritas hardening dicatat di `arsitektur-security.md`.

- Access token: berlaku `15m` (default, bisa diubah via `JWT_EXPIRES_IN`)
- Refresh token: berlaku `7d`, juga stateless JWT. Tidak ada tabel/session refresh token di DB.
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
| `POST` | `/auth/register` | Daftar akun baru (donatur) |
| `POST` | `/auth/login` | Login, return `accessToken` + `refreshToken` |
| `POST` | `/auth/refresh` | Perbarui access token dengan refresh token |
| `GET` | `/auth/me` | Profil user saat ini (butuh token) |
| `PATCH` | `/auth/me` | Update profil donatur/user legacy |
| `GET` | `/auth/me/profile-data` | Profil unified untuk employee/mitra/donatur |
| `PATCH` | `/auth/me/profile` | Update profil unified |
| `PATCH` | `/auth/me/password` | Ganti password (butuh token) |
| `GET` | `/auth/check-registration` | Cek email/phone sudah terdaftar |
| `POST` | `/auth/forgot-password/request-otp` | Kirim OTP via WhatsApp |
| `POST` | `/auth/forgot-password/reset` | Reset password dengan OTP |

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
