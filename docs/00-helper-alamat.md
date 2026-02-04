# Panduan Implementasi Indonesia Address System

Panduan lengkap untuk mengimplementasikan sistem alamat Indonesia (Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa) pada tabel apapun di aplikasi.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing & Verification](#testing--verification)
5. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

### Sistem Lama (Legacy) ❌
```typescript
// Sistem lama - JANGAN DIPAKAI
{
  address: "Jl. Merdeka No. 123",      // Free text, tidak terstruktur
  city: "Jakarta",                      // Free text, tidak konsisten
  province: "DKI Jakarta",              // Free text, bisa typo
  postalCode: "12345"                   // Manual input, bisa salah
}
```

**Masalah:**
- Data tidak terstruktur
- Tidak ada validasi
- Duplikasi data
- Sulit untuk filter/search by region
- Kode pos bisa salah

### Sistem Baru (Indonesia Address System) ✅
```typescript
// Sistem baru - PAKAI INI
{
  detailAddress: "Jl. Merdeka No. 123, RT 02/RW 05",  // Detail jalan, rumah, RT/RW
  provinceCode: "31",                                  // Relasi ke table provinces
  regencyCode: "31.71",                                // Relasi ke table regencies
  districtCode: "31.71.01",                            // Relasi ke table districts
  villageCode: "31.71.01.1006",                        // Relasi ke table villages
  // Kode pos otomatis dari villages.postal_code
}
```

**Keuntungan:**
- ✅ Data terstruktur dengan foreign keys
- ✅ Cascading dropdown (auto-filter)
- ✅ Kode pos auto-fill dari database
- ✅ Konsisten (menggunakan data resmi Indonesia)
- ✅ Mudah filter by region
- ✅ 83,762 data alamat Indonesia lengkap

---

## Prerequisites

### 1. Address Tables Sudah Ada
Pastikan 4 tabel ini sudah ada dan terisi:

```sql
SELECT COUNT(*) FROM indonesia_provinces;  -- Harus 38 rows
SELECT COUNT(*) FROM indonesia_regencies;  -- Harus 514 rows
SELECT COUNT(*) FROM indonesia_districts;  -- Harus 7,266 rows
SELECT COUNT(*) FROM indonesia_villages;   -- Harus 83,762 rows
```

Jika belum, jalankan:
```bash
cd packages/db
npm run migrate:address        # Create tables
npm run db:seed:address        # Seed data (83,762 rows)
```

### 2. Frontend Components Sudah Ada
- ✅ `apps/admin/src/components/forms/AddressForm.tsx` - Main form component
- ✅ `apps/admin/src/components/ui/autocomplete.tsx` - Autocomplete dropdown
- ✅ `apps/admin/src/lib/hooks/use-indonesia-address.ts` - React Query hooks

---

## Step-by-Step Implementation

### Step 1: Database Migration - Add Address Columns

**File:** `packages/db/migrations/XXX_update_[table]_address.sql`

```sql
-- Update [TABLE_NAME] Table to Use Indonesia Address System
-- Replace [TABLE_NAME] with actual table name (e.g., employees, mustahiqs, etc.)

-- Step 1: Add new address columns
ALTER TABLE [table_name]
  ADD COLUMN IF NOT EXISTS detail_address TEXT,
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT;

-- Step 2: Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_[table_name]_province'
  ) THEN
    ALTER TABLE [table_name]
      ADD CONSTRAINT fk_[table_name]_province
        FOREIGN KEY (province_code)
        REFERENCES indonesia_provinces(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_[table_name]_regency'
  ) THEN
    ALTER TABLE [table_name]
      ADD CONSTRAINT fk_[table_name]_regency
        FOREIGN KEY (regency_code)
        REFERENCES indonesia_regencies(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_[table_name]_district'
  ) THEN
    ALTER TABLE [table_name]
      ADD CONSTRAINT fk_[table_name]_district
        FOREIGN KEY (district_code)
        REFERENCES indonesia_districts(code)
        ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_[table_name]_village'
  ) THEN
    ALTER TABLE [table_name]
      ADD CONSTRAINT fk_[table_name]_village
        FOREIGN KEY (village_code)
        REFERENCES indonesia_villages(code)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_[table_name]_province ON [table_name](province_code);
CREATE INDEX IF NOT EXISTS idx_[table_name]_regency ON [table_name](regency_code);
CREATE INDEX IF NOT EXISTS idx_[table_name]_district ON [table_name](district_code);
CREATE INDEX IF NOT EXISTS idx_[table_name]_village ON [table_name](village_code);

-- Note: Legacy columns (address, city, province, postal_code) are kept for backward compatibility
-- They will be removed in cleanup migration after data migration is complete
```

**Add to package.json:**
```json
{
  "scripts": {
    "migrate:[table]-address": "tsx scripts/run-migration.ts migrations/XXX_update_[table]_address.sql"
  }
}
```

**Run migration:**
```bash
npm run migrate:[table]-address
```

---

### Step 2: Update Database Schema (Drizzle)

**File:** `packages/db/src/schema/[table].ts`

```typescript
import { pgTable, text, ... } from "drizzle-orm/pg-core";
import { indonesiaProvinces } from "./indonesia-provinces";
import { indonesiaRegencies } from "./indonesia-regencies";
import { indonesiaDistricts } from "./indonesia-districts";
import { indonesiaVillages } from "./indonesia-villages";

export const [tableName] = pgTable("[table_name]", {
  id: text("id").primaryKey().$defaultFn(() => createId()),

  // ... other fields ...

  // Address - using Indonesia Address System
  detailAddress: text("detail_address"), // Street, house number, RT/RW, etc.
  provinceCode: text("province_code").references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code").references(() => indonesiaRegencies.code),
  districtCode: text("district_code").references(() => indonesiaDistricts.code),
  villageCode: text("village_code").references(() => indonesiaVillages.code),

  // ... other fields ...
});
```

**PENTING:**
- ❌ JANGAN tambahkan legacy columns (`address`, `city`, `province`, `postal_code`) di schema baru
- ✅ Hanya gunakan 5 field address baru

---

### Step 3: Update API Routes

#### 3.1 Import Address Tables

**File:** `apps/api/src/routes/admin/[table].ts`

```typescript
import {
  [tableName],
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
} from "@bantuanku/db";
import { eq } from "drizzle-orm";
```

#### 3.2 Update Validation Schema

```typescript
const [table]Schema = z.object({
  // ... other fields ...

  // Address - Indonesia Address System
  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  postalCode: z.string().optional().nullable(), // From AddressForm, not stored in DB

  // ... other fields ...
});
```

**PENTING:**
- ✅ `postalCode` hanya untuk validasi, TIDAK disimpan di table
- ✅ Postal code diambil dari `villages.postal_code` saat read

#### 3.3 Update GET Endpoint (List)

```typescript
// GET /admin/[table] - List with pagination
app.get("/", async (c) => {
  try {
    const db = c.get("db");
    // ... pagination & filters ...

    const list = await db
      .select({
        id: [tableName].id,
        // ... other fields ...

        // Address fields
        detailAddress: [tableName].detailAddress,
        provinceCode: [tableName].provinceCode,
        regencyCode: [tableName].regencyCode,
        districtCode: [tableName].districtCode,
        villageCode: [tableName].villageCode,

        // Address names from joined tables
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,
      })
      .from([tableName])
      .leftJoin(indonesiaProvinces, eq([tableName].provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq([tableName].regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq([tableName].districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq([tableName].villageCode, indonesiaVillages.code))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc([tableName].createdAt));

    return c.json({ data: list, pagination });
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to fetch data" }, 500);
  }
});
```

#### 3.4 Update GET Endpoint (By ID)

```typescript
// GET /admin/[table]/:id - Get single record
app.get("/:id", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const result = await db
      .select({
        id: [tableName].id,
        // ... other fields ...

        // Address fields
        detailAddress: [tableName].detailAddress,
        provinceCode: [tableName].provinceCode,
        regencyCode: [tableName].regencyCode,
        districtCode: [tableName].districtCode,
        villageCode: [tableName].villageCode,

        // Address names
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,
      })
      .from([tableName])
      .leftJoin(indonesiaProvinces, eq([tableName].provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq([tableName].regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq([tableName].districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq([tableName].villageCode, indonesiaVillages.code))
      .where(eq([tableName].id, id))
      .limit(1);

    if (!result || result.length === 0) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ data: result[0] });
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to fetch data" }, 500);
  }
});
```

#### 3.5 Update POST Endpoint (Create)

```typescript
// POST /admin/[table] - Create new record
app.post("/", async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();
    const validated = [table]Schema.parse(body);

    // Remove postalCode as it's not stored in table
    const { postalCode, ...data } = validated;

    // Convert empty strings to null for optional fields (IMPORTANT!)
    const cleanData: any = {
      ...data,
      // For ALL optional text fields, convert empty string to null
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      // ... do the same for other optional fields with UNIQUE constraint ...
    };

    const [newRecord] = await db
      .insert([tableName])
      .values(cleanData)
      .returning();

    return c.json({ data: newRecord }, 201);
  } catch (error: any) {
    console.error("Error:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to create" }, 500);
  }
});
```

**CRITICAL - Empty String to NULL:**
```typescript
// ❌ SALAH - Akan error jika ada UNIQUE constraint
provinceCode: data.provinceCode || "",  // Empty string

// ✅ BENAR - NULL boleh duplikat di UNIQUE column
provinceCode: data.provinceCode || null,
```

**Kenapa penting?**
- PostgreSQL UNIQUE constraint: empty string `""` dianggap sama, jadi tidak boleh duplikat
- NULL boleh duplikat di UNIQUE column
- Jika tidak convert ke null, akan error: `Key (employee_id)=() already exists`

#### 3.6 Update PUT Endpoint (Update)

```typescript
// PUT /admin/[table]/:id - Update record
app.put("/:id", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = [table]Schema.parse(body);

    // Remove postalCode as it's not stored in table
    const { postalCode, ...data } = validated;

    // Convert empty strings to null (same as POST)
    const cleanData: any = {
      ...data,
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update([tableName])
      .set(cleanData)
      .where(eq([tableName].id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ data: updated });
  } catch (error: any) {
    console.error("Error:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to update" }, 500);
  }
});
```

---

### Step 4: Update Frontend - TypeScript Types

**File:** `apps/admin/src/components/modals/[Table]Modal.tsx` atau `apps/admin/src/app/dashboard/[path]/page.tsx`

```typescript
type [TableName] = {
  id: string;
  // ... other fields ...

  // Address - Indonesia Address System
  detailAddress?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  provinceName?: string;      // From JOIN
  regencyName?: string;        // From JOIN
  districtName?: string;       // From JOIN
  villageName?: string;        // From JOIN
  villagePostalCode?: string | null;  // From JOIN

  // ... other fields ...
};
```

---

### Step 5: Update Frontend - Modal Component

**File:** `apps/admin/src/components/modals/[Table]Modal.tsx`

#### 5.1 Import AddressForm

```typescript
import { useState, useEffect, useMemo } from "react";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
```

#### 5.2 Compute Address Data with useMemo (CRITICAL!)

```typescript
export default function [Table]Modal({
  isOpen,
  onClose,
  onSuccess,
  record,  // atau employee, donatur, etc.
  isViewMode = false,
}: [Table]ModalProps) {

  // ✅ BENAR - Compute addressData langsung dari record prop
  const addressData = useMemo<Partial<AddressValue>>(() => {
    if (record) {
      return {
        detailAddress: record.detailAddress || "",
        provinceCode: record.provinceCode || "",
        regencyCode: record.regencyCode || "",
        districtCode: record.districtCode || "",
        villageCode: record.villageCode || "",
        postalCode: record.villagePostalCode || null,
      };
    }
    return {};
  }, [record]);

  // ✅ State untuk track perubahan dari user
  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});

  // ... other state ...
```

**CRITICAL - Kenapa pakai useMemo?**

```typescript
// ❌ SALAH - Initial state kosong, useEffect set terlambat
const [addressData, setAddressData] = useState({});  // Kosong!

useEffect(() => {
  if (record) {
    setAddressData({...});  // Set terlambat, AddressForm sudah render dengan kosong
  }
}, [record]);

// ✅ BENAR - Computed langsung, tersedia saat render pertama
const addressData = useMemo(() => {
  if (record) {
    return {...};  // Langsung ada!
  }
  return {};
}, [record]);
```

**Sequence yang salah (useState):**
1. Render Modal → `addressData = {}`
2. Render AddressForm → terima `{}`  ← KOSONG!
3. Run useEffect → `setAddressData({...})`
4. Re-render → terlambat

**Sequence yang benar (useMemo):**
1. Compute addressData → langsung ada data
2. Render Modal → `addressData = {...data...}`
3. Render AddressForm → terima data  ← LENGKAP!

#### 5.3 Render AddressForm

```typescript
<form onSubmit={handleSubmit}>
  {/* ... other fields ... */}

  {/* Address Form */}
  <div className="form-field">
    <h4 className="form-label mb-3">Alamat Indonesia</h4>
    <AddressForm
      value={addressData}              // Initial value dari record
      onChange={setAddressFormData}    // Update state saat user edit
      disabled={isViewMode}
      required={false}
    />
  </div>

  {/* ... other fields ... */}
</form>
```

#### 5.4 Handle Submit

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const payload = {
    ...formData,
    ...addressFormData,  // ✅ Gunakan addressFormData (updated)
    // ... other transformations ...
  };

  if (record) {
    updateMutation.mutate({ id: record.id, data: payload });
  } else {
    createMutation.mutate(payload);
  }
};
```

---

### Step 6: Cleanup Migration - Remove Legacy Columns

**PENTING:** Jalankan ini **SETELAH** semua fitur create/update/edit sudah berfungsi dengan baik!

**File:** `packages/db/migrations/XXX_cleanup_[table]_legacy_address.sql`

```sql
-- Cleanup [TABLE_NAME] Legacy Address Columns
-- Remove old address columns that are now replaced by Indonesia Address System

-- IMPORTANT: Only run this AFTER all features are working with new address system!

-- Drop legacy address columns
ALTER TABLE [table_name]
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS province,
  DROP COLUMN IF EXISTS postal_code;
```

**Verification Query:**
```sql
-- Check remaining columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = '[table_name]'
AND column_name IN (
  'address', 'city', 'province', 'postal_code',  -- Legacy (should NOT exist)
  'detail_address', 'province_code', 'regency_code', 'district_code', 'village_code'  -- New (should exist)
)
ORDER BY column_name;
```

**Expected Result:**
```
column_name      | data_type
-----------------+-----------
detail_address   | text       ✅
district_code    | text       ✅
province_code    | text       ✅
regency_code     | text       ✅
village_code     | text       ✅
(5 rows)  -- No legacy columns!
```

**Add to package.json:**
```json
{
  "scripts": {
    "migrate:cleanup-[table]": "tsx scripts/run-migration.ts migrations/XXX_cleanup_[table]_legacy_address.sql"
  }
}
```

**Run cleanup:**
```bash
npm run migrate:cleanup-[table]
```

---

## Testing & Verification

### 1. Test Create

```bash
# 1. Create record dengan address lengkap
# 2. Check database
cd packages/db
npx tsx -e "
import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env' });
const sql = postgres(process.env.DATABASE_URL);
const result = await sql\`
  SELECT
    t.id,
    t.detail_address,
    t.province_code,
    p.name as province_name,
    t.regency_code,
    r.name as regency_name,
    t.district_code,
    d.name as district_name,
    t.village_code,
    v.name as village_name,
    v.postal_code
  FROM [table_name] t
  LEFT JOIN indonesia_provinces p ON t.province_code = p.code
  LEFT JOIN indonesia_regencies r ON t.regency_code = r.code
  LEFT JOIN indonesia_districts d ON t.district_code = d.code
  LEFT JOIN indonesia_villages v ON t.village_code = v.code
  ORDER BY t.created_at DESC
  LIMIT 3
\`;
console.table(result);
await sql.end();
"
```

**Expected:** Semua address fields terisi dengan benar

### 2. Test Edit

1. Buka form edit record yang sudah ada
2. Check browser console:
   ```
   ✅ useMemo - Computed addressData: { detailAddress: "...", provinceCode: "...", ... }
   ✅ AddressForm - Received value prop: { detailAddress: "...", ... }
   ```
3. Semua field (Detail Address, Province, Regency, District, Village) harus terisi
4. Edit dan save
5. Verify database updated

### 3. Test API Response

```bash
curl http://localhost:50245/v1/admin/[table]/[id] | jq '.data | {
  detailAddress,
  provinceCode,
  provinceName,
  regencyCode,
  regencyName,
  districtCode,
  districtName,
  villageCode,
  villageName,
  villagePostalCode
}'
```

**Expected:**
```json
{
  "detailAddress": "Jl. Merdeka No. 123",
  "provinceCode": "31",
  "provinceName": "DKI Jakarta",
  "regencyCode": "31.71",
  "regencyName": "Jakarta Pusat",
  "districtCode": "31.71.01",
  "districtName": "Gambir",
  "villageCode": "31.71.01.1006",
  "villageName": "Duri Pulo",
  "villagePostalCode": null
}
```

---

## Common Issues & Solutions

### Issue 1: Empty String UNIQUE Constraint Error

**Error:**
```
code: '23505'
detail: 'Key (employee_id)=() already exists.'
```

**Cause:** Empty string `""` di field dengan UNIQUE constraint

**Solution:** Convert empty string to `null`
```typescript
// ✅ Fix
const cleanData = {
  ...data,
  employeeId: data.employeeId || null,  // Not ""
  provinceCode: data.provinceCode || null,
};
```

### Issue 2: AddressForm Kosong Saat Edit

**Symptom:** Modal terbuka tapi semua field address kosong

**Cause:** useState initial value kosong, useEffect set terlambat

**Solution:** Gunakan useMemo
```typescript
// ❌ Wrong
const [addressData, setAddressData] = useState({});

// ✅ Correct
const addressData = useMemo(() => {
  if (record) {
    return { detailAddress: record.detailAddress || "", ... };
  }
  return {};
}, [record]);
```

### Issue 3: postalCode Not Saved

**Symptom:** Error saat save "column postal_code does not exist"

**Cause:** Trying to save postalCode to table

**Solution:** Remove postalCode before insert
```typescript
const { postalCode, ...data } = validated;
await db.insert(table).values(data);  // Don't include postalCode
```

Postal code diambil dari JOIN saat read, bukan disimpan.

### Issue 4: Provinces Tidak Load

**Symptom:** Dropdown Province kosong

**Cause:** Hook atau API endpoint salah

**Solution:**
1. Check API: `GET /admin/address/provinces` return 38 items
2. Check console: "Provinces loaded: 38 items"
3. Pastikan `useProvinces()` hook ada

### Issue 5: Cascading Tidak Reset

**Symptom:** Pilih province baru tapi regency masih dari province lama

**Cause:** Handler tidak reset dependent fields

**Solution:** Di AddressForm sudah handled
```typescript
const handleProvinceChange = (value: Province | null) => {
  setProvinceCode(value?.code || "");
  setRegencyCode("");      // ✅ Reset
  setDistrictCode("");     // ✅ Reset
  setVillageCode("");      // ✅ Reset
  setPostalCode(null);     // ✅ Reset
};
```

---

## Checklist Implementasi

Gunakan checklist ini untuk setiap tabel baru:

### Backend
- [ ] Create migration file `XXX_update_[table]_address.sql`
- [ ] Add 5 address columns (detail_address, province_code, regency_code, district_code, village_code)
- [ ] Add 4 foreign keys to address tables
- [ ] Add 4 indexes for performance
- [ ] Add migration script to package.json
- [ ] Run migration
- [ ] Update Drizzle schema - add 5 address fields with references
- [ ] Update API imports - import 4 address tables
- [ ] Update validation schema - add 5 address fields + postalCode (validation only)
- [ ] Update GET list endpoint - select address fields + LEFT JOIN 4 tables
- [ ] Update GET by ID endpoint - select address fields + LEFT JOIN 4 tables
- [ ] Update POST endpoint - remove postalCode, convert empty to null
- [ ] Update PUT endpoint - remove postalCode, convert empty to null
- [ ] Test API manually

### Frontend
- [ ] Update TypeScript type - add 10 address fields (5 codes + 5 names)
- [ ] Import AddressForm component
- [ ] Add useMemo for addressData (computed from record prop)
- [ ] Add useState for addressFormData (track user changes)
- [ ] Render AddressForm with value={addressData} onChange={setAddressFormData}
- [ ] Update submit handler - merge addressFormData into payload
- [ ] Test create - verify data saved to database
- [ ] Test edit - verify fields populated correctly
- [ ] Test update - verify changes saved

### Cleanup (After Everything Works)
- [ ] Create cleanup migration `XXX_cleanup_[table]_legacy_address.sql`
- [ ] Drop legacy columns (address, city, province, postal_code)
- [ ] Add cleanup script to package.json
- [ ] Run cleanup migration
- [ ] Verify with SQL query - legacy columns gone
- [ ] Remove legacy field handling from API (if any remains)

---

## Complete Example: Employees

Reference lengkap bisa dilihat di:
- **Schema:** `packages/db/src/schema/employee.ts`
- **Migration:** `packages/db/migrations/017_update_employees_address.sql`
- **Cleanup:** `packages/db/migrations/019_cleanup_employees_legacy_address.sql`
- **API:** `apps/api/src/routes/admin/employees.ts`
- **Frontend:** `apps/admin/src/components/modals/EmployeeModal.tsx`

---

## Support

Jika ada masalah:
1. Check [Common Issues & Solutions](#common-issues--solutions)
2. Check browser console untuk error
3. Check API console untuk error
4. Verify database dengan SQL query
5. Compare dengan implementasi employees (reference)

Happy coding! 🚀
