'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import './QurbanCard.css';

export interface QurbanCardProps {
  id: string;
  slug: string;
  name: string;
  category: 'sapi' | 'kambing';
  price: number;
  image: string;
  description?: string;
  badge?: string;
  onAddToCart?: () => void;
}

export const QurbanCard: React.FC<QurbanCardProps> = ({
  id,
  slug,
  name,
  category,
  price,
  image,
  description,
  badge,
  onAddToCart,
}) => {
  return (
    <div className="qurban-card">
      <Link href={`/qurban/${slug}`} className="qurban-card__link">
        {/* Image */}
        <div className="qurban-card__image-wrapper">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="qurban-card__image"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="qurban-card__image-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          )}

          {/* Badge */}
          {badge && (
            <div className="qurban-card__badge">
              {badge}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="qurban-card__content">
          {/* Category */}
          <div className={cn(
            "qurban-card__category",
            category === 'sapi' && "qurban-card__category--sapi",
            category === 'kambing' && "qurban-card__category--kambing"
          )}>
            {category === 'sapi' ? 'Sapi' : 'Kambing'}
          </div>

          {/* Name */}
          <h3 className="qurban-card__name">{name}</h3>

          {/* Description */}
          {description && (
            <p className="qurban-card__description">{description}</p>
          )}

          {/* Price & Add to Cart */}
          <div className="qurban-card__footer">
            <div className="qurban-card__price">
              <span className="qurban-card__price-label">Harga</span>
              <span className="qurban-card__price-value mono">
                Rp {formatRupiah(price)}
              </span>
            </div>

            <button
              className="qurban-card__add-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart?.();
              }}
              aria-label="Tambah ke keranjang"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 5v10M5 10h10" />
              </svg>
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};
