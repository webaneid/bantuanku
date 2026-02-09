"use client";

import { use, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import api from "@/lib/api";
import { ClipboardIcon, PrinterIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function QurbanInvoicePage({
  params,
}: {
  params: Promise<{ referenceId: string }>;
}) {
  const { referenceId } = use(params);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });
  const [proofModal, setProofModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });

  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ["public-qurban-invoice", referenceId],
    queryFn: async () => {
      const response = await api.get(`/qurban/orders/by-number/${referenceId}`);
      return response.data;
    },
  });

  // Fetch payment methods to get bank account details
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
      return response.data?.data || [];
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

  const statusBadgeMap: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    processing: "bg-blue-50 text-blue-700 border border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    partial: "bg-blue-50 text-blue-700 border border-blue-200",
    overdue: "bg-rose-50 text-rose-700 border border-rose-200",
  };

  const orderStatusMap: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
    executed: "bg-blue-50 text-blue-700 border border-blue-200",
  };


  const handleCopyLink = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
    const link = `${origin}/invoice/qurban/${referenceId}`;
    try {
      await navigator.clipboard.writeText(link);
      setFeedback({
        open: true,
        type: "success",
        title: "Tautan disalin",
        message: "Link invoice sudah disalin ke clipboard.",
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menyalin",
        message: "Tidak dapat menyalin link invoice.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Invoice tidak ditemukan</p>
          <p className="text-gray-600 mt-2">Nomor order: {referenceId}</p>
        </div>
      </div>
    );
  }

  const subtotal = (order.unit_price || 0) * (order.quantity || 1);
  const calculatedAdminFee = order.admin_fee > 0
    ? order.admin_fee
    : (order.total_amount - subtotal);

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Actions - Hide on print */}
          <div className="flex justify-end gap-3 mb-4 print:hidden">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ClipboardIcon className="w-4 h-4" />
              Salin Link
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
              Cetak
            </button>
          </div>

          {/* Invoice Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Header */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">INVOICE QURBAN</h1>
                  <p className="text-sm text-gray-600 mt-1">No. Order: {order.order_number}</p>
                </div>
                <div className="text-right">
                  <div className="flex flex-col gap-2 mt-2 items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Pembayaran:</span>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          statusBadgeMap[order.payment_status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {{
                          pending: "Belum Bayar",
                          processing: "Diproses",
                          paid: "Lunas",
                          partial: "Sebagian",
                          overdue: "Terlambat",
                        }[order.payment_status] || order.payment_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Order:</span>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          orderStatusMap[order.order_status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {{
                          pending: "Menunggu Konfirmasi",
                          confirmed: "Dikonfirmasi",
                          cancelled: "Dibatalkan",
                          executed: "Selesai",
                        }[order.order_status] || order.order_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Donor Info & Package */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Donor Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Donatur</h3>
                <p className="text-base font-semibold text-gray-900">{order.donor_name}</p>
                {order.donor_email && <p className="text-sm text-gray-600">{order.donor_email}</p>}
                {order.donor_phone && <p className="text-sm text-gray-600">{order.donor_phone}</p>}
              </div>

              {/* Package Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Paket Qurban</h3>
                <p className="text-base font-semibold text-gray-900">{order.package_name || "-"}</p>
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

            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detail Order</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Harga Hewan Qurban {order.quantity && order.quantity > 1 ? `(${order.quantity}x)` : ''}
                  </span>
                  <span className="font-mono text-gray-900">Rp {formatRupiah(subtotal)}</span>
                </div>
                {calculatedAdminFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Administrasi Penyembelihan</span>
                    <span className="font-mono text-gray-900">Rp {formatRupiah(calculatedAdminFee)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total Order</span>
                  <span className="font-mono font-bold text-lg text-gray-900">Rp {formatRupiah(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Terbayar</span>
                  <span className="font-mono text-emerald-600">Rp {formatRupiah(order.paid_amount)}</span>
                </div>
                {order.paid_amount < order.total_amount && (
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-rose-700">Sisa Pembayaran</span>
                    <span className="font-mono font-bold text-lg text-rose-700">
                      Rp {formatRupiah(order.total_amount - order.paid_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Informasi Pembayaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Metode Pembayaran</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {order.payment_method === "full" ? "Bayar Penuh" : "Cicilan"}
                  </p>
                </div>
                {(selectedBankAccount || parsedMetadata?.bankName) && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Transfer ke Rekening</p>
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
                  <p className="text-sm text-gray-500 mb-1">Status Pembayaran</p>
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
                  <p className="text-sm text-gray-500 mb-1">Tanggal Order</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(order.created_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                  </p>
                </div>
                {order.confirmed_at && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tanggal Konfirmasi</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(order.confirmed_at), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {order.notes && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Doa atau Catatan</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* Payment History - show if there are multiple payments */}
            {payments && payments.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Riwayat Pembayaran</h3>
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
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Rp {formatRupiah(payment.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(payment.created_at), "dd MMM yyyy, HH:mm", {
                              locale: idLocale,
                            })}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            payment.status === "verified"
                              ? "bg-emerald-50 text-emerald-700"
                              : payment.status === "rejected"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {statusLabels[payment.status] || payment.status}
                        </span>
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
        </div>
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback({ ...feedback, open: false })}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {proofModal.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={proofModal.url} className="w-full h-[70vh]" title={proofModal.title} />
              ) : (
                <div>
                  <img
                    src={proofModal.url}
                    alt={proofModal.title}
                    className="w-full h-auto"
                    onError={(e) => {
                      console.error("Image failed to load:", proofModal.url);
                      e.currentTarget.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-center p-8 text-red-600';
                      errorDiv.innerHTML = `
                        <p class="font-semibold mb-2">Gagal memuat gambar</p>
                        <p class="text-sm text-gray-600 mb-4">URL: ${proofModal.url}</p>
                        <a href="${proofModal.url}" target="_blank" class="text-blue-600 underline text-sm">Coba buka langsung</a>
                      `;
                      e.currentTarget.parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
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
    </>
  );
}
