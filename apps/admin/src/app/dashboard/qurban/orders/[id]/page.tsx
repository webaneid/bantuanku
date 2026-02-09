"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PrinterIcon, PaperClipIcon, LinkIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import { toast } from "react-hot-toast";

export default function ViewQurbanOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: orderId } = use(params);
  const queryClient = useQueryClient();
  const [proofModal, setProofModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["qurban-order", orderId],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/orders/${orderId}`);
      return response.data;
    },
  });

  const order = orderData?.order;
  const payments = orderData?.payments || [];

  // Parse metadata if it's a string
  const parsedMetadata = useMemo(() => {
    if (!order?.metadata) return null;
    if (typeof order.metadata === 'string') {
      try {
        return JSON.parse(order.metadata);
      } catch (e) {
        console.error('Failed to parse metadata:', e);
        return null;
      }
    }
    return order.metadata;
  }, [order?.metadata]);

  // Fetch payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
      return response.data?.data || [];
    },
  });

  // Get payment channel (bank account) from latest payment
  const paymentChannel = useMemo(() => {
    if (payments.length > 0 && payments[0].payment_channel) {
      return payments[0].payment_channel;
    }
    return null;
  }, [payments]);

  // Find bank account details from payment methods
  const selectedBankAccount = useMemo(() => {
    if (!paymentChannel || !paymentMethodsData) return null;

    // Payment channel format: "bank_bank-1768936195101"
    const code = paymentChannel.replace('bank_', '');
    const bankMethod = paymentMethodsData.find((m: any) => m.code === code);

    if (bankMethod && bankMethod.type === 'bank_transfer') {
      return {
        bankName: bankMethod.name,
        accountNumber: bankMethod.details?.accountNumber,
        accountName: bankMethod.details?.accountName,
      };
    }

    return null;
  }, [paymentChannel, paymentMethodsData]);

  // Filter bank transfer methods with qurban or general program
  const filteredPaymentMethods = useMemo(() => {
    const methods = paymentMethodsData || [];
    const bankMethods = methods.filter((m: any) => m.type === "bank_transfer");

    // Check if there are qurban-specific bank accounts
    const hasQurbanBanks = bankMethods.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("qurban");
    });

    // Filter: if qurban banks exist, show only qurban. Otherwise show general
    return bankMethods.filter((method: any) => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];

      if (hasQurbanBanks) {
        return programs.includes("qurban");
      }
      return programs.includes("general");
    });
  }, [paymentMethodsData]);

  const paymentMethodOptions = useMemo(
    () =>
      filteredPaymentMethods.map((method: any) => {
        const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];
        const programLabel = programs.join(", ");
        const owner = method.details?.accountName ? ` - a.n ${method.details.accountName}` : "";
        return {
          value: method.code,
          label: `${method.name}${owner} [${programLabel}]`,
        };
      }),
    [filteredPaymentMethods]
  );

  // Pre-fill payment method and proof if already exists
  useEffect(() => {
    if (payments && payments.length > 0) {
      const latestPayment = payments[0];

      // Pre-fill payment method from payment_channel
      if (latestPayment?.payment_channel) {
        // Old format: "bank_bank-1768936195101" -> "bank-1768936195101"
        // New format: "qris" or "bank-xxx" -> use as is
        const code = latestPayment.payment_channel.startsWith('bank_')
          ? latestPayment.payment_channel.replace('bank_', '')
          : latestPayment.payment_channel;
        setPayMethodId(code);
      }

      // Pre-fill payment proof
      if (latestPayment?.payment_proof_url) {
        setPayProofUrl(latestPayment.payment_proof_url);
      }
    }
  }, [payments]);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethodId, setPayMethodId] = useState("");
  const [payProofUrl, setPayProofUrl] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/admin/qurban/orders/${orderId}/confirm`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-order", orderId] });
      toast.success("Order berhasil dikonfirmasi");
    },
    onError: () => {
      toast.error("Gagal mengkonfirmasi order");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/admin/qurban/orders/${orderId}/cancel`, {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-order", orderId] });
      toast.success("Order berhasil dibatalkan");
    },
    onError: () => {
      toast.error("Gagal membatalkan order");
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceLink = async () => {
    if (!order?.order_number) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const invoiceUrl = `${origin}/invoice/qurban/${order.order_number}`;
    try {
      await navigator.clipboard.writeText(invoiceUrl);
      toast.success("Tautan invoice disalin");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyalin tautan invoice");
    }
  };

  const handleConfirm = () => {
    if (!confirm("Apakah Anda yakin ingin mengkonfirmasi order ini?")) return;
    confirmMutation.mutate();
  };

  const handleCancel = () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan order ini?")) return;
    cancelMutation.mutate();
  };

  const handleProcessPayment = async () => {
    // Validasi
    if (!payMethodId) {
      toast.error("Silakan pilih metode pembayaran");
      return;
    }

    // Cek apakah sudah ada payment record
    const hasExistingPayment = payments && payments.length > 0;

    // Jika belum ada payment record, bukti transfer HARUS diisi
    if (!hasExistingPayment && !payProofUrl) {
      toast.error("Bukti transfer harus diisi");
      return;
    }

    try {
      // Get payment method details for metadata
      const selectedMethod = filteredPaymentMethods.find((m: any) => m.code === payMethodId);
      const metadata = selectedMethod && selectedMethod.type === "bank_transfer" ? {
        bankName: selectedMethod.name,
        accountNumber: selectedMethod.details?.accountNumber,
        accountName: selectedMethod.details?.accountName,
      } : null;

      // Cek apakah ada perubahan dari data sebelumnya
      const existingPayment = hasExistingPayment ? payments[0] : null;
      // Normalize existing payment channel for comparison
      const existingPaymentChannel = existingPayment?.payment_channel?.startsWith('bank_')
        ? existingPayment.payment_channel.replace('bank_', '')
        : existingPayment?.payment_channel || '';
      const hasPaymentMethodChanged = existingPaymentChannel !== payMethodId;
      const hasProofChanged = existingPayment?.payment_proof_url !== payProofUrl;

      // Determine payment channel format based on payment method type
      // For backward compatibility with old bank_transfer records, still use bank_ prefix
      // For new QRIS/ewallet, use the code directly
      const paymentMethodType = selectedMethod?.type || 'bank_transfer';
      const paymentChannel = paymentMethodType === 'bank_transfer' && !payMethodId.startsWith('bank_')
        ? `bank_${payMethodId}`
        : payMethodId;

      // Jika ada perubahan, update payment record
      if (hasExistingPayment && (hasPaymentMethodChanged || hasProofChanged)) {
        // Update existing payment with changes
        await api.put(`/admin/qurban/payments/${existingPayment.id}`, {
          payment_channel: paymentChannel,
          payment_proof_url: payProofUrl,
          status: "verified",
        });
      } else if (hasExistingPayment && !hasPaymentMethodChanged && !hasProofChanged) {
        // Payment exists but no changes - just verify it
        await api.put(`/admin/qurban/payments/${existingPayment.id}`, {
          status: "verified",
        });
      } else if (!hasExistingPayment) {
        // Create new payment record
        const filename = payProofUrl.split("/").pop() || "Bukti Transfer";
        await api.post(`/admin/qurban/orders/${orderId}/payment-proof`, {
          payment_proof_url: payProofUrl,
          payment_channel: paymentChannel,
          notes: filename,
          verified: true,
        });
      }

      // Update order payment status and method
      await api.put(`/admin/qurban/orders/${orderId}`, {
        payment_status: "paid",
        payment_method_id: payMethodId,
        metadata: metadata,
      });

      toast.success("Pembayaran berhasil diproses");
      queryClient.invalidateQueries({ queryKey: ["qurban-order", orderId] });
      setShowPayModal(false);
      setPayMethodId("");
      setPayProofUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "Gagal memproses pembayaran");
    }
  };

  const handleApprovePayment = async () => {
    if (!confirm("Apakah Anda yakin ingin menyetujui pembayaran ini?")) return;

    setIsApproving(true);
    try {
      await api.post(`/admin/qurban/orders/${orderId}/approve-payment`, {});
      toast.success("Pembayaran berhasil disetujui");
      queryClient.invalidateQueries({ queryKey: ["qurban-order", orderId] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyetujui pembayaran");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPayment = async () => {
    const reason = prompt("Masukkan alasan penolakan (opsional):");
    if (reason === null) return; // User cancelled

    setIsRejecting(true);
    try {
      await api.post(`/admin/qurban/orders/${orderId}/reject-payment`, {
        reason: reason || undefined,
      });
      toast.success("Pembayaran ditolak");
      queryClient.invalidateQueries({ queryKey: ["qurban-order", orderId] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menolak pembayaran");
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500">Order tidak ditemukan</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/qurban/orders")}
            className="btn btn-primary btn-md mt-4"
          >
            Kembali ke Daftar Order
          </button>
        </div>
      </div>
    );
  }

  const statusBadgeMap: Record<string, string> = {
    pending: "bg-warning-50 text-warning-700",
    processing: "bg-blue-50 text-blue-700",
    partial: "bg-blue-50 text-blue-700",
    paid: "bg-success-50 text-success-700",
    overdue: "bg-danger-50 text-danger-700",
  };

  const orderStatusMap: Record<string, string> = {
    pending: "bg-warning-50 text-warning-700",
    confirmed: "bg-success-50 text-success-700",
    cancelled: "bg-danger-50 text-danger-700",
    executed: "bg-blue-50 text-blue-700",
  };

  const getStatusBadgeClass = (status: string, map: Record<string, string>) => {
    const normalized = status?.toLowerCase() || "";
    return map[normalized] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="dashboard-container">
      {/* Header - Hide on print */}
      <div className="mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/dashboard/qurban/orders")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali ke Daftar Order
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Order Qurban</h1>
            <p className="text-gray-600 mt-1">Informasi lengkap transaksi qurban</p>
          </div>
          <div className="flex gap-3">
            {order.payment_status === "pending" && (
              <button
                type="button"
                onClick={() => setShowPayModal(true)}
                className="btn btn-primary btn-md"
              >
                Proses Pembayaran
              </button>
            )}
            {order.payment_status === "processing" && (
              <>
                <button
                  type="button"
                  onClick={handleRejectPayment}
                  disabled={isRejecting}
                  className="btn btn-danger btn-md"
                >
                  {isRejecting ? "Menolak..." : "Tolak Pembayaran"}
                </button>
                <button
                  type="button"
                  onClick={handleApprovePayment}
                  disabled={isApproving}
                  className="btn btn-success btn-md"
                >
                  {isApproving ? "Menyetujui..." : "Setujui Pembayaran"}
                </button>
              </>
            )}
            {order.order_status === "pending" && order.payment_status === "paid" && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="btn btn-success btn-md"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {confirmMutation.isPending ? "Mengkonfirmasi..." : "Konfirmasi Order"}
              </button>
            )}
            {order.order_status === "pending" && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="btn btn-danger btn-md"
              >
                <XCircleIcon className="w-5 h-5" />
                {cancelMutation.isPending ? "Membatalkan..." : "Batalkan Order"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                window.open(`${origin}/invoice/qurban/${order.order_number}`, "_blank");
              }}
              className="btn btn-secondary btn-md"
            >
              <LinkIcon className="w-5 h-5" />
              Lihat Invoice
            </button>
            <button
              type="button"
              onClick={handleCopyInvoiceLink}
              className="btn btn-secondary btn-md"
            >
              <LinkIcon className="w-5 h-5" />
              Salin Link Invoice
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary btn-md"
            >
              <PrinterIcon className="w-5 h-5" />
              Cetak Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Invoice */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print:shadow-none print:border-0">
        {/* Invoice Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-sm text-gray-500 mt-1">Tanda Terima Order Qurban</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Nomor Order</p>
              <p className="text-lg font-mono font-bold text-gray-900">{order.order_number}</p>
              <div className="flex gap-2 mt-2 justify-end">
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                    order.payment_status,
                    statusBadgeMap
                  )}`}
                >
                  {order.payment_status}
                </span>
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                    order.order_status,
                    orderStatusMap
                  )}`}
                >
                  {order.order_status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Donor Info & Package */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Donor Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Donatur</h3>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">{order.donor_name}</p>
              {order.donor_email && <p className="text-sm text-gray-600">{order.donor_email}</p>}
              {order.donor_phone && <p className="text-sm text-gray-600">{order.donor_phone}</p>}
            </div>
          </div>

          {/* Package Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Paket Qurban</h3>
            <p className="text-lg font-semibold text-gray-900">{order.package_name || "-"}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                {order.animal_type === "cow" ? "🐄 Sapi" : "🐐 Kambing"}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                {order.package_type === "individual" ? "Individual" : "Patungan"}
              </span>
            </div>
            {order.period_name && (
              <p className="text-sm text-gray-600 mt-2">Periode: {order.period_name}</p>
            )}
            {order.on_behalf_of && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 font-medium mb-1">Atas Nama:</p>
                <p className="text-sm font-semibold text-amber-900">{order.on_behalf_of}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Detail Order</h3>
          <div className="space-y-3">
            {(() => {
              const subtotal = (order.unit_price || 0) * (order.quantity || 1);
              const calculatedAdminFee = order.admin_fee > 0
                ? order.admin_fee
                : (order.total_amount - subtotal);

              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Harga Hewan Qurban {order.quantity && order.quantity > 1 ? `(${order.quantity}x)` : ''}
                    </span>
                    <span className="font-mono text-gray-900">
                      Rp {formatRupiah(subtotal)}
                    </span>
                  </div>
                  {calculatedAdminFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Administrasi Penyembelihan</span>
                      <span className="font-mono text-gray-900">
                        Rp {formatRupiah(calculatedAdminFee)}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total Order</span>
              <span className="font-mono font-bold text-lg text-gray-900">
                Rp {formatRupiah(order.total_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Terbayar</span>
              <span className="font-mono text-success-600">Rp {formatRupiah(order.paid_amount)}</span>
            </div>
            {order.paid_amount < order.total_amount && (
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold text-rose-700">Sisa Pembayaran</span>
                <span className="font-mono font-bold text-lg text-rose-700">
                  Rp {formatRupiah(order.total_amount - order.paid_amount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Informasi Pembayaran</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Metode Pembayaran</p>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {order.payment_method === "full" ? "Bayar Penuh" : "Cicilan"}
              </p>
            </div>
            {(selectedBankAccount || parsedMetadata?.bankName) && (
              <div>
                <p className="text-sm text-gray-500">Transfer ke Rekening</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedBankAccount?.bankName || parsedMetadata?.bankName}
                  </p>
                  {(selectedBankAccount?.accountNumber || parsedMetadata?.accountNumber) && (
                    <p className="text-xs text-gray-600 font-mono">
                      {selectedBankAccount?.accountNumber || parsedMetadata?.accountNumber}
                    </p>
                  )}
                  {(selectedBankAccount?.accountName || parsedMetadata?.accountName) && (
                    <p className="text-xs text-gray-600">
                      a.n. {selectedBankAccount?.accountName || parsedMetadata?.accountName}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Status Pembayaran</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{order.payment_status}</p>
            </div>
            {payments.length > 0 && payments[0]?.payment_proof_url && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Bukti Transfer</p>
                <button
                  onClick={() =>
                    setProofModal({
                      open: true,
                      url: payments[0].payment_proof_url,
                      title: `Bukti Transfer ${order.order_number}`,
                    })
                  }
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <PaperClipIcon className="w-4 h-4" />
                  Lihat Bukti Transfer
                </button>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Tanggal Order</p>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(order.created_at), "dd MMMM yyyy, HH:mm", {
                  locale: idLocale,
                })}
              </p>
            </div>
            {order.confirmed_at && (
              <div>
                <p className="text-sm text-gray-500">Tanggal Konfirmasi</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(order.confirmed_at), "dd MMMM yyyy, HH:mm", {
                    locale: idLocale,
                  })}
                </p>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Doa atau Catatan</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Payment History - Hide on print */}
        {payments.length > 0 && (
          <div className="border-t border-gray-200 pt-6 mb-6 print:hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Riwayat Pembayaran</h3>
            <div className="space-y-2">
              {payments.map((payment: any) => {
                const statusLabels: Record<string, string> = {
                  pending: "Menunggu Verifikasi",
                  verified: "Terverifikasi",
                  rejected: "Ditolak",
                };

                return (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-gray-900">
                          Rp {formatRupiah(payment.amount)}
                        </p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            payment.status === "verified"
                              ? "bg-emerald-100 text-emerald-700"
                              : payment.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {statusLabels[payment.status] || payment.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", {
                          locale: idLocale,
                        })}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-gray-600 mt-1 italic">{payment.notes}</p>
                      )}
                    </div>
                    {payment.payment_proof_url && (
                      <button
                        onClick={() =>
                          setProofModal({
                            open: true,
                            url: payment.payment_proof_url,
                            title: `Bukti Pembayaran ${payment.payment_number}`,
                          })
                        }
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0 flex items-center gap-1"
                      >
                        <PaperClipIcon className="w-4 h-4" />
                        Lihat Bukti
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Terima kasih atas partisipasi Anda dalam ibadah qurban. Semoga diterima di sisi Allah SWT.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Invoice ini dibuat secara otomatis oleh sistem Bantuanku
          </p>
        </div>
      </div>

      {/* Payment Processing Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Proses Pembayaran</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Metode Pembayaran *</label>
                <Autocomplete
                  options={paymentMethodOptions}
                  value={payMethodId}
                  onChange={(val) => setPayMethodId(val)}
                  placeholder="Pilih metode pembayaran"
                  allowClear={false}
                />
              </div>
              <div>
                <label className="form-label">Bukti Transfer (opsional)</label>
                {payProofUrl ? (
                  <div className="flex items-center gap-3 bg-gray-50 border rounded p-3">
                    <PaperClipIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {payProofUrl.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPayProofUrl("")}
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowMedia(true)}
                  >
                    Pilih Bukti
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="btn btn-secondary btn-md" onClick={() => setShowPayModal(false)}>
                Batal
              </button>
              <button
                className="btn btn-primary btn-md"
                onClick={handleProcessPayment}
                disabled={!payMethodId}
              >
                Tandai Lunas
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaLibrary
        isOpen={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={(url) => {
          setPayProofUrl(url);
          setShowMedia(false);
        }}
        category="financial"
        accept="image/*,application/pdf"
        selectedUrl={payProofUrl}
      />

      {/* Proof Modal */}
      {proofModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{proofModal.title}</h3>
              <button
                onClick={() => setProofModal({ open: false, url: "", title: "" })}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {proofModal.url.toLowerCase().endsWith(".pdf") ? (
                <iframe src={proofModal.url} className="w-full h-[70vh]" />
              ) : (
                <img src={proofModal.url} alt={proofModal.title} className="w-full h-auto" />
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <a
                href={proofModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Buka di Tab Baru
              </a>
              <button
                onClick={() => setProofModal({ open: false, url: "", title: "" })}
                className="btn btn-primary btn-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
