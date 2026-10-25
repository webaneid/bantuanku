'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from '@/lib/feedback-toast';
import api from '@/lib/api';
import * as fbPixel from '@/lib/fbPixel';
import { useI18n } from '@/lib/i18n/provider';
import { useSettings } from '@/hooks/useSettings';

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  programs: string[];
  details?: any;
}

interface GatewayChannel {
  id: string; // "va:bni" — dikirim sebagai `channel` ke POST /payments/create
  code: string;
  name: string;
  logo?: string;
}

interface GatewayChannelGroup {
  code: string;
  name: string;
  channels: GatewayChannel[];
}

interface UniversalPaymentMethodSelectorProps {
  transactionId: string;
}

export default function UniversalPaymentMethodSelector({
  transactionId
}: UniversalPaymentMethodSelectorProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { settings } = useSettings();
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

  const handleSelectManual = (methodType: 'bank_transfer' | 'qris') => {
    fbPixel.addPaymentInfo({ content_ids: [transactionId] });
    sessionStorage.setItem('selectedMethodType', methodType);
    router.push(`/invoice/${transactionId}/payment-detail`);
  };

  const processGatewayPayment = async (gatewayCode: string, channel?: string) => {
    fbPixel.addPaymentInfo({ content_ids: [transactionId] });
    setIsProcessing(true);
    try {
      const response = await api.post('/payments/create', {
        transactionId,
        methodId: gatewayCode,
        ...(channel ? { channel } : {}),
      });

      if (response.data.success) {
        const { paymentUrl } = response.data.data;
        if (channel) {
          // Channel dipilih di halaman ini (iPaymu): instruksi bayar ditampilkan di halaman kita
          router.push(`/invoice/${transactionId}/payment-instruction`);
          return;
        }
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

  const hasBank = filteredMethods.some(m => m.type === 'bank_transfer');
  const hasQris = filteredMethods.some(m => m.type === 'qris');
  const gateways = filteredMethods.filter(m => m.type === 'payment_gateway');
  const channelGateways = gateways.filter(g => (g.details?.channelGroups || []).length > 0);
  const plainGateways = gateways.filter(g => (g.details?.channelGroups || []).length === 0);
  const hasAny = hasBank || hasQris || gateways.length > 0;

  const groupLabel = (group: GatewayChannelGroup) => {
    const key = `payment.channelGroup.${group.code}`;
    const label = t(key);
    return label === key ? group.name : label;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          {/* Logo lembaga untuk rasa percaya; lebar 25% kolom, 110-150px (mendekati ukuran logo header) */}
          <img
            src={settings.organization_logo || '/logo.svg'}
            alt={settings.site_name || ''}
            className="w-1/4 min-w-[110px] max-w-[150px] h-auto object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-dark mb-2">
            {t('payment.chooseMethodTitle')}
          </h1>
          <p className="text-gray-600">
            {t('payment.chooseMethodDesc')}
          </p>
        </div>

        {(hasBank || hasQris) && (
          <MethodSection title={t('payment.sectionManual')}>
            {hasBank && (
              <MethodCard
                onClick={() => handleSelectManual('bank_transfer')}
                title={t('payment.bankTransfer')}
                subtitle={t('payment.bankTransferDesc')}
                tone="bg-primary-100 text-primary-600"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
              />
            )}
            {hasQris && (
              <MethodCard
                onClick={() => handleSelectManual('qris')}
                title={t('payment.qris')}
                subtitle={t('payment.qrisDesc')}
                tone="bg-info-100 text-info-600"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                }
              />
            )}
          </MethodSection>
        )}

        {channelGateways.flatMap(gateway =>
          (gateway.details.channelGroups as GatewayChannelGroup[]).map(group => (
            <MethodSection key={`${gateway.code}-${group.code}`} title={groupLabel(group)}>
              {group.channels.map(channel => (
                <MethodCard
                  key={channel.id}
                  onClick={() => processGatewayPayment(gateway.code, channel.id)}
                  title={channel.name}
                  subtitle={t('payment.gatewayAutoDesc')}
                  tone="bg-gray-100 text-gray-600"
                  logo={channel.logo}
                />
              ))}
            </MethodSection>
          ))
        )}

        {plainGateways.length > 0 && (
          <MethodSection title={t('payment.sectionAuto')}>
            {plainGateways.map(gateway => (
              <MethodCard
                key={gateway.id}
                onClick={() => processGatewayPayment(gateway.code)}
                title={gateway.name}
                subtitle={t('payment.gatewayDesc')}
                tone="bg-success-100 text-success-600"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
              />
            ))}
          </MethodSection>
        )}

        {!hasAny && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('payment.noMethods')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MethodSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

interface MethodCardProps {
  onClick: () => void;
  title: string;
  subtitle: string;
  /** kelas warna kotak ikon, mis. "bg-primary-100 text-primary-600" */
  tone: string;
  icon?: React.ReactNode;
  logo?: string;
}

// Satu kartu untuk semua metode (manual dan gateway) supaya tampilannya seragam
function MethodCard({ onClick, title, subtitle, tone, icon, logo }: MethodCardProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-4 text-left group"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${tone}`}>
            {logo && !logoFailed ? (
              <img src={logo} alt={title} className="w-full h-full object-contain p-1" onError={() => setLogoFailed(true)} />
            ) : (
              icon || <span className="font-bold text-lg">{title.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-dark truncate">{title}</h3>
            <p className="text-sm text-gray-600 truncate">{subtitle}</p>
          </div>
        </div>
        <svg className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
