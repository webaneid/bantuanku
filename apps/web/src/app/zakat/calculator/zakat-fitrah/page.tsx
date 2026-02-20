'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, Footer, ZakatCard } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchPublicSettings } from '@/services/settings';
import { fetchZakatConfig, fetchZakatPeriods, fetchZakatTypes, formatCurrency, getImageUrl, type ZakatPeriod, type ZakatType } from '@/services/zakat';
import { useRouter } from 'next/navigation';
import { useZakatDisplayMeta } from '@/components/zakat/ZakatDisplayMetaContext';
import ZakatConfirmModal from '@/components/zakat/ZakatConfirmModal';
import ZakatOwnerInfo from '@/components/zakat/ZakatOwnerInfo';
import { useI18n } from '@/lib/i18n/provider';

function getLargeVariantUrl(imageUrl: string): string {
  const [pathname, query = ''] = imageUrl.split('?');
  const largePath = pathname.replace(/-(thumbnail|medium|square|original)\.webp$/i, '-large.webp');
  return query ? `${largePath}?${query}` : largePath;
}

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ZakatFitrahPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { token } = useAuth();
  const displayMeta = useZakatDisplayMeta();
  const [config, setConfig] = useState<any>(null);
  const [periods, setPeriods] = useState<ZakatPeriod[]>([]);
  const [zakatTypes, setZakatTypes] = useState<ZakatType[]>([]);
  const [zakatType, setZakatType] = useState<ZakatType | null>(null);
  const [organizationName, setOrganizationName] = useState('Bantuanku');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [displayImageSrc, setDisplayImageSrc] = useState<string | null>(null);

  // Form state
  const [jumlahJiwa, setJumlahJiwa] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [configData, periodsData, zakatTypesData, settingsData] = await Promise.all([
        fetchZakatConfig(),
        fetchZakatPeriods(),
        fetchZakatTypes(),
        fetchPublicSettings(),
      ]);
      setConfig(configData);
      setPeriods(periodsData);
      setZakatTypes(zakatTypesData);
      setOrganizationName(settingsData.organization_name || settingsData.site_name || 'Bantuanku');

      // Find zakat fitrah type - try different possible slugs
      const fitrahType = zakatTypesData.find((t: ZakatType) =>
        t.slug === 'fitrah' ||
        t.slug === 'zakat-fitrah' ||
        t.name?.toLowerCase().includes('fitrah')
      );
      setZakatType(fitrahType || null);

      // Auto-select first period if available
      if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (jumlahJiwa <= 0 || !selectedPeriod) return;
    setShowModal(true);
  };

  const fitrahAmountFromType = Number(displayMeta?.fitrahAmount ?? zakatType?.fitrahAmount);
  const fitrahAmountFromSettings = Number(config?.zakatFitrahPerPerson);
  const zakatFitrahAmount =
    Number.isFinite(fitrahAmountFromType) && fitrahAmountFromType > 0
      ? fitrahAmountFromType
      : (Number.isFinite(fitrahAmountFromSettings) && fitrahAmountFromSettings > 0
          ? fitrahAmountFromSettings
          : 50000);
  const totalZakat = jumlahJiwa * zakatFitrahAmount;

  const displayName = displayMeta?.name || zakatType?.name || t('zakatCalculator.fitrah.defaultName');
  const displayDescription = displayMeta?.description || zakatType?.description;
  const displayImage = displayMeta?.imageUrl || zakatType?.imageUrl;
  const displayImageOriginal = displayImage ? getImageUrl(displayImage, '/images/placeholder-zakat.jpg') : null;

  useEffect(() => {
    if (!displayImageOriginal) {
      setDisplayImageSrc(null);
      return;
    }
    setDisplayImageSrc(getLargeVariantUrl(displayImageOriginal));
  }, [displayImageOriginal]);

  const relatedZakat = useMemo(() => {
    const currentId = displayMeta?.id || zakatType?.id;
    const others = zakatTypes.filter((type) => type.id !== currentId && type.isActive);
    return shuffleItems(others).slice(0, 6);
  }, [displayMeta?.id, zakatType?.id, zakatTypes]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="text-center py-16">
              <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('zakatCalculator.common.loading')}</p>
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
      <main className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="max-w-3xl mx-auto mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('zakatCalculator.common.back')}
            </button>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Feature Image */}
            {displayImageSrc && (
              <div className="mb-8">
                <img
                  src={displayImageSrc}
                  alt={displayName}
                  className="w-full h-64 md:h-80 object-cover rounded-xl"
                  onError={(event) => {
                    if (!displayImageOriginal) return;
                    if (event.currentTarget.src !== displayImageOriginal) {
                      event.currentTarget.src = displayImageOriginal;
                    }
                  }}
                />
              </div>
            )}

            <ZakatOwnerInfo owner={displayMeta?.owner} />
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {displayName}
              </h2>
              {displayDescription && (
                <div
                  className="text-sm text-gray-600 leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: displayDescription }}
                />
              )}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('zakatCalculator.fitrah.calculatorTitle')}
              </h2>
            </div>

            {/* Calculator Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-8">
            <div className="space-y-6">
              {/* Periode Zakat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('zakatCalculator.common.periodLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('zakatCalculator.common.selectPeriod')}</option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name} {period.hijriYear ? `(${period.hijriYear} H)` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {t('zakatCalculator.fitrah.periodHelper')}
                </p>
              </div>

              {/* Jumlah Jiwa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('zakatCalculator.fitrah.peopleCountLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={jumlahJiwa}
                  onChange={(e) => setJumlahJiwa(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('zakatCalculator.common.zeroPlaceholder')}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('zakatCalculator.fitrah.peopleCountHelper')}
                </p>
              </div>

              {/* Nominal Per Jiwa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('zakatCalculator.fitrah.fitrahAmountLabel')}
                </label>
                <input
                  type="text"
                  value={formatCurrency(zakatFitrahAmount)}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('zakatCalculator.fitrah.fitrahAmountHelper')}
                </p>
              </div>

              {/* Ketentuan Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-900 mb-1">{t('zakatCalculator.fitrah.ruleTitle')}</p>
                <p className="text-sm text-emerald-700">
                  {t('zakatCalculator.fitrah.ruleAmount', { amount: formatCurrency(zakatFitrahAmount) })}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {t('zakatCalculator.fitrah.ruleHelper')}
                </p>
              </div>

              {/* Hasil Perhitungan */}
              {jumlahJiwa > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-emerald-900 mb-2">{t('zakatCalculator.fitrah.totalTitle')}</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalZakat)}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {t('zakatCalculator.fitrah.totalFormula', {
                      count: jumlahJiwa,
                      amount: formatCurrency(zakatFitrahAmount),
                    })}
                  </p>
                </div>
              )}

              {/* Bayar Button */}
              {jumlahJiwa > 0 && (
                <button
                  onClick={handlePayment}
                  disabled={!selectedPeriod}
                  className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {t('zakatCalculator.fitrah.payNow')}
                </button>
              )}
            </div>
          </div>

          {relatedZakat.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('zakatCalculator.common.otherZakat')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedZakat.map((item) => (
                  <ZakatCard
                    key={item.id}
                    id={item.id}
                    slug={item.slug}
                    title={item.name}
                    image={getImageUrl(item.imageUrl, '/images/placeholder-zakat.jpg')}
                    ownerName={item.ownerType === 'mitra' ? (item.ownerName || organizationName) : organizationName}
                    ownerType={item.ownerType === 'mitra' ? 'mitra' : 'organization'}
                    aspectRatio="portrait"
                  />
                ))}
              </div>
            </section>
          )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Zakat Confirm Modal */}
      <ZakatConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        amount={totalZakat}
        zakatName={displayName}
        zakatType="fitrah"
        zakatTypeId={displayMeta?.id || zakatType?.id}
        zakatTypeSlug={displayMeta?.slug || zakatType?.slug}
        quantity={jumlahJiwa}
        pricePerUnit={zakatFitrahAmount}
        periodId={selectedPeriod}
      />
    </>
  );
}
