'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatRupiahCompact } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';

export interface FeaturedCampaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Pakai varian `large` (900 x 498): area gambar kartu berrasio 900:498 persis hasil crop media. */
  image: string;
  categoryName: string;
  currentAmount: number;
  targetAmount: number;
  donorCount: number;
  daysLeft?: number;
  isUrgent?: boolean;
}

export interface FeaturedCarouselProps {
  campaigns: FeaturedCampaign[];
  title: string;
  description: string;
  /** Tujuan tombol "Lihat Semua". */
  viewAllHref?: string;
}

// Kartu mendesak/unggulan sengaja gelap supaya langsung beda dari ProgramCard (terang).
function FeaturedCard({ campaign }: { campaign: FeaturedCampaign }) {
  const { t } = useI18n();
  const percentage = campaign.targetAmount > 0
    ? Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100)
    : 0;
  const isCompleted = percentage >= 100;
  const isNearGoal = !isCompleted && percentage >= 80;
  const hasDays = campaign.daysLeft !== undefined && campaign.daysLeft > 0;
  const timeIsUrgent = campaign.isUrgent || (hasDays && (campaign.daysLeft as number) <= 7);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-primary-900 text-white shadow-xl shadow-primary-900/20">
      <Link href={`/program/${campaign.slug}`} className="relative block aspect-[900/498] bg-primary-800">
        {campaign.image ? (
          <Image
            src={campaign.image}
            alt={campaign.title}
            fill
            className="object-cover"
            sizes="(max-width: 767px) 82vw, 340px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}

        <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {campaign.categoryName}
        </span>

        {isCompleted && (
          <span className="absolute right-3 top-3 rounded-full bg-success-500 px-3 py-1 text-xs font-semibold text-white">
            {t('home.featured.completed')}
          </span>
        )}

        {(hasDays || campaign.isUrgent) && !isCompleted && (
          <span
            className={cn(
              'absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white',
              timeIsUrgent ? 'bg-danger-500' : 'bg-black/55 backdrop-blur'
            )}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M8 4v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {hasDays ? t('home.featured.daysLeft', { days: campaign.daysLeft as number }) : t('home.featured.urgent')}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">
          <Link href={`/program/${campaign.slug}`} className="text-white transition-colors hover:text-primary-200">
            {campaign.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">{campaign.description}</p>

        <div className="mt-auto pt-5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="min-w-0 truncate">
              <span className="font-bold text-white">{formatRupiahCompact(campaign.currentAmount)}</span>
              <span className="text-white/50"> / {formatRupiahCompact(campaign.targetAmount)}</span>
            </p>
            <span className="flex-shrink-0 text-xs font-semibold text-white/50">{Math.round(percentage)}%</span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isNearGoal
                  ? 'bg-warning-500 shadow-[0_0_10px_rgba(210,170,85,0.8)]'
                  : 'bg-success-400 shadow-[0_0_10px_rgba(151,192,26,0.7)]'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-white/45">{t('home.featured.donors', { count: campaign.donorCount })}</p>

          <Link
            href={`/program/${campaign.slug}`}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-white/10 font-semibold text-white transition-colors hover:bg-primary-500"
          >
            {t('home.featured.help')}
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Section "Program Unggulan & Mendesak": kolom teks di kiri, carousel kartu gelap di kanan (panel latar
 * `primary-50` yang menempel ke tepi layar), titik penunjuk berbentuk pil + panah. Geser dengan scroll-snap.
 */
export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  campaigns,
  title,
  description,
  viewAllHref = '/program',
}) => {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Langkah satu kartu = lebar kartu pertama + jarak antar kartu
  const getStep = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    const second = first?.nextElementSibling as HTMLElement | null;
    if (!track || !first) return 0;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  }, []);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    const step = getStep();
    if (!track || step === 0) return;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    const index = atEnd ? campaigns.length - 1 : Math.round(track.scrollLeft / step);
    setActiveIndex(Math.max(0, Math.min(campaigns.length - 1, index)));
  }, [campaigns.length, getStep]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.max(0, Math.min(campaigns.length - 1, index));
    track.scrollTo({ left: target * getStep(), behavior: 'smooth' });
  };

  if (campaigns.length === 0) return null;

  return (
    <section className="featured-section relative overflow-hidden bg-light py-12 lg:py-20" aria-label={title}>
      {/* Panel latar kanan (desktop) */}
      <div className="pointer-events-none absolute bottom-10 left-[46%] right-0 top-10 hidden bg-primary-50 lg:block" aria-hidden="true" />

      <div className="container relative">
        <div className="lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center lg:gap-12">
          {/* Kolom teks */}
          <div className="mb-8 lg:mb-0">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-primary-600">
                <span className="h-px w-8 bg-primary-500" aria-hidden="true" />
                {t('home.featured.eyebrow')}
              </span>
            </div>

            <h2 className="text-3xl font-bold leading-tight text-dark lg:text-4xl">{title}</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">{description}</p>

            <Link
              href={viewAllHref}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-primary-500 px-6 font-semibold text-white transition-colors hover:bg-primary-600"
            >
              {t('home.featured.viewAll')}
            </Link>
          </div>

          {/* Carousel: menembus tepi layar (mobile dua sisi, desktop sisi kanan) */}
          <div className="featured-section__bleed min-w-0">
            <div
              ref={trackRef}
              onScroll={handleScroll}
              className="featured-section__track flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-4 px-4 pb-6 pt-1 sm:scroll-px-6 lg:scroll-px-0 lg:gap-6 lg:px-0 lg:pb-8"
            >
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="w-[82%] flex-none snap-start sm:w-[320px] lg:w-[340px]">
                  <FeaturedCard campaign={campaign} />
                </div>
              ))}
              <div className="w-1 flex-none lg:w-8" aria-hidden="true" />
            </div>

            {campaigns.length > 1 && (
              <div className="flex items-center justify-between gap-4 px-4 lg:px-0">
                <div className="flex items-center gap-2">
                  {campaigns.map((campaign, index) => (
                    <button
                      key={campaign.id}
                      type="button"
                      onClick={() => goTo(index)}
                      aria-label={t('home.featured.goTo', { number: index + 1 })}
                      aria-current={index === activeIndex ? 'true' : undefined}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        index === activeIndex ? 'w-8 bg-primary-500' : 'w-2 bg-primary-200 hover:bg-primary-300'
                      )}
                    />
                  ))}
                </div>

                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => goTo(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    aria-label={t('home.featured.prev')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-primary-700"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(activeIndex + 1)}
                    disabled={activeIndex >= campaigns.length - 1}
                    aria-label={t('home.featured.next')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm transition-colors hover:bg-primary-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-primary-700"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
