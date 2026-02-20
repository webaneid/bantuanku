'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from '@/lib/feedback-toast';
import api from '@/lib/api';
import { useI18n } from '@/lib/i18n/provider';

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
  const { t } = useI18n();
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [transactionId]);

  const loadData = async () => {
    try {
      const transactionResponse = await api.get(`/transactions/${transactionId}`);

      if (!transactionResponse.data.success) {
        toast.error(t('payment.transactionNotFound'));
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
      toast.error(t('payment.loadDataFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByProgram = (methods: PaymentMethod[], program: string): PaymentMethod[] => {
    // Payment gateway is always available
    const paymentGateways = methods.filter(m => m.type === 'payment_gateway');

    // For bank_transfer and qris, apply filtering with priority: specific > general
    const otherMethods = methods.filter(m => m.type !== 'payment_gateway');

    // Group by type
    const byType: Record<string, PaymentMethod[]> = {};
    for (const method of otherMethods) {
      if (!byType[method.type]) byType[method.type] = [];
      byType[method.type].push(method);
    }

    const result: PaymentMethod[] = [...paymentGateways];

    for (const [, typeMethods] of Object.entries(byType)) {
      // Find methods that specifically match the program (not just general)
      const specificMatch = typeMethods.filter(method => {
        const programs = method.programs && method.programs.length > 0 ? method.programs : ['general'];
        return programs.some(p => p.toLowerCase() === program.toLowerCase() && p.toLowerCase() !== 'general');
      });

      if (specificMatch.length > 0) {
        // Specific program match found — use only those
        result.push(...specificMatch);
      } else {
        // No specific match — fall back to general
        const generalMatch = typeMethods.filter(method => {
          const programs = method.programs && method.programs.length > 0 ? method.programs : ['general'];
          return programs.some(p => p.toLowerCase() === 'general');
        });
        if (generalMatch.length > 0) {
          result.push(...generalMatch);
        } else {
          // Safety fallback: still show available methods for this type
          result.push(...typeMethods);
        }
      }
    }

    return result;
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectMethod = async (methodType: string) => {
    if (methodType === 'bank_transfer' || methodType === 'qris') {
      sessionStorage.setItem('selectedMethodType', methodType);
      router.push(`/invoice/${transactionId}/payment-detail`);
    } else if (methodType === 'payment_gateway') {
      const gateways = filteredMethods.filter(m => m.type === 'payment_gateway');

      if (gateways.length === 1) {
        await processGatewayPayment(gateways[0].code);
      } else if (gateways.length > 1) {
        sessionStorage.setItem('selectedMethodType', methodType);
        router.push(`/invoice/${transactionId}/payment-detail`);
      }
    }
  };

  const processGatewayPayment = async (gatewayCode: string) => {
    setIsProcessing(true);
    try {
      const response = await api.post('/payments/create', {
        transactionId,
        methodId: gatewayCode,
      });

      if (response.data.success) {
        const { paymentUrl } = response.data.data;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          toast.error(t('payment.paymentUrlUnavailable'));
        }
      } else {
        toast.error(response.data.message || t('payment.createPaymentFailed'));
      }
    } catch (error: any) {
      console.error('Error creating gateway payment:', error);
      toast.error(error?.response?.data?.message || t('payment.createPaymentFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || isProcessing) {
    return (
      <div className="space-y-4">
        {isProcessing ? (
            <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('payment.processPayment')}</p>
          </div>
        ) : (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        )}
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
            {t('payment.chooseMethodTitle')}
          </h1>
          <p className="text-gray-600">
            {t('payment.chooseMethodDesc')}
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
                      {t('payment.bankTransfer')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('payment.bankTransferDesc')}
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
                      {t('payment.qris')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('payment.qrisDesc')}
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
                      {t('payment.gateway')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('payment.gatewayDesc')}
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
              <p className="text-gray-500">{t('payment.noMethods')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
