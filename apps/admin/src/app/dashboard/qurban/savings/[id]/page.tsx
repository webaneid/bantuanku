"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Plus, Check, XCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import api from "@/lib/api";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useAuth } from "@/lib/auth";

interface Savings {
  id: string;
  savingsNumber: string;
  userId: string;
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  targetPeriodId: string;
  targetPackageId: string | null;
  targetAmount: number;
  currentAmount: number;
  installmentAmount: number;
  installmentFrequency: "weekly" | "monthly" | "custom";
  installmentDay: number | null;
  status: "active" | "paused" | "completed" | "converted" | "cancelled";
  convertedOrderId: string | null;
  notes: string;
  createdAt: string;
  periodName: string;
  packageName: string | null;
}

interface Transaction {
  id: string;
  savingsId: string;
  transactionType: "deposit" | "withdrawal" | "conversion";
  amount: number;
  paymentMethod: string | null;
  paymentChannel: string | null;
  paymentProofUrl: string | null;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  createdAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function SavingsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const isMitra = user?.roles?.includes("mitra") && user.roles.length === 1;
  const resolvedParams = React.use(params);
  const savingsId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddDepositModal, setShowAddDepositModal] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [depositFormData, setDepositFormData] = useState({
    amount: "",
    paymentMethod: "transfer",
    paymentChannel: "",
    paymentProof: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: null | { type: "verify"; transactionId: string } | { type: "reject"; transactionId: string } | { type: "convert" };
  }>({
    open: false,
    title: "",
    message: "",
    action: null,
  });

  // Fetch savings detail
  const { data, isLoading } = useQuery({
    queryKey: ["qurban-savings-detail", savingsId],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/savings/${savingsId}`);
      return response.data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const savings: Savings | undefined = data?.data?.savings;
  const transactions: Transaction[] = data?.data?.transactions || [];

  // Auto-fill installmentAmount when opening modal
  useEffect(() => {
    if (showAddDepositModal && savings) {
      setDepositFormData(prev => ({
        ...prev,
        amount: prev.amount || String(savings.installmentAmount),
      }));
    }
  }, [showAddDepositModal, savings]);

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
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
    enabled: !isMitra && showAddDepositModal,
  });

  const paymentChannelOptions = [
    ...bankAccounts.map(acc => ({
      value: `bank_${acc.id}`,
      label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountName})`,
    })),
    { value: "qris", label: "QRIS" },
    { value: "cash", label: "Tunai / Cash" },
  ];

  // Add deposit transaction
  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savings) return;
    try {
      const payload = {
        ...depositFormData,
        amount: Number(depositFormData.amount),
      };

      await api.post(`/admin/qurban/savings/${savings.id}/transactions`, payload);
      queryClient.invalidateQueries({ queryKey: ["qurban-savings-detail", savingsId] });
      setShowAddDepositModal(false);
      setDepositFormData({
        amount: "",
        paymentMethod: "transfer",
        paymentChannel: "",
        paymentProof: "",
        notes: "",
      });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Setoran berhasil ditambahkan",
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Gagal menambahkan setoran";
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: errorMsg,
      });
      console.error(error);
    }
  };

  // Verify deposit
  const handleVerifyDeposit = async (transactionId: string, confirmed = false) => {
    if (!savings) return;
    if (!confirmed) {
      setConfirmDialog({
        open: true,
        title: "Verifikasi Setoran",
        message: "Verifikasi setoran ini?",
        action: { type: "verify", transactionId },
      });
      return;
    }
    try {
      await api.post(`/admin/qurban/savings/${savings.id}/transactions/${transactionId}/verify`, {});
      queryClient.invalidateQueries({ queryKey: ["qurban-savings-detail", savingsId] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Setoran berhasil diverifikasi",
      });
    } catch (error) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: "Gagal memverifikasi setoran",
      });
      console.error(error);
    }
  };

  // Reject deposit
  const handleRejectDeposit = async (transactionId: string, confirmed = false) => {
    if (!savings) return;
    if (!confirmed) {
      setConfirmDialog({
        open: true,
        title: "Tolak Setoran",
        message: "Tolak setoran ini?",
        action: { type: "reject", transactionId },
      });
      return;
    }
    try {
      await api.post(`/admin/qurban/savings/${savings.id}/transactions/${transactionId}/reject`, {});
      queryClient.invalidateQueries({ queryKey: ["qurban-savings-detail", savingsId] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Setoran ditolak",
      });
    } catch (error) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: "Gagal menolak setoran",
      });
      console.error(error);
    }
  };

  // Convert savings to order
  const handleConvertToOrder = async (confirmed = false) => {
    if (!savings) return;
    if (!confirmed) {
      setConfirmDialog({
        open: true,
        title: "Konversi Tabungan",
        message: "Konversi tabungan ini menjadi order? Pastikan tabungan sudah lunas.",
        action: { type: "convert" },
      });
      return;
    }
    try {
      const response = await api.post(`/admin/qurban/savings/${savings.id}/convert`, {});
      queryClient.invalidateQueries({ queryKey: ["qurban-savings-detail", savingsId] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: `Tabungan berhasil dikonversi menjadi order: ${response.data.order.orderNumber}`,
      });
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.error || "Gagal konversi tabungan",
      });
      console.error(error);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.action) return;
    if (confirmDialog.action.type === "verify") {
      await handleVerifyDeposit(confirmDialog.action.transactionId, true);
    } else if (confirmDialog.action.type === "reject") {
      await handleRejectDeposit(confirmDialog.action.transactionId, true);
    } else if (confirmDialog.action.type === "convert") {
      await handleConvertToOrder(true);
    }
    setConfirmDialog({
      open: false,
      title: "",
      message: "",
      action: null,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "converted": return "bg-purple-100 text-purple-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Aktif";
      case "completed": return "Selesai";
      case "converted": return "Terkonversi";
      case "paused": return "Dijeda";
      case "cancelled": return "Dibatalkan";
      case "pending": return "Pending";
      case "verified": return "Terverifikasi";
      case "rejected": return "Ditolak";
      default: return status;
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!savings) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="text-xl font-bold mb-2">Tabungan tidak ditemukan</h2>
          <p className="text-gray-600 mb-6">ID: {savingsId}</p>
          <button
            onClick={() => router.push("/dashboard/qurban/savings")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Kembali ke Daftar Tabungan
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress(savings.currentAmount, savings.targetAmount);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard/qurban/savings")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Detail Tabungan</h1>
          <p className="text-sm text-gray-600">{savings.savingsNumber}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-lg ${getStatusColor(savings.status)}`}>
          {getStatusLabel(savings.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informasi Penabung */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Informasi Penabung</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nama</p>
                <p className="font-medium">{savings.donorName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Telepon</p>
                <p>{savings.donorPhone}</p>
              </div>
              {savings.donorEmail && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Email</p>
                  <p>{savings.donorEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Tabungan */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Tabungan
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Terkumpul</span>
                <span className="font-bold text-2xl text-green-600">
                  {formatPrice(savings.currentAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Target</span>
                <span className="font-semibold text-lg">
                  {formatPrice(savings.targetAmount)}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-500">Cicilan</p>
                  <p className="font-medium">{formatPrice(savings.installmentAmount)}</p>
                  {savings.installmentAmount && savings.targetAmount && (
                    <p className="text-xs text-gray-500">{Math.ceil(savings.targetAmount / savings.installmentAmount)}x cicilan</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Frekuensi</p>
                  <p className="font-medium capitalize">{savings.installmentFrequency}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Riwayat Transaksi */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Riwayat Transaksi</h3>
              {!isMitra && savings.status === "active" && (
                <button
                  onClick={() => setShowAddDepositModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Setoran
                </button>
              )}
            </div>

            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada transaksi</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((trx) => (
                  <div key={trx.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{formatPrice(trx.amount)}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(trx.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                        </p>
                        {trx.paymentMethod && (
                          <p className="text-xs text-gray-500 mt-1">Via: {trx.paymentMethod}</p>
                        )}
                        {trx.paymentChannel && (
                          <p className="text-xs text-gray-500">Channel: {trx.paymentChannel}</p>
                        )}
                        {trx.paymentProofUrl && (
                          <a
                            href={trx.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 block"
                          >
                            Lihat Bukti Transfer
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(trx.status)}`}>
                          {getStatusLabel(trx.status)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{trx.transactionType}</p>
                      </div>
                    </div>
                    {trx.notes && (
                      <p className="text-sm text-gray-600 mt-2 pt-2 border-t">{trx.notes}</p>
                    )}
                    {!isMitra && trx.status === "pending" && trx.transactionType === "deposit" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleVerifyDeposit(trx.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Verifikasi
                        </button>
                        <button
                          onClick={() => handleRejectDeposit(trx.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Target Tabungan</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Periode</p>
                <p className="font-medium">{savings.periodName}</p>
              </div>
              {savings.packageName && (
                <div>
                  <p className="text-sm text-gray-600">Paket</p>
                  <p className="font-medium">{savings.packageName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Dibuat</p>
                <p>{format(new Date(savings.createdAt), "dd MMMM yyyy", { locale: id })}</p>
              </div>
            </div>
          </div>

          {/* Konversi Status */}
          {savings.convertedOrderId && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Status Konversi</h3>
              <p className="text-sm text-gray-700">
                Tabungan ini telah dikonversi menjadi order dengan ID:
              </p>
              <p className="font-mono font-semibold mt-2">{savings.convertedOrderId}</p>
            </div>
          )}

          {/* Action Buttons */}
          {!isMitra && savings.status === "completed" && !savings.convertedOrderId && (
            <button
              onClick={() => handleConvertToOrder()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <ArrowRight className="h-5 w-5" />
              Konversi ke Order
            </button>
          )}

          {/* Notes */}
          {savings.notes && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Catatan</h3>
              <p className="text-sm text-gray-700">{savings.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Media Library */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => {
          setDepositFormData({ ...depositFormData, paymentProof: url });
          setShowMediaLibrary(false);
        }}
        category="financial"
      />

      {/* Add Deposit Modal */}
      {showAddDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4 border-b">
              <h2 className="text-xl font-bold">Tambah Setoran</h2>
              <button
                onClick={() => {
                  setShowAddDepositModal(false);
                  setDepositFormData({
                    amount: "",
                    paymentMethod: "transfer",
                    paymentChannel: "",
                    paymentProof: "",
                    notes: "",
                  });
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddDeposit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nominal Setoran *</label>
                <input
                  type="number"
                  required
                  value={depositFormData.amount}
                  onChange={(e) => setDepositFormData({ ...depositFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metode Pembayaran *</label>
                <select
                  required
                  value={depositFormData.paymentMethod}
                  onChange={(e) => setDepositFormData({ ...depositFormData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transfer ke Rekening *</label>
                <Autocomplete
                  options={paymentChannelOptions}
                  value={depositFormData.paymentChannel}
                  onChange={(val) => setDepositFormData({ ...depositFormData, paymentChannel: val })}
                  placeholder="Pilih rekening tujuan..."
                  allowClear={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bukti Transfer</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={depositFormData.paymentProof}
                    onChange={(e) => setDepositFormData({ ...depositFormData, paymentProof: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg"
                    placeholder="URL bukti transfer..."
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaLibrary(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Pilih File
                  </button>
                </div>
                {depositFormData.paymentProof && (
                  <div className="mt-2">
                    <img
                      src={depositFormData.paymentProof}
                      alt="Preview"
                      className="max-w-xs h-auto border rounded"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <textarea
                  value={depositFormData.notes}
                  onChange={(e) => setDepositFormData({ ...depositFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Catatan tambahan..."
                />
              </div>

              </div>

              <div className="flex gap-3 justify-end px-6 py-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDepositModal(false);
                    setDepositFormData({
                      amount: "",
                      paymentMethod: "transfer",
                      paymentChannel: "",
                      paymentProof: "",
                      notes: "",
                    });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 bg-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{confirmDialog.title}</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog({
                    open: false,
                    title: "",
                    message: "",
                    action: null,
                  })
                }
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700"
              >
                Lanjutkan
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
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
