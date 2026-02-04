# Helper: Vendor Modal

## Overview
VendorModal adalah komponen reusable untuk membuat/mengedit data vendor dengan UI yang konsisten di seluruh aplikasi.

## Lokasi File
```
apps/admin/src/components/modals/VendorModal.tsx
```

## Minimal Informasi yang Wajib Ada

### 1. Informasi Dasar (Required)
- **Nama Vendor** (name) - Required
- **Tipe Vendor** (type) - Required (supplier, contractor, service_provider, consultant)
- **Kategori** (category) - Opsional
- **Nama Kontak Person** (contactPerson) - Opsional

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

### 5. Informasi Legal (Opsional)
- **NPWP** (taxId) - Nomor Pokok Wajib Pajak
- **NIB/Izin Usaha** (businessLicense) - Nomor Induk Berusaha
- **Catatan** (notes) - Catatan tambahan

### 6. Status
- **Aktif** (isActive) - Default: true

## Struktur Component

```typescript
interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdId?: string) => void;
  vendor?: Vendor;
  isViewMode?: boolean;
}

type Vendor = {
  id: string;
  name: string;
  type: string; // Required: supplier, contractor, service_provider, consultant
  category?: string;
  contactPerson?: string;
  
  // Contact fields
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
  
  // Legal
  taxId?: string;
  businessLicense?: string;
  
  // Other
  isActive: boolean;
  notes?: string;
  createdAt: string;
};
```

## Cara Implementasi

### 1. Import Component
```typescript
import VendorModal from "@/components/modals/VendorModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
```

### 2. Setup State
```typescript
const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
const [selectedVendorId, setSelectedVendorId] = useState("");
const queryClient = useQueryClient();
```

### 3. Fetch Vendors Data
```typescript
const { data: vendorsData } = useQuery({
  queryKey: ["vendors-active"],
  queryFn: async () => {
    const response = await api.get("/admin/vendors?status=active");
    return response.data;
  },
});
```

### 4. Create Autocomplete Options
```typescript
const vendorOptions = (vendorsData?.data || []).map((vendor: any) => ({
  value: vendor.id,
  label: `${vendor.name} - ${vendor.type || ""}`,
}));
```

### 5. Handler untuk Auto-Select setelah Create
```typescript
const handleVendorModalSuccess = (createdId?: string) => {
  queryClient.invalidateQueries({ queryKey: ["vendors-active"] });
  setIsVendorModalOpen(false);
  if (createdId) {
    setSelectedVendorId(createdId);
    // Optional: Auto-populate form fields
    setTimeout(() => {
      handleVendorSelect(createdId);
    }, 500);
  }
};
```

### 6. UI Implementation dengan Autocomplete
```tsx
<div className="form-field">
  <label className="form-label">Vendor</label>
  <div className="flex gap-2">
    <div className="flex-1">
      <Autocomplete
        options={vendorOptions}
        value={selectedVendorId}
        onChange={(value) => setSelectedVendorId(value)}
        placeholder="Pilih vendor..."
      />
    </div>
    <button
      type="button"
      className="btn btn-secondary btn-md"
      onClick={() => setIsVendorModalOpen(true)}
    >
      <PlusIcon className="w-5 h-5" />
      Tambah Vendor
    </button>
  </div>
</div>

{/* Vendor Modal */}
<VendorModal
  isOpen={isVendorModalOpen}
  onClose={() => setIsVendorModalOpen(false)}
  onSuccess={handleVendorModalSuccess}
/>
```

## Contoh Implementasi Lengkap

### Case 1: Purchase Order Form - Vendor Selection
**File**: `apps/admin/src/app/dashboard/purchasing/purchase-orders/page.tsx`

```typescript
// 1. State management
const [vendorId, setVendorId] = useState(initialData?.vendorId || "");
const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
const queryClient = useQueryClient();

// 2. Fetch vendors
const { data: vendorsData } = useQuery({
  queryKey: ["vendors-active"],
  queryFn: async () => {
    const response = await api.get("/admin/vendors?status=active&type=supplier");
    return response.data;
  },
});

// 3. Create options
const vendorOptions = (vendorsData?.data || []).map((vendor: any) => ({
  value: vendor.id,
  label: `${vendor.name} - ${vendor.type || ""}`,
}));

// 4. Handler
const handleVendorChange = (value: string) => {
  setVendorId(value);
  setValue("vendorId", value || null);
  
  // Auto-populate vendor info
  const vendor = vendorsData?.data.find((v: any) => v.id === value);
  if (vendor) {
    setValue("vendorName", vendor.name);
    setValue("vendorAddress", vendor.detailAddress || "");
    setValue("vendorPhone", vendor.phone || "");
  }
};

const handleVendorModalSuccess = (createdId?: string) => {
  queryClient.invalidateQueries({ queryKey: ["vendors-active"] });
  setIsVendorModalOpen(false);
  if (createdId) {
    setVendorId(createdId);
    setValue("vendorId", createdId);
    
    // Wait for refetch then auto-populate
    setTimeout(() => {
      handleVendorChange(createdId);
    }, 500);
  }
};

// 5. UI
<div className="form-field">
  <label className="form-label">
    Supplier <span className="text-danger-500">*</span>
  </label>
  <div className="flex gap-2">
    <div className="flex-1">
      <Autocomplete
        options={vendorOptions}
        value={vendorId}
        onChange={handleVendorChange}
        placeholder="Pilih supplier..."
        required
      />
    </div>
    <button
      type="button"
      className="btn btn-secondary btn-md"
      onClick={() => setIsVendorModalOpen(true)}
    >
      <PlusIcon className="w-5 h-5" />
      Tambah Supplier
    </button>
  </div>
</div>

<VendorModal
  isOpen={isVendorModalOpen}
  onClose={() => setIsVendorModalOpen(false)}
  onSuccess={handleVendorModalSuccess}
/>
```

### Case 2: Service Contract Form - Service Provider Selection
**File**: `apps/admin/src/app/dashboard/contracts/service-contracts/page.tsx`

```typescript
// Filter by type: service_provider
const { data: serviceProvidersData } = useQuery({
  queryKey: ["vendors-service-providers"],
  queryFn: async () => {
    const response = await api.get("/admin/vendors?status=active&type=service_provider");
    return response.data;
  },
});

const serviceProviderOptions = (serviceProvidersData?.data || []).map((vendor: any) => ({
  value: vendor.id,
  label: `${vendor.name}${vendor.category ? ` - ${vendor.category}` : ""}`,
}));

// Auto-populate contract info from vendor
const handleServiceProviderSelect = (vendorId: string) => {
  const vendor = serviceProvidersData?.data.find((v: any) => v.id === vendorId);
  if (vendor) {
    // Populate bank account for payment
    if (vendor.bankAccounts && vendor.bankAccounts.length > 0) {
      const bankAccount = vendor.bankAccounts[0];
      setValue("recipientBankName", bankAccount.bankName);
      setValue("recipientAccountNumber", bankAccount.accountNumber);
      setValue("recipientAccountName", bankAccount.accountHolderName);
    }
    
    // Populate contact
    setValue("vendorContactPerson", vendor.contactPerson || "");
    setValue("vendorPhone", vendor.phone || "");
    setValue("vendorEmail", vendor.email || "");
  }
};
```

## API Endpoints

### GET /admin/vendors
```typescript
// Query Params:
?page=1
&limit=10
&search=nama%20vendor  // Search by name, contact person, or email
&type=supplier         // Filter: supplier, contractor, service_provider, consultant
&status=active         // Filter: active, inactive

// Response:
{
  success: true,
  data: [
    {
      id: "...",
      name: "PT. Contoh Vendor",
      type: "supplier",
      category: "Material Building",
      contactPerson: "John Doe",
      email: "vendor@example.com",
      phone: "081234567890",
      whatsappNumber: "081234567890",
      website: "https://vendor.com",
      detailAddress: "Jl. Vendor No. 123",
      provinceCode: "31",
      regencyCode: "3171",
      districtCode: "317101",
      villageCode: "3171011001",
      bankAccounts: [
        {
          bankName: "BCA",
          accountNumber: "1234567890",
          accountHolderName: "PT. Contoh Vendor"
        }
      ],
      taxId: "01.234.567.8-901.000",
      businessLicense: "1234567890123",
      isActive: true,
      notes: "Vendor terpercaya",
      createdAt: "2024-01-01T00:00:00Z"
    }
  ],
  pagination: {
    total: 50,
    page: 1,
    limit: 10,
    totalPages: 5
  }
}
```

### GET /admin/vendors/:id
```typescript
// Response:
{
  success: true,
  data: {
    id: "...",
    name: "PT. Contoh Vendor",
    type: "supplier",
    category: "Material Building",
    contactPerson: "John Doe",
    email: "vendor@example.com",
    phone: "081234567890",
    whatsappNumber: "081234567890",
    website: "https://vendor.com",
    detailAddress: "Jl. Vendor No. 123",
    provinceCode: "31",
    regencyCode: "3171",
    districtCode: "317101",
    villageCode: "3171011001",
    bankAccounts: [
      {
        id: "bank-account-id",
        bankName: "BCA",
        accountNumber: "1234567890",
        accountHolderName: "PT. Contoh Vendor"
      }
    ],
    taxId: "01.234.567.8-901.000",
    businessLicense: "1234567890123",
    isActive: true,
    notes: "Vendor terpercaya",
    createdAt: "2024-01-01T00:00:00Z"
  }
}
```

### POST /admin/vendors
```typescript
// Body:
{
  name: string; // Required
  type: string; // Required: supplier, contractor, service_provider, consultant
  category?: string;
  contactPerson?: string;
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
  taxId?: string;
  businessLicense?: string;
  notes?: string;
}

// Response:
{
  success: true,
  data: { id: "newly-created-id" },
  message: "Vendor created"
}
```

### PUT /admin/vendors/:id
```typescript
// Body: Same as POST
// Response:
{
  success: true,
  message: "Vendor updated"
}
```

### DELETE /admin/vendors/:id
```typescript
// Response:
{
  success: true,
  message: "Vendor deleted"
}
```

## Validasi

### Required Fields
- Nama vendor wajib diisi
- Tipe vendor wajib dipilih

### Validasi di Modal
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.name || !formData.type) {
    alert("Nama dan tipe vendor wajib diisi");
    return;
  }
  // Process data...
};
```

### Backend Validation (Zod Schema)
```typescript
const vendorSchema = z.object({
  name: z.string().min(1, "Nama vendor wajib diisi"),
  type: z.string().min(1, "Tipe vendor wajib dipilih"),
  category: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),
  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
  taxId: z.string().optional(),
  businessLicense: z.string().optional(),
  notes: z.string().optional(),
});
```

## Vendor Types

Tipe vendor yang tersedia:

```typescript
const vendorTypes = [
  { value: "supplier", label: "Supplier" },
  { value: "contractor", label: "Contractor" },
  { value: "service_provider", label: "Service Provider" },
  { value: "consultant", label: "Consultant" },
];
```

### Use Cases per Type:

| Type | Use Case | Contoh |
|------|----------|---------|
| **Supplier** | Pembelian barang/material | PT. Material Bangunan, Toko ATK |
| **Contractor** | Jasa konstruksi/renovasi | PT. Kontraktor Bangunan |
| **Service Provider** | Jasa layanan profesional | Jasa Cleaning, Security, IT Support |
| **Consultant** | Konsultasi profesional | Konsultan Hukum, Konsultan Pajak |

## Pattern Auto-Select

Untuk memberikan UX yang baik, gunakan pattern auto-select setelah create:

```typescript
const handleVendorModalSuccess = (createdId?: string) => {
  // 1. Invalidate queries untuk refresh data
  queryClient.invalidateQueries({ queryKey: ["vendors-active"] });

  // 2. Close modal
  setIsVendorModalOpen(false);

  // 3. Auto-select yang baru dibuat
  if (createdId) {
    setVendorId(createdId);

    // 4. Tunggu 500ms untuk API refetch selesai
    setTimeout(() => {
      handleVendorSelect(createdId);
    }, 500);
  }
};
```

## Auto-Populate Pattern

### 1. Basic Info Auto-Populate
```typescript
const handleVendorSelect = (vendorId: string) => {
  const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
  if (vendor) {
    setValue("vendorName", vendor.name);
    setValue("vendorType", vendor.type);
    setValue("contactPerson", vendor.contactPerson || "");
  }
};
```

### 2. Bank Account Auto-Populate (Payment Form)
```typescript
const handleVendorSelect = (vendorId: string) => {
  const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
  if (vendor && vendor.bankAccounts && vendor.bankAccounts.length > 0) {
    const primaryBank = vendor.bankAccounts[0]; // Ambil bank account pertama
    setValue("recipientBankName", primaryBank.bankName);
    setValue("recipientAccountNumber", primaryBank.accountNumber);
    setValue("recipientAccountName", primaryBank.accountHolderName);
  }
};
```

### 3. Contact Info Auto-Populate
```typescript
const handleVendorSelect = (vendorId: string) => {
  const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
  if (vendor) {
    setValue("vendorEmail", vendor.email || "");
    setValue("vendorPhone", vendor.phone || "");
    setValue("vendorWhatsapp", vendor.whatsappNumber || "");
  }
};
```

### 4. Address Auto-Populate
```typescript
const handleVendorSelect = (vendorId: string) => {
  const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
  if (vendor) {
    const fullAddress = [
      vendor.detailAddress,
      vendor.villageName,
      vendor.districtName,
      vendor.regencyName,
      vendor.provinceName,
      vendor.villagePostalCode,
    ].filter(Boolean).join(", ");
    
    setValue("vendorAddress", fullAddress);
  }
};
```

## Database Schema

### Table: vendors

```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- supplier, contractor, service_provider, consultant
  category TEXT,
  contact_person TEXT,
  
  -- Contact fields
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  website TEXT,
  
  -- Legacy address (deprecated)
  address TEXT,
  
  -- Indonesia Address System
  detail_address TEXT,
  province_code TEXT REFERENCES indonesia_provinces(code),
  regency_code TEXT REFERENCES indonesia_regencies(code),
  district_code TEXT REFERENCES indonesia_districts(code),
  village_code TEXT REFERENCES indonesia_villages(code),
  
  -- Legal
  tax_id TEXT, -- NPWP
  business_license TEXT, -- NIB
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bank accounts stored in entity_bank_accounts table
CREATE TABLE entity_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'vendor', 'employee', 'donatur', 'mustahiq'
  entity_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Component Internal Structure

### State Management
```typescript
// Form data untuk fields dasar
const [formData, setFormData] = useState({
  name: "",
  type: "",
  category: "",
  contactPerson: "",
  address: "", // Legacy
  taxId: "",
  businessLicense: "",
  isActive: true,
  notes: "",
});

// Contact data - managed by ContactForm
const [contactData, setContactData] = useState<ContactValue>({});

// Address data - computed from vendor prop
const addressData = useMemo<Partial<AddressValue>>(() => {
  if (vendor) {
    return {
      detailAddress: vendor.detailAddress || "",
      provinceCode: vendor.provinceCode || "",
      regencyCode: vendor.regencyCode || "",
      districtCode: vendor.districtCode || "",
      villageCode: vendor.villageCode || "",
      postalCode: vendor.villagePostalCode || null,
    };
  }
  return {};
}, [vendor]);

// Track user changes to address
const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});

// Bank accounts - computed from vendor prop
const bankAccountsData = useMemo<BankAccountValue[]>(() => {
  if (vendor && vendor.bankAccounts) {
    return vendor.bankAccounts;
  }
  return [];
}, [vendor]);

// Track user changes to bank accounts
const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);
```

### Submit Handler
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.name || !formData.type) {
    alert("Nama dan tipe vendor wajib diisi");
    return;
  }

  // Normalize contact data
  const normalizedContact = normalizeContactData(contactData);

  const payload = {
    ...formData,
    ...normalizedContact, // Merge normalized contact data
    ...addressFormData, // Merge address data dari form
    bankAccounts: bankAccountsFormData, // Merge bank accounts data
  };

  if (vendor) {
    updateMutation.mutate(payload);
  } else {
    createMutation.mutate(payload);
  }
};
```

### Modal Layout
```tsx
<div className="modal-overlay">
  <div className="modal-container">
    {/* Header */}
    <div className="modal-header">
      <h2>
        {isViewMode ? "Detail Vendor" : vendor ? "Edit Vendor" : "Tambah Vendor"}
      </h2>
      <button onClick={onClose}>
        <XMarkIcon className="w-6 h-6" />
      </button>
    </div>

    {/* Body */}
    <div className="modal-body">
      <form onSubmit={handleSubmit}>
        {/* Section 1: Informasi Dasar */}
        <div className="form-section">
          <h3 className="form-section-title">Informasi Dasar</h3>
          {/* name, type, category, contactPerson */}
        </div>

        {/* Section 2: Informasi Kontak & Alamat */}
        <div className="form-section">
          <h3 className="form-section-title">Informasi Kontak</h3>
          <ContactForm
            value={contactData}
            onChange={setContactData}
            disabled={isViewMode}
            required={false}
            showTitle={false}
          />
        </div>

        <AddressForm
          value={addressData}
          onChange={setAddressFormData}
          disabled={isViewMode}
          required={false}
        />

        {/* Section 3: Informasi Rekening Bank */}
        <div className="form-section">
          <h3 className="form-section-title">Informasi Rekening Bank</h3>
          <BankAccountForm
            value={bankAccountsData}
            onChange={setBankAccountsFormData}
            disabled={isViewMode}
          />
        </div>

        {/* Section 4: Informasi Legal */}
        <div className="form-section">
          <h3 className="form-section-title">Informasi Legal</h3>
          {/* taxId, businessLicense, notes */}
        </div>

        {/* Section 5: Status */}
        <div className="form-section">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              disabled={isViewMode}
            />
            <label htmlFor="isActive">Vendor Aktif</label>
          </div>
        </div>
      </form>
    </div>

    {/* Footer */}
    <div className="modal-footer">
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        {isViewMode ? "Tutup" : "Batal"}
      </button>
      {!isViewMode && (
        <button type="submit" className="btn btn-primary">
          {vendor ? "Update" : "Simpan"}
        </button>
      )}
    </div>
  </div>
</div>
```

## Best Practices

1. **Minimal Fields**: Hanya name dan type yang required, sisanya opsional
2. **Auto-Select**: Selalu implementasikan auto-select setelah create untuk UX yang baik
3. **Query Invalidation**: Jangan lupa invalidate query setelah create/update
4. **Timeout**: Gunakan setTimeout 500ms untuk menunggu refetch selesai
5. **Bank Account**: Ambil first bank account untuk auto-populate payment info
6. **View Mode**: Support view mode dengan prop `isViewMode={true}`
7. **Consistent UI**: Gunakan Autocomplete + Button dengan PlusIcon
8. **Type Display**: Tampilkan type/category di label autocomplete untuk clarity
9. **Filter by Type**: Gunakan query params `?type=supplier` untuk filter spesifik
10. **NPWP Format**: Validasi format NPWP jika diperlukan: XX.XXX.XXX.X-XXX.XXX

## Troubleshooting

### Vendor tidak muncul di dropdown setelah create
- Pastikan `queryClient.invalidateQueries` dipanggil
- Pastikan query key sama: `["vendors-active"]`
- Cek apakah API endpoint mengembalikan vendor yang baru dibuat

### Auto-select tidak bekerja
- Pastikan `createdId` dikirim dari modal via `onSuccess` callback
- Pastikan `setTimeout` digunakan untuk menunggu refetch
- Cek apakah handler selection dipanggil setelah state update

### Bank account tidak ter-populate
- Pastikan API mengembalikan `bankAccounts` array
- Pastikan mengambil index [0] untuk first bank account
- Cek field mapping: `bankName`, `accountNumber`, `accountHolderName`

### Type filter tidak bekerja
- Cek query params: `?type=supplier`
- Pastikan backend mendukung type filter
- Verify enum values: supplier, contractor, service_provider, consultant

### Contact data tidak tersimpan
- Pastikan normalizeContactData dipanggil sebelum submit
- Cek backend API menerima whatsappNumber (bukan whatsapp)
- Verify migration 023 sudah dijalankan

## Related Documentation
- [Helper Kontak](./00-helper-kontak.md)
- [Helper Alamat](./00-helper-alamat.md)
- [Helper Rekening](./00-helper-rekening.md)
- [Helper Employee Modal](./00-helper-employees.md)
- [SOP Helper Components](../00-helper-SOP.md)
- [SOP Autocomplete](../apps/admin/docs/SOP-autocomplete.md)

## Version History
- **v1.0** - 2026-01-25: Initial documentation
  - Contact system integration (migration 023)
  - Address system integration
  - Bank account system integration
  - Support untuk vendor types: supplier, contractor, service_provider, consultant
