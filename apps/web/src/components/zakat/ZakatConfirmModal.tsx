'use client';

import { formatRupiahFull } from '@/lib/format';
import { ConfirmCartModal, ConfirmModalBlock } from '@/components/organisms/ConfirmCartModal';
import { useI18n } from '@/lib/i18n/provider';

interface ZakatConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  zakatName: string;
  zakatType: string; // fitrah, maal, profesi, pertanian, peternakan
  zakatTypeId?: string;
  zakatTypeSlug?: string;
  quantity?: number;
  pricePerUnit?: number;
  periodId?: string;
}

/** Modal konfirmasi zakat: ringkasan + `ConfirmCartModal` bersama (tiga tombol, alur sama dengan campaign dan qurban). */
export default function ZakatConfirmModal({
  isOpen,
  onClose,
  amount,
  zakatName,
  zakatType,
  zakatTypeId,
  zakatTypeSlug,
  quantity,
  pricePerUnit,
  periodId,
}: ZakatConfirmModalProps) {
  const { t } = useI18n();

  return (
    <ConfirmCartModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('zakatCalculator.confirm.title')}
      chooseActionText={t('zakatCalculator.confirm.chooseAction')}
      item={{
        // Zakat boleh ditambahkan berkali-kali (nominal berbeda), jadi id unik per penambahan
        cartItemId: `zakat-${zakatType}-${Date.now()}`,
        itemType: 'zakat',
        campaignId: 'zakat-campaign-default', // Use default zakat campaign
        slug: `zakat-${zakatType}`,
        title: zakatName,
        amount,
        programType: 'zakat',
        zakatData: {
          zakatType,
          zakatTypeId,
          zakatTypeSlug,
          quantity,
          pricePerUnit,
          periodId,
        },
      }}
      browseHref="/zakat"
      labels={{
        checkoutNow: t('zakatCalculator.confirm.actions.payNow'),
        addToCartAndView: t('zakatCalculator.confirm.actions.addAndView'),
        addToCart: t('zakatCalculator.confirm.actions.addToCart'),
      }}
      toasts={{
        redirectCheckout: t('zakatCalculator.confirm.toasts.redirectCheckout'),
        addedToCart: t('zakatCalculator.confirm.toasts.addedToCart'),
      }}
    >
      <ConfirmModalBlock tone="primary" className="mb-4">
        <p className="text-sm text-gray-600 mb-1">{t('zakatCalculator.confirm.amountLabel')}</p>
        <p className="text-2xl font-bold text-primary-600 mono">{formatRupiahFull(amount)}</p>
      </ConfirmModalBlock>

      <ConfirmModalBlock tone="neutral" className="mb-6">
        <p className="text-sm text-gray-600 mb-1">{t('zakatCalculator.confirm.typeLabel')}</p>
        <p className="font-semibold text-dark" style={{ fontSize: '15px' }}>
          {zakatName}
        </p>
        {quantity && pricePerUnit && (
          <p className="text-xs text-gray-500 mt-1">
            {quantity} x {formatRupiahFull(pricePerUnit)}
          </p>
        )}
      </ConfirmModalBlock>
    </ConfirmCartModal>
  );
}
