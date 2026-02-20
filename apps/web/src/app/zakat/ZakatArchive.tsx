'use client';

import { useEffect, useMemo, useState } from 'react';
import { ZakatCard } from '@/components/organisms';
import { getImageUrl, type ZakatType } from '@/services/zakat';
import { useI18n } from '@/lib/i18n/provider';

type FilterKey =
  | 'all'
  | 'fitrah'
  | 'maal'
  | 'profesi'
  | 'pertanian'
  | 'peternakan'
  | 'bisnis'
  | 'lainnya';

const filterOrder: FilterKey[] = ['fitrah', 'maal', 'profesi', 'pertanian', 'peternakan', 'bisnis', 'lainnya'];

function resolveFilterKey(zakat: ZakatType): FilterKey {
  const value = String(zakat.calculatorType || zakat.slug || '').toLowerCase();

  if (value.includes('fitrah')) return 'fitrah';
  if (value.includes('maal') || value === 'maal') return 'maal';
  if (value.includes('profesi') || value.includes('penghasilan')) return 'profesi';
  if (value.includes('pertanian')) return 'pertanian';
  if (value.includes('peternakan')) return 'peternakan';
  if (value.includes('bisnis')) return 'bisnis';
  return 'lainnya';
}

interface ZakatArchiveProps {
  zakatTypes: ZakatType[];
  organizationName: string;
}

export default function ZakatArchive({ zakatTypes, organizationName }: ZakatArchiveProps) {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const preparedData = useMemo(() => {
    return zakatTypes.map((item) => ({
      ...item,
      filterKey: resolveFilterKey(item),
      ownerName: item.ownerType === 'mitra' ? (item.ownerName || organizationName) : organizationName,
      ownerType: item.ownerType === 'mitra' ? 'mitra' : 'organization',
    }));
  }, [zakatTypes, organizationName]);

  const visibleItems = useMemo(() => {
    if (activeFilter === 'all') return preparedData;
    return preparedData.filter((item) => item.filterKey === activeFilter);
  }, [preparedData, activeFilter]);

  const filterOptions = useMemo(() => {
    const available = new Set<FilterKey>(preparedData.map((item) => item.filterKey));
    const dynamicFilters = filterOrder
      .filter((key) => available.has(key))
      .map((key) => ({ key, label: t(`zakatPage.archive.filters.${key}`) }));

    return [{ key: 'all' as const, label: t('zakatPage.archive.filters.all') }, ...dynamicFilters];
  }, [preparedData, t]);

  useEffect(() => {
    if (!filterOptions.some((option) => option.key === activeFilter)) {
      setActiveFilter('all');
    }
  }, [activeFilter, filterOptions]);

  return (
    <>
      <div className="mb-6 md:mb-8">
        <p className="text-sm text-gray-600 mb-3">{t('zakatPage.archive.filterLabel')}</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveFilter(option.key)}
              className={
                activeFilter === option.key
                  ? 'px-4 py-2 rounded-full text-sm font-medium bg-primary-600 text-white whitespace-nowrap'
                  : 'px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:border-primary-300 whitespace-nowrap'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleItems.map((zakat) => (
            <ZakatCard
              key={zakat.id}
              id={zakat.id}
              slug={zakat.slug}
              title={zakat.name}
              image={getImageUrl(zakat.imageUrl, '/images/placeholder-zakat.jpg')}
              ownerName={zakat.ownerName}
              ownerType={zakat.ownerType as 'organization' | 'mitra'}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
          {t('zakatPage.archive.emptyFiltered')}
        </div>
      )}
    </>
  );
}
