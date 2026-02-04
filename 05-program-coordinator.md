# Program Coordinator Role - Implementation Plan

## 🎯 Tujuan
Membuat role baru **Program Coordinator** yang memungkinkan employee untuk:
1. Login sebagai user (setelah diaktivasi oleh super admin)
2. Hanya bisa akses: Campaign → Laporan dan Zakat → Penyaluran
3. Hanya bisa lihat data campaign/penyaluran yang ditugaskan ke mereka

---

## 📊 Analisa Sistem yang Ada

### Roles yang Sudah Ada
```
| ID                    | Name           | Description                            |
|-----------------------|----------------|----------------------------------------|
| 889dne8p8max9s33ahhpa | Super Admin    | Full access to all features            |
| oz4rtinpvq83z6npum0gd | Admin Campaign | Manage campaigns and content           |
| 7y6acis7l4q3y5oxq6kcr | Admin Finance  | Manage finance, reports, disbursements |
| 8oohoqtgajopt7iu7qizz | User           | Regular donor user                     |
```

### Table yang Relevan
1. ✅ **employees** - Master data karyawan (sudah ada)
2. ✅ **users** - User accounts untuk login (sudah ada)
3. ✅ **roles** - Role definitions (sudah ada)
4. ✅ **user_roles** - Many-to-many relationship (sudah ada)
5. ✅ **permissions** - Permission definitions (ada, belum dicek detail)
6. ✅ **role_permissions** - Many-to-many relationship (ada)
7. ✅ **campaigns** - Campaign data (sudah ada)
8. ✅ **zakat_distributions** - Penyaluran data (sudah ada, sudah punya `coordinator_id`)

---

## ✅ Yang Sudah Dilakukan

### Phase 1: Database ✅ (COMPLETE)
1. ✅ Query roles table untuk cek role yang ada
2. ✅ Konfirmasi sistem pakai role-based access dengan many-to-many relationship
3. ✅ Konfirmasi `zakat_distributions` sudah punya `coordinator_id` (employee_id)
4. ✅ Update schema TypeScript: `employees.userId` → [employee.ts:43](packages/db/src/schema/employee.ts#L43)
5. ✅ Update schema TypeScript: `campaigns.coordinatorId` → [campaign.ts:29](packages/db/src/schema/campaign.ts#L29)
6. ✅ ALTER TABLE employees ADD user_id (migration success)
7. ✅ ALTER TABLE campaigns ADD coordinator_id (migration success)
8. ✅ INSERT role "Program Coordinator" (ID: program_coordinator_7296a581dcb3)
9. ✅ Query permissions (sistem tidak pakai permission table, langsung role slugs)

### Phase 2: Backend API ✅ (COMPLETE)
1. ✅ Endpoint: `POST /admin/employees/:id/activate-user` → [employees.ts:206](apps/api/src/routes/admin/employees.ts#L206)
   - Validasi employee exists & belum punya user_id
   - Validasi email belum dipakai
   - Hash password dengan bcrypt
   - Create user account
   - Assign role ke user
   - Update employee.user_id
2. ✅ Endpoint: `GET /admin/employees/unactivated/list` → [employees.ts:311](apps/api/src/routes/admin/employees.ts#L311)
   - List employees yang isActive=true dan userId=null
   - Only super_admin can access
3. ✅ Middleware: `coordinatorFilter` → [coordinator-filter.ts](apps/api/src/middleware/coordinator-filter.ts)
   - Detect program_coordinator role
   - Get employee.id dari user.id
   - Set coordinatorEmployeeId di context
4. ✅ Update: `GET /admin/campaigns` → [campaigns.ts:35](apps/api/src/routes/admin/campaigns.ts#L35)
   - Apply coordinatorFilter middleware
   - Filter WHERE coordinator_id = employee.id untuk program_coordinator
5. ✅ Update: `POST /admin/campaigns` → [campaigns.ts:109](apps/api/src/routes/admin/campaigns.ts#L109)
   - Tambah field coordinatorId di schema
   - Insert coordinatorId saat create campaign
6. ✅ Update: `PUT/PATCH /admin/campaigns/:id` → [campaigns.ts:194](apps/api/src/routes/admin/campaigns.ts#L194)
   - Update coordinatorId field
7. ✅ Update: `GET /admin/zakat-distributions` → [zakat-distributions.ts:18](apps/api/src/routes/admin/zakat-distributions.ts#L18)
   - Apply coordinatorFilter middleware
   - Filter WHERE coordinator_id = employee.id untuk program_coordinator
8. ✅ Update types: Add `coordinatorEmployeeId` to Variables → [types.ts:24](apps/api/src/types.ts#L24)

### Phase 3: Frontend ✅ (COMPLETE)
1. ✅ Settings → Users: Employee Activation Integration → [/settings/users/page.tsx](apps/admin/src/app/dashboard/settings/users/page.tsx)
   - Added employee dropdown in "Tambah User" modal
   - Query unactivated employees: `GET /admin/employees/unactivated/list`
   - Employee selection auto-populates name and email
   - If employee selected: calls `POST /admin/employees/:id/activate-user` with roleSlug
   - If no employee: creates normal user with `POST /admin/users`
   - Role filter: Only show admin roles (exclude "user" role)
   - Validation: Password min 8 characters, email required
   - Success: Invalidates both users and unactivated-employees queries
2. ✅ Sidebar: Conditional Rendering → [Sidebar.tsx](apps/admin/src/components/Sidebar.tsx)
   - Define allMenuItems dengan role-based access control
   - Filter menu berdasarkan user.roles
   - Program Coordinator hanya lihat: Campaigns (All Campaigns, Laporan Kegiatan) + Zakat (Penyaluran)
   - Super Admin lihat semua menu
   - Admin Campaign/Finance lihat menu sesuai role mereka
3. ✅ Campaign Form: Coordinator Dropdown → [CampaignForm.tsx](apps/admin/src/components/CampaignForm.tsx)
   - Tambah field `coordinatorId` di CampaignFormData interface
   - Query active employees dari `GET /admin/employees?status=active`
   - Dropdown "Penanggung Jawab Program" dengan list karyawan
   - Field opsional (nullable)

---

## 📋 Yang Belum Dilakukan

### 1. Database Migration

#### 1.1 Tambah Kolom ke `employees` Table
**File Schema**: `packages/db/src/schema/employee.ts`

Tambah field:
```typescript
userId: text("user_id").references(() => users.id), // link ke user account
```

**SQL Command**:
```bash
cd /Users/webane/sites/bantuanku
psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
"
```

#### 1.2 Tambah Kolom ke `campaigns` Table
**File Schema**: `packages/db/src/schema/campaign.ts`

Tambah field:
```typescript
coordinatorId: text("coordinator_id").references(() => employees.id), // PJ program
```

**SQL Command**:
```bash
psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS coordinator_id text REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_campaigns_coordinator_id ON campaigns(coordinator_id);
"
```

#### 1.3 Tambah Role Baru ke Database
**SQL Command**:
```bash
psql postgresql://webane@localhost:5432/bantuanku -c "
-- Note: Gunakan createId() untuk generate ID atau gunakan existing ID format
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (
  'pgm_coordinator_001', 
  'Program Coordinator', 
  'Manage assigned campaigns and distributions',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
"
```

**Catatan**: ID perlu disesuaikan dengan format yang digunakan sistem (kemungkinan pakai nanoid/cuid)

#### 1.4 Setup Permissions untuk Program Coordinator
**Perlu query dulu permissions yang ada**:
```bash
psql postgresql://webane@localhost:5432/bantuanku -c "
SELECT id, name, resource, action FROM permissions 
WHERE resource IN ('campaigns', 'zakat_distributions', 'campaign_updates')
ORDER BY resource, action;
"
```

**Lalu insert ke role_permissions** (setelah tahu permission IDs):
```bash
psql postgresql://webane@localhost:5432/bantuanku -c "
-- Example: Grant read campaigns permission
INSERT INTO role_permissions (role_id, permission_id)
VALUES 
  ('pgm_coordinator_001', 'permission_id_campaign_read'),
  ('pgm_coordinator_001', 'permission_id_campaign_update'),
  ('pgm_coordinator_001', 'permission_id_distribution_read'),
  ('pgm_coordinator_001', 'permission_id_distribution_update')
ON CONFLICT DO NOTHING;
"
```

---

### 2. Backend API

#### 2.1 Endpoint: Aktivasi Employee → User
**File**: `apps/api/src/routes/admin/employees.ts` (atau buat baru)

**Endpoint**: `POST /admin/employees/:id/activate-user`

**Request Body**:
```typescript
{
  email: string,      // required, untuk login
  password: string,   // required, akan di-hash
  roleId: string      // ID dari roles table (program_coordinator)
}
```

**Logic**:
1. Cek employee exists & belum punya user_id
2. Cek email belum dipakai user lain
3. Hash password
4. Create user account di `users` table
5. Insert role ke `user_roles` table
6. Update `employees.user_id` dengan user.id yang baru dibuat
7. Return success + user data

#### 2.2 Middleware: Filter Data by Coordinator
**File**: `apps/api/src/middleware/coordinator-filter.ts` (baru)

**Logic**:
```typescript
// Jika user punya role 'Program Coordinator':
// 1. Get employee record by user_id
// 2. Filter campaigns WHERE coordinator_id = employee.id
// 3. Filter zakat_distributions WHERE coordinator_id = employee.id
```

**Apply di routes**:
- `apps/api/src/routes/admin/campaigns.ts` - GET /admin/campaigns
- `apps/api/src/routes/admin/zakat-distributions.ts` - GET /admin/zakat-distributions

#### 2.3 Update Campaign CRUD
**File**: `apps/api/src/routes/admin/campaigns.ts`

**Perubahan**:
- POST/PUT endpoints: tambah field `coordinatorId` di body validation
- GET endpoints: apply coordinator filter jika user adalah program_coordinator

---

### 3. Frontend Admin

#### 3.1 Settings Page - Aktivasi Employee
**File**: `apps/admin/src/app/dashboard/settings/page.tsx` (atau buat tab baru)

**UI Requirements**:
1. Tab "Kelola User" atau "Aktivasi Karyawan"
2. List employees yang `is_active = true` dan `user_id IS NULL`
3. Button "Aktifkan sebagai User" untuk setiap employee
4. Modal form:
   - Email (input text, required)
   - Password (input password, required, min 8 karakter)
   - Role (dropdown: Admin Campaign, Admin Finance, Program Coordinator)
   - Button: Cancel | Aktivkan
5. Setelah berhasil, employee hilang dari list (karena sudah punya user_id)

#### 3.2 Sidebar - Conditional Rendering
**File**: `apps/admin/src/components/Sidebar.tsx` (atau sejenisnya)

**Logic**:
```typescript
const userRoles = user.roles; // array of role names

const menuItems = {
  superAdmin: ['Dashboard', 'Campaigns', 'Zakat', 'Reports', 'Finance', 'Master Data', 'Settings'],
  adminCampaign: ['Dashboard', 'Campaigns'],
  adminFinance: ['Dashboard', 'Finance', 'Reports'],
  programCoordinator: ['Campaigns', 'Zakat'], // HANYA ini
};

// Show menu based on highest role
```

**Perubahan**:
- Program Coordinator hanya lihat:
  - **Campaigns** (dengan submenu "Laporan Kegiatan")
  - **Zakat** → Penyaluran (bukan Donasi)

#### 3.3 Campaign Form - Pilih Coordinator
**File**: `apps/admin/src/app/dashboard/campaigns/[id]/page.tsx` atau `/new/page.tsx`

**Tambahan Field**:
```tsx
<div>
  <label>Penanggung Jawab Program</label>
  <select name="coordinatorId">
    <option value="">-- Pilih PJ --</option>
    {employees
      .filter(emp => emp.isActive)
      .map(emp => (
        <option key={emp.id} value={emp.id}>
          {emp.name} - {emp.position}
        </option>
      ))
    }
  </select>
</div>
```

#### 3.4 Campaign Reports - Filter by Coordinator
**File**: `apps/admin/src/app/dashboard/campaigns/[id]/reports/page.tsx` (jika ada)

**Logic**:
- Jika user adalah program_coordinator:
  - Hanya tampilkan campaign yang `coordinator_id = employee.id` dari user tersebut
  - Disable editing untuk campaign yang bukan tanggung jawabnya

#### 3.5 Zakat Distributions - Filter by Coordinator
**File**: `apps/admin/src/app/dashboard/zakat/distributions/page.tsx`

**Logic**:
- Jika user adalah program_coordinator:
  - Hanya tampilkan distribution yang `coordinator_id = employee.id`
  - `recipient_type = 'coordinator'` saja (karena dia PJ distribusi)

---

## 🔄 Workflow Lengkap

### Setup Awal (Super Admin)
1. Super admin login
2. Buka Settings → Kelola User
3. Lihat list employee yang belum diaktivasi
4. Klik "Aktifkan sebagai User" untuk employee tertentu
5. Isi email, password, pilih role "Program Coordinator"
6. Submit → User account dibuat, employee.user_id di-link

### Penugasan Campaign/Zakat (Super Admin/Admin Campaign)
1. Saat create/edit campaign → pilih coordinator dari dropdown
2. Saat create/edit penyaluran zakat → pilih coordinator (jika recipient_type = coordinator)

### Login Program Coordinator
1. PJ login dengan email/password yang dibuat super admin
2. Sidebar hanya tampil: Campaigns (Reports), Zakat (Penyaluran)
3. Data yang tampil otomatis filtered by coordinator_id = employee.id dari user tersebut

### Akses Data
**Program Coordinator A bisa akses**:
- Campaigns yang `coordinator_id = employee_id_A`
- Zakat distributions yang `coordinator_id = employee_id_A`

**Program Coordinator A TIDAK bisa akses**:
- Campaign milik coordinator B
- Zakat distributions milik coordinator B
- Master data lainnya
- Settings
- Finance reports (kecuali campaign mereka sendiri)

---

## 🚀 Urutan Implementasi

### Phase 1: Database (30 menit)
1. ✅ Cek roles & permissions yang ada (DONE)
2. Update schema TypeScript: `employees.userId`, `campaigns.coordinatorId`
3. Run ALTER TABLE untuk tambah kolom
4. Insert role baru "Program Coordinator" ke `roles` table
5. Setup permissions untuk role tersebut
6. Verifikasi: `\d employees`, `\d campaigns`, `SELECT * FROM roles`

### Phase 2: Backend API (2 jam)
1. Endpoint aktivasi employee → user (`POST /admin/employees/:id/activate-user`)
2. Middleware filter by coordinator
3. Update campaign endpoints (tambah coordinatorId, apply filter)
4. Update zakat distributions endpoints (apply filter)
5. Test dengan Postman/curl

### Phase 3: Frontend (3 jam)
1. Settings page: UI aktivasi employee
2. Sidebar: conditional rendering by role
3. Campaign form: dropdown pilih coordinator
4. Campaign & Zakat list: apply frontend filter (double check)
5. Test dengan login sebagai program coordinator

### Phase 4: Testing (1 jam)
1. Buat dummy employee
2. Aktivasi jadi program coordinator
3. Assign campaign/distribution ke employee tersebut
4. Login sebagai coordinator, cek hanya lihat data mereka
5. Cek super admin/admin lain tetap bisa lihat semua

---

## 📝 Checklist

### Database
- [x] UPDATE schema: `employees.userId` ✅
- [x] UPDATE schema: `campaigns.coordinatorId` ✅
- [x] ALTER TABLE employees ADD user_id ✅
- [x] ALTER TABLE campaigns ADD coordinator_id ✅
- [x] INSERT role "Program Coordinator" ✅
- [x] QUERY permissions yang ada (tidak ada permission system, pakai role-based) ✅
- [x] INSERT role_permissions untuk program coordinator (skip, sistem pakai role slugs) ✅
- [x] Verifikasi semua perubahan DB ✅

### Backend
- [x] Endpoint: POST /admin/employees/:id/activate-user ✅
- [x] Endpoint: GET /admin/employees/unactivated/list ✅
- [x] Middleware: coordinator filter ✅
- [x] Update: GET /admin/campaigns (filter) ✅
- [x] Update: POST/PUT /admin/campaigns (coordinatorId) ✅
- [x] Update: GET /admin/zakat-distributions (filter) ✅
- [ ] Test API dengan Postman

### Frontend
- [x] Settings → Users: Employee dropdown in create modal ✅
- [x] Settings → Users: Query unactivated employees ✅
- [x] Settings → Users: Auto-populate name/email from employee ✅
- [x] Settings → Users: Mutation to activate employee as user ✅
- [x] Settings → Users: Filter admin roles only ✅
- [x] Sidebar: Conditional menu by role ✅
- [x] Campaign Form: Dropdown coordinator ✅
- [x] Campaign List: Filter frontend (backend sudah filter otomatis) ✅
- [x] Zakat Distributions List: Filter frontend (backend sudah filter otomatis) ✅
- [ ] Test UI dengan berbagai role

### Testing
- [ ] Create test employee
- [ ] Activate sebagai program coordinator
- [ ] Create campaign dengan coordinator
- [ ] Create zakat distribution dengan coordinator
- [ ] Login as coordinator → verify filtered data
- [ ] Login as super admin → verify see all data
- [ ] Test permissions (create, update, delete)

---

## 🛠️ Commands Siap Pakai

### Cek Current State
```bash
# Cek employees yang belum punya user
psql postgresql://webane@localhost:5432/bantuanku -c "
SELECT id, name, position, email, user_id 
FROM employees 
WHERE is_active = true 
ORDER BY name;
"

# Cek campaigns yang belum punya coordinator
psql postgresql://webane@localhost:5432/bantuanku -c "
SELECT id, title, coordinator_id 
FROM campaigns 
WHERE status = 'published' 
ORDER BY created_at DESC 
LIMIT 10;
"

# Cek zakat distributions dengan coordinator
psql postgresql://webane@localhost:5432/bantuanku -c "
SELECT id, recipient_name, recipient_type, coordinator_id 
FROM zakat_distributions 
WHERE recipient_type = 'coordinator' 
ORDER BY created_at DESC 
LIMIT 10;
"
```

### Apply Migrations
```bash
cd /Users/webane/sites/bantuanku

# Step 1: Employees
psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
"

# Step 2: Campaigns
psql postgresql://webane@localhost:5432/bantuanku -c "
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS coordinator_id text REFERENCES employees(id);
CREATE INDEX IF NOT EXISTS idx_campaigns_coordinator_id ON campaigns(coordinator_id);
"

# Step 3: Insert Role (perlu adjust ID sesuai format sistem)
psql postgresql://webane@localhost:5432/bantuanku -c "
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (
  'program_coordinator', 
  'Program Coordinator', 
  'Manage assigned campaigns and distributions',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
"
```

---

## ❓ Questions & Decisions Needed

1. **Permission Details**: Perlu query `permissions` table untuk tahu permission apa saja yang harus di-grant ke program coordinator
2. **Role ID Format**: Apakah pakai nanoid/cuid seperti role lain, atau bisa custom string?
3. **Default Password**: Apakah super admin input manual, atau auto-generate dan kirim via email?
4. **Employee Multiple Roles**: Apakah 1 employee bisa punya multiple roles (e.g., Admin Campaign + Program Coordinator)?
5. **Coordinator Limit**: Apakah 1 campaign hanya bisa 1 coordinator, atau bisa multiple?
6. **Report Creation**: Apakah program coordinator bisa create campaign reports, atau hanya read?

---

## 📚 Reference Files

**Schema Files**:
- `packages/db/src/schema/employee.ts`
- `packages/db/src/schema/campaign.ts`
- `packages/db/src/schema/user.ts`
- `packages/db/src/schema/roles.ts`

**API Routes**:
- `apps/api/src/routes/admin/employees.ts` (perlu buat atau update)
- `apps/api/src/routes/admin/campaigns.ts`
- `apps/api/src/routes/admin/zakat-distributions.ts`

**Frontend Pages**:
- `apps/admin/src/app/dashboard/settings/page.tsx`
- `apps/admin/src/app/dashboard/campaigns/*/page.tsx`
- `apps/admin/src/app/dashboard/zakat/distributions/page.tsx`

**Middleware**:
- `apps/api/src/middleware/auth.ts` (existing)
- `apps/api/src/middleware/coordinator-filter.ts` (new)

---

## 📅 Status
- **Created**: 2026-01-23
- **Phase 1 (Database)**: ✅ COMPLETE (30 menit)
- **Phase 2 (Backend API)**: ✅ COMPLETE (45 menit)
- **Phase 3 (Frontend)**: ✅ COMPLETE (1 jam)
- **Phase 4 (Testing)**: 🔄 IN PROGRESS
- **Next Step**: Testing - Buat dummy employee, aktivasi, test filtering
- **Progress**: 75% complete (3/4 phases done)
