"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/atoms";
import { formatRupiahFull } from "@/lib/format";
import toast from "react-hot-toast";
import Image from "next/image";
import api from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:50245/v1";

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  programs: string[];
  details?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    nmid?: string;
    imageUrl?: string;
  };
}

interface UniversalPaymentDetailSelectorProps {
  transactionId: string;
}

export default function UniversalPaymentDetailSelector({
  transactionId,
}: UniversalPaymentDetailSelectorProps) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [methodType, setMethodType] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentData();
  }, [transactionId]);

  const loadPaymentData = async () => {
    try {
      const methodTypeValue = sessionStorage.getItem("selectedMethodType");

      if (!methodTypeValue) {
        toast.error("Silakan pilih metode pembayaran terlebih dahulu");
        router.push(`/invoice/${transactionId}/payment-method`);
        return;
      }

      setMethodType(methodTypeValue);

      // Fetch transaction
      const txnResponse = await api.get(`/transactions/${transactionId}`);

      if (!txnResponse.data.success) {
        toast.error("Transaksi tidak ditemukan");
        router.push("/");
        return;
      }

      const txn = txnResponse.data.data;
      setTransaction(txn);

      // Set default transfer amount
      const amount = txn.type === 'transaction'
        ? txn.data.totalAmount
        : (txn.data.amount || txn.data.totalAmount);
      setTransferAmount(amount);

      // Determine program category for filtering payment methods
      let programCategory = 'infaq'; // default fallback

      if (txn.type === 'transaction') {
        // New unified transaction format
        const productType = txn.data.productType;
        const typeSpecificData = txn.data.typeSpecificData;

        if (productType === 'qurban') {
          programCategory = 'qurban';
        } else if (productType === 'zakat') {
          programCategory = 'zakat';
        } else if (productType === 'campaign') {
          // Check campaign pillar for wakaf
          programCategory = typeSpecificData?.pillar || 'infaq';
        }
      } else {
        // Legacy transaction format
        if (txn.type === 'qurban' || txn.data.package) {
          programCategory = 'qurban';
        } else if (txn.type === 'zakat' || txn.data.zakatType) {
          programCategory = 'zakat';
        } else if (txn.data.campaign?.pillar) {
          programCategory = txn.data.campaign.pillar;
        }
      }

      // Fetch payment methods
      const methodsResponse = await fetch(`${API_URL}/payments/methods`);
      const data = await methodsResponse.json();

      if (data.success) {
        const methods = data.data || [];

        // Filter by type first
        const filteredByType = methods.filter(
          (m: PaymentMethod) => m.type === methodTypeValue,
        );

        // Then filter by program category
        const filteredByProgram = filterMethodsByProgram(filteredByType, programCategory);

        setAvailableMethods(filteredByProgram);

        // Auto-select first method if only one available
        if (filteredByProgram.length === 1) {
          setSelectedMethod(filteredByProgram[0]);
        }
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
      toast.error("Gagal memuat data pembayaran");
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByProgram = (methods: PaymentMethod[], program: string): PaymentMethod[] => {
    // First try to find methods specifically for this program
    const specificMethods = methods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      return methodPrograms.some(methodProgram =>
        methodProgram.toLowerCase() === program.toLowerCase()
      );
    });

    // If found, return specific methods
    if (specificMethods.length > 0) {
      return specificMethods;
    }

    // Otherwise, return methods marked as 'general' or 'infaq' as fallback
    const fallbackMethods = methods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      return methodPrograms.some(methodProgram =>
        methodProgram.toLowerCase() === 'general' || methodProgram.toLowerCase() === 'infaq'
      );
    });

    return fallbackMethods;
  };

  const getTotalAmount = () => {
    if (!transaction) return 0;
    return transaction.type === 'transaction'
      ? transaction.data.totalAmount
      : (transaction.data.amount || transaction.data.totalAmount || 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Hanya file gambar (JPG, PNG) atau PDF yang diperbolehkan");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setPaymentProof(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleConfirmPayment = async () => {
    // Validate - metode pembayaran harus dipilih
    if (!selectedMethod) {
      if (methodType === "bank_transfer") {
        toast.error("Silakan pilih rekening bank terlebih dahulu");
      } else if (methodType === "qris") {
        toast.error("Silakan pilih QRIS terlebih dahulu");
      } else {
        toast.error("Silakan pilih metode pembayaran terlebih dahulu");
      }
      return;
    }

    if (!transferAmount || transferAmount <= 0) {
      toast.error("Jumlah transfer harus lebih dari 0");
      return;
    }

    if (!paymentDate) {
      toast.error("Tanggal pembayaran harus diisi");
      return;
    }

    if (!paymentProof) {
      toast.error("Silakan upload bukti pembayaran");
      return;
    }

    setIsConfirming(true);

    try {
      // Step 1: Confirm payment method
      await api.post(`/transactions/${transactionId}/confirm-payment`, {
        paymentMethodId: selectedMethod.code,
      });

      // Step 2: Upload payment proof
      const formData = new FormData();
      formData.append("file", paymentProof);
      formData.append("amount", transferAmount.toString());
      formData.append("paymentDate", paymentDate);

      const response = await fetch(
        `${API_URL}/transactions/${transactionId}/upload-proof`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload proof");
      }

      // Clear session storage
      sessionStorage.removeItem("selectedMethodType");

      toast.success(
        "Bukti pembayaran berhasil dikirim! Menunggu verifikasi admin.",
      );

      // Redirect back to invoice
      router.push(`/invoice/${transactionId}`);
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast.error(error.message || "Gagal mengkonfirmasi pembayaran");
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  const isBankTransfer = methodType === "bank_transfer";
  const isQris = methodType === "qris";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Detail Pembayaran
          </h1>
          <p className="text-gray-600">
            {isBankTransfer && "Silakan transfer ke rekening berikut"}
            {isQris && "Silakan scan QR Code dengan aplikasi e-wallet Anda"}
          </p>
        </div>

        {/* Payment Methods */}
        {availableMethods.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">
              Tidak ada metode pembayaran yang tersedia
            </p>
            <Link
              href={`/invoice/${transactionId}/payment-method`}
              className="mt-4 inline-block"
            >
              <Button variant="outline">Kembali</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Method Selection */}
            {availableMethods.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Pilih {isBankTransfer ? "Rekening" : "QR Code"}
                </h3>
                <div className="space-y-3">
                  {availableMethods.map((method) => (
                    <button
                      key={method.code}
                      onClick={() => setSelectedMethod(method)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedMethod?.code === method.code
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">
                        {method.name}
                      </div>
                      {isBankTransfer && method.details?.accountName && (
                        <div className="text-sm text-gray-600 mt-1">
                          a.n {method.details.accountName}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Method Details */}
            {selectedMethod && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Detail {isBankTransfer ? "Rekening" : "QRIS"}
                </h3>

                {isBankTransfer && selectedMethod.details && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Bank</label>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedMethod.details.bankName || selectedMethod.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Nomor Rekening
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold text-gray-900 text-lg">
                          {selectedMethod.details.accountNumber}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedMethod.details?.accountNumber || "",
                            );
                            toast.success("Nomor rekening disalin");
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Atas Nama</label>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedMethod.details.accountName}
                      </p>
                    </div>
                  </div>
                )}

                {isQris && selectedMethod.details?.imageUrl && (
                  <div className="text-center">
                    <div className="inline-block bg-white p-4 rounded-lg border-2 border-gray-200">
                      <Image
                        src={selectedMethod.details.imageUrl}
                        alt="QR Code"
                        width={256}
                        height={256}
                        className="mx-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                      Scan QR Code dengan aplikasi e-wallet Anda
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Total Amount */}
            <div className="bg-primary-50 rounded-lg p-6 border-2 border-primary-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">
                  Total Pembayaran
                </span>
                <span className="text-3xl font-bold text-primary-600 mono">
                  {formatRupiahFull(getTotalAmount())}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Transfer tepat sesuai nominal untuk mempercepat verifikasi
              </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Konfirmasi Pembayaran
              </h3>

              <div className="space-y-4">
                {/* Transfer Amount Input */}
                <div>
                  <label
                    htmlFor="transfer-amount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Jumlah Transfer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      id="transfer-amount"
                      value={transferAmount}
                      onChange={(e) =>
                        setTransferAmount(Number(e.target.value))
                      }
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {transferAmount === getTotalAmount() ? (
                      <span className="text-green-600">
                        ✓ Sesuai dengan total pembayaran
                      </span>
                    ) : transferAmount > getTotalAmount() ? (
                      <span className="text-blue-600">
                        Transfer lebih Rp{" "}
                        {formatRupiahFull(transferAmount - getTotalAmount())}{" "}
                        (kelebihan akan dikembalikan)
                      </span>
                    ) : transferAmount < getTotalAmount() &&
                      transferAmount > 0 ? (
                      <span className="text-amber-600">
                        ⚠ Transfer kurang Rp{" "}
                        {formatRupiahFull(getTotalAmount() - transferAmount)}{" "}
                        (pembayaran sebagian)
                      </span>
                    ) : null}
                  </p>
                </div>

                {/* Payment Date Input */}
                <div>
                  <label
                    htmlFor="payment-date"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Tanggal Pembayaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="payment-date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Tanggal saat Anda melakukan transfer
                  </p>
                </div>

                {/* Upload Bukti Transfer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bukti Transfer <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      id="payment-proof"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="payment-proof" className="cursor-pointer">
                      {proofPreview ? (
                        <div className="space-y-2">
                          <Image
                            src={proofPreview}
                            alt="Preview"
                            width={200}
                            height={200}
                            className="mx-auto rounded-lg"
                          />
                          <p className="text-sm text-gray-600">
                            {paymentProof?.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPaymentProof(null);
                              setProofPreview(null);
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : paymentProof ? (
                        <div className="space-y-2">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <p className="text-sm text-gray-600">
                            {paymentProof.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPaymentProof(null);
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div>
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">
                            Klik untuk upload bukti pembayaran
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            JPG, PNG, atau PDF (Maks. 5MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={`/invoice/${transactionId}/payment-method`}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={isConfirming}
                >
                  Ganti Metode
                </Button>
              </Link>
              <Button
                onClick={handleConfirmPayment}
                size="lg"
                className="flex-1"
                disabled={
                  !selectedMethod ||
                  !paymentProof ||
                  !transferAmount ||
                  transferAmount <= 0 ||
                  isConfirming
                }
              >
                {isConfirming ? "Mengirim..." : "Konfirmasi Pembayaran"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
