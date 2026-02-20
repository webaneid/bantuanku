"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import toast from "@/lib/feedback-toast";
import api from "@/lib/api";
import { Header as Navbar, Footer } from "@/components/organisms";

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
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
    ktpUrl: "",
    bankBookUrl: "",
    npwpUrl: "",
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { bankName: "", accountNumber: "", accountHolderName: "" },
  ]);

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
    if (formData.ktpUrl) payload.ktpUrl = formData.ktpUrl;
    if (formData.bankBookUrl) payload.bankBookUrl = formData.bankBookUrl;
    if (formData.npwpUrl) payload.npwpUrl = formData.npwpUrl;
    if (validBankAccounts.length > 0) payload.bankAccounts = validBankAccounts;

    registerMutation.mutate(payload);
  };

  return (
    <>
      <Navbar />
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
                  <input
                    type="text"
                    name="name"
                    required
                    minLength={3}
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nama lembaga"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Deskripsi singkat tentang lembaga..."
                  />
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
                  <input
                    type="text"
                    name="picName"
                    required
                    minLength={2}
                    value={formData.picName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Nama lengkap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    name="picPosition"
                    value={formData.picPosition}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Contoh: Ketua, Direktur"
                  />
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
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="email@lembaga.org"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://www.lembaga.org"
                  />
                </div>
              </div>
            </div>

            {/* Alamat */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Alamat</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                <textarea
                  name="detailAddress"
                  rows={3}
                  value={formData.detailAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Alamat lengkap lembaga..."
                />
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
                        <button
                          type="button"
                          onClick={() => removeBankAccount(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nama Bank</label>
                      <input
                        type="text"
                        value={acc.bankName}
                        onChange={(e) => handleBankChange(index, "bankName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Contoh: BCA, Mandiri, BSI"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={acc.accountNumber}
                        onChange={(e) => handleBankChange(index, "accountNumber", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Nomor rekening"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Nama Pemilik Rekening</label>
                      <input
                        type="text"
                        value={acc.accountHolderName}
                        onChange={(e) => handleBankChange(index, "accountHolderName", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Nama sesuai buku rekening"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBankAccount}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  + Tambah Rekening
                </button>
              </div>
            </div>

            {/* Dokumen Pendukung */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dokumen Pendukung</h2>
              <p className="text-sm text-gray-500 mb-4">Unggah dokumen dalam bentuk URL gambar (opsional)</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KTP Penanggung Jawab</label>
                  <input
                    type="text"
                    name="ktpUrl"
                    value={formData.ktpUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="URL gambar KTP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buku Rekening</label>
                  <input
                    type="text"
                    name="bankBookUrl"
                    value={formData.bankBookUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="URL gambar buku rekening"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
                  <input
                    type="text"
                    name="npwpUrl"
                    value={formData.npwpUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="URL gambar NPWP"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="p-6">
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full py-3 px-6 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
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
