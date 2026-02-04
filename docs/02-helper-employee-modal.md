# Helper EmployeeModal

## Overview

**EmployeeModal** adalah komponen helper reusable untuk mengelola data employee dengan UI yang konsisten di seluruh aplikasi. Komponen ini menggunakan helper-helper lain (ContactForm, AddressForm, BankAccountForm) untuk memastikan data terstruktur dengan baik.

## Tujuan

1. **UI Konsisten** - Tampilan sama di semua modul yang butuh employee management
2. **Edit Sekali, Berubah Semua** - Ubah di satu tempat, semua yang pakai otomatis update
3. **Data Terstruktur** - Menggunakan helper kontak, alamat, dan rekening bank
4. **Reusable** - Bisa dipakai di mana saja (ledger, payroll, HR, dll)

---

## Struktur Helper

### File Location

```
apps/admin/src/components/modals/EmployeeModal.tsx
```

### Dependencies

```typescript
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import { normalizeContactData } from "@/lib/contact-helpers";
```

---

## Sections dalam Modal

### 1. Informasi Dasar
- **Nama Lengkap** (required)
- **Posisi** (required)

### 2. Informasi Kontak
- Email, Phone, WhatsApp, Website (dari `ContactForm`)
- Alamat Indonesia lengkap (dari `AddressForm`)

### 3. Informasi Rekening Bank
- Multiple bank accounts (dari `BankAccountForm`)

---

## Props Interface

```typescript
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdId?: string) => void;
  employee?: Employee | null;
  isViewMode?: boolean;
}
```

### Props Detail

- `isOpen`: Boolean untuk show/hide modal
- `onClose`: Callback saat modal ditutup
- `onSuccess`: Callback saat create/update berhasil, menerima `createdId` untuk auto-select
- `employee`: Data employee untuk edit mode (null untuk create mode)
- `isViewMode`: Boolean untuk view-only mode (default: false)

---

## Type Definition

```typescript
type Employee = {
  id: string;
  name: string;
  position: string; // Required
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  website?: string;

  // Address - Indonesia Address System
  detailAddress?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  villageName?: string;
  villagePostalCode?: string | null;

  // Bank accounts - new system
  bankAccounts?: BankAccountValue[];

  isActive: boolean;
  createdAt: string;
};
```

---

## Cara Pakai

### 1. Import Component

```typescript
import EmployeeModal from "@/components/modals/EmployeeModal";
```

### 2. State Management

```typescript
const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
```

### 3. Handler untuk Success

```typescript
const handleEmployeeModalSuccess = (createdId?: string) => {
  setIsEmployeeModalOpen(false);
  queryClient.invalidateQueries({ queryKey: ["employees"] });

  // Optional: Auto-select created employee
  if (createdId) {
    setSelectedEmployeeId(createdId);
  }
};
```

### 4. Render Modal

```tsx
<EmployeeModal
  isOpen={isEmployeeModalOpen}
  onClose={() => setIsEmployeeModalOpen(false)}
  onSuccess={handleEmployeeModalSuccess}
  employee={editingEmployee}
/>
```

### 5. Open Modal untuk Create

```typescript
const openCreateModal = () => {
  setEditingEmployee(null);
  setIsEmployeeModalOpen(true);
};
```

### 6. Open Modal untuk Edit

```typescript
const openEditModal = (employee: Employee) => {
  setEditingEmployee(employee);
  setIsEmployeeModalOpen(true);
};
```

---

## Implementasi di Ledger Create Page

### Scenario: Auto-fill recipient dari employee

```typescript
// Handle employee selection
const handleEmployeeChange = (value: string) => {
  const selectedEmployee = employees.find((e: any) => e.id === value);
  if (selectedEmployee) {
    // Get first bank account if exists
    const firstBankAccount = selectedEmployee.bankAccounts?.[0];

    setFormData({
      ...formData,
      employeeId: value,
      recipientName: selectedEmployee.name,
      recipientBank: firstBankAccount?.bankName || "",
      recipientAccount: firstBankAccount?.accountNumber || "",
      recipientPhone: selectedEmployee.phone || "",
    });
  }
};

// Handle modal success - auto select created employee
const handleEmployeeModalSuccess = (createdId?: string) => {
  setIsEmployeeModalOpen(false);
  refetchEmployees();
  if (createdId) {
    setFormData({ ...formData, employeeId: createdId });
    // Auto-select after refetch
    setTimeout(() => {
      handleEmployeeChange(createdId);
    }, 500);
  }
};
```

---

## API Endpoint Requirements

### GET /admin/employees

Return employee list dengan bank accounts:

```typescript
const employeeList = await db
  .select({
    id: employees.id,
    name: employees.name,
    email: employees.email,
    phone: employees.phone,
    whatsappNumber: employees.whatsappNumber,
    website: employees.website,
    detailAddress: employees.detailAddress,
    provinceCode: employees.provinceCode,
    // ... other address fields
  })
  .from(employees);

// Fetch bank accounts
const bankAccountsList = await db
  .select()
  .from(entityBankAccounts)
  .where(
    and(
      eq(entityBankAccounts.entityType, "employee"),
      or(...employeeIds.map((id) => eq(entityBankAccounts.entityId, id)))
    )
  );

// Attach bank accounts to employees
const employeeListWithBankAccounts = employeeList.map((employee) => ({
  ...employee,
  bankAccounts: bankAccountsMap.get(employee.id) || [],
}));
```

### POST /admin/employees

```typescript
const { bankAccounts, postalCode, ...data } = normalizedBody;

// Insert employee
await db.insert(employees).values(cleanData);

// Insert bank accounts
if (bankAccounts && bankAccounts.length > 0) {
  const bankAccountsToInsert = bankAccounts.map((account: any) => ({
    entityType: "employee",
    entityId: newEmployee.id,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountHolderName: account.accountHolderName,
  }));

  await db.insert(entityBankAccounts).values(bankAccountsToInsert);
}
```

### PUT /admin/employees/:id

```typescript
// Update employee
await db.update(employees).set(cleanData).where(eq(employees.id, id));

// Replace bank accounts (delete + insert)
if (bankAccounts !== undefined) {
  await db
    .delete(entityBankAccounts)
    .where(
      and(
        eq(entityBankAccounts.entityType, "employee"),
        eq(entityBankAccounts.entityId, id)
      )
    );

  if (bankAccounts.length > 0) {
    const bankAccountsToInsert = bankAccounts.map((account: any) => ({
      entityType: "employee",
      entityId: id,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
    }));

    await db.insert(entityBankAccounts).values(bankAccountsToInsert);
  }
}
```

---

## Pattern yang Digunakan

### 1. useMemo untuk Initial Data

```typescript
const addressData = useMemo<Partial<AddressValue>>(() => {
  if (employee) {
    return {
      detailAddress: employee.detailAddress || "",
      provinceCode: employee.provinceCode || "",
      regencyCode: employee.regencyCode || "",
      districtCode: employee.districtCode || "",
      villageCode: employee.villageCode || "",
      postalCode: employee.villagePostalCode || null,
    };
  }
  return {};
}, [employee]);
```

**Kenapa useMemo?**
- Data langsung available saat render pertama
- Tidak ada delay seperti useState + useEffect
- Form langsung terisi saat edit mode

### 2. useState untuk Track Changes

```typescript
const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});
const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);
```

**Kenapa terpisah?**
- `addressData` = initial value dari props
- `addressFormData` = perubahan dari user
- Saat submit, kirim `addressFormData` (bukan `addressData`)

### 3. Normalize Contact Data

```typescript
const normalizedContact = normalizeContactData(contactData);

const payload = {
  ...formData,
  ...normalizedContact, // Email lowercase, phone 08xxx format, dll
  ...addressFormData,
  bankAccounts: bankAccountsFormData,
};
```

---

## Checklist Implementasi

### Backend
- [ ] API employees sudah support contact fields (email, phone, whatsapp, website)
- [ ] API employees sudah support address fields (detail_address, province_code, dll)
- [ ] API employees sudah support bank accounts (dari entity_bank_accounts)
- [ ] GET endpoint return bankAccounts array
- [ ] POST endpoint insert bank accounts
- [ ] PUT endpoint replace bank accounts

### Frontend
- [ ] Import EmployeeModal component
- [ ] Add state untuk isOpen dan editingEmployee
- [ ] Implement handleSuccess callback
- [ ] Render modal dengan props yang benar
- [ ] Test create employee
- [ ] Test edit employee
- [ ] Test view employee (isViewMode)

### Integration (Ledger Create)
- [ ] Update handleEmployeeChange untuk ambil dari bankAccounts
- [ ] Update handleEmployeeModalSuccess untuk auto-select
- [ ] Test create employee dari ledger page
- [ ] Test auto-fill recipient data

---

## Comparison dengan DonorModal

| Feature | DonorModal | EmployeeModal |
|---------|-----------|---------------|
| Informasi Dasar | Nama | Nama + Posisi |
| Contact Helper | ✅ | ✅ |
| Address Helper | ✅ | ✅ |
| Bank Account Helper | ✅ | ✅ |
| Password Field | ✅ (conditional) | ❌ |
| Auto-select on Create | ✅ | ✅ |
| View Mode | ✅ | ✅ |

---

## Best Practices

1. **Always use helper components** - Jangan buat form manual
2. **Follow useMemo pattern** - Untuk initial data dari props
3. **Normalize before submit** - Gunakan helper normalization
4. **Return createdId** - Untuk auto-select setelah create
5. **Test all modes** - Create, edit, view

---

## Troubleshooting

### Form kosong saat edit

**Cause**: Menggunakan useState untuk initial data

**Solution**: Gunakan useMemo

```typescript
// ❌ Wrong
const [addressData, setAddressData] = useState({});

// ✅ Correct
const addressData = useMemo(() => {
  if (employee) return { ... };
  return {};
}, [employee]);
```

### Bank account tidak tersimpan

**Cause**: Lupa include bankAccounts di payload

**Solution**: Pastikan merge bankAccountsFormData

```typescript
const payload = {
  ...formData,
  bankAccounts: bankAccountsFormData, // Don't forget!
};
```

### Auto-select tidak work

**Cause**: Data belum ter-refetch saat handleEmployeeChange dipanggil

**Solution**: Tambah setTimeout

```typescript
if (createdId) {
  setFormData({ ...formData, employeeId: createdId });
  setTimeout(() => {
    handleEmployeeChange(createdId);
  }, 500); // Wait for refetch
}
```

---

## Summary

✅ **EmployeeModal** adalah helper minimal untuk employee management
✅ Required fields: Nama + Posisi
✅ Menggunakan 3 helper: ContactForm, AddressForm, BankAccountForm
✅ UI konsisten dengan DonorModal
✅ Reusable di semua modul yang butuh employee input
✅ Support create, edit, dan view mode
✅ Auto-select setelah create (via createdId callback)

**Next Steps**: Implementasikan di module lain yang butuh employee management (payroll, HR, attendance, dll)
