# SOP: Membuat Helper Components
## Standard Operating Procedure untuk Pembuatan Helper Components yang Konsisten

> **Filosofi**: "Edit sekali, update di mana-mana" - Single Source of Truth untuk UI Components

---

## 📋 Table of Contents

1. [Pengertian Helper Component](#pengertian-helper-component)
2. [Kapan Membuat Helper](#kapan-membuat-helper)
3. [Struktur dan Konvensi File](#struktur-dan-konvensi-file)
4. [Checklist Implementasi](#checklist-implementasi)
5. [Pattern: Frontend Component](#pattern-frontend-component)
6. [Pattern: Backend Helper](#pattern-backend-helper)
7. [Pattern: Database Schema](#pattern-database-schema)
8. [Pattern: Implementasi di Entities](#pattern-implementasi-di-entities)
9. [Testing & Verification](#testing--verification)
10. [Common Pitfalls](#common-pitfalls)
11. [Reference Examples](#reference-examples)

---

## Pengertian Helper Component

Helper component adalah **reusable UI component dengan business logic terintegrasi** yang:

✅ **Single Source of Truth** - Satu component digunakan di banyak tempat  
✅ **Self-contained** - Memiliki wrapper, title, dan styling sendiri  
✅ **Consistent Interface** - Props dan behavior yang sama di semua implementasi  
✅ **Backend Integration** - Paired dengan helper functions untuk normalization/validation  
✅ **Type-safe** - Menggunakan TypeScript interfaces untuk data contract  

**Contoh yang sudah ada:**
- `ContactForm` - Email, phone, WhatsApp, website
- `AddressForm` - Indonesia address cascading selection
- `MediaLibrary` - File upload dan management

---

## Kapan Membuat Helper

### ✅ Buat Helper Jika:

1. **Field set yang sama digunakan di 3+ entities**
   - Contoh: Email, phone, WhatsApp → muncul di Donatur, Vendor, Employee, Mustahiq, Settings
   
2. **Complex UI logic yang perlu konsisten**
   - Contoh: Province → Regency → District → Village cascading
   
3. **Validation/normalization rules yang sama**
   - Contoh: Phone format (08xxx), email lowercase, website https://
   
4. **Business logic yang repetitive**
   - Contoh: "Same as phone" checkbox untuk WhatsApp

### ❌ Jangan Buat Helper Jika:

1. **Field hanya digunakan 1-2 kali**
   - Contoh: Specific fields untuk satu entity saja
   
2. **UI terlalu simple tanpa logic**
   - Contoh: Single text input tanpa validation
   
3. **Behavior berbeda per context**
   - Contoh: Field yang butuh custom validation berbeda-beda

---

## Struktur dan Konvensi File

### Frontend Component

```
apps/admin/src/
├── components/
│   └── forms/
│       ├── ContactForm.tsx          ← Component utama
│       ├── AddressForm.tsx
│       └── [HelperName]Form.tsx     ← Pattern: [Name]Form.tsx
├── lib/
│   ├── contact-helpers.ts           ← Frontend helpers (validation, normalize)
│   ├── address-helpers.ts
│   └── [helper-name]-helpers.ts     ← Pattern: [name]-helpers.ts
└── types/
    └── [helper-name].ts             ← Types jika complex (optional)
```

### Backend Helper

```
apps/api/src/
└── lib/
    ├── contact-helpers.ts           ← Backend helpers (normalize, legacy support)
    ├── address-helpers.ts
    └── [helper-name]-helpers.ts     ← Pattern: [name]-helpers.ts
```

### Database Migration

```
packages/db/
└── migrations/
    ├── 022_update_donatur_contact.sql
    ├── 023_update_vendors_contact.sql
    └── [###]_update_[entity]_[helper].sql  ← Pattern: ###_update_entity_helper.sql
```

### Dokumentasi

```
/
├── 00-helper-[name].md              ← Dokumentasi helper specific
└── 00-helper-SOP.md                 ← SOP ini
```

---

## Checklist Implementasi

### Phase 1: Planning & Design ✅

- [ ] **Identify repetitive fields** - List semua fields yang akan masuk helper
- [ ] **Define data contract** - Buat interface untuk value type
- [ ] **Design props interface** - value, onChange, disabled, required, showTitle
- [ ] **Plan validation rules** - Normalization, format, required checks
- [ ] **Database schema design** - Tentukan nama kolom (snake_case)

### Phase 2: Frontend Component ✅

- [ ] **Create component file** - `components/forms/[Name]Form.tsx`
- [ ] **Export value interface** - `export interface [Name]Value { ... }`
- [ ] **Implement props interface** - Include showTitle, disabled, required
- [ ] **Add form-section wrapper** - `<div className="form-section">`
- [ ] **Conditional title** - `{showTitle && <h3>Title</h3>}`
- [ ] **Input fields** - All fields dengan proper labels, placeholders
- [ ] **State management** - Local state + onChange callback
- [ ] **Validation display** - Error messages jika ada

### Phase 3: Frontend Helper Functions ✅

- [ ] **Create helper file** - `lib/[name]-helpers.ts`
- [ ] **normalizeData function** - Clean, format, transform data
- [ ] **validateData function** - Return validation errors (optional)
- [ ] **formatForDisplay function** - Format untuk display (optional)
- [ ] **Export from helper** - Export semua utility functions

### Phase 4: Backend Helper Functions ✅

- [ ] **Create backend helper** - `apps/api/src/lib/[name]-helpers.ts`
- [ ] **normalizeData function** - Server-side normalization
- [ ] **Legacy field support** - Map old fields ke new format
- [ ] **Sanitization** - Remove dangerous input (XSS, injection)

### Phase 5: Database Migrations ✅

- [ ] **Migration file per entity** - Satu file per entity yang update
- [ ] **ADD COLUMN statements** - Tambah kolom dengan proper types
- [ ] **COMMENT statements** - Add descriptions untuk setiap kolom
- [ ] **Data migration** - Migrate existing data jika perlu
- [ ] **Test rollback** - Pastikan migration bisa di-rollback
- [ ] **Run migration** - Execute di database

### Phase 6: Backend API Integration ✅

- [ ] **Import helper** - Import normalizeData di route files
- [ ] **POST route** - Normalize data before insert
- [ ] **PUT route** - Normalize data before update
- [ ] **GET route** - Return semua fields (new + legacy)
- [ ] **Explicit field mapping** - Avoid spread operator untuk required fields

### Phase 7: Frontend Implementation ✅

- [ ] **Import component** - Import [Name]Form dan [Name]Value type
- [ ] **Import helper** - Import normalizeData
- [ ] **Create state** - `const [data, setData] = useState<[Name]Value>({})`
- [ ] **Add to form JSX** - `<[Name]Form value={data} onChange={setData} />`
- [ ] **Normalize on submit** - `const normalized = normalizeData(data)`
- [ ] **Pass to mutation** - Include normalized data di payload

### Phase 8: Rollout to Entities ✅

- [ ] **Identify all entities** - List semua entity yang butuh helper
- [ ] **Test implementation** - Implement di 1 entity first (proof of concept)
- [ ] **Rollout incrementally** - Update entity by entity
- [ ] **Verify consistency** - Check UI sama di semua tempat
- [ ] **Update documentation** - Document usage per entity

### Phase 9: Testing & Validation ✅

- [ ] **Manual testing** - Test create, edit, view di UI
- [ ] **Consistency test** - Edit component, verify propagation
- [ ] **Database verification** - Check data tersimpan dengan benar
- [ ] **Edge cases** - Test empty values, special characters, long text
- [ ] **No TypeScript errors** - Run error check

### Phase 10: Documentation ✅

- [ ] **Create helper doc** - `00-helper-[name].md`
- [ ] **Document props** - Semua props dengan contoh
- [ ] **Usage examples** - Minimal 2 contoh (page + modal)
- [ ] **Database schema** - Document kolom-kolom baru
- [ ] **Migration notes** - How to apply migrations

---

## Pattern: Frontend Component

### Component Structure Template

```tsx
/**
 * [Helper Name] Form Component
 *
 * [Brief description of what this helper does]
 *
 * Usage:
 * ```tsx
 * <[Name]Form
 *   value={data}
 *   onChange={setData}
 *   required={true}
 *   showTitle={true}
 * />
 * ```
 */

import { useState, useEffect } from "react";

// 1. EXPORT VALUE INTERFACE (Critical for type safety)
export interface [Name]Value {
  field1?: string;
  field2?: string;
  // ... all fields with optional (?) for partial support
}

// 2. PROPS INTERFACE (Standard props untuk semua helpers)
interface [Name]FormProps {
  value?: Partial<[Name]Value>;        // Input value
  onChange?: (value: [Name]Value) => void;  // Change callback
  disabled?: boolean;                  // Disable all inputs
  required?: boolean;                  // Mark fields required
  showTitle?: boolean;                 // Show/hide section title
}

// 3. COMPONENT DEFINITION
export function [Name]Form({
  value,
  onChange,
  disabled = false,
  required = false,
  showTitle = true,  // Default TRUE untuk standalone usage
}: [Name]FormProps) {
  
  // 4. LOCAL STATE (one per field)
  const [field1, setField1] = useState<string>(value?.field1 || "");
  const [field2, setField2] = useState<string>(value?.field2 || "");

  // 5. SYNC EXTERNAL VALUE TO STATE
  useEffect(() => {
    if (value) {
      setField1(value.field1 || "");
      setField2(value.field2 || "");
    }
  }, [value]);

  // 6. CHANGE HANDLER (notify parent on any change)
  const handleChange = (field: keyof [Name]Value, newValue: string) => {
    const updatedValue: [Name]Value = {
      field1,
      field2,
      [field]: newValue,
    };
    
    // Update local state
    if (field === "field1") setField1(newValue);
    if (field === "field2") setField2(newValue);
    
    // Notify parent
    onChange?.(updatedValue);
  };

  // 7. RETURN JSX WITH WRAPPER
  return (
    <div className="form-section">
      {showTitle && (
        <h3 className="form-section-title">[Section Title]</h3>
      )}
      
      <div className="form-group">
        <label className="form-label">
          Field 1 {required && <span className="text-danger-500">*</span>}
        </label>
        <input
          type="text"
          className="form-input"
          value={field1}
          onChange={(e) => handleChange("field1", e.target.value)}
          disabled={disabled}
          required={required}
          placeholder="Contoh placeholder"
        />
      </div>
      
      {/* More fields... */}
    </div>
  );
}
```

### Key Points:

✅ **Export interface** - Harus export [Name]Value untuk type safety  
✅ **Standard props** - value, onChange, disabled, required, showTitle  
✅ **showTitle default true** - Untuk standalone usage  
✅ **form-section wrapper** - Consistent styling  
✅ **Conditional title** - Only show if showTitle={true}  
✅ **Local state sync** - useEffect untuk sync external value  
✅ **Change notification** - Call onChange pada setiap perubahan  

---

## Pattern: Backend Helper

### Helper Functions Template

```typescript
/**
 * Backend Helper Functions for [Name]
 * 
 * Provides:
 * - Data normalization
 * - Legacy field support
 * - Sanitization
 */

export interface [Name]Data {
  field1?: string;
  field2?: string;
}

/**
 * Normalize [name] data
 * - Transforms to standard format
 * - Handles legacy fields
 * - Sanitizes input
 */
export function normalize[Name]Data(data: any): [Name]Data {
  const normalized: [Name]Data = {};

  // Field 1: normalization logic
  if (data.field1) {
    normalized.field1 = data.field1.trim().toLowerCase();
  }
  // Support legacy field names
  if (data.legacy_field1 && !normalized.field1) {
    normalized.field1 = data.legacy_field1.trim().toLowerCase();
  }

  // Field 2: normalization logic
  if (data.field2) {
    normalized.field2 = data.field2.trim();
  }

  return normalized;
}

/**
 * Map normalized data to database column names
 */
export function mapTo[Name]Columns(data: [Name]Data) {
  return {
    field_1: data.field1 || null,  // snake_case for DB
    field_2: data.field2 || null,
  };
}
```

### Key Points:

✅ **normalize function** - Main transformation function  
✅ **Legacy support** - Handle old field names gracefully  
✅ **Sanitization** - trim(), toLowerCase(), etc  
✅ **snake_case mapper** - Convert to DB column names  
✅ **null fallback** - Use null instead of undefined  

---

## Pattern: Database Schema

### Migration Template

```sql
-- Migration: Add [helper] fields to [entity] table
-- Created: [DATE]
-- Purpose: Standardize [helper] fields across entities

-- Add new columns
ALTER TABLE [entity_table] 
  ADD COLUMN IF NOT EXISTS field_1 TEXT,
  ADD COLUMN IF NOT EXISTS field_2 TEXT;

-- Add column comments
COMMENT ON COLUMN [entity_table].field_1 IS 'Description of field 1';
COMMENT ON COLUMN [entity_table].field_2 IS 'Description of field 2';

-- Migrate legacy data (if applicable)
UPDATE [entity_table] 
SET field_1 = legacy_column 
WHERE field_1 IS NULL AND legacy_column IS NOT NULL;

-- Create index if needed for frequent queries
CREATE INDEX IF NOT EXISTS idx_[entity]_field_1 ON [entity_table](field_1);
```

### Naming Convention:

✅ **snake_case** - field_name, not fieldName  
✅ **Descriptive names** - whatsapp_number not wa  
✅ **Consistent prefix** - organization_phone, organization_email  
✅ **TEXT type** - Use TEXT for strings (not VARCHAR)  
✅ **Nullable by default** - Allow NULL untuk backward compatibility  

### Example Pattern:

```
Contact Helper:
- email: TEXT
- phone: TEXT
- whatsapp_number: TEXT
- website: TEXT

Address Helper:
- detail_address: TEXT
- province_code: TEXT
- regency_code: TEXT
- district_code: TEXT
- village_code: TEXT
- postal_code: TEXT
```

---

## Pattern: Implementasi di Entities

### 1. Modal Context (showTitle={false})

```tsx
import [Name]Form, { type [Name]Value } from "@/components/forms/[Name]Form";
import { normalize[Name]Data } from "@/lib/[name]-helpers";

export function EntityModal({ entity, onSuccess }) {
  const [formData, setFormData] = useState({ name: "", ... });
  const [[name]Data, set[Name]Data] = useState<[Name]Value>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalized = normalize[Name]Data([name]Data);
    
    const payload = {
      ...formData,
      ...normalized,  // Merge normalized data
    };
    
    mutation.mutate(payload);
  };

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3 className="form-section-title">Section Title</h3>
          {/* Regular form fields */}
        </div>
        
        {/* Helper component WITHOUT title (inside existing section) */}
        <[Name]Form
          value={[name]Data}
          onChange={set[Name]Data}
          disabled={isViewMode}
          required={false}
          showTitle={false}  // ← NO TITLE dalam modal
        />
      </form>
    </div>
  );
}
```

### 2. Page Context (showTitle={true} or default)

```tsx
import [Name]Form, { type [Name]Value } from "@/components/forms/[Name]Form";
import { normalize[Name]Data } from "@/lib/[name]-helpers";

export default function EntityPage() {
  const [formData, setFormData] = useState({ name: "", ... });
  const [[name]Data, set[Name]Data] = useState<[Name]Value>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalized = normalize[Name]Data([name]Data);
    
    const payload = {
      ...formData,
      ...normalized,
    };
    
    mutation.mutate(payload);
  };

  return (
    <div className="page">
      <form onSubmit={handleSubmit}>
        {/* Regular fields */}
        
        {/* Helper component WITH title (standalone) */}
        <[Name]Form
          value={[name]Data}
          onChange={set[Name]Data}
          required={true}
          // showTitle default TRUE, no need to specify
        />
      </form>
    </div>
  );
}
```

### Key Differences:

| Context | showTitle | Use Case |
|---------|-----------|----------|
| **Modal** | `false` | Inside existing form-section with title |
| **Page** | `true` (default) | Standalone form section |
| **Settings** | `true` | Top-level configuration |

---

## Testing & Verification

### Checklist Testing Manual

#### 1. Component Consistency Test
```
[ ] Buat perubahan di helper component (misal: tambah emoji di label)
[ ] Refresh semua pages yang menggunakan helper
[ ] Verify: Perubahan muncul di SEMUA implementasi
[ ] Revert perubahan test
```

#### 2. Data Flow Test
```
[ ] Create: Input data di form → Submit → Verify di database
[ ] Read: Reload page → Verify data ter-load dengan benar
[ ] Update: Edit data → Submit → Verify perubahan tersimpan
[ ] Delete: Hapus record → Verify terhapus
```

#### 3. Validation Test
```
[ ] Empty values: Submit form kosong → Should handle gracefully
[ ] Invalid format: Input format salah → Should normalize or show error
[ ] Long text: Input text panjang → Should not break UI
[ ] Special characters: Input emoji, unicode → Should handle correctly
```

#### 4. UI Consistency Test
```
Entity 1 (e.g., Donatur): [ ] Title visible [ ] Fields sama [ ] Layout sama
Entity 2 (e.g., Vendor):   [ ] Title visible [ ] Fields sama [ ] Layout sama
Entity 3 (e.g., Employee): [ ] Title visible [ ] Fields sama [ ] Layout sama
```

#### 5. TypeScript Errors Check
```bash
# Check specific files
npx tsc --noEmit
# Should show 0 errors
```

---

## Common Pitfalls

### ❌ DON'T

1. **Hardcode field values di component**
   ```tsx
   // BAD: Hardcode field di parent
   <input value={email} onChange={...} />
   <input value={phone} onChange={...} />
   ```
   ✅ **DO**: Use helper component
   ```tsx
   <ContactForm value={contactData} onChange={setContactData} />
   ```

2. **Forget to normalize before submit**
   ```tsx
   // BAD: Submit raw data
   mutation.mutate({ ...formData, ...contactData });
   ```
   ✅ **DO**: Normalize first
   ```tsx
   const normalized = normalizeContactData(contactData);
   mutation.mutate({ ...formData, ...normalized });
   ```

3. **Mix state dengan parent form**
   ```tsx
   // BAD: Helper fields mixed in parent state
   const [formData, setFormData] = useState({ 
     name: "", 
     email: "", 
     phone: "" 
   });
   ```
   ✅ **DO**: Separate helper state
   ```tsx
   const [formData, setFormData] = useState({ name: "" });
   const [contactData, setContactData] = useState<ContactValue>({});
   ```

4. **Spread operator untuk required fields**
   ```tsx
   // BAD: Spread may lose required fields
   const payload = { ...otherData, ...normalized };
   ```
   ✅ **DO**: Explicit field mapping
   ```tsx
   const payload = {
     name: formData.name,
     email: normalized.email || null,
     phone: normalized.phone || null,
   };
   ```

5. **Inconsistent showTitle usage**
   ```tsx
   // BAD: Some use true, some false arbitrarily
   <ContactForm showTitle={false} />  // in page
   <ContactForm showTitle={true} />   // in modal
   ```
   ✅ **DO**: Follow pattern: false for modals, true for pages
   ```tsx
   <ContactForm showTitle={false} />  // in modal
   <ContactForm />  // in page (default true)
   ```

6. **Forget to export interface**
   ```tsx
   // BAD: Interface not exported
   interface ContactValue { ... }
   export function ContactForm() { ... }
   ```
   ✅ **DO**: Export untuk type safety
   ```tsx
   export interface ContactValue { ... }
   export function ContactForm() { ... }
   ```

7. **No wrapper di component**
   ```tsx
   // BAD: No wrapper
   export function ContactForm() {
     return (
       <>
         <input ... />
         <input ... />
       </>
     );
   }
   ```
   ✅ **DO**: Use form-section wrapper
   ```tsx
   export function ContactForm() {
     return (
       <div className="form-section">
         {showTitle && <h3>Title</h3>}
         <input ... />
       </div>
     );
   }
   ```

---

## Reference Examples

### Example 1: ContactForm (Complete Implementation)

**Files:**
- Component: `apps/admin/src/components/forms/ContactForm.tsx`
- Frontend Helper: `apps/admin/src/lib/contact-helpers.ts`
- Backend Helper: `apps/api/src/lib/contact-helpers.ts`
- Migrations: `packages/db/migrations/022-025_*.sql`
- Documentation: `00-helper-kontak.md`

**Key Features:**
- ✅ Email, phone, WhatsApp, website fields
- ✅ "Same as phone" checkbox untuk auto-sync WhatsApp
- ✅ Phone normalization (08xxx format)
- ✅ Email lowercase
- ✅ Website https:// prefix
- ✅ Used in: Donatur, Vendor, Employee, Mustahiq, Settings

**Usage:**
```tsx
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { normalizeContactData } from "@/lib/contact-helpers";

const [contactData, setContactData] = useState<ContactValue>({});

<ContactForm 
  value={contactData} 
  onChange={setContactData} 
  required={true}
  showTitle={false}  // in modal context
/>

// On submit
const normalized = normalizeContactData(contactData);
```

### Example 2: AddressForm (Complete Implementation)

**Files:**
- Component: `apps/admin/src/components/forms/AddressForm.tsx`
- Hooks: `apps/admin/src/lib/hooks/use-indonesia-address.ts`
- Documentation: `00-helper-address-system.md`

**Key Features:**
- ✅ Indonesia cascading selection: Province → Regency → District → Village
- ✅ 83,762 villages in database
- ✅ Auto-fill postal code from village selection
- ✅ Detail address textarea
- ✅ Proper reset on parent selection change
- ✅ Used in: Donatur, Vendor, Employee, Mustahiq, Settings

**Usage:**
```tsx
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";

const [addressData, setAddressData] = useState<Partial<AddressValue>>({});

<AddressForm 
  value={addressData} 
  onChange={setAddressData}
  disabled={false}
  required={true}
  // showTitle default true for page context
/>

// On submit - no normalization needed, data already structured
const payload = {
  ...otherData,
  ...addressData,
};
```

---

## Quick Start: New Helper Checklist

### Pre-Implementation
- [ ] Name defined: `[Name]Form.tsx`
- [ ] Fields identified: List all fields
- [ ] Database columns planned: snake_case names
- [ ] Target entities listed: Where will this be used?

### Implementation (Follow order!)
1. [ ] Create component: `components/forms/[Name]Form.tsx`
2. [ ] Create frontend helper: `lib/[name]-helpers.ts`
3. [ ] Create backend helper: `apps/api/src/lib/[name]-helpers.ts`
4. [ ] Create migrations: One per entity
5. [ ] Update API routes: Import and use normalize function
6. [ ] Test in ONE entity first
7. [ ] Roll out to other entities
8. [ ] Verify consistency across all
9. [ ] Create documentation: `00-helper-[name].md`
10. [ ] Update this SOP if needed

### Post-Implementation
- [ ] All entities using helper: Verified ✅
- [ ] No manual fields left: Verified ✅
- [ ] TypeScript: 0 errors
- [ ] Database: All migrations applied
- [ ] Documentation: Complete and updated

---

## Appendix: Standard Props Reference

### Required Props (All Helpers Must Have)

```typescript
interface StandardHelperProps {
  value?: Partial<ValueType>;           // Current value (partial for flexibility)
  onChange?: (value: ValueType) => void; // Change callback
  disabled?: boolean;                    // Disable all inputs (default: false)
  required?: boolean;                    // Mark fields as required (default: false)
  showTitle?: boolean;                   // Show section title (default: true)
}
```

### Optional Props (Add as Needed)

```typescript
interface OptionalHelperProps {
  className?: string;                    // Custom CSS class
  onValidate?: (errors: string[]) => void; // Validation callback
  placeholder?: Record<string, string>;  // Custom placeholders
  labels?: Record<string, string>;       // Custom labels
}
```

---

## Version History

- **v1.0** - 2026-01-24: Initial SOP based on ContactForm and AddressForm implementation
- Document standardisasi untuk semua future helpers
- Includes comprehensive examples and patterns

---

## Notes

> **Remember**: "Edit sekali, update di mana-mana"

Jika Anda harus copy-paste code yang sama ke banyak tempat, **stop** dan buat helper component!

Helper component adalah investasi yang akan menghemat waktu maintenance dan menjamin konsistensi UI/UX di seluruh aplikasi.

**Questions?** Refer to:
- `00-helper-kontak.md` - ContactForm example
- `00-helper-address-system.md` - AddressForm example
- This SOP - General guidelines

---

**Happy Helper Building! 🚀**
