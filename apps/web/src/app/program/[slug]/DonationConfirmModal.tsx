'use client';

import { formatRupiahFull } from '@/lib/format';
import { ConfirmCartModal, ConfirmModalBlock } from '@/components/organisms/ConfirmCartModal';
import { useI18n } from '@/lib/i18n/provider';

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

/** Modal konfirmasi campaign/wakaf/fidyah: ringkasan + `ConfirmCartModal` bersama (tiga tombol, alur sama dengan qurban). */
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
  const isWakaf = programType === 'wakaf';

  return (
    <ConfirmCartModal
      isOpen={isOpen}
      onClose={onClose}
      title={isWakaf ? t('campaignDetail.confirmModal.titleWakaf') : t('campaignDetail.confirmModal.titleDonation')}
      chooseActionText={t('campaignDetail.confirmModal.chooseAction')}
      item={{
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
      }}
      browseHref="/program"
      labels={{
        checkoutNow: isWakaf
          ? t('campaignDetail.confirmModal.actions.wakafNow')
          : t('campaignDetail.confirmModal.actions.donateNow'),
        addToCartAndView: t('campaignDetail.confirmModal.actions.addToCartAndView'),
        addToCart: t('campaignDetail.confirmModal.actions.addToCart'),
      }}
      toasts={{
        redirectCheckout: t('campaignDetail.confirmModal.toasts.redirectCheckout'),
        addedToCart: t('campaignDetail.confirmModal.toasts.addedToCart'),
      }}
    >
      <ConfirmModalBlock tone="primary" className="mb-4">
        <p className="text-sm text-gray-600 mb-1">
          {isWakaf
            ? t('campaignDetail.confirmModal.amountLabelWakaf')
            : t('campaignDetail.confirmModal.amountLabelDonation')}
        </p>
        <p className="text-2xl font-bold text-primary-600 mono">{formatRupiahFull(amount)}</p>
      </ConfirmModalBlock>

      <ConfirmModalBlock tone="neutral" className="mb-6">
        <p className="text-sm text-gray-600 mb-1">{t('campaignDetail.confirmModal.programLabel')}</p>
        <p className="font-semibold text-dark" style={{ fontSize: '15px' }}>
          {campaignTitle}
        </p>
      </ConfirmModalBlock>
    </ConfirmCartModal>
  );
}
