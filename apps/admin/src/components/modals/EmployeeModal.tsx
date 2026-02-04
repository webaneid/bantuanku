"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import { normalizeContactData } from "@/lib/contact-helpers";
import FeedbackDialog from "@/components/FeedbackDialog";

type Employee = {
  id: string;
  name: string;
  position: string;
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

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdId?: string) => void;
  employee?: Employee | null;
  isViewMode?: boolean;
}

export default function EmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employee,
  isViewMode = false,
}: EmployeeModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    position: "",
  });

  // Contact data state
  const [contactData, setContactData] = useState<ContactValue>({});

  // Compute address data directly from employee prop
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

  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});

  // Compute bank accounts data directly from employee prop
  const bankAccountsData = useMemo<BankAccountValue[]>(() => {
    if (employee && employee.bankAccounts) {
      return employee.bankAccounts;
    }
    return [];
  }, [employee]);

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
    if (employee) {
      setFormData({
        name: employee.name || "",
        position: employee.position || "",
      });
      setContactData({
        email: employee.email || "",
        phone: employee.phone || "",
        whatsappNumber: employee.whatsappNumber || "",
        website: employee.website || "",
      });
    } else {
      setFormData({
        name: "",
        position: "",
      });
      setContactData({});
      setAddressFormData({});
      setBankAccountsFormData([]);
    }
  }, [employee, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/employees", data),
    onSuccess: (response) => {
      setFeedback({
        open: true,
        type: "success",
        title: "Employee berhasil ditambahkan",
        message: "Data karyawan sudah tersimpan.",
        next: () => onSuccess(response.data?.data?.id),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menambahkan employee",
        message: error.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/admin/employees/${employee?.id}`, data),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Employee berhasil diupdate",
        message: "Perubahan data karyawan disimpan.",
        next: () => onSuccess(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal mengupdate employee",
        message: error.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.position) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Nama dan posisi wajib diisi.",
      });
      return;
    }

    // Normalize contact data
    const normalizedContact = normalizeContactData(contactData);

    const payload: any = {
      ...formData,
      ...normalizedContact,
      ...addressFormData,
      bankAccounts: bankAccountsFormData,
    };

    if (employee) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const closeFeedback = () => {
    const next = feedback.next;
    setFeedback((prev) => ({ ...prev, open: false, next: undefined }));
    next?.();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isViewMode ? "Detail Employee" : employee ? "Edit Employee" : "Tambah Employee"}
          </h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} id="employee-form">
            {/* Basic Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Dasar</h3>

              <div className="form-group">
                <label className="form-label">
                  Nama Lengkap <span className="text-danger-500">*</span>
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
                  Posisi <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="form-input"
                  placeholder="Contoh: Staff, Manager, Coordinator"
                  disabled={isViewMode}
                  required
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Kontak</h3>

              <ContactForm
                value={contactData}
                onChange={setContactData}
                disabled={isViewMode}
                required={true}
                showTitle={false}
              />

              <AddressForm
                value={addressData}
                onChange={setAddressFormData}
                disabled={isViewMode}
                required={false}
                showTitle={false}
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
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {isViewMode ? "Tutup" : "Batal"}
          </button>
          {!isViewMode && (
            <button
              type="submit"
              form="employee-form"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Menyimpan..."
                : employee
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
