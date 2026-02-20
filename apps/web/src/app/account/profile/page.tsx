"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { Input, Button, Label } from "@/components/atoms";
import Autocomplete from "@/components/Autocomplete";
import toast from "@/lib/feedback-toast";
import { useI18n } from "@/lib/i18n/provider";

interface ProfileData {
  name: string;
  phone: string;
  whatsappNumber: string;
  website: string;
  detailAddress: string;
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  villageCode: string;
  bankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  }>;
}

export default function ProfilePage() {
  const { user, isHydrated } = useAuth();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    phone: "",
    whatsappNumber: "",
    website: "",
    detailAddress: "",
    provinceCode: "",
    regencyCode: "",
    districtCode: "",
    villageCode: "",
    bankAccounts: [],
  });

  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isHydrated || !user) {
        if (isHydrated && !user) setIsLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const data = response.data.data;

        console.log("=== Profile Page Debug ===");
        console.log("API Response:", response.data);
        console.log("Data:", data);
        console.log("Name:", data.name);
        console.log("Phone:", data.phone);
        console.log("WhatsApp:", data.whatsappNumber);

        setProfileData({
          name: data.name || "",
          phone: data.phone || "",
          whatsappNumber: data.whatsappNumber || "",
          website: data.website || "",
          detailAddress: data.detailAddress || "",
          provinceCode: data.provinceCode || "",
          regencyCode: data.regencyCode || "",
          districtCode: data.districtCode || "",
          villageCode: data.villageCode || "",
          bankAccounts: data.bankAccounts?.map((ba: any) => ({
            bankName: ba.bankName,
            accountNumber: ba.accountNumber,
            accountHolderName: ba.accountHolderName,
          })) || [],
        });

        // Load regencies if province selected
        if (data.provinceCode) {
          await fetchRegencies(data.provinceCode);
        }
        // Load districts if regency selected
        if (data.regencyCode) {
          await fetchDistricts(data.regencyCode);
        }
        // Load villages if district selected
        if (data.districtCode) {
          await fetchVillages(data.districtCode);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isHydrated, user]);

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await api.get("/indonesia/provinces");
        setProvinces(response.data.data || []);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };

    fetchProvinces();
  }, []);

  const fetchRegencies = async (provinceCode: string) => {
    try {
      const response = await api.get(`/indonesia/regencies/${provinceCode}`);
      setRegencies(response.data.data || []);
    } catch (error) {
      console.error("Error fetching regencies:", error);
    }
  };

  const fetchDistricts = async (regencyCode: string) => {
    try {
      const response = await api.get(`/indonesia/districts/${regencyCode}`);
      setDistricts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchVillages = async (districtCode: string) => {
    try {
      const response = await api.get(`/indonesia/villages/${districtCode}`);
      setVillages(response.data.data || []);
    } catch (error) {
      console.error("Error fetching villages:", error);
    }
  };

  // Memoized autocomplete options
  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: p.code, label: p.name })),
    [provinces]
  );

  const regencyOptions = useMemo(
    () => regencies.map((r) => ({ value: r.code, label: r.name })),
    [regencies]
  );

  const districtOptions = useMemo(
    () => districts.map((d) => ({ value: d.code, label: d.name })),
    [districts]
  );

  const villageOptions = useMemo(
    () => villages.map((v) => ({ value: v.code, label: v.name })),
    [villages]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  // Autocomplete handlers with cascading
  const handleProvinceChange = (value: string) => {
    setProfileData(prev => ({ ...prev, provinceCode: value, regencyCode: "", districtCode: "", villageCode: "" }));
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    if (value) fetchRegencies(value);
  };

  const handleRegencyChange = (value: string) => {
    setProfileData(prev => ({ ...prev, regencyCode: value, districtCode: "", villageCode: "" }));
    setDistricts([]);
    setVillages([]);
    if (value) fetchDistricts(value);
  };

  const handleDistrictChange = (value: string) => {
    setProfileData(prev => ({ ...prev, districtCode: value, villageCode: "" }));
    setVillages([]);
    if (value) fetchVillages(value);
  };

  const handleVillageChange = (value: string) => {
    setProfileData(prev => ({ ...prev, villageCode: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await api.patch("/auth/me", profileData);
      toast.success(t("account.profile.toasts.profileUpdated"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("account.profile.toasts.profileUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("account.profile.toasts.passwordMismatch"));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error(t("account.profile.toasts.passwordMinLength"));
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.patch("/auth/me/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success(t("account.profile.toasts.passwordUpdated"));
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("account.profile.toasts.passwordUpdateFailed"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const addBankAccount = () => {
    setProfileData(prev => ({
      ...prev,
      bankAccounts: [
        ...prev.bankAccounts,
        {
          bankName: "",
          accountNumber: "",
          accountHolderName: "",
        },
      ],
    }));
  };

  const removeBankAccount = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((_, i) => i !== index),
    }));
  };

  const updateBankAccount = (index: number, field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map((acc, i) =>
        i === index ? { ...acc, [field]: value } : acc
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">{t("account.profile.loading")}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("account.profile.title")}</h1>
        <p className="text-sm text-gray-600 mt-1">{t("account.profile.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmitProfile} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("account.profile.basicInfo")}</h2>

          <div className="space-y-5">
            <div>
              <Label htmlFor="name">{t("account.profile.labels.fullName")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={profileData.name}
                onChange={handleChange}
                placeholder={t("account.profile.placeholders.fullName")}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">{t("account.profile.labels.email")}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">{t("account.profile.hints.emailImmutable")}</p>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("account.profile.contactInfo")}</h2>

          <div className="space-y-5">
            <div>
              <Label htmlFor="phone">{t("account.profile.labels.phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={profileData.phone}
                onChange={handleChange}
                placeholder={t("account.profile.placeholders.phone")}
              />
            </div>

            <div>
              <Label htmlFor="whatsappNumber">{t("account.profile.labels.whatsapp")}</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                value={profileData.whatsappNumber}
                onChange={handleChange}
                placeholder={t("account.profile.placeholders.whatsapp")}
              />
            </div>

            <div>
              <Label htmlFor="website">{t("account.profile.labels.website")}</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={profileData.website}
                onChange={handleChange}
                placeholder={t("account.profile.placeholders.website")}
              />
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("account.profile.address")}</h2>

          <div className="space-y-5">
            <div>
              <Label htmlFor="detailAddress">{t("account.profile.labels.fullAddress")}</Label>
              <textarea
                id="detailAddress"
                name="detailAddress"
                value={profileData.detailAddress}
                onChange={handleChange}
                placeholder={t("account.profile.placeholders.fullAddress")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="provinceCode">{t("account.profile.labels.province")}</Label>
                <Autocomplete
                  options={provinceOptions}
                  value={profileData.provinceCode}
                  onChange={handleProvinceChange}
                  placeholder={t("account.profile.placeholders.province")}
                />
              </div>

              <div>
                <Label htmlFor="regencyCode">{t("account.profile.labels.regency")}</Label>
                <Autocomplete
                  options={regencyOptions}
                  value={profileData.regencyCode}
                  onChange={handleRegencyChange}
                  placeholder={t("account.profile.placeholders.regency")}
                  disabled={!profileData.provinceCode}
                />
              </div>

              <div>
                <Label htmlFor="districtCode">{t("account.profile.labels.district")}</Label>
                <Autocomplete
                  options={districtOptions}
                  value={profileData.districtCode}
                  onChange={handleDistrictChange}
                  placeholder={t("account.profile.placeholders.district")}
                  disabled={!profileData.regencyCode}
                />
              </div>

              <div>
                <Label htmlFor="villageCode">{t("account.profile.labels.village")}</Label>
                <Autocomplete
                  options={villageOptions}
                  value={profileData.villageCode}
                  onChange={handleVillageChange}
                  placeholder={t("account.profile.placeholders.village")}
                  disabled={!profileData.districtCode}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{t("account.profile.bankAccounts")}</h2>
            <Button type="button" onClick={addBankAccount} size="sm" variant="outline">
              {t("account.profile.addBankAccount")}
            </Button>
          </div>

          {profileData.bankAccounts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {t("account.profile.noBankAccounts")}
            </p>
          ) : (
            <div className="space-y-4">
              {profileData.bankAccounts.map((account, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {t("account.profile.bankAccountNumber", { number: index + 1 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBankAccount(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      {t("account.profile.delete")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`bankName-${index}`}>{t("account.profile.labels.bankName")}</Label>
                      <Input
                        id={`bankName-${index}`}
                        value={account.bankName}
                        onChange={(e) => updateBankAccount(index, "bankName", e.target.value)}
                        placeholder={t("account.profile.placeholders.bankName")}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor={`accountNumber-${index}`}>{t("account.profile.labels.accountNumber")}</Label>
                      <Input
                        id={`accountNumber-${index}`}
                        value={account.accountNumber}
                        onChange={(e) => updateBankAccount(index, "accountNumber", e.target.value)}
                        placeholder={t("account.profile.placeholders.accountNumber")}
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`accountHolderName-${index}`}>{t("account.profile.labels.accountHolderName")}</Label>
                      <Input
                        id={`accountHolderName-${index}`}
                        value={account.accountHolderName}
                        onChange={(e) => updateBankAccount(index, "accountHolderName", e.target.value)}
                        placeholder={t("account.profile.placeholders.accountHolderName")}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <Button type="submit" disabled={isSaving} fullWidth size="lg">
            {isSaving ? t("account.profile.saving") : t("account.profile.saveChanges")}
          </Button>
        </div>
      </form>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">{t("account.profile.changePassword")}</h2>

        <form onSubmit={handleSubmitPassword} className="space-y-5">
          <div>
            <Label htmlFor="currentPassword">{t("account.profile.labels.currentPassword")}</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder={t("account.profile.placeholders.currentPassword")}
              required
            />
          </div>

          <div>
            <Label htmlFor="newPassword">{t("account.profile.labels.newPassword")}</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder={t("account.profile.placeholders.newPassword")}
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">{t("account.profile.labels.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder={t("account.profile.placeholders.confirmPassword")}
              required
            />
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={isChangingPassword} fullWidth variant="outline">
              {isChangingPassword ? t("account.profile.changingPassword") : t("account.profile.updatePassword")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
