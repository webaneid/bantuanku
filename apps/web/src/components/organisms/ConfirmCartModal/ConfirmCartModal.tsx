'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { useCart, type CartItem } from '@/contexts/CartContext';
import toast from '@/lib/feedback-toast';
import * as fbPixel from '@/lib/fbPixel';

// Ketiga tombol aksi memakai kelas dasar yang sama (tinggi, border 2px, radius, font) supaya ukurannya identik
const actionButtonBase =
  'w-full h-12 px-4 rounded-lg border-2 font-semibold transition-all flex items-center justify-center';
const primaryActionClass = 'border-primary-500 bg-primary-500 text-white hover:bg-primary-600 hover:border-primary-600';
const secondaryActionClass = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-light';

const heartIcon =
  'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
const cartIcon =
  'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z';

export interface ConfirmCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Ringkasan di atas pilihan aksi; susun dengan `ConfirmModalBlock` */
  children: React.ReactNode;
  chooseActionText: string;
  /** Item yang ditambahkan ke keranjang oleh ketiga aksi */
  item: CartItem;
  /** Tujuan tombol "Tambah ke Keranjang": halaman daftar untuk menambah item lain (mis. /program, /qurban) */
  browseHref: string;
  labels: { checkoutNow: string; addToCartAndView: string; addToCart: string };
  toasts: { redirectCheckout: string; addedToCart: string };
}

/** Blok ringkasan modal: `primary` untuk nominal/total, `neutral` untuk identitas item. */
export function ConfirmModalBlock({
  tone,
  className = '',
  children,
}: {
  tone: 'primary' | 'neutral';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${tone === 'primary' ? 'bg-primary-50' : 'bg-light'} rounded-lg p-4 ${className}`}>{children}</div>
  );
}

/**
 * Modal konfirmasi tambah-ke-keranjang SATU untuk campaign dan qurban: tiga tombol dan alur yang sama
 * (Sekarang → /checkout, Tambah & Lihat → /keranjang-bantuan, Tambah → `browseHref`).
 * `addItem()` adalah satu-satunya tempat `addToCart` + Meta Pixel `AddToCart`.
 */
export default function ConfirmCartModal({
  isOpen,
  onClose,
  title,
  children,
  chooseActionText,
  item,
  browseHref,
  labels,
  toasts,
}: ConfirmCartModalProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const addItem = () => {
    addToCart(item);
    fbPixel.addToCart({
      content_name: item.title,
      content_ids: [item.campaignId],
      content_type: 'product',
      value: item.amount,
    });
  };

  // Sekarang: langsung ke checkout (tanpa singgah di keranjang)
  const handleDirectCheckout = () => {
    addItem();
    // InitiateCheckout fires on checkout page load (single trigger point)
    toast.success(toasts.redirectCheckout);
    router.push('/checkout');
  };

  // Tambah ke Keranjang & Lihat: tambah lalu buka keranjang
  const handleGoToCart = () => {
    addItem();
    toast.success(toasts.addedToCart);
    onClose();
    router.push('/keranjang-bantuan');
  };

  // Tambah ke Keranjang: tambah lalu ke daftar untuk menambah item lain
  const handleAddAndBrowse = () => {
    addItem();
    toast.success(toasts.addedToCart);
    onClose();
    router.push(browseHref);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1050]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-dark">
                    {title}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4">
                  {children}

                  <p className="text-gray-600 mb-6" style={{ fontSize: '15px' }}>
                    {chooseActionText}
                  </p>

                  <div className="space-y-3">
                    <button onClick={handleDirectCheckout} className={`${actionButtonBase} ${primaryActionClass}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={heartIcon} />
                      </svg>
                      {labels.checkoutNow}
                    </button>

                    <button onClick={handleGoToCart} className={`${actionButtonBase} ${secondaryActionClass}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cartIcon} />
                      </svg>
                      {labels.addToCartAndView}
                    </button>

                    <button onClick={handleAddAndBrowse} className={`${actionButtonBase} ${secondaryActionClass}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cartIcon} />
                      </svg>
                      {labels.addToCart}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
