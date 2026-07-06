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
  jobTitleId: number | null;
  incomeRangeId: number | null;
  nik: string;
  npwp: string;
  birthPlace: string;
  birthDate: string;
  gender: string;
  bankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  }>;
}

interface JobCategory {
  id: number;
  name: string;
  titles: Array<{ id: number; name: string; isPopular: boolean }>;
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
    jobTitleId: null,
    incomeRangeId: null,
    nik: "",
    npwp: "",
    birthPlace: "",
    birthDate: "",
    gender: "",
    bankAccounts: [],
  });

  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [incomeRanges, setIncomeRanges] = useState<Array<{ id: number; label: string }>>([]);
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
  const [waOptOut, setWaOptOut] = useState(false);
  const [isTogglingWa, setIsTogglingWa] = useState(false);

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
          jobTitleId: data.jobTitleId || null,
          incomeRangeId: data.incomeRangeId || null,
          nik: data.nik || "",
          npwp: data.npwp || "",
          birthPlace: data.birthPlace || "",
          birthDate: data.birthDate || "",
          gender: data.gender || "",
          bankAccounts: data.bankAccounts?.map((ba: any) => ({
            bankName: ba.bankName,
            accountNumber: ba.accountNumber,
            accountHolderName: ba.accountHolderName,
          })) || [],
        });
        setWaOptOut(data.waOptOut ?? false);

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

  // Fetch provinces and job categories on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await api.get("/indonesia/provinces");
        setProvinces(response.data.data || []);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };

    const fetchJobCategories = async () => {
      try {
        const response = await api.get("/jobs/categories");
        setJobCategories(response.data.data || []);
      } catch (error) {
        console.error("Error fetching job categories:", error);
      }
    };

    const fetchIncomeRanges = async () => {
      try {
        const response = await api.get("/income-ranges");
        setIncomeRanges(response.data.data || []);
      } catch (error) {
        console.error("Error fetching income ranges:", error);
      }
    };

    fetchProvinces();
    fetchJobCategories();
    fetchIncomeRanges();
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

  const jobTitleOptions = useMemo(
    () => jobCategories.flatMap((cat) =>
      cat.titles.map((title) => ({
        value: String(title.id),
        label: `${title.name} — ${cat.name}`,
      }))
    ),
    [jobCategories]
  );

  const incomeRangeOptions = useMemo(
    () => incomeRanges.map((r) => ({
      value: String(r.id),
      label: r.label,
    })),
    [incomeRanges]
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

    // Validate required fields
    const missing: string[] = [];
    if (!profileData.jobTitleId) missing.push("Pekerjaan");
    if (!profileData.incomeRangeId) missing.push("Penghasilan Bulanan");
    if (!profileData.gender) missing.push("Jenis Kelamin");
    if (!profileData.provinceCode) missing.push("Provinsi");
    if (missing.length > 0) {
      toast.error(`Data wajib belum diisi: ${missing.join(", ")}`);
      return;
    }

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

  // Check required fields
  const missingFields: string[] = [];
  if (!profileData.jobTitleId) missingFields.push("Pekerjaan");
  if (!profileData.incomeRangeId) missingFields.push("Penghasilan Bulanan");
  if (!profileData.gender) missingFields.push("Jenis Kelamin");
  if (!profileData.provinceCode) missingFields.push("Provinsi");

  const hasIncompleteRequired = !isLoading && missingFields.length > 0;

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

      {/* Required fields warning */}
      {hasIncompleteRequired && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-warning-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-warning-800">Lengkapi Data Wajib</h3>
              <p className="text-sm text-warning-700 mt-1">
                Data berikut wajib diisi: <strong>{missingFields.join(", ")}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

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

            <div>
              <Label htmlFor="jobTitleId">{t("account.profile.labels.jobTitle")} <span className="text-red-500">*</span></Label>
              <Autocomplete
                options={jobTitleOptions}
                value={String(profileData.jobTitleId ?? "")}
                onChange={(value) => setProfileData(prev => ({ ...prev, jobTitleId: value ? Number(value) : null }))}
                placeholder={t("account.profile.placeholders.jobTitle")}
              />
              {!profileData.jobTitleId && <p className="text-xs text-red-500 mt-1">Wajib diisi</p>}
            </div>

            <div>
              <Label htmlFor="incomeRangeId">{t("account.profile.labels.incomeRange")} <span className="text-red-500">*</span></Label>
              <Autocomplete
                options={incomeRangeOptions}
                value={String(profileData.incomeRangeId ?? "")}
                onChange={(value) => setProfileData(prev => ({ ...prev, incomeRangeId: value ? Number(value) : null }))}
                placeholder={t("account.profile.placeholders.incomeRange")}
              />
              {!profileData.incomeRangeId && <p className="text-xs text-red-500 mt-1">Wajib diisi</p>}
            </div>
          </div>
        </div>

        {/* Personal Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{t("account.profile.personalInfo")}</h2>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="nik">{t("account.profile.labels.nik")}</Label>
                <Input
                  id="nik"
                  name="nik"
                  type="text"
                  value={profileData.nik}
                  onChange={handleChange}
                  placeholder={t("account.profile.placeholders.nik")}
                  maxLength={16}
                />
              </div>

              <div>
                <Label htmlFor="npwp">{t("account.profile.labels.npwp")}</Label>
                <Input
                  id="npwp"
                  name="npwp"
                  type="text"
                  value={profileData.npwp}
                  onChange={handleChange}
                  placeholder={t("account.profile.placeholders.npwp")}
                  maxLength={25}
                />
              </div>

              <div>
                <Label htmlFor="birthPlace">{t("account.profile.labels.birthPlace")}</Label>
                <Input
                  id="birthPlace"
                  name="birthPlace"
                  type="text"
                  value={profileData.birthPlace}
                  onChange={handleChange}
                  placeholder={t("account.profile.placeholders.birthPlace")}
                />
              </div>

              <div>
                <Label htmlFor="birthDate">{t("account.profile.labels.birthDate")}</Label>
                <Input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={profileData.birthDate}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="gender">{t("account.profile.labels.gender")} <span className="text-red-500">*</span></Label>
                <select
                  id="gender"
                  name="gender"
                  value={profileData.gender}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${!profileData.gender ? "border-red-300" : "border-gray-300"}`}
                >
                  <option value="">{t("account.profile.placeholders.gender")}</option>
                  <option value="laki-laki">Laki-laki</option>
                  <option value="perempuan">Perempuan</option>
                </select>
                {!profileData.gender && <p className="text-xs text-red-500 mt-1">Wajib diisi</p>}
              </div>
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
                <Label htmlFor="provinceCode">{t("account.profile.labels.province")} <span className="text-red-500">*</span></Label>
                <Autocomplete
                  options={provinceOptions}
                  value={profileData.provinceCode}
                  onChange={handleProvinceChange}
                  placeholder={t("account.profile.placeholders.province")}
                />
                {!profileData.provinceCode && <p className="text-xs text-red-500 mt-1">Wajib diisi</p>}
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

      {/* WhatsApp Preferences Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Notifikasi WhatsApp</h2>
        <p className="text-sm text-gray-500 mb-5">
          Atur apakah Anda ingin menerima informasi program, kampanye, dan pesan kebaikan dari kami via WhatsApp.
        </p>
        <label className="flex items-center gap-4 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={!waOptOut}
              disabled={isTogglingWa}
              onChange={async (e) => {
                const newOptOut = !e.target.checked;
                setIsTogglingWa(true);
                try {
                  await api.patch("/auth/me", { waOptOut: newOptOut });
                  setWaOptOut(newOptOut);
                  toast.success(newOptOut ? "Notifikasi WhatsApp dinonaktifkan" : "Notifikasi WhatsApp diaktifkan");
                } catch {
                  toast.error("Gagal memperbarui preferensi");
                } finally {
                  setIsTogglingWa(false);
                }
              }}
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${!waOptOut ? "bg-primary-500" : "bg-gray-300"} ${isTogglingWa ? "opacity-50" : ""}`} />
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${!waOptOut ? "translate-x-5" : "translate-x-0"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{!waOptOut ? "Aktif" : "Nonaktif"}</p>
            <p className="text-xs text-gray-500">
              {!waOptOut
                ? "Anda akan menerima pesan info program & kebaikan dari kami"
                : "Anda tidak akan menerima pesan WhatsApp dari kami"}
            </p>
          </div>
        </label>
      </div>

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
