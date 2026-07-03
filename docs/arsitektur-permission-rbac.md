# Arsitektur Permission RBAC

> Terakhir di-sync: 2026-07-02

---

## Overview

Sistem otorisasi saat ini adalah **role-based access control berbasis JWT**.

Permission table sudah ada di database dan bisa dikelola lewat API role, tetapi **belum menjadi enforcement runtime**. Guard API yang menentukan akses saat ini adalah `requireRole(...)`, bukan `permission.key`.

Dokumen terkait:

- `arsitektur-auth.md` — login, token, refresh token, middleware auth.
- `arsitektur-security.md` — risk register security untuk stale role, privilege escalation, dan enforcement permission.
- `arsitektur-audit-log.md` — audit trail; saat ini belum mencatat perubahan role/permission.
- `arsitektur-disbursement.md`, `arsitektur-activity-reports.md`, `arsitektur-export-import.md`, `arsitektur-statistik.md` — contoh modul dengan role guard spesifik.
- `arsitektur-program-coordinator.md` — detail role `program_coordinator`, employee-user link, dan scoped data access.

---

## Source of Truth Implementasi

| Area | File Kode |
|------|-----------|
| Schema role dan permission | `packages/db/src/schema/role.ts` |
| Seed role dan permission awal | `packages/db/src/seed.ts` |
| Migrasi role tambahan | `packages/db/migrations/075_add_employee_role.sql`, `079_add_mitra_role.sql` |
| JWT payload | `apps/api/src/lib/jwt.ts` |
| Auth middleware dan role guard | `apps/api/src/middleware/auth.ts` |
| Admin route guard global | `apps/api/src/routes/admin/index.ts` |
| Role management API | `apps/api/src/routes/admin/roles.ts` |
| User role assignment API | `apps/api/src/routes/admin/users.ts`, `employees.ts`, `donatur.ts`, `mitra.ts` |
| Frontend auth store | `apps/admin/src/lib/auth.ts`, `apps/admin/src/lib/api.ts` |
| Sidebar role visibility | `apps/admin/src/components/Sidebar.tsx` |
| Coordinator scoped filtering | `apps/api/src/middleware/coordinator-filter.ts` |

---

## Data Model

### `roles`

```ts
id          text PK
slug        text unique not null
name        text not null
description text
isSystem    boolean default false
createdAt   timestamptz
updatedAt   timestamptz
```

`roles.slug` adalah nilai yang dipakai di JWT dan route guard, misalnya `super_admin`.

### `permissions`

```ts
id          text PK
key         text unique not null
name        text not null
module      text not null
description text
createdAt   timestamptz
```

Permission memakai format key seperti `campaign.view`, `finance.approve`, dan `audit.view`.

### `user_roles`

```ts
id        text PK
userId    text FK users.id on delete cascade
roleId    text FK roles.id on delete cascade
createdAt timestamptz
```

Relasi ini menentukan role yang akan dimasukkan ke JWT saat login atau refresh token.

### `role_permissions`

```ts
id           text PK
roleId       text FK roles.id on delete cascade
permissionId text FK permissions.id on delete cascade
createdAt    timestamptz
```

Relasi ini bisa disimpan lewat API role, tetapi belum dipakai oleh middleware authorization.

---

## Role Sistem

Role yang benar-benar dipakai implementasi:

| Slug | Sumber | Fungsi aktual |
|------|--------|---------------|
| `super_admin` | seed | Akses administratif paling luas; role dan user management hanya role ini. |
| `admin_finance` | seed | Modul keuangan, transaksi, laporan, settings tertentu. |
| `admin_campaign` | seed | Campaign, pages, beberapa laporan program, beberapa master data. |
| `program_coordinator` | migrasi `075` | Koordinator program; dipakai pada campaign, activity report, disbursement tertentu. |
| `employee` | migrasi `075` | Staff/karyawan dengan akses dashboard terbatas dan fitur influencer saya. |
| `mitra` | migrasi `079` | Partner/lembaga; akses admin terbatas untuk program miliknya. |
| `user` | seed/register | Donatur publik; bukan role admin panel. |

`isDeveloper` bukan role. Nilai ini ada di tabel user/JWT dan dicek oleh `requireDeveloper` atau beberapa query khusus untuk menyembunyikan user developer dari admin non-developer.

---

## Permission Catalog

Seed awal membuat permission berikut:

| Module | Permission |
|--------|------------|
| dashboard | `dashboard.view` |
| campaign | `campaign.view`, `campaign.create`, `campaign.update`, `campaign.delete` |
| donation | `donation.view`, `donation.create_manual`, `donation.export` |
| finance | `finance.ledger`, `finance.disbursement`, `finance.approve` |
| report | `report.view`, `report.generate` |
| user | `user.view`, `user.create`, `user.update`, `user.delete` |
| role | `role.manage` |
| page | `page.manage` |
| setting | `setting.view`, `setting.update` |
| audit | `audit.view` |

Status aktual: **metadata/inactive untuk enforcement**.

Tidak ada `requirePermission(...)` di middleware. Sidebar admin juga tidak membaca permission table; sidebar memakai array role hardcoded.

---

## Runtime Authorization Flow

1. Login membaca `user_roles` dan join ke `roles`.
2. API membuat JWT dengan payload:

```ts
{
  sub: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  whatsappNumber: user.whatsappNumber,
  roles: ["super_admin", "..."],
  isDeveloper: Boolean(user.isDeveloper)
}
```

3. `authMiddleware` memverifikasi Bearer token dan mengisi `c.set("user", ...)`.
4. `requireRole(...roles)` mengecek:

```ts
user.roles.some((role) => roles.includes(role))
```

User hanya perlu memiliki satu role yang cocok.

5. Route handler boleh menambah pembatasan data sendiri, misalnya mitra hanya boleh mengelola program miliknya.

Implikasi penting:

- Perubahan role di database **tidak langsung aktif** untuk access token yang sudah diterbitkan.
- Access token default berlaku `15m`, bisa dioverride via `JWT_EXPIRES_IN`.
- Refresh token berlaku `7d`; saat refresh, role dibaca ulang dari DB sehingga token baru mengikuti role terbaru.

---

## Admin Guard Global

Semua route `/v1/admin/*` melewati:

```ts
admin.use("*", authMiddleware);
admin.use("*", requireRole(
  "super_admin",
  "admin_finance",
  "admin_campaign",
  "program_coordinator",
  "employee",
  "mitra"
));
```

Artinya semua role admin dan mitra bisa masuk lapisan awal admin API.

Sebagian besar route kemudian ditutup dengan `staffOnly`:

```ts
const staffOnly = requireRole(
  "super_admin",
  "admin_finance",
  "admin_campaign",
  "program_coordinator",
  "employee"
);
```

`staffOnly` dipasang untuk dashboard, donatur, users, roles, finance, ledger, export, reports, analytics, settings, audit, vendors, employees, mustahiqs, donations, bank accounts, fundraisers, transactions, revenue shares, WhatsApp, income ranges, statistics, dan beberapa route zakat.

---

## Route Guard Penting

| Domain | Guard utama aktual |
|--------|--------------------|
| Role management | `super_admin` |
| User management | `super_admin` |
| Audit log | `super_admin` |
| Settings list | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator`, `employee` |
| Settings mutate | mayoritas `super_admin`, `admin_finance`; beberapa endpoint hanya `super_admin` |
| Export campaigns | `super_admin`, `admin_campaign` |
| Export donations/ledger | `super_admin`, `admin_finance` |
| Export users | `super_admin` |
| Statistics | `super_admin`, `admin_finance`, `admin_campaign` |
| Reports umum/finance | `super_admin`, `admin_finance` |
| Reports program summary/detail | `super_admin`, `admin_finance`, `admin_campaign` |
| Activity reports read | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator` |
| Activity reports create/update | `super_admin`, `admin_campaign`, `program_coordinator` |
| Activity reports delete | `super_admin`, `admin_campaign` |
| Disbursements read/create/status/delete | `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator`, `employee`, `mitra` dengan logic status lanjutan di handler |
| Disbursement mark paid | `super_admin`, `admin_finance` |
| Zakat types/periods mutate | `super_admin`, `admin_campaign`, `mitra` |
| Zakat distributions mutate | `super_admin`, `admin_campaign`; add report juga `program_coordinator` |
| Qurban periods | `super_admin`, `admin_campaign` |
| Qurban packages/package-periods | `super_admin`, `admin_campaign`, `mitra` |
| Qurban orders/payments/executions | mayoritas `super_admin`, `admin_campaign` |
| Campaign create | `super_admin`, `admin_campaign`, `program_coordinator`, `mitra` |
| Campaign update/publish/unpublish/read helper | `super_admin`, `admin_campaign`, `program_coordinator`, `employee`, `mitra` |
| Campaign delete/feature | `super_admin`, `admin_campaign` |
| Mitra CRUD/status/user activation | mayoritas hanya `super_admin`; list/detail juga `admin_campaign`, `admin_finance` |

Detail per modul tetap dirujuk ke dokumen arsitektur domain masing-masing.

---

## Role Management API

Semua endpoint `apps/api/src/routes/admin/roles.ts` dilindungi `requireRole("super_admin")`.

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/admin/roles` | List role |
| `POST` | `/admin/roles` | Buat role custom |
| `GET` | `/admin/roles/:id` | Detail role + `permissionIds` |
| `PATCH` | `/admin/roles/:id` | Update role non-system |
| `DELETE` | `/admin/roles/:id` | Hapus role non-system |
| `GET` | `/admin/roles/permissions/all` | List permission catalog |
| `PATCH` | `/admin/roles/:id/permissions` | Replace semua permission role |

Catatan implementasi:

- `roles.isSystem = true` mencegah update/delete role sistem.
- `PATCH /:id/permissions` menghapus semua row `role_permissions` role tersebut lalu insert ulang.
- Tidak ada validasi eksplisit bahwa setiap `permissionId` benar selain FK database.
- Perubahan permission role tidak memengaruhi akses route karena middleware belum membaca `role_permissions`.

---

## User Role Assignment

| Endpoint | Guard | Perilaku |
|----------|-------|----------|
| `PATCH /admin/users/:id/roles` | `super_admin` | Replace semua role user berdasarkan `roleIds`. |
| `POST /admin/employees/:id/activate-user` | `super_admin` | Buat/link user employee dan assign `roleSlug`. Untuk employee yang sudah punya user, role lama dihapus lalu diganti satu role baru. |
| `PUT /admin/employees/:id/change-role` | `super_admin`, `admin_campaign` | Replace role user employee dengan satu `roleSlug`. |
| `POST /admin/donatur/:id/activate-user` | `super_admin` | Buat akun user donatur dan assign role `user`. |
| `POST /admin/mitra/:id/activate-user` | `super_admin` | Buat akun user mitra dan assign role `mitra`. |

Tidak semua endpoint assignment membatasi `roleSlug` ke daftar role yang aman secara eksplisit. Selama role slug ada di tabel `roles`, endpoint employee bisa menggunakannya.

---

## Frontend Authorization

Admin frontend menyimpan `user` dan `token` di Zustand persisted store dan localStorage.

```ts
localStorage["token"] = accessToken
localStorage["user"] = JSON.stringify(user)
```

Axios interceptor menambahkan:

```http
Authorization: Bearer <token>
```

Sidebar admin memakai role list hardcoded di `apps/admin/src/components/Sidebar.tsx`. Ini hanya kontrol visibility UI, bukan security boundary.

Contoh mismatch UI/API yang tercatat:

- Sidebar menampilkan `Laporan Kegiatan` untuk `mitra`, tetapi API activity reports tidak mengizinkan `mitra` pada read/create/update/delete.
- Sidebar menyembunyikan menu `Reports` dari `admin_campaign`, tetapi API `reports/program-summary` dan `reports/program-detail` mengizinkan `admin_campaign`.
- Sidebar `Settings` hanya `super_admin` dan `admin_finance`, tetapi API `GET /admin/settings` juga mengizinkan `admin_campaign`, `program_coordinator`, dan `employee`.

---

## Gaps dan Risiko

1. **Permission table belum enforce akses.** Sistem punya `permissions` dan `role_permissions`, tetapi semua route masih memakai `requireRole`.
2. **Tidak ada `requirePermission`.** Jika ingin permission granular, perlu middleware baru dan strategi cache/query permission.
3. **`role_permissions` bisa dikelola tetapi efeknya tidak terlihat oleh user.** Ini bisa membingungkan admin karena perubahan permission tidak mengubah akses.
4. **Tidak ada unique composite constraint di `user_roles` dan `role_permissions`.** Schema tidak mendefinisikan unique `(userId, roleId)` atau `(roleId, permissionId)`, sehingga duplikasi row masih mungkin.
5. **Role stale sampai token refresh/expired.** Penghapusan role di DB tidak mencabut access token aktif.
6. **Role assignment employee terlalu fleksibel.** Endpoint menerima `roleSlug` apa pun yang ada di DB; belum ada allowlist per use case.
7. **Debug log auth terlalu verbose.** Middleware auth mencetak payload JWT, roles, required roles, dan pada upload media mencetak header request. Ini berisiko untuk produksi.
8. **UI visibility dan API guard belum satu sumber.** Sidebar hardcoded terpisah dari route guard backend.
9. **Audit log belum mencatat perubahan role/permission.** Perubahan akses adalah event high-risk, tetapi belum masuk audit trail.
10. **Permission relation belum lengkap di schema relation.** `rolePermissions` punya FK ke permission, tetapi relation helper untuk permission belum lengkap seperti relation role/user.
11. **System role tidak konsisten di migrasi mitra.** Role `mitra` dibuat tanpa `is_system = true`, sehingga secara API role management ia bisa dianggap role non-system.

---

## Rekomendasi Perbaikan Arsitektur

1. Tetapkan keputusan produk: tetap role-only atau naik ke permission-based RBAC. Jika permission table dipertahankan, implementasi harus punya `requirePermission`.
2. Tambahkan constraint unik:

```sql
UNIQUE (user_id, role_id)
UNIQUE (role_id, permission_id)
```

3. Jadikan role sistem konsisten: `super_admin`, `admin_finance`, `admin_campaign`, `program_coordinator`, `employee`, `mitra`, dan `user` harus `is_system = true` jika tidak boleh dimodifikasi/dihapus.
4. Tambahkan audit log untuk create/update/delete role, assignment role user, dan perubahan role permission.
5. Buat shared authorization matrix untuk frontend/backend, minimal sebagai constant/module yang bisa digunakan sidebar dan dokumentasi test.
6. Kurangi auth debug log di production; log payload JWT dan header request tidak boleh aktif default.
7. Jika butuh revoke cepat, tambahkan token version atau session table agar perubahan role bisa langsung membatalkan token lama.
8. Batasi endpoint employee role assignment dengan allowlist role operasional, misalnya tidak boleh assign `super_admin` dari flow employee biasa.
9. Sinkronkan UI/API mismatch yang sudah tercatat, terutama `activity-reports`, `reports`, dan `settings`.
10. Jika permission-based RBAC diterapkan, putuskan apakah permission masuk JWT atau di-query/cache per request. Untuk keamanan dan update cepat, prefer query/cache server-side dengan invalidation yang jelas.
