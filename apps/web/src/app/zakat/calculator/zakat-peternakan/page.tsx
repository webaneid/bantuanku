'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, Footer, ZakatCard, Breadcrumb } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchPublicSettings } from '@/services/settings';
import { fetchZakatConfig, fetchZakatPeriods, fetchZakatTypes, formatCurrency, getImageUrl, type ZakatPeriod, type ZakatType } from '@/services/zakat';
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


export default function ZakatPeternakanPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const displayMeta = useZakatDisplayMeta();
  const [config, setConfig] = useState<any>(null);
  const [zakatTypes, setZakatTypes] = useState<ZakatType[]>([]);
  const [zakatType, setZakatType] = useState<ZakatType | null>(null);
  const [organizationName, setOrganizationName] = useState('Bantuanku');
  const [organizationWhatsapp, setOrganizationWhatsapp] = useState('');
  const [periods, setPeriods] = useState<ZakatPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [displayImageSrc, setDisplayImageSrc] = useState<string | null>(null);

  // Form state
  const [jenisTernak, setJenisTernak] = useState('sapi');
  const [nilaiTernak, setNilaiTernak] = useState(0);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [configData, zakatTypesData, periodsData, settingsData] = await Promise.all([
        fetchZakatConfig(),
        fetchZakatTypes(),
        fetchZakatPeriods(displayMeta?.id || undefined),
        fetchPublicSettings(),
      ]);
      setConfig(configData);
      setPeriods(periodsData);
      setZakatTypes(zakatTypesData);
      setOrganizationName(settingsData.organization_name || settingsData.site_name || 'Bantuanku');
      setOrganizationWhatsapp(settingsData.organization_whatsapp || '');
      if (periodsData.length > 0) {
        setSelectedPeriod(periodsData[0].id);
      }

      // Find zakat peternakan type
      const peternakanType = zakatTypesData.find((t: ZakatType) =>
        t.slug === 'peternakan' ||
        t.slug === 'zakat-peternakan' ||
        t.name?.toLowerCase().includes('peternakan')
      );
      setZakatType(peternakanType || null);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (nilaiTernak <= 0 || !selectedPeriod) return;

    const goldPricePerGram = config?.goldPricePerGram || 0;
    const nishabGoldGrams = 85;
    const nishabEmas = nishabGoldGrams * goldPricePerGram;
    const zakatMalPercentage = 0.025;
    const zakatAmount = nilaiTernak >= nishabEmas ? nilaiTernak * zakatMalPercentage : 0;

    if (zakatAmount <= 0) return;

    setShowModal(true);
  };

  const goldPricePerGram = config?.goldPricePerGram || 0;
  const nishabGoldGrams = 85;
  const nishabEmas = nishabGoldGrams * goldPricePerGram;
  const zakatMalPercentage = 0.025;
  const zakatAmount = nilaiTernak >= nishabEmas ? nilaiTernak * zakatMalPercentage : 0;

  const displayName = displayMeta?.name || zakatType?.name || t('zakatCalculator.peternakan.defaultName');
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
      <Breadcrumb items={[{ label: t('zakatDetail.breadcrumb.home'), href: '/' }, { label: t('zakatDetail.breadcrumb.zakat'), href: '/zakat' }, { label: displayName }]} />
      <main className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Feature Image */}
            {displayImageSrc && (
              <div className="mb-8">
                <img
                  src={displayImageSrc}
                  alt={displayName}
                  className="w-full h-auto rounded-xl"
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
              <h2 className="text-xl font-semibold text-gray-900">{t('zakatCalculator.peternakan.calculatorTitle')}</h2>
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
                </div>

                {/* Jenis Ternak */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zakatCalculator.peternakan.animalTypeLabel')}
                  </label>
                  <select
                    value={jenisTernak}
                    onChange={(e) => setJenisTernak(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="sapi">{t('zakatCalculator.peternakan.animalTypes.cow')}</option>
                    <option value="kambing">{t('zakatCalculator.peternakan.animalTypes.goat')}</option>
                    <option value="unta">{t('zakatCalculator.peternakan.animalTypes.camel')}</option>
                  </select>
                </div>

                {/* Nilai Ternak */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zakatCalculator.peternakan.animalValueLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={nilaiTernak || ''}
                      onChange={(e) => setNilaiTernak(parseInt(e.target.value) || 0)}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder={t('zakatCalculator.common.zeroPlaceholder')}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('zakatCalculator.peternakan.animalValueHelper')}
                  </p>
                </div>

                {/* Nisab Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-900 mb-1">{t('zakatCalculator.peternakan.nisabTitle')}</p>
                  <p className="text-sm text-amber-700">
                    {t('zakatCalculator.peternakan.nisabAnimals')}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {t('zakatCalculator.peternakan.nisabGoldEquivalent', { amount: formatCurrency(nishabEmas) })}
                  </p>
                </div>

                {/* Hasil Perhitungan */}
                {nilaiTernak > 0 && (
                  <>
                    {zakatAmount > 0 ? (
                      <>
                        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                          <p className="text-sm font-bold text-emerald-900 mb-2">{t('zakatCalculator.peternakan.zakatAmountLabel')}</p>
                          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(zakatAmount)}</p>
                        </div>

                        {/* Bayar Button */}
                        <button
                          onClick={handlePayment}
                          disabled={!selectedPeriod}
                          className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {t('zakatCalculator.common.payZakatNow')}
                        </button>
                      </>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-orange-900">
                          {t('zakatCalculator.common.belowNisab', { amount: formatCurrency(nishabEmas) })}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          {t('zakatCalculator.peternakan.notRequiredHelper')}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                {t('zakatDetail.help.title')}
              </h3>
              <p className="text-sm text-blue-700">
                {t('zakatDetail.help.description')}
              </p>
              {organizationWhatsapp && (() => {
                const raw = organizationWhatsapp.replace(/[^0-9]/g, '');
                const waNumber = raw.startsWith('0') ? '62' + raw.slice(1) : raw;
                const waMessage = encodeURIComponent(`Saya butuh bantuan tentang ${displayName}`);
                return (
                  <a
                    href={`https://wa.me/${waNumber}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center text-sm text-blue-700 font-medium hover:text-blue-900"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {t('zakatDetail.help.whatsapp')}
                  </a>
                );
              })()}
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
        amount={zakatAmount}
        zakatName={displayName}
        zakatType="peternakan"
        zakatTypeId={displayMeta?.id || zakatType?.id}
        zakatTypeSlug={displayMeta?.slug || zakatType?.slug}
        periodId={selectedPeriod}
      />
    </>
  );
}
