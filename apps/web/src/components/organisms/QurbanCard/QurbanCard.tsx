'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { useCart } from '@/contexts/CartContext';
import toast from '@/lib/feedback-toast';
import * as fbPixel from '@/lib/fbPixel';
import './QurbanCard.css';

/** Data untuk "Keranjang" di kartu (jumlah 1). Dibuat induk lewat `mapQurbanPackageToCardProps` (lib/qurban-card). */
export interface QurbanCardCart {
  packagePeriodId: string;
  packageId: string;
  periodId: string;
  periodName: string;
  animalType: string;
  packageType: string;
  price: number;
  adminFee: number;
  discountAmount: number;
}

export interface QurbanCardProps {
  id: string;
  slug: string;
  name: string;
  category: 'sapi' | 'kambing' | 'domba';
  packageType: 'individual' | 'shared';
  ownerName?: string | null;
  price: number;
  image: string;
  badge?: string;
  activeDiscount?: {
    discountType: "percentage" | "nominal";
    discountValue: number;
    discountAmount: number;
  } | null;
  /** false = stok/slot habis: tombol Keranjang dinonaktifkan */
  available?: boolean;
  cart?: QurbanCardCart;
}

/**
 * Kartu paket qurban bergaya toko: foto besar, chip jenis/diskon, harga tebal (coret bila diskon),
 * dua aksi: Detail (buka halaman paket) dan Keranjang (tambah 1 paket, sama dengan modal konfirmasi di detail).
 */
export const QurbanCard: React.FC<QurbanCardProps> = ({
  slug,
  name,
  category,
  packageType,
  ownerName,
  price,
  image,
  badge,
  activeDiscount,
  available = true,
  cart,
}) => {
  const { t } = useI18n();
  const { addToCart } = useCart();

  const finalPrice = activeDiscount ? Math.max(price - activeDiscount.discountAmount, 0) : price;
  const discountLabel = activeDiscount
    ? activeDiscount.discountType === 'percentage'
      ? t('qurbanCard.discountPercent', { value: activeDiscount.discountValue })
      : t('qurbanCard.discountNominal', { value: formatRupiah(activeDiscount.discountAmount) })
    : null;
  const categoryLabel =
    category === 'sapi' ? t('qurbanPage.filters.cow') : category === 'domba' ? t('qurbanPage.filters.sheep') : t('qurbanPage.filters.goat');
  const packageTypeLabel = packageType === 'shared' ? t('qurbanPage.filters.shared') : t('qurbanPage.filters.individual');

  const handleAddToCart = () => {
    if (!cart || !available) return;
    const total = cart.price - cart.discountAmount + cart.adminFee;
    addToCart({
      cartItemId: `qurban-${cart.packagePeriodId}`,
      itemType: 'qurban',
      campaignId: cart.packagePeriodId,
      slug: cart.packagePeriodId,
      title: name,
      amount: total,
      category: cart.animalType === 'cow' ? t('qurbanPage.filters.cow') : t('qurbanPage.filters.goat'),
      programType: 'qurban',
      qurbanData: {
        packagePeriodId: cart.packagePeriodId,
        packageId: cart.packageId,
        periodId: cart.periodId,
        periodName: cart.periodName,
        quantity: 1,
        animalType: cart.animalType,
        packageType: cart.packageType,
        price: cart.price,
        adminFee: cart.adminFee,
        discountAmount: cart.discountAmount > 0 ? cart.discountAmount : undefined,
      },
    });
    fbPixel.addToCart({
      content_name: name,
      content_ids: [cart.packagePeriodId],
      content_type: 'product',
      value: total,
    });
    toast.success(t('qurbanCard.addedToCart'));
  };

  return (
    <article className={cn('qurban-card', !available && 'qurban-card--sold-out')}>
      <Link href={`/qurban/${slug}`} className="qurban-card__media" aria-label={name}>
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="qurban-card__image"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="qurban-card__image-placeholder" />
        )}
        <div className="qurban-card__chips">
          <span className={cn('qurban-card__chip', `qurban-card__chip--${category}`)}>{categoryLabel}</span>
          {badge && <span className="qurban-card__chip qurban-card__chip--badge">{badge}</span>}
        </div>
        {discountLabel && <span className="qurban-card__chip qurban-card__chip--discount">{discountLabel}</span>}
        {!available && <span className="qurban-card__sold-out">{t('qurbanCard.soldOut')}</span>}
      </Link>

      <div className="qurban-card__body">
        <div className="qurban-card__info">
          {ownerName && <p className="qurban-card__owner">{ownerName}</p>}
          <h3 className="qurban-card__name">
            <Link href={`/qurban/${slug}`}>{name}</Link>
          </h3>
        </div>

        <div className="qurban-card__buy">
          <span className={cn('qurban-card__type', packageType === 'shared' && 'qurban-card__type--shared')}>
            {packageTypeLabel}
          </span>
          <div className="qurban-card__price">
            {activeDiscount && <span className="qurban-card__price-strike mono">Rp {formatRupiah(price)}</span>}
            <span className="qurban-card__price-value mono">Rp {formatRupiah(finalPrice)}</span>
          </div>
        </div>

        <div className="qurban-card__actions">
          <Link href={`/qurban/${slug}`} className="qurban-card__btn qurban-card__btn--ghost order-2 sm:order-1">
            {t('qurbanCard.detail')}
          </Link>
          <button
            type="button"
            className="qurban-card__btn qurban-card__btn--primary order-1 sm:order-2"
            onClick={handleAddToCart}
            disabled={!available || !cart}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
            <span>{t('qurbanCard.addToCart')}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
