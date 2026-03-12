'use client';

import Link from 'next/link';
import { Breadcrumb } from '@/components/organisms';
import ZakatOwnerInfo from './ZakatOwnerInfo';
import { useI18n } from '@/lib/i18n/provider';

interface ZakatPageHeaderProps {
  displayName: string;
  displayDescription?: string | null;
  displayImageSrc: string | null;
  displayImageOriginal: string | null;
  owner?: {
    type?: 'organization' | 'mitra';
    name?: string | null;
    logoUrl?: string | null;
    slug?: string | null;
  };
}

export default function ZakatPageHeader({
  displayName,
  displayDescription,
  displayImageSrc,
  displayImageOriginal,
  owner,
}: ZakatPageHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Breadcrumb - desktop only */}
      <div className="hidden lg:block">
        <Breadcrumb
          items={[
            { label: t('zakatDetail.breadcrumb.home'), href: '/' },
            { label: t('zakatDetail.breadcrumb.zakat'), href: '/zakat' },
            { label: displayName },
          ]}
        />
      </div>

      {/* Mobile: edge-to-edge image with back button */}
      {displayImageSrc && (
        <div className="lg:hidden relative">
          <Link
            href="/zakat"
            className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <img
            src={displayImageSrc}
            alt={displayName}
            className="w-full h-auto"
            onError={(event) => {
              if (!displayImageOriginal) return;
              if (event.currentTarget.src !== displayImageOriginal) {
                event.currentTarget.src = displayImageOriginal;
              }
            }}
          />
        </div>
      )}

      {/* Mobile: title + owner compact section */}
      <div className="lg:hidden bg-white px-4 py-4">
        <ZakatOwnerInfo owner={owner} />
        <h1 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h1>
        {displayDescription && (
          <div
            className="text-sm text-gray-600 leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: displayDescription }}
          />
        )}
      </div>
    </>
  );
}
