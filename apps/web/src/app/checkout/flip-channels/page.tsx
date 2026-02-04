'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { Button } from '@/components/atoms';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface PaymentChannel {
  Code: string;
  Name: string;
  Logo?: string;
  FeatureStatus: string;
  TransactionFee?: {
    ActualFee: number;
    ActualFeeType: string;
  };
}

interface PaymentMethod {
  Code: string;
  Name: string;
  Channels: PaymentChannel[];
}

interface DonationData {
  id: string;
  amount: number;
}

export default function FlipChannelsPage() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationData, setDonationData] = useState<DonationData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    // Check if there are pending transactions
    const pendingTransactions = sessionStorage.getItem('pendingTransactions');
    if (!pendingTransactions) {
      toast.error('Tidak ada transaksi pending');
      router.push('/');
      return;
    }

    try {
      const data = JSON.parse(pendingTransactions) as DonationData[];
      setDonationData(data);
      loadPaymentChannels();
    } catch (error) {
      console.error('Error parsing donation data:', error);
      toast.error('Data transaksi tidak valid');
      router.push('/');
    }
  }, [router]);

  const loadPaymentChannels = async () => {
    try {
      // Flip payment channels - Virtual Account
      const mockData: PaymentMethod[] = [
        {
          Code: 'va',
          Name: 'Virtual Account',
          Channels: [
            {
              Code: 'bca',
              Name: 'BCA Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'bni',
              Name: 'BNI Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'bri',
              Name: 'BRI Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'mandiri',
              Name: 'Mandiri Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'permata',
              Name: 'Permata Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'cimb',
              Name: 'CIMB Niaga Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
          ],
        },
      ];

      setPaymentMethods(mockData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading payment channels:', error);
      toast.error('Gagal memuat channel pembayaran');
      setIsLoading(false);
    }
  };

  const handleChannelSelect = (methodCode: string, channelCode: string) => {
    // Format: "method:channel" (e.g., "va:bca")
    setSelectedChannel(`${methodCode}:${channelCode}`);
  };

  const totalAmount = donationData.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!selectedChannel) {
      toast.error('Silakan pilih channel pembayaran');
      return;
    }

    if (donationData.length === 0) {
      toast.error('Data donasi tidak ditemukan');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donationId: donationData[0].id,
          methodId: 'flip',
          channel: selectedChannel,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal membuat pembayaran');
      }

      // Store payment result in session storage
      sessionStorage.setItem('paymentResult', JSON.stringify({
        ...result.data,
        selectedChannel,
        donationData,
      }));

      // Redirect to payment result page
      router.push('/checkout/payment-result');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal membuat pembayaran');
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
              <div className="text-center">Memuat channel pembayaran...</div>
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
              <Link href="/" className="hover:text-blue-600">Home</Link>
              <span>/</span>
              <Link href="/checkout/payment-method" className="hover:text-blue-600">Metode Pembayaran</Link>
              <span>/</span>
              <Link href="/checkout/payment-gateway" className="hover:text-blue-600">Payment Gateway</Link>
              <span>/</span>
              <span className="text-gray-900">Pilih Channel Flip</span>
            </div>

            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Pembayaran Flip
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Pilih metode pembayaran yang Anda inginkan
              </p>
            </div>

            {/* Amount Summary */}
            {totalAmount > 0 && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 text-white">
                <div className="text-xs sm:text-sm mb-2">JUMLAH YANG HARUS DIBAYAR</div>
                <div className="text-2xl sm:text-3xl font-bold mb-2">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </div>
                <div className="text-xs sm:text-sm opacity-90">
                  Pembayaran untuk pesanan {donationData.map(d => d.id).join(', ')}
                </div>
              </div>
            )}

            {/* Payment Channel Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Pembayaran Flip</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Pilih metode pembayaran yang Anda inginkan:
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4 sm:space-y-6">
              {paymentMethods.map((method) => (
                <div key={method.Code} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4" style={{ fontSize: '1.3rem' }}>{method.Name}</h3>
                  <div className="space-y-2">
                    {method.Channels.map((channel) => (
                      <label
                        key={`${method.Code}:${channel.Code}`}
                        className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-gray-600">
                              {channel.Code.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{channel.Name}</div>
                            {channel.TransactionFee && (
                              <div className="text-xs sm:text-sm text-gray-500">
                                Biaya: {channel.TransactionFee.ActualFeeType === 'FLAT'
                                  ? `Rp ${channel.TransactionFee.ActualFee.toLocaleString('id-ID')}`
                                  : `${channel.TransactionFee.ActualFee}%`
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="paymentChannel"
                          value={`${method.Code}:${channel.Code}`}
                          checked={selectedChannel === `${method.Code}:${channel.Code}`}
                          onChange={() => handleChannelSelect(method.Code, channel.Code)}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:block mt-6 sm:mt-8 space-y-3 sm:space-y-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full text-sm sm:text-base py-3 sm:py-4"
                onClick={handleSubmit}
                disabled={!selectedChannel || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  'Lanjutkan Pembayaran'
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.back()}
                className="w-full text-sm sm:text-base"
              >
                Kembali
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
              Kembali
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!selectedChannel || isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Lanjutkan Pembayaran'}
            </Button>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
