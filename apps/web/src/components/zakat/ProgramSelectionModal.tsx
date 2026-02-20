'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { formatRupiahFull } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  targetAmount: number;
  collected: number;
  isFeatured?: boolean;
  isUrgent?: boolean;
}

interface ProgramSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  campaigns: Campaign[];
}

export default function ProgramSelectionModal({
  isOpen,
  onClose,
  amount,
  campaigns,
}: ProgramSelectionModalProps) {
  const { t } = useI18n();
  const router = useRouter();

  const handleSelectProgram = (slug: string) => {
    // Redirect to program page with amount pre-filled
    router.push(`/program/${slug}?amount=${amount}`);
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {t('zakatCalculator.programSelection.title')}
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

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-orange-800 mb-1">{t('zakatCalculator.programSelection.infaqAmountLabel')}</p>
                  <p className="text-2xl font-bold text-orange-600">{formatRupiahFull(amount)}</p>
                  <p className="text-xs text-orange-700 mt-1">
                    {t('zakatCalculator.programSelection.helper')}
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>{t('zakatCalculator.programSelection.empty')}</p>
                    </div>
                  ) : (
                    campaigns.map((campaign) => {
                      const progress = campaign.targetAmount > 0
                        ? (campaign.collected / campaign.targetAmount) * 100
                        : 0;

                      return (
                        <button
                          key={campaign.id}
                          onClick={() => handleSelectProgram(campaign.slug)}
                          className="w-full flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                        >
                          {campaign.imageUrl && (
                            <img
                              src={campaign.imageUrl}
                              alt={campaign.title}
                              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 line-clamp-2">
                                {campaign.title}
                              </h4>
                              {campaign.isUrgent && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full whitespace-nowrap">
                                  {t('zakatCalculator.programSelection.badges.urgent')}
                                </span>
                              )}
                              {campaign.isFeatured && (
                                <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full whitespace-nowrap">
                                  {t('zakatCalculator.programSelection.badges.featured')}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('zakatCalculator.programSelection.collected')}</span>
                                <span className="font-semibold text-gray-900">
                                  {formatRupiahFull(campaign.collected)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{progress.toFixed(1)}%</span>
                                <span>{t('zakatCalculator.programSelection.target', { amount: formatRupiahFull(campaign.targetAmount) })}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {t('zakatCalculator.programSelection.cancel')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
