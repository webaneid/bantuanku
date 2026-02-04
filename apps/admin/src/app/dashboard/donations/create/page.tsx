"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PlusIcon, CloudArrowUpIcon, PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import DonorModal from "@/components/modals/DonorModal";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function CreateDonationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [donaturId, setDonaturId] = useState("");
  const [showDonaturModal, setShowDonaturModal] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{ url: string; filename: string }>>([]);
  const [formData, setFormData] = useState({
    campaignId: "",
    amount: "",
    isAnonymous: false,
    message: "",
    paymentMethodId: "",
    paymentStatus: "success", // Default to success for manual donations
  });

  // Fetch donaturs
  const { data: donaturData } = useQuery({
    queryKey: ["donatur-list"],
    queryFn: async () => {
      const response = await api.get("/admin/donatur", {
        params: { limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  const donaturOptions = donaturData?.map((donatur: any) => ({
    value: donatur.id,
    label: `${donatur.name} - ${donatur.email}`,
  })) || [];

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

  const selectedCampaign = campaignsData?.find((c: any) => c.id === formData.campaignId);

  // Fetch payment methods from database
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

  const filteredPaymentMethods = (() => {
    const methods = paymentMethodsData || [];
    const bankMethods = methods.filter((m: any) => m.type === "bank_transfer");
    const qrisMethods = methods.filter((m: any) => m.type === "qris");

    const hasWakafBanks = bankMethods.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("wakaf");
    });
    const hasWakafQris = qrisMethods.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("wakaf");
    });

    const isWakafCampaign = selectedCampaign?.pillar === "wakaf";

    return methods.filter((method: any) => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];

      if (method.type === "bank_transfer") {
        if (isWakafCampaign) {
          if (hasWakafBanks) return programs.includes("wakaf");
          return programs.includes("general");
        }
        return programs.includes("infaq") || programs.includes("general");
      }

      if (method.type === "qris") {
        if (isWakafCampaign) {
          if (hasWakafQris) return programs.includes("wakaf");
          return programs.includes("general");
        }
        return programs.includes("infaq") || programs.includes("general");
      }

      // Non-bank, non-qris: tetap tampil
      return true;
    });
  })();

  const paymentMethodOptions = filteredPaymentMethods.map((method: any) => {
    const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];
    const programLabel = programs.join(", ");
    const owner = method.details?.accountName ? ` - a.n ${method.details.accountName}` : "";
    return {
      value: method.code, // Gunakan code, bukan id (karena sekarang simpan sebagai string)
      label: method.type === "bank_transfer"
        ? `${method.name}${owner} [${programLabel}]`
        : method.name,
    };
  });

  const paymentStatusOptions = [
    { value: "success", label: "Success (Terbayar)" },
    { value: "pending", label: "Pending (Menunggu Pembayaran)" },
    { value: "failed", label: "Failed (Gagal)" },
    { value: "expired", label: "Expired (Kadaluarsa)" },
  ];

  // Create donation mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/admin/donations", {
        ...data,
        amount: parseInt(data.amount),
      });
    },
    onSuccess: async (response) => {
      const donationId = response.data?.data?.id;

      // Upload evidences if any
      if (evidenceFiles.length > 0) {
        try {
          for (const file of evidenceFiles) {
            const ext = file.filename.split(".").pop()?.toLowerCase();
            let type = "other";
            if (ext === "pdf" || ["jpg", "jpeg", "png"].includes(ext || "")) {
              type = "proof_of_payment";
            }

            await api.post(`/admin/donations/${donationId}/evidence`, {
              type,
              title: file.filename,
              fileUrl: file.url,
            });
          }
        } catch (error) {
          console.error("Error uploading evidence:", error);
          toast.error("Donasi berhasil dibuat, tapi gagal upload bukti transfer");
        }
      }

      toast.success("Donasi berhasil dibuat!");
      // Redirect to detail page
      router.push(`/dashboard/donations/${donationId}`);
    },
    onError: (error: any) => {
      const issues =
        error.response?.data?.issues ||
        error.response?.data?.error ||
        error.response?.data?.message;
      const msg = Array.isArray(issues) && issues.length > 0
        ? `${issues[0]?.path?.join(".") || "field"}: ${issues[0]?.message || "tidak valid"}`
        : typeof issues === "string"
          ? issues
          : issues
            ? JSON.stringify(issues)
            : "Gagal membuat donasi";
      toast.error(msg);
    },
  });

  const handleDonaturSuccess = (createdId?: string) => {
    toast.success("Donatur berhasil dibuat!");
    queryClient.invalidateQueries({ queryKey: ["donatur-list"] });
    if (createdId) {
      setDonaturId(createdId);
    }
    setShowDonaturModal(false);
  };

  const handleMediaSelect = (url: string) => {
    const filename = url.split("/").pop() || "Bukti Transfer";
    setEvidenceFiles([...evidenceFiles, { url, filename }]);
    setIsMediaLibraryOpen(false);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.campaignId) {
      toast.error("Campaign harus dipilih");
      return;
    }

    if (!formData.amount || parseInt(formData.amount) < 1000) {
      toast.error("Nominal donasi minimal Rp 1.000");
      return;
    }

    // Payment method required jika status success
    if (formData.paymentStatus === "success" && !formData.paymentMethodId) {
      toast.error("Metode pembayaran wajib diisi untuk status Success");
      return;
    }

    if (!formData.isAnonymous && !donaturId) {
      toast.error("Pilih donatur atau centang 'Donasi Anonim'");
      return;
    }

    // Get selected donatur data
    const selectedDonatur = donaturData?.find((d: any) => d.id === donaturId);

    // Debug log untuk troubleshooting
    console.log("=== DONATION FORM SUBMIT DEBUG ===");
    console.log("donaturId:", donaturId);
    console.log("selectedDonatur:", selectedDonatur);
    console.log("isAnonymous:", formData.isAnonymous);

    // Pastikan donorName tidak kosong
    let donorName = "Anonim";
    if (formData.isAnonymous) {
      donorName = "Hamba Allah";
    } else if (selectedDonatur) {
      donorName = selectedDonatur.name;
    }

    // Validation final: pastikan donorName ada dan valid
    if (!donorName || donorName.length < 2) {
      toast.error("Nama donatur tidak valid. Silakan pilih donatur yang valid.");
      console.error("Invalid donorName:", donorName);
      return;
    }

    const donationData = {
      campaignId: formData.campaignId,
      amount: parseInt(formData.amount),
      donaturId: donaturId || null,
      donorName: donorName,
      donorEmail: selectedDonatur?.email || undefined,
      donorPhone: selectedDonatur?.phone || undefined,
      isAnonymous: formData.isAnonymous,
      message: formData.message || "",
      paymentMethodId: formData.paymentMethodId || undefined, // kosongkan jika tidak dipilih
      paymentStatus: formData.paymentStatus, // Status pembayaran
    };

    console.log("Donation data to be sent:", donationData);
    createMutation.mutate(donationData);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/donations")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali ke Daftar Donasi
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Donasi</h1>
        <p className="text-gray-600 mt-1">Buat transaksi donasi manual</p>
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

          {/* Donatur Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Data Donatur</h3>
              <button
                type="button"
                onClick={() => setShowDonaturModal(true)}
                className="btn btn-secondary btn-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Tambah Donatur Baru
              </button>
            </div>

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

              {/* Donatur Selection */}
              {!formData.isAnonymous && (
                <div className="form-field">
                  <label className="form-label">
                    Pilih Donatur <span className="text-danger-500">*</span>
                  </label>
                  <Autocomplete
                    options={donaturOptions}
                    value={donaturId}
                    onChange={setDonaturId}
                    placeholder="Cari donatur berdasarkan nama atau email"
                    allowClear={false}
                  />
                </div>
              )}
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
                <p className="text-xs text-gray-500 mt-1">Minimal donasi Rp 10.000</p>
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
                  Pilih "Success" untuk donasi yang sudah terbayar
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

            {evidenceFiles.length > 0 ? (
              <div className="space-y-2">
                {evidenceFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <PaperClipIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.filename}
                      </p>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                    >
                      Lihat
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(index)}
                      className="text-danger-600 hover:text-danger-700 flex-shrink-0"
                    >
                      <XMarkIcon className="w-4 h-4" />
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
              onClick={() => router.push("/dashboard/donations")}
              disabled={createMutation.isPending}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={createMutation.isPending || (!formData.isAnonymous && !donaturId)}
            >
              {createMutation.isPending ? "Menyimpan..." : "Buat Donasi"}
            </button>
          </div>
        </form>
      </div>

      {/* Donor Modal */}
      <DonorModal
        isOpen={showDonaturModal}
        onClose={() => setShowDonaturModal(false)}
        onSuccess={handleDonaturSuccess}
        disablePassword={true}
      />

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
