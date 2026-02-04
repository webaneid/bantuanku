# Contoh Penggunaan Vendor Modal

## Example 1: Purchase Order Form - Supplier Selection

```typescript
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import VendorModal from "@/components/modals/VendorModal";
import api from "@/lib/api";

export default function PurchaseOrderForm() {
  const queryClient = useQueryClient();
  
  // State untuk vendor selection
  const [vendorId, setVendorId] = useState("");
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // Fetch vendors (filter by type: supplier)
  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ["vendors-suppliers"],
    queryFn: async () => {
      const response = await api.get("/admin/vendors?status=active&type=supplier");
      return response.data;
    },
  });

  // Create options untuk autocomplete
  const vendorOptions = (vendorsData?.data || []).map((vendor: any) => ({
    value: vendor.id,
    label: `${vendor.name}${vendor.category ? ` - ${vendor.category}` : ""}`,
  }));

  // Handler untuk vendor selection
  const handleVendorSelect = (vendorId: string) => {
    setVendorId(vendorId);
    
    // Auto-populate vendor info
    const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
    if (vendor) {
      // Populate form dengan vendor info
      console.log("Selected vendor:", vendor);
      
      // Example: populate address
      const fullAddress = [
        vendor.detailAddress,
        vendor.villageName,
        vendor.districtName,
        vendor.regencyName,
        vendor.provinceName,
      ].filter(Boolean).join(", ");
      
      // You can set form values here
      // setValue("vendorAddress", fullAddress);
      // setValue("vendorPhone", vendor.phone || "");
      // setValue("vendorEmail", vendor.email || "");
    }
  };

  // Handler untuk success create vendor
  const handleVendorModalSuccess = (createdId?: string) => {
    // 1. Invalidate query untuk refresh vendors list
    queryClient.invalidateQueries({ queryKey: ["vendors-suppliers"] });
    
    // 2. Close modal
    setIsVendorModalOpen(false);
    
    // 3. Auto-select vendor yang baru dibuat
    if (createdId) {
      setVendorId(createdId);
      
      // 4. Tunggu 500ms untuk refetch selesai, lalu auto-populate
      setTimeout(() => {
        handleVendorSelect(createdId);
      }, 500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Purchase Order</h1>
      
      <form className="space-y-6">
        {/* Vendor Selection */}
        <div className="form-field">
          <label className="form-label">
            Supplier <span className="text-danger-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Autocomplete
                options={vendorOptions}
                value={vendorId}
                onChange={handleVendorSelect}
                placeholder="Pilih supplier..."
                disabled={isLoading}
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

        {/* Other form fields... */}
        
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary">
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            Simpan
          </button>
        </div>
      </form>

      {/* Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSuccess={handleVendorModalSuccess}
      />
    </div>
  );
}
```

## Example 2: Payment Form - Auto-populate Bank Account

```typescript
"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import VendorModal from "@/components/modals/VendorModal";
import api from "@/lib/api";

export default function PaymentForm() {
  const queryClient = useQueryClient();
  
  const [vendorId, setVendorId] = useState("");
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  
  // Payment form fields
  const [paymentData, setPaymentData] = useState({
    recipientBankName: "",
    recipientAccountNumber: "",
    recipientAccountName: "",
  });

  // Fetch all active vendors
  const { data: vendorsData } = useQuery({
    queryKey: ["vendors-active"],
    queryFn: async () => {
      const response = await api.get("/admin/vendors?status=active");
      return response.data;
    },
  });

  const vendorOptions = (vendorsData?.data || []).map((vendor: any) => ({
    value: vendor.id,
    label: `${vendor.name} - ${vendor.type}`,
  }));

  // Handler untuk auto-populate bank account
  const handleVendorSelect = (vendorId: string) => {
    setVendorId(vendorId);
    
    const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
    if (vendor) {
      // Auto-populate bank account dari vendor (ambil yang pertama)
      if (vendor.bankAccounts && vendor.bankAccounts.length > 0) {
        const primaryBank = vendor.bankAccounts[0];
        setPaymentData({
          recipientBankName: primaryBank.bankName,
          recipientAccountNumber: primaryBank.accountNumber,
          recipientAccountName: primaryBank.accountHolderName,
        });
      } else {
        // Clear jika tidak ada bank account
        setPaymentData({
          recipientBankName: "",
          recipientAccountNumber: "",
          recipientAccountName: "",
        });
      }
    }
  };

  const handleVendorModalSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["vendors-active"] });
    setIsVendorModalOpen(false);
    
    if (createdId) {
      setVendorId(createdId);
      setTimeout(() => {
        handleVendorSelect(createdId);
      }, 500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Payment to Vendor</h1>
      
      <form className="space-y-6">
        {/* Vendor Selection */}
        <div className="form-field">
          <label className="form-label">
            Vendor <span className="text-danger-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Autocomplete
                options={vendorOptions}
                value={vendorId}
                onChange={handleVendorSelect}
                placeholder="Pilih vendor..."
                required
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

        {/* Bank Account Info - Auto-populated */}
        <div className="form-section">
          <h3 className="form-section-title">Informasi Rekening Penerima</h3>
          
          <div className="form-group">
            <label className="form-label">Nama Bank</label>
            <input
              type="text"
              className="form-input"
              value={paymentData.recipientBankName}
              onChange={(e) => setPaymentData({
                ...paymentData,
                recipientBankName: e.target.value
              })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Rekening</label>
            <input
              type="text"
              className="form-input"
              value={paymentData.recipientAccountNumber}
              onChange={(e) => setPaymentData({
                ...paymentData,
                recipientAccountNumber: e.target.value
              })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nama Pemilik Rekening</label>
            <input
              type="text"
              className="form-input"
              value={paymentData.recipientAccountName}
              onChange={(e) => setPaymentData({
                ...paymentData,
                recipientAccountName: e.target.value
              })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary">
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            Proses Payment
          </button>
        </div>
      </form>

      {/* Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSuccess={handleVendorModalSuccess}
      />
    </div>
  );
}
```

## Example 3: Service Contract - Filter by Type

```typescript
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import VendorModal from "@/components/modals/VendorModal";
import api from "@/lib/api";

export default function ServiceContractForm() {
  const queryClient = useQueryClient();
  
  const [serviceProviderId, setServiceProviderId] = useState("");
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // Fetch vendors - filter by type: service_provider
  const { data: serviceProvidersData } = useQuery({
    queryKey: ["vendors-service-providers"],
    queryFn: async () => {
      const response = await api.get(
        "/admin/vendors?status=active&type=service_provider"
      );
      return response.data;
    },
  });

  const serviceProviderOptions = (serviceProvidersData?.data || []).map(
    (vendor: any) => ({
      value: vendor.id,
      label: `${vendor.name}${vendor.category ? ` - ${vendor.category}` : ""}`,
    })
  );

  const handleServiceProviderSelect = (vendorId: string) => {
    setServiceProviderId(vendorId);
    
    const vendor = serviceProvidersData?.data.find((v: any) => v.id === vendorId);
    if (vendor) {
      // Auto-populate contact info
      console.log("Service Provider:", vendor);
      // You can populate form fields here
    }
  };

  const handleVendorModalSuccess = (createdId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["vendors-service-providers"] });
    setIsVendorModalOpen(false);
    
    if (createdId) {
      setServiceProviderId(createdId);
      setTimeout(() => {
        handleServiceProviderSelect(createdId);
      }, 500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Service Contract</h1>
      
      <form className="space-y-6">
        <div className="form-field">
          <label className="form-label">
            Service Provider <span className="text-danger-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Autocomplete
                options={serviceProviderOptions}
                value={serviceProviderId}
                onChange={handleServiceProviderSelect}
                placeholder="Pilih service provider..."
                required
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setIsVendorModalOpen(true)}
            >
              <PlusIcon className="w-5 h-5" />
              Tambah Service Provider
            </button>
          </div>
        </div>

        {/* Contract fields... */}
        
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary">
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            Buat Kontrak
          </button>
        </div>
      </form>

      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSuccess={handleVendorModalSuccess}
      />
    </div>
  );
}
```

## Key Patterns

### 1. Auto-Select Pattern
```typescript
const handleVendorModalSuccess = (createdId?: string) => {
  // Invalidate query
  queryClient.invalidateQueries({ queryKey: ["vendors-..."] });
  
  // Close modal
  setIsVendorModalOpen(false);
  
  // Auto-select
  if (createdId) {
    setVendorId(createdId);
    setTimeout(() => handleVendorSelect(createdId), 500);
  }
};
```

### 2. Filter by Type
```typescript
// Suppliers only
const { data } = useQuery({
  queryKey: ["vendors-suppliers"],
  queryFn: async () => {
    const response = await api.get("/admin/vendors?status=active&type=supplier");
    return response.data;
  },
});

// Service providers only
const { data } = useQuery({
  queryKey: ["vendors-service-providers"],
  queryFn: async () => {
    const response = await api.get("/admin/vendors?status=active&type=service_provider");
    return response.data;
  },
});
```

### 3. Auto-Populate Bank Account
```typescript
const handleVendorSelect = (vendorId: string) => {
  const vendor = vendorsData?.data.find((v: any) => v.id === vendorId);
  if (vendor?.bankAccounts?.[0]) {
    const bank = vendor.bankAccounts[0];
    setPaymentData({
      recipientBankName: bank.bankName,
      recipientAccountNumber: bank.accountNumber,
      recipientAccountName: bank.accountHolderName,
    });
  }
};
```

### 4. Auto-Populate Address
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

## Testing Checklist

- [ ] Create vendor via modal
- [ ] Verify vendor appears in dropdown immediately
- [ ] Verify vendor is auto-selected after create
- [ ] Verify bank account auto-populates
- [ ] Verify address auto-populates
- [ ] Verify contact info auto-populates
- [ ] Test with different vendor types (supplier, contractor, etc)
- [ ] Test edit existing vendor
- [ ] Test view mode
- [ ] Verify all helper components work (Contact, Address, Bank)
