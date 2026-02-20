"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import FeedbackDialog from "@/components/FeedbackDialog";
import { normalizeContactData } from "@/lib/contact-helpers";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_finance: "Admin Keuangan",
  admin_campaign: "Admin Campaign",
  program_coordinator: "Koordinator Program",
  employee: "Employee",
  mitra: "Mitra",
  user: "User",
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsappNumber: "",
    website: "",
    // Mitra-specific
    picName: "",
    picPosition: "",
    description: "",
  });
  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});
  const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Fetch unified profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile-data"],
    queryFn: async () => {
      const response = await api.get("/auth/me/profile-data");
      return response.data?.data;
    },
    staleTime: 0,
  });

  const entityType: "employee" | "mitra" | "donatur" | null = profileData?.entityType || null;
  const entity = profileData?.entity || null;
  const roles = profileData?.roles || user?.roles || [];
  const userData = profileData?.user || null;
  const savedBankAccounts: BankAccountValue[] = profileData?.bankAccounts || [];

  // Populate form when data loads
  useEffect(() => {
    if (!profileData) return;

    const u = profileData.user;
    const e = profileData.entity;

    if (entityType === "employee" && e) {
      setFormData({
        name: e.name || u?.name || "",
        phone: e.phone || u?.phone || "",
        whatsappNumber: e.whatsappNumber || u?.whatsappNumber || "",
        website: e.website || "",
        picName: "",
        picPosition: "",
        description: "",
      });
      setAddressFormData({
        detailAddress: e.detailAddress || "",
        provinceCode: e.provinceCode || "",
        regencyCode: e.regencyCode || "",
        districtCode: e.districtCode || "",
        villageCode: e.villageCode || "",
        postalCode: null,
      });
    } else if (entityType === "mitra" && e) {
      setFormData({
        name: u?.name || e.picName || "",
        phone: e.phone || u?.phone || "",
        whatsappNumber: e.whatsappNumber || u?.whatsappNumber || "",
        website: e.website || "",
        picName: e.picName || "",
        picPosition: e.picPosition || "",
        description: e.description || "",
      });
      setAddressFormData({
        detailAddress: e.detailAddress || "",
        provinceCode: e.provinceCode || "",
        regencyCode: e.regencyCode || "",
        districtCode: e.districtCode || "",
        villageCode: e.villageCode || "",
        postalCode: null,
      });
    } else if (entityType === "donatur" && e) {
      setFormData({
        name: e.name || u?.name || "",
        phone: e.phone || u?.phone || "",
        whatsappNumber: e.whatsappNumber || u?.whatsappNumber || "",
        website: e.website || "",
        picName: "",
        picPosition: "",
        description: "",
      });
      setAddressFormData({
        detailAddress: e.detailAddress || "",
        provinceCode: e.provinceCode || "",
        regencyCode: e.regencyCode || "",
        districtCode: e.districtCode || "",
        villageCode: e.villageCode || "",
        postalCode: null,
      });
    } else {
      // No entity - just user table data
      setFormData({
        name: u?.name || "",
        phone: u?.phone || "",
        whatsappNumber: u?.whatsappNumber || "",
        website: "",
        picName: "",
        picPosition: "",
        description: "",
      });
      setAddressFormData({});
    }

    setBankAccountsFormData(
      (profileData.bankAccounts || []).map((ba: any) => ({
        id: ba.id,
        bankName: ba.bankName,
        accountNumber: ba.accountNumber,
        accountHolderName: ba.accountHolderName,
      }))
    );
  }, [profileData, entityType]);

  // Bank accounts data for BankAccountForm initial value
  const bankAccountsValue = useMemo<BankAccountValue[]>(() => {
    return savedBankAccounts.map((ba: any) => ({
      id: ba.id,
      bankName: ba.bankName,
      accountNumber: ba.accountNumber,
      accountHolderName: ba.accountHolderName,
    }));
  }, [savedBankAccounts]);

  // Address data for AddressForm initial value
  const addressValue = useMemo<Partial<AddressValue>>(() => {
    if (!entity) return {};
    return {
      detailAddress: entity.detailAddress || "",
      provinceCode: entity.provinceCode || "",
      regencyCode: entity.regencyCode || "",
      districtCode: entity.districtCode || "",
      villageCode: entity.villageCode || "",
      postalCode: null,
    };
  }, [entity]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const normalizedContact = normalizeContactData({
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber,
        website: formData.website,
      });

      const submitData: any = {
        name: formData.name,
        phone: normalizedContact.phone || "",
        whatsappNumber: normalizedContact.whatsappNumber || "",
        website: normalizedContact.website || "",
        ...addressFormData,
        bankAccounts: bankAccountsFormData,
      };

      // Mitra-specific fields
      if (entityType === "mitra") {
        submitData.picName = formData.picName;
        submitData.picPosition = formData.picPosition;
        submitData.description = formData.description;
      }

      await api.patch("/auth/me/profile", submitData);

      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      if (user) {
        setUser({ ...user, name: formData.name || user.name });
      }

      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Profil berhasil diperbarui",
      });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.error || err.response?.data?.message || "Gagal memperbarui profil",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: "Password baru tidak cocok",
      });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: "Password minimal 8 karakter",
      });
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await api.patch("/auth/me/password", data);
      return response.data;
    },
    onSuccess: () => {
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Password berhasil diubah",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal mengubah password",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-600 mt-1">Kelola informasi profil Anda</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSubmitProfile} className="space-y-6">
          {/* Basic Info Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Informasi Dasar</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input w-full"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userData?.email || ""}
                  className="form-input w-full bg-gray-100"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
              </div>

              {/* Role badges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role: string) => (
                    <span
                      key={role}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700"
                    >
                      {ROLE_LABELS[role] || role}
                    </span>
                  ))}
                </div>
              </div>

              {/* Employee-specific read-only info */}
              {entityType === "employee" && entity && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                  {entity.employeeId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Karyawan</label>
                      <input
                        type="text"
                        value={entity.employeeId}
                        className="form-input w-full bg-gray-100"
                        disabled
                      />
                    </div>
                  )}
                  {entity.position && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Posisi</label>
                      <input
                        type="text"
                        value={entity.position}
                        className="form-input w-full bg-gray-100"
                        disabled
                      />
                    </div>
                  )}
                  {entity.department && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
                      <input
                        type="text"
                        value={entity.department}
                        className="form-input w-full bg-gray-100"
                        disabled
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Mitra-specific fields */}
              {entityType === "mitra" && (
                <div className="space-y-4 pt-2 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lembaga</label>
                    <input
                      type="text"
                      value={entity?.name || ""}
                      className="form-input w-full bg-gray-100"
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Penanggung Jawab</label>
                      <input
                        type="text"
                        value={formData.picName}
                        onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                        className="form-input w-full"
                        placeholder="Nama PIC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan PIC</label>
                      <input
                        type="text"
                        value={formData.picPosition}
                        onChange={(e) => setFormData({ ...formData, picPosition: e.target.value })}
                        className="form-input w-full"
                        placeholder="Jabatan PIC"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Lembaga</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="form-input w-full"
                      rows={3}
                      placeholder="Deskripsi singkat tentang lembaga"
                    />
                  </div>
                </div>
              )}

              {/* Bergabung sejak */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bergabung Sejak</label>
                <input
                  type="text"
                  value={
                    (entity?.joinDate || entity?.createdAt || userData?.createdAt)
                      ? new Date(entity?.joinDate || entity?.createdAt || userData?.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"
                  }
                  className="form-input w-full bg-gray-100"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Informasi Kontak</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input w-full"
                  placeholder="08xx xxxx xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="form-input w-full"
                  placeholder="08xx xxxx xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="form-input w-full"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Address Card */}
          {entityType && (
            <div className="card">
              <AddressForm
                value={addressValue}
                onChange={setAddressFormData}
                required={false}
                showTitle={true}
              />
            </div>
          )}

          {/* Bank Accounts Card */}
          {entityType && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Rekening Bank</h2>
              <BankAccountForm
                value={bankAccountsValue}
                onChange={setBankAccountsFormData}
                required={false}
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="card">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary w-full"
            >
              {isSaving ? "Menyimpan..." : "Simpan Semua Perubahan"}
            </button>
          </div>
        </form>

        {/* Change Password Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Ubah Password</h2>
          </div>

          {showPasswordForm ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="form-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="form-input w-full"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="form-input w-full"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="btn btn-primary"
                >
                  {passwordMutation.isPending ? "Mengubah..." : "Ubah Password"}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="btn btn-secondary"
            >
              Ubah Password
            </button>
          )}
        </div>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
