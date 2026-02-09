'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  programs: string[];
  details?: any;
}

interface UniversalPaymentMethodSelectorProps {
  transactionId: string;
}

export default function UniversalPaymentMethodSelector({
  transactionId
}: UniversalPaymentMethodSelectorProps) {
  const router = useRouter();
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [transactionId]);

  const loadData = async () => {
    try {
      const transactionResponse = await api.get(`/transactions/${transactionId}`);

      if (!transactionResponse.data.success) {
        toast.error('Transaksi tidak ditemukan');
        return;
      }

      const transactionData = transactionResponse.data.data;
      const transaction = transactionData.data;

      let program = 'infaq';

      // Handle new transactions format
      if (transactionData.type === 'transaction') {
        if (transaction.productType === 'zakat') {
          program = 'zakat';
        } else if (transaction.productType === 'qurban') {
          program = 'qurban';
        } else if (transaction.productType === 'campaign') {
          program = transaction.typeSpecificData?.pillar || 'infaq';
        }
      } else {
        // Handle old transactions format
        if (transactionData.type === 'zakat' || transaction.campaign?.pillar === 'zakat' || transaction.zakatType) {
          program = 'zakat';
        } else if (transactionData.type === 'qurban' || transaction.campaign?.pillar === 'qurban' || transaction.package) {
          program = 'qurban';
        } else if (transaction.campaign?.pillar) {
          program = transaction.campaign.pillar;
        }
      }

      const methodsResponse = await api.get('/payments/methods');

      if (methodsResponse.data.success) {
        const allMethods = methodsResponse.data.data || [];
        const filtered = filterMethodsByProgram(allMethods, program);
        setFilteredMethods(filtered);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByProgram = (methods: PaymentMethod[], program: string): PaymentMethod[] => {
    // Payment gateway is always available
    const paymentGateways = methods.filter(m => m.type === 'payment_gateway');

    // For bank_transfer and qris, apply priority filtering
    const otherMethods = methods.filter(m => m.type !== 'payment_gateway');

    // First try to find methods specifically for this program
    const specificMethods = otherMethods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      return methodPrograms.some(methodProgram =>
        methodProgram.toLowerCase() === program.toLowerCase()
      );
    });

    // If found specific methods, return them along with payment gateway
    if (specificMethods.length > 0) {
      return [...paymentGateways, ...specificMethods];
    }

    // Otherwise, return methods marked as 'general' or 'infaq' as fallback
    const fallbackMethods = otherMethods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      return methodPrograms.some(methodProgram =>
        methodProgram.toLowerCase() === 'general' || methodProgram.toLowerCase() === 'infaq'
      );
    });

    return [...paymentGateways, ...fallbackMethods];
  };

  const handleSelectMethod = (methodType: string) => {
    if (methodType === 'bank_transfer' || methodType === 'qris' || methodType === 'payment_gateway') {
      sessionStorage.setItem('selectedMethodType', methodType);

      if (methodType === 'payment_gateway') {
        const paymentGateways = filteredMethods.filter(m => m.type === 'payment_gateway');
        if (paymentGateways.length === 1) {
          sessionStorage.setItem('selectedGatewayCode', paymentGateways[0].code);
        }
      }

      router.push(`/invoice/${transactionId}/payment-detail`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const groupedMethods = filteredMethods.reduce((acc, method) => {
    if (!acc[method.type]) {
      acc[method.type] = [];
    }
    acc[method.type].push(method);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  const hasBank = groupedMethods['bank_transfer']?.length > 0;
  const hasQris = groupedMethods['qris']?.length > 0;
  const hasGateway = groupedMethods['payment_gateway']?.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pilih Metode Pembayaran
          </h1>
          <p className="text-gray-600">
            Silakan pilih metode pembayaran yang Anda inginkan
          </p>
        </div>

        <div className="space-y-4">
          {hasBank && (
            <button
              onClick={() => handleSelectMethod('bank_transfer')}
              className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-6 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Transfer Bank
                    </h3>
                    <p className="text-sm text-gray-600">
                      Transfer ke rekening bank kami
                    </p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {hasQris && (
            <button
              onClick={() => handleSelectMethod('qris')}
              className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-6 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      QRIS
                    </h3>
                    <p className="text-sm text-gray-600">
                      Scan QR Code dengan aplikasi e-wallet
                    </p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {hasGateway && (
            <button
              onClick={() => handleSelectMethod('payment_gateway')}
              className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-6 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Payment Gateway
                    </h3>
                    <p className="text-sm text-gray-600">
                      Kartu Kredit / Virtual Account
                    </p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {!hasBank && !hasQris && !hasGateway && (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada metode pembayaran tersedia</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
