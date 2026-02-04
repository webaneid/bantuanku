"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Eye, CheckCircle, XCircle, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import api from "@/lib/api";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import { formatRupiah } from "@/lib/format";
import FeedbackDialog from "@/components/FeedbackDialog";

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  payment_channel: string | null;
  payment_proof_url: string | null;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  order_number?: string;
  donor_name?: string;
  package_name?: string;
}

interface VerificationForm {
  notes: string;
}

export default function QurbanPaymentsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const queryClient = useQueryClient();

  // Fetch bank accounts from settings
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["payment-bank-accounts"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      const settings = response.data?.data?.payment || [];
      const bankAccountsSetting = settings.find((s: any) => s.key === "payment_bank_accounts");
      if (bankAccountsSetting?.value) {
        try {
          return JSON.parse(bankAccountsSetting.value);
        } catch {
          return [];
        }
      }
      return [];
    },
  });

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["qurban-payments", filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);

      const response = await api.get(`/admin/qurban/payments?${params.toString()}`);
      return response.data.data || response.data;
    },
  });

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await api.post(`/admin/qurban/payments/${id}/verify`, { notes });
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-payments"] });
      queryClient.invalidateQueries({ queryKey: ["qurban-orders"] });
      setShowDetailModal(false);
      setVerificationNotes("");
      setFeedback({
        open: true,
        type: "success",
        title: "Pembayaran diverifikasi",
        message: "Pembayaran berhasil diverifikasi.",
      });
    },
  });

  // Reject payment mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await api.post(`/admin/qurban/payments/${id}/reject`, { notes });
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-payments"] });
      queryClient.invalidateQueries({ queryKey: ["qurban-orders"] });
      setShowDetailModal(false);
      setVerificationNotes("");
      setFeedback({
        open: true,
        type: "success",
        title: "Pembayaran ditolak",
        message: "Status pembayaran sudah diperbarui.",
      });
    },
  });

  const handleViewDetail = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const handleVerify = () => {
    if (!selectedPayment) return;
    if (confirm("Verifikasi pembayaran ini? Order akan diupdate sesuai total pembayaran.")) {
      verifyMutation.mutate({ id: selectedPayment.id, notes: verificationNotes });
    }
  };

  const handleReject = () => {
    if (!selectedPayment) return;
    if (!verificationNotes.trim()) {
      setFeedback({
        open: true,
        type: "error",
        title: "Alasan diperlukan",
        message: "Harap masukkan alasan penolakan.",
      });
      return;
    }
    if (confirm("Tolak pembayaran ini?")) {
      rejectMutation.mutate({ id: selectedPayment.id, notes: verificationNotes });
    }
  };

  const getPaymentChannelLabel = (channel: string | null) => {
    if (!channel) return "-";

    if (channel === "qris") return "QRIS";
    if (channel === "cash") return "Tunai / Cash";

    // Decode bank_xxx format (handle both bank_bank-xxx and bank_xxx)
    if (channel.startsWith("bank_")) {
      let bankId = channel.replace("bank_", "");

      // If still has bank_ prefix (double prefix bug), remove it again
      if (bankId.startsWith("bank-")) {
        bankId = bankId;
      } else if (bankId.startsWith("bank_")) {
        bankId = bankId.replace("bank_", "");
      }

      const account = bankAccounts.find((acc: any) => acc.id === bankId || acc.id === `bank-${bankId}`);
      if (account) {
        return `${account.bankName} - ${account.accountNumber} (${account.accountName})`;
      }
      return channel;
    }

    return channel;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-warning-50 text-warning-700",
      verified: "bg-success-50 text-success-700",
      rejected: "bg-danger-50 text-danger-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Menunggu Verifikasi",
      verified: "Terverifikasi",
      rejected: "Ditolak",
    };
    return labels[status] || status;
  };

  // Pagination logic
  const totalItems = payments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = payments.slice(startIndex, endIndex);

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const statusOptions = [
    { value: "pending", label: "Menunggu Verifikasi" },
    { value: "verified", label: "Terverifikasi" },
    { value: "rejected", label: "Ditolak" },
    { value: "all", label: "Semua Status" },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Verifikasi Pembayaran Qurban
          </h1>
          <p className="text-sm text-gray-600 mt-1">Verifikasi dan kelola pembayaran qurban</p>
        </div>
        {filterStatus === "pending" && payments.length > 0 && (
          <div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-2 rounded-lg">
            <span className="font-semibold">{payments.length}</span> pembayaran menunggu verifikasi
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Autocomplete
          options={statusOptions}
          value={filterStatus}
          onChange={handleFilterChange}
          placeholder="Filter Status"
          allowClear={false}
        />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="sortable">Tanggal</th>
                <th className="sortable">Order #</th>
                <th className="sortable">Donatur</th>
                <th className="sortable">Paket</th>
                <th className="sortable">Jumlah</th>
                <th className="sortable">Metode</th>
                <th className="sortable">Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div>
                      <div className="text-sm text-gray-900">
                        {format(new Date(payment.created_at), "dd MMM yyyy", { locale: id })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(payment.created_at), "HH:mm", { locale: id })}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="mono text-sm text-gray-900">{payment.order_number}</div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">{payment.donor_name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{payment.package_name}</div>
                  </td>
                  <td className="mono text-sm">Rp {formatRupiah(payment.amount)}</td>
                  <td>
                    <div className="text-sm text-gray-900">{payment.payment_method || "-"}</div>
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                      {getStatusLabel(payment.status)}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        onClick={() => handleViewDetail(payment)}
                        className="action-btn action-view"
                        title="Lihat Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {payment.payment_proof_url && (
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowProofModal(true);
                          }}
                          className="action-btn action-view"
                          title="Lihat Bukti"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="table-mobile-cards">
            {paginatedPayments.map((payment) => (
              <div key={payment.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title mono">{payment.order_number}</div>
                    <div className="table-card-header-subtitle">{payment.donor_name}</div>
                  </div>
                  <span className={`table-card-header-badge ${getStatusColor(payment.status)}`}>
                    {getStatusLabel(payment.status)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal</span>
                  <span className="table-card-row-value">
                    {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", { locale: id })}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Paket</span>
                  <span className="table-card-row-value">{payment.package_name}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Jumlah</span>
                  <span className="table-card-row-value mono font-semibold">
                    Rp {formatRupiah(payment.amount)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Metode</span>
                  <span className="table-card-row-value">{payment.payment_method || "-"}</span>
                </div>

                <div className="table-card-footer">
                  <button
                    onClick={() => handleViewDetail(payment)}
                    className="action-btn action-view"
                    title="Lihat Detail"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {payment.payment_proof_url && (
                    <button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowProofModal(true);
                      }}
                      className="action-btn action-view"
                      title="Lihat Bukti"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {payments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {filterStatus === "pending" ? "Tidak ada pembayaran yang menunggu verifikasi" : "Tidak ada data"}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detail Pembayaran</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setVerificationNotes("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Informasi Pembayaran</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tanggal Upload</p>
                    <p>{format(new Date(selectedPayment.created_at), "dd MMMM yyyy HH:mm", { locale: id })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded ${getStatusColor(selectedPayment.status)}`}>
                      {getStatusLabel(selectedPayment.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Jumlah</p>
                    <p className="font-semibold text-lg mono">Rp {formatRupiah(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Metode Pembayaran</p>
                    <p>{selectedPayment.payment_method || "-"}</p>
                  </div>
                  {selectedPayment.payment_channel && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Dikirim ke Rekening</p>
                      <p className="font-medium">{getPaymentChannelLabel(selectedPayment.payment_channel)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Informasi Order</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-mono">{selectedPayment.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Donatur</p>
                    <p className="font-medium">{selectedPayment.donor_name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Paket</p>
                    <p>{selectedPayment.package_name}</p>
                  </div>
                </div>
              </div>

              {/* Proof Image */}
              {selectedPayment.payment_proof_url && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Bukti Pembayaran</h3>
                  <img
                    src={selectedPayment.payment_proof_url}
                    alt="Bukti Pembayaran"
                    className="w-full rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%236b7280' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3EGambar tidak dapat dimuat%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}

              {/* Verification Notes */}
              {selectedPayment.status === "pending" && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Catatan Verifikasi</h3>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Tambahkan catatan (opsional untuk verifikasi, wajib untuk penolakan)"
                  />
                </div>
              )}

              {/* Existing Notes */}
              {selectedPayment.notes && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Catatan</h3>
                  <p className="text-sm text-gray-700">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Verification Info */}
              {selectedPayment.status !== "pending" && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Informasi Verifikasi</h3>
                  {selectedPayment.verified_at && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Diverifikasi pada</p>
                        <p>{format(new Date(selectedPayment.verified_at), "dd MMMM yyyy HH:mm", { locale: id })}</p>
                      </div>
                      {selectedPayment.verified_by && (
                        <div>
                          <p className="text-sm text-gray-600">Oleh</p>
                          <p>{selectedPayment.verified_by}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {selectedPayment.status === "pending" && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="btn btn-danger btn-md"
                  >
                    <XCircle className="h-4 w-4" />
                    Tolak
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={verifyMutation.isPending}
                    className="btn btn-success btn-md"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Verifikasi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      {showProofModal && selectedPayment?.payment_proof_url && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="max-w-4xl w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Bukti Pembayaran</h2>
              <button
                onClick={() => setShowProofModal(false)}
                className="text-white hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <img
              src={selectedPayment.payment_proof_url}
              alt="Bukti Pembayaran"
              className="w-full rounded-lg"
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
