'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { Button } from '@/components/atoms';
import QRCode from 'qrcode';
import toast from '@/lib/feedback-toast';
import { useI18n } from '@/lib/i18n/provider';

interface PaymentResult {
  paymentId: string;
  paymentCode?: string;
  paymentUrl?: string;
  qrCode?: string;
  expiredAt?: string;
  selectedChannel?: string;
  donationData?: Array<{ id: string; amount: number }>;
}

export default function PaymentResultPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [paymentData, setPaymentData] = useState<PaymentResult | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const activeLocale = locale === 'id' ? 'id-ID' : 'en-US';

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      const paymentResultStr = sessionStorage.getItem('paymentResult');
      if (!paymentResultStr) {
        router.push('/');
        return;
      }

      const data = JSON.parse(paymentResultStr) as PaymentResult;
      setPaymentData(data);

      // Generate QR code image if qrCode string is available
      if (data.qrCode) {
        try {
          const qrDataUrl = await QRCode.toDataURL(data.qrCode, {
            width: 300,
            margin: 2,
          });
          setQrCodeDataUrl(qrDataUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const getChannelInfo = (channel?: string) => {
    if (!channel) return { name: t('checkout.paymentResult.defaultMethodName'), icon: '💳' };

    const [method, channelCode] = channel.split(':');

    const channelMap: Record<string, { name: string; icon: string }> = {
      'qris:qris': { name: 'QRIS', icon: '📱' },
      'va:bca': { name: 'BCA Virtual Account', icon: '🏦' },
      'va:bni': { name: 'BNI Virtual Account', icon: '🏦' },
      'va:mandiri': { name: 'Mandiri Virtual Account', icon: '🏦' },
      'va:cimb': { name: 'CIMB Niaga Virtual Account', icon: '🏦' },
      'va:permata': { name: 'Permata Virtual Account', icon: '🏦' },
      'cstore:gopay': { name: 'GoPay', icon: '💚' },
      'cstore:shopeepay': { name: 'ShopeePay', icon: '🧡' },
      'cstore:alfamart': { name: 'Alfamart', icon: '🏪' },
      'cstore:indomaret': { name: 'Indomaret', icon: '🏪' },
      'cc:cc': { name: 'Credit Card', icon: '💳' },
      'online:online': { name: 'Debit Online', icon: '💳' },
    };

    return channelMap[channel] || { name: channel, icon: '💳' };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(activeLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(date) + ' WIB';
  };

  const getPaymentInstructions = (channel?: string) => {
    if (!channel) return [];

    const [method] = channel.split(':');

    const groupedKeys: Record<string, string[]> = {
      qris: [
        'checkout.instructions.qris.step1',
        'checkout.instructions.qris.step2',
        'checkout.instructions.qris.step3',
        'checkout.instructions.qris.step4',
        'checkout.instructions.qris.step5',
        'checkout.instructions.qris.step6',
      ],
      va: [
        'checkout.instructions.va.step1',
        'checkout.instructions.va.step2',
        'checkout.instructions.va.step3',
        'checkout.instructions.va.step4',
        'checkout.instructions.va.step5',
        'checkout.instructions.va.step6',
        'checkout.instructions.va.step7',
        'checkout.instructions.va.step8',
        'checkout.instructions.va.step9',
        'checkout.instructions.va.step10',
      ],
      cstore: [
        'checkout.instructions.cstore.step1',
        'checkout.instructions.cstore.step2',
        'checkout.instructions.cstore.step3',
        'checkout.instructions.cstore.step4',
        'checkout.instructions.cstore.step5',
        'checkout.instructions.cstore.step6',
        'checkout.instructions.cstore.step7',
        'checkout.instructions.cstore.step8',
      ],
      cc: [
        'checkout.instructions.cc.step1',
        'checkout.instructions.cc.step2',
        'checkout.instructions.cc.step3',
        'checkout.instructions.cc.step4',
        'checkout.instructions.cc.step5',
        'checkout.instructions.cc.step6',
        'checkout.instructions.cc.step7',
        'checkout.instructions.cc.step8',
      ],
      online: [
        'checkout.instructions.online.step1',
        'checkout.instructions.online.step2',
        'checkout.instructions.online.step3',
        'checkout.instructions.online.step4',
        'checkout.instructions.online.step5',
        'checkout.instructions.online.step6',
        'checkout.instructions.online.step7',
        'checkout.instructions.online.step8',
      ],
    };

    const keys = groupedKeys[method] || groupedKeys.qris;
    return keys.map((key) => t(key));
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
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

  if (!paymentData) {
    return null;
  }

  const channelInfo = getChannelInfo(paymentData.selectedChannel);
  const totalAmount = paymentData.donationData?.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) || 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {t('checkout.paymentResult.successTitle')}
              </h1>
              <p className="text-gray-600">
                {t('checkout.paymentResult.successSubtitle')}
              </p>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-600">{t('checkout.paymentResult.orderNumber')}</span>
                  <span className="font-semibold text-gray-900">{paymentData.paymentId}</span>
                </div>
                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-600">{t('checkout.paymentResult.method')}</span>
                  <span className="font-semibold text-gray-900">{channelInfo.name}</span>
                </div>
                <div className="flex justify-between border-b border-orange-200 pb-3">
                  <span className="text-gray-900 font-medium">{t('checkout.paymentResult.totalPayment')}</span>
                  <span className="font-bold text-orange-600 text-xl">
                    Rp {totalAmount.toLocaleString(activeLocale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('checkout.paymentResult.validUntil')}</span>
                  <span className="font-semibold text-red-600">{formatDate(paymentData.expiredAt)}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{channelInfo.icon}</span>
                <h2 className="text-lg font-semibold text-gray-900">{channelInfo.name}</h2>
              </div>

              {/* QRIS Code */}
              {qrCodeDataUrl && (
                <div className="text-center py-6">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="mx-auto border-4 border-gray-200 rounded-lg"
                    style={{ width: '300px', height: '300px' }}
                  />
                  <p className="text-sm text-gray-600 mt-4">
                    {t('checkout.instructions.qris.step2')}
                  </p>
                </div>
              )}

              {/* Virtual Account Number */}
              {paymentData.paymentCode && !qrCodeDataUrl && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">{t('checkout.paymentResult.virtualAccountNumber')}</div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-2xl font-bold text-gray-900">
                      {paymentData.paymentCode}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentData.paymentCode || '');
                        toast.success(t('checkout.common.copiedVirtualAccount'));
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                    >
                      {t('checkout.common.copy')}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Link */}
              {paymentData.paymentUrl && (
                <div className="mt-4">
                  <a
                    href={paymentData.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    {t('checkout.paymentResult.payViaLink')}
                  </a>
                </div>
              )}
            </div>

            {/* Payment Instructions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t('checkout.paymentResult.paymentGuide')}</h3>
              <ol className="space-y-3">
                {getPaymentInstructions(paymentData.selectedChannel).map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 text-sm">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link href="/">
                <Button variant="primary" size="lg" className="w-full">
                  {t('checkout.paymentResult.backHome')}
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" size="lg" className="w-full">
                  {t('checkout.paymentResult.viewDashboard')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
