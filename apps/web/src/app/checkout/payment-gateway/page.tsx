'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { Button } from '@/components/atoms';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface PaymentGateway {
  id: string;
  code: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface DonationData {
  id: string;
  amount: number;
}

export default function PaymentGatewayPage() {
  const router = useRouter();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
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
      loadPaymentGateways();
    } catch (error) {
      console.error('Error parsing donation data:', error);
      toast.error('Data transaksi tidak valid');
      router.push('/');
    }
  }, [router]);

  const loadPaymentGateways = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/methods`);
      const result = await response.json();

      if (result.success && result.data) {
        // Filter only payment_gateway type
        const gatewayMethods = result.data.filter(
          (method: any) => method.type === 'payment_gateway'
        );

        // Transform to gateway format
        const gatewayList: PaymentGateway[] = gatewayMethods.map((method: any) => ({
          id: method.id,
          code: method.code,
          name: method.name,
          type: method.type,
          enabled: true,
        }));

        setGateways(gatewayList);
      }
    } catch (error) {
      console.error('Error loading payment gateways:', error);
      toast.error('Gagal memuat payment gateway');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGateway = (gatewayCode: string) => {
    setSelectedGateway(gatewayCode);
  };

  const handleContinue = () => {
    if (!selectedGateway) {
      toast.error('Silakan pilih payment gateway');
      return;
    }

    // Store selected gateway
    sessionStorage.setItem('selectedGateway', selectedGateway);

    // Route based on selected gateway
    if (selectedGateway === 'ipaymu') {
      router.push('/checkout/ipaymu-channels');
    } else if (selectedGateway === 'flip') {
      router.push('/checkout/flip-channels');
    } else if (selectedGateway === 'xendit') {
      // TODO: Implement Xendit channels page
      toast.error('Xendit belum tersedia, sedang dalam pengembangan');
    } else {
      toast.error('Gateway tidak dikenali');
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
                <div className="h-8 bg-gray-200 rounded w-48"></div>
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
              <Link href="/checkout/payment-method" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
              </Link>
              <h1 className="section-title text-gray-900">
                Pilih Payment Gateway
              </h1>
            </div>

            {/* Gateway Selection */}
            <div className="space-y-3 mb-6">
              {gateways.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">Tidak ada payment gateway tersedia</p>
                  <p className="text-sm text-gray-500">Silakan hubungi administrator</p>
                </div>
              ) : (
                gateways.map((gateway) => (
                  <button
                    key={gateway.id}
                    onClick={() => handleSelectGateway(gateway.code)}
                    className={`w-full bg-white rounded-lg shadow-sm border-2 transition-all p-6 text-left ${
                      selectedGateway === gateway.code
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          selectedGateway === gateway.code ? 'bg-primary-100' : 'bg-gray-100'
                        }`}>
                          <svg className={`w-6 h-6 ${selectedGateway === gateway.code ? 'text-primary-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900" style={{ fontSize: '1.1rem' }}>
                            {gateway.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            general
                          </p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedGateway === gateway.code
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedGateway === gateway.code && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Detail Section */}
            {selectedGateway && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '1.1rem' }}>
                  {selectedGateway === 'ipaymu' && 'Detail iPaymu'}
                  {selectedGateway === 'flip' && 'Detail Flip'}
                  {selectedGateway === 'xendit' && 'Detail Xendit'}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedGateway === 'ipaymu' && 'Pembayaran melalui iPaymu mendukung Virtual Account, QRIS, E-wallet, dan metode lainnya.'}
                  {selectedGateway === 'flip' && 'Pembayaran melalui Flip mendukung transfer antar bank dengan biaya rendah.'}
                  {selectedGateway === 'xendit' && 'Pembayaran melalui Xendit mendukung berbagai metode pembayaran digital.'}
                </p>
              </div>
            )}

            {/* Total Amount */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-6 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total Pembayaran</span>
                <span className="text-2xl font-bold text-primary-600">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Transfer tepat sesuai nominal untuk mempercepat verifikasi
              </p>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:block space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={!selectedGateway}
              >
                Lanjutkan
              </Button>

              <Link href="/checkout/payment-method">
                <Button variant="outline" size="lg" className="w-full">
                  Kembali ke Metode Pembayaran
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
              onClick={handleContinue}
              disabled={!selectedGateway}
            >
              Lanjutkan
            </Button>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
