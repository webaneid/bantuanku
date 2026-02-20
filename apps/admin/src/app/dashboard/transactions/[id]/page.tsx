"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  formatRupiah,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
  getTransactionPaymentStatusLabel,
  getTransactionPaymentStatusBadgeClass
} from "@/lib/format";
import { getCategoryLabel } from "@/lib/category-utils";
import Autocomplete from "@/components/Autocomplete";
import AdminPaymentMethodList from "@/components/AdminPaymentMethodList";
import MediaLibrary from "@/components/MediaLibrary";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string>("");
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    paymentProof: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["transaction", id],
    queryFn: async () => {
      const response = await api.get(`/transactions/${id}`);
      return response.data;
    },
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
      return response.data?.data || [];
    },
  });

  const transaction = data?.data?.data || data?.data;
  const selectedPaymentMethod = paymentMethodsData?.find(
    (m: any) => m.code === transaction?.paymentMethodId
  );
  const expectedTransferAmount = Number(transaction?.totalAmount || 0) + Number(transaction?.uniqueCode || 0);

  const handleApprovePayment = async () => {
    setIsApproving(true);
    try {
      await api.post(`/transactions/${id}/approve-payment`, {});
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pembayaran berhasil disetujui",
      });
      setShowApproveModal(false);
      refetch();
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal menyetujui pembayaran",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPayment = async () => {
    setIsRejecting(true);
    try {
      await api.post(`/transactions/${id}/reject-payment`, {
        reason: rejectReason || undefined,
      });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pembayaran ditolak",
      });
      setShowRejectModal(false);
      setRejectReason("");
      refetch();
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal menolak pembayaran",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenPaymentModal = () => {
    const remainingAmount = transaction.totalAmount - transaction.paidAmount;
    setPaymentForm({
      amount: remainingAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: transaction.paymentMethodId || "",
      paymentProof: "",
    });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Jumlah pembayaran harus lebih dari 0",
      });
      return;
    }
    if (!paymentForm.paymentMethod) {
      setFeedback({
        open: true,
        type: "error",
        title: "Validasi",
        message: "Metode pembayaran harus dipilih",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/transactions/${id}/payments`, paymentForm);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pembayaran berhasil ditambahkan",
      });
      setShowPaymentModal(false);
      refetch();
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal menambahkan pembayaran",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const programFilter = (() => {
    if (!transaction) return "general";

    if (transaction.productType === "campaign") {
      const pillar = transaction.typeSpecificData?.pillar;
      if (pillar === "wakaf") {
        return "wakaf";
      } else {
        return "infaq";
      }
    } else if (transaction.productType === "zakat") {
      return "zakat";
    } else if (transaction.productType === "qurban") {
      return "qurban";
    } else {
      return "general";
    }
  })();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Transaction not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-500">Transaction Number</label>
              <div className="font-semibold">{transaction.transactionNumber}</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Product Type</label>
              <div className="font-semibold capitalize">{transaction.productType}</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Product Name</label>
              <div className="font-semibold">{transaction.productName}</div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Kategori</label>
              <div className="font-semibold">
                {transaction.category ? getCategoryLabel(transaction.category) : "-"}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Payment Status</label>
              <div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusBadgeClass(
                    transaction.paymentStatus
                  )}`}
                >
                  {getPaymentStatusLabel(transaction.paymentStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mb-6">
            <h2 className="font-semibold mb-3">Donor Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <div>{transaction.donorName}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div>{transaction.donorEmail || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <div>{transaction.donorPhone || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Anonymous</label>
                <div>{transaction.isAnonymous ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mb-6">
            <h2 className="font-semibold mb-3">Order Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{transaction.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Unit Price:</span>
                <span>Rp {transaction.unitPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rp {transaction.subtotal?.toLocaleString()}</span>
              </div>
              {transaction.adminFee > 0 && (
                <div className="flex justify-between">
                  <span>Admin Fee:</span>
                  <span>Rp {transaction.adminFee?.toLocaleString()}</span>
                </div>
              )}
              {transaction.uniqueCode > 0 && (
                <div className="flex justify-between">
                  <span>Kode Unik:</span>
                  <span>Rp {transaction.uniqueCode?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>{transaction.uniqueCode > 0 ? 'Total Transfer:' : 'Total:'}</span>
                <span>Rp {formatRupiah(transaction.totalAmount + (transaction.uniqueCode || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid Amount:</span>
                <span className="text-green-600 font-medium">Rp {formatRupiah(transaction.paidAmount)}</span>
              </div>
              {(() => {
                const remaining = (transaction.totalAmount + (transaction.uniqueCode || 0)) - transaction.paidAmount;
                if (remaining > 0) {
                  return (
                    <div className="flex justify-between text-sm">
                      <span>Sisa Pembayaran:</span>
                      <span className="text-warning-600 font-medium">Rp {formatRupiah(remaining)}</span>
                    </div>
                  );
                } else if (remaining < 0) {
                  return (
                    <div className="flex justify-between text-sm">
                      <span>Kelebihan Pembayaran:</span>
                      <span className="text-blue-600 font-medium">Rp {formatRupiah(Math.abs(remaining))}</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex justify-between text-sm">
                      <span>Sisa Pembayaran:</span>
                      <span className="text-success-600 font-medium">Rp 0</span>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {transaction.message && (
            <div className="border-t pt-4 mb-6">
              <h2 className="font-semibold mb-2">Message</h2>
              <div className="text-gray-700">{transaction.message}</div>
            </div>
          )}

          {transaction.typeSpecificData?.onBehalfOf && (
            <div className="border-t pt-4 mb-6">
              <h2 className="font-semibold mb-2">Atas Nama</h2>
              <div className="text-gray-700">{transaction.typeSpecificData.onBehalfOf}</div>
            </div>
          )}

          {transaction.typeSpecificData && (
            <div className="border-t pt-4 mb-6">
              <h2 className="font-semibold mb-2">Detail Tambahan</h2>
              <div className="bg-gray-50 p-4 rounded space-y-2">
                {transaction.productType === "campaign" && (
                  <>
                    {transaction.typeSpecificData.pillar && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pilar:</span>
                        <span className="font-medium capitalize">{transaction.typeSpecificData.pillar}</span>
                      </div>
                    )}
                  </>
                )}
                {transaction.productType === "zakat" && (
                  <>
                    {transaction.typeSpecificData.zakat_type_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jenis Zakat:</span>
                        <span className="font-medium">{transaction.typeSpecificData.zakat_type_name}</span>
                      </div>
                    )}
                    {transaction.typeSpecificData.zakat_period_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Periode:</span>
                        <span className="font-medium">{transaction.typeSpecificData.zakat_period_name}</span>
                      </div>
                    )}
                    {transaction.typeSpecificData.year && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tahun:</span>
                        <span className="font-medium">
                          {transaction.typeSpecificData.year}
                          {transaction.typeSpecificData.hijri_year && ` / ${transaction.typeSpecificData.hijri_year}`}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {transaction.productType === "qurban" && (
                  <>
                    {transaction.typeSpecificData.packageName && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Paket:</span>
                        <span className="font-medium">{transaction.typeSpecificData.packageName}</span>
                      </div>
                    )}
                    {transaction.typeSpecificData.period && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Periode:</span>
                        <span className="font-medium">{transaction.typeSpecificData.period}</span>
                      </div>
                    )}
                    {transaction.typeSpecificData.sharedGroupId && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Patungan:</span>
                        <span className="font-medium">Ya (Group ID: {transaction.typeSpecificData.sharedGroupId})</span>
                      </div>
                    )}
                    {transaction.typeSpecificData.onBehalfOf && !transaction.message && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Atas Nama:</span>
                        <span className="font-medium">{transaction.typeSpecificData.onBehalfOf}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Nominal Transfer:</span>
                  <span className="font-medium">Rp {formatRupiah(expectedTransferAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode Dipilih:</span>
                  <span className="font-medium text-right">
                    {selectedPaymentMethod ? (
                      selectedPaymentMethod.type === "bank_transfer" ? (
                        <>
                          {selectedPaymentMethod.name}
                          {selectedPaymentMethod.details?.accountNumber && (
                            <span className="block text-xs text-gray-600">
                              {selectedPaymentMethod.details.accountNumber}
                              {selectedPaymentMethod.details?.accountName && ` - ${selectedPaymentMethod.details.accountName}`}
                            </span>
                          )}
                        </>
                      ) : (
                        selectedPaymentMethod.name
                      )
                    ) : (
                      <span className="text-gray-500">Belum dipilih</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Proofs Section */}
          {transaction.payments && transaction.payments.length > 0 && (
            <div className="border-t pt-4">
              <h2 className="font-semibold mb-3">Bukti Pembayaran</h2>
              <div className="space-y-3">
                {transaction.payments.map((payment: any) => {
                  const paymentMethod = paymentMethodsData?.find((m: any) => m.code === payment.paymentMethod);
                  return (
                    <div
                      key={payment.id}
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {payment.paymentNumber}
                          </p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            Rp {formatRupiah(payment.amount)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getTransactionPaymentStatusBadgeClass(payment.status)}`}>
                          {getTransactionPaymentStatusLabel(payment.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <p className="text-gray-500">Tanggal Transfer</p>
                          <p className="text-gray-900 font-medium">
                            {payment.paymentDate && format(new Date(payment.paymentDate), "dd MMM yyyy", {
                              locale: idLocale,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Metode Pembayaran</p>
                          <p className="text-gray-900 font-medium">
                            {paymentMethod ? (
                              paymentMethod.type === "bank_transfer" ? (
                                <>
                                  {paymentMethod.name}
                                  {paymentMethod.details?.accountNumber && (
                                    <span className="block text-xs text-gray-600">
                                      {paymentMethod.details.accountNumber}
                                      {paymentMethod.details?.accountName && ` - ${paymentMethod.details.accountName}`}
                                    </span>
                                  )}
                                </>
                              ) : (
                                paymentMethod.name
                              )
                            ) : (
                              payment.paymentMethod
                            )}
                          </p>
                        </div>
                      </div>

                      {payment.paymentProof && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              setSelectedProof(payment.paymentProof);
                              setShowProofModal(true);
                            }}
                            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <PaperClipIcon className="w-4 h-4" />
                            Lihat Bukti Transfer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          {(transaction.paymentStatus === "pending" || transaction.paymentStatus === "partial") && (
            <button
              onClick={handleOpenPaymentModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Bukti Pembayaran
            </button>
          )}
          {transaction.paymentStatus === "processing" && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isRejecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? "Menolak..." : "Tolak Pembayaran"}
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={isApproving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? "Menyetujui..." : "Setujui Pembayaran"}
              </button>
            </>
          )}
          <button
            onClick={() => router.push("/dashboard/transactions/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Another
          </button>
          <button
            onClick={() => {
              const webUrl = process.env.NEXT_PUBLIC_WEB_URL || window.location.origin;
              const invoiceUrl = `${webUrl}/invoice/${transaction.id}`;
              navigator.clipboard.writeText(invoiceUrl);
              setFeedback({
                open: true,
                type: "success",
                title: "Berhasil",
                message: "Invoice link copied!",
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Copy Invoice Link
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Bukti Pembayaran
            </h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Jumlah Pembayaran <span className="text-danger-500">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kosongkan jika user belum melakukan pembayaran
                </p>
              </div>
              <div>
                <label className="form-label">
                  Tanggal Pembayaran <span className="text-danger-500">*</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={paymentForm.paymentDate}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="form-label">
                  Metode Pembayaran <span className="text-danger-500">*</span>
                </label>
                <AdminPaymentMethodList
                  value={paymentForm.paymentMethod}
                  onChange={(val) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: val })
                  }
                  types={["cash", "bank_transfer", "qris"]}
                  programFilter={programFilter}
                  placeholder="Pilih metode pembayaran"
                  allowClear={false}
                />
              </div>
              <div>
                <label className="form-label">Bukti Transfer (Opsional)</label>
                {paymentForm.paymentProof ? (
                  <div className="flex items-center gap-3 bg-gray-50 border rounded p-3">
                    <PaperClipIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {paymentForm.paymentProof.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setPaymentForm({ ...paymentForm, paymentProof: "" })
                      }
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowMediaLibrary(true)}
                  >
                    Pilih Bukti
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="btn btn-secondary btn-md"
                onClick={() => setShowPaymentModal(false)}
              >
                Batal
              </button>
              <button
                className="btn btn-primary btn-md"
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      {showProofModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProofModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowProofModal(false)}
              className="absolute top-4 right-4 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-200 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {selectedProof.endsWith('.pdf') ? (
              <iframe src={selectedProof} className="w-full h-[80vh] bg-white rounded-lg" />
            ) : (
              <img src={selectedProof} alt="Bukti Transfer" className="max-w-full h-auto rounded-lg" />
            )}
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Setujui Pembayaran</h3>
            <p className="text-sm text-gray-700 mb-5">Apakah Anda yakin ingin menyetujui pembayaran ini?</p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-secondary btn-md"
                onClick={() => setShowApproveModal(false)}
                disabled={isApproving}
              >
                Batal
              </button>
              <button
                className="btn btn-primary btn-md"
                onClick={handleApprovePayment}
                disabled={isApproving}
              >
                {isApproving ? "Menyetujui..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tolak Pembayaran</h3>
            <div className="mb-5">
              <label className="form-label">Alasan Penolakan (opsional)</label>
              <textarea
                className="form-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Masukkan alasan penolakan..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-secondary btn-md"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={isRejecting}
              >
                Batal
              </button>
              <button
                className="btn btn-danger btn-md"
                onClick={handleRejectPayment}
                disabled={isRejecting}
              >
                {isRejecting ? "Menolak..." : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={(url) => {
          setPaymentForm({ ...paymentForm, paymentProof: url });
          setShowMediaLibrary(false);
        }}
        category="financial"
        accept="image/*,application/pdf"
        selectedUrl={paymentForm.paymentProof}
      />

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
