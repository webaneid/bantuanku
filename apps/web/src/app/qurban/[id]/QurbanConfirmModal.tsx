'use client';

import { formatRupiahFull } from '@/lib/format';
import { ConfirmCartModal, ConfirmModalBlock } from '@/components/organisms/ConfirmCartModal';
import { useI18n } from '@/lib/i18n/provider';

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
  discountAmount?: number;
  voucherCode?: string;
}

/** Modal konfirmasi qurban: rincian + `ConfirmCartModal` bersama (tiga tombol, alur sama dengan campaign). */
export default function QurbanConfirmModal({
  isOpen,
  onClose,
  qurbanPackage,
  orderData,
  total,
  adminFee,
  discountAmount = 0,
  voucherCode,
}: QurbanConfirmModalProps) {
  const { t } = useI18n();

  const animalTypeLabel = qurbanPackage.animalType === 'cow'
    ? t('qurbanDetail.confirmModal.animalType.cow')
    : t('qurbanDetail.confirmModal.animalType.goat');
  const packageTypeLabel = qurbanPackage.packageType === 'individual'
    ? t('qurbanDetail.confirmModal.packageType.individual')
    : t('qurbanDetail.confirmModal.packageType.shared');
  const subtotal = qurbanPackage.price * orderData.quantity;

  return (
    <ConfirmCartModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('qurbanDetail.confirmModal.title')}
      chooseActionText={t('qurbanDetail.confirmModal.chooseAction')}
      item={{
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
          adminFee,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          voucherCode: voucherCode || undefined,
        },
      }}
      browseHref="/qurban"
      labels={{
        checkoutNow: t('qurbanDetail.confirmModal.actions.orderNow'),
        addToCartAndView: t('qurbanDetail.confirmModal.actions.addToCartAndView'),
        addToCart: t('qurbanDetail.confirmModal.actions.addToCart'),
      }}
      toasts={{
        redirectCheckout: t('qurbanDetail.confirmModal.toasts.redirectCheckout'),
        addedToCart: t('qurbanDetail.confirmModal.toasts.addedToCart'),
      }}
    >
      <ConfirmModalBlock tone="primary" className="mb-4">
        <p className="text-sm text-gray-600 mb-2">{t('qurbanDetail.confirmModal.paymentSummary')}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('qurbanDetail.confirmModal.summary.subtotal')}</span>
            <span className="font-medium mono">{formatRupiahFull(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('qurbanDetail.confirmModal.summary.discount')}</span>
              <span className="font-medium mono text-danger-600">- {formatRupiahFull(discountAmount)}</span>
            </div>
          )}
          <div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('qurbanDetail.confirmModal.summary.adminFee')}</span>
              <span className="font-medium mono">{formatRupiahFull(adminFee)}</span>
            </div>
            {qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots && (
              <p className="text-xs text-gray-500 mt-1">
                {t('qurbanDetail.confirmModal.summary.sharedInfo', { maxSlots: qurbanPackage.maxSlots })}
              </p>
            )}
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
            <span className="font-semibold text-dark">{t('qurbanDetail.confirmModal.summary.total')}</span>
            <span className="text-lg font-bold text-primary-600 mono">{formatRupiahFull(total)}</span>
          </div>
        </div>
      </ConfirmModalBlock>

      <ConfirmModalBlock tone="neutral" className="mb-6">
        <p className="text-sm text-gray-600 mb-1">{t('qurbanDetail.confirmModal.packageLabel')}</p>
        <p className="font-semibold text-dark" style={{ fontSize: '15px' }}>
          {qurbanPackage.name}
        </p>
        <div className="mt-2 text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>{t('qurbanDetail.confirmModal.periodLabel')}</span>
            <span className="font-medium text-dark">{orderData.periodName}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('qurbanDetail.confirmModal.typeLabel')}</span>
            <span className="font-medium text-dark">{animalTypeLabel} - {packageTypeLabel}</span>
          </div>
          {qurbanPackage.packageType === 'individual' && (
            <div className="flex justify-between">
              <span>{t('qurbanDetail.confirmModal.quantityLabel')}</span>
              <span className="font-medium text-dark">{t('qurbanDetail.confirmModal.quantityValue', { quantity: orderData.quantity })}</span>
            </div>
          )}
        </div>
      </ConfirmModalBlock>
    </ConfirmCartModal>
  );
}
