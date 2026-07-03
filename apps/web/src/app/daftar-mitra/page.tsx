"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import toast from "@/lib/feedback-toast";
import api from "@/lib/api";
import { Header as Navbar, Footer, Breadcrumb } from "@/components/organisms";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

interface AddressOption {
  code: string;
  name: string;
}

interface DocumentUrls {
  ktpUrl: string;
  bankBookUrl: string;
  npwpUrl: string;
}

export default function DaftarMitraPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    picName: "",
    picPosition: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    website: "",
    detailAddress: "",
  });

  // Address cascade state
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [regencies, setRegencies] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [villages, setVillages] = useState<AddressOption[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedRegencyCode, setSelectedRegencyCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
  const [selectedVillageCode, setSelectedVillageCode] = useState("");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { bankName: "", accountNumber: "", accountHolderName: "" },
  ]);

  // Document upload state
  const [documentUrls, setDocumentUrls] = useState<DocumentUrls>({
    ktpUrl: "",
    bankBookUrl: "",
    npwpUrl: "",
  });
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Load provinces on mount
  useEffect(() => {
    fetch(`${API_URL}/indonesia/provinces`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProvinces(d.data); })
      .catch(() => {});
  }, []);

  // Load regencies when province changes
  useEffect(() => {
    if (!selectedProvinceCode) { setRegencies([]); setSelectedRegencyCode(""); return; }
    fetch(`${API_URL}/indonesia/regencies/${selectedProvinceCode}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRegencies(d.data); })
      .catch(() => {});
    setSelectedRegencyCode("");
    setSelectedDistrictCode("");
    setSelectedVillageCode("");
    setDistricts([]);
    setVillages([]);
  }, [selectedProvinceCode]);

  // Load districts when regency changes
  useEffect(() => {
    if (!selectedRegencyCode) { setDistricts([]); setSelectedDistrictCode(""); return; }
    fetch(`${API_URL}/indonesia/districts/${selectedRegencyCode}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDistricts(d.data); })
      .catch(() => {});
    setSelectedDistrictCode("");
    setSelectedVillageCode("");
    setVillages([]);
  }, [selectedRegencyCode]);

  // Load villages when district changes
  useEffect(() => {
    if (!selectedDistrictCode) { setVillages([]); setSelectedVillageCode(""); return; }
    fetch(`${API_URL}/indonesia/villages/${selectedDistrictCode}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setVillages(d.data); })
      .catch(() => {});
    setSelectedVillageCode("");
  }, [selectedDistrictCode]);

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/mitra/register", data);
      return response.data;
    },
    onSuccess: () => {
      router.push("/daftar-mitra/sukses");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mendaftarkan mitra");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (index: number, field: keyof BankAccount, value: string) => {
    setBankAccounts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBankAccount = () => {
    setBankAccounts((prev) => [...prev, { bankName: "", accountNumber: "", accountHolderName: "" }]);
  };

  const removeBankAccount = (index: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentUpload = useCallback(async (
    field: keyof DocumentUrls,
    file: File
  ) => {
    setUploadingDoc(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/mitra/upload-document`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Upload gagal");
      setDocumentUrls((prev) => ({ ...prev, [field]: data.data.url }));
      toast.success("Dokumen berhasil diupload");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload dokumen");
    } finally {
      setUploadingDoc(null);
    }
  }, []);

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
    if (!formData.email) {
      toast.error("Email wajib diisi");
      return;
    }

    const validBankAccounts = bankAccounts.filter(
      (acc) => acc.bankName && acc.accountNumber && acc.accountHolderName
    );

    const payload: any = {
      name: formData.name,
      picName: formData.picName,
      email: formData.email,
    };

    if (formData.description) payload.description = formData.description;
    if (formData.picPosition) payload.picPosition = formData.picPosition;
    if (formData.phone) payload.phone = formData.phone;
    if (formData.whatsappNumber) payload.whatsappNumber = formData.whatsappNumber;
    if (formData.website) payload.website = formData.website;
    if (formData.detailAddress) payload.detailAddress = formData.detailAddress;
    if (selectedProvinceCode) payload.provinceCode = selectedProvinceCode;
    if (selectedRegencyCode) payload.regencyCode = selectedRegencyCode;
    if (selectedDistrictCode) payload.districtCode = selectedDistrictCode;
    if (selectedVillageCode) payload.villageCode = selectedVillageCode;
    if (documentUrls.ktpUrl) payload.ktpUrl = documentUrls.ktpUrl;
    if (documentUrls.bankBookUrl) payload.bankBookUrl = documentUrls.bankBookUrl;
    if (documentUrls.npwpUrl) payload.npwpUrl = documentUrls.npwpUrl;
    if (validBankAccounts.length > 0) payload.bankAccounts = validBankAccounts;

    registerMutation.mutate(payload);
  };

  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:bg-gray-50 disabled:text-gray-400";
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <>
      <Navbar />
      <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Daftar Mitra" }]} />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Daftar Mitra Lembaga</h1>
            <p className="text-gray-600 mt-2">
              Bergabung sebagai mitra lembaga untuk membuat dan mengelola program di platform kami.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Identitas Lembaga */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Identitas Lembaga</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lembaga <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="name" required minLength={3} value={formData.name} onChange={handleChange} className={inputClass} placeholder="Nama lembaga" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className={inputClass} placeholder="Deskripsi singkat tentang lembaga..." />
                </div>
              </div>
            </div>

            {/* Penanggung Jawab */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Penanggung Jawab</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Penanggung Jawab <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="picName" required minLength={2} value={formData.picName} onChange={handleChange} className={inputClass} placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                  <input type="text" name="picPosition" value={formData.picPosition} onChange={handleChange} className={inputClass} placeholder="Contoh: Ketua, Direktur" />
                </div>
              </div>
            </div>

            {/* Kontak */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Kontak</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} className={inputClass} placeholder="email@lembaga.org" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="08xxxxxxxxxx" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                    <input type="tel" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} className={inputClass} placeholder="08xxxxxxxxxx" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="text" name="website" value={formData.website} onChange={handleChange} className={inputClass} placeholder="https://www.lembaga.org" />
                </div>
              </div>
            </div>

            {/* Alamat */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Alamat</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detail Alamat</label>
                  <textarea name="detailAddress" rows={2} value={formData.detailAddress} onChange={handleChange} className={inputClass} placeholder="Jalan, nomor, RT/RW, gedung..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                    <select value={selectedProvinceCode} onChange={(e) => setSelectedProvinceCode(e.target.value)} className={selectClass}>
                      <option value="">Pilih Provinsi</option>
                      {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten / Kota</label>
                    <select value={selectedRegencyCode} onChange={(e) => setSelectedRegencyCode(e.target.value)} disabled={!selectedProvinceCode} className={selectClass}>
                      <option value="">Pilih Kabupaten/Kota</option>
                      {regencies.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                    <select value={selectedDistrictCode} onChange={(e) => setSelectedDistrictCode(e.target.value)} disabled={!selectedRegencyCode} className={selectClass}>
                      <option value="">Pilih Kecamatan</option>
                      {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desa / Kelurahan</label>
                    <select value={selectedVillageCode} onChange={(e) => setSelectedVillageCode(e.target.value)} disabled={!selectedDistrictCode} className={selectClass}>
                      <option value="">Pilih Desa/Kelurahan</option>
                      {villages.map((v) => <option key={v.code} value={v.code}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Rekening Bank */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Rekening Bank</h2>
              <div className="space-y-4">
                {bankAccounts.map((acc, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Rekening {index + 1}</span>
                      {bankAccounts.length > 1 && (
                        <button type="button" onClick={() => removeBankAccount(index)} className="text-sm text-red-600 hover:text-red-700">Hapus</button>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nama Bank</label>
                      <input type="text" value={acc.bankName} onChange={(e) => handleBankChange(index, "bankName", e.target.value)} className={inputClass} placeholder="Contoh: BCA, Mandiri, BSI" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nomor Rekening</label>
                      <input type="text" value={acc.accountNumber} onChange={(e) => handleBankChange(index, "accountNumber", e.target.value)} className={inputClass} placeholder="Nomor rekening" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nama Pemilik Rekening</label>
                      <input type="text" value={acc.accountHolderName} onChange={(e) => handleBankChange(index, "accountHolderName", e.target.value)} className={inputClass} placeholder="Nama sesuai buku rekening" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addBankAccount} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  + Tambah Rekening
                </button>
              </div>
            </div>

            {/* Dokumen Pendukung */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dokumen Pendukung</h2>
              <p className="text-sm text-gray-500 mb-4">Upload dokumen dalam format gambar (JPG/PNG) atau PDF. Maks 5MB gambar, 10MB PDF.</p>
              <div className="space-y-5">
                {(["ktpUrl", "bankBookUrl", "npwpUrl"] as const).map((field) => {
                  const labels: Record<string, string> = {
                    ktpUrl: "KTP Penanggung Jawab",
                    bankBookUrl: "Buku Rekening",
                    npwpUrl: "NPWP",
                  };
                  const isUploading = uploadingDoc === field;
                  const uploaded = !!documentUrls[field];
                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{labels[field]}</label>
                      <div className="flex items-center gap-3">
                        <label className={`flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${uploaded ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-primary-400 hover:bg-primary-50"} ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleDocumentUpload(field, file);
                              e.target.value = "";
                            }}
                          />
                          <svg className={`w-4 h-4 flex-shrink-0 ${uploaded ? "text-green-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {uploaded
                              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            }
                          </svg>
                          <span className={`text-sm ${uploaded ? "text-green-700 font-medium" : "text-gray-500"}`}>
                            {isUploading ? "Mengupload..." : uploaded ? "Dokumen terupload ✓" : "Klik untuk upload file"}
                          </span>
                        </label>
                        {uploaded && (
                          <button
                            type="button"
                            onClick={() => setDocumentUrls((prev) => ({ ...prev, [field]: "" }))}
                            className="text-xs text-red-600 hover:text-red-700 whitespace-nowrap"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="p-6">
              <button type="submit" disabled={registerMutation.isPending || uploadingDoc !== null} className="w-full py-3 px-6 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                {registerMutation.isPending ? "Mengirim..." : "Daftar sebagai Mitra"}
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Pendaftaran akan diverifikasi oleh admin. Anda akan dihubungi melalui email setelah verifikasi selesai.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
