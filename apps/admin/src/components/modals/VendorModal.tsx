"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import { normalizeContactData } from "@/lib/contact-helpers";
import FeedbackDialog from "@/components/FeedbackDialog";

type Vendor = {
  id: string;
  name: string;
  type: string;
  category?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  address?: string; // Legacy

  // Address - Indonesia Address System
  detailAddress?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  provinceName?: string; // From JOIN
  regencyName?: string; // From JOIN
  districtName?: string; // From JOIN
  villageName?: string; // From JOIN
  villagePostalCode?: string | null; // From JOIN

  // Bank accounts - new system
  bankAccounts?: BankAccountValue[];

  // Legacy bank fields - will be deprecated
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;

  taxId?: string;
  businessLicense?: string;
  isActive: boolean;
  notes?: string;
};

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdId?: string) => void;
  vendor?: Vendor | null;
  isViewMode?: boolean;
}

export default function VendorModal({
  isOpen,
  onClose,
  onSuccess,
  vendor,
  isViewMode = false,
}: VendorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    category: "",
    contactPerson: "",
    address: "",
    taxId: "",
    businessLicense: "",
    isActive: true,
    notes: "",
  });

  // Contact data state
  const [contactData, setContactData] = useState<ContactValue>({});

  // Compute address data directly from vendor prop (no state needed)
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

  // State untuk track perubahan dari user
  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});

  // Compute bank accounts data directly from vendor prop (no state needed)
  const bankAccountsData = useMemo<BankAccountValue[]>(() => {
    if (vendor && vendor.bankAccounts) {
      return vendor.bankAccounts;
    }
    return [];
  }, [vendor]);

  // State untuk track perubahan bank accounts dari user
  const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
    next?: () => void;
  }>({ open: false, type: "success", title: "" });

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || "",
        type: vendor.type || "",
        category: vendor.category || "",
        contactPerson: vendor.contactPerson || "",
        address: vendor.address || "",
        taxId: vendor.taxId || "",
        businessLicense: vendor.businessLicense || "",
        isActive: vendor.isActive ?? true,
        notes: vendor.notes || "",
      });
      setContactData({
        email: vendor.email || "",
        phone: vendor.phone || "",
        whatsappNumber: vendor.whatsappNumber || "",
        website: vendor.website || "",
      });
    } else {
      setFormData({
        name: "",
        type: "",
        category: "",
        contactPerson: "",
        address: "",
        taxId: "",
        businessLicense: "",
        isActive: true,
        notes: "",
      });
      setContactData({});
    }
  }, [vendor, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/vendors", data),
    onSuccess: (response: any) => {
      setFeedback({
        open: true,
        type: "success",
        title: "Vendor berhasil ditambahkan",
        message: "Data vendor sudah tersimpan.",
        next: () => {
          onSuccess?.(response.data?.data?.id);
        },
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menambahkan vendor",
        message: error.response?.data?.error || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/admin/vendors/${vendor?.id}`, data),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Vendor berhasil diupdate",
        message: "Perubahan vendor sudah disimpan.",
        next: () => onSuccess?.(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal mengupdate vendor",
        message: error.response?.data?.error || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Nama dan tipe vendor wajib diisi.",
      });
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

  const typeOptions = [
    { value: "supplier", label: "Supplier" },
    { value: "contractor", label: "Contractor" },
    { value: "service_provider", label: "Service Provider" },
    { value: "consultant", label: "Consultant" },
  ];

  const closeFeedback = () => {
    const action = feedback.next;
    setFeedback((prev) => ({ ...prev, open: false, next: undefined }));
    action?.();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isViewMode ? "Detail Vendor" : vendor ? "Edit Vendor" : "Tambah Vendor"}
          </h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} id="vendor-form">
            {/* Basic Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Dasar</h3>

              <div className="form-group">
                <label className="form-label">
                  Nama Vendor <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  disabled={isViewMode}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Tipe <span className="text-danger-500">*</span>
                </label>
                <Autocomplete
                  options={typeOptions}
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value })}
                  placeholder="Pilih Tipe"
                  disabled={isViewMode}
                  allowClear={false}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kategori</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Construction, Catering, Printing"
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Kontak</h3>

              <div className="form-group">
                <label className="form-label">Nama Kontak</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="form-input"
                  disabled={isViewMode}
                />
              </div>

              <ContactForm
                value={contactData}
                onChange={setContactData}
                disabled={isViewMode}
                required={false}
                showTitle={false}
              />

              <AddressForm
                value={addressData}
                onChange={setAddressFormData}
                disabled={isViewMode}
                required={false}
              />
            </div>

            {/* Banking Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Rekening Bank</h3>
              <BankAccountForm
                value={bankAccountsData}
                onChange={setBankAccountsFormData}
                disabled={isViewMode}
                required={false}
              />
            </div>

            {/* Tax & Legal */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Pajak & Legal</h3>

              <div className="form-group">
                <label className="form-label">NPWP</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="form-input"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nomor Izin Usaha</label>
                <input
                  type="text"
                  value={formData.businessLicense}
                  onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })}
                  className="form-input"
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Status & Notes */}
            <div className="form-section">
              <h3 className="form-section-title">Status & Catatan</h3>

              <div className="form-group">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    disabled={isViewMode}
                    className="form-checkbox"
                  />
                  <span className="form-label mb-0">Vendor Aktif</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  rows={3}
                  disabled={isViewMode}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {isViewMode ? "Tutup" : "Batal"}
          </button>
          {!isViewMode && (
            <button
              type="submit"
              form="vendor-form"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Menyimpan..."
                : vendor
                ? "Update"
                : "Simpan"}
            </button>
          )}
        </div>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={closeFeedback}
      />
    </div>
  );
}
