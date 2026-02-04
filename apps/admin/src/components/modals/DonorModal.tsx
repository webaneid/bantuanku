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

type Donatur = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  whatsappNumber?: string;
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
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  totalDonations?: number;
  totalAmount?: number;
};

interface DonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdId?: string) => void;
  donatur?: Donatur | null;
  isViewMode?: boolean;
  disablePassword?: boolean;
  zIndex?: number; // Optional z-index for stacking modals
}

export default function DonorModal({
  isOpen,
  onClose,
  onSuccess,
  donatur,
  isViewMode = false,
  disablePassword = false,
  zIndex,
}: DonorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    password: "",
  });

  // Contact data state
  const [contactData, setContactData] = useState<ContactValue>({});

  // Compute address data directly from donatur prop
  const addressData = useMemo<Partial<AddressValue>>(() => {
    if (donatur) {
      return {
        detailAddress: donatur.detailAddress || "",
        provinceCode: donatur.provinceCode || "",
        regencyCode: donatur.regencyCode || "",
        districtCode: donatur.districtCode || "",
        villageCode: donatur.villageCode || "",
        postalCode: donatur.villagePostalCode || null,
      };
    }
    return {};
  }, [donatur]);

  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});

  // Compute bank accounts data directly from donatur prop
  const bankAccountsData = useMemo<BankAccountValue[]>(() => {
    if (donatur && donatur.bankAccounts) {
      return donatur.bankAccounts;
    }
    return [];
  }, [donatur]);

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
    if (donatur) {
      setFormData({
        name: donatur.name || "",
        password: "",
      });
      setContactData({
        email: donatur.email || "",
        phone: donatur.phone || "",
        whatsappNumber: donatur.whatsappNumber || "",
        website: donatur.website || "",
      });
    } else {
      setFormData({
        name: "",
        password: "",
      });
      setContactData({});
      setAddressFormData({});
      setBankAccountsFormData([]);
    }
  }, [donatur, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/donatur", data),
    onSuccess: (response) => {
      setFeedback({
        open: true,
        type: "success",
        title: "Donatur berhasil ditambahkan",
        message: "Data donatur sudah tersimpan.",
        next: () => onSuccess(response.data?.data?.id),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menambahkan donatur",
        message: error.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/admin/donatur/${donatur?.id}`, data),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Donatur berhasil diupdate",
        message: "Perubahan donatur sudah disimpan.",
        next: () => onSuccess(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal mengupdate donatur",
        message: error.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Nama wajib diisi.",
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

    // Remove password if empty on update
    if (donatur && !formData.password) {
      delete payload.password;
    }

    if (donatur) {
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
    <div className="modal-backdrop" style={zIndex ? { zIndex } : undefined} onClick={onClose}>
      <div className="modal-content max-w-3xl" style={zIndex ? { zIndex } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isViewMode ? "Detail Donatur" : donatur ? "Edit Donatur" : "Tambah Donatur"}
          </h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} id="donatur-form">
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

            {/* Login Info */}
            {!disablePassword && (
              <div className="form-section">
                <h3 className="form-section-title">
                  Info Login {!donatur && <span className="text-sm text-gray-500 font-normal">(Opsional)</span>}
                </h3>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input"
                    placeholder={donatur ? "Kosongkan jika tidak ingin mengubah" : "Minimal 8 karakter"}
                    minLength={8}
                    disabled={isViewMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {donatur
                      ? "Kosongkan jika tidak ingin mengubah password"
                      : "Jika diisi, donatur bisa login ke website"}
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {isViewMode ? "Tutup" : "Batal"}
          </button>
          {!isViewMode && (
            <button
              type="submit"
              form="donatur-form"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Menyimpan..."
                : donatur
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
