# Helper Sistem Kontak Terpusat

## Overview

Sistem kontak terpusat untuk mengelola informasi kontak (email, phone, whatsapp, website) dengan format yang konsisten di seluruh aplikasi.

## Tujuan

1. **Hemat Database**: Format data konsisten, tidak ada duplikasi format berbeda
2. **Konsistensi Data**: Semua data tersimpan dalam format standar yang sama
3. **WhatsApp Integration Ready**: Format nomor sudah siap untuk integrasi WhatsApp API
4. **Maintainability**: Satu sumber truth untuk validasi dan normalisasi kontak

## Format Standar Database

```typescript
{
  email: string              // lowercase: "user@example.com"
  phone: string              // format: "08521234567" (no spaces, no +62)
  whatsappNumber: string     // format: "08521234567" (no spaces, no +62)
  website: string            // with protocol: "https://example.com"
}
```

### Kenapa Format ini?

- **User-friendly input**: User bisa ketik format apapun (08xxx, +628xxx, 628xxx, dengan spasi/dash)
- **Standardized storage**: Database menyimpan dalam format clean (08521234567)
- **Easy conversion**: Backend helper bisa convert ke format apapun sesuai kebutuhan:
  - WhatsApp API: `628521234567`
  - International: `+628521234567`
  - Display: `0852 1234 5678`

## Struktur Files

### Frontend (apps/admin)

```
apps/admin/src/
├── lib/
│   └── contact-helpers.ts          # Helper functions untuk frontend
└── components/
    └── forms/
        └── ContactForm.tsx          # Reusable contact form component
```

### Backend (apps/api)

```
apps/api/src/
└── lib/
    └── contact-helpers.ts          # Helper functions untuk backend
```

## Helper Functions

### Frontend: `lib/contact-helpers.ts`

```typescript
// Normalize functions
normalizePhone(input: string): string          // "08xxx" format
normalizeEmail(email: string): string          // lowercase
normalizeWebsite(url: string): string          // with https://

// Validation functions
isValidEmail(email: string): boolean
isValidPhone(phone: string): boolean           // Indonesian format
isValidWebsite(url: string): boolean

// Display functions
formatPhoneDisplay(phone: string): string      // "0852 1234 5678"
toWhatsAppFormat(phone: string): string        // "628521234567"
toInternationalFormat(phone: string): string   // "+628521234567"

// Batch normalize
normalizeContactData(data: ContactData): ContactData
```

### Backend: `lib/contact-helpers.ts`

```typescript
// Backend helpers (same as frontend but server-side)
normalizePhone(input: string): string
normalizeEmail(email: string): string
normalizeWebsite(url: string): string
normalizeContactData(data: Record<string, any>): Record<string, any>
```

## Implementasi Step-by-Step

### 1. Database Schema Migration

**File**: `packages/db/migrations/XXX_update_table_contact.sql`

```sql
-- Add website field if not exists
ALTER TABLE your_table ADD COLUMN IF NOT EXISTS website TEXT;

-- Rename old whatsapp column to whatsapp_number (if applicable)
ALTER TABLE your_table RENAME COLUMN whatsapp TO whatsapp_number;

-- Add comments for documentation
COMMENT ON COLUMN your_table.email IS 'Email address (stored in lowercase)';
COMMENT ON COLUMN your_table.phone IS 'Phone number (stored as 08xxxxxxxxxx format)';
COMMENT ON COLUMN your_table.whatsapp_number IS 'WhatsApp number (stored as 08xxxxxxxxxx format)';
COMMENT ON COLUMN your_table.website IS 'Website URL (stored with https:// protocol)';
```

**Jalankan migration**:
```bash
cd packages/db
psql -U webane -d bantuanku -f migrations/XXX_update_table_contact.sql
```

### 2. Update Schema Drizzle

**File**: `packages/db/src/schema/your-table.ts`

```typescript
export const yourTable = pgTable("your_table", {
  // ... other fields
  
  // Contact fields
  email: text("email").unique().notNull(),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),
  
  // ... other fields
});
```

### 3. Backend API - Update Validation Schema

**File**: `apps/api/src/routes/admin/your-endpoint.ts`

```typescript
import { normalizeContactData } from "../../lib/contact-helpers";

// CREATE schema
const createSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).optional(),
  whatsappNumber: z.string().trim().min(10).optional(),
  website: z.string().trim().optional(),
  // ... other fields
});

// UPDATE schema
const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),
  // ... other fields
});
```

### 4. Backend API - Normalize Data Before Save

**POST endpoint**:
```typescript
async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");

  // ✅ NORMALIZE contact data
  const normalizedBody = normalizeContactData(body);

  const insertData = {
    id: createId(),
    name: normalizedBody.name,
    email: normalizedBody.email,           // lowercase
    phone: normalizedBody.phone,           // 08xxx format
    whatsappNumber: normalizedBody.whatsappNumber,  // 08xxx format
    website: normalizedBody.website,       // https:// prefix
    // ... other fields
  };

  await db.insert(yourTable).values(insertData);
  return success(c, { id: insertData.id });
}
```

**PUT endpoint**:
```typescript
async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = c.get("db");

  // ✅ NORMALIZE contact data
  const normalizedBody = normalizeContactData(body);

  const updateData: any = { updatedAt: new Date() };
  
  if (normalizedBody.name !== undefined) updateData.name = normalizedBody.name;
  if (normalizedBody.phone !== undefined) updateData.phone = normalizedBody.phone;
  if (normalizedBody.whatsappNumber !== undefined) updateData.whatsappNumber = normalizedBody.whatsappNumber;
  if (normalizedBody.website !== undefined) updateData.website = normalizedBody.website;

  await db.update(yourTable).set(updateData).where(eq(yourTable.id, id));
  return success(c, null, "Updated successfully");
}
```

**GET endpoint - Include new fields**:
```typescript
const data = await db
  .select({
    id: yourTable.id,
    name: yourTable.name,
    email: yourTable.email,
    phone: yourTable.phone,
    whatsappNumber: yourTable.whatsappNumber,  // ✅ New field
    website: yourTable.website,                // ✅ New field
    // ... other fields
  })
  .from(yourTable)
  .where(eq(yourTable.id, id));
```

### 5. Frontend - Use ContactForm Component

**Import**:
```typescript
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { normalizeContactData } from "@/lib/contact-helpers";
```

**State Management**:
```typescript
const [contactData, setContactData] = useState<ContactValue>({});

// For edit - populate from existing data
const openEditModal = (item: YourType) => {
  setContactData({
    email: item.email || "",
    phone: item.phone || "",
    whatsappNumber: item.whatsappNumber || "",
    website: item.website || "",
  });
};
```

**Form JSX**:
```tsx
{/* ContactForm - Self-contained with title and styling */}
<ContactForm
  value={contactData}
  onChange={setContactData}
  required={true}
/>

{/* OR without title (when inside existing form-section) */}
<div className="form-section">
  <h3 className="form-section-title">Informasi Kontak</h3>
  
  {/* Other fields like contactPerson */}
  <div className="form-group">
    <label className="form-label">Nama Kontak</label>
    <input type="text" ... />
  </div>
  
  {/* ContactForm without built-in title */}
  <ContactForm
    value={contactData}
    onChange={setContactData}
    showTitle={false}
  />
</div>
```

**Submit Handler**:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Normalize before sending to API
  const normalizedContact = normalizeContactData(contactData);

  const submitData = {
    ...formData,
    ...normalizedContact,
    // ... other fields
  };

  // Send to API
  if (editingItem) {
    updateMutation.mutate({ id: editingItem.id, data: submitData });
  } else {
    createMutation.mutate(submitData);
  }
};
```

### 6. Frontend - Update View/Detail Page

**Import**:
```typescript
import { GlobeAltIcon, PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
```

**Display Contact Fields**:
```tsx
{/* Email */}
<div className="flex items-start gap-3">
  <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
  <div className="flex-1 min-w-0">
    <p className="text-sm text-gray-500">Email</p>
    <p className="font-medium text-gray-900 break-words">{data.email}</p>
  </div>
</div>

{/* Phone */}
{data.phone && (
  <div className="flex items-start gap-3">
    <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm text-gray-500">Nomor HP</p>
      <p className="font-medium text-gray-900">{data.phone}</p>
    </div>
  </div>
)}

{/* WhatsApp */}
{data.whatsappNumber && (
  <div className="flex items-start gap-3">
    <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm text-gray-500">WhatsApp</p>
      <p className="font-medium text-gray-900">{data.whatsappNumber}</p>
    </div>
  </div>
)}

{/* Website */}
{data.website && (
  <div className="flex items-start gap-3">
    <GlobeAltIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm text-gray-500">Website</p>
      <a 
        href={data.website} 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-medium text-primary-600 hover:text-primary-700 break-words"
      >
        {data.website}
      </a>
    </div>
  </div>
)}
```

## Cleanup Old Data & API

### 1. Database Cleanup

```sql
-- If you have old column names, rename them
ALTER TABLE your_table RENAME COLUMN whatsapp TO whatsapp_number;

-- If you have JSON/JSONB columns storing contact, migrate to proper columns
-- Example migration:
UPDATE your_table 
SET 
  phone = (metadata->>'phone')::text,
  whatsapp_number = (metadata->>'whatsapp')::text,
  website = (metadata->>'website')::text
WHERE metadata IS NOT NULL;

-- Then remove from JSON
UPDATE your_table 
SET metadata = metadata - 'phone' - 'whatsapp' - 'website'
WHERE metadata IS NOT NULL;
```

### 2. Remove Old API Fields

**Cek file API** untuk field lama yang tidak terpakai:

```bash
# Search for old field names
grep -r "whatsapp'" apps/api/src/routes/
grep -r '"whatsapp"' apps/api/src/routes/
```

**Remove atau replace**:
```typescript
// ❌ OLD - Don't use
whatsapp: body.whatsapp

// ✅ NEW - Use this
whatsappNumber: body.whatsappNumber
```

### 3. Update TypeScript Interfaces

```typescript
// ❌ OLD
interface OldType {
  whatsapp?: string;
}

// ✅ NEW
interface NewType {
  whatsappNumber?: string;
  website?: string;
}
```

### 4. Search & Replace in Codebase

```bash
# Find all references to old field
grep -r "\.whatsapp" apps/admin/src/
grep -r "data.whatsapp" apps/admin/src/

# Replace with new field
# Use your editor's find & replace
# .whatsapp → .whatsappNumber
# data.whatsapp → data.whatsappNumber
```

## Testing Checklist

### Frontend Testing

- [ ] Create: Form bisa input email, phone, whatsapp, website
- [ ] Create: Data tersimpan dengan format yang benar (08xxx, lowercase email, https://)
- [ ] Edit: Data ter-populate dengan benar di form
- [ ] Edit: Update data tersimpan dengan benar
- [ ] View: Semua field kontak ditampilkan
- [ ] View: Website link bisa diklik dan buka di tab baru
- [ ] Validation: Email format salah ditolak
- [ ] Validation: Phone < 10 digit ditolak

### Backend Testing

```bash
# Test normalization
curl -X POST http://localhost:8787/v1/admin/your-endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "TEST@EXAMPLE.COM",
    "phone": "+62 852-1234-5678",
    "whatsappNumber": "0852 1234 5678",
    "website": "example.com"
  }'

# Expected in database:
# email: "test@example.com"
# phone: "08521234567"
# whatsappNumber: "08521234567"
# website: "https://example.com"
```

## Entities yang Harus Implement

Berikut adalah entities yang perlu menggunakan sistem kontak ini:

### ✅ Sudah Implement
- [x] **Donatur** (`donatur` table) - DONE

### 🔲 Belum Implement
- [ ] **Mustahiq** (`mustahiq` table)
- [ ] **Employee** (`employees` table)
- [ ] **Vendor** (`vendors` table)
- [ ] **Campaign** (`campaigns` table) - contact person
- [ ] **Users** (`users` table) - admin/staff

## Migration Checklist Per Entity

Untuk setiap entity, ikuti checklist ini:

### Database
- [ ] Buat migration SQL untuk add/rename kolom
- [ ] Jalankan migration
- [ ] Update schema Drizzle (.ts file)
- [ ] Verify kolom dengan `\d table_name`

### Backend API
- [ ] Import `normalizeContactData` helper
- [ ] Update validation schema (create & update)
- [ ] Normalize data di POST endpoint
- [ ] Normalize data di PUT endpoint
- [ ] Include new fields di GET endpoints
- [ ] Remove old field references

### Frontend
- [ ] Update TypeScript interface
- [ ] Import ContactForm component
- [ ] Add contactData state
- [ ] Replace manual inputs dengan ContactForm
- [ ] Normalize before submit
- [ ] Update detail/view page untuk display all contact fields
- [ ] Test create, edit, view

### Cleanup
- [ ] Search & remove old field references
- [ ] Update all TypeScript types
- [ ] Test thoroughly

## Advanced: WhatsApp Integration

Ketika sudah siap implement WhatsApp API:

```typescript
import { toWhatsAppFormat } from "@/lib/contact-helpers";

// Convert untuk WhatsApp API
const waNumber = toWhatsAppFormat(user.whatsappNumber); // "628521234567"

// Send via WhatsApp API
await sendWhatsAppMessage(waNumber, message);
```

## Troubleshooting

### Error: column "whatsapp_number" does not exist

**Solution**: Jalankan migration database
```bash
psql -U webane -d bantuanku -f migrations/XXX_update_table_contact.sql
```

### Data tidak ter-normalize

**Problem**: Data masih format "+62" atau dengan spasi

**Solution**: Pastikan `normalizeContactData()` dipanggil sebelum save:
```typescript
const normalizedBody = normalizeContactData(body);
```

### Website tidak bisa diklik

**Problem**: Link tidak punya protocol

**Solution**: Helper sudah handle ini, pastikan gunakan `normalizeWebsite()`

### Validation error: phone too short

**Problem**: User input "+62" prefix, setelah normalize jadi "0" aja

**Solution**: Helper sudah handle ini correctly, cek implementation

## Best Practices

1. **Always normalize before save**: Backend API harus selalu normalize sebelum insert/update
2. **Validate after normalize**: Validation dilakukan setelah normalization
3. **Use helper for display**: Gunakan `formatPhoneDisplay()` untuk tampilan user-friendly
4. **Consistent naming**: Gunakan `whatsappNumber`, bukan `whatsapp` atau `wa` atau `whatsapp_number` di TypeScript
5. **Optional fields**: Phone, whatsapp, website adalah optional, hanya email yang required
6. **Website security**: Selalu pakai `rel="noopener noreferrer"` untuk external links

## Summary

Sistem kontak terpusat memberikan:
- ✅ Format data konsisten di database
- ✅ Easy validation dan normalization
- ✅ Ready untuk WhatsApp integration
- ✅ Reusable component (ContactForm)
- ✅ Centralized logic (helper functions)
- ✅ Clean dan maintainable code

**Next Steps**: Terapkan ke semua entities yang membutuhkan contact information dengan mengikuti checklist di atas.
