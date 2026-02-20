'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, Footer, ZakatCard } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchPublicSettings } from '@/services/settings';
import { fetchZakatConfig, calculateZakatIncome, fetchZakatPeriods, fetchZakatTypes, formatCurrency, getImageUrl, type ZakatPeriod, type ZakatType } from '@/services/zakat';
import { useRouter } from 'next/navigation';
import { useZakatDisplayMeta } from '@/components/zakat/ZakatDisplayMetaContext';
import ZakatOwnerInfo from '@/components/zakat/ZakatOwnerInfo';
import ZakatConfirmModal from '@/components/zakat/ZakatConfirmModal';
import { useI18n } from '@/lib/i18n/provider';
import toast from '@/lib/feedback-toast';

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


export default function ZakatPenghasilanPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { token } = useAuth();
  const displayMeta = useZakatDisplayMeta();
  const [config, setConfig] = useState<any>(null);
  const [zakatTypes, setZakatTypes] = useState<ZakatType[]>([]);
  const [zakatType, setZakatType] = useState<ZakatType | null>(null);
  const [organizationName, setOrganizationName] = useState('Bantuanku');
  const [periods, setPeriods] = useState<ZakatPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [displayImageSrc, setDisplayImageSrc] = useState<string | null>(null);

  // Form state
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  // Result state
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [configData, zakatTypesData, periodsData, settingsData] = await Promise.all([
        fetchZakatConfig(),
        fetchZakatTypes(),
        fetchZakatPeriods(),
        fetchPublicSettings(),
      ]);
      setConfig(configData);
      setPeriods(periodsData);
      setZakatTypes(zakatTypesData);
      setOrganizationName(settingsData.organization_name || settingsData.site_name || 'Bantuanku');
      if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
      }

      // Find zakat penghasilan type
      const penghasilanType = zakatTypesData.find((t: ZakatType) =>
        t.slug === 'penghasilan' ||
        t.slug === 'zakat-penghasilan' ||
        t.name?.toLowerCase().includes('penghasilan')
      );
      setZakatType(penghasilanType || null);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);

    try {
      const params = {
        monthlyIncome,
        otherIncome,
        monthlyExpenses,
      };

      const calculationResult = await calculateZakatIncome(params, token || undefined);
      setResult(calculationResult);
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error(t('zakatCalculator.common.calculateFailed'));
    } finally {
      setCalculating(false);
    }
  };

  const handlePayment = () => {
    if (!result?.isWajib || !selectedPeriod) return;
    setShowModal(true);
  };

  const netIncome = monthlyIncome + otherIncome - monthlyExpenses;

  const displayName = displayMeta?.name || zakatType?.name || t('zakatCalculator.penghasilan.defaultName');
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
              <h2 className="text-xl font-semibold text-gray-900">{t('zakatCalculator.penghasilan.calculatorTitle')}</h2>
            </div>

            {/* Calculator Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calculator Form */}
                <div>
                  <form onSubmit={handleCalculate} className="space-y-6">
                    {/* Monthly Income */}
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
                    </div>

                    {/* Monthly Income */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('zakatCalculator.penghasilan.fields.monthlyIncome')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t('zakatCalculator.common.currencyZeroPlaceholder')}
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        {t('zakatCalculator.penghasilan.monthlyIncomeHelper')}
                      </p>
                    </div>

                    {/* Other Income */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('zakatCalculator.penghasilan.fields.otherIncome')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={otherIncome}
                        onChange={(e) => setOtherIncome(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t('zakatCalculator.common.currencyZeroPlaceholder')}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        {t('zakatCalculator.penghasilan.otherIncomeHelper')}
                      </p>
                    </div>

                    {/* Monthly Expenses */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('zakatCalculator.penghasilan.fields.expenses')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={monthlyExpenses}
                        onChange={(e) => setMonthlyExpenses(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t('zakatCalculator.common.currencyZeroPlaceholder')}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        {t('zakatCalculator.penghasilan.expensesHelper')}
                      </p>
                    </div>

                    {/* Net Income Preview */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{t('zakatCalculator.penghasilan.netIncome')}</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(netIncome)}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={calculating}
                      className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {calculating ? t('zakatCalculator.common.calculating') : t('zakatCalculator.penghasilan.calculateButton')}
                    </button>
                  </form>
                </div>

                {/* Result */}
                <div>
                  {result ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-6">
                        {t('zakatCalculator.common.calculationResult')}
                      </h2>

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                          <span className="text-gray-600">{t('zakatCalculator.penghasilan.netIncome')}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(result.totalAssets)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                          <span className="text-gray-600">{t('zakatCalculator.penghasilan.nisabMonthly')}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(result.nisabValue)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                          <span className="text-gray-600">{t('zakatCalculator.common.status')}</span>
                          <span className={`font-semibold ${result.isWajib ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {result.isWajib ? t('zakatCalculator.common.statusRequired') : t('zakatCalculator.common.statusNotRequired')}
                          </span>
                        </div>
                        {result.isWajib && (
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-lg font-bold text-gray-900">{t('zakatCalculator.common.zakatToPay')}</span>
                            <span className="text-2xl font-bold text-primary-600">
                              {formatCurrency(result.zakatAmount)}
                            </span>
                          </div>
                        )}
                      </div>

                      {result.isWajib && (
                        <button
                          onClick={handlePayment}
                          disabled={!selectedPeriod}
                          className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {t('zakatCalculator.common.payNow')}
                        </button>
                      )}

                      {!result.isWajib && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                          {t('zakatCalculator.penghasilan.notRequiredHelper')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500">
                          {t('zakatCalculator.penghasilan.emptyHint')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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

      <ZakatConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        amount={result?.zakatAmount || 0}
        zakatName={displayName}
        zakatType="penghasilan"
        zakatTypeId={displayMeta?.id || zakatType?.id}
        zakatTypeSlug={displayMeta?.slug || zakatType?.slug}
        periodId={selectedPeriod}
      />
    </>
  );
}
