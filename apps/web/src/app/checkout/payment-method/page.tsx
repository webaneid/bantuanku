'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { Button } from '@/components/atoms';
import toast from 'react-hot-toast';

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
    nmid?: string;
    imageUrl?: string;
  };
}

interface DonationData {
  id: string;
  program: string;
}

export default function PaymentMethodPage() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there are pending transactions
    const pendingTransactions = sessionStorage.getItem('pendingTransactions');
    if (!pendingTransactions) {
      toast.error('Tidak ada transaksi pending');
      router.push('/');
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const pendingTransactionsStr = sessionStorage.getItem('pendingTransactions');
      if (!pendingTransactionsStr) return;

      const donationData = JSON.parse(pendingTransactionsStr) as DonationData[];

      // Fetch payment methods
      const methodsResponse = await fetch(`${API_URL}/payments/methods`);
      const methodsData = await methodsResponse.json();

      if (methodsData.success) {
        const allMethods = methodsData.data || [];
        console.log('All payment methods from API:', allMethods);
        setPaymentMethods(allMethods);

        // Filter methods based on campaign programs
        const filteredMethods = filterMethodsByPrograms(allMethods, donationData);
        console.log('Filtered payment methods:', filteredMethods);
        setFilteredMethods(filteredMethods);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByPrograms = (methods: PaymentMethod[], donationData: DonationData[]): PaymentMethod[] => {
    if (donationData.length === 0) return methods;

    // Get all unique programs from donations
    const programs = [...new Set(donationData.map(d => d.program))];
    console.log('Donation programs:', programs);

    // Find methods that match either:
    // 1. Specific program (matching donation programs)
    // 2. General (always available)
    const filteredMethods = methods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      // Always include general methods
      if (methodPrograms.includes('general')) {
        return true;
      }

      // Include if method's programs match any of the campaign programs
      return methodPrograms.some(methodProgram =>
        programs.includes(methodProgram.toLowerCase())
      );
    });

    return filteredMethods;
  };

  const handleSelectMethod = (methodType: string) => {
    if (methodType === 'bank_transfer' || methodType === 'qris' || methodType === 'payment_gateway') {
      // Store selected method type
      sessionStorage.setItem('selectedMethodType', methodType);

      // If payment gateway (Pembayaran Cepat)
      if (methodType === 'payment_gateway') {
        // Check how many payment gateways are available
        const paymentGateways = filteredMethods.filter(m => m.type === 'payment_gateway');

        if (paymentGateways.length === 1) {
          // Only 1 gateway available - skip gateway selection, go directly to channel page
          const gateway = paymentGateways[0];
          sessionStorage.setItem('selectedGateway', gateway.code);

          // Route to specific gateway channel page
          if (gateway.code === 'ipaymu') {
            router.push('/checkout/ipaymu-channels');
          } else if (gateway.code === 'flip') {
            router.push('/checkout/flip-channels');
          } else if (gateway.code === 'xendit') {
            router.push('/checkout/xendit-channels');
          } else {
            // Fallback to gateway selection if unknown
            router.push('/checkout/payment-gateway');
          }
        } else {
          // Multiple gateways - show gateway selection page
          router.push('/checkout/payment-gateway');
        }
      } else {
        // For bank_transfer and qris, go directly to payment detail
        router.push('/checkout/payment-detail');
      }
    }
  };

  // Group filtered payment methods by type, exclude cash
  const groupedMethods = filteredMethods.reduce((acc, method) => {
    // Skip cash for online checkout
    if (method.type === 'cash') return acc;

    if (!acc[method.type]) {
      acc[method.type] = [];
    }
    acc[method.type].push(method);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  // Get payment method type configurations
  const paymentTypeConfig = {
    bank_transfer: {
      icon: (
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      bgColor: 'bg-primary-100',
      hoverBgColor: 'group-hover:bg-primary-200',
      title: 'Transfer Bank',
      description: 'Transfer ke rekening bank kami',
    },
    qris: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      bgColor: 'bg-blue-100',
      hoverBgColor: 'group-hover:bg-blue-200',
      title: 'QRIS',
      description: 'Scan QR Code dengan aplikasi e-wallet',
    },
    payment_gateway: {
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      bgColor: 'bg-purple-100',
      hoverBgColor: 'group-hover:bg-purple-200',
      title: 'Pembayaran Cepat',
      description: 'Virtual Account / E-wallet / QRIS',
    },
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
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="section-title text-gray-900 mb-2">
                Pilih Metode Pembayaran
              </h1>
              <p className="text-gray-600" style={{ fontSize: '15px' }}>
                Silakan pilih metode pembayaran yang Anda inginkan
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              {Object.entries(groupedMethods).map(([type, methods]) => {
                const config = paymentTypeConfig[type as keyof typeof paymentTypeConfig];
                if (!config) return null;

                return (
                  <button
                    key={type}
                    onClick={() => handleSelectMethod(type)}
                    className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-6 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${config.bgColor} rounded-lg flex items-center justify-center ${config.hoverBgColor} transition-colors`}>
                          {config.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900" style={{ fontSize: '1.1rem' }}>
                            {config.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {config.description}
                          </p>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}

              {Object.keys(groupedMethods).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Belum ada metode pembayaran tersedia</p>
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="mt-8">
              <Link href="/keranjang-bantuan">
                <Button variant="outline" size="lg" className="w-full">
                  Kembali ke Keranjang
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
