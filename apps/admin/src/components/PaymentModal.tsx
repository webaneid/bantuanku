"use client";

import { useState } from "react";
import { XMarkIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import MediaLibrary from "./MediaLibrary";
import Autocomplete from "./Autocomplete";
import api from "@/lib/api";
import FeedbackDialog from "./FeedbackDialog";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentData) => void;
  disbursement: {
    amount: number;
    recipientName: string;
    recipientBank?: string;
    recipientAccount?: string;
  };
}

export interface PaymentData {
  paymentMethod: string;
  sourceAccountId?: string; // ID rekening sumber dari settings
  bankName?: string;
  accountNumber?: string;
  transactionDate: string;
  notes?: string;
  proofUrl?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  disbursement,
}: PaymentModalProps) {
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [formData, setFormData] = useState<PaymentData>({
    paymentMethod: "transfer_bank",
    sourceAccountId: "",
    bankName: disbursement.recipientBank || "",
    accountNumber: disbursement.recipientAccount || "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
    proofUrl: "",
  });
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "error", title: "" });

  // Fetch bank accounts from settings
  const { data: bankAccountsData, isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ["payment-bank-accounts"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");

      // The data structure is: { success: true, data: { payment: [...], general: [...] } }
      const paymentSettings = response.data?.data?.payment || [];
      const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");

      if (bankAccountsSetting?.value) {
        try {
          const parsed = JSON.parse(bankAccountsSetting.value);
          return parsed;
        } catch (e) {
          console.error("Failed to parse bank accounts:", e);
          return [];
        }
      }
      return [];
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  const bankAccountOptions = (bankAccountsData || []).map((bank: any) => ({
    value: bank.id,
    label: `${bank.bankName} - ${bank.accountNumber} (${bank.accountName})`,
  }));

  // Payment method options (hardcoded as per requirement)
  const paymentMethodOptions = [
    { value: "transfer_bank", label: "Transfer Bank" },
    { value: "qris", label: "QRIS" },
    { value: "cash", label: "Cash" },
    { value: "debit", label: "Debit" },
  ];

  // Methods that require source account
  const requiresSourceAccount = ["transfer_bank", "qris", "debit"].includes(formData.paymentMethod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.paymentMethod) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Metode pembayaran wajib diisi.",
      });
      return;
    }

    // Validate source account for methods that require it
    if (requiresSourceAccount && !formData.sourceAccountId) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Sumber rekening wajib dipilih.",
      });
      return;
    }

    if (formData.paymentMethod === "transfer_bank" && !formData.proofUrl) {
      setFeedback({
        open: true,
        type: "error",
        title: "Bukti diperlukan",
        message: "Unggah bukti transfer untuk pembayaran via transfer bank.",
      });
      return;
    }

    onSubmit(formData);
  };

  const handleMediaSelect = (url: string) => {
    setFormData({ ...formData, proofUrl: url });
    setIsMediaLibraryOpen(false);
  };

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Konfirmasi Pembayaran</h2>
              <p className="text-sm text-gray-500 mt-1">
                Kepada: {disbursement.recipientName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={paymentMethodOptions}
                value={formData.paymentMethod}
                onChange={(value) => setFormData({ ...formData, paymentMethod: value, sourceAccountId: "" })}
                placeholder="Pilih Metode Pembayaran"
                allowClear={false}
              />
            </div>

            {/* Source Account (for transfer bank, qris, debit) */}
            {requiresSourceAccount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sumber Rekening <span className="text-red-500">*</span>
                </label>
                {isLoadingBankAccounts ? (
                  <div className="form-input w-full text-gray-500 text-sm">
                    Loading rekening...
                  </div>
                ) : bankAccountOptions.length === 0 ? (
                  <div className="form-input w-full text-red-500 text-sm">
                    Tidak ada rekening bank. Silakan tambahkan di Settings → Payments.
                  </div>
                ) : (
                  <Autocomplete
                    options={bankAccountOptions}
                    value={formData.sourceAccountId || ""}
                    onChange={(value) => setFormData({ ...formData, sourceAccountId: value })}
                    placeholder="Pilih Rekening Sumber"
                    allowClear={false}
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Pilih rekening yang digunakan untuk melakukan pembayaran
                </p>
              </div>
            )}

            {/* Bank Details (for transfer_bank) */}
            {formData.paymentMethod === "transfer_bank" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="form-input w-full"
                      placeholder="BCA, Mandiri, dll"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      No. Rekening Tujuan
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="form-input w-full"
                      placeholder="1234567890"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Transaction Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Transaksi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>

            {/* Payment Proof */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bukti Pembayaran {formData.paymentMethod === "transfer_bank" && <span className="text-red-500">*</span>}
              </label>
              {formData.proofUrl ? (
                <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.proofUrl}
                      alt="Payment proof"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bukti transfer uploaded</p>
                      <p className="text-xs text-gray-500">{formData.proofUrl.split("/").pop()}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, proofUrl: "" })}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMediaLibraryOpen(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Klik untuk upload bukti transfer (screenshot/PDF)
                  </p>
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan (opsional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input w-full"
                rows={3}
                placeholder="Catatan tambahan tentang pembayaran ini..."
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Ringkasan Pembayaran</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nominal:</span>
                  <span className="font-semibold text-gray-900 mono">
                    Rp {disbursement.amount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Penerima:</span>
                  <span className="font-medium text-gray-900">{disbursement.recipientName}</span>
                </div>
                {disbursement.recipientBank && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank:</span>
                    <span className="font-medium text-gray-900">
                      {disbursement.recipientBank} - {disbursement.recipientAccount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 btn btn-success"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Media Library for Payment Proof */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        category="financial"
        accept="image/*,application/pdf"
      />

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={closeFeedback}
      />
    </>
  );
}
