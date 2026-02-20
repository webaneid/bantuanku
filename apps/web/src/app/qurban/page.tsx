'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/organisms';
import { QurbanCard } from '@/components/organisms/QurbanCard/QurbanCard';
import { fetchActivePeriods, fetchPackagesByPeriod, getQurbanImageUrlByVariant, type QurbanPackage, type QurbanPeriod } from '@/services/qurban';
import { fetchPublicSettings } from '@/services/settings';
import { useI18n } from '@/lib/i18n/provider';

function QurbanCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-gray-200"></div>
      <div className="p-4">
        <div className="h-5 w-20 bg-gray-200 rounded-full mb-3"></div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-4 hidden md:block"></div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="space-y-2">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-5 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

// Helper function to map qurban package to QurbanCard props
function mapQurbanPackageToCardProps(
  pkg: QurbanPackage,
  organizationName: string,
  popularBadgeLabel: string
) {
  const ownerName =
    pkg.ownerType === "mitra" && pkg.ownerName
      ? pkg.ownerName
      : organizationName;

  return {
    id: pkg.packagePeriodId, // Use packagePeriodId as unique identifier
    slug: pkg.packagePeriodId, // Use packagePeriodId for routing
    name: pkg.name,
    category: pkg.animalType === 'cow' ? ('sapi' as const) : ('kambing' as const),
    packageType: pkg.packageType, // Add packageType for filtering
    price: pkg.price,
    image: getQurbanImageUrlByVariant(pkg.imageUrl, ['medium', 'thumbnail', 'large']),
    badge: pkg.isFeatured ? popularBadgeLabel : undefined,
    ownerName,
  };
}

export default function QurbanPage() {
  const { t } = useI18n();
  const [periods, setPeriods] = useState<QurbanPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [qurbanPackages, setQurbanPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [animalFilter, setAnimalFilter] = useState<'all' | 'sapi' | 'kambing'>('all');

  // Page settings state
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [infoTitle, setInfoTitle] = useState("");
  const [infoItems, setInfoItems] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'shared'>('all');
  const [organizationName, setOrganizationName] = useState("");

  const defaultInfoItems = [
    t('qurbanPage.defaults.infoItems.item1'),
    t('qurbanPage.defaults.infoItems.item2'),
    t('qurbanPage.defaults.infoItems.item3'),
    t('qurbanPage.defaults.infoItems.item4'),
  ];

  // Fetch periods on mount
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const periodsResponse = await fetchActivePeriods();
        const fetchedPeriods: QurbanPeriod[] = periodsResponse.data || [];
        const sortedPeriods = [...fetchedPeriods].sort((a, b) => {
          if (a.gregorianYear !== b.gregorianYear) {
            return a.gregorianYear - b.gregorianYear;
          }
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
        setPeriods(sortedPeriods);

        // Set default to first (oldest year) period
        if (sortedPeriods.length > 0) {
          setSelectedPeriodId(sortedPeriods[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch periods:', error);
      }
    };

    loadPeriods();
  }, []);

  // Fetch page settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchPublicSettings();
        setOrganizationName(
          settings.organization_name ||
            settings.site_name ||
            t('qurbanPage.defaults.organizationName')
        );

        if (settings.frontend_qurban_page) {
          const qurbanPage = JSON.parse(settings.frontend_qurban_page);
          if (qurbanPage.title) setPageTitle(qurbanPage.title);
          if (qurbanPage.description) setPageDescription(qurbanPage.description);
          if (qurbanPage.infoTitle) setInfoTitle(qurbanPage.infoTitle);
          if (qurbanPage.infoItems && Array.isArray(qurbanPage.infoItems)) {
            setInfoItems(qurbanPage.infoItems.map((item: any) => item.text));
          }
        }
      } catch (error) {
        console.error('Failed to fetch qurban page settings:', error);
      }
    };

    loadSettings();
  }, [t]);

  // Fetch packages when period changes
  useEffect(() => {
    if (!selectedPeriodId) return;

    const loadPackages = async () => {
      setIsLoading(true);
      try {
        const packagesResponse = await fetchPackagesByPeriod(selectedPeriodId);
        const packages: QurbanPackage[] = packagesResponse.data || [];
        const mappedPackages = packages.map((pkg) =>
          mapQurbanPackageToCardProps(
            pkg,
            organizationName || t('qurbanPage.defaults.organizationName'),
            t('qurbanPage.badges.popular')
          )
        );
        setQurbanPackages(mappedPackages);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
        setQurbanPackages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPackages();
  }, [selectedPeriodId, organizationName, t]);

  // Filter packages based on selected filters
  const filteredPackages = qurbanPackages.filter((pkg) => {
    // Animal filter (sapi/kambing)
    if (animalFilter !== 'all' && pkg.category !== animalFilter) return false;

    // Type filter (individual/shared)
    if (typeFilter !== 'all' && pkg.packageType !== typeFilter) return false;

    return true;
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <section className="py-12 bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="section-title text-gray-900 mb-4">
                {pageTitle || t('qurbanPage.defaults.title')}
              </h1>
              <p className="section-description text-gray-600">
                {pageDescription || t('qurbanPage.defaults.description')}
              </p>
              <div className="mt-5">
                <Link
                  href="/qurban/laporan"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
                >
                  Lihat Laporan Qurban Publik
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 md:py-12">

          {/* Period Selector */}
          {periods.length > 1 && (
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('qurbanPage.filters.selectPeriod')}
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full md:w-64 px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-medium focus:border-primary-500 focus:outline-none transition-colors"
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({period.hijriYear}H / {period.gregorianYear}M)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filters */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
              onClick={() => {
                setAnimalFilter('all');
                setTypeFilter('all');
              }}
              className={`px-6 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${
                animalFilter === 'all' && typeFilter === 'all'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('qurbanPage.filters.allPackages')}
            </button>
            <button
              onClick={() => {
                setAnimalFilter('sapi');
                setTypeFilter('all');
              }}
              className={`px-6 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${
                animalFilter === 'sapi'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('qurbanPage.filters.cow')}
            </button>
            <button
              onClick={() => {
                setAnimalFilter('kambing');
                setTypeFilter('all');
              }}
              className={`px-6 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${
                animalFilter === 'kambing'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('qurbanPage.filters.goat')}
            </button>
            <button
              onClick={() => {
                setAnimalFilter('all');
                setTypeFilter('individual');
              }}
              className={`px-6 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${
                typeFilter === 'individual'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('qurbanPage.filters.individual')}
            </button>
            <button
              onClick={() => {
                setAnimalFilter('all');
                setTypeFilter('shared');
              }}
              className={`px-6 py-3 rounded-lg border-2 font-semibold text-sm transition-colors ${
                typeFilter === 'shared'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('qurbanPage.filters.shared')}
            </button>
          </div>

          {/* Qurban Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <QurbanCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('qurbanPage.empty.title')}
              </h3>
              <p className="text-gray-600">
                {t('qurbanPage.empty.description')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredPackages.map((pkg) => {
                // Exclude packageType from props as QurbanCard doesn't need it
                const { packageType, ...cardProps } = pkg;
                return <QurbanCard key={pkg.id} {...cardProps} />;
              })}
            </div>
          )}

          {/* Info Box */}
          {filteredPackages.length > 0 && (
            <div className="mt-12 bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg className="hidden md:block w-5 h-5 text-amber-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="section-title text-amber-900 mb-3">
                    {infoTitle || t('qurbanPage.defaults.infoTitle')}
                  </h4>
                  <ul className="!space-y-0 md:!space-y-2 !mb-0 !ml-0">
                    {(infoItems.length > 0 ? infoItems : defaultInfoItems).map((item, index) => (
                      <li key={index} className="section-description text-amber-800">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
