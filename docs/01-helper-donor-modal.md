# Helper DonorModal

## Konsep Utama

**DonorModal** adalah komponen helper reusable untuk mengelola data donatur di seluruh aplikasi. Sama seperti BankAccountForm dan AddressForm, komponen ini memastikan konsistensi UI dan proses CRUD di semua modul.

### Keuntungan Helper:
1. **UI Konsisten** - Tampilan sama di semua tempat
2. **Edit Sekali, Berubah Semua** - Ubah di satu tempat, semua yang pakai otomatis update
3. **Proses CRUD Standar** - Create, Read, Update menggunakan pattern yang sama
4. **Terintegrasi dengan Helper Lain** - Pakai ContactForm, AddressForm, BankAccountForm
5. **Ringan & Mudah** - Cukup import dan pakai, tidak perlu setup berulang

---

## Struktur Database

### Tabel: `donatur`

```sql
CREATE TABLE donatur (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text,
  name text NOT NULL,
  phone text,
  whatsapp_number text,
  website text,

  -- Address (Indonesia Address System)
  detail_address text,
  province_code text REFERENCES indonesia_provinces(code),
  regency_code text REFERENCES indonesia_regencies(code),
  district_code text REFERENCES indonesia_districts(code),
  village_code text REFERENCES indonesia_villages(code),

  avatar text,

  -- Stats
  total_donations bigint DEFAULT 0 NOT NULL,
  total_amount bigint DEFAULT 0 NOT NULL,

  -- Verification
  email_verified_at timestamp(3),
  phone_verified_at timestamp(3),

  -- Status
  is_active boolean DEFAULT true NOT NULL,
  is_anonymous boolean DEFAULT false NOT NULL,

  -- Timestamps
  last_login_at timestamp(3),
  created_at timestamp(3) DEFAULT NOW() NOT NULL,
  updated_at timestamp(3) DEFAULT NOW() NOT NULL
);
```

**Bank Accounts**: Menggunakan tabel `entity_bank_accounts` dengan `entity_type = 'donatur'`

---

## Implementasi Lengkap

### Step 1: Component Helper (SUDAH SELESAI)

**File**: `apps/admin/src/components/modals/DonorModal.tsx`

**Props**:
```typescript
interface DonorModalProps {
  isOpen: boolean;           // Modal visibility
  onClose: () => void;       // Close handler
  onSuccess: () => void;     // Success callback (invalidate queries)
  donatur?: Donatur | null;  // Data untuk edit mode
  isViewMode?: boolean;      // View-only mode
}
```

**Type Definition**:
```typescript
type Donatur = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;

  // Address
  detailAddress?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;

  // Bank accounts
  bankAccounts?: BankAccountValue[];

  isActive: boolean;
  createdAt: string;
};
```

**Fitur**:
- ✅ Form create/edit donatur
- ✅ Menggunakan ContactForm helper
- ✅ Menggunakan AddressForm helper
- ✅ Menggunakan BankAccountForm helper
- ✅ Password optional (untuk login donatur)
- ✅ Validation
- ✅ Success/error handling

---

### Step 2: API Backend (SUDAH SELESAI)

**File**: `apps/api/src/routes/admin/donatur.ts`

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

const createDonaturSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  // ... other fields
  bankAccounts: z.array(bankAccountSchema).optional(),
  password: z.string().min(8).optional(),
});
```

**GET List** - Fetch bank accounts untuk semua donatur:
```typescript
// Fetch bank accounts for all donatur
const donaturIds = rawData.map((d) => d.id);
const bankAccountsList = await db
  .select()
  .from(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "donatur"),
      or(...donaturIds.map((id) => eq(entityBankAccounts.entityId, id)))
    )
  );

// Group and attach
const bankAccountsMap = new Map();
bankAccountsList.forEach((account) => {
  const existing = bankAccountsMap.get(account.entityId) || [];
  bankAccountsMap.set(account.entityId, [...existing, account]);
});

const donaturWithBankAccounts = rawData.map((d) => ({
  ...d,
  bankAccounts: bankAccountsMap.get(d.id) || [],
}));
```

**POST** - Create donatur + bank accounts:
```typescript
const { bankAccounts, postalCode, ...donaturData } = normalizedBody;

// Insert donatur
await db.insert(donatur).values(insertData);

// Insert bank accounts
if (bankAccounts && bankAccounts.length > 0) {
  const bankAccountsToInsert = bankAccounts.map((account) => ({
    entityType: "donatur",
    entityId: donaturId,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountHolderName: account.accountHolderName,
  }));

  await db.insert(entityBankAccounts).values(bankAccountsToInsert);
}
```

**PUT** - Update donatur + bank accounts:
```typescript
// Update donatur
await db.update(donatur).set(updateData).where(eq(donatur.id, id));

// Replace bank accounts (delete old, insert new)
if (bankAccounts !== undefined) {
  await db
    .delete(entityBankAccounts)
    .where(
      and(
        eq(entityBankAccounts.entityType, "donatur"),
        eq(entityBankAccounts.entityId, id)
      )
    );

  if (bankAccounts.length > 0) {
    await db.insert(entityBankAccounts).values(bankAccountsToInsert);
  }
}
```

**DELETE** - Delete donatur + bank accounts:
```typescript
// Delete bank accounts first
await db
  .delete(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "donatur"),
      eq(entityBankAccounts.entityId, id)
    )
  );

// Then delete donatur
await db.delete(donatur).where(eq(donatur.id, id));
```

---

### Step 3: Page Implementation (SUDAH SELESAI)

**File**: `apps/admin/src/app/dashboard/donatur/page.tsx`

**Import**:
```typescript
import DonorModal from "@/components/modals/DonorModal";
```

**State Management**:
```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingDonatur, setEditingDonatur] = useState<Donatur | null>(null);

const openCreateModal = () => {
  setEditingDonatur(null);
  setIsModalOpen(true);
};

const openEditModal = (donatur: Donatur) => {
  setEditingDonatur(donatur);
  setIsModalOpen(true);
};

const handleSuccess = () => {
  toast.success(editingDonatur ? "Donatur berhasil diperbarui!" : "Donatur berhasil dibuat!");
  queryClient.invalidateQueries({ queryKey: ["donatur"] });
  closeModal();
};
```

**Render Modal**:
```tsx
<DonorModal
  isOpen={isModalOpen}
  onClose={closeModal}
  onSuccess={handleSuccess}
  donatur={editingDonatur}
/>
```

---

## Cara Pakai di Module Lain

### Contoh: Implementasi di Campaign Detail

**Import**:
```typescript
import DonorModal from "@/components/modals/DonorModal";
```

**State**:
```typescript
const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
const [selectedDonor, setSelectedDonor] = useState<Donatur | null>(null);
```

**Handler**:
```typescript
const openDonorModal = (donor?: Donatur) => {
  setSelectedDonor(donor || null);
  setIsDonorModalOpen(true);
};

const handleDonorSuccess = () => {
  queryClient.invalidateQueries({ queryKey: ["donors"] });
  setIsDonorModalOpen(false);
};
```

**Render**:
```tsx
<button onClick={() => openDonorModal()}>
  Tambah Donatur Baru
</button>

<DonorModal
  isOpen={isDonorModalOpen}
  onClose={() => setIsDonorModalOpen(false)}
  onSuccess={handleDonorSuccess}
  donatur={selectedDonor}
/>
```

---

## Pattern Konsisten

### Backend Pattern:
```typescript
// Always use:
entityType: "donatur"
entityId: donatur.id

// Always fetch with:
and(
  eq(entityBankAccounts.entityType, "donatur"),
  eq(entityBankAccounts.entityId, id)
)
```

### Frontend Pattern:
```typescript
// Import modal
import DonorModal from "@/components/modals/DonorModal";

// State
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingDonor, setEditingDonor] = useState<Donatur | null>(null);

// Open for create
setEditingDonor(null);
setIsModalOpen(true);

// Open for edit
setEditingDonor(donor);
setIsModalOpen(true);

// Success callback
const handleSuccess = () => {
  queryClient.invalidateQueries({ queryKey: ["donatur"] });
  setIsModalOpen(false);
};

// Render
<DonorModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSuccess={handleSuccess}
  donatur={editingDonor}
/>
```

---

## Checklist Implementasi

- [x] Buat DonorModal component
- [x] Update API donatur dengan bank accounts support
- [x] Update page donatur untuk pakai DonorModal
- [x] Test create donatur
- [x] Test edit donatur
- [x] Test bank accounts management
- [x] Buat migration files (placeholder)

---

## Kesimpulan

✅ **Sudah Selesai**:
1. DonorModal component dibuat
2. API donatur sudah support bank accounts
3. Page donatur sudah pakai DonorModal
4. Migration files sudah disiapkan

🎯 **Siap Digunakan di Module Lain**:
- Tinggal import DonorModal
- Setup state dan handlers
- Render modal
- Done!

📝 **Keuntungan**:
1. UI konsisten di semua tempat
2. Edit satu file, semua berubah
3. Bank accounts terintegrasi
4. Address system terintegrasi
5. Contact form terintegrasi
