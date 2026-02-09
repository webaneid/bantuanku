"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  formatRupiah,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
  getTransactionPaymentStatusLabel,
  getTransactionPaymentStatusBadgeClass
} from "@/lib/format";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
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

  const handleApprovePayment = async () => {
    if (!confirm("Apakah Anda yakin ingin menyetujui pembayaran ini?")) return;

    setIsApproving(true);
    try {
      await api.post(`/transactions/${id}/approve-payment`, {});
      toast.success("Pembayaran berhasil disetujui");
      window.location.reload();
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
      await api.post(`/transactions/${id}/reject-payment`, {
        reason: reason || undefined,
      });
      toast.success("Pembayaran ditolak");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menolak pembayaran");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenPaymentModal = () => {
    const remainingAmount = transaction.totalAmount - transaction.paidAmount;
    setPaymentForm({
      amount: remainingAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "",
      paymentProof: "",
    });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }
    if (!paymentForm.paymentMethod) {
      toast.error("Metode pembayaran harus dipilih");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/transactions/${id}/payments`, paymentForm);
      toast.success("Pembayaran berhasil ditambahkan");
      setShowPaymentModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menambahkan pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethodOptions = (() => {
    const methods = paymentMethodsData || [];
    let targetProgram = "general";

    if (transaction?.productType === "campaign") {
      const pillar = transaction.typeSpecificData?.pillar;
      if (pillar === "wakaf") {
        targetProgram = "wakaf";
      } else {
        targetProgram = "infaq";
      }
    } else if (transaction?.productType === "zakat") {
      targetProgram = "zakat";
    } else if (transaction?.productType === "qurban") {
      targetProgram = "qurban";
    } else {
      targetProgram = "infaq";
    }

    const bankAndQris = methods.filter(
      (m: any) => m.type === "bank_transfer" || m.type === "qris"
    );

    const hasTargetProgram = bankAndQris.some((m: any) => {
      const programs =
        m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes(targetProgram);
    });

    const filtered = bankAndQris.filter((m: any) => {
      const programs =
        m.programs && m.programs.length > 0 ? m.programs : ["general"];

      if (hasTargetProgram) {
        return programs.includes(targetProgram);
      } else {
        return programs.includes("general");
      }
    });

    return filtered.map((method: any) => {
      const programs =
        method.programs && method.programs.length > 0
          ? method.programs
          : ["general"];
      const programLabel = programs.join(", ");

      let label = method.name;
      if (method.type === "bank_transfer") {
        const accountNumber = method.details?.accountNumber || "";
        const accountName = method.details?.accountName || "";
        label = `${method.details?.bankName || method.name} - ${accountNumber}${
          accountName ? ` - a.n ${accountName}` : ""
        } [${programLabel}]`;
      } else if (method.type === "qris") {
        const qrisName = method.details?.name || method.name;
        label = `${qrisName} [${programLabel}]`;
      }

      return {
        value: method.code,
        label,
      };
    });
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
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>Rp {formatRupiah(transaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid Amount:</span>
                <span className="text-green-600 font-medium">Rp {formatRupiah(transaction.paidAmount)}</span>
              </div>
              {(() => {
                const remaining = transaction.totalAmount - transaction.paidAmount;
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
                    {transaction.typeSpecificData.zakatType && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Jenis Zakat:</span>
                        <span className="font-medium">{transaction.typeSpecificData.zakatType}</span>
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
                  </>
                )}
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
                onClick={handleRejectPayment}
                disabled={isRejecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? "Menolak..." : "Tolak Pembayaran"}
              </button>
              <button
                onClick={handleApprovePayment}
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
              const invoiceUrl = `${window.location.origin}/invoice/${transaction.transactionNumber || transaction.id}`;
              navigator.clipboard.writeText(invoiceUrl);
              alert("Invoice link copied!");
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
                <Autocomplete
                  options={paymentMethodOptions}
                  value={paymentForm.paymentMethod}
                  onChange={(val) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: val })
                  }
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
    </div>
  );
}
