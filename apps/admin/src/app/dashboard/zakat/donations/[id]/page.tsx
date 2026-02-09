"use client";

import { use, useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PencilIcon, PrinterIcon, PaperClipIcon, LinkIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function ZakatDonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: donationId } = use(params);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethodId, setPayMethodId] = useState("");
  const [payProofUrl, setPayProofUrl] = useState("");
  const [showMedia, setShowMedia] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "error", title: "" });
  const [proofModal, setProofModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Fetch donation detail
  const { data: donation, isLoading } = useQuery({
    queryKey: ["zakat-donation", donationId],
    queryFn: async () => {
      const response = await api.get(`/admin/zakat/donations/${donationId}`);
      return response.data.data;
    },
    enabled: !!donationId,
  });

  // Pre-fill payment method and proof if already exists
  useEffect(() => {
    if (donation?.paymentMethodId) {
      setPayMethodId(donation.paymentMethodId);
    }

    if (donation?.paymentReference) {
      setPayProofUrl(donation.paymentReference);
    }
  }, [donation]);

  // Payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
      return response.data?.data || [];
    },
  });

  const filteredPaymentMethods = useMemo(() => {
    const methods = paymentMethodsData || [];
    const bankMethods = methods.filter((m: any) => m.type === "bank_transfer");
    const qrisMethods = methods.filter((m: any) => m.type === "qris");

    const zakatBanks = bankMethods.filter((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("zakat");
    });

    const zakatQris = qrisMethods.filter((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("zakat");
    });

    const hasZakatAccounts = zakatBanks.length > 0 || zakatQris.length > 0;

    const allowedBanks = hasZakatAccounts
      ? zakatBanks
      : bankMethods.filter((m: any) => {
          const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
          return programs.includes("general");
        });

    const allowedQris = hasZakatAccounts
      ? zakatQris
      : qrisMethods.filter((m: any) => {
          const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
          return programs.includes("general");
        });

    const otherMethods = methods.filter((m: any) => m.type !== "bank_transfer" && m.type !== "qris");

    return [...allowedBanks, ...allowedQris, ...otherMethods];
  }, [paymentMethodsData]);

  const paymentMethodOptions = useMemo(
    () =>
      filteredPaymentMethods.map((method: any) => {
        const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];
        const programLabel = programs.join(", ");

        let label = method.name;

        if (method.type === "bank_transfer") {
          const accountNumber = method.details?.accountNumber || "";
          const accountName = method.details?.accountName || "";
          label = `${method.details?.bankName || method.name} - ${accountNumber}${accountName ? ` - a.n ${accountName}` : ""} [${programLabel}]`;
        } else if (method.type === "qris") {
          const qrisName = method.details?.name || method.name;
          label = `${qrisName} [${programLabel}]`;
        }

        return {
          value: method.code,
          label,
        };
      }),
    [filteredPaymentMethods]
  );

  // Get selected payment method details
  const selectedPaymentMethod = useMemo(() => {
    if (!donation?.paymentMethodId || !paymentMethodsData) return null;
    return paymentMethodsData.find((m: any) => m.code === donation.paymentMethodId);
  }, [donation?.paymentMethodId, paymentMethodsData]);

  const handlePay = async () => {
    if (!payMethodId) return;
    try {
      await api.put(`/admin/zakat/donations/${donationId}`, {
        paymentStatus: "success",
        paymentMethodId: payMethodId,
        paymentReference: payProofUrl || undefined,
        paidAt: new Date().toISOString(),
      });

      toast.success("Pembayaran berhasil diproses");
      setShowPayModal(false);
      setPayMethodId("");
      setPayProofUrl("");
      window.location.reload();
    } catch (error: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal memproses pembayaran",
        message: error.response?.data?.message || error.response?.data?.error || "Terjadi kesalahan.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceLink = async () => {
    if (!donation?.referenceId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const invoiceUrl = `${origin}/invoice/zakat/${donation.referenceId}`;
    try {
      await navigator.clipboard.writeText(invoiceUrl);
      toast.success("Tautan invoice disalin");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyalin tautan invoice");
    }
  };

  const handleApprovePayment = async () => {
    if (!confirm("Apakah Anda yakin ingin menyetujui pembayaran ini?")) return;

    setIsApproving(true);
    try {
      await api.post(`/admin/zakat/donations/${donationId}/approve-payment`, {});
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
      await api.post(`/admin/zakat/donations/${donationId}/reject-payment`, {
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

  if (!donation) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500">Pembayaran zakat tidak ditemukan</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/zakat/donations")}
            className="btn btn-primary btn-md mt-4"
          >
            Kembali ke Daftar Pembayaran
          </button>
        </div>
      </div>
    );
  }

  const statusBadgeMap: Record<string, string> = {
    pending: "bg-warning-50 text-warning-700",
    processing: "bg-blue-50 text-blue-700",
    success: "bg-success-50 text-success-700",
    failed: "bg-danger-50 text-danger-700",
    expired: "bg-gray-100 text-gray-700",
  };

  const statusLabelMap: Record<string, string> = {
    pending: "Pending",
    processing: "Menunggu Verifikasi",
    success: "Berhasil",
    failed: "Gagal",
    expired: "Kadaluarsa",
  };

  const getStatusBadgeClass = (status: string) => {
    const normalized = status?.toLowerCase() || "";
    return statusBadgeMap[normalized] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const normalized = status?.toLowerCase() || "";
    return statusLabelMap[normalized] || status;
  };

  return (
    <div className="dashboard-container">
      {/* Header - Hide on print */}
      <div className="mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/dashboard/zakat/donations")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali ke Daftar Pembayaran Zakat
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Pembayaran Zakat</h1>
            <p className="text-gray-600 mt-1">Informasi lengkap transaksi zakat</p>
          </div>
          <div className="flex gap-3">
            {donation.paymentStatus === "pending" && (
              <button
                type="button"
                onClick={() => setShowPayModal(true)}
                className="btn btn-primary btn-md"
              >
                Proses Pembayaran
              </button>
            )}
            {donation.paymentStatus === "processing" && (
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
            <button
              type="button"
              onClick={() => router.push(`/dashboard/zakat/donations/${donationId}/edit`)}
              className="btn btn-primary btn-md"
            >
              <PencilIcon className="w-5 h-5" />
              Edit Donasi
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
              <p className="text-sm text-gray-500 mt-1">Tanda Terima Zakat</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Nomor Referensi</p>
              <p className="text-lg font-mono font-bold text-gray-900">{donation.referenceId}</p>
              <span
                className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getStatusBadgeClass(
                  donation.paymentStatus
                )}`}
              >
                {getStatusLabel(donation.paymentStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* Donor Info & Zakat Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Donor Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Muzaki</h3>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">
                {donation.donorName}
                {donation.isAnonymous && (
                  <span className="ml-2 text-sm text-warning-600 font-medium">(Anonim)</span>
                )}
              </p>
              {donation.donorEmail && (
                <p className="text-sm text-gray-600">{donation.donorEmail}</p>
              )}
              {donation.donorPhone && (
                <p className="text-sm text-gray-600">{donation.donorPhone}</p>
              )}
            </div>
          </div>

          {/* Zakat Type Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Jenis Zakat</h3>
            <p className="text-lg font-semibold text-gray-900">
              {donation.zakatType?.name || donation.zakatTypeName || "-"}
            </p>
          </div>
        </div>

        {/* Donation Details */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Detail Donasi</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Nominal Donasi</span>
              <span className="font-mono font-semibold text-gray-900">
                {formatCurrency(donation.amount)}
              </span>
            </div>
            {donation.calculatedZakat && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hasil Kalkulator</span>
                <span className="font-mono text-gray-700">
                  {formatCurrency(donation.calculatedZakat)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-mono font-bold text-lg text-gray-900">
                {formatCurrency(donation.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Informasi Pembayaran</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={donation.paymentMethodId?.startsWith('bank-') ? "md:col-span-2" : ""}>
              <p className="text-sm text-gray-500 mb-2">Metode Pembayaran</p>
              {donation.paymentMethodId ? (() => {
                const code = donation.paymentMethodId;

                // Transfer Bank - tampilkan detail lengkap bank tujuan
                if (code.startsWith('bank-')) {
                  // Get bank details from metadata or fallback to payment method details
                  const bankName = donation.metadata?.bankName || selectedPaymentMethod?.details?.bankName || selectedPaymentMethod?.name || 'N/A';
                  const accountNumber = donation.metadata?.accountNumber || selectedPaymentMethod?.details?.accountNumber || 'N/A';
                  const accountName = donation.metadata?.accountName || selectedPaymentMethod?.details?.accountName || 'N/A';

                  return (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Transfer Bank</p>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex">
                          <span className="w-32 font-medium">Bank:</span>
                          <span>{bankName}</span>
                        </div>
                        <div className="flex">
                          <span className="w-32 font-medium">No. Rekening:</span>
                          <span className="font-mono">{accountNumber}</span>
                        </div>
                        <div className="flex">
                          <span className="w-32 font-medium">Atas Nama:</span>
                          <span>{accountName}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Payment methods lainnya
                let name = code;
                if (code === 'cash') name = 'Tunai / Cash';
                else if (code === 'qris') name = 'QRIS';
                else if (code.includes('qris')) name = 'QRIS';
                else if (code.includes('va:')) name = 'Virtual Account';

                return <p className="text-sm font-medium text-gray-900">{name}</p>;
              })() : <p className="text-sm font-medium text-gray-900">-</p>}
            </div>
            <div>
              <p className="text-sm text-gray-500">Status Pembayaran</p>
              <p className="text-sm font-medium text-gray-900">
                {getStatusLabel(donation.paymentStatus)}
              </p>
            </div>
            {donation.paidAt && (
              <div>
                <p className="text-sm text-gray-500">Tanggal Pembayaran</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(donation.paidAt), "dd MMMM yyyy, HH:mm", {
                    locale: idLocale,
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Tanggal Donasi</p>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(donation.createdAt), "dd MMMM yyyy, HH:mm", {
                  locale: idLocale,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Message/Notes */}
        {(donation.message || donation.notes) && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              {donation.message ? "Pesan / Doa" : "Catatan"}
            </h3>
            <p className="text-sm text-gray-700 italic">
              &quot;{donation.message || donation.notes}&quot;
            </p>
          </div>
        )}

        {/* Bukti Transfer - Hide on print */}
        {donation.paymentReference && (
          <div className="border-t border-gray-200 pt-6 mb-6 print:hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Bukti Transfer</h3>
            {donation.paymentReference.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <div>
                <img
                  src={donation.paymentReference}
                  alt="Bukti Transfer"
                  className="w-full max-w-md h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setProofModal({
                    open: true,
                    url: donation.paymentReference,
                    title: "Bukti Transfer"
                  })}
                />
                <p className="text-xs text-gray-500 mt-2">Klik gambar untuk melihat ukuran penuh</p>
              </div>
            ) : donation.paymentReference.toLowerCase().endsWith('.pdf') ? (
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <PaperClipIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Bukti Transfer (PDF)</p>
                </div>
                <button
                  onClick={() => setProofModal({
                    open: true,
                    url: donation.paymentReference,
                    title: "Bukti Transfer"
                  })}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                >
                  Lihat Bukti
                </button>
              </div>
            ) : (
              <div className="font-mono text-sm text-gray-900 break-all p-3 bg-gray-50 rounded">
                {donation.paymentReference}
              </div>
            )}
          </div>
        )}

        {/* Calculator Data */}
        {donation.calculatorData && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Data Kalkulator</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {donation.calculatorData.zakatType === 'fitrah' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Jumlah Jiwa</span>
                    <span className="font-semibold text-gray-900">{donation.calculatorData.quantity} orang</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Harga per Jiwa</span>
                    <span className="font-mono text-gray-900">{formatCurrency(donation.calculatorData.pricePerUnit)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                    <span className="font-semibold text-gray-900">Total Kalkulasi</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {formatCurrency(donation.calculatorData.quantity * donation.calculatorData.pricePerUnit)}
                    </span>
                  </div>
                </>
              )}
              {donation.calculatorData.zakatType !== 'fitrah' && (
                <div className="text-sm text-gray-700">
                  <pre className="overflow-x-auto">
                    {JSON.stringify(donation.calculatorData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Terima kasih atas donasi Anda. Semoga menjadi amal jariyah yang berkah.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Invoice ini dibuat secara otomatis oleh sistem Bantuanku
          </p>
        </div>
      </div>

      {/* Payment Modal */}
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
                onClick={handlePay}
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

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
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
