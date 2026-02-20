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

  userId?: string | null;
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
  zIndex?: number; // Optional z-index for stacking modals
}

export default function DonorModal({
  isOpen,
  onClose,
  onSuccess,
  donatur,
  isViewMode = false,
  zIndex,
}: DonorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
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

  const [activatePassword, setActivatePassword] = useState("");

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

  const activateUserMutation = useMutation({
    mutationFn: (payload: { password: string }) =>
      api.post(`/admin/donatur/${donatur?.id}/activate-user`, payload),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Akun login berhasil dibuat",
        message: "Donatur sekarang bisa login ke website.",
        next: () => onSuccess(),
      });
      setActivatePassword("");
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal membuat akun login",
        message: error.response?.data?.message || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleActivateUser = () => {
    if (!activatePassword || activatePassword.length < 8) {
      setFeedback({
        open: true,
        type: "error",
        title: "Password tidak valid",
        message: "Password minimal 8 karakter.",
      });
      return;
    }
    activateUserMutation.mutate({ password: activatePassword });
  };

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

    const { password, ...restFormData } = formData as any;
    const payload: any = {
      ...restFormData,
      ...normalizedContact,
      ...addressFormData,
      bankAccounts: bankAccountsFormData,
    };

    // Only send password if filled (edit mode)
    if (donatur && password) {
      payload.password = password;
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

            {/* Akun Login - only on edit */}
            {donatur && !isViewMode && (
              donatur.userId ? (
                <div className="form-section">
                  <h3 className="form-section-title">Change Password</h3>

                  <div className="form-group">
                    <label className="form-label">Password Baru</label>
                    <input
                      type="password"
                      value={(formData as any).password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value } as any)}
                      className="form-input"
                      placeholder="Kosongkan jika tidak ingin mengubah"
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Kosongkan jika tidak ingin mengubah password
                    </p>
                  </div>
                </div>
              ) : (
                <div className="form-section">
                  <h3 className="form-section-title">Activate User</h3>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="text"
                      value={donatur.email || ""}
                      disabled
                      className="form-input bg-gray-100"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      value={activatePassword}
                      onChange={(e) => setActivatePassword(e.target.value)}
                      className="form-input"
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleActivateUser}
                    disabled={activateUserMutation.isPending}
                  >
                    {activateUserMutation.isPending ? "Mengaktifkan..." : "Aktifkan Akun Login"}
                  </button>
                </div>
              )
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
