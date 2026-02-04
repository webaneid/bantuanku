# Helper: Employee Modal

## Overview
EmployeeModal adalah komponen reusable untuk membuat/mengedit data employee dengan UI yang konsisten di seluruh aplikasi.

## Lokasi File
```
apps/admin/src/components/modals/EmployeeModal.tsx
```

## Minimal Informasi yang Wajib Ada

### 1. Informasi Dasar (Required)
- **Nama Lengkap** (name) - Required
- **Posisi** (position) - Required

### 2. Informasi Kontak (Opsional)
Menggunakan `ContactForm` helper:
- Email
- Nomor Telepon
- WhatsApp
- Website

### 3. Alamat Lengkap (Opsional)
Menggunakan `AddressForm` helper:
- Detail Alamat
- Provinsi
- Kabupaten/Kota
- Kecamatan
- Kelurahan/Desa

### 4. Informasi Rekening Bank (Opsional)
Menggunakan `BankAccountForm` helper:
- Nama Bank
- Nomor Rekening
- Nama Pemilik Rekening
- Support multiple bank accounts

## Struktur Component

```typescript
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdId?: string) => void;
  employee?: Employee;
  viewMode?: boolean;
}

type Employee = {
  id: string;
  name: string;
  position: string; // Required
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  website?: string;
  // Address fields
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

## Cara Implementasi

### 1. Import Component
```typescript
import EmployeeModal from "@/components/modals/EmployeeModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
```

### 2. Setup State
```typescript
const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
const queryClient = useQueryClient();
```

### 3. Fetch Employees Data
```typescript
const { data: employeesData } = useQuery({
  queryKey: ["employees-active"],
  queryFn: async () => {
    const response = await api.get("/admin/employees?status=active");
    return response.data;
  },
});
```

### 4. Create Autocomplete Options
```typescript
const employeeOptions = (employeesData?.data || []).map((emp: any) => ({
  value: emp.id,
  label: `${emp.name} - ${emp.position || ""}`,
}));
```

### 5. Handler untuk Auto-Select setelah Create
```typescript
const handleEmployeeModalSuccess = (createdId?: string) => {
  queryClient.invalidateQueries({ queryKey: ["employees-active"] });
  setIsEmployeeModalOpen(false);
  if (createdId) {
    setSelectedEmployeeId(createdId);
    // Optional: Auto-populate form fields
    setTimeout(() => {
      handleEmployeeSelect(createdId);
    }, 500);
  }
};
```

### 6. UI Implementation dengan Autocomplete
```tsx
<div className="form-field">
  <label className="form-label">Employee</label>
  <div className="flex gap-2">
    <div className="flex-1">
      <Autocomplete
        options={employeeOptions}
        value={selectedEmployeeId}
        onChange={(value) => setSelectedEmployeeId(value)}
        placeholder="Pilih employee..."
      />
    </div>
    <button
      type="button"
      className="btn btn-secondary btn-md"
      onClick={() => setIsEmployeeModalOpen(true)}
    >
      <PlusIcon className="w-5 h-5" />
      Tambah Employee
    </button>
  </div>
</div>

{/* Employee Modal */}
<EmployeeModal
  isOpen={isEmployeeModalOpen}
  onClose={() => setIsEmployeeModalOpen(false)}
  onSuccess={handleEmployeeModalSuccess}
/>
```

## Contoh Implementasi Lengkap

### Case 1: Campaign Form - Coordinator Selection
**File**: `apps/admin/src/components/CampaignForm.tsx`

```typescript
// 1. State management
const [coordinatorId, setCoordinatorId] = useState(initialData?.coordinatorId || "");
const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
const queryClient = useQueryClient();

// 2. Fetch employees
const { data: employeesData } = useQuery({
  queryKey: ["employees-active"],
  queryFn: async () => {
    const response = await api.get("/admin/employees?status=active");
    return response.data;
  },
});

// 3. Create options
const employeeOptions = (employeesData?.data || []).map((emp: any) => ({
  value: emp.id,
  label: `${emp.name} - ${emp.position || ""}`,
}));

// 4. Handler
const handleCoordinatorChange = (value: string) => {
  setCoordinatorId(value);
  setValue("coordinatorId", value || null);
};

const handleEmployeeModalSuccess = (createdId?: string) => {
  queryClient.invalidateQueries({ queryKey: ["employees-active"] });
  setIsEmployeeModalOpen(false);
  if (createdId) {
    setCoordinatorId(createdId);
    setValue("coordinatorId", createdId);
  }
};

// 5. UI
<div className="form-field">
  <label className="form-label">Penanggung Jawab Program (Opsional)</label>
  <div className="flex gap-2">
    <div className="flex-1">
      <Autocomplete
        options={employeeOptions}
        value={coordinatorId}
        onChange={handleCoordinatorChange}
        placeholder="Pilih penanggung jawab program..."
      />
    </div>
    <button
      type="button"
      className="btn btn-secondary btn-md"
      onClick={() => setIsEmployeeModalOpen(true)}
    >
      <PlusIcon className="w-5 h-5" />
      Tambah Employee
    </button>
  </div>
  <input type="hidden" {...register("coordinatorId")} />
</div>

<EmployeeModal
  isOpen={isEmployeeModalOpen}
  onClose={() => setIsEmployeeModalOpen(false)}
  onSuccess={handleEmployeeModalSuccess}
/>
```

### Case 2: Ledger Create - Employee Recipient dengan Auto-Populate
**File**: `apps/admin/src/app/dashboard/ledger/create/page.tsx`

```typescript
// 1. State
const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

// 2. Handler dengan auto-populate bank account
const handleEmployeeChange = (value: string) => {
  const selectedEmployee = employees.find((e: any) => e.id === value);
  if (selectedEmployee) {
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

const handleEmployeeModalSuccess = (createdId?: string) => {
  setIsEmployeeModalOpen(false);
  refetchEmployees();
  if (createdId) {
    setFormData({ ...formData, employeeId: createdId });
    setTimeout(() => {
      handleEmployeeChange(createdId);
    }, 500);
  }
};
```

### Case 3: Zakat Distribution - Coordinator Selection
**File**: `apps/admin/src/app/dashboard/zakat/distributions/new/page.tsx`

```typescript
const handleEmployeeSelect = (employeeId: string) => {
  const selected = employees?.find((e: any) => e.id === employeeId);
  if (selected) {
    const firstBankAccount = selected.bankAccounts?.[0];
    setFormData({
      ...formData,
      coordinatorName: selected.name,
      coordinatorPhone: selected.phone || "",
      coordinatorBank: firstBankAccount?.bankName || "",
      coordinatorAccount: firstBankAccount?.accountNumber || "",
    });
  }
};

const handleEmployeeModalSuccess = (createdId?: string) => {
  queryClient.invalidateQueries({ queryKey: ["employees-active"] });
  setIsEmployeeModalOpen(false);
  if (createdId) {
    setSelectedEmployeeId(createdId);
    setTimeout(() => {
      handleEmployeeSelect(createdId);
    }, 500);
  }
};
```

## API Endpoint

### GET /admin/employees
```typescript
// Query params:
- status: "active" | "inactive"
- search: string
- page: number
- limit: number

// Response:
{
  success: true,
  data: [
    {
      id: "...",
      name: "John Doe",
      position: "Manager",
      email: "john@example.com",
      phone: "081234567890",
      whatsappNumber: "081234567890",
      website: "https://example.com",
      detailAddress: "Jl. Example No. 123",
      provinceCode: "31",
      regencyCode: "3171",
      districtCode: "317101",
      villageCode: "3171011001",
      bankAccounts: [
        {
          bankName: "BCA",
          accountNumber: "1234567890",
          accountHolderName: "John Doe"
        }
      ],
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /admin/employees
```typescript
// Body:
{
  name: string; // Required
  position: string; // Required
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  detailAddress?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  bankAccounts?: Array<{
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  }>;
}

// Response:
{
  success: true,
  data: { id: "newly-created-id" },
  message: "Employee created"
}
```

## Validasi

### Required Fields
- Nama Lengkap wajib diisi
- Posisi wajib diisi

### Validasi di Modal
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.name || !formData.position) {
    alert("Nama dan posisi wajib diisi");
    return;
  }
  // Process data...
};
```

## Pattern Auto-Select

Untuk memberikan UX yang baik, gunakan pattern auto-select setelah create:

```typescript
const handleEmployeeModalSuccess = (createdId?: string) => {
  // 1. Invalidate queries untuk refresh data
  queryClient.invalidateQueries({ queryKey: ["employees-active"] });

  // 2. Close modal
  setIsEmployeeModalOpen(false);

  // 3. Auto-select yang baru dibuat
  if (createdId) {
    setSelectedEmployeeId(createdId);

    // 4. Tunggu 500ms untuk API refetch selesai
    setTimeout(() => {
      handleEmployeeSelect(createdId);
    }, 500);
  }
};
```

## UI Components & Styling

### CSS Classes yang Digunakan

#### Form Layout
```tsx
<div className="form-field">
  {/* Field content */}
</div>
```

#### Labels
```tsx
<label className="form-label">
  Nama Field <span className="text-danger-500">*</span>
</label>
```

#### Input Fields
```tsx
<input
  type="text"
  className="form-input"
  placeholder="Contoh placeholder"
/>
```

#### Button Styles
```tsx
{/* Primary Button */}
<button className="btn btn-primary btn-lg">
  Simpan
</button>

{/* Secondary Button */}
<button className="btn btn-secondary btn-md">
  <PlusIcon className="w-5 h-5" />
  Tambah Employee
</button>

{/* Link Button */}
<button className="btn btn-link btn-sm text-danger-600">
  Batal
</button>
```

#### Autocomplete dengan Button
```tsx
<div className="flex gap-2">
  <div className="flex-1">
    <Autocomplete
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Pilih..."
    />
  </div>
  <button
    type="button"
    className="btn btn-secondary btn-md"
    onClick={() => setModalOpen(true)}
  >
    <PlusIcon className="w-5 h-5" />
    Tambah Employee
  </button>
</div>
```

#### Helper Text
```tsx
<p className="text-xs text-gray-500 mt-1">
  Teks bantuan untuk field ini
</p>
```

### Standard UI Pattern untuk Employee Selection

#### Pattern 1: Basic Selection (Tanpa Auto-Populate)
Digunakan untuk: Campaign coordinator, simple selection

```tsx
<div className="form-field">
  <label className="form-label">Penanggung Jawab Program (Opsional)</label>
  <div className="flex gap-2">
    <div className="flex-1">
      <Autocomplete
        options={employeeOptions}
        value={coordinatorId}
        onChange={handleCoordinatorChange}
        placeholder="Pilih penanggung jawab program..."
      />
    </div>
    <button
      type="button"
      className="btn btn-secondary btn-md"
      onClick={() => setIsEmployeeModalOpen(true)}
    >
      <PlusIcon className="w-5 h-5" />
      Tambah Employee
    </button>
  </div>
  <input type="hidden" {...register("coordinatorId")} />
  <p className="text-xs text-gray-500 mt-1">
    Tentukan karyawan yang bertanggung jawab untuk program ini
  </p>
</div>
```

#### Pattern 2: Selection dengan Auto-Populate Recipient Info
Digunakan untuk: Ledger, disbursement, form yang membutuhkan recipient details

```tsx
<div className="form-field">
  <label className="form-label">
    Pilih Employee <span className="text-danger-500">*</span>
  </label>
  <div className="flex gap-2">
    <div className="flex-1">
      <Autocomplete
        options={employeeOptions}
        value={formData.employeeId}
        onChange={handleEmployeeChange}
        placeholder="Pilih employee..."
      />
    </div>
    <button
      type="button"
      className="btn btn-secondary btn-md"
      onClick={() => setIsEmployeeModalOpen(true)}
    >
      <PlusIcon className="w-5 h-5" />
      Tambah Employee
    </button>
  </div>
</div>

{/* Auto-populated fields */}
<div className="form-field">
  <label className="form-label">Nama Penerima</label>
  <input
    type="text"
    className="form-input"
    value={formData.recipientName}
    readOnly
  />
</div>

<div className="form-field">
  <label className="form-label">Nomor Telepon</label>
  <input
    type="text"
    className="form-input"
    value={formData.recipientPhone}
    readOnly
  />
</div>

<div className="grid grid-cols-2 gap-4">
  <div className="form-field">
    <label className="form-label">Bank</label>
    <input
      type="text"
      className="form-input"
      value={formData.recipientBank}
      readOnly
    />
  </div>
  <div className="form-field">
    <label className="form-label">Nomor Rekening</label>
    <input
      type="text"
      className="form-input"
      value={formData.recipientAccount}
      readOnly
    />
  </div>
</div>
```

### Modal Structure

EmployeeModal menggunakan struktur modal standard:

```tsx
{isOpen && (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
      {/* Modal Header */}
      <div className="modal-header">
        <h2 className="modal-title">
          {viewMode ? "Detail Employee" : employee ? "Edit Employee" : "Tambah Employee"}
        </h2>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="modal-body">
        <form onSubmit={handleSubmit}>
          {/* Form sections */}
        </form>
      </div>

      {/* Modal Footer */}
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={onClose}
        >
          {viewMode ? "Tutup" : "Batal"}
        </button>
        {!viewMode && (
          <button
            type="submit"
            form="employee-form"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : employee ? "Update" : "Simpan"}
          </button>
        )}
      </div>
    </div>
  </div>
)}
```

### Form Sections di Modal

```tsx
{/* Section 1: Informasi Dasar */}
<div className="form-section">
  <h3 className="form-section-title">Informasi Dasar</h3>
  <div className="form-section-content">
    {/* Fields */}
  </div>
</div>

{/* Section 2: Informasi Kontak */}
<div className="form-section">
  <h3 className="form-section-title">Informasi Kontak</h3>
  <div className="form-section-content">
    <ContactForm
      data={contactData}
      onChange={setContactData}
      disabled={viewMode}
    />
    <AddressForm
      data={addressFormData}
      onChange={setAddressFormData}
      disabled={viewMode}
    />
  </div>
</div>

{/* Section 3: Informasi Rekening Bank */}
<div className="form-section">
  <h3 className="form-section-title">Informasi Rekening Bank</h3>
  <div className="form-section-content">
    <BankAccountForm
      value={bankAccountsFormData}
      onChange={setBankAccountsFormData}
      disabled={viewMode}
    />
  </div>
</div>
```

### CSS/SCSS File Location

Styling untuk modal dan form menggunakan global styles yang sudah ada:

```
apps/admin/src/app/globals.css
```

Class yang digunakan:
- `.modal-overlay` - Background overlay hitam transparan
- `.modal-container` - Container putih dengan shadow
- `.modal-header` - Header modal dengan title dan close button
- `.modal-body` - Body modal dengan scrolling
- `.modal-footer` - Footer modal dengan action buttons
- `.form-section` - Section grouping dalam form
- `.form-section-title` - Title untuk section
- `.form-section-content` - Content area section
- `.form-field` - Wrapper untuk field
- `.form-label` - Label field
- `.form-input` - Input field standard
- `.btn` - Base button class
- `.btn-primary` - Primary button (biru)
- `.btn-secondary` - Secondary button (abu-abu)
- `.btn-link` - Link style button
- `.btn-sm`, `.btn-md`, `.btn-lg` - Button sizes

### Icon Usage

Menggunakan Heroicons v2 outline:

```typescript
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Dalam button
<PlusIcon className="w-5 h-5" />

// Dalam modal close
<XMarkIcon className="w-6 h-6" />
```

### Grid Layout untuk Multiple Fields

```tsx
{/* 2 Columns */}
<div className="grid grid-cols-2 gap-4">
  <div className="form-field">{/* Field 1 */}</div>
  <div className="form-field">{/* Field 2 */}</div>
</div>

{/* 3 Columns */}
<div className="grid grid-cols-3 gap-4">
  <div className="form-field">{/* Field 1 */}</div>
  <div className="form-field">{/* Field 2 */}</div>
  <div className="form-field">{/* Field 3 */}</div>
</div>
```

## Best Practices

1. **Minimal Fields**: Hanya name dan position yang required, sisanya opsional
2. **Auto-Select**: Selalu implementasikan auto-select setelah create untuk UX yang baik
3. **Query Invalidation**: Jangan lupa invalidate query setelah create/update
4. **Timeout**: Gunakan setTimeout 500ms untuk menunggu refetch selesai
5. **Bank Account**: Ambil first bank account untuk auto-populate recipient info
6. **View Mode**: Support view mode dengan prop `viewMode={true}`
7. **Consistent UI**: Gunakan Autocomplete + Button dengan PlusIcon
8. **Position Display**: Tampilkan position di label autocomplete untuk clarity

## Troubleshooting

### Employee tidak muncul di dropdown setelah create
- Pastikan `queryClient.invalidateQueries` dipanggil
- Pastikan query key sama: `["employees-active"]`
- Cek apakah API endpoint mengembalikan employee yang baru dibuat

### Auto-select tidak bekerja
- Pastikan `createdId` dikirim dari modal via `onSuccess` callback
- Pastikan `setTimeout` digunakan untuk menunggu refetch
- Cek apakah handler selection dipanggil setelah state update

### Bank account tidak ter-populate
- Pastikan API mengembalikan `bankAccounts` array
- Pastikan mengambil index [0] untuk first bank account
- Cek field mapping: `bankName`, `accountNumber`, `accountHolderName`

## Related Documentation
- [Helper Kontak](./00-helper-kontak.md)
- [Helper Alamat](./00-helper-alamat.md)
- [Helper Rekening](./00-helper-rekening.md)
- [Helper Donor Modal](./01-helper-donor-modal.md)
- [SOP Autocomplete](../apps/admin/docs/SOP-autocomplete.md)
