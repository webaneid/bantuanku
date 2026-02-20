'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import './ZakatCard.css';

export interface ZakatCardProps {
  id: string;
  slug: string;
  title: string;
  image: string;
  ownerName?: string | null;
  ownerType?: 'organization' | 'mitra';
  collected?: number;
  aspectRatio?: 'portrait' | 'landscape';
  className?: string;
}

export const ZakatCard: React.FC<ZakatCardProps> = ({
  slug,
  title,
  image,
  ownerName,
  collected,
  aspectRatio = 'portrait',
  className,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Link
      href={`/zakat/${slug}`}
      className={cn(
        'zakat-card',
        aspectRatio === 'landscape' ? 'zakat-card--landscape' : 'zakat-card--portrait',
        className
      )}
    >
      <div className="zakat-card__image-wrapper">
        {image ? (
          <img
            src={image}
            alt={title}
            className="zakat-card__image"
          />
        ) : (
          <div className="zakat-card__image-placeholder">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="zakat-card__overlay"></div>
      </div>

      <div className="zakat-card__content">
        {ownerName && (
          <div className="zakat-card__owner">
            <span className="zakat-card__owner-name">{ownerName}</span>
          </div>
        )}
        <h3 className="zakat-card__title">{title}</h3>
        {collected !== undefined ? (
          <div className="zakat-card__stats">
            <span className="zakat-card__label">Terkumpul</span>
            <span className="zakat-card__amount">{formatCurrency(collected)}</span>
          </div>
        ) : (
          <div className="zakat-card__cta">
            <span className="zakat-card__cta-text">Hitung & Bayar Zakat</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </Link>
  );
};
