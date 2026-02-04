"use client";

import { useState, useEffect, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CloudArrowUpIcon, PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function EditDonationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id: donationId } = use(params);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  const [formData, setFormData] = useState({
    campaignId: "",
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    amount: "",
    isAnonymous: false,
    message: "",
    paymentMethodId: "",
    paymentStatus: "",
  });

  // Fetch donation
  const { data: donation, isLoading: isLoadingDonation } = useQuery({
    queryKey: ["donation", donationId],
    queryFn: async () => {
      const response = await api.get(`/admin/donations/${donationId}`);
      return response.data?.data;
    },
  });

  // Populate form when donation data is loaded
  useEffect(() => {
    if (donation) {
      setFormData({
        campaignId: donation.campaignId || "",
        donorName: donation.donorName || "",
        donorEmail: donation.donorEmail || "",
        donorPhone: donation.donorPhone || "",
        amount: donation.amount?.toString() || "",
        isAnonymous: donation.isAnonymous || false,
        message: donation.message || "",
        paymentMethodId: donation.paymentMethodId || "",
        paymentStatus: donation.paymentStatus || "pending",
      });
    }
  }, [donation]);

  // Fetch campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns", {
        params: { page: 1, limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  const campaignOptions = campaignsData?.map((campaign: any) => ({
    value: campaign.id,
    label: campaign.title,
  })) || [];

  // Fetch payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      try {
        const response = await api.get("/payments/methods");
        return response.data?.data || [];
      } catch (error) {
        console.error("Payment methods API error:", error);
        return [];
      }
    },
  });

  const paymentMethodOptions = (paymentMethodsData || []).map((method: any) => ({
    value: method.code, // Gunakan code, bukan id
    label: method.name,
  }));

  const paymentStatusOptions = [
    { value: "success", label: "Success (Terbayar)" },
    { value: "pending", label: "Pending (Menunggu Pembayaran)" },
    { value: "failed", label: "Failed (Gagal)" },
    { value: "expired", label: "Expired (Kadaluarsa)" },
  ];

  // Fetch evidences
  const { data: evidences } = useQuery({
    queryKey: ["donation-evidences", donationId],
    queryFn: async () => {
      const response = await api.get(`/admin/donations/${donationId}/evidence`);
      return response.data?.data || [];
    },
  });

  // Upload evidence mutation
  const uploadEvidenceMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; fileUrl: string }) => {
      return api.post(`/admin/donations/${donationId}/evidence`, data);
    },
    onSuccess: () => {
      toast.success("Bukti transfer berhasil diupload!");
      queryClient.invalidateQueries({ queryKey: ["donation-evidences", donationId] });
      setIsMediaLibraryOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal upload bukti");
    },
  });

  // Delete evidence mutation
  const deleteEvidenceMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      return api.delete(`/admin/donations/${donationId}/evidence/${evidenceId}`);
    },
    onSuccess: () => {
      toast.success("Bukti transfer berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["donation-evidences", donationId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal hapus bukti");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.put(`/admin/donations/${donationId}`, {
        ...data,
        amount: parseInt(data.amount),
      });
    },
    onSuccess: () => {
      toast.success("Donasi berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["donation", donationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-donations"] });
      router.push(`/dashboard/donations/${donationId}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal memperbarui donasi");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleMediaSelect = async (url: string) => {
    const filename = url.split("/").pop() || "Bukti Transfer";
    const ext = filename.split(".").pop()?.toLowerCase();

    let type = "other";
    if (ext === "pdf" || ["jpg", "jpeg", "png"].includes(ext || "")) {
      type = "proof_of_payment";
    }

    uploadEvidenceMutation.mutate({
      type,
      title: filename,
      fileUrl: url,
    });
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    if (confirm("Hapus bukti transfer ini?")) {
      deleteEvidenceMutation.mutate(evidenceId);
    }
  };

  if (isLoadingDonation) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500">Donasi tidak ditemukan</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/donations")}
            className="btn btn-primary btn-md mt-4"
          >
            Kembali ke Daftar Donasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/donations/${donationId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali ke Detail Donasi
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Donasi</h1>
        <p className="text-gray-600 mt-1">Perbarui informasi transaksi donasi</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campaign Selection */}
          <div className="form-field">
            <label className="form-label">
              Campaign <span className="text-danger-500">*</span>
            </label>
            <Autocomplete
              options={campaignOptions}
              value={formData.campaignId}
              onChange={(value) => setFormData({ ...formData, campaignId: value })}
              placeholder="Pilih Campaign"
              allowClear={false}
            />
          </div>

          {/* Data Donatur Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Donatur</h3>

            <div className="space-y-4">
              {/* Anonymous Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isAnonymous" className="text-sm font-medium text-gray-700">
                  Donasi Anonim (Hamba Allah)
                </label>
              </div>

              {/* Donor Name */}
              <div className="form-field">
                <label className="form-label">
                  Nama Donatur <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.donorName}
                  onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  required
                  disabled={formData.isAnonymous}
                />
              </div>

              {/* Donor Email */}
              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.donorEmail}
                  onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
                  placeholder="email@contoh.com"
                  disabled={formData.isAnonymous}
                />
              </div>

              {/* Donor Phone */}
              <div className="form-field">
                <label className="form-label">Nomor HP</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.donorPhone}
                  onChange={(e) => setFormData({ ...formData, donorPhone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  disabled={formData.isAnonymous}
                />
              </div>
            </div>
          </div>

          {/* Donation Details Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Donasi</h3>

            <div className="space-y-4">
              {/* Amount */}
              <div className="form-field">
                <label className="form-label">
                  Nominal Donasi <span className="text-danger-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    className="form-input !pl-14"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100000"
                    required
                    min="1000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimal donasi Rp 1.000</p>
              </div>

              {/* Payment Method */}
              <div className="form-field">
                <label className="form-label">Metode Pembayaran</label>
                <Autocomplete
                  options={paymentMethodOptions}
                  value={formData.paymentMethodId}
                  onChange={(value) => setFormData({ ...formData, paymentMethodId: value })}
                  placeholder="Pilih Metode Pembayaran (Opsional)"
                />
              </div>

              {/* Payment Status */}
              <div className="form-field">
                <label className="form-label">
                  Status Pembayaran <span className="text-danger-500">*</span>
                </label>
                <Autocomplete
                  options={paymentStatusOptions}
                  value={formData.paymentStatus}
                  onChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                  placeholder="Pilih Status Pembayaran"
                  allowClear={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ubah status menjadi "Success" jika pembayaran sudah diterima
                </p>
              </div>

              {/* Message */}
              <div className="form-field">
                <label className="form-label">Pesan / Doa</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tulis pesan atau doa untuk campaign ini..."
                />
              </div>
            </div>
          </div>

          {/* Bukti Transfer Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bukti Transfer</h3>
                <p className="text-sm text-gray-600 mt-1">Upload bukti pembayaran (opsional)</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaLibraryOpen(true)}
                className="btn btn-sm btn-secondary"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                Upload Bukti
              </button>
            </div>

            {evidences && evidences.length > 0 ? (
              <div className="space-y-2">
                {evidences.map((evidence: any) => (
                  <div
                    key={evidence.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <PaperClipIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {evidence.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(evidence.uploadedAt), "dd MMM yyyy HH:mm", {
                          locale: idLocale,
                        })}
                      </p>
                    </div>
                    <a
                      href={evidence.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                    >
                      Lihat
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvidence(evidence.id)}
                      className="text-danger-600 hover:text-danger-700 flex-shrink-0"
                      disabled={deleteEvidenceMutation.isPending}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                <p className="font-medium">Belum ada bukti transfer</p>
                <p className="mt-1 text-xs">Upload bukti pembayaran untuk melengkapi data donasi</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => router.push(`/dashboard/donations/${donationId}`)}
              disabled={updateMutation.isPending}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        category="financial"
        accept="image/*,application/pdf"
      />
    </div>
  );
}
