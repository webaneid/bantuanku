'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { formatRupiahFull } from '@/lib/format';
import { Button } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import toast from 'react-hot-toast';

interface QurbanConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  qurbanPackage: {
    packagePeriodId: string; // Unique ID for package-period combination
    id: string; // Package master ID (legacy)
    name: string;
    animalType: string;
    packageType: string;
    price: number;
    maxSlots?: number | null;
  };
  orderData: {
    periodId: string;
    periodName: string;
    quantity: number;
  };
  total: number;
  adminFee: number;
}

export default function QurbanConfirmModal({
  isOpen,
  onClose,
  qurbanPackage,
  orderData,
  total,
  adminFee,
}: QurbanConfirmModalProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const animalTypeLabel = qurbanPackage.animalType === 'cow' ? 'Sapi' : 'Kambing';
  const packageTypeLabel = qurbanPackage.packageType === 'individual' ? 'Individu' : 'Patungan';
  const subtotal = qurbanPackage.price * orderData.quantity;

  const handleAddToCart = () => {
    addToCart({
      cartItemId: `qurban-${qurbanPackage.packagePeriodId}`,
      itemType: 'qurban',
      campaignId: qurbanPackage.packagePeriodId,
      slug: qurbanPackage.packagePeriodId,
      title: qurbanPackage.name,
      amount: total,
      category: animalTypeLabel,
      programType: 'qurban',
      qurbanData: {
        packagePeriodId: qurbanPackage.packagePeriodId, // Primary identifier
        packageId: qurbanPackage.id, // Legacy field for compatibility
        periodId: orderData.periodId,
        periodName: orderData.periodName,
        quantity: orderData.quantity,
        animalType: qurbanPackage.animalType,
        packageType: qurbanPackage.packageType,
        price: qurbanPackage.price,
        adminFee: adminFee,
      },
    });

    toast.success('Paket qurban berhasil ditambahkan ke keranjang!');
    onClose();
  };

  const handleGoToCart = () => {
    handleAddToCart();
    router.push('/keranjang-bantuan');
  };

  const handleDirectCheckout = () => {
    handleAddToCart();
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
                    Konfirmasi Order Qurban
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
                  {/* Package Info */}
                  <div className="bg-amber-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Paket Qurban</p>
                    <p className="font-semibold text-gray-900">{qurbanPackage.name}</p>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Periode:</span>
                        <span className="font-medium text-gray-900">{orderData.periodName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Jenis:</span>
                        <span className="font-medium text-gray-900">{animalTypeLabel} - {packageTypeLabel}</span>
                      </div>
                      {qurbanPackage.packageType === 'individual' && (
                        <div className="flex justify-between">
                          <span>Jumlah:</span>
                          <span className="font-medium text-gray-900">{orderData.quantity} ekor</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="bg-primary-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-2">Rincian Pembayaran</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium mono">Rp {formatRupiahFull(subtotal)}</span>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Biaya Admin</span>
                          <span className="font-medium mono">Rp {formatRupiahFull(adminFee)}</span>
                        </div>
                        {qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots && (
                          <p className="text-xs text-gray-500 mt-1">
                            Dibagi {qurbanPackage.maxSlots} slot (paket patungan)
                          </p>
                        )}
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-primary-600 mono">Rp {formatRupiahFull(total)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-6" style={{ fontSize: '15px' }}>
                    Pilih salah satu opsi di bawah untuk melanjutkan:
                  </p>

                  {/* Action Buttons - 4 Options like Campaign */}
                  <div className="space-y-3">
                    {/* Direct Checkout */}
                    <Button
                      onClick={handleDirectCheckout}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      size="lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Order Qurban Sekarang
                    </Button>

                    {/* Add to Cart and Go to Cart */}
                    <button
                      onClick={handleGoToCart}
                      className="w-full py-3 px-4 rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-all flex items-center justify-center"
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

                    {/* Browse Other Packages */}
                    <button
                      onClick={() => {
                        onClose();
                        router.push('/');
                      }}
                      className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Cari Paket Qurban Lain
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
