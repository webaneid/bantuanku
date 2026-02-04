"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PencilIcon, PrinterIcon, PaperClipIcon, LinkIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import MediaLibrary from "@/components/MediaLibrary";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import { toast } from "react-hot-toast";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function ViewDonationPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: donation, isLoading } = useQuery({
    queryKey: ["donation", donationId],
    queryFn: async () => {
      const response = await api.get(`/admin/donations/${donationId}`);
      return response.data?.data;
    },
  });

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

    const hasWakafBanks = bankMethods.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("wakaf");
    });
    const hasWakafQris = qrisMethods.some((m: any) => {
      const programs = m.programs && m.programs.length > 0 ? m.programs : ["general"];
      return programs.includes("wakaf");
    });

    const isWakaf = donation?.campaign?.pillar === "wakaf";

    return methods.filter((method: any) => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];

      if (method.type === "bank_transfer") {
        if (isWakaf) {
          if (hasWakafBanks) return programs.includes("wakaf");
          return programs.includes("general");
        }
        return programs.includes("infaq") || programs.includes("general");
      }

      if (method.type === "qris") {
        if (isWakaf) {
          if (hasWakafQris) return programs.includes("wakaf");
          return programs.includes("general");
        }
        return programs.includes("infaq") || programs.includes("general");
      }

      return true;
    });
  }, [paymentMethodsData, donation?.campaign?.pillar]);

  const paymentMethodOptions = useMemo(
    () =>
      filteredPaymentMethods.map((method: any) => {
        const programs = method.programs && method.programs.length > 0 ? method.programs : ["general"];
        const programLabel = programs.join(", ");
        const owner = method.details?.accountName ? ` - a.n ${method.details.accountName}` : "";
        return {
          value: method.code,
          label:
            method.type === "bank_transfer"
              ? `${method.name}${owner} [${programLabel}]`
              : method.type === "qris"
              ? `${method.name}${owner ? owner : ""} [${programLabel}]`
              : method.name,
        };
      }),
    [filteredPaymentMethods]
  );

  const handlePay = async () => {
    if (!payMethodId) return;
    try {
      await api.put(`/admin/donations/${donationId}`, {
        paymentStatus: "success",
        paymentMethodId: payMethodId,
      });

      if (payProofUrl) {
        const filename = payProofUrl.split("/").pop() || "Bukti Transfer";
        await api.post(`/admin/donations/${donationId}/evidence`, {
          type: "proof_of_payment",
          title: filename,
          fileUrl: payProofUrl,
        });
      }

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

  // Fetch evidences
  const { data: evidences } = useQuery({
    queryKey: ["donation-evidences", donationId],
    queryFn: async () => {
      const response = await api.get(`/admin/donations/${donationId}/evidence`);
      return response.data?.data || [];
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceLink = async () => {
    if (!donation?.referenceId) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const invoiceUrl = `${origin}/invoice/donation/${donation.referenceId}`;
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
      await api.post(`/admin/donations/${donationId}/approve-payment`, {});
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
      await api.post(`/admin/donations/${donationId}/reject-payment`, {
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
          <p className="text-gray-500">Donasi tidak ditemukan</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/donations")}
            className="btn btn-primary btn-md mt-4"
          >
            Kembali ke Daftar Donasi
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

  const getStatusBadgeClass = (status: string) => {
    const normalized = status?.toLowerCase() || "";
    return statusBadgeMap[normalized] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="dashboard-container">
      {/* Header - Hide on print */}
      <div className="mb-6 print:hidden">
        <button
          type="button"
          onClick={() => router.push("/dashboard/donations")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali ke Daftar Donasi
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Donasi</h1>
            <p className="text-gray-600 mt-1">Informasi lengkap transaksi donasi</p>
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
              onClick={() => router.push(`/dashboard/donations/${donationId}/edit`)}
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
              <p className="text-sm text-gray-500 mt-1">Tanda Terima Donasi</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Nomor Referensi</p>
              <p className="text-lg font-mono font-bold text-gray-900">{donation.referenceId}</p>
              <span
                className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getStatusBadgeClass(
                  donation.paymentStatus
                )}`}
              >
                {donation.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Donor Info & Campaign */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Donor Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Donatur</h3>
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

          {/* Campaign Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Campaign</h3>
            <p className="text-lg font-semibold text-gray-900">
              {donation.campaign?.title || "-"}
            </p>
            {donation.campaign?.category && (
              <p className="text-sm text-gray-600 mt-1">
                Kategori: {donation.campaign.category.name}
              </p>
            )}
          </div>
        </div>

        {/* Donation Details */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Detail Donasi</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Nominal Donasi</span>
              <span className="font-mono font-semibold text-gray-900">
                Rp {formatRupiah(donation.amount)}
              </span>
            </div>
            {donation.feeAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Biaya Admin</span>
                <span className="font-mono text-gray-900">
                  Rp {formatRupiah(donation.feeAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-mono font-bold text-lg text-gray-900">
                Rp {formatRupiah(donation.totalAmount)}
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
                  return (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Transfer Bank</p>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex">
                          <span className="w-32 font-medium">Bank:</span>
                          <span>{donation.metadata?.bankName || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-32 font-medium">No. Rekening:</span>
                          <span className="font-mono">{donation.metadata?.accountNumber || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-32 font-medium">Atas Nama:</span>
                          <span>{donation.metadata?.accountName || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Payment methods lainnya
                let name = code;
                if (code === 'cash') name = 'Tunai / Cash';
                else if (code === 'qris') name = 'QRIS';
                else if (code === 'xendit') name = 'Xendit';
                else if (code === 'ipaymu') name = 'iPaymu';
                else if (code === 'flip') name = 'Flip';

                return <p className="text-sm font-medium text-gray-900">{name}</p>;
              })() : <p className="text-sm font-medium text-gray-900">-</p>}
            </div>
            <div>
              <p className="text-sm text-gray-500">Status Pembayaran</p>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {donation.paymentStatus}
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

        {/* Message */}
        {donation.message && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pesan / Doa</h3>
            <p className="text-sm text-gray-700 italic">&quot;{donation.message}&quot;</p>
          </div>
        )}

        {/* Bukti Transfer - Hide on print */}
        {evidences && evidences.length > 0 && (
          <div className="border-t border-gray-200 pt-6 mb-6 print:hidden">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Bukti Transfer</h3>
            <div className="space-y-2">
              {evidences.map((evidence: any) => (
                <div
                  key={evidence.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <PaperClipIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {evidence.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Diupload {format(new Date(evidence.uploadedAt), "dd MMM yyyy HH:mm", {
                        locale: idLocale,
                      })}
                    </p>
                  </div>
                  <a
                    href={evidence.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                  >
                    Lihat Bukti
                  </a>
                </div>
              ))}
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
    </div>
  );
}
