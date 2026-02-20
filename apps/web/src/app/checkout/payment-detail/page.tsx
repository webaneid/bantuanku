'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { Button } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import toast from '@/lib/feedback-toast';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

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
    name?: string;
    imageUrl?: string;
  };
}

interface Transaction {
  id: string;
  type: 'donation' | 'qurban';
  program: string;
  referenceId?: string;
  orderNumber?: string;
  amount: number;
  totalAmount?: number;
  campaign?: {
    id: string;
    title: string;
    pillar: string;
  };
  package?: {
    name: string;
  };
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { clearCart } = useCart();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const activeLocale = locale === 'id' ? 'id-ID' : 'en-US';
  const formatAmount = (amount: number | null | undefined) =>
    new Intl.NumberFormat(activeLocale, {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const methodType = sessionStorage.getItem('selectedMethodType');
    const pendingTransactionsStr = sessionStorage.getItem('pendingTransactions');

    if (!methodType || !pendingTransactionsStr) {
      toast.error(t('checkout.common.dataNotFound'));
      router.push('/');
      return;
    }

    loadPaymentData(methodType, JSON.parse(pendingTransactionsStr));
  }, [router, t]);

  const loadPaymentData = async (methodType: string, transactionData: Array<{id: string, type: string, program: string}>) => {
    try {
      // Fetch transaction details
      const fetchPromises = transactionData.map(async (t) => {
        if (t.type === 'donation') {
          const response = await fetch(`${API_URL}/donations/${t.id}`);
          const data = await response.json();
          return { ...data.data, type: 'donation', program: t.program };
        } else if (t.type === 'qurban') {
          const response = await fetch(`${API_URL}/qurban/orders/${t.id}`);
          const data = await response.json();
          const order = data.data;
          return {
            id: order.id,
            type: 'qurban',
            program: t.program,
            orderNumber: order.orderNumber,
            referenceId: order.orderNumber,
            amount: order.totalAmount,
            totalAmount: order.totalAmount,
            package: order.package,
          };
        } else if (t.type === 'zakat') {
          const response = await fetch(`${API_URL}/admin/zakat/donations/${t.id}`);
          const data = await response.json();
          const donation = data.data;
          return {
            id: donation.id,
            type: 'zakat',
            program: t.program,
            referenceId: donation.referenceId,
            amount: donation.amount,
            totalAmount: donation.amount,
            zakatTypeName: donation.zakatTypeName,
          };
        }
      });

      const fetchedTransactions = await Promise.all(fetchPromises);
      setTransactions(fetchedTransactions as Transaction[]);

      // Get all programs from transaction data
      const programs = [...new Set(transactionData.map(d => d.program))];

      // Fetch payment methods
      const response = await fetch(`${API_URL}/payments/methods`);
      const data = await response.json();

      if (data.success) {
        const methods = data.data || [];

        // Filter by type
        const filteredByType = methods.filter(
          (m: PaymentMethod) => m.type === methodType
        );

        // Filter by program/pillar
        const filteredMethods = filterMethodsByPrograms(filteredByType, programs);

        setAvailableMethods(filteredMethods);

        // Auto-select first method if only one available
        if (filteredMethods.length === 1) {
          setSelectedMethod(filteredMethods[0]);
        }
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error(t('checkout.common.loadDataFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByPrograms = (methods: PaymentMethod[], programs: string[]) => {
    if (programs.length === 0) return methods;

    // Step 1: Find methods that specifically match the campaign programs
    const specificMatches = methods.filter((method) => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      // Check if method's programs match any of the campaign programs
      return methodPrograms.some(methodProgram =>
        methodProgram !== 'general' && programs.includes(methodProgram.toLowerCase())
      );
    });

    // Step 2: Find general methods
    const generalMethods = methods.filter((method) => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];
      return methodPrograms.includes('general');
    });

    // Step 3: Return specific matches + general methods (remove duplicates)
    const allMethods = [...specificMatches, ...generalMethods];
    return allMethods.filter((method, index, self) =>
      index === self.findIndex((m) => m.code === method.code)
    );
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => {
      if (t.type === 'donation') {
        return sum + t.amount;
      } else if (t.type === 'qurban') {
        return sum + (t.totalAmount || t.amount || 0);
      }
      return sum;
    }, 0);
  };

  const handleDownloadQR = async () => {
    if (!selectedMethod?.details?.imageUrl) return;

    try {
      const response = await fetch(selectedMethod.details.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qris-${selectedMethod.name.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(t('checkout.paymentDetail.downloadQrisSuccess'));
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error(t('checkout.paymentDetail.downloadQrisFailed'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('checkout.paymentDetail.allowedFiles'));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t('checkout.paymentDetail.maxFileSize'));
      return;
    }

    setPaymentProof(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
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
    if (!selectedMethod) {
      toast.error(t('checkout.paymentDetail.chooseMethod'));
      return;
    }

    if (!paymentProof) {
      toast.error(t('checkout.paymentDetail.uploadProof'));
      return;
    }

    setIsConfirming(true);

    try {
      // Process each transaction
      const promises = transactions.map(async (transaction) => {
        if (transaction.type === 'donation') {
          // Step 1: Confirm payment method
          await fetch(`${API_URL}/donations/${transaction.id}/confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentMethodId: selectedMethod.code,
            }),
          });

          // Step 2: Upload payment proof for donation
          const formData = new FormData();
          formData.append('file', paymentProof);

          const response = await fetch(`${API_URL}/donations/${transaction.id}/upload-proof`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload proof for donation ${transaction.id}`);
          }

          return response.json();
        } else if (transaction.type === 'qurban') {
          // Create payment record for qurban order with file upload
          const formData = new FormData();
          formData.append('orderId', transaction.id);
          formData.append('amount', String(transaction.totalAmount || transaction.amount));
          formData.append('paymentMethod', selectedMethod.type);
          formData.append('paymentChannel', selectedMethod.name);
          formData.append('file', paymentProof);
          formData.append(
            'notes',
            t('checkout.paymentDetail.paymentMethodLabel') + `: ${selectedMethod.name}`
          );

          const response = await fetch(`${API_URL}/qurban/payments`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to create payment for qurban order ${transaction.id}`);
          }

          return response.json();
        } else if (transaction.type === 'zakat') {
          // Update zakat donation with payment proof
          const formData = new FormData();
          formData.append('paymentStatus', 'pending');
          formData.append('paymentReference', `${selectedMethod.code}-${Date.now()}`);
          formData.append('file', paymentProof);

          const response = await fetch(`${API_URL}/admin/zakat/donations/${transaction.id}/upload-proof`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to upload proof for zakat donation ${transaction.id}`);
          }

          return response.json();
        }
      });

      await Promise.all(promises);

      // Clear session storage
      sessionStorage.removeItem('pendingTransactions');
      sessionStorage.removeItem('selectedMethodType');

      // Clear cart since user has committed to payment
      clearCart();

      toast.success(t('checkout.paymentDetail.proofSubmitted'));

      // Redirect to home or thank you page
      router.push('/');
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error(t('checkout.paymentDetail.confirmFailed'));
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const methodType = sessionStorage.getItem('selectedMethodType');
  const isBankTransfer = methodType === 'bank_transfer';
  const isQris = methodType === 'qris';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="section-title text-gray-900 mb-2">
                {t('checkout.paymentDetail.title')}
              </h1>
              <p className="text-gray-600" style={{ fontSize: '15px' }}>
                {isBankTransfer && t('checkout.paymentDetail.bankSubtitle')}
                {isQris && t('checkout.paymentDetail.qrisSubtitle')}
              </p>
            </div>

            {/* Payment Methods */}
            {availableMethods.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500">{t('checkout.paymentDetail.noMethodForProgram')}</p>
                <Link href="/checkout/payment-method" className="mt-4 inline-block">
                  <Button variant="outline">{t('checkout.paymentDetail.back')}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Method Selection */}
                {availableMethods.length > 1 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '1.1rem' }}>
                      {isBankTransfer
                        ? t('checkout.paymentDetail.selectAccount')
                        : t('checkout.paymentDetail.selectQr')}
                    </h3>
                    <div className="space-y-3">
                      {availableMethods.map((method) => (
                        <button
                          key={method.code}
                          onClick={() => setSelectedMethod(method)}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            selectedMethod?.code === method.code
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">{method.name}</div>
                          {isBankTransfer && method.details?.accountName && (
                            <div className="text-sm text-gray-600 mt-1">
                              {t('checkout.paymentDetail.accountName')}: {method.details.accountName}
                            </div>
                          )}
                          {method.programs && method.programs.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {method.programs.join(', ')}
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
                    <h3 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '1.1rem' }}>
                      {isBankTransfer
                        ? t('checkout.paymentDetail.bankAccountDetail')
                        : t('checkout.paymentDetail.qrisDetail')}
                    </h3>

                    {isBankTransfer && selectedMethod.details && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-600">{t('checkout.paymentDetail.bank')}</label>
                          <p className="font-semibold text-gray-900 text-lg">
                            {selectedMethod.details.bankName || selectedMethod.name}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t('checkout.paymentDetail.accountNumber')}</label>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-semibold text-gray-900 text-lg">
                              {selectedMethod.details.accountNumber}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedMethod.details?.accountNumber || '');
                                toast.success(t('checkout.paymentDetail.copyAccountSuccess'));
                              }}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">{t('checkout.paymentDetail.accountName')}</label>
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

                        {/* Download Button */}
                        <button
                          onClick={handleDownloadQR}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {t('checkout.paymentDetail.saveQris')}
                        </button>

                        <p className="text-sm text-gray-600 mt-4">
                          {t('checkout.paymentDetail.scanQris')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Amount */}
                <div className="bg-primary-50 rounded-lg p-6 border-2 border-primary-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">{t('checkout.paymentDetail.totalPayment')}</span>
                    <span className="text-3xl font-bold text-primary-600 mono">
                      {formatAmount(getTotalAmount())}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('checkout.paymentDetail.exactAmountInfo')}
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3" style={{ fontSize: '1.1rem' }}>{t('checkout.paymentDetail.instructionTitle')}</h4>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    {isBankTransfer && (
                      <>
                        <li>{t('checkout.paymentDetail.instructionBank1')}</li>
                        <li>{t('checkout.paymentDetail.instructionBank2')}</li>
                        <li>{t('checkout.paymentDetail.instructionBank3')}</li>
                        <li>{t('checkout.paymentDetail.instructionBank4')}</li>
                      </>
                    )}
                    {isQris && (
                      <>
                        <li>{t('checkout.paymentDetail.instructionQris1')}</li>
                        <li>{t('checkout.paymentDetail.instructionQris2')}</li>
                        <li>{t('checkout.paymentDetail.instructionQris3')}</li>
                        <li>{t('checkout.paymentDetail.instructionQris4')}</li>
                      </>
                    )}
                  </ol>
                </div>

                {/* Upload Bukti Pembayaran - Desktop */}
                <div className="hidden lg:block bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '1.1rem' }}>{t('checkout.paymentDetail.uploadTitle')}</h3>

                  <div className="space-y-4">
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
                            <p className="text-sm text-gray-600">{paymentProof?.name}</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setPaymentProof(null);
                                setProofPreview(null);
                              }}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              {t('checkout.paymentDetail.remove')}
                            </button>
                          </div>
                        ) : paymentProof ? (
                          <div className="space-y-2">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-600">{paymentProof.name}</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setPaymentProof(null);
                              }}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              {t('checkout.paymentDetail.remove')}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-600">
                              {t('checkout.paymentDetail.uploadClick')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('checkout.paymentDetail.uploadFormat')}
                            </p>
                          </div>
                        )}
                      </label>
                    </div>

                    {paymentProof && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-sm text-green-800">
                            {t('checkout.paymentDetail.fileReady')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions - Desktop */}
                <div className="hidden lg:flex gap-3">
                  <Link href="/checkout/payment-method" className="flex-1">
                    <Button variant="outline" size="lg" className="w-full" disabled={isConfirming}>
                      {t('checkout.paymentDetail.changeMethod')}
                    </Button>
                  </Link>
                  <Button
                    onClick={handleConfirmPayment}
                    size="lg"
                    className="flex-1"
                    disabled={!selectedMethod || !paymentProof || isConfirming}
                  >
                    {isConfirming ? t('checkout.paymentDetail.sending') : t('checkout.paymentDetail.sendProof')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          <h3 className="font-semibold text-gray-900 mb-3" style={{ fontSize: '1.1rem' }}>{t('checkout.paymentDetail.uploadTitle')}</h3>

          <div className="mb-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-primary-500 transition-colors">
              <input
                type="file"
                id="payment-proof-mobile"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="payment-proof-mobile" className="cursor-pointer">
                {proofPreview ? (
                  <div className="space-y-1">
                    <Image
                      src={proofPreview}
                      alt="Preview"
                      width={120}
                      height={120}
                      className="mx-auto rounded-lg"
                    />
                    <p className="text-xs text-gray-600">{paymentProof?.name}</p>
                  </div>
                ) : paymentProof ? (
                  <div className="space-y-1">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-600">{paymentProof.name}</p>
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-1 text-xs text-gray-600">
                      {t('checkout.paymentDetail.uploadClick')}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {t('checkout.paymentDetail.uploadFormat')}
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/checkout/payment-method" className="flex-1">
              <Button variant="outline" size="lg" className="w-full" disabled={isConfirming}>
                {t('checkout.paymentDetail.changeMethod')}
              </Button>
            </Link>
            <Button
              onClick={handleConfirmPayment}
              size="lg"
              className="flex-1"
              disabled={!selectedMethod || !paymentProof || isConfirming}
            >
              {isConfirming ? t('checkout.paymentDetail.sending') : t('checkout.paymentDetail.sendProof')}
            </Button>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
