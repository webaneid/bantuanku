'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { formatRupiahFull } from '@/lib/format';
import { Button } from '@/components/atoms';
import { Header, Footer } from '@/components/organisms';

export default function KeranjangBantuanPage() {
  const router = useRouter();
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
        <main className="min-h-screen bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="section-title text-gray-900 mb-2">
                Keranjang Bantuan Kosong
              </h1>
              <p className="text-gray-600 mb-8" style={{ fontSize: '15px' }}>
                Anda belum menambahkan program bantuan ke keranjang. Yuk, mulai berbagi kebaikan!
              </p>
              <Link href="/program">
                <Button size="lg">Telusuri Program</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="section-title text-gray-900 mb-2">Keranjang Bantuan</h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              {items.length} Program dalam keranjang
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-100"
                >
                  {item.itemType === 'qurban' && item.qurbanData ? (
                    // Qurban Item Display
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Category Badge */}
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full mb-3">
                          Qurban {item.qurbanData.animalType === 'cow' ? 'Sapi' : 'Kambing'}
                        </span>

                        {/* Title */}
                        <h3 className="section-title text-gray-900 mb-2">
                          <Link
                            href={`/qurban/${item.slug}`}
                            className="hover:text-primary-600 transition-colors"
                          >
                            {item.title}
                          </Link>
                        </h3>

                        {/* Qurban Details */}
                        <div className="bg-amber-50 rounded-lg p-4 mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Periode:</span>
                            <span className="font-medium text-gray-900">{item.qurbanData.periodName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Jenis:</span>
                            <span className="font-medium text-gray-900">
                              {item.qurbanData.animalType === 'cow' ? 'Sapi' : 'Kambing'} - {item.qurbanData.packageType === 'individual' ? 'Individu' : 'Patungan'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Jumlah:</span>
                            <span className="font-medium text-gray-900">{item.qurbanData.quantity} ekor</span>
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Harga ({item.qurbanData.quantity}x)</span>
                            <span className="font-medium mono">{formatRupiahFull(item.qurbanData.price * item.qurbanData.quantity)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Biaya Admin ({item.qurbanData.quantity}x)</span>
                            <span className="font-medium mono">{formatRupiahFull(item.qurbanData.adminFee * item.qurbanData.quantity)}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="text-xl font-bold text-amber-600 mono">{formatRupiahFull(item.amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-2"
                        aria-label="Hapus dari keranjang"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : item.itemType === 'zakat' && item.zakatData ? (
                    // Zakat Item Display
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Category Badge */}
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full mb-3">
                          Zakat {item.zakatData.zakatType.charAt(0).toUpperCase() + item.zakatData.zakatType.slice(1)}
                        </span>

                        {/* Title */}
                        <h3 className="section-title text-gray-900 mb-2">
                          {item.title}
                        </h3>

                        {/* Zakat Details - Show quantity breakdown if available */}
                        {item.zakatData.quantity && item.zakatData.pricePerUnit ? (
                          <div className="bg-emerald-50 rounded-lg p-4 mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Jumlah:</span>
                              <span className="font-medium text-gray-900">{item.zakatData.quantity} {item.zakatData.zakatType === 'fitrah' ? 'jiwa' : 'unit'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Per {item.zakatData.zakatType === 'fitrah' ? 'jiwa' : 'unit'}:</span>
                              <span className="font-medium text-gray-900 mono">{formatRupiahFull(item.zakatData.pricePerUnit)}</span>
                            </div>
                            <div className="border-t border-emerald-200 pt-2 mt-2 flex justify-between">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="text-xl font-bold text-emerald-600 mono">{formatRupiahFull(item.amount)}</span>
                            </div>
                          </div>
                        ) : (
                          // No quantity - just show amount
                          <p className="text-xl font-bold text-emerald-600 mt-3 mono">
                            {formatRupiahFull(item.amount)}
                          </p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-2"
                        aria-label="Hapus dari keranjang"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    // Campaign Item Display
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Category Badge */}
                        {item.category && (
                          <span className="inline-block px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full mb-3">
                            {item.category}
                          </span>
                        )}

                        {/* Title */}
                        <h3 className="section-title text-gray-900 mb-2">
                          <Link
                            href={`/program/${item.slug}`}
                            className="hover:text-primary-600 transition-colors"
                          >
                            {item.title}
                          </Link>
                        </h3>

                        {/* Organization */}
                        {item.organizationName && (
                          <p className="text-sm text-gray-600 mb-4">
                            {item.organizationName}
                          </p>
                        )}

                        {/* Amount Input */}
                        <div className="flex items-center gap-3 mt-4">
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Nominal:
                          </label>
                          <input
                            type="text"
                            value={item.amount.toLocaleString('id-ID')}
                            onChange={(e) => {
                              const numericValue = e.target.value.replace(/[^0-9]/g, '');
                              const amount = parseInt(numericValue) || 0;
                              if (amount >= 0) {
                                updateCartItem(item.cartItemId, { amount });
                              }
                            }}
                            className="flex-1 max-w-xs px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                            style={{ fontSize: '15px' }}
                          />
                        </div>

                        {/* Formatted Amount Display */}
                        <p className="text-xl font-bold text-primary-600 mt-3 mono">
                          {formatRupiahFull(item.amount)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-2"
                        aria-label="Hapus dari keranjang"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:text-red-700 font-medium mt-4"
              >
                Kosongkan Keranjang
              </button>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-24">
                <h2 className="section-title text-gray-900 mb-6">
                  Ringkasan Bantuan
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
                        <span className="text-sm font-medium text-gray-900 mono whitespace-nowrap">
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
                    <span className="text-lg font-semibold text-gray-900">
                      Total Bantuan
                    </span>
                    <span className="text-2xl font-bold text-primary-600 mono">
                      {formatRupiahFull(getCartTotal())}
                    </span>
                  </div>
                </div>

                {/* Desktop Buttons */}
                <div className="hidden lg:block space-y-3">
                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                    disabled={getCartTotal() === 0}
                  >
                    Lanjutkan Pembayaran
                  </Button>
                  <Link href="/program">
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      Tambah Program Lain
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
                      Anda dapat mendonasikan ke berbagai program sekaligus dalam satu transaksi.
                      Donasi Anda akan disalurkan sesuai pilihan program.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleCheckout}
              size="lg"
              disabled={getCartTotal() === 0}
              className="w-full"
            >
              Lanjutkan Pembayaran
            </Button>
            <Link href="/program">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
              >
                Tambah Program Lain
              </Button>
            </Link>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
