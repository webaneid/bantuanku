"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/atoms";
import { formatRupiahFull } from "@/lib/format";
import toast from "@/lib/feedback-toast";
import Image from "next/image";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

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
    imageUrl?: string;
    isDynamic?: boolean;
  };
}

interface UniversalPaymentDetailSelectorProps {
  transactionId: string;
}

export default function UniversalPaymentDetailSelector({
  transactionId,
}: UniversalPaymentDetailSelectorProps) {
  const router = useRouter();
  const { t } = useI18n();
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
  const [qrisData, setQrisData] = useState<any>(null);
  const [isLoadingQris, setIsLoadingQris] = useState(false);

  useEffect(() => {
    loadPaymentData();
  }, [transactionId]);

  const loadPaymentData = async () => {
    try {
      const methodTypeValue = sessionStorage.getItem("selectedMethodType");

      if (!methodTypeValue) {
        toast.error(t("payment.chooseMethodFirst"));
        router.push(`/invoice/${transactionId}/payment-method`);
        return;
      }

      setMethodType(methodTypeValue);

      // Fetch transaction
      const txnResponse = await api.get(`/transactions/${transactionId}`);

      if (!txnResponse.data.success) {
        toast.error(t("payment.transactionNotFound"));
        router.push("/");
        return;
      }

      const txn = txnResponse.data.data;
      setTransaction(txn);

      // Set default transfer amount (include uniqueCode for manual bank transfer)
      const amount = txn.type === 'transaction'
        ? txn.data.totalAmount + (txn.data.uniqueCode || 0)
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
      const methodsResponse = await api.get(`/payments/methods`);
      const data = methodsResponse.data;

      if (data.success) {
        const methods = data.data || [];

        // Filter by type first
        const filteredByType = methods.filter(
          (m: PaymentMethod) => m.type === methodTypeValue,
        );

        // Then filter by program category
        const filteredByProgram = filterMethodsByProgram(filteredByType, programCategory);

        setAvailableMethods(filteredByProgram);

        // Auto-select first available method for smoother flow
        if (filteredByProgram.length > 0) {
          setSelectedMethod(filteredByProgram[0]);
        }
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
      toast.error(t("payment.loadDataFailed"));
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch dynamic QRIS when a dynamic QRIS method is selected
  useEffect(() => {
    if (selectedMethod && selectedMethod.type === 'qris' && selectedMethod.details?.isDynamic) {
      fetchDynamicQris();
    } else {
      setQrisData(null);
    }
  }, [selectedMethod]);

  const fetchDynamicQris = async () => {
    if (!selectedMethod) return;
    setIsLoadingQris(true);
    try {
      // Confirm payment method first so backend knows which QRIS account
      await api.post(`/transactions/${transactionId}/confirm-payment`, {
        paymentMethodId: selectedMethod.code,
      });

      const response = await api.get(`/transactions/${transactionId}/qris`);
      if (response.data.success) {
        setQrisData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching dynamic QRIS:", error);
      setQrisData(null);
    } finally {
      setIsLoadingQris(false);
    }
  };

  const filterMethodsByProgram = (methods: PaymentMethod[], program: string): PaymentMethod[] => {
    // Priority: specific program match > general fallback
    // Find methods that specifically match the program (not just general)
    const specificMatch = methods.filter(method => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ['general'];
      return programs.some(p => p.toLowerCase() === program.toLowerCase() && p.toLowerCase() !== 'general');
    });

    if (specificMatch.length > 0) {
      return specificMatch;
    }

    // No specific match — fall back to general
    const generalMatch = methods.filter(method => {
      const programs = method.programs && method.programs.length > 0 ? method.programs : ['general'];
      return programs.some(p => p.toLowerCase() === 'general');
    });

    if (generalMatch.length > 0) {
      return generalMatch;
    }

    // Safety fallback: if no specific/general tagging, still show configured methods
    return methods;
  };

  const getTotalAmount = () => {
    if (!transaction) return 0;
    return transaction.type === 'transaction'
      ? transaction.data.totalAmount + (transaction.data.uniqueCode || 0)
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
      toast.error(t("payment.allowedFiles"));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("payment.maxFileSize"));
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
        toast.error(t("payment.chooseBankFirst"));
      } else if (methodType === "qris") {
        toast.error(t("payment.chooseQrisFirst"));
      } else {
        toast.error(t("payment.chooseMethodFirst"));
      }
      return;
    }

    if (!transferAmount || transferAmount <= 0) {
      toast.error(t("payment.amountMustPositive"));
      return;
    }

    if (!paymentDate) {
      toast.error(t("payment.paymentDateRequired"));
      return;
    }

    if (!paymentProof) {
      toast.error(t("payment.uploadProofRequired"));
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

      const response = await api.post(
        `/transactions/${transactionId}/upload-proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to upload proof");
      }

      // Clear session storage
      sessionStorage.removeItem("selectedMethodType");

      toast.success(t("payment.proofUploaded"));

      // Redirect back to invoice
      router.push(`/invoice/${transactionId}`);
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast.error(error.message || t("payment.confirmFailed"));
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
            {t("payment.detailTitle")}
          </h1>
          <p className="text-gray-600">
            {isBankTransfer && t("payment.detailBankDesc")}
            {isQris && t("payment.detailQrisDesc")}
          </p>
        </div>

        {/* Payment Methods */}
        {availableMethods.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">
              {t("payment.noDetailMethods")}
            </p>
            <Link
              href={`/invoice/${transactionId}/payment-method`}
              className="mt-4 inline-block"
            >
              <Button variant="outline">{t("invoice.back")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Method Selection */}
            {availableMethods.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {t("payment.chooseAccountOrQr", {
                    label: isBankTransfer
                      ? t("payment.accountLabel")
                      : t("payment.qrLabel"),
                  })}
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
                  {isBankTransfer
                    ? t("payment.accountDetail")
                    : t("payment.qrisDetail")}
                </h3>

                {isBankTransfer && selectedMethod.details && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">{t("payment.bank")}</label>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedMethod.details.bankName || selectedMethod.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{t("payment.accountNumber")}</label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold text-gray-900 text-lg">
                          {selectedMethod.details.accountNumber}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedMethod.details?.accountNumber || "",
                            );
                            toast.success(t("payment.copiedAccountNumber"));
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
                      <label className="text-sm text-gray-600">{t("payment.accountName")}</label>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedMethod.details.accountName}
                      </p>
                    </div>
                  </div>
                )}

                {isQris && (
                  <div className="text-center">
                    {isLoadingQris ? (
                      <div className="inline-block p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-4">{t("payment.generatingQr")}</p>
                      </div>
                    ) : qrisData?.isDynamic && qrisData?.qrDataUrl ? (
                      <>
                        <div className="inline-block bg-white p-4 rounded-lg border-2 border-green-200">
                          <img
                            src={qrisData.qrDataUrl}
                            alt="QRIS Dynamic"
                            width={256}
                            height={256}
                            className="mx-auto"
                          />
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-sm font-semibold text-green-700">
                            {t("payment.dynamicAmountLocked", {
                              amount: formatRupiahFull(qrisData.amount),
                            })}
                          </p>
                          {qrisData.merchantName && (
                            <p className="text-xs text-gray-500">{qrisData.merchantName}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            {t("payment.scanQrAutoAmount")}
                          </p>
                        </div>
                      </>
                    ) : (qrisData?.imageUrl || selectedMethod?.details?.imageUrl) ? (
                      <>
                        <div className="inline-block bg-white p-4 rounded-lg border-2 border-gray-200">
                          <Image
                            src={qrisData?.imageUrl || selectedMethod.details!.imageUrl!}
                            alt="QR Code"
                            width={256}
                            height={256}
                            className="mx-auto"
                          />
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-sm font-semibold text-primary-700">
                            {t("payment.nominal", {
                              amount: formatRupiahFull(getTotalAmount()),
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {t("payment.scanQr")}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Total Amount */}
            <div className="bg-primary-50 rounded-lg p-6 border-2 border-primary-200">
              {transaction?.type === 'transaction' && (transaction.data.uniqueCode || 0) > 0 ? (
                <>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-600">{t("payment.totalDonation")}</span>
                    <span className="font-medium text-gray-900">{formatRupiahFull(transaction.data.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600">{t("payment.uniqueCode")}</span>
                    <span className="font-medium text-gray-900">+{formatRupiahFull(transaction.data.uniqueCode)}</span>
                  </div>
                  <div className="border-t border-primary-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-semibold">{t("payment.totalTransfer")}</span>
                      <span className="text-3xl font-bold text-primary-600 mono">
                        {formatRupiahFull(getTotalAmount())}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">
                    {t("payment.totalPayment")}
                  </span>
                  <span className="text-3xl font-bold text-primary-600 mono">
                    {formatRupiahFull(getTotalAmount())}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-600 mt-2">
                {(transaction?.type === 'transaction' && (transaction.data.uniqueCode || 0) > 0)
                  ? t("payment.uniqueCodeInfo")
                  : t("payment.exactAmountInfo")}
              </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {t("payment.confirmPaymentTitle")}
              </h3>

              <div className="space-y-4">
                {/* Transfer Amount Input */}
                <div>
                  <label
                    htmlFor="transfer-amount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t("payment.transferAmount")} <span className="text-red-500">*</span>
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
                        {t("payment.matchAmount")}
                      </span>
                    ) : transferAmount > getTotalAmount() ? (
                      <span className="text-blue-600">
                        {t("payment.overAmount", {
                          amount: formatRupiahFull(transferAmount - getTotalAmount()),
                        })}
                      </span>
                    ) : transferAmount < getTotalAmount() &&
                      transferAmount > 0 ? (
                      <span className="text-amber-600">
                        {t("payment.underAmount", {
                          amount: formatRupiahFull(getTotalAmount() - transferAmount),
                        })}
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
                    {t("payment.paymentDate")} <span className="text-red-500">*</span>
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
                    {t("payment.paymentDateHint")}
                  </p>
                </div>

                {/* Upload Bukti Transfer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("payment.proofTransfer")} <span className="text-red-500">*</span>
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
                            {t("payment.remove")}
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
                            {t("payment.remove")}
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
                            {t("payment.uploadHint")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {t("payment.uploadFormat")}
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
                  {t("payment.changeMethod")}
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
                {isConfirming ? t("payment.sending") : t("payment.confirmPayment")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
