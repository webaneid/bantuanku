'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { formatRupiahFull } from '@/lib/format';
import { Button } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

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
  const router = useRouter();
  const { addToCart } = useCart();

  const handleAddToCart = () => {
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

    toast.success('Program berhasil ditambahkan ke keranjang!');
    onClose();
  };

  const handleGoToCart = () => {
    handleAddToCart();
    router.push('/keranjang-bantuan');
  };

  const handleDirectCheckout = () => {
    // Add to cart and redirect to checkout
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

    toast.success('Mengarahkan ke checkout...');
    router.push('/checkout');
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
                    Konfirmasi {programType === 'wakaf' ? 'Wakaf' : 'Donasi'}
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
                    <p className="text-sm text-gray-600 mb-1">Nominal {programType === 'wakaf' ? 'Wakaf' : 'Donasi'}</p>
                    <p className="text-2xl font-bold text-primary-600 mono">
                      {formatRupiahFull(amount)}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Program</p>
                    <p className="font-semibold text-gray-900" style={{ fontSize: '15px' }}>
                      {campaignTitle}
                    </p>
                  </div>

                  <p className="text-gray-600 mb-6" style={{ fontSize: '15px' }}>
                    Pilih salah satu opsi di bawah untuk melanjutkan:
                  </p>

                  <div className="space-y-3">
                    {/* Direct Checkout */}
                    <Button
                      onClick={handleDirectCheckout}
                      className="w-full"
                      size="lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {programType === 'wakaf' ? 'Wakaf' : 'Donasi'} Sekarang
                    </Button>

                    {/* Add to Cart and Go to Cart */}
                    <button
                      onClick={handleGoToCart}
                      className="w-full py-3 px-4 rounded-lg border-2 border-primary-500 bg-primary-50 text-primary-700 font-semibold hover:bg-primary-100 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Tambah ke Keranjang & Lihat
                    </button>

                    {/* Add to Cart and Continue Shopping */}
                    <button
                      onClick={handleAddToCart}
                      className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Tambah ke Keranjang
                    </button>

                    {/* Browse Other Programs */}
                    <button
                      onClick={() => {
                        onClose();
                        router.push('/program');
                      }}
                      className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Cari Program Lain
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
