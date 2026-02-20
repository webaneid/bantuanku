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


export default function ZakatPertanianPage() {
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
  const [copied, setCopied] = useState(false);
  const [infaqAmount, setInfaqAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedType, setSelectedType] = useState<'zakat' | 'infaq'>('zakat');
  const [displayImageSrc, setDisplayImageSrc] = useState<string | null>(null);

  // Form state
  const [pendapatan, setPendapatan] = useState(0);
  const [biayaProduksi, setBiayaProduksi] = useState(0);
  const [jenisPengairan, setJenisPengairan] = useState<'hujan' | 'irigasi'>('hujan');

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

      // Find zakat pertanian type
      const pertanianType = zakatTypesData.find((t: ZakatType) =>
        t.slug === 'pertanian' ||
        t.slug === 'zakat-pertanian' ||
        t.name?.toLowerCase().includes('pertanian')
      );
      setZakatType(pertanianType || null);
      if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(zakatPertanian.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayment = (amount: number, type: 'zakat' | 'infaq') => {
    if (amount <= 0) return;
    if (!selectedPeriod) return;
    setSelectedAmount(amount);
    setSelectedType(type);
    setShowModal(true);
  };

  const ricePricePerKg = config?.ricePricePerKg || 0;
  const nishabPertanian = 750 * ricePricePerKg;
  const hasilBersih = pendapatan - biayaProduksi;
  const persenZakat = jenisPengairan === 'hujan' ? 0.1 : 0.05;
  const zakatPertanian = hasilBersih >= nishabPertanian ? hasilBersih * persenZakat : 0;

  const displayName = displayMeta?.name || zakatType?.name || t('zakatCalculator.pertanian.defaultName');
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
              <h2 className="text-xl font-semibold text-gray-900">{t('zakatCalculator.pertanian.calculatorTitle')}</h2>
            </div>

            {/* Calculator Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-8">
              <div className="space-y-6">
                {/* Harga Beras */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zakatCalculator.pertanian.ricePriceLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="text"
                      value={formatCurrency(ricePricePerKg)}
                      readOnly
                      disabled
                      className="w-full pl-14 pr-16 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">/kg</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('zakatCalculator.pertanian.ricePriceHelper')}
                  </p>
                </div>

                {/* Nisab Info */}
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
                  <p className="text-sm text-emerald-900 italic mb-2">
                    {t('zakatCalculator.pertanian.nishabInfoText')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💚</span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        {t('zakatCalculator.pertanian.nishabFormula', {
                          price: formatCurrency(ricePricePerKg),
                          total: formatCurrency(nishabPertanian),
                        })}
                      </p>
                    </div>
                  </div>
                </div>

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
                </div>

                {/* Jenis Pengairan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zakatCalculator.pertanian.irrigationTypeLabel')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="jenisPengairan"
                        value="irigasi"
                        checked={jenisPengairan === 'irigasi'}
                        onChange={(e) => setJenisPengairan(e.target.value as 'irigasi')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-900">{t('zakatCalculator.pertanian.irrigationOptions.irrigation')}</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="jenisPengairan"
                        value="hujan"
                        checked={jenisPengairan === 'hujan'}
                        onChange={(e) => setJenisPengairan(e.target.value as 'hujan')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-gray-900">{t('zakatCalculator.pertanian.irrigationOptions.rain')}</span>
                    </label>
                  </div>
                </div>

                {/* Pendapatan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zakatCalculator.pertanian.harvestIncomeLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={pendapatan || ''}
                      onChange={(e) => setPendapatan(parseInt(e.target.value) || 0)}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder={t('zakatCalculator.common.zeroPlaceholder')}
                    />
                  </div>
                </div>

                {/* Biaya Produksi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zakatCalculator.pertanian.productionCostLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={biayaProduksi || ''}
                      onChange={(e) => setBiayaProduksi(parseInt(e.target.value) || 0)}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder={t('zakatCalculator.common.zeroPlaceholder')}
                    />
                  </div>
                </div>

                {/* Hasil Bersih */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-primary-900 mb-1">{t('zakatCalculator.pertanian.netHarvestLabel')}</p>
                  <p className="text-xl font-bold text-primary-700">{formatCurrency(hasilBersih)}</p>
                  {hasilBersih < nishabPertanian && (
                    <p className="text-xs text-orange-600 mt-2">
                      {t('zakatCalculator.common.belowNisab', { amount: formatCurrency(nishabPertanian) })}
                    </p>
                  )}
                </div>

                {/* Hasil Zakat */}
                {hasilBersih >= nishabPertanian && (
                  <>
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-emerald-900">
                          {t('zakatCalculator.pertanian.zakatAmountLabel', {
                            percent: jenisPengairan === 'hujan' ? '10' : '5',
                          })}
                        </p>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                        >
                          {copied ? t('zakatCalculator.common.copied') : t('zakatCalculator.common.copy')}
                        </button>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(zakatPertanian)}</p>
                    </div>

                    {/* Bayar Button */}
                    <button
                      onClick={() => handlePayment(zakatPertanian, 'zakat')}
                      disabled={!selectedPeriod}
                      className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      {t('zakatCalculator.common.payZakatNow')}
                    </button>
                  </>
                )}

                {/* Input Nominal Manual jika belum nisab */}
                {hasilBersih < nishabPertanian && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-orange-900 mb-3">
                      {t('zakatCalculator.common.infaqHelper')}
                    </p>
                    <div className="relative mb-3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={infaqAmount || ''}
                        onChange={(e) => setInfaqAmount(parseInt(e.target.value) || 0)}
                        className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder={t('zakatCalculator.common.amountInputPlaceholder')}
                      />
                    </div>
                    {infaqAmount > 0 && (
                      <button
                        onClick={() => handlePayment(infaqAmount, 'infaq')}
                        disabled={!selectedPeriod}
                        className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                      >
                        {t('zakatCalculator.common.payInfaq')}
                      </button>
                    )}
                  </div>
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
        amount={selectedAmount}
        zakatName={selectedType === 'zakat' ? displayName : t('zakatCalculator.common.infaqFor', { name: displayName })}
        zakatType="pertanian"
        zakatTypeId={displayMeta?.id || zakatType?.id}
        zakatTypeSlug={displayMeta?.slug || zakatType?.slug}
        periodId={selectedPeriod}
      />
    </>
  );
}
