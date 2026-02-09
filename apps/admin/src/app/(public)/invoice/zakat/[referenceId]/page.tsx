"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { ClipboardIcon, PrinterIcon } from "@heroicons/react/24/outline";
import FeedbackDialog from "@/components/FeedbackDialog";

export default function ZakatInvoicePage({
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

  const { data: donation, isLoading, error } = useQuery({
    queryKey: ["public-zakat-invoice", referenceId],
    queryFn: async () => {
      const response = await api.get(`/zakat/donations/invoice/${referenceId}`);
      return response.data?.data;
    },
  });

  // Fetch payment methods for fallback bank details
  const { data: paymentMethodsData } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payments/methods");
      return response.data?.data || [];
    },
  });

  // Get selected payment method details
  const selectedPaymentMethod = paymentMethodsData?.find(
    (m: any) => m.code === donation?.paymentMethodId
  );

  const statusBadgeMap: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    processing: "bg-blue-50 text-blue-700 border border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    failed: "bg-rose-50 text-rose-700 border border-rose-200",
    expired: "bg-gray-100 text-gray-700 border border-gray-200",
  };

  const statusLabelMap: Record<string, string> = {
    pending: "Pending",
    processing: "Menunggu Verifikasi",
    success: "Berhasil",
    failed: "Gagal",
    expired: "Kadaluarsa",
  };

  const getStatusLabel = (status: string) => {
    const normalized = status?.toLowerCase() || "";
    return statusLabelMap[normalized] || status;
  };

  const renderPaymentMethod = () => {
    if (!donation?.paymentMethodId) return "-";
    const code = donation.paymentMethodId;

    if (code.startsWith("bank-")) {
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

    if (code === "cash") return "Tunai / Cash";
    if (code === "qris" || code.includes("qris")) return "QRIS";
    if (code.includes("va:")) return "Virtual Account";
    return code;
  };

  const handleCopyLink = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
    const link = `${origin}/invoice/zakat/${referenceId}`;
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
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full text-center border border-gray-200">
          <p className="text-lg font-semibold text-gray-900 mb-2">Invoice tidak ditemukan</p>
          <p className="text-sm text-gray-600">
            Pastikan tautan invoice sudah benar atau hubungi admin Bantuanku.
          </p>
        </div>
      </div>
    );
  }

  const badgeClass = statusBadgeMap[donation.paymentStatus?.toLowerCase()] || "bg-gray-100 text-gray-700";

  return (
    <>
    <div className="min-h-screen bg-gray-50 py-10 px-4 print:bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-6 print:hidden">
          <div>
            <p className="text-sm font-semibold text-primary-600">Bantuanku</p>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Zakat</h1>
            <p className="text-sm text-gray-600 mt-1">Nomor: {donation.referenceId}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn btn-secondary btn-sm flex items-center gap-2"
            >
              <ClipboardIcon className="w-5 h-5" />
              Salin Tautan
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary btn-sm flex items-center gap-2"
            >
              <PrinterIcon className="w-5 h-5" />
              Cetak
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0">
          <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-sm text-gray-500 mt-1">Tanda Terima Zakat</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Nomor Referensi</p>
              <p className="text-lg font-mono font-bold text-gray-900">{donation.referenceId}</p>
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 capitalize ${badgeClass}`}>
                {getStatusLabel(donation.paymentStatus)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Muzaki</h3>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-gray-900">
                  {donation.isAnonymous ? "Hamba Allah" : donation.donorName}
                </p>
                {!donation.isAnonymous && donation.donorEmail && (
                  <p className="text-sm text-gray-600">{donation.donorEmail}</p>
                )}
                {!donation.isAnonymous && donation.donorPhone && (
                  <p className="text-sm text-gray-600">{donation.donorPhone}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Jenis Zakat</h3>
              <p className="text-lg font-semibold text-gray-900">
                {donation.zakatType?.name || donation.zakatTypeName || "-"}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detail Zakat</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Nominal Zakat</span>
                <span className="font-mono font-semibold text-gray-900">{formatCurrency(donation.amount)}</span>
              </div>
              {donation.calculatedZakat && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hasil Kalkulator</span>
                  <span className="font-mono text-gray-700">{formatCurrency(donation.calculatedZakat)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-mono font-bold text-lg text-gray-900">{formatCurrency(donation.amount)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Informasi Pembayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={donation.paymentMethodId?.startsWith("bank-") ? "md:col-span-2" : ""}>
                <p className="text-sm text-gray-500 mb-1">Metode Pembayaran</p>
                <div className="text-sm font-medium text-gray-900">{renderPaymentMethod()}</div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className="text-sm font-medium text-gray-900">{getStatusLabel(donation.paymentStatus)}</p>
              </div>
              {donation.paidAt && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tanggal Pembayaran</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(donation.paidAt), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">Tanggal Donasi</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(donation.createdAt), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
                </p>
              </div>
              {donation.paymentReference && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 mb-2">Bukti Pembayaran</p>
                  <div className="relative w-full max-w-md">
                    <img
                      src={donation.paymentReference}
                      alt="Bukti Pembayaran"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {donation.calculatorData && (
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Data Kalkulator</h3>
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

          {(donation.message || donation.notes) && (
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                {donation.message ? "Pesan / Doa" : "Catatan"}
              </h3>
              <p className="text-sm text-gray-700 italic">&quot;{donation.message || donation.notes}&quot;</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-sm text-gray-500">
              Terima kasih atas zakat Anda. Semoga menjadi amal jariyah yang berkah.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Invoice ini dibuat secara otomatis oleh sistem Bantuanku
            </p>
          </div>
        </div>
      </div>
    </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
