'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { Button } from '@/components/atoms';
import toast from '@/lib/feedback-toast';
import { useI18n } from '@/lib/i18n/provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface DonationData {
  id: string;
  amount: number;
}

export default function FlipChannelsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationData, setDonationData] = useState<DonationData[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const activeLocale = locale === 'id' ? 'id-ID' : 'en-US';

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    // Check if there are pending transactions
    const pendingTransactions = sessionStorage.getItem('pendingTransactions');
    if (!pendingTransactions) {
      toast.error(t('checkout.common.noPendingTransactions'));
      router.push('/');
      return;
    }

    try {
      const data = JSON.parse(pendingTransactions) as DonationData[];
      setDonationData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing donation data:', error);
      toast.error(t('checkout.common.invalidTransactionData'));
      router.push('/');
    }
  }, [router, t]);

  const totalAmount = donationData.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const handleSubmit = async () => {
    if (donationData.length === 0) {
      toast.error(t('checkout.common.dataNotFound'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Flip PWF step 3: directly creates payment link, no channel selection needed
      const response = await fetch(`${API_URL}/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: donationData[0].id,
          methodId: 'flip',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || t('checkout.common.createPaymentFailed'));
      }

      // If Flip returns a payment URL, redirect directly to Flip payment page
      if (result.data?.paymentUrl) {
        // Store payment result for reference
        sessionStorage.setItem('paymentResult', JSON.stringify({
          ...result.data,
          selectedChannel: 'flip',
          donationData,
        }));

        // Redirect to Flip payment page
        window.location.href = result.data.paymentUrl;
        return;
      }

      // Fallback: go to payment result page
      sessionStorage.setItem('paymentResult', JSON.stringify({
        ...result.data,
        selectedChannel: 'flip',
        donationData,
      }));

      router.push('/checkout/payment-result');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error instanceof Error ? error.message : t('checkout.common.createPaymentFailed'));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-4 sm:py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center">{t('checkout.common.loadingPayment')}</div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-4 sm:py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumb - Hidden on mobile */}
            <div className="mb-4 sm:mb-6 hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-blue-600">{t('checkout.common.home')}</Link>
              <span>/</span>
              <Link href="/checkout/payment-method" className="hover:text-blue-600">{t('checkout.common.paymentMethod')}</Link>
              <span>/</span>
              <span className="text-gray-900">{t('checkout.flip.breadcrumbCurrent')}</span>
            </div>

            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {t('checkout.flip.title')}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {t('checkout.flip.subtitle')}
              </p>
            </div>

            {/* Amount Summary */}
            {totalAmount > 0 && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 text-white">
                <div className="text-xs sm:text-sm mb-2">{t('checkout.flip.amountDue')}</div>
                <div className="text-2xl sm:text-3xl font-bold mb-2">
                  Rp {totalAmount.toLocaleString(activeLocale)}
                </div>
                <div className="text-xs sm:text-sm opacity-90">
                  {t('checkout.common.paymentForOrders', { orders: donationData.map(d => d.id).join(', ') })}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('checkout.flip.infoTitle')}</h2>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {t('checkout.flip.infoDesc')}
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#10003;</span>
                  {t('checkout.flip.featureVa')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#10003;</span>
                  {t('checkout.flip.featureWallet')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#10003;</span>
                  {t('checkout.flip.featureQris')}
                </li>
              </ul>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:block mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('checkout.common.processing')}
                  </span>
                ) : (
                  t('checkout.flip.payViaFlip')
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.back()}
                className="w-full text-sm sm:text-base"
              >
                {t('checkout.common.back')}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="flex-1"
            >
              {t('checkout.common.back')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('checkout.common.processing') : t('checkout.flip.payViaFlip')}
            </Button>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
