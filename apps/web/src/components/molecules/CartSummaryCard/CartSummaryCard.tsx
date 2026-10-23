'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';
import type { CartItem } from '@/contexts/CartContext';

export interface CartSummaryCardProps {
  items: CartItem[];
  total: number;
  title: string;
  subtitle: string;
  summaryTitle: string;
  totalLabel: string;
  infoText: string;
  formatAmount: (amount: number | null | undefined) => string;
  className?: string;
}

/**
 * Ringkasan keranjang/donasi untuk mobile: blok latar primary, radius besar, teks putih.
 * Dipakai di /keranjang-bantuan dan /checkout (desktop memakai sidebar sendiri, jadi biasanya `lg:hidden`).
 */
export function CartSummaryCard({
  items,
  total,
  title,
  subtitle,
  summaryTitle,
  totalLabel,
  infoText,
  formatAmount,
  className,
}: CartSummaryCardProps) {
  const { t } = useI18n();

  const typeLabel = (programType: string) =>
    programType === 'wakaf'
      ? t('checkout.main.programType.wakaf')
      : programType === 'zakat'
        ? t('checkout.main.programType.zakat')
        : programType === 'qurban'
          ? t('checkout.main.programType.qurban')
          : t('checkout.main.programType.donation');

  return (
    <section
      className={cn(
        'rounded-[24px] bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-sm px-5 py-5',
        className
      )}
      aria-label={summaryTitle}
    >
      <h1 className="text-xl font-bold leading-tight">{title}</h1>
      <p className="text-sm text-white/70 mt-1">{subtitle}</p>

      <div className="mt-5 pt-4 border-t border-white/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-3">{summaryTitle}</p>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.cartItemId}>
              <div className="flex justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white leading-snug line-clamp-2">{item.title}</p>
                  <span className="text-xs text-white/70">{typeLabel(item.programType)}</span>
                </div>
                <span className="text-sm font-semibold text-white whitespace-nowrap">{formatAmount(item.amount)}</span>
              </div>
              {item.itemType === 'zakat' && item.zakatData?.quantity && item.zakatData?.pricePerUnit && (
                <p className="text-xs text-white/70 mt-1">
                  {item.zakatData.quantity} x {formatAmount(item.zakatData.pricePerUnit)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/20">
        <p className="text-sm text-white/80">{totalLabel}</p>
        <p className="text-3xl font-bold tracking-tight mt-1">{formatAmount(total)}</p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-white/70">{infoText}</p>
    </section>
  );
}
