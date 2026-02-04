'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms';
import { formatRupiahFull } from '@/lib/format';
import DonationAmountSelector from './DonationAmountSelector';
import DonationConfirmModal from './DonationConfirmModal';

interface CampaignSidebarProps {
  campaign: {
    id: string;
    slug: string;
    title: string;
    category?: string;
    pillar?: string;
    organizationName?: string;
    isVerified?: boolean;
    collected: number;
    goal: number;
    donorCount: number;
  };
  settings: any;
  programType: string;
  daysLeft: number | null;
  progressPercentage: number;
}

export default function CampaignSidebar({
  campaign,
  settings,
  programType,
  daysLeft,
  progressPercentage,
}: CampaignSidebarProps) {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fidyahData, setFidyahData] = useState<{ personCount: number; dayCount: number } | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const handleDonateClick = () => {
    if (selectedAmount <= 0) {
      alert('Silakan pilih nominal donasi terlebih dahulu');
      return;
    }
    setIsModalOpen(true);
  };

  const handleShare = (platform: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = campaign.title;

    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      threads: `https://threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      setIsShareOpen(false);
    }
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 space-y-6">
        {/* Category Badge */}
        {campaign.category && (
          <div className="inline-block">
            <span className="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {campaign.category}
            </span>
          </div>
        )}

        {/* Campaign Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          {campaign.title}
        </h1>

        {/* Organization */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900">
                {campaign.organizationName || settings.organization_name}
              </span>
              {campaign.isVerified && (
                <svg
                  className="w-4 h-4 text-primary-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              Rp{' '}
              {(campaign.collected || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {progressPercentage.toFixed(1)}% dari target Rp{' '}
                {(campaign.goal || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>{campaign.donorCount || 0} Donatur</span>
            </div>

            {daysLeft !== null && daysLeft > 0 && (
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{daysLeft} hari lagi</span>
              </div>
            )}
          </div>
        </div>

        {/* Donation Amount Selector */}
        <DonationAmountSelector
          programType={programType}
          pillar={campaign.pillar}
          onAmountSelect={setSelectedAmount}
          selectedAmount={selectedAmount}
          onFidyahDataChange={setFidyahData}
        />

        {/* CTA Button - desktop only, mobile pakai sticky bottom bar */}
        <div className="hidden lg:block">
          <Button
            onClick={handleDonateClick}
            className="w-full"
            size="lg"
          >
            {campaign.pillar?.toLowerCase() === 'fidyah'
              ? 'BAYAR FIDYAH SEKARANG'
              : programType === 'wakaf'
                ? 'WAKAF SEKARANG'
                : 'DONASI SEKARANG'}
          </Button>
        </div>

        {/* Report Link */}
        <div className="pt-3 border-t border-gray-200">
          <button className="text-sm text-gray-600 hover:text-gray-900">
            Program ini mencurigakan? <span className="underline">Laporkan</span>
          </button>
        </div>
      </div>

      {/* Donation Confirmation Modal */}
      <DonationConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={selectedAmount}
        campaignTitle={campaign.title}
        programType={programType}
        campaign={{
          id: campaign.id,
          slug: campaign.slug,
          category: campaign.category,
          pillar: campaign.pillar,
          organizationName: campaign.organizationName,
        }}
        fidyahData={fidyahData}
      />

      {/* Mobile Sticky Bottom Bar — portal ke document.body */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          <div className="flex justify-between font-bold mb-3">
            <span className="text-gray-900">Total</span>
            <span className="text-primary-600">{formatRupiahFull(selectedAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleDonateClick} size="lg" className="flex-1" disabled={selectedAmount <= 0}>
              {campaign.pillar?.toLowerCase() === 'fidyah'
                ? 'BAYAR FIDYAH'
                : programType === 'wakaf'
                  ? 'WAKAF SEKARANG'
                  : 'DONASI SEKARANG'}
            </Button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Share"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={handleFavoriteToggle}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Favorite"
            >
              <svg className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal */}
      {isShareOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[1040] flex items-end justify-center lg:items-center lg:p-4" onClick={() => setIsShareOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Bagikan</h3>
              <button onClick={() => setIsShareOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <button onClick={() => handleShare('whatsapp')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">WhatsApp</span>
              </button>
              <button onClick={() => handleShare('facebook')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">Facebook</span>
              </button>
              <button onClick={() => handleShare('twitter')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">Twitter</span>
              </button>
              <button onClick={() => handleShare('threads')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 1.623-.015 3.027-.239 4.176-.672.868-.327 1.652-.789 2.331-1.373 1.12-1.02 1.921-2.41 2.375-4.14.376-1.384.405-2.915.087-4.55-.267-1.37-.768-2.54-1.49-3.476-.625-.806-1.374-1.41-2.227-1.797.307.313.563.67.767 1.068.346.67.533 1.452.555 2.325.02.77-.113 1.493-.396 2.148a4.35 4.35 0 01-1.244 1.677c-.54.444-1.18.77-1.904.969-.678.185-1.42.278-2.206.277-1.125-.003-2.1-.197-2.9-.578a4.98 4.98 0 01-1.866-1.556c-.475-.66-.82-1.434-.996-2.24-.167-.761-.227-1.568-.178-2.4.057-1.006.277-1.913.656-2.695a5.655 5.655 0 011.644-2.043c.717-.554 1.577-.96 2.557-1.208.878-.223 1.845-.335 2.875-.335 1.04 0 2.012.112 2.893.335.98.248 1.84.654 2.557 1.208a5.655 5.655 0 011.644 2.043c.379.782.599 1.689.656 2.695.049.832-.011 1.639-.178 2.4-.176.806-.521 1.58-.996 2.24a4.98 4.98 0 01-1.866 1.556c-.8.381-1.775.575-2.9.578-.786 0-1.528-.092-2.206-.277a4.818 4.818 0 01-1.904-.969 4.35 4.35 0 01-1.244-1.677c-.283-.655-.416-1.378-.396-2.148.022-.873.209-1.655.555-2.325.204-.398.46-.755.767-1.068-.853.387-1.602.991-2.227 1.797-.722.936-1.223 2.106-1.49 3.476-.318 1.635-.289 3.166.087 4.55.454 1.73 1.255 3.12 2.375 4.14.679.584 1.463 1.046 2.331 1.373 1.149.433 2.553.657 4.176.672z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">Threads</span>
              </button>
              <button onClick={() => handleShare('linkedin')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">LinkedIn</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
