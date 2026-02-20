"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { BankAccountForm, type BankAccountValue } from "@/components/forms/BankAccountForm";
import MediaLibrary from "@/components/MediaLibrary";
import { normalizeContactData } from "@/lib/contact-helpers";

export default function EditMitraPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
    picName: "",
    picPosition: "",
    ktpUrl: "",
    bankBookUrl: "",
    npwpUrl: "",
    notes: "",
  });

  const [contactData, setContactData] = useState<ContactValue>({});
  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});
  const [bankAccountsFormData, setBankAccountsFormData] = useState<BankAccountValue[]>([]);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isKtpLibraryOpen, setIsKtpLibraryOpen] = useState(false);
  const [isBankBookLibraryOpen, setIsBankBookLibraryOpen] = useState(false);
  const [isNpwpLibraryOpen, setIsNpwpLibraryOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mitra", id],
    queryFn: async () => {
      const response = await api.get(`/admin/mitra/${id}`);
      return response.data?.data;
    },
  });

  useEffect(() => {
    if (data && !initialized) {
      setFormData({
        name: data.name || "",
        description: data.description || "",
        logoUrl: data.logoUrl || "",
        picName: data.picName || "",
        picPosition: data.picPosition || "",
        ktpUrl: data.ktpUrl || "",
        bankBookUrl: data.bankBookUrl || "",
        npwpUrl: data.npwpUrl || "",
        notes: data.notes || "",
      });
      setContactData({
        email: data.email || "",
        phone: data.phone || "",
        whatsappNumber: data.whatsappNumber || "",
        website: data.website || "",
      });
      setAddressFormData({
        detailAddress: data.detailAddress || "",
        provinceCode: data.provinceCode || "",
        regencyCode: data.regencyCode || "",
        districtCode: data.districtCode || "",
        villageCode: data.villageCode || "",
        postalCode: data.villagePostalCode || null,
      });
      if (data.bankAccounts && data.bankAccounts.length > 0) {
        setBankAccountsFormData(
          data.bankAccounts.map((acc: any) => ({
            bankName: acc.bankName || "",
            accountNumber: acc.accountNumber || "",
            accountHolderName: acc.accountHolderName || "",
          }))
        );
      }
      setInitialized(true);
    }
  }, [data, initialized]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.put(`/admin/mitra/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Mitra berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["mitra", id] });
      router.push(`/dashboard/mitra/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal memperbarui mitra");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.name.length < 3) {
      toast.error("Nama lembaga wajib diisi (minimal 3 karakter)");
      return;
    }

    if (!formData.picName || formData.picName.length < 2) {
      toast.error("Nama penanggung jawab wajib diisi (minimal 2 karakter)");
      return;
    }

    const normalizedContact = normalizeContactData(contactData);
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      logoUrl: formData.logoUrl || undefined,
      picName: formData.picName,
      picPosition: formData.picPosition || undefined,
      ...normalizedContact,
      ...addressFormData,
      ktpUrl: formData.ktpUrl || undefined,
      bankBookUrl: formData.bankBookUrl || undefined,
      npwpUrl: formData.npwpUrl || undefined,
      bankAccounts: bankAccountsFormData,
      notes: formData.notes || undefined,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="card max-w-3xl space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="dashboard-container">
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">Mitra tidak ditemukan atau terjadi kesalahan.</p>
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={() => router.push("/dashboard/mitra")}
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/dashboard/mitra/${id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Mitra</h1>
          <p className="text-gray-600 mt-1">Perbarui data lembaga mitra</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl">
        <div className="space-y-6">
          {/* Section 1: Identitas Lembaga */}
          <div className="form-section">
            <h3 className="form-section-title">Identitas Lembaga</h3>

            <div className="form-group">
              <label className="form-label">
                Nama Lembaga <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                placeholder="Nama lembaga mitra"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                placeholder="Deskripsi singkat tentang lembaga mitra..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Logo Lembaga</label>
              {formData.logoUrl ? (
                <div className="media-field-preview">
                  <div className="media-field-image">
                    <img src={formData.logoUrl} alt="Logo Preview" />
                  </div>
                  <div className="media-field-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsMediaLibraryOpen(true)}
                    >
                      Gantikan
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger-600"
                      onClick={() => setFormData({ ...formData, logoUrl: "" })}
                    >
                      Singkirkan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="media-field-empty">
                  <button
                    type="button"
                    className="btn btn-secondary btn-md w-full"
                    onClick={() => setIsMediaLibraryOpen(true)}
                  >
                    Pilih Logo Lembaga
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Penanggung Jawab */}
          <div className="border-t pt-6">
            <div className="form-section">
              <h3 className="form-section-title">Penanggung Jawab</h3>

              <div className="form-group">
                <label className="form-label">
                  Nama Penanggung Jawab <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={formData.picName}
                  onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                  className="form-input"
                  placeholder="Nama lengkap penanggung jawab"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jabatan</label>
                <input
                  type="text"
                  value={formData.picPosition}
                  onChange={(e) => setFormData({ ...formData, picPosition: e.target.value })}
                  className="form-input"
                  placeholder="Contoh: Ketua, Direktur, Koordinator"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Kontak */}
          <div className="border-t pt-6">
            <ContactForm
              value={contactData}
              onChange={setContactData}
              showTitle={true}
            />
          </div>

          {/* Section 4: Alamat */}
          <div className="border-t pt-6">
            <AddressForm
              value={addressFormData}
              onChange={setAddressFormData}
              required={false}
            />
          </div>

          {/* Section 5: Rekening Bank */}
          <div className="border-t pt-6">
            <div className="form-section">
              <h3 className="form-section-title">Rekening Bank</h3>
              <BankAccountForm
                value={bankAccountsFormData}
                onChange={setBankAccountsFormData}
                required={false}
              />
            </div>
          </div>

          {/* Section 6: Dokumen Pendukung */}
          <div className="border-t pt-6">
            <div className="form-section">
              <h3 className="form-section-title">Dokumen Pendukung</h3>

              <div className="form-group">
                <label className="form-label">KTP Penanggung Jawab</label>
                {formData.ktpUrl ? (
                  <div className="media-field-preview">
                    <div className="media-field-image">
                      <img src={formData.ktpUrl} alt="KTP Preview" />
                    </div>
                    <div className="media-field-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsKtpLibraryOpen(true)}
                      >
                        Gantikan
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger-600"
                        onClick={() => setFormData({ ...formData, ktpUrl: "" })}
                      >
                        Singkirkan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="media-field-empty">
                    <button
                      type="button"
                      className="btn btn-secondary btn-md w-full"
                      onClick={() => setIsKtpLibraryOpen(true)}
                    >
                      Pilih Dokumen KTP
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Buku Rekening</label>
                {formData.bankBookUrl ? (
                  <div className="media-field-preview">
                    <div className="media-field-image">
                      <img src={formData.bankBookUrl} alt="Buku Rekening Preview" />
                    </div>
                    <div className="media-field-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsBankBookLibraryOpen(true)}
                      >
                        Gantikan
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger-600"
                        onClick={() => setFormData({ ...formData, bankBookUrl: "" })}
                      >
                        Singkirkan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="media-field-empty">
                    <button
                      type="button"
                      className="btn btn-secondary btn-md w-full"
                      onClick={() => setIsBankBookLibraryOpen(true)}
                    >
                      Pilih Dokumen Buku Rekening
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">NPWP</label>
                {formData.npwpUrl ? (
                  <div className="media-field-preview">
                    <div className="media-field-image">
                      <img src={formData.npwpUrl} alt="NPWP Preview" />
                    </div>
                    <div className="media-field-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsNpwpLibraryOpen(true)}
                      >
                        Gantikan
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger-600"
                        onClick={() => setFormData({ ...formData, npwpUrl: "" })}
                      >
                        Singkirkan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="media-field-empty">
                    <button
                      type="button"
                      className="btn btn-secondary btn-md w-full"
                      onClick={() => setIsNpwpLibraryOpen(true)}
                    >
                      Pilih Dokumen NPWP
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 7: Catatan */}
          <div className="border-t pt-6">
            <div className="form-section">
              <h3 className="form-section-title">Catatan</h3>

              <div className="form-group">
                <label className="form-label">Catatan Internal</label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  placeholder="Catatan tambahan untuk tim internal..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/mitra/${id}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>

          {updateMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Gagal memperbarui mitra. Silakan periksa data dan coba lagi.
            </div>
          )}
        </div>
      </form>

      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(url: string) => {
          setFormData({ ...formData, logoUrl: url });
          setIsMediaLibraryOpen(false);
        }}
        selectedUrl={formData.logoUrl}
        accept="image/*"
        category="general"
      />

      <MediaLibrary
        isOpen={isKtpLibraryOpen}
        onClose={() => setIsKtpLibraryOpen(false)}
        onSelect={(url: string) => {
          setFormData({ ...formData, ktpUrl: url });
          setIsKtpLibraryOpen(false);
        }}
        selectedUrl={formData.ktpUrl}
        accept="image/*"
        category="document"
      />

      <MediaLibrary
        isOpen={isBankBookLibraryOpen}
        onClose={() => setIsBankBookLibraryOpen(false)}
        onSelect={(url: string) => {
          setFormData({ ...formData, bankBookUrl: url });
          setIsBankBookLibraryOpen(false);
        }}
        selectedUrl={formData.bankBookUrl}
        accept="image/*"
        category="document"
      />

      <MediaLibrary
        isOpen={isNpwpLibraryOpen}
        onClose={() => setIsNpwpLibraryOpen(false)}
        onSelect={(url: string) => {
          setFormData({ ...formData, npwpUrl: url });
          setIsNpwpLibraryOpen(false);
        }}
        selectedUrl={formData.npwpUrl}
        accept="image/*"
        category="document"
      />
    </div>
  );
}
