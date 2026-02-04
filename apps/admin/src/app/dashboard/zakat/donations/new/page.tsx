"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import DonorModal from "@/components/modals/DonorModal";
import { toast } from "react-hot-toast";

export default function NewZakatDonationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [donaturId, setDonaturId] = useState("");
  const [zakatTypeId, setZakatTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{ url: string; filename: string }>>([]);
  const [notes, setNotes] = useState("");

  // Modal states
  const [showDonaturModal, setShowDonaturModal] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // Fetch donatur options
  const { data: donaturData, isLoading: isLoadingDonatur } = useQuery({
    queryKey: ["donatur-list"],
    queryFn: async () => {
      const response = await api.get("/admin/donatur", {
        params: { limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch zakat types
  const { data: zakatTypesData, isLoading: isLoadingZakatTypes } = useQuery({
    queryKey: ["zakat-types-active"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { isActive: "true", limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
      return response.data?.data || [];
    },
  });

  // Prepare autocomplete options
  const donaturOptions = donaturData?.map((donatur: any) => ({
    value: donatur.id,
    label: `${donatur.name} - ${donatur.email || donatur.phone || ""}`,
  })) || [];

  const zakatTypeOptions = zakatTypesData?.map((type: any) => ({
    value: type.id,
    label: `${type.icon || ""} ${type.name}`,
  })) || [];

  const paymentStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "success", label: "Berhasil" },
    { value: "failed", label: "Gagal" },
    { value: "expired", label: "Kadaluarsa" },
  ];

  const paymentMethodOptions = (() => {
    const methods = paymentMethodsData || [];
    const bankMethods = methods.filter((m: any) => m.type === "bank_transfer");
    const hasZakatBanks = bankMethods.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("zakat");
    });

    const allowedBanks = bankMethods.filter((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      if (hasZakatBanks) {
        return programs.includes("zakat");
      }
      return programs.includes("general");
    });

    const otherMethods = methods.filter((m: any) => m.type !== "bank_transfer");
    const filtered = [...allowedBanks, ...otherMethods];

    return filtered.map((method: any) => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];
      const programLabel = programs.join(", ");
      const owner = method.details?.accountName ? ` - a.n ${method.details.accountName}` : "";
      return {
        value: method.code,
        label: method.type === "bank_transfer"
          ? `${method.name}${owner} [${programLabel}]`
          : method.name,
      };
    });
  })();

  // Create donation mutation
  const createDonationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/zakat/donations", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-donations"] });
      toast.success("Pembayaran zakat berhasil dicatat!");
      router.push("/dashboard/zakat/donations");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal mencatat pembayaran zakat");
    },
  });

  const handleDonaturSuccess = (createdId?: string) => {
    toast.success("Muzaki berhasil dibuat!");
    queryClient.invalidateQueries({ queryKey: ["donatur-list"] });
    if (createdId) {
      setDonaturId(createdId);
    }
    setShowDonaturModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!donaturId) {
      toast.error("Donatur harus dipilih");
      return;
    }
    if (!zakatTypeId) {
      toast.error("Jenis zakat harus dipilih");
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }

    // Get donatur data untuk ambil nama, email, phone
    const selectedDonatur = donaturData?.find((d: any) => d.id === donaturId);
    
    if (!selectedDonatur) {
      toast.error("Data donatur tidak ditemukan");
      return;
    }

    const payload = {
      donaturId,
      donorName: selectedDonatur.name,
      donorEmail: selectedDonatur.email || undefined,
      donorPhone: selectedDonatur.phone || undefined,
      zakatTypeId,
      amount: parseInt(amount),
      paymentStatus,
      paymentMethodId: paymentMethodId || undefined,
      paymentReference: evidenceFiles.length > 0 ? evidenceFiles[0].url : undefined,
      notes: notes || undefined,
      paidAt: paymentStatus === "success" ? new Date().toISOString() : null,
    };

    createDonationMutation.mutate(payload);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    router.push("/dashboard/zakat/donations");
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
      {/* Header */}
      <div className="form-page-header">
        <button className="btn btn-secondary btn-md" onClick={handleCancel}>
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>

        <div className="form-page-header-content">
          <h1 className="form-page-title">Catat Pembayaran Zakat Baru</h1>
          <p className="form-page-subtitle">
            Input manual pembayaran zakat dari backend
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <form id="zakat-donation-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Informasi Pembayaran</h3>
            <div className="form-grid">
              {/* Muzaki */}
              <div className="form-group col-span-2">
                <label className="form-label">
                  Muzaki <span className="text-danger-600">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Autocomplete
                      options={donaturOptions}
                      value={donaturId}
                      onChange={setDonaturId}
                      placeholder="Pilih donatur atau ketik untuk mencari..."
                      isLoading={isLoadingDonatur}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={() => setShowDonaturModal(true)}
                  >
                    + Tambah Muzaki
                  </button>
                </div>
              </div>

              {/* Jenis Zakat */}
              <div className="form-group">
                <label className="form-label">
                  Jenis Zakat <span className="text-danger-600">*</span>
                </label>
                <Autocomplete
                  options={zakatTypeOptions}
                  value={zakatTypeId}
                  onChange={setZakatTypeId}
                  placeholder="Pilih jenis zakat..."
                  isLoading={isLoadingZakatTypes}
                />
              </div>

              {/* Amount */}
              <div className="form-group">
                <label htmlFor="amount" className="form-label">
                  Jumlah (Rp) <span className="text-danger-600">*</span>
                </label>
                <input
                  id="amount"
                  type="number"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  required
                />
              </div>

              {/* Payment Status */}
              <div className="form-group">
                <label className="form-label">
                  Status Pembayaran <span className="text-danger-600">*</span>
                </label>
                <Autocomplete
                  options={paymentStatusOptions}
                  value={paymentStatus}
                  onChange={setPaymentStatus}
                  placeholder="Pilih status pembayaran..."
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Metode Pembayaran</label>
                <Autocomplete
                  options={paymentMethodOptions}
                  value={paymentMethodId}
                  onChange={setPaymentMethodId}
                  placeholder="Pilih metode pembayaran..."
                  isLoading={isLoadingPaymentMethods}
                />
              </div>

              {/* Evidence Upload */}
              <div className="form-group col-span-2">
                <label className="form-label">Bukti Pembayaran (Opsional)</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-md w-full"
                  onClick={() => setIsMediaLibraryOpen(true)}
                >
                  + Upload Bukti Pembayaran
                </button>
                {evidenceFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {evidenceFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                      >
                        <span className="text-sm truncate">{file.filename}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleRemoveEvidence(index)}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="form-group col-span-2">
                <label htmlFor="notes" className="form-label">
                  Catatan
                </label>
                <textarea
                  id="notes"
                  className="form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Form Actions */}
        <div className="form-page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={handleCancel}
            disabled={createDonationMutation.isPending}
          >
            Batal
          </button>
          <button
            type="submit"
            form="zakat-donation-form"
            className="btn btn-primary btn-lg"
            disabled={createDonationMutation.isPending}
          >
            {createDonationMutation.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
          </button>
        </div>
      </div>

      {/* Donor Modal */}
      <DonorModal
        isOpen={showDonaturModal}
        onClose={() => setShowDonaturModal(false)}
        onSuccess={handleDonaturSuccess}
        disablePassword={true}
      />

      {/* Media Library */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(url) => {
          const filename = url.split("/").pop() || "file";
          setEvidenceFiles((prev) => [...prev, { url, filename }]);
          setIsMediaLibraryOpen(false);
        }}
        category="financial"
      />
      </div>
    </main>
  );
}
