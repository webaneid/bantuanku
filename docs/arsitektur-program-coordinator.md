# Arsitektur Program Coordinator

Dokumen ini adalah source of truth untuk role `program_coordinator`: aktivasi karyawan menjadi user, pembatasan data coordinator, campaign yang ditugaskan, activity reports, zakat distributions, dan disbursements.

Dokumen ini menyerap dan mengoreksi root `05-program-coordinator.md`. File lama adalah implementation plan yang berisi status campur aduk antara "complete" dan "belum dilakukan"; sumber benar sekarang adalah kode yang berjalan.

## Ruang Lingkup

| Area | Source Code |
|------|-------------|
| Role seed/migration | `packages/db/migrations/075_add_employee_role.sql` |
| Employee-user link | `packages/db/src/schema/employee.ts`, `apps/api/src/routes/admin/employees.ts` |
| Campaign coordinator | `packages/db/src/schema/campaign.ts`, `apps/api/src/routes/admin/campaigns.ts` |
| Coordinator middleware | `apps/api/src/middleware/coordinator-filter.ts` |
| Activity reports | `apps/api/src/routes/admin/activity-reports.ts` |
| Zakat distributions | `apps/api/src/routes/admin/zakat-distributions.ts` |
| Disbursements | `apps/api/src/routes/admin/disbursements.ts` |
| Sidebar visibility | `apps/admin/src/components/Sidebar.tsx` |
| User activation UI | `apps/admin/src/app/dashboard/settings/users/page.tsx` |
| Campaign form/detail | `apps/admin/src/components/CampaignForm.tsx`, `apps/admin/src/app/dashboard/campaigns/**` |

## Role dan Data Model

Role sistem:

| Slug | Nama | Migration |
|------|------|-----------|
| `program_coordinator` | Program Coordinator | `075_add_employee_role.sql` |
| `employee` | Employee | `075_add_employee_role.sql` |

Role memakai `roles.slug` dan dimasukkan ke JWT. Permission table tidak menjadi enforcement runtime; detail RBAC umum ada di `arsitektur-permission-rbac.md`.

Relasi utama:

| Table | Field | Fungsi |
|-------|-------|--------|
| `employees` | `user_id` | Link karyawan ke akun login `users` |
| `campaigns` | `coordinator_id` | Employee yang menjadi penanggung jawab campaign |
| `zakat_distributions` | `coordinator_id` | Employee coordinator untuk distribusi zakat legacy |
| `disbursements` | `recipient_id`, `created_by` | Pembatasan pencairan coordinator/employee |
| `activity_reports` | `created_by` | Pembatasan laporan kegiatan coordinator saat ini |

## Aktivasi Employee Menjadi User

Endpoint utama:

| Endpoint | Guard | Fungsi |
|----------|-------|--------|
| `POST /v1/admin/employees/:id/activate-user` | `super_admin` | Buat/link user employee dan assign satu `roleSlug` |
| `GET /v1/admin/employees/unactivated/list` | `super_admin` | List employee aktif yang belum punya `userId` |
| `PUT /v1/admin/employees/:id/change-role` | `super_admin`, `admin_campaign` | Ganti role user employee |

Perilaku `activate-user` aktual:

1. Jika employee sudah punya `userId`, endpoint mengganti semua role user tersebut dengan satu role baru berdasarkan `roleSlug`.
2. Jika employee belum punya `userId` tetapi email sudah ada di `users`, endpoint link employee ke existing user dan assign role.
3. Jika email belum ada, endpoint membuat `users`, hash password, assign role, update `employees.userId`, lalu memastikan record `donatur` terkait ada/terhubung.

Catatan kritis: endpoint menerima `roleSlug` apa pun yang ada di tabel `roles`. Belum ada allowlist khusus untuk flow employee.

## `coordinatorFilter`

Middleware `apps/api/src/middleware/coordinator-filter.ts`:

```text
if user.roles includes program_coordinator
  -> lookup employees.userId = user.id
  -> c.set("coordinatorEmployeeId", employee.id)

if user.roles includes employee and no admin roles
  -> same lookup

admin roles super_admin/admin_campaign/admin_finance
  -> c.set("coordinatorEmployeeId", null)
```

Jika akun tidak punya employee record, context diisi `"no-employee-record"` agar query mengembalikan data kosong.

Middleware ini dipakai di:

| Route | Efek |
|-------|------|
| `GET /admin/campaigns` | Filter `campaigns.coordinatorId = coordinatorEmployeeId` |
| `GET /admin/zakat/distributions` | Filter `zakatDistributions.coordinatorId = coordinatorEmployeeId` |

## Campaign

Campaign menyimpan `coordinatorId` ke `employees.id`.

| Endpoint | Perilaku Coordinator |
|----------|----------------------|
| `GET /admin/campaigns` | List difilter ke campaign yang `coordinatorId` sama dengan employee user |
| `POST /admin/campaigns` | `program_coordinator` boleh create; campaign otomatis `draft` dan coordinator dipaksa ke employee miliknya |
| `PATCH/PUT /admin/campaigns/:id` | `program_coordinator`/employee hanya bisa edit jika campaign `coordinatorId` miliknya atau `createdBy` user tersebut |
| `DELETE /admin/campaigns/:id` | Hanya `super_admin`, `admin_campaign` |

Gap penting: `GET /admin/campaigns/:id` saat ini membatasi `employee-only` dan `mitra`, tetapi belum membatasi `program_coordinator` murni. Coordinator yang mengetahui ID bisa membaca detail campaign lain. Ini harus diselaraskan dengan list/update guard.

## Activity Reports

Activity reports memakai `createdBy`, bukan `campaign.coordinatorId`, sebagai pembatas coordinator.

| Endpoint | Perilaku Coordinator |
|----------|----------------------|
| `GET /admin/activity-reports` | Hanya laporan dengan `createdBy = user.id` |
| `GET /admin/activity-reports/:id` | Hanya bisa baca laporan yang dibuat sendiri |
| `POST /admin/activity-reports` | Boleh create |
| `PUT /admin/activity-reports/:id` | Saat ini role allowed, tetapi belum cek ownership |
| `DELETE /admin/activity-reports/:id` | Tidak diizinkan untuk coordinator |

Gap ini juga dicatat di `arsitektur-activity-reports.md`: `PUT /:id` perlu ownership guard seperti `GET /:id`.

## Zakat Distributions

Route legacy `/admin/zakat/distributions` masih memakai tabel `zakat_distributions`.

| Endpoint | Perilaku Coordinator |
|----------|----------------------|
| `GET /admin/zakat/distributions` | List difilter via `coordinatorFilter` |
| `POST /admin/zakat/distributions/:id/add-report` | `program_coordinator` boleh menambah report |
| `POST /approve`, `POST /disburse`, create/update/delete distribusi | Tidak diizinkan untuk coordinator |

Catatan: dashboard statistik zakat modern banyak membaca universal `disbursements`, sedangkan route distribusi legacy membaca `zakat_distributions`. Dualisme ini dicatat di `arsitektur-zakat.md`.

## Disbursements

Disbursement modern punya guard khusus di handler:

| Area | Perilaku Coordinator |
|------|----------------------|
| List | Hanya disbursement dengan `recipientId = employee.id` |
| Detail | Hanya disbursement dengan `recipientId = employee.id` |
| Create | Hanya bisa membuat disbursement untuk dirinya sendiri; untuk `campaign`, reference campaign harus campaign yang ia koordinasikan |
| Status | Hanya boleh submit disbursement miliknya |
| Delete | Hanya boleh delete disbursement miliknya |

Detail workflow status ada di `arsitektur-disbursement.md`.

## Sidebar Admin

Sidebar hanya kontrol visibility UI, bukan boundary keamanan.

Menu yang terlihat untuk `program_coordinator` saat audit:

| Menu | Catatan |
|------|---------|
| Campaigns | All Campaigns |
| Zakat | Penyaluran |
| Laporan Kegiatan | Top-level menu |
| Disbursements | Semua Pencairan |
| Influencer Saya | Self-service fundraiser |

Root plan lama menyebut coordinator hanya melihat Campaign Reports dan Zakat Penyaluran. Implementasi aktual lebih luas karena juga menampilkan Laporan Kegiatan, Disbursements, dan Influencer Saya.

## Hubungan Dengan Dokumen Lain

| Dokumen | Hubungan |
|---------|----------|
| `arsitektur-auth.md` | Role, JWT, guard admin global |
| `arsitektur-permission-rbac.md` | Permission table belum enforce runtime |
| `arsitektur-karyawan.md` | Employee master data, user activation, bank account |
| `arsitektur-donasi.md` | Campaign coordinator assignment |
| `arsitektur-activity-reports.md` | Laporan kegiatan dan gap ownership PUT |
| `arsitektur-zakat.md` | Distribusi zakat legacy vs disbursement modern |
| `arsitektur-disbursement.md` | Pengajuan dan status pencairan coordinator |

## Gap dan Rekomendasi

1. **Tambahkan guard `program_coordinator` pada `GET /admin/campaigns/:id`.** Harus konsisten dengan list/update.
2. **Tambahkan ownership guard pada `PUT /admin/activity-reports/:id`.** Saat ini coordinator bisa update jika tahu ID.
3. **Batasi `roleSlug` activation employee.** Flow employee tidak seharusnya bisa assign role apa pun yang ada di DB tanpa allowlist.
4. **Selaraskan konsep coordinator.** Campaign memakai `campaigns.coordinatorId`, activity report memakai `createdBy`, zakat distribution memakai `zakat_distributions.coordinatorId`, dan disbursement memakai `recipientId/createdBy`. Ini perlu matrix akses eksplisit jika ingin konsisten.
5. **Sidebar dan API guard belum satu sumber.** UI menampilkan menu berdasarkan hardcoded role array, API punya logic berbeda per route.
6. **Permission table belum enforce.** Jangan mendokumentasikan role ini seolah dikendalikan `role_permissions`.
7. **Audit role changes.** Aktivasi employee dan change-role belum punya audit trail domain khusus.

## Keputusan Arsitektur Saat Ini

- `program_coordinator` adalah role sistem berbasis `roles.slug`.
- Akun coordinator harus terhubung ke `employees.userId` agar filter data bekerja.
- Permission table ada, tetapi akses coordinator saat ini dikendalikan oleh role guard dan handler logic.
- Source data assignment campaign adalah `campaigns.coordinatorId`.
- Root implementation plan `05-program-coordinator.md` tidak lagi menjadi referensi aktif.

## Mapping Dokumen Lama

| File Lama | Keputusan |
|-----------|-----------|
| `05-program-coordinator.md` | Diserap, dikoreksi terhadap implementasi, dan dihapus |
