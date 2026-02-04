# Helper Rekening Bank (BankAccountForm)

## Konsep Utama

**BankAccountForm** adalah komponen helper reusable untuk mengelola rekening bank di seluruh aplikasi. Sama seperti AddressForm, komponen ini memastikan konsistensi UI dan struktur data di semua modul.

### Keuntungan Helper:
1. **UI Konsisten** - Tampilan sama di vendor, employee, donor, mustahiq, dll
2. **Edit Sekali, Berubah Semua** - Ubah di satu tempat, semua yang pakai otomatis update
3. **Database Terstruktur** - Data tersimpan di tabel terpisah, bukan kolom sporadis
4. **Multiple Records** - Bisa simpan banyak rekening (1, 2, 3, dst) untuk satu entity
5. **Ringan & Mudah** - Cukup import dan pakai, tidak perlu setup berulang

---

## Struktur Database

### Tabel: `entity_bank_accounts`

```sql
CREATE TABLE entity_bank_accounts (
  id text PRIMARY KEY,
  entity_type text NOT NULL,        -- vendor, employee, donor, mustahiq, dll
  entity_id text NOT NULL,          -- ID dari entity terkait
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder_name text NOT NULL,
  created_at timestamp(3) NOT NULL,
  updated_at timestamp(3) NOT NULL
);

-- Indexes
CREATE INDEX idx_entity_bank_accounts_entity ON entity_bank_accounts(entity_type, entity_id);
CREATE INDEX idx_entity_bank_accounts_entity_id ON entity_bank_accounts(entity_id);
```

**Kenapa Universal Table?**
- Satu tabel untuk semua entity (vendor, employee, donor, dll)
- Mudah query: `WHERE entity_type = 'vendor' AND entity_id = 'xxx'`
- Tidak perlu buat tabel terpisah per entity
- Konsisten struktur di semua modul

---

## Implementasi Lengkap

### Step 1: Database Migration (SUDAH SELESAI)

**File**: `packages/db/migrations/024_create_bank_accounts.sql`

```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/024_create_bank_accounts.sql
```

✅ **Sudah dijalankan** - Tabel `entity_bank_accounts` sudah dibuat

---

### Step 2: Schema Drizzle (SUDAH SELESAI)

**File**: `packages/db/src/schema/bank-accounts.ts`

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";

export const entityBankAccounts = pgTable("entity_bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolderName: text("account_holder_name").notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).defaultNow().notNull(),
});

export type EntityBankAccount = typeof entityBankAccounts.$inferSelect;
export type NewEntityBankAccount = typeof entityBankAccounts.$inferInsert;
```

**PENTING**: Sudah di-export di `packages/db/src/schema/index.ts`

---

### Step 3: Frontend Component (SUDAH SELESAI)

**File**: `apps/admin/src/components/forms/BankAccountForm.tsx`

**Type Definition**:
```typescript
export interface BankAccountValue {
  id?: string;              // Only exists for saved accounts
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}
```

**Fitur**:
- ✅ Repeater form (bisa tambah/hapus multiple rekening)
- ✅ Tombol "Tambah Rekening"
- ✅ Tombol "Hapus" per rekening
- ✅ Form hanya muncul jika ada rekening atau klik tambah
- ✅ Disabled mode untuk view-only
- ✅ Responsive design

---

### Step 4: API Backend (SUDAH SELESAI)

**File**: `apps/api/src/routes/admin/vendors.ts`

**Import**:
```typescript
import { entityBankAccounts } from "@bantuanku/db";
```

**Validation Schema**:
```typescript
const bankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  accountHolderName: z.string().min(1),
});

const vendorSchema = z.object({
  // ... other fields
  bankAccounts: z.array(bankAccountSchema).optional(),
});
```

**GET List** - Fetch bank accounts untuk semua vendors:
```typescript
// Fetch bank accounts for all vendors
const bankAccountsList = await db
  .select()
  .from(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "vendor"),
      or(...vendorIds.map((id) => eq(entityBankAccounts.entityId, id)))
    )
  );

// Group by vendor ID
const bankAccountsMap = new Map();
bankAccountsList.forEach((account) => {
  const existing = bankAccountsMap.get(account.entityId) || [];
  bankAccountsMap.set(account.entityId, [...existing, account]);
});

// Attach to vendors
const vendorListWithBankAccounts = vendorList.map((vendor) => ({
  ...vendor,
  bankAccounts: bankAccountsMap.get(vendor.id) || [],
}));
```

**GET Single** - Fetch bank accounts untuk satu vendor:
```typescript
const bankAccountsList = await db
  .select()
  .from(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "vendor"),
      eq(entityBankAccounts.entityId, id)
    )
  );

return c.json({
  data: {
    ...vendor,
    bankAccounts: bankAccountsList,
  },
});
```

**POST** - Create vendor + bank accounts:
```typescript
const { bankAccounts, postalCode, ...data } = normalizedBody;

// Insert vendor
const [newVendor] = await db.insert(vendors).values(cleanData).returning();

// Insert bank accounts
if (bankAccounts && bankAccounts.length > 0) {
  const bankAccountsToInsert = bankAccounts.map((account) => ({
    entityType: "vendor",
    entityId: newVendor.id,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountHolderName: account.accountHolderName,
  }));

  await db.insert(entityBankAccounts).values(bankAccountsToInsert);
}
```

**PUT** - Update vendor + bank accounts:
```typescript
// Update vendor
const [updatedVendor] = await db.update(vendors).set(cleanData).where(eq(vendors.id, id)).returning();

// Replace bank accounts (delete old, insert new)
if (bankAccounts !== undefined) {
  // Delete existing
  await db
    .delete(entityBankAccounts)
    .where(
      and(
        eq(entityBankAccounts.entityType, "vendor"),
        eq(entityBankAccounts.entityId, id)
      )
    );

  // Insert new
  if (bankAccounts.length > 0) {
    const bankAccountsToInsert = bankAccounts.map((account) => ({
      entityType: "vendor",
      entityId: id,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
    }));

    await db.insert(entityBankAccounts).values(bankAccountsToInsert);
  }
}
```

**DELETE** - Delete vendor + bank accounts:
```typescript
// Delete bank accounts first
await db
  .delete(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "vendor"),
      eq(entityBankAccounts.entityId, id)
    )
  );

// Then delete vendor
await db.delete(vendors).where(eq(vendors.id, id));
```

---

### Step 5: Frontend Modal (SUDAH SELESAI - Vendor)

**File**: `apps/admin/src/components/modals/VendorModal.tsx`

**Import**:
```typescript
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
```

**Type Definition**:
```typescript
type Vendor = {
  // ... other fields
  bankAccounts?: BankAccountValue[];
};
```

**State Management** (gunakan useMemo pattern seperti AddressForm):
```typescript
// Compute bank accounts data directly from vendor prop
const bankAccountsData = useMemo<BankAccountValue[]>(() => {
  if (vendor && vendor.bankAccounts) {
    return vendor.bankAccounts;
  }
  return [];
}, [vendor]);

// State untuk track perubahan dari user
const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);
```

**Form Rendering**:
```tsx
<div className="form-section">
  <h3 className="form-section-title">Informasi Rekening Bank</h3>
  <BankAccountForm
    value={bankAccountsData}
    onChange={setBankAccountsFormData}
    disabled={isViewMode}
    required={false}
  />
</div>
```

**Submit Handler**:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const payload = {
    ...formData,
    ...normalizedContact,
    ...addressFormData,
    bankAccounts: bankAccountsFormData, // Merge bank accounts
  };

  if (vendor) {
    updateMutation.mutate(payload);
  } else {
    createMutation.mutate(payload);
  }
};
```

---

## Migrasi Data & Cleanup

### Step 1: Migrasi Data Existing (Jika Ada)

⚠️ **HANYA jika ada vendor dengan data bank di kolom lama!**

**File**: `packages/db/migrations/024b_migrate_vendors_bank_data.sql`

```sql
-- Migrate existing bank account data from vendors table to entity_bank_accounts
-- Only migrate vendors that have bank account data

INSERT INTO entity_bank_accounts (id, entity_type, entity_id, bank_name, account_number, account_holder_name, created_at, updated_at)
SELECT
  'ba_' || substr(md5(random()::text), 1, 20) as id,
  'vendor' as entity_type,
  id as entity_id,
  bank_name,
  bank_account as account_number,
  bank_account_name as account_holder_name,
  created_at,
  updated_at
FROM vendors
WHERE bank_name IS NOT NULL
  AND bank_name != ''
  AND bank_account IS NOT NULL
  AND bank_account != ''
  AND bank_account_name IS NOT NULL
  AND bank_account_name != '';
```

**Jalankan**:
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/024b_migrate_vendors_bank_data.sql
```

**Verifikasi**:
```bash
# Cek berapa data yang ter-migrate
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "
SELECT COUNT(*) as total_migrated
FROM entity_bank_accounts
WHERE entity_type = 'vendor'
"
```

---

### Step 2: Cleanup API Response

**File**: `apps/api/src/routes/admin/vendors.ts`

**Hapus legacy bank fields dari SELECT** (setelah yakin migration data berhasil):

```typescript
// BEFORE (masih ada legacy fields)
const vendorList = await db
  .select({
    // ... other fields
    bankName: vendors.bankName,        // ❌ HAPUS
    bankAccount: vendors.bankAccount,  // ❌ HAPUS
    bankAccountName: vendors.bankAccountName, // ❌ HAPUS
  })

// AFTER (bersih, hanya pakai bankAccounts dari entity_bank_accounts)
const vendorList = await db
  .select({
    // ... other fields
    // Legacy fields dihapus!
  })
```

**Hapus juga dari validation schema**:

```typescript
// BEFORE
const vendorSchema = z.object({
  // ... other fields
  bankAccounts: z.array(bankAccountSchema).optional(),

  // Legacy bank fields - will be deprecated
  bankName: z.string().optional(),      // ❌ HAPUS
  bankAccount: z.string().optional(),   // ❌ HAPUS
  bankAccountName: z.string().optional(), // ❌ HAPUS
});

// AFTER
const vendorSchema = z.object({
  // ... other fields
  bankAccounts: z.array(bankAccountSchema).optional(),
  // Legacy fields dihapus!
});
```

**Hapus dari cleanData conversion**:

```typescript
// BEFORE
const cleanData: any = {
  ...data,
  // ... other fields
  bankName: data.bankName || null,          // ❌ HAPUS
  bankAccount: data.bankAccount || null,    // ❌ HAPUS
  bankAccountName: data.bankAccountName || null, // ❌ HAPUS
};

// AFTER
const cleanData: any = {
  ...data,
  // ... other fields
  // Legacy bank fields dihapus!
};
```

---

### Step 3: Cleanup Database Schema

**File**: `packages/db/migrations/025_cleanup_vendors_legacy_bank.sql`

⚠️ **JANGAN JALANKAN SEBELUM**:
1. ✅ Data existing sudah di-migrate (Step 1)
2. ✅ API sudah dibersihkan (Step 2)
3. ✅ Testing create, edit, delete vendor dengan helper baru OK
4. ✅ Verifikasi data tersimpan dengan benar di `entity_bank_accounts`

```sql
-- Drop legacy bank columns
ALTER TABLE vendors
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account,
  DROP COLUMN IF EXISTS bank_account_name;
```

**Jalankan**:
```bash
cd /Users/webane/sites/bantuanku
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/025_cleanup_vendors_legacy_bank.sql
```

**Verifikasi kolom sudah dihapus**:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -c "\d vendors"
```

---

### Step 4: Update TypeScript Schema

**File**: `packages/db/src/schema/vendor.ts`

**Hapus legacy fields**:

```typescript
// BEFORE
export const vendors = pgTable("vendors", {
  // ... other fields

  // Banking Info - Legacy (will be deprecated, use entity_bank_accounts table instead)
  bankName: text("bank_name"),              // ❌ HAPUS
  bankAccount: text("bank_account"),        // ❌ HAPUS
  bankAccountName: text("bank_account_name"), // ❌ HAPUS
});

// AFTER
export const vendors = pgTable("vendors", {
  // ... other fields
  // Legacy bank fields dihapus!
});
```

---

### Step 5: Cleanup Frontend Type

**File**: `apps/admin/src/components/modals/VendorModal.tsx`

**Hapus legacy fields dari type**:

```typescript
// BEFORE
type Vendor = {
  // ... other fields
  bankAccounts?: BankAccountValue[];

  // Legacy bank fields - will be deprecated
  bankName?: string;        // ❌ HAPUS
  bankAccount?: string;     // ❌ HAPUS
  bankAccountName?: string; // ❌ HAPUS
};

// AFTER
type Vendor = {
  // ... other fields
  bankAccounts?: BankAccountValue[];
  // Legacy fields dihapus!
};
```

---

### Checklist Cleanup Lengkap

- [ ] **Step 1**: Migrate data existing ke `entity_bank_accounts`
- [ ] **Verify**: Cek data ter-migrate dengan benar
- [ ] **Step 2**: Hapus legacy fields dari API response
- [ ] **Step 2**: Hapus legacy fields dari validation schema
- [ ] **Step 2**: Hapus legacy fields dari cleanData conversion
- [ ] **Test**: Create, edit, view, delete vendor - pastikan masih works
- [ ] **Step 3**: DROP kolom lama dari database
- [ ] **Verify**: Cek kolom sudah hilang dari `\d vendors`
- [ ] **Step 4**: Hapus legacy fields dari TypeScript schema
- [ ] **Step 5**: Hapus legacy fields dari frontend type
- [ ] **Final Test**: Full testing semua fitur vendor
- [ ] **Commit**: Git commit dengan pesan jelas

---

## Cara Pakai di Module Lain

### Contoh: Implementasi di Employee

**1. API Route** (`apps/api/src/routes/admin/employees.ts`):

```typescript
import { entityBankAccounts } from "@bantuanku/db";

// GET
const bankAccountsList = await db
  .select()
  .from(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "employee"), // Ganti entity type
      eq(entityBankAccounts.entityId, id)
    )
  );

// POST/PUT
const bankAccountsToInsert = bankAccounts.map((account) => ({
  entityType: "employee", // Ganti entity type
  entityId: newEmployee.id,
  bankName: account.bankName,
  accountNumber: account.accountNumber,
  accountHolderName: account.accountHolderName,
}));
```

**2. Frontend Modal** (`apps/admin/src/components/modals/EmployeeModal.tsx`):

```tsx
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";

// State (sama persis seperti vendor)
const bankAccountsData = useMemo<BankAccountValue[]>(() => {
  if (employee && employee.bankAccounts) {
    return employee.bankAccounts;
  }
  return [];
}, [employee]);

const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);

// Render (sama persis)
<BankAccountForm
  value={bankAccountsData}
  onChange={setBankAccountsFormData}
  disabled={isViewMode}
  required={false}
/>

// Submit (sama persis)
const payload = {
  ...formData,
  bankAccounts: bankAccountsFormData,
};
```

**3. That's it!** UI dan logic sudah konsisten.

---

## Checklist Implementasi untuk Module Baru

- [ ] Import `entityBankAccounts` di API route
- [ ] Tambah `bankAccounts` validation schema
- [ ] Update GET endpoint: fetch bank accounts
- [ ] Update POST endpoint: insert bank accounts
- [ ] Update PUT endpoint: replace bank accounts (delete + insert)
- [ ] Update DELETE endpoint: delete bank accounts first
- [ ] Import `BankAccountForm` di modal/page
- [ ] Tambah `bankAccounts` ke type definition
- [ ] Tambah `bankAccountsData` useMemo
- [ ] Tambah `bankAccountsFormData` state
- [ ] Render `<BankAccountForm />` di form
- [ ] Include `bankAccounts` di submit payload
- [ ] Test: create, edit, view, delete

---

## Pattern Konsisten

### Backend Pattern:
```typescript
// Always use:
entityType: "vendor" | "employee" | "donor" | "mustahiq" | etc
entityId: entity.id

// Always fetch with:
and(
  eq(entityBankAccounts.entityType, "type"),
  eq(entityBankAccounts.entityId, id)
)
```

### Frontend Pattern:
```typescript
// Always use useMemo for initial data:
const bankAccountsData = useMemo<BankAccountValue[]>(() => {
  if (entity && entity.bankAccounts) {
    return entity.bankAccounts;
  }
  return [];
}, [entity]);

// Always use state for user changes:
const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);

// Always merge in payload:
const payload = {
  ...formData,
  bankAccounts: bankAccountsFormData,
};
```

---

## Troubleshooting

### Error: "entity_bank_accounts table does not exist"
**Solusi**: Jalankan migration:
```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgresql://webane@localhost:5432/bantuanku -f packages/db/migrations/024_create_bank_accounts.sql
```

### Error: "Cannot import BankAccountForm"
**Solusi**: Pastikan path import benar:
```typescript
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
```

### Form kosong saat edit
**Solusi**: Pastikan pakai useMemo, bukan useState:
```typescript
// ✅ BENAR
const bankAccountsData = useMemo<BankAccountValue[]>(() => {
  if (vendor && vendor.bankAccounts) {
    return vendor.bankAccounts;
  }
  return [];
}, [vendor]);

// ❌ SALAH (akan empty saat edit)
const [bankAccountsData, setBankAccountsData] = useState<BankAccountValue[]>([]);
```

### Bank accounts tidak tersimpan
**Solusi**: Pastikan include di payload:
```typescript
const payload = {
  ...formData,
  bankAccounts: bankAccountsFormData, // Jangan lupa ini!
};
```

---

## Kesimpulan

✅ **Sudah Selesai untuk Vendor**:
1. Database table `entity_bank_accounts` dibuat
2. Schema Drizzle sudah ada
3. Component `BankAccountForm` sudah dibuat
4. API vendor sudah support bank accounts
5. VendorModal sudah pakai BankAccountForm
6. Cleanup migration sudah disiapkan (belum dijalankan)

🎯 **Siap Digunakan di Module Lain**:
- Tinggal copy pattern yang sama
- Ganti `entityType` sesuai module
- Import dan render `BankAccountForm`
- Done!

📝 **Next Steps**:
1. Test vendor create/edit/delete dengan rekening
2. Verifikasi data tersimpan di `entity_bank_accounts`
3. Setelah yakin OK, jalankan cleanup migration
4. Implementasi di employee, donor, mustahiq, dll
