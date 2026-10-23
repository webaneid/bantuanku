'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';

export interface ProgramCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  categoryName: string;
  currentAmount: number;
  targetAmount: number;
  donorCount: number;
  daysLeft?: number;
  isUrgent?: boolean;
}

/**
 * Satu desain kartu program untuk seluruh situs (redesign-1).
 * Desktop/tablet: vertikal. Mobile: gambar kiri, teks kanan, tanpa deskripsi dan tombol.
 */
export const ProgramCard = React.forwardRef<HTMLDivElement, ProgramCardProps>(
  (
    {
      id,
      slug,
      title,
      description,
      image,
      categoryName,
      currentAmount,
      targetAmount,
      donorCount,
      daysLeft,
      isUrgent = false,
      className,
      ...props
    },
    ref
  ) => {
    const { t, locale } = useI18n();
    const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
    const isCompleted = percentage >= 100;
    const hasImage = image && !image.startsWith('data:');
    const localeTag = locale === 'en' ? 'en-US' : 'id-ID';

    return (
      <div
        ref={ref}
        className={cn('program-card', isUrgent && 'program-card--urgent', className)}
        {...props}
      >
        <Link href={`/program/${slug}`} className="program-card__link">
          <div className="program-card__image-wrapper">
            {hasImage ? (
              <Image
                src={image}
                alt={title}
                fill
                className="program-card__image"
                sizes="(max-width: 640px) 128px, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="program-card__image-placeholder" />
            )}
            <div className="program-card__badges">
              <span className="program-card__chip program-card__chip--category">{categoryName}</span>
              {isUrgent ? (
                <span className="program-card__chip program-card__chip--urgent">{t('home.programs.card.urgent')}</span>
              ) : isCompleted ? (
                <span className="program-card__chip program-card__chip--days">{t('home.programs.card.completed')}</span>
              ) : daysLeft !== undefined && daysLeft > 0 ? (
                <span className="program-card__chip program-card__chip--days">
                  {t('home.programs.card.daysLeft', { count: daysLeft })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="program-card__body">
            <div className="program-card__content">
              <h3 className="program-card__title">{title}</h3>
              <p className="program-card__description">{description}</p>
            </div>

            <div className="program-card__footer">
              <div className="program-card__row">
                <span className="program-card__muted program-card__collected-label">{t('home.programs.card.collected')}</span>
                <strong className="program-card__amount mono">Rp {formatRupiah(currentAmount)}</strong>
              </div>
              <div
                className="program-card__track"
                role="progressbar"
                aria-valuenow={currentAmount}
                aria-valuemin={0}
                aria-valuemax={targetAmount}
              >
                <div className="program-card__track-fill" style={{ width: `${percentage}%` }} />
              </div>
              <div className="program-card__row program-card__muted">
                <span className="program-card__target">
                  {t('home.programs.card.target', { value: formatRupiah(targetAmount) })}
                </span>
                <span>{t('home.programs.card.donors', { count: donorCount.toLocaleString(localeTag) })}</span>
              </div>
              <span className="program-card__donate">{t('home.programs.card.donateNow')}</span>
            </div>
          </div>
        </Link>
      </div>
    );
  }
);

ProgramCard.displayName = 'ProgramCard';
