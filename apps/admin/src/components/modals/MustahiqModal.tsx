"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import { normalizeContactData } from "@/lib/contact-helpers";
import FeedbackDialog from "@/components/FeedbackDialog";

type Mustahiq = {
  id: string;
  mustahiqId?: string;
  name: string;
  asnafCategory: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  villageCode?: string;
  detailAddress?: string;
  nationalId?: string;
  dateOfBirth?: Date;
  gender?: string;
  birthPlace?: string;
  motherName?: string;
  maritalStatus?: string;
  dependents?: number | null;
  jobTitleId?: number | null;
  incomeRangeId?: number | null;

  // Bank accounts - new system
  bankAccounts?: BankAccountValue[];

  // Legacy bank fields - will be deprecated
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;

  notes?: string;
  isActive: boolean;
};

interface MustahiqModalProps {
  mustahiq?: Mustahiq | null;
  isViewMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ASNAF_CATEGORIES = [
  { value: "fakir", label: "Fakir" },
  { value: "miskin", label: "Miskin" },
  { value: "amil", label: "Amil" },
  { value: "mualaf", label: "Mualaf" },
  { value: "riqab", label: "Riqab" },
  { value: "gharim", label: "Gharim" },
  { value: "fisabilillah", label: "Fisabilillah" },
  { value: "ibnus_sabil", label: "Ibnus Sabil" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "menikah", label: "Menikah" },
  { value: "belum_menikah", label: "Belum Menikah" },
  { value: "janda_cerai_hidup", label: "Janda (Cerai Hidup)" },
  { value: "janda_cerai_mati", label: "Janda (Cerai Mati)" },
  { value: "duda_cerai_hidup", label: "Duda (Cerai Hidup)" },
  { value: "duda_cerai_mati", label: "Duda (Cerai Mati)" },
];

export default function MustahiqModal({
  mustahiq,
  isViewMode = false,
  onClose,
  onSuccess,
}: MustahiqModalProps) {
  // Fetch job categories with titles
  const { data: jobCategories } = useQuery({
    queryKey: ["jobCategories"],
    queryFn: async () => {
      const res = await api.get("/jobs/categories");
      return res.data.data as Array<{
        id: number;
        name: string;
        titles: Array<{ id: number; name: string; isPopular: boolean }>;
      }>;
    },
    staleTime: 1000 * 60 * 30,
  });

  const jobTitleOptions = useMemo(
    () => (jobCategories || []).flatMap((cat) =>
      cat.titles.map((title) => ({
        value: String(title.id),
        label: `${title.name} — ${cat.name}`,
      }))
    ),
    [jobCategories]
  );

  // Fetch income ranges
  const { data: incomeRangesData } = useQuery({
    queryKey: ["incomeRanges"],
    queryFn: async () => {
      const res = await api.get("/income-ranges");
      return res.data.data as Array<{ id: number; label: string }>;
    },
    staleTime: 1000 * 60 * 30,
  });

  const incomeRangeOptions = useMemo(
    () => (incomeRangesData || []).map((r) => ({
      value: String(r.id),
      label: r.label,
    })),
    [incomeRangesData]
  );

  const [formData, setFormData] = useState({
    mustahiqId: "",
    name: "",
    asnafCategory: "",
    nationalId: "",
    dateOfBirth: "",
    gender: "",
    birthPlace: "",
    motherName: "",
    maritalStatus: "",
    dependents: null as number | null,
    jobTitleId: null as number | null,
    incomeRangeId: null as number | null,
    notes: "",
    isActive: true,
  });

  const [contactData, setContactData] = useState<ContactValue>({});

  const [address, setAddress] = useState<Partial<AddressValue>>({});

  // Compute bank accounts data directly from mustahiq prop
  const bankAccountsData = useMemo<BankAccountValue[]>(() => {
    if (mustahiq && mustahiq.bankAccounts) {
      return mustahiq.bankAccounts;
    }
    return [];
  }, [mustahiq]);

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
    if (mustahiq) {
      setFormData({
        mustahiqId: mustahiq.mustahiqId || "",
        name: mustahiq.name || "",
        asnafCategory: mustahiq.asnafCategory || "",
        nationalId: mustahiq.nationalId || "",
        dateOfBirth: mustahiq.dateOfBirth ? new Date(mustahiq.dateOfBirth).toISOString().split("T")[0] : "",
        gender: mustahiq.gender || "",
        birthPlace: mustahiq.birthPlace || "",
        motherName: mustahiq.motherName || "",
        maritalStatus: mustahiq.maritalStatus || "",
        dependents: mustahiq.dependents ?? null,
        jobTitleId: mustahiq.jobTitleId ?? null,
        incomeRangeId: mustahiq.incomeRangeId ?? null,
        notes: mustahiq.notes || "",
        isActive: mustahiq.isActive ?? true,
      });
      setContactData({
        email: mustahiq.email || "",
        phone: mustahiq.phone || "",
        whatsappNumber: mustahiq.whatsappNumber || "",
        website: mustahiq.website || "",
      });
      setAddress({
        provinceCode: mustahiq.provinceCode || "",
        regencyCode: mustahiq.regencyCode || "",
        districtCode: mustahiq.districtCode || "",
        villageCode: mustahiq.villageCode || "",
        detailAddress: mustahiq.detailAddress || "",
        postalCode: null,
      });
    } else {
      setFormData({
        mustahiqId: "",
        name: "",
        asnafCategory: "",
        nationalId: "",
        dateOfBirth: "",
        gender: "",
        birthPlace: "",
        motherName: "",
        maritalStatus: "",
        dependents: null,
        jobTitleId: null,
        incomeRangeId: null,
        notes: "",
        isActive: true,
      });
      setContactData({});
      setAddress({});
      setBankAccountsFormData([]);
    }
  }, [mustahiq]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/admin/mustahiqs", data),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Mustahiq berhasil ditambahkan",
        message: "Data mustahiq sudah tersimpan.",
        next: () => onSuccess(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menambahkan mustahiq",
        message: error.response?.data?.error || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/admin/mustahiqs/${mustahiq?.id}`, data),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Mustahiq berhasil diupdate",
        message: "Perubahan mustahiq sudah disimpan.",
        next: () => onSuccess(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal mengupdate mustahiq",
        message: error.response?.data?.error || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.asnafCategory) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Nama dan Kategori Asnaf wajib diisi.",
      });
      return;
    }

    // Normalize contact data
    const normalizedContact = normalizeContactData(contactData);

    const payload: any = {
      ...formData,
      ...normalizedContact,
      provinceCode: address.provinceCode || null,
      regencyCode: address.regencyCode || null,
      districtCode: address.districtCode || null,
      villageCode: address.villageCode || null,
      detailAddress: address.detailAddress || null,
      bankAccounts: bankAccountsFormData, // Merge bank accounts data
    };

    if (mustahiq) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const genderOptions = [
    { value: "male", label: "Laki-laki" },
    { value: "female", label: "Perempuan" },
  ];

  const closeFeedback = () => {
    const next = feedback.next;
    setFeedback((prev) => ({ ...prev, open: false, next: undefined }));
    next?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isViewMode ? "Detail Mustahiq" : mustahiq ? "Edit Mustahiq" : "Tambah Mustahiq"}
          </h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} id="mustahiq-form">
            {/* Basic Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Dasar</h3>

              <div className="form-group">
                <label className="form-label">ID Mustahiq</label>
                <input
                  type="text"
                  value={formData.mustahiqId}
                  onChange={(e) => setFormData({ ...formData, mustahiqId: e.target.value })}
                  className="form-input"
                  placeholder="Nomor identifikasi (opsional)"
                  disabled={isViewMode}
                />
              </div>

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
                  Kategori Asnaf <span className="text-danger-500">*</span>
                </label>
                <Autocomplete
                  options={ASNAF_CATEGORIES}
                  value={formData.asnafCategory}
                  onChange={(value) => setFormData({ ...formData, asnafCategory: value })}
                  placeholder="Pilih Kategori Asnaf"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jenis Kelamin</label>
                <Autocomplete
                  options={genderOptions}
                  value={formData.gender}
                  onChange={(value) => setFormData({ ...formData, gender: value })}
                  placeholder="Pilih Jenis Kelamin"
                  disabled={isViewMode}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="form-input"
                    placeholder="Contoh: Jakarta"
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="form-input"
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Ibu Kandung</label>
                <input
                  type="text"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  className="form-input"
                  placeholder="Nama ibu kandung"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status Perkawinan</label>
                <Autocomplete
                  options={MARITAL_STATUS_OPTIONS}
                  value={formData.maritalStatus}
                  onChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                  placeholder="Pilih Status Perkawinan"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jumlah Tanggungan</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dependents ?? ""}
                  onChange={(e) => setFormData({ ...formData, dependents: e.target.value ? Number(e.target.value) : null })}
                  className="form-input"
                  placeholder="0"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pekerjaan</label>
                <Autocomplete
                  options={jobTitleOptions}
                  value={String(formData.jobTitleId ?? "")}
                  onChange={(value) => setFormData({ ...formData, jobTitleId: value ? Number(value) : null })}
                  placeholder="Pilih Pekerjaan"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Penghasilan Bulanan</label>
                <Autocomplete
                  options={incomeRangeOptions}
                  value={String(formData.incomeRangeId ?? "")}
                  onChange={(value) => setFormData({ ...formData, incomeRangeId: value ? Number(value) : null })}
                  placeholder="Pilih Penghasilan Bulanan"
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">NIK / KTP</label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className="form-input"
                  placeholder="Nomor Induk Kependudukan"
                  disabled={isViewMode}
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
                required={false}
                showTitle={false}
              />

              <AddressForm
                value={address}
                onChange={setAddress}
                disabled={isViewMode}
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

            {/* Additional Info */}
            <div className="form-section">
              <h3 className="form-section-title">Informasi Tambahan</h3>

              <div className="form-group">
                <label className="form-label">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Catatan tambahan tentang mustahiq"
                  disabled={isViewMode}
                />
              </div>

              {!isViewMode && (
                <div className="form-group">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="form-checkbox"
                    />
                    <span className="text-sm text-gray-700">Status Aktif</span>
                  </label>
                </div>
              )}
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
              form="mustahiq-form"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Menyimpan..."
                : mustahiq
                ? "Update"
                : "Simpan"}
            </button>
          )}
        </div>

        <FeedbackDialog
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={closeFeedback}
        />
      </div>
    </div>
  );
}
