'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { formatRupiahFull } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from '@/components/atoms';
import { Header } from '@/components/organisms/Header';
import { Footer } from '@/components/organisms/Footer';
import { CartSummaryCard } from '@/components/molecules/CartSummaryCard';

export default function KeranjangBantuanPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { items, removeFromCart, updateCartItem, getCartTotal, clearCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-light py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="section-title text-dark mb-2">
                {t('keranjang.empty.title')}
              </h1>
              <p className="text-gray-600 mb-8" style={{ fontSize: '15px' }}>
                {t('keranjang.empty.description')}
              </p>
              <Link href="/program">
                <Button size="lg">{t('keranjang.empty.browseCta')}</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Kartu item (desktop)
  const itemCardClass = 'bg-white rounded-lg shadow-sm p-6 border border-gray-100';

  const removeButton = (cartItemId: string) => (
    <button
      onClick={() => removeFromCart(cartItemId)}
      className="text-gray-400 hover:text-danger-600 transition-colors p-1 -mr-1 flex-shrink-0"
      aria-label={t('keranjang.item.removeAriaLabel')}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-light py-4 md:py-8">
        <div className="container mx-auto px-[15px] md:px-4">
          {/* Page Title — desktop; di mobile judul ada di blok ringkasan */}
          <div className="hidden lg:block mb-8">
            <h1 className="section-title text-dark mb-2">{t('keranjang.title')}</h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              {t('keranjang.itemCount', { count: items.length })}
            </p>
          </div>

          {/* Mobile: ringkasan di atas, latar primary, teks putih (sama dengan checkout) */}
          <CartSummaryCard
            className="lg:hidden"
            items={items}
            total={getCartTotal()}
            title={t('keranjang.title')}
            subtitle={t('keranjang.itemCount', { count: items.length })}
            summaryTitle={t('keranjang.summary.title')}
            totalLabel={t('keranjang.summary.totalLabel')}
            infoText={t('keranjang.summary.infoText')}
            formatAmount={formatRupiahFull}
            edit={{
              onAmountChange: (cartItemId, amount) => updateCartItem(cartItemId, { amount }),
              onRemove: removeFromCart,
              onClear: clearCart,
            }}
          />

          {/* Desktop saja: di mobile seluruh keranjang ada di blok primary di atas, jadi grid tidak dirender */}
          <div className="hidden lg:grid grid-cols-3 gap-8">
            {/* Cart Items — desktop saja (di mobile seluruh isi keranjang ada di blok primary di atas) */}
            <div className="hidden lg:block lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.cartItemId} className={itemCardClass}>
                  {item.itemType === 'qurban' && item.qurbanData ? (
                    // Qurban Item Display
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-warning-100 text-warning-700 rounded-full">
                          Qurban {item.qurbanData.animalType === 'cow' ? 'Sapi' : 'Kambing'}
                        </span>
                        {removeButton(item.cartItemId)}
                      </div>
                      <div className="min-w-0">

                        <h3 className="text-base md:text-lg font-semibold text-dark mb-2">
                          <Link href={`/qurban/${item.slug}`} className="hover:text-primary-600 transition-colors">
                            {item.title}
                          </Link>
                        </h3>

                        <div className="bg-warning-50 rounded-lg p-3 mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">{t('keranjang.item.periode')}</span>
                            <span className="font-medium text-dark text-right">{item.qurbanData.periodName}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">{t('keranjang.item.jenis')}</span>
                            <span className="font-medium text-dark text-right">
                              {item.qurbanData.animalType === 'cow' ? 'Sapi' : 'Kambing'} - {item.qurbanData.packageType === 'individual' ? 'Individu' : 'Patungan'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">{t('keranjang.item.jumlah')}</span>
                            <span className="font-medium text-dark">{item.qurbanData.quantity} ekor</span>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">{t('keranjang.item.harga', { quantity: item.qurbanData.quantity })}</span>
                            <span className="font-medium mono">{formatRupiahFull(item.qurbanData.price * item.qurbanData.quantity)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-600">{t('keranjang.item.biayaAdmin', { quantity: item.qurbanData.quantity })}</span>
                            <span className="font-medium mono">{formatRupiahFull(item.qurbanData.adminFee * item.qurbanData.quantity)}</span>
                          </div>
                          <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center gap-3">
                            <span className="font-semibold text-dark">{t('keranjang.item.total')}</span>
                            <span className="text-lg font-bold text-warning-600 mono">{formatRupiahFull(item.amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : item.itemType === 'zakat' && item.zakatData ? (
                    // Zakat Item Display
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                          Zakat {item.zakatData.zakatType.charAt(0).toUpperCase() + item.zakatData.zakatType.slice(1)}
                        </span>
                        {removeButton(item.cartItemId)}
                      </div>
                      <div className="min-w-0">

                        <h3 className="text-base md:text-lg font-semibold text-dark mb-2">{item.title}</h3>

                        {item.zakatData.quantity && item.zakatData.pricePerUnit ? (
                          <div className="bg-primary-50 rounded-lg p-3 mt-3 space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-600">Jumlah:</span>
                              <span className="font-medium text-dark">{item.zakatData.quantity} {item.zakatData.zakatType === 'fitrah' ? 'jiwa' : 'unit'}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-600">Per {item.zakatData.zakatType === 'fitrah' ? 'jiwa' : 'unit'}:</span>
                              <span className="font-medium text-dark mono">{formatRupiahFull(item.zakatData.pricePerUnit)}</span>
                            </div>
                            <div className="border-t border-primary-200 pt-2 mt-2 flex justify-between items-center gap-3">
                              <span className="font-semibold text-dark">{t('keranjang.item.total')}</span>
                              <span className="text-lg font-bold text-primary-600 mono">{formatRupiahFull(item.amount)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-primary-600 mt-2 mono">{formatRupiahFull(item.amount)}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Campaign Item Display
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        {item.category ? (
                          <span className="inline-block px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                            {item.category}
                          </span>
                        ) : (
                          <span />
                        )}
                        {removeButton(item.cartItemId)}
                      </div>
                      <div className="min-w-0">

                        <h3 className="text-base md:text-lg font-semibold text-dark mb-1">
                          <Link href={`/program/${item.slug}`} className="hover:text-primary-600 transition-colors">
                            {item.title}
                          </Link>
                        </h3>

                        {item.organizationName && (
                          <p className="text-sm text-gray-600">{item.organizationName}</p>
                        )}

                        <div className="flex items-center gap-3 mt-4">
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            {t('keranjang.item.nominal')}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.amount.toLocaleString('id-ID')}
                            onChange={(e) => {
                              const numericValue = e.target.value.replace(/[^0-9]/g, '');
                              const amount = parseInt(numericValue) || 0;
                              if (amount >= 0) {
                                updateCartItem(item.cartItemId, { amount });
                              }
                            }}
                            className="flex-1 min-w-0 md:max-w-xs px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                            style={{ fontSize: '15px' }}
                          />
                        </div>

                        <p className="text-lg font-bold text-primary-600 mt-3 mono">{formatRupiahFull(item.amount)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={clearCart}
                className="text-sm text-danger-600 hover:text-danger-700 font-medium mt-4"
              >
                {t('keranjang.clearCart')}
              </button>
            </div>

            {/* Summary Sidebar — desktop saja (mobile memakai blok primary di atas) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-24">
                <h2 className="section-title text-dark mb-6">
                  {t('keranjang.summary.title')}
                </h2>

                {/* Items List */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  {items.map((item) => (
                    <div key={item.cartItemId}>
                      <div className="flex justify-between gap-3">
                        <span className="text-sm text-gray-600 flex-1">
                          {item.programType === 'wakaf' ? 'Wakaf' : item.programType === 'zakat' ? 'Zakat' : item.programType === 'qurban' ? 'Qurban' : 'Donasi'} -{' '}
                          {item.title.length > 25
                            ? item.title.substring(0, 25) + '...'
                            : item.title}
                        </span>
                        <span className="text-sm font-medium text-dark mono whitespace-nowrap">
                          {formatRupiahFull(item.amount)}
                        </span>
                      </div>
                      {/* Show quantity breakdown for zakat fitrah */}
                      {item.itemType === 'zakat' && item.zakatData?.quantity && item.zakatData?.pricePerUnit && (
                        <div className="text-xs text-gray-500 mt-1 ml-1">
                          {item.zakatData.quantity} x {formatRupiahFull(item.zakatData.pricePerUnit)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-dark">
                      {t('keranjang.summary.totalLabel')}
                    </span>
                    <span className="text-2xl font-bold text-primary-600 mono">
                      {formatRupiahFull(getCartTotal())}
                    </span>
                  </div>
                </div>

                {/* Desktop Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                    disabled={getCartTotal() === 0}
                  >
                    {t('keranjang.summary.checkout')}
                  </Button>
                  <Link href="/program">
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      {t('keranjang.summary.addMore')}
                    </Button>
                  </Link>
                </div>

                {/* Info */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-gray-600" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      {t('keranjang.summary.infoText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar: tombol utama, di bawahnya tautan teks (tanpa border) */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] px-[15px] pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <Button
            onClick={handleCheckout}
            size="lg"
            disabled={getCartTotal() === 0}
            className="w-full"
          >
            {t('keranjang.summary.checkout')}
          </Button>
          <Link
            href="/program"
            className="block w-full py-3 text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('keranjang.summary.addMore')}
          </Link>
        </div>,
        document.body
      )}

      <Footer />

      {/* Spacer bar bawah mobile — elemen PALING TERAKHIR (docs/arsitektur-mobile-single-shell.md) */}
      <div className="h-28 lg:hidden" aria-hidden="true" />
    </>
  );
}
