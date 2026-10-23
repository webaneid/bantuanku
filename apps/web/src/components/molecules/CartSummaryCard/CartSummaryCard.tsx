'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';
import type { CartItem } from '@/contexts/CartContext';

export interface CartEditHandlers {
  onAmountChange: (cartItemId: string, amount: number) => void;
  onRemove: (cartItemId: string) => void;
  onClear: () => void;
}

export interface CartSummaryCardProps {
  items: CartItem[];
  total: number;
  title: string;
  subtitle: string;
  summaryTitle: string;
  totalLabel: string;
  infoText: string;
  formatAmount: (amount: number | null | undefined) => string;
  /** Bila diisi, kartu menjadi keranjang itu sendiri: nominal bisa diedit, item bisa dihapus, keranjang bisa dikosongkan. */
  edit?: CartEditHandlers;
  className?: string;
}

/**
 * Blok keranjang/ringkasan untuk mobile: latar primary, radius besar, teks putih.
 * Tanpa `edit` = ringkasan baca-saja (/checkout); dengan `edit` = isi keranjang lengkap (/keranjang-bantuan).
 * Desktop memakai tampilan sendiri, jadi pemanggil biasanya memberi `lg:hidden`.
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
  edit,
  className,
}: CartSummaryCardProps) {
  const { t } = useI18n();

  const typeLabel = (item: CartItem) => {
    if (item.itemType === 'qurban' && item.qurbanData) {
      return `Qurban ${item.qurbanData.animalType === 'cow' ? 'Sapi' : 'Kambing'}`;
    }
    if (item.itemType === 'zakat' && item.zakatData) {
      return `Zakat ${item.zakatData.zakatType.charAt(0).toUpperCase() + item.zakatData.zakatType.slice(1)}`;
    }
    switch (item.programType) {
      case 'wakaf':
        return t('checkout.main.programType.wakaf');
      case 'zakat':
        return t('checkout.main.programType.zakat');
      case 'qurban':
        return t('checkout.main.programType.qurban');
      default:
        return item.category || t('checkout.main.programType.donation');
    }
  };

  const detailRow = (label: string, value: string) => (
    <div className="flex justify-between gap-3 text-xs text-white/75">
      <span>{label}</span>
      <span className="text-right text-white/90">{value}</span>
    </div>
  );

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

        <div className={cn(edit ? 'divide-y divide-white/15 -my-4' : 'space-y-3')}>
          {items.map((item) => {
            const isCampaignEditable = !!edit && item.itemType === 'campaign';

            return (
              <div key={item.cartItemId} className={cn(edit && 'py-4')}>
                <div className="flex justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white leading-snug line-clamp-2">{item.title}</p>
                    <span className="text-xs text-white/70">{typeLabel(item)}</span>
                  </div>

                  {edit ? (
                    <button
                      type="button"
                      onClick={() => edit.onRemove(item.cartItemId)}
                      className="text-white/60 hover:text-white transition-colors p-1 -mr-1 -mt-1 flex-shrink-0"
                      aria-label={t('keranjang.item.removeAriaLabel')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-white whitespace-nowrap">{formatAmount(item.amount)}</span>
                  )}
                </div>

                {/* Campaign (mode keranjang): nominal bisa diedit */}
                {isCampaignEditable && (
                  <div className="mt-3">
                    <label className="block text-xs text-white/70 mb-1" htmlFor={`cart-amount-${item.cartItemId}`}>
                      {t('keranjang.item.nominal').replace(/:$/, '')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 text-sm">Rp</span>
                      <input
                        id={`cart-amount-${item.cartItemId}`}
                        type="text"
                        inputMode="numeric"
                        value={item.amount.toLocaleString('id-ID')}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/[^0-9]/g, '');
                          edit!.onAmountChange(item.cartItemId, parseInt(numeric) || 0);
                        }}
                        className="w-full rounded-xl bg-white/10 border border-white/25 pl-11 pr-4 py-2.5 text-base font-semibold text-white focus:outline-none focus:border-white/70 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Rincian zakat */}
                {item.itemType === 'zakat' && item.zakatData?.quantity && item.zakatData?.pricePerUnit && (
                  <div className="mt-2 space-y-1">
                    {detailRow(
                      `${item.zakatData.quantity} ${item.zakatData.zakatType === 'fitrah' ? 'jiwa' : 'unit'}`,
                      `${item.zakatData.quantity} x ${formatAmount(item.zakatData.pricePerUnit)}`
                    )}
                  </div>
                )}

                {/* Rincian qurban (mode keranjang) */}
                {edit && item.itemType === 'qurban' && item.qurbanData && (
                  <div className="mt-2 space-y-1">
                    {detailRow(t('keranjang.item.periode').replace(/:$/, ''), item.qurbanData.periodName)}
                    {detailRow(
                      t('keranjang.item.jenis').replace(/:$/, ''),
                      `${item.qurbanData.animalType === 'cow' ? 'Sapi' : 'Kambing'} - ${item.qurbanData.packageType === 'individual' ? 'Individu' : 'Patungan'}`
                    )}
                    {detailRow(t('keranjang.item.jumlah').replace(/:$/, ''), `${item.qurbanData.quantity} ekor`)}
                    {detailRow(
                      t('keranjang.item.harga', { quantity: item.qurbanData.quantity }),
                      formatAmount(item.qurbanData.price * item.qurbanData.quantity)
                    )}
                    {detailRow(
                      t('keranjang.item.biayaAdmin', { quantity: item.qurbanData.quantity }),
                      formatAmount(item.qurbanData.adminFee * item.qurbanData.quantity)
                    )}
                  </div>
                )}

                {/* Subtotal item (mode keranjang, selain campaign yang nominalnya sudah di kolom) */}
                {edit && !isCampaignEditable && (
                  <p className="mt-2 text-right text-sm font-semibold text-white">{formatAmount(item.amount)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/20">
        <p className="text-sm text-white/80">{totalLabel}</p>
        <p className="text-3xl font-bold tracking-tight mt-1">{formatAmount(total)}</p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-white/70">{infoText}</p>

      {edit && (
        <button
          type="button"
          onClick={edit.onClear}
          className="mt-4 text-sm font-medium text-white/70 hover:text-white underline underline-offset-2 transition-colors"
        >
          {t('keranjang.clearCart')}
        </button>
      )}
    </section>
  );
}
