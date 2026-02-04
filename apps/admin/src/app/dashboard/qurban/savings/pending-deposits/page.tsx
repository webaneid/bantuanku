"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, XCircle, Eye, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import api from "@/lib/api";
import Link from "next/link";
import FeedbackDialog from "@/components/FeedbackDialog";

interface PendingDeposit {
  id: string;
  transactionNumber: string;
  amount: number;
  transactionType: string;
  transactionDate: string;
  paymentMethod: string | null;
  paymentChannel: string | null;
  paymentProofUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  savingsId: string;
  savingsNumber: string;
  donorName: string;
  donorPhone: string;
  currentAmount: number;
  targetAmount: number;
  periodName: string;
}

export default function PendingDepositsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // Fetch pending deposits
  const { data, isLoading } = useQuery({
    queryKey: ["qurban-pending-deposits"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/savings/transactions/pending");
      return response.data;
    },
    refetchInterval: 30000, // Auto refresh every 30s
  });

  const deposits: PendingDeposit[] = data?.data || [];

  // Check if all deposits are selected
  const allSelected = useMemo(() => {
    return deposits.length > 0 && selectedIds.size === deposits.length;
  }, [deposits, selectedIds]);

  // Toggle single checkbox
  const handleToggleSelect = (depositId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(depositId)) {
      newSelected.delete(depositId);
    } else {
      newSelected.add(depositId);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all checkboxes
  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deposits.map((d) => d.id)));
    }
  };

  // Bulk verify
  const handleBulkVerify = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Verifikasi ${selectedIds.size} setoran terpilih?`)) return;

    try {
      const selectedDeposits = deposits.filter((d) => selectedIds.has(d.id));

      for (const deposit of selectedDeposits) {
        await api.post(`/admin/qurban/savings/${deposit.savingsId}/transactions/${deposit.id}/verify`);
      }

      queryClient.invalidateQueries({ queryKey: ["qurban-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["qurban-pending-count"] });
      setSelectedIds(new Set());
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: `${selectedDeposits.length} setoran berhasil diverifikasi`,
      });
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.error || "Gagal verifikasi setoran",
      });
    }
  };

  const handleVerify = async (txId: string, savingsId: string) => {
    try {
      await api.post(`/admin/qurban/savings/${savingsId}/transactions/${txId}/verify`);
      queryClient.invalidateQueries({ queryKey: ["qurban-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["qurban-pending-count"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Setoran berhasil diverifikasi",
      });
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.error || "Gagal verifikasi setoran",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedTxId) return;

    const deposit = deposits.find((d) => d.id === selectedTxId);
    if (!deposit) return;

    try {
      await api.post(`/admin/qurban/savings/${deposit.savingsId}/transactions/${selectedTxId}/reject`, {
        notes: rejectNotes,
      });
      queryClient.invalidateQueries({ queryKey: ["qurban-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["qurban-pending-count"] });
      setRejectModalOpen(false);
      setSelectedTxId(null);
      setRejectNotes("");
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Setoran ditolak",
      });
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.error || "Gagal menolak setoran",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/qurban/savings")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Verifikasi Setoran</h1>
            <p className="text-sm text-gray-600">
              {deposits.length} setoran menunggu verifikasi
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.size} setoran terpilih
          </span>
          <button
            onClick={handleBulkVerify}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Verifikasi Semua Terpilih
          </button>
        </div>
      )}

      {/* Desktop Table */}
      {deposits.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">Tidak ada setoran yang perlu diverifikasi</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th>Tanggal</th>
                  <th>No. Tabungan</th>
                  <th>Penabung</th>
                  <th>Periode</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                  <th style={{ textAlign: "center" }}>Bukti</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => (
                  <tr key={deposit.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(deposit.id)}
                        onChange={() => handleToggleSelect(deposit.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td>
                      <div className="text-sm text-gray-600">
                        {format(new Date(deposit.transactionDate), "dd MMM yyyy", { locale: id })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(deposit.transactionDate), "HH:mm", { locale: id })}
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/qurban/savings/${deposit.savingsId}`}
                        className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {deposit.savingsNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{deposit.donorName}</div>
                      <div className="text-sm text-gray-500">{deposit.donorPhone}</div>
                    </td>
                    <td className="text-sm">{deposit.periodName}</td>
                    <td className="mono text-sm" style={{ textAlign: "right" }}>
                      <div className="font-semibold">Rp {formatCurrency(deposit.amount)}</div>
                      <div className="text-xs text-gray-500">
                        Rp {formatCurrency(deposit.currentAmount)} / Rp {formatCurrency(deposit.targetAmount)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {deposit.paymentProofUrl ? (
                        <button
                          onClick={() => {
                            setPreviewImageUrl(deposit.paymentProofUrl);
                            setImagePreviewOpen(true);
                          }}
                          className="action-btn action-view"
                          title="Lihat Bukti Transfer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleVerify(deposit.id, deposit.savingsId)}
                          className="action-btn"
                          style={{ backgroundColor: "#10b981", color: "white" }}
                          title="Verifikasi"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTxId(deposit.id);
                            setRejectModalOpen(true);
                          }}
                          className="action-btn action-delete"
                          title="Tolak"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="table-mobile-cards">
            {deposits.map((deposit) => (
              <div key={deposit.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(deposit.id)}
                      onChange={() => handleToggleSelect(deposit.id)}
                      className="cursor-pointer mr-3"
                    />
                    <div>
                      <div className="table-card-header-title">{deposit.donorName}</div>
                      <div className="table-card-header-subtitle">{deposit.donorPhone}</div>
                    </div>
                  </div>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal</span>
                  <span className="table-card-row-value">
                    {format(new Date(deposit.transactionDate), "dd MMM yyyy HH:mm", { locale: id })}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">No. Tabungan</span>
                  <span className="table-card-row-value">
                    <Link
                      href={`/dashboard/qurban/savings/${deposit.savingsId}`}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {deposit.savingsNumber}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Periode</span>
                  <span className="table-card-row-value">{deposit.periodName}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Nominal</span>
                  <span className="table-card-row-value mono font-semibold">
                    Rp {formatCurrency(deposit.amount)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Progress</span>
                  <span className="table-card-row-value text-xs mono">
                    Rp {formatCurrency(deposit.currentAmount)} / Rp {formatCurrency(deposit.targetAmount)}
                  </span>
                </div>

                {deposit.paymentProofUrl && (
                  <div className="table-card-row">
                    <span className="table-card-row-label">Bukti</span>
                    <button
                      onClick={() => {
                        setPreviewImageUrl(deposit.paymentProofUrl);
                        setImagePreviewOpen(true);
                      }}
                      className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Lihat
                    </button>
                  </div>
                )}

                <div className="table-card-footer">
                  <button
                    onClick={() => handleVerify(deposit.id, deposit.savingsId)}
                    className="action-btn"
                    style={{ backgroundColor: "#10b981", color: "white" }}
                    title="Verifikasi"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTxId(deposit.id);
                      setRejectModalOpen(true);
                    }}
                    className="action-btn action-delete"
                    title="Tolak"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tolak Setoran</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Alasan Penolakan</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Isi alasan penolakan..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedTxId(null);
                  setRejectNotes("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Tolak Setoran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreviewOpen && previewImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setImagePreviewOpen(false);
            setPreviewImageUrl(null);
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => {
                setImagePreviewOpen(false);
                setPreviewImageUrl(null);
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ✕
            </button>
            <img
              src={previewImageUrl}
              alt="Bukti Transfer"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
