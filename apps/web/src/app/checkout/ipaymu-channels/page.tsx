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

export default function IPaymuChannelsPage() {
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
      // TODO: Implement API endpoint to get iPaymu payment channels
      // For now, we'll use mock data based on iPaymu documentation
      const mockData: PaymentMethod[] = [
        {
          Code: 'qris',
          Name: 'QRIS',
          Channels: [
            {
              Code: 'qris',
              Name: 'QRIS Dynamic NOBU',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 0.7,
                ActualFeeType: 'PERCENT',
              },
            },
          ],
        },
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
              Code: 'mandiri',
              Name: 'Mandiri Virtual Account',
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
                ActualFee: 3500,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'permata',
              Name: 'Permata Virtual Account',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 3500,
                ActualFeeType: 'FLAT',
              },
            },
          ],
        },
        {
          Code: 'cstore',
          Name: 'E-Wallet & Convenience Store',
          Channels: [
            {
              Code: 'gopay',
              Name: 'GoPay',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 2,
                ActualFeeType: 'PERCENT',
              },
            },
            {
              Code: 'shopeepay',
              Name: 'ShopeePay',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 2,
                ActualFeeType: 'PERCENT',
              },
            },
            {
              Code: 'alfamart',
              Name: 'Alfamart',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
            {
              Code: 'indomaret',
              Name: 'Indomaret',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 4000,
                ActualFeeType: 'FLAT',
              },
            },
          ],
        },
        {
          Code: 'cc',
          Name: 'Credit Card',
          Channels: [
            {
              Code: 'cc',
              Name: 'Credit Card',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 2.8,
                ActualFeeType: 'PERCENT',
              },
            },
          ],
        },
        {
          Code: 'online',
          Name: 'Debit Online',
          Channels: [
            {
              Code: 'online',
              Name: 'Debit Online',
              FeatureStatus: 'active',
              TransactionFee: {
                ActualFee: 3500,
                ActualFeeType: 'FLAT',
              },
            },
          ],
        },
      ];

      setPaymentMethods(mockData);
    } catch (error) {
      console.error('Error loading payment channels:', error);
      toast.error('Gagal memuat metode pembayaran');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFee = (fee?: { ActualFee: number; ActualFeeType: string }) => {
    if (!fee) return '';
    if (fee.ActualFeeType === 'PERCENT') {
      return `Fee: ${fee.ActualFee}%`;
    }
    return `Fee: Rp ${fee.ActualFee.toLocaleString('id-ID')}`;
  };

  const handleSubmit = async () => {
    if (!selectedChannel) {
      toast.error('Silakan pilih metode pembayaran');
      return;
    }

    setIsSubmitting(true);
    try {
      // Store selected channel for payment creation
      sessionStorage.setItem('selectedPaymentChannel', selectedChannel);

      // Create payment for first donation (or merge them)
      const response = await fetch(`${API_URL}/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donationId: donationData[0].id,
          methodId: 'ipaymu',
          channel: selectedChannel, // Pass selected channel
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store payment data and selected channel in session
        sessionStorage.setItem('paymentResult', JSON.stringify({
          ...result.data,
          selectedChannel,
          donationData,
        }));
        router.push('/checkout/payment-result');
      } else {
        throw new Error(result.message || 'Gagal membuat pembayaran');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal membuat pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = donationData.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
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
      <main className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pembayaran iPaymu
              </h1>
              <p className="text-gray-600" style={{ fontSize: '15px' }}>
                Pilih metode pembayaran yang Anda inginkan
              </p>
            </div>

            {/* Amount Summary */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-lg p-6 mb-6 text-white">
              <div className="text-sm mb-2">JUMLAH YANG HARUS DIBAYAR</div>
              <div className="text-3xl font-bold mb-2">
                Rp {totalAmount.toLocaleString('id-ID')}
              </div>
              <div className="text-sm opacity-90">
                Pembayaran untuk pesanan {donationData.map(d => d.id).join(', ')}
              </div>
            </div>

            {/* Payment Channel Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pembayaran iPaymu</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Pilih metode pembayaran yang Anda inginkan:
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-6">
              {paymentMethods.map((method) => (
                <div key={method.Code} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '1.3rem' }}>{method.Name}</h3>
                  <div className="space-y-2">
                    {method.Channels.filter(ch => ch.FeatureStatus === 'active').map((channel) => (
                      <label
                        key={`${method.Code}:${channel.Code}`}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            {/* Channel logo would go here */}
                            <span className="text-xs font-semibold text-gray-600">
                              {channel.Code.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{channel.Name}</div>
                            {channel.TransactionFee && (
                              <div className="text-sm text-gray-500">
                                {formatFee(channel.TransactionFee)}
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="paymentChannel"
                          value={`${method.Code}:${channel.Code}`}
                          checked={selectedChannel === `${method.Code}:${channel.Code}`}
                          onChange={(e) => setSelectedChannel(e.target.value)}
                          className="w-5 h-5 text-orange-600 focus:ring-orange-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:block mt-8 space-y-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
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

              <Link href="/checkout/payment-method">
                <Button variant="outline" size="lg" className="w-full">
                  Kembali ke Pilih Metode
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          <div className="flex gap-2">
            <Link href="/checkout/payment-method" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                Kembali
              </Button>
            </Link>
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
