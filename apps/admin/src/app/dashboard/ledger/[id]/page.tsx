"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  BanknotesIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import MediaLibrary from "@/components/MediaLibrary";
import PaymentModal, { type PaymentData } from "@/components/PaymentModal";

export default function DisbursementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: disbursement, isLoading } = useQuery({
    queryKey: ["disbursement", id],
    queryFn: async () => {
      const response = await api.get(`/admin/ledger/${id}`);
      return response.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/ledger/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      router.push("/dashboard/ledger");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/admin/ledger/${id}/submit`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/admin/ledger/${id}/approve`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await api.post(`/admin/ledger/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
  });

  const payMutation = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      const response = await api.post(`/admin/ledger/${id}/pay`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setIsPaymentModalOpen(false);
    },
  });

  const attachEvidenceMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; fileUrl: string }) => {
      const response = await api.post(`/admin/ledger/${id}/evidence`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disbursement", id] });
      setIsMediaLibraryOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!disbursement) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500">Disbursement not found</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-primary-50 text-primary-700",
      approved: "bg-success-50 text-success-700",
      rejected: "bg-danger-50 text-danger-700",
      paid: "bg-success-50 text-success-700",
    };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badges[status] || badges.draft}`}>
        {status}
      </span>
    );
  };

  const handleDelete = () => {
    if (confirm("Yakin ingin menghapus catatan ini?")) {
      deleteMutation.mutate();
    }
  };

  const handleSubmit = () => {
    if (confirm("Submit catatan ini untuk approval?")) {
      submitMutation.mutate();
    }
  };

  const handleApprove = () => {
    if (confirm("Approve catatan ini?")) {
      approveMutation.mutate();
    }
  };

  const handleReject = () => {
    const reason = prompt("Alasan penolakan:");
    if (reason) {
      rejectMutation.mutate(reason);
    }
  };

  const handlePay = (paymentData: PaymentData) => {
    payMutation.mutate(paymentData);
  };

  const handleMediaSelect = async (url: string) => {
    // Extract filename from URL for title
    const filename = url.split("/").pop() || "Evidence";

    // Determine type based on file extension
    const ext = filename.split(".").pop()?.toLowerCase();
    let type = "document";
    if (ext === "pdf") {
      type = "invoice"; // PDF usually invoice or transfer proof
    } else if (["jpg", "jpeg", "png"].includes(ext || "")) {
      type = "receipt"; // Images usually receipts
    }

    attachEvidenceMutation.mutate({
      type,
      title: filename,
      fileUrl: url,
    });
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-gray-900">Detail Catatan Ledger</h1>
          <p className="text-gray-600 mt-1 mono">{disbursement.referenceId}</p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(disbursement.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Umum</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Campaign</span>
                <span className="text-sm font-medium text-gray-900">
                  {disbursement.campaign?.title || "-"}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Jumlah</span>
                <span className="text-sm font-semibold text-gray-900 mono">
                  Rp {formatRupiah(disbursement.amount)}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Akun Beban</span>
                <span className="text-sm font-medium text-gray-900">
                  {disbursement.expenseAccount?.code} - {disbursement.expenseAccount?.name}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Tujuan</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-md">
                  {disbursement.purpose}
                </span>
              </div>
              {disbursement.description && (
                <div className="py-3">
                  <span className="text-sm text-gray-600 block mb-2">Deskripsi</span>
                  <p className="text-sm text-gray-900">{disbursement.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recipient Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Penerima</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Nama</span>
                <span className="text-sm font-medium text-gray-900">
                  {disbursement.recipientName}
                </span>
              </div>
              {disbursement.recipientBank && (
                <>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Bank</span>
                    <span className="text-sm font-medium text-gray-900">
                      {disbursement.recipientBank}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">No. Rekening</span>
                    <span className="text-sm font-medium text-gray-900 mono">
                      {disbursement.recipientAccount}
                    </span>
                  </div>
                </>
              )}
              {disbursement.recipientPhone && (
                <div className="flex justify-between py-3">
                  <span className="text-sm text-gray-600">Telepon</span>
                  <span className="text-sm font-medium text-gray-900">
                    {disbursement.recipientPhone}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bukti Pendukung</h3>
              {disbursement.status === "draft" && (
                <button
                  onClick={() => setIsMediaLibraryOpen(true)}
                  className="btn btn-sm btn-secondary"
                >
                  <CloudArrowUpIcon className="w-4 h-4" />
                  Upload Bukti
                </button>
              )}
            </div>

            {/* Info Box */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                💰 Bukti Catatan Ledger (Financial Documents Only)
              </h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p className="text-xs mb-2">
                  Upload dokumen yang membuktikan dana telah dicairkan/digunakan sesuai tujuan:
                </p>
                <div>
                  <span className="font-medium">Dokumen yang Dibutuhkan:</span>
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• 🧾 <strong>Nota/Struk</strong> - Bukti pembelian barang/jasa (PDF/JPG)</li>
                    <li>• 📄 <strong>Invoice</strong> - Tagihan dari vendor/supplier (PDF/JPG)</li>
                    <li>• 🧾 <strong>Kwitansi</strong> - Tanda terima dari penerima dana (PDF/JPG)</li>
                    <li>• 💳 <strong>Bukti Transfer</strong> - Screenshot/PDF bukti transfer bank</li>
                    <li>• 📋 <strong>Dokumen Pendukung</strong> - Surat pernyataan, daftar penerima (PDF)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded">
                <p className="text-xs text-blue-900 font-medium">
                  ⚠️ Minimal 1 bukti finansial wajib diupload sebelum submit
                </p>
              </div>
              <div className="mt-2 text-xs text-blue-700">
                <p>
                  📸 <em>Untuk dokumentasi kegiatan/foto program, gunakan modul <strong>Laporan Kegiatan</strong> (coming soon)</em>
                </p>
              </div>
            </div>

            {disbursement.evidences && disbursement.evidences.length > 0 ? (
              <div className="space-y-4">
                {/* Group by type - Financial documents only */}
                {["receipt", "invoice", "document"].map((type) => {
                  const typeEvidences = disbursement.evidences.filter(
                    (e: any) => e.type === type
                  );
                  if (typeEvidences.length === 0) return null;

                  const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
                    receipt: { label: "Nota/Struk/Kwitansi", icon: "🧾", color: "bg-green-50 border-green-200" },
                    invoice: { label: "Invoice/Transfer", icon: "📄", color: "bg-blue-50 border-blue-200" },
                    document: { label: "Dokumen Pendukung", icon: "📋", color: "bg-yellow-50 border-yellow-200" },
                  };

                  return (
                    <div key={type}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <span>{typeLabels[type].icon}</span>
                        {typeLabels[type].label} ({typeEvidences.length})
                      </h4>
                      <div className="space-y-2">
                        {typeEvidences.map((evidence: any) => (
                          <div
                            key={evidence.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg ${typeLabels[type].color}`}
                          >
                            <PaperClipIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {evidence.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>
                                  {format(new Date(evidence.uploadedAt), "dd MMM yyyy HH:mm", {
                                    locale: idLocale,
                                  })}
                                </span>
                                {evidence.amount && (
                                  <>
                                    <span>•</span>
                                    <span className="mono">Rp {formatRupiah(evidence.amount)}</span>
                                  </>
                                )}
                              </div>
                              {evidence.description && (
                                <p className="text-xs text-gray-600 mt-1">{evidence.description}</p>
                              )}
                            </div>
                            <a
                              href={evidence.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                            >
                              Lihat
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p className="font-medium">Belum ada bukti catatan yang diupload</p>
                {disbursement.status === "draft" && (
                  <p className="mt-2 text-xs">
                    Upload minimal 1 bukti finansial (nota/invoice/kwitansi) untuk melanjutkan
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi</h3>
            <div className="space-y-2">
              {disbursement.status === "draft" && (
                <>
                  <button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="w-full btn btn-primary"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Submit untuk Approval
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/ledger/${id}/edit`)}
                    className="w-full btn btn-secondary"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="w-full btn btn-danger"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Hapus
                  </button>
                </>
              )}

              {disbursement.status === "submitted" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="w-full btn btn-success"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="w-full btn btn-danger"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}

              {disbursement.status === "approved" && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={payMutation.isPending}
                  className="w-full btn btn-success"
                >
                  <BanknotesIcon className="w-4 h-4" />
                  Mark as Paid
                </button>
              )}

              {disbursement.status === "rejected" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-1">Ditolak</p>
                  <p className="text-sm text-red-700">{disbursement.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(disbursement.createdAt), "dd MMM yyyy HH:mm", {
                    locale: idLocale,
                  })}
                </p>
                {disbursement.creator && (
                  <p className="text-xs text-gray-600">{disbursement.creator.name}</p>
                )}
              </div>

              {disbursement.submittedAt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Submitted</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(disbursement.submittedAt), "dd MMM yyyy HH:mm", {
                      locale: idLocale,
                    })}
                  </p>
                  {disbursement.submitter && (
                    <p className="text-xs text-gray-600">{disbursement.submitter.name}</p>
                  )}
                </div>
              )}

              {disbursement.approvedAt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Approved</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(disbursement.approvedAt), "dd MMM yyyy HH:mm", {
                      locale: idLocale,
                    })}
                  </p>
                  {disbursement.approver && (
                    <p className="text-xs text-gray-600">{disbursement.approver.name}</p>
                  )}
                </div>
              )}

              {disbursement.rejectedAt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Rejected</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(disbursement.rejectedAt), "dd MMM yyyy HH:mm", {
                      locale: idLocale,
                    })}
                  </p>
                  {disbursement.rejecter && (
                    <p className="text-xs text-gray-600">{disbursement.rejecter.name}</p>
                  )}
                </div>
              )}

              {disbursement.paidAt && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Paid</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(disbursement.paidAt), "dd MMM yyyy HH:mm", {
                      locale: idLocale,
                    })}
                  </p>
                  {disbursement.payer && (
                    <p className="text-xs text-gray-600">{disbursement.payer.name}</p>
                  )}
                  {disbursement.paymentMethod && (
                    <p className="text-xs text-gray-600">via {disbursement.paymentMethod}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {disbursement.notes && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Catatan Internal</h3>
              <p className="text-sm text-gray-700">{disbursement.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Media Library Modal - Financial Documents Only */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        category="financial"
        accept="image/*,application/pdf"
      />

      {/* Payment Modal */}
      {disbursement && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handlePay}
          disbursement={{
            amount: disbursement.amount,
            recipientName: disbursement.recipientName,
            recipientBank: disbursement.recipientBank,
            recipientAccount: disbursement.recipientAccount,
          }}
        />
      )}
    </div>
  );
}
