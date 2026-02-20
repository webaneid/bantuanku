'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms';
import { formatRupiah } from '@/lib/format';
import { getImageUrl } from '@/lib/image';
import { useI18n } from '@/lib/i18n/provider';
import QurbanConfirmModal from './QurbanConfirmModal';

interface AvailablePeriod {
  periodId: string;
  packagePeriodId: string;
  periodName: string;
  gregorianYear: number;
  price: number;
}

interface QurbanSidebarProps {
  qurbanPackage: {
    packagePeriodId: string; // Unique ID for package-period combination
    id: string; // Package master ID
    name: string;
    animalType: string;
    packageType: string;
    price: number;
    stock: number;
    stockSold: number;
    maxSlots: number | null;
    slotsFilled: number;
    availableSlots: number;
    periodId: string;
    availablePeriods: AvailablePeriod[];
    ownerType?: 'organization' | 'mitra';
    ownerName?: string;
    ownerLogoUrl?: string | null;
    ownerSlug?: string | null;
  };
  periods: any[];
  adminFeeCow: number;
  adminFeeGoat: number;
  settings: any;
}

export default function QurbanSidebar({
  qurbanPackage,
  periods,
  adminFeeCow,
  adminFeeGoat,
  settings,
}: QurbanSidebarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState(qurbanPackage.periodId);
  const [quantity, setQuantity] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Handle period change - redirect to new packagePeriodId
  const handlePeriodChange = (newPeriodId: string) => {
    const selectedPeriodData = qurbanPackage.availablePeriods.find(
      (p) => p.periodId === newPeriodId
    );

    if (selectedPeriodData) {
      // Redirect to new packagePeriodId to reload with correct price and stock
      router.push(`/qurban/${selectedPeriodData.packagePeriodId}`);
    }
  };

  // Calculate admin fee based on animal type and package type
  const calculateAdminFee = () => {
    // Get base fee by animal type (ensure it's a number)
    const baseFee = Number(qurbanPackage.animalType === 'cow' ? adminFeeCow : adminFeeGoat);

    // For shared packages (patungan), divide by number of slots and round up
    if (qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots) {
      return Math.ceil(baseFee / qurbanPackage.maxSlots);
    }

    return baseFee;
  };

  const adminFee = calculateAdminFee();

  // Calculate total
  const subtotal = qurbanPackage.price * quantity;
  const totalAdminFee = adminFee * quantity;
  const total = subtotal + totalAdminFee;

  // Check availability
  const isAvailable = qurbanPackage.packageType === 'individual'
    ? qurbanPackage.stock > qurbanPackage.stockSold
    : qurbanPackage.availableSlots > 0;

  const handleOrderClick = () => {
    if (!isAvailable) {
      alert(t('qurbanDetail.sidebar.validation.unavailable'));
      return;
    }

    setIsModalOpen(true);
  };

  const handleShare = (platform: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `${qurbanPackage.name} - Rp ${formatRupiah(qurbanPackage.price)}`;

    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      threads: `https://threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      setIsShareOpen(false);
    }
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <div className="sticky top-8 space-y-4">
      {/* Package Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {(qurbanPackage.ownerName || qurbanPackage.ownerLogoUrl) && (
          qurbanPackage.ownerType === 'mitra' && qurbanPackage.ownerSlug ? (
            <a
              href={`/mitra/${qurbanPackage.ownerSlug}`}
              className="mb-4 inline-flex flex-col items-start gap-2 hover:bg-gray-50 rounded-lg -mx-2 px-2 py-2 transition-colors"
            >
              {qurbanPackage.ownerLogoUrl && (
                <div className="max-w-[30%]">
                  <img
                    src={getImageUrl(qurbanPackage.ownerLogoUrl, '/logo.svg')}
                    alt={qurbanPackage.ownerName || t('qurbanDetail.sidebar.owner.mitra')}
                    className="w-full h-auto object-contain"
                  />
                </div>
              )}
              {qurbanPackage.ownerName && (
                <span className="text-sm font-medium text-gray-900">{qurbanPackage.ownerName}</span>
              )}
            </a>
          ) : (
            <div className="mb-4 inline-flex flex-col items-start gap-2">
              {qurbanPackage.ownerLogoUrl && (
                <div className="max-w-[30%]">
                  <img
                    src={getImageUrl(qurbanPackage.ownerLogoUrl, '/logo.svg')}
                    alt={qurbanPackage.ownerName || t('qurbanDetail.sidebar.owner.organization')}
                    className="w-full h-auto object-contain"
                  />
                </div>
              )}
              {qurbanPackage.ownerName && (
                <span className="text-sm font-medium text-gray-900">{qurbanPackage.ownerName}</span>
              )}
            </div>
          )
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {qurbanPackage.name}
        </h2>

        {/* Price */}
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-1">
            {t('qurbanDetail.sidebar.pricePer', {
              unit: qurbanPackage.packageType === 'individual'
                ? t('qurbanDetail.sidebar.unit.animal')
                : t('qurbanDetail.sidebar.unit.slot'),
            })}
          </div>
          <div className="text-2xl font-bold text-primary-600 mono">
            Rp {formatRupiah(qurbanPackage.price)}
          </div>
        </div>

        {/* Stock/Slots Info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          {qurbanPackage.packageType === 'individual' ? (
            <div className="text-sm">
              <span className="text-gray-600">{t('qurbanDetail.sidebar.stock.available')}</span>{' '}
              <span className="font-semibold text-gray-900">
                {t('qurbanDetail.sidebar.stock.value', {
                  remaining: qurbanPackage.stock - qurbanPackage.stockSold,
                  total: qurbanPackage.stock,
                })}
              </span>
            </div>
          ) : (
            <div className="text-sm space-y-1">
              <div>
                <span className="text-gray-600">{t('qurbanDetail.sidebar.slot.available')}</span>{' '}
                <span className="font-semibold text-gray-900">
                  {t('qurbanDetail.sidebar.slot.value', { count: qurbanPackage.availableSlots })}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{t('qurbanDetail.sidebar.slot.maxPerAnimal')}</span>{' '}
                <span className="font-semibold text-gray-900">
                  {t('qurbanDetail.sidebar.slot.maxValue', { count: qurbanPackage.maxSlots || 0 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Order Selection */}
        {isAvailable ? (
          <div className="space-y-4">
            {/* Period Selection */}
            {qurbanPackage.availablePeriods.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('qurbanDetail.sidebar.selectPeriod')}
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {qurbanPackage.availablePeriods.map((period) => (
                    <option key={period.periodId} value={period.periodId}>
                      {period.periodName} - Rp {formatRupiah(period.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            {qurbanPackage.packageType === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('qurbanDetail.sidebar.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  max={qurbanPackage.stock - qurbanPackage.stockSold}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Price Summary */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('qurbanDetail.sidebar.summary.subtotal')}</span>
                <span className="font-medium mono">Rp {formatRupiah(subtotal)}</span>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('qurbanDetail.sidebar.summary.adminFee', { quantity })}</span>
                  <span className="font-medium mono">Rp {formatRupiah(totalAdminFee)}</span>
                </div>
                {qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('qurbanDetail.sidebar.summary.sharedInfo', { maxSlots: qurbanPackage.maxSlots })}
                  </p>
                )}
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">{t('qurbanDetail.sidebar.summary.total')}</span>
                <span className="text-primary-600 mono">Rp {formatRupiah(total)}</span>
              </div>
            </div>

            {/* Order Button - desktop only, mobile pakai sticky bottom bar */}
            <div className="hidden lg:block">
              <Button
                onClick={handleOrderClick}
                fullWidth
                size="lg"
                className="bg-amber-600 hover:bg-amber-700"
              >
                {t('qurbanDetail.sidebar.actions.orderNow')}
              </Button>
            </div>

            {/* Savings Button - desktop only */}
            <div className="hidden lg:block">
              <Link href={`/qurban/savings/new?packagePeriodId=${qurbanPackage.packagePeriodId}`}>
                <Button
                  fullWidth
                  size="lg"
                  variant="outline"
                  className="mt-3"
                >
                  {t('qurbanDetail.sidebar.actions.saveForPackage')}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-600 font-semibold mb-2">{t('qurbanDetail.sidebar.unavailable.title')}</p>
            <p className="text-sm text-gray-600">
              {t('qurbanDetail.sidebar.unavailable.description')}
            </p>
          </div>
        )}
      </div>

      {/* Help Card */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          {t('qurbanDetail.sidebar.help.title')}
        </h3>
        <p className="text-sm text-blue-700 mb-3">
          {t('qurbanDetail.sidebar.help.description')}
        </p>
        {settings.organization_whatsapp && (
          <a
            href={`https://wa.me/${settings.organization_whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-700 font-medium hover:text-blue-900"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {t('qurbanDetail.sidebar.help.whatsapp')}
          </a>
        )}
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          {/* Price Breakdown */}
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('qurbanDetail.sidebar.summary.subtotal')}</span>
              <span className="font-medium mono">Rp {formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('qurbanDetail.sidebar.summary.adminFee', { quantity })}</span>
              <span className="font-medium mono">Rp {formatRupiah(totalAdminFee)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
              <span className="text-gray-900">{t('qurbanDetail.sidebar.summary.total')}</span>
              <span className="text-primary-600 mono">Rp {formatRupiah(total)}</span>
            </div>
          </div>
          {/* Buttons + Icons */}
          <div className="flex items-start gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <Button onClick={handleOrderClick} size="lg" className="w-full bg-amber-600 hover:bg-amber-700" disabled={!isAvailable}>
                {t('qurbanDetail.sidebar.actions.orderNow')}
              </Button>
              <Link href={`/qurban/savings/new?packagePeriodId=${qurbanPackage.packagePeriodId}`}>
                <Button size="lg" variant="outline" className="w-full">
                  {t('qurbanDetail.sidebar.actions.saveForPackage')}
                </Button>
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsShareOpen(true)}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                aria-label={t('qurbanDetail.sidebar.actions.share')}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={handleFavoriteToggle}
                className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                aria-label={t('qurbanDetail.sidebar.actions.favorite')}
              >
                <svg className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-600'}`} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Qurban Confirmation Modal */}
      <QurbanConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        qurbanPackage={{
          packagePeriodId: qurbanPackage.packagePeriodId,
          id: qurbanPackage.id,
          name: qurbanPackage.name,
          animalType: qurbanPackage.animalType,
          packageType: qurbanPackage.packageType,
          price: qurbanPackage.price,
          maxSlots: qurbanPackage.maxSlots,
        }}
        orderData={{
          periodId: selectedPeriod,
          periodName: periods.find((p) => p.id === selectedPeriod)?.name || t('qurbanDetail.confirmModal.periodFallback'),
          quantity,
        }}
        total={total}
        adminFee={totalAdminFee}
      />

      {/* Share Modal */}
      {isShareOpen && isMounted && createPortal(
        <div className="fixed inset-0 z-[1040] flex items-end justify-center lg:items-center lg:p-4" onClick={() => setIsShareOpen(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('qurbanDetail.sidebar.share.title')}</h3>
              <button onClick={() => setIsShareOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <button onClick={() => handleShare('whatsapp')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">{t('qurbanDetail.sidebar.share.whatsapp')}</span>
              </button>
              <button onClick={() => handleShare('facebook')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">{t('qurbanDetail.sidebar.share.facebook')}</span>
              </button>
              <button onClick={() => handleShare('twitter')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">{t('qurbanDetail.sidebar.share.twitter')}</span>
              </button>
              <button onClick={() => handleShare('threads')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 1.623-.015 3.027-.239 4.176-.672.868-.327 1.652-.789 2.331-1.373 1.12-1.02 1.921-2.41 2.375-4.14.376-1.384.405-2.915.087-4.55-.267-1.37-.768-2.54-1.49-3.476-.625-.806-1.374-1.41-2.227-1.797.307.313.563.67.767 1.068.346.67.533 1.452.555 2.325.02.77-.113 1.493-.396 2.148a4.35 4.35 0 01-1.244 1.677c-.54.444-1.18.77-1.904.969-.678.185-1.42.278-2.206.277-1.125-.003-2.1-.197-2.9-.578a4.98 4.98 0 01-1.866-1.556c-.475-.66-.82-1.434-.996-2.24-.167-.761-.227-1.568-.178-2.4.057-1.006.277-1.913.656-2.695a5.655 5.655 0 011.644-2.043c.717-.554 1.577-.96 2.557-1.208.878-.223 1.845-.335 2.875-.335 1.04 0 2.012.112 2.893.335.98.248 1.84.654 2.557 1.208a5.655 5.655 0 011.644 2.043c.379.782.599 1.689.656 2.695.049.832-.011 1.639-.178 2.4-.176.806-.521 1.58-.996 2.24a4.98 4.98 0 01-1.866 1.556c-.8.381-1.775.575-2.9.578-.786 0-1.528-.092-2.206-.277a4.818 4.818 0 01-1.904-.969 4.35 4.35 0 01-1.244-1.677c-.283-.655-.416-1.378-.396-2.148.022-.873.209-1.655.555-2.325.204-.398.46-.755.767-1.068-.853.387-1.602.991-2.227 1.797-.722.936-1.223 2.106-1.49 3.476-.318 1.635-.289 3.166.087 4.55.454 1.73 1.255 3.12 2.375 4.14.679.584 1.463 1.046 2.331 1.373 1.149.433 2.553.657 4.176.672z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">{t('qurbanDetail.sidebar.share.threads')}</span>
              </button>
              <button onClick={() => handleShare('linkedin')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-600">{t('qurbanDetail.sidebar.share.linkedin')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
