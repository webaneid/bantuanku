'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { formatRupiahFull } from '@/lib/format';
import { useCart } from '@/contexts/CartContext';
import toast from '@/lib/feedback-toast';
import * as fbPixel from '@/lib/fbPixel';
import { useI18n } from '@/lib/i18n/provider';

// Ketiga tombol aksi memakai kelas dasar yang sama (tinggi, border 2px, radius, font) supaya ukurannya identik
const actionButtonBase =
  'w-full h-12 px-4 rounded-lg border-2 font-semibold transition-all flex items-center justify-center';
const primaryActionClass = 'border-primary-500 bg-primary-500 text-white hover:bg-primary-600 hover:border-primary-600';
const secondaryActionClass = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50';

interface DonationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  campaignTitle: string;
  programType: string;
  campaign: {
    id: string;
    slug: string;
    category?: string;
    pillar?: string;
    organizationName?: string;
  };
  fidyahData?: {
    personCount: number;
    dayCount: number;
  };
}

export default function DonationConfirmModal({
  isOpen,
  onClose,
  amount,
  campaignTitle,
  programType,
  campaign,
  fidyahData,
}: DonationConfirmModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { addToCart } = useCart();

  // Satu-satunya tempat item ditambahkan ke keranjang; ketiga aksi di bawah memakainya
  const addItem = () => {
    addToCart({
      cartItemId: `campaign-${campaign.id}`,
      itemType: 'campaign',
      campaignId: campaign.id,
      slug: campaign.slug,
      title: campaignTitle,
      amount,
      category: campaign.category,
      pillar: campaign.pillar,
      programType,
      organizationName: campaign.organizationName,
      fidyahData,
    });

    fbPixel.addToCart({
      content_name: campaignTitle,
      content_ids: [campaign.id],
      content_type: 'product',
      value: amount,
    });
  };

  // Donasi Sekarang: langsung ke checkout (tanpa singgah di keranjang)
  const handleDirectCheckout = () => {
    addItem();
    // InitiateCheckout fires on checkout page load (single trigger point)
    toast.success(t('campaignDetail.confirmModal.toasts.redirectCheckout'));
    router.push('/checkout');
  };

  // Tambah ke Keranjang & Lihat: tambah lalu buka keranjang
  const handleGoToCart = () => {
    addItem();
    toast.success(t('campaignDetail.confirmModal.toasts.addedToCart'));
    onClose();
    router.push('/keranjang-bantuan');
  };

  // Tambah ke Keranjang: tambah lalu ke daftar program untuk menambah program lain
  const handleAddAndBrowse = () => {
    addItem();
    toast.success(t('campaignDetail.confirmModal.toasts.addedToCart'));
    onClose();
    router.push('/program');
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
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {programType === 'wakaf'
                      ? t('campaignDetail.confirmModal.titleWakaf')
                      : t('campaignDetail.confirmModal.titleDonation')}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4">
                  <div className="bg-primary-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">
                      {programType === 'wakaf'
                        ? t('campaignDetail.confirmModal.amountLabelWakaf')
                        : t('campaignDetail.confirmModal.amountLabelDonation')}
                    </p>
                    <p className="text-2xl font-bold text-primary-600 mono">
                      {formatRupiahFull(amount)}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-1">{t('campaignDetail.confirmModal.programLabel')}</p>
                    <p className="font-semibold text-gray-900" style={{ fontSize: '15px' }}>
                      {campaignTitle}
                    </p>
                  </div>

                  <p className="text-gray-600 mb-6" style={{ fontSize: '15px' }}>
                    {t('campaignDetail.confirmModal.chooseAction')}
                  </p>

                  <div className="space-y-3">
                    {/* Direct Checkout */}
                    <button onClick={handleDirectCheckout} className={`${actionButtonBase} ${primaryActionClass}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {programType === 'wakaf'
                        ? t('campaignDetail.confirmModal.actions.wakafNow')
                        : t('campaignDetail.confirmModal.actions.donateNow')}
                    </button>

                    {/* Add to Cart and Go to Cart */}
                    <button onClick={handleGoToCart} className={`${actionButtonBase} ${secondaryActionClass}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('campaignDetail.confirmModal.actions.addToCartAndView')}
                    </button>

                    {/* Add to Cart, then browse other programs */}
                    <button onClick={handleAddAndBrowse} className={`${actionButtonBase} ${secondaryActionClass}`}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('campaignDetail.confirmModal.actions.addToCart')}
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
