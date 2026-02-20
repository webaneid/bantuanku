"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeftIcon, CheckIcon, XMarkIcon, BanknotesIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { use, useState, useEffect } from "react";
import { getCategoryLabel } from "@/lib/category-utils";
import MediaLibrary from "@/components/MediaLibrary";
import AdminPaymentMethodList from "@/components/AdminPaymentMethodList";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useAuth } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Dibayar",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-purple-100 text-purple-800",
};

export default function DisbursementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdminCampaign = user?.roles?.includes("admin_campaign") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance");
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);
  const [paymentData, setPaymentData] = useState({
    destination_bank_id: "",
    transfer_proof_url: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    transferred_amount: 0,
    additional_fees: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["disbursement", id],
    queryFn: async () => {
      const response = await api.get(`/admin/disbursements/${id}`);
      return response.data;
    },
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ["bank-accounts-source"],
    queryFn: async () => {
      const response = await api.get("/admin/bank-accounts/source");
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, rejection_reason }: { status: string; rejection_reason?: string }) => {
      const response = await api.patch(`/admin/disbursements/${id}/status`, {
        status,
        rejection_reason,
      });
      return response.data;
    },
    onSuccess: (_response, variables) => {
      const messageByStatus: Record<string, string> = {
        submitted: "Pencairan berhasil diajukan",
        approved: "Pencairan berhasil disetujui",
        rejected: "Pencairan berhasil ditolak",
      };

      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: messageByStatus[variables.status] || "Status pencairan berhasil diperbarui",
      });
      setShowApproveModal(false);
      setShowRejectModal(false);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || err.message || "Gagal memperbarui status pencairan",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/disbursements/${id}`);
    },
    onSuccess: () => {
      setShowDeleteModal(false);
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pencairan berhasil dihapus",
      });
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || err.message || "Gagal menghapus pencairan",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (data: typeof paymentData) => {
      const response = await api.post(`/admin/disbursements/${id}/mark-paid`, data);
      return response.data;
    },
    onSuccess: () => {
      setShowPaymentConfirmModal(false);
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
      setShowPaymentForm(false);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pembayaran pencairan berhasil dikonfirmasi",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || err.message || "Gagal mengonfirmasi pembayaran",
      });
    },
  });

  const disbursement = data?.data;
  const bankAccounts = bankAccountsData?.data || [];

  useEffect(() => {
    if (disbursement) {
      setPaymentData({
        destination_bank_id: disbursement.sourceBankId || "",
        transfer_proof_url: "",
        transfer_date: new Date().toISOString().slice(0, 10),
        transferred_amount: disbursement.amount || 0,
        additional_fees: 0,
      });
    }
  }, [disbursement]);

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

  if (!disbursement) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-600">Pencairan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = () => {
    updateStatusMutation.mutate({ status: "submitted" });
  };

  const handleApprove = () => {
    setShowApproveModal(true);
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handlePay = () => {
    setShowPaymentForm(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPaymentConfirmModal(true);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleMediaSelect = (url: string) => {
    setPaymentData({ ...paymentData, transfer_proof_url: url });
    setIsMediaLibraryOpen(false);
  };

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detail Pencairan</h1>
          <p className="text-gray-600 mt-1">{disbursement.disbursementNumber}</p>
        </div>
        <span
          className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
            STATUS_COLORS[disbursement.status]
          }`}
        >
          {STATUS_LABELS[disbursement.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pencairan</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tipe</p>
                <p className="font-medium capitalize">{disbursement.disbursementType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kategori</p>
                <p className="font-medium">{getCategoryLabel(disbursement.category)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Referensi</p>
                <p className="font-medium">{disbursement.referenceName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Jumlah</p>
                <p className="text-lg font-bold text-primary-600">
                  {formatCurrency(disbursement.amount)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Sumber</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bank</p>
                <p className="font-medium">{disbursement.sourceBankName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nomor Rekening</p>
                <p className="font-medium">{disbursement.sourceBankAccount}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Penerima</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nama</p>
                <p className="font-medium">{disbursement.recipientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipe</p>
                <p className="font-medium capitalize">{disbursement.recipientType || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kontak</p>
                <p className="font-medium">{disbursement.recipientContact || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bank</p>
                <p className="font-medium">{disbursement.recipientBankName || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Nomor Rekening</p>
                <p className="font-medium">
                  {disbursement.recipientBankAccount || "-"}
                  {disbursement.recipientBankAccountName && ` (${disbursement.recipientBankAccountName})`}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tujuan & Deskripsi</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Tujuan</p>
                <p className="font-medium">{disbursement.purpose || "-"}</p>
              </div>
              {disbursement.description && (
                <div>
                  <p className="text-sm text-gray-500">Deskripsi</p>
                  <p className="text-gray-700">{disbursement.description}</p>
                </div>
              )}
              {disbursement.notes && (
                <div>
                  <p className="text-sm text-gray-500">Catatan Internal</p>
                  <p className="text-gray-700">{disbursement.notes}</p>
                </div>
              )}
            </div>
          </div>

          {disbursement.status === "paid" && (
            <div className="card bg-green-50 border border-green-200">
              <h2 className="text-lg font-semibold text-green-900 mb-4">Detail Pembayaran</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-700 font-medium">Total Transfer</p>
                  <p className="text-green-900">{formatCurrency(disbursement.transferredAmount || disbursement.amount)}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Biaya Tambahan</p>
                  <p className="text-green-900">{formatCurrency(disbursement.additionalFees || 0)}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Tanggal Transfer</p>
                  <p className="text-green-900">{formatDate(disbursement.transferDate)}</p>
                </div>
                {disbursement.transferProofUrl && (
                  <div className="col-span-2">
                    <p className="text-green-700 font-medium mb-2">Bukti Transfer</p>
                    <img
                      src={disbursement.transferProofUrl}
                      alt="Bukti Transfer"
                      style={{ width: "100%", height: "auto" }}
                      className="rounded-lg border border-green-200"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {disbursement.rejectionReason && (
            <div className="card bg-red-50 border border-red-200">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Alasan Penolakan</h2>
              <p className="text-red-700">{disbursement.rejectionReason}</p>
            </div>
          )}

          {showPaymentForm && disbursement.status === "approved" && (
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Form Pembayaran</h2>
                <span className="text-xs text-gray-500">
                  Isi detail pembayaran untuk menyelesaikan pencairan
                </span>
              </div>
              <form onSubmit={handleSubmitPayment} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rekening Asal <span className="text-red-500">*</span>
                  </label>
                  <AdminPaymentMethodList
                    value={paymentData.destination_bank_id}
                    onChange={(value) => setPaymentData({ ...paymentData, destination_bank_id: value })}
                    types={["bank_transfer"]}
                    programFilter={(() => {
                      if (disbursement.disbursementType === "campaign") {
                        return "infaq";
                      } else if (disbursement.disbursementType === "zakat") {
                        return "zakat";
                      } else if (disbursement.disbursementType === "qurban") {
                        return "qurban";
                      } else {
                        return "general";
                      }
                    })()}
                    placeholder="Pilih Rekening"
                    allowClear={false}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Rekening yang digunakan untuk melakukan transfer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rekening Tujuan
                  </label>
                  <input
                    type="text"
                    value={`${disbursement.recipientBankName || ""} - ${disbursement.recipientBankAccount || ""} (${disbursement.recipientBankAccountName || ""})`}
                    className="form-input w-full bg-gray-100"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Rekening penerima dari data pengajuan
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Transfer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={paymentData.transferred_amount}
                      onChange={(e) => setPaymentData({ ...paymentData, transferred_amount: parseFloat(e.target.value) })}
                      className="form-input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Transfer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentData.transfer_date}
                      onChange={(e) => setPaymentData({ ...paymentData, transfer_date: e.target.value })}
                      className="form-input w-full"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biaya Tambahan (opsional)
                  </label>
                  <input
                    type="number"
                    value={paymentData.additional_fees}
                    onChange={(e) => setPaymentData({ ...paymentData, additional_fees: parseFloat(e.target.value) || 0 })}
                    className="form-input w-full"
                    placeholder="Contoh: biaya transfer, admin bank, dll"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Biaya tambahan akan dicatat terpisah di ledger
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bukti Transfer <span className="text-red-500">*</span>
                  </label>
                  {paymentData.transfer_proof_url ? (
                    <div className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <img
                            src={paymentData.transfer_proof_url}
                            alt="Bukti Transfer"
                            className="w-full rounded-lg border border-gray-200"
                            style={{ maxHeight: "200px", objectFit: "contain" }}
                          />
                          <p className="text-xs text-gray-500 mt-2 break-all">
                            {paymentData.transfer_proof_url.split("/").pop()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentData({ ...paymentData, transfer_proof_url: "" })}
                          className="text-red-600 hover:text-red-700 text-sm font-medium whitespace-nowrap"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                    >
                      <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Klik untuk upload bukti transfer
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload dari media library (kategori: financial)
                      </p>
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={markAsPaidMutation.isPending || !paymentData.transfer_proof_url}
                    className="btn btn-success flex-1"
                  >
                    {markAsPaidMutation.isPending ? "Memproses..." : "Konfirmasi Pembayaran"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Actions & Timeline */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi</h2>
            <div className="space-y-2">
              {disbursement.status === "draft" && (
                <>
                  <button
                    onClick={handleSubmit}
                    disabled={updateStatusMutation.isPending}
                    className="w-full btn btn-primary"
                  >
                    <CheckIcon className="w-5 h-5" />
                    Ajukan
                  </button>
                </>
              )}

              {["draft", "submitted", "rejected"].includes(disbursement.status) && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="w-full btn btn-danger"
                >
                  {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
                </button>
              )}

              {disbursement.status === "submitted" && !isAdminCampaign && !isCoordinator && !isMitra && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={updateStatusMutation.isPending}
                    className="w-full btn btn-primary"
                  >
                    <CheckIcon className="w-5 h-5" />
                    Setujui
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={updateStatusMutation.isPending}
                    className="w-full btn btn-danger"
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Tolak
                  </button>
                </>
              )}

              {disbursement.status === "approved" && !showPaymentForm && !isAdminCampaign && !isCoordinator && !isMitra && (
                <button
                  onClick={handlePay}
                  disabled={updateStatusMutation.isPending}
                  className="w-full btn btn-primary"
                >
                  <BanknotesIcon className="w-5 h-5" />
                  Tandai Sudah Dibayar
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Dibuat</p>
                <p className="text-sm font-medium">{formatDate(disbursement.createdAt)}</p>
              </div>
              {disbursement.submittedAt && (
                <div>
                  <p className="text-sm text-gray-500">Diajukan</p>
                  <p className="text-sm font-medium">{formatDate(disbursement.submittedAt)}</p>
                </div>
              )}
              {disbursement.approvedAt && (
                <div>
                  <p className="text-sm text-gray-500">Disetujui</p>
                  <p className="text-sm font-medium">{formatDate(disbursement.approvedAt)}</p>
                </div>
              )}
              {disbursement.rejectedAt && (
                <div>
                  <p className="text-sm text-gray-500">Ditolak</p>
                  <p className="text-sm font-medium">{formatDate(disbursement.rejectedAt)}</p>
                </div>
              )}
              {disbursement.paidAt && (
                <div>
                  <p className="text-sm text-gray-500">Dibayar</p>
                  <p className="text-sm font-medium">{formatDate(disbursement.paidAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media Library for Transfer Proof */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        category="financial"
        accept="image/*,application/pdf"
      />

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Setujui Pencairan</h3>
            <p className="text-sm text-gray-600 mb-6">Setujui pencairan ini?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setShowApproveModal(false)}
                disabled={updateStatusMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => updateStatusMutation.mutate({ status: "approved" })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Memproses..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Tolak Pencairan</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="form-input w-full"
              rows={4}
              placeholder="Masukkan alasan penolakan"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={updateStatusMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-md"
                onClick={() =>
                  updateStatusMutation.mutate({
                    status: "rejected",
                    rejection_reason: rejectionReason.trim(),
                  })
                }
                disabled={updateStatusMutation.isPending || !rejectionReason.trim()}
              >
                {updateStatusMutation.isPending ? "Memproses..." : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Hapus Pencairan</h3>
            <p className="text-sm text-gray-600 mb-6">
              Hapus pencairan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-md"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Konfirmasi Pembayaran</h3>
            <p className="text-sm text-gray-600 mb-6">Konfirmasi pembayaran pencairan ini?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setShowPaymentConfirmModal(false)}
                disabled={markAsPaidMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-success btn-md"
                onClick={() => markAsPaidMutation.mutate(paymentData)}
                disabled={markAsPaidMutation.isPending}
              >
                {markAsPaidMutation.isPending ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, open: false }));
          if (redirectAfterFeedback) {
            setRedirectAfterFeedback(false);
            router.push("/dashboard/disbursements");
          }
        }}
      />
    </div>
  );
}
