# Indonesia Address System - Helper Documentation

## Overview

Sistem alamat Indonesia terpusat yang dapat digunakan untuk semua entitas (donatur, employee, mustahiq, dll). Sistem ini menormalkan database dengan menyimpan referensi ke tabel alamat pusat daripada duplikasi data.

## Architecture

```
┌─────────────────┐
│  Frontend Form  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   AddressForm Component │
│  (Cascading Selects)    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   React Query Hooks     │
│  - useProvinces()       │
│  - useRegencies()       │
│  - useDistricts()       │
│  - useVillages()        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│     API Endpoints       │
│  /admin/address/*       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Database Tables       │
│  - indonesia_provinces  │
│  - indonesia_regencies  │
│  - indonesia_districts  │
│  - indonesia_villages   │
└─────────────────────────┘
```

## Database Schema

### Tables Created

1. **indonesia_provinces** (38 records)
   - code (PK) - Kode provinsi (e.g., "11", "12")
   - name - Nama provinsi (e.g., "Aceh", "Sumatera Utara")

2. **indonesia_regencies** (514 records)
   - code (PK) - Kode kabupaten/kota (e.g., "11.01")
   - province_code (FK) - Referensi ke provinces
   - name - Nama kabupaten/kota

3. **indonesia_districts** (7,285 records)
   - code (PK) - Kode kecamatan (e.g., "11.01.01")
   - regency_code (FK) - Referensi ke regencies
   - name - Nama kecamatan

4. **indonesia_villages** (83,762 records)
   - code (PK) - Kode kelurahan/desa (e.g., "11.01.01.2001")
   - district_code (FK) - Referensi ke districts
   - name - Nama kelurahan/desa
   - postal_code - Kode pos (nullable)

### Data Hierarchy

```
Province (38)
  └── Regency (514)
       └── District (7,285)
            └── Village (83,762)
                 └── Postal Code
```

## Frontend Implementation

### 1. Using AddressForm Component (Recommended)

The easiest way to implement address selection:

```tsx
import { AddressForm } from "@/components/forms/AddressForm";
import type { AddressValue } from "@/components/forms/AddressForm";

function DonaturForm() {
  const [address, setAddress] = useState<Partial<AddressValue>>({});

  return (
    <form>
      {/* Other fields */}

      <AddressForm
        value={address}
        onChange={setAddress}
        required
      />

      {/* Save button */}
    </form>
  );
}
```

### 2. Using React Query Hooks Directly

For custom implementations:

```tsx
import {
  useProvinces,
  useRegencies,
  useDistricts,
  useVillages,
} from "@/lib/hooks/use-indonesia-address";
import { Autocomplete } from "@/components/ui/autocomplete";

function CustomAddressForm() {
  const [provinceCode, setProvinceCode] = useState("");
  const [regencyCode, setRegencyCode] = useState("");

  const { data: provinces } = useProvinces();
  const { data: regencies } = useRegencies(provinceCode);

  return (
    <div>
      <Autocomplete
        options={provinces || []}
        getOptionLabel={(option) => option.name}
        getOptionValue={(option) => option.code}
        onChange={(province) => {
          setProvinceCode(province?.code || "");
          setRegencyCode(""); // Reset dependent fields
        }}
      />

      <Autocomplete
        options={regencies || []}
        getOptionLabel={(option) => option.name}
        getOptionValue={(option) => option.code}
        disabled={!provinceCode}
        onChange={(regency) => setRegencyCode(regency?.code || "")}
      />
    </div>
  );
}
```

### 3. Getting Complete Address

Fetch complete hierarchical address data:

```tsx
import { useCompleteAddress } from "@/lib/hooks/use-indonesia-address";

function AddressDisplay({ villageCode }: { villageCode: string }) {
  const { data: address } = useCompleteAddress(villageCode);

  if (!address) return null;

  return (
    <div>
      <p>{address.village.name}</p>
      <p>{address.district.name}</p>
      <p>{address.regency.name}</p>
      <p>{address.province.name}</p>
      <p>Kode Pos: {address.village.postalCode || "-"}</p>
    </div>
  );
}
```

## Backend Implementation

### Updating Existing Tables

When migrating existing tables to use the address system:

#### Example: Updating Donatur Table

**Before** (storing text fields):
```typescript
export const donatur = pgTable("donatur", {
  id: text("id").primaryKey(),
  name: text("name"),
  province: text("province"),        // ❌ Duplicate data
  regency: text("regency"),          // ❌ Duplicate data
  district: text("district"),        // ❌ Duplicate data
  village: text("village"),          // ❌ Duplicate data
  postalCode: text("postal_code"),   // ❌ Duplicate data
});
```

**After** (using references):
```typescript
export const donatur = pgTable("donatur", {
  id: text("id").primaryKey(),
  name: text("name"),
  provinceCode: text("province_code")
    .references(() => indonesiaProvinces.code),
  regencyCode: text("regency_code")
    .references(() => indonesiaRegencies.code),
  districtCode: text("district_code")
    .references(() => indonesiaDistricts.code),
  villageCode: text("village_code")
    .references(() => indonesiaVillages.code),
  // Postal code auto-filled from village
  detailAddress: text("detail_address"), // Street, house number, etc.
});
```

### Migration SQL

```sql
-- 1. Add new columns
ALTER TABLE donatur
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS regency_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT,
  ADD COLUMN IF NOT EXISTS village_code TEXT,
  ADD COLUMN IF NOT EXISTS detail_address TEXT;

-- 2. Add foreign key constraints
ALTER TABLE donatur
  ADD CONSTRAINT fk_province FOREIGN KEY (province_code)
    REFERENCES indonesia_provinces(code),
  ADD CONSTRAINT fk_regency FOREIGN KEY (regency_code)
    REFERENCES indonesia_regencies(code),
  ADD CONSTRAINT fk_district FOREIGN KEY (district_code)
    REFERENCES indonesia_districts(code),
  ADD CONSTRAINT fk_village FOREIGN KEY (village_code)
    REFERENCES indonesia_villages(code);

-- 3. Migrate existing data (if needed)
-- Note: This requires manual mapping from text to codes
-- Example:
-- UPDATE donatur
-- SET province_code = (
--   SELECT code FROM indonesia_provinces
--   WHERE name = donatur.province
-- );

-- 4. Drop old columns (after verifying migration)
-- ALTER TABLE donatur
--   DROP COLUMN province,
--   DROP COLUMN regency,
--   DROP COLUMN district,
--   DROP COLUMN village,
--   DROP COLUMN postal_code;
```

### API Query Examples

```typescript
// Get donatur with complete address
const donatur = await db
  .select({
    id: donaturTable.id,
    name: donaturTable.name,
    province: indonesiaProvinces.name,
    regency: indonesiaRegencies.name,
    district: indonesiaDistricts.name,
    village: indonesiaVillages.name,
    postalCode: indonesiaVillages.postalCode,
  })
  .from(donaturTable)
  .leftJoin(
    indonesiaProvinces,
    eq(donaturTable.provinceCode, indonesiaProvinces.code)
  )
  .leftJoin(
    indonesiaRegencies,
    eq(donaturTable.regencyCode, indonesiaRegencies.code)
  )
  .leftJoin(
    indonesiaDistricts,
    eq(donaturTable.districtCode, indonesiaDistricts.code)
  )
  .leftJoin(
    indonesiaVillages,
    eq(donaturTable.villageCode, indonesiaVillages.code)
  )
  .where(eq(donaturTable.id, id));
```

## API Endpoints

All endpoints require authentication and admin role.

### GET /admin/address/provinces
Get all provinces.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "11",
      "name": "Aceh"
    }
  ]
}
```

### GET /admin/address/regencies/:provinceCode
Get regencies by province code.

**Example:** `/admin/address/regencies/11`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "11.01",
      "name": "Kabupaten Aceh Selatan",
      "provinceCode": "11"
    }
  ]
}
```

### GET /admin/address/districts/:regencyCode
Get districts by regency code.

### GET /admin/address/villages/:districtCode
Get villages by district code.

**Response includes postal code:**
```json
{
  "success": true,
  "data": [
    {
      "code": "11.01.01.2001",
      "name": "Keude Bakongan",
      "districtCode": "11.01.01",
      "postalCode": "23511"
    }
  ]
}
```

### GET /admin/address/complete/:villageCode
Get complete hierarchical address by village code.

**Response:**
```json
{
  "success": true,
  "data": {
    "village": {
      "code": "11.01.01.2001",
      "name": "Keude Bakongan",
      "postalCode": "23511"
    },
    "district": {
      "code": "11.01.01",
      "name": "Bakongan"
    },
    "regency": {
      "code": "11.01",
      "name": "Kabupaten Aceh Selatan"
    },
    "province": {
      "code": "11",
      "name": "Aceh"
    }
  }
}
```

## Files Structure

```
packages/db/
├── src/schema/
│   ├── indonesia-provinces.ts
│   ├── indonesia-regencies.ts
│   ├── indonesia-districts.ts
│   └── indonesia-villages.ts
├── migrations/
│   └── 002-indonesia-address.sql
└── scripts/
    ├── run-migration.ts
    └── seed-indonesia-address.ts

apps/api/src/routes/admin/
└── address.ts

apps/admin/src/
├── lib/hooks/
│   └── use-indonesia-address.ts
└── components/forms/
    └── AddressForm.tsx
```

## Maintenance

### Re-seeding Data

If you need to update the address data:

```bash
# Re-run seed script (uses onConflictDoNothing, safe to run multiple times)
cd packages/db
npm run db:seed:address
```

### Adding New Addresses

The data comes from the `idn-area-data` package. To update:

1. Update the package: `npm update idn-area-data`
2. Re-run the seed script: `npm run db:seed:address`

## Best Practices

### ✅ DO

1. **Use foreign keys** to reference address tables
2. **Store only codes** in your entity tables
3. **Use joins** when querying to get full address names
4. **Use AddressForm component** for consistent UX
5. **Cache address data** (React Query does this automatically)

### ❌ DON'T

1. **Don't store address names** in entity tables (causes duplication)
2. **Don't manually create address records** (use the centralized tables)
3. **Don't skip cascade constraints** (maintain data integrity)
4. **Don't bypass the API endpoints** (use the hooks provided)

## Migration Checklist

When adding address fields to a new table:

- [ ] Add `provinceCode`, `regencyCode`, `districtCode`, `villageCode` columns
- [ ] Add foreign key constraints to indonesia_* tables
- [ ] Add `detailAddress` text field for street/house number
- [ ] Remove old text-based address columns (province, regency, district, village, postalCode)
- [ ] Update frontend form to use AddressForm component
- [ ] Update API queries to join with address tables
- [ ] Test cascading deletes (if parent address is deleted, what happens?)

## Examples of Tables to Update

Based on your request, these tables should use the centralized address system:

1. **donatur** - Donor addresses
2. **employees** - Employee addresses
3. **mustahiqs** - Mustahiq/recipient addresses
4. **qurban_orders** - Delivery addresses (if needed)
5. Any future tables requiring Indonesian addresses

## Support

Data source: [idn-area-data](https://github.com/fityannugroho/idn-area-data)

For issues or updates, check:
- Database schema: [packages/db/src/schema/](packages/db/src/schema/)
- API endpoints: [apps/api/src/routes/admin/address.ts](apps/api/src/routes/admin/address.ts)
- Frontend hooks: [apps/admin/src/lib/hooks/use-indonesia-address.ts](apps/admin/src/lib/hooks/use-indonesia-address.ts)
