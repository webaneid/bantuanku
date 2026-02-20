'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSavings } from '@/services/qurban-savings';
import { fetchPackageDetail, type QurbanPackage } from '@/services/qurban';
import { fetchPublicSettings, type PublicSettings } from '@/services/settings';
import { useAuth } from '@/lib/auth';
import { formatRupiahFull } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';

export default function NewSavingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuth();
  const { t } = useI18n();
  const packagePeriodIdFromQuery = searchParams.get('packagePeriodId');

  const [qurbanPackage, setQurbanPackage] = useState<QurbanPackage | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    selectedPeriodId: '',
    selectedPackagePeriodId: '',
    selectedPackagePrice: 0,
    installmentFrequency: 'monthly' as 'weekly' | 'monthly',
    installmentCount: 6, // Berapa kali cicilan
    installmentDay: 5, // Untuk bulanan: tanggal, untuk mingguan: hari (1=Senin)
  });

  // Calculate admin fee based on animal type and package type
  const calculateAdminFee = (): number => {
    if (!qurbanPackage || !settings) return 0;

    // Get base fee by animal type (ensure it's a number)
    const baseFee = Number(
      qurbanPackage.animalType === 'cow'
        ? (settings.amil_qurban_sapi_fee || 0)
        : (settings.amil_qurban_perekor_fee || 0)
    );

    // For shared packages (patungan), divide by number of slots and round up
    if (qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots) {
      return Math.ceil(baseFee / qurbanPackage.maxSlots);
    }

    return baseFee;
  };

  const adminFee = calculateAdminFee();
  const packagePrice = formData.selectedPackagePrice || qurbanPackage?.price || 0;
  const totalTarget = qurbanPackage ? packagePrice + adminFee : 0;
  const installmentAmount = formData.installmentCount > 0
    ? Math.ceil(totalTarget / formData.installmentCount)
    : 0;

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!packagePeriodIdFromQuery) {
      router.push('/qurban');
      return;
    }

    loadPackage();
  }, [isHydrated, user, packagePeriodIdFromQuery, router]);

  const loadPackage = async () => {
    if (!packagePeriodIdFromQuery) return;

    try {
      setIsLoading(true);
      const [packageResponse, settingsData] = await Promise.all([
        fetchPackageDetail(packagePeriodIdFromQuery),
        fetchPublicSettings(),
      ]);

      const packageData = packageResponse.data || packageResponse;
      const availablePeriods = Array.isArray(packageData.availablePeriods)
        ? packageData.availablePeriods
        : [];

      setQurbanPackage(packageData);
      setSettings(settingsData);
      const defaultSelectedPeriod = availablePeriods.find(
        (period: any) => period.packagePeriodId === packagePeriodIdFromQuery
      );

      setFormData((prev) => ({
        ...prev,
        selectedPeriodId: defaultSelectedPeriod?.periodId || packageData.periodId || '',
        selectedPackagePeriodId: defaultSelectedPeriod?.packagePeriodId || packageData.packagePeriodId || packagePeriodIdFromQuery,
        selectedPackagePrice: Number(defaultSelectedPeriod?.price ?? packageData.price ?? 0),
      }));
    } catch (error) {
      console.error('Error loading data:', error);
      alert(t('qurbanSavingsCreate.alerts.loadFailed'));
      router.push('/qurban');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !qurbanPackage || !formData.selectedPeriodId || !formData.selectedPackagePeriodId) return;
    if (!user.phone) {
      alert(t('qurbanSavingsCreate.alerts.phoneRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      const savings = await createSavings({
        donorName: user.name,
        donorPhone: user.phone,
        targetPeriodId: formData.selectedPeriodId,
        targetPackagePeriodId: formData.selectedPackagePeriodId,
        targetAmount: totalTarget, // Harga paket + admin
        installmentFrequency: formData.installmentFrequency,
        installmentCount: formData.installmentCount, // Jumlah cicilan
        installmentAmount: installmentAmount, // Calculated
        installmentDay: formData.installmentDay,
        startDate: new Date().toISOString(),
      });
      router.push(`/account/qurban-savings/${savings.id}`);
    } catch (error) {
      console.error('Failed to create savings:', error);
      alert(t('qurbanSavingsCreate.alerts.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!qurbanPackage) {
    return null;
  }

  const packagePeriodOptions = (qurbanPackage.availablePeriods && qurbanPackage.availablePeriods.length > 0)
    ? qurbanPackage.availablePeriods
    : [{
        periodId: qurbanPackage.periodId,
        packagePeriodId: qurbanPackage.packagePeriodId,
        periodName: qurbanPackage.periodName || t('qurbanSavingsCreate.periodFallback'),
        gregorianYear: 0,
        price: Number(qurbanPackage.price || 0),
      }];
  const animalTypeLabel = qurbanPackage.animalType === 'cow'
    ? t('qurbanDetail.confirmModal.animalType.cow')
    : t('qurbanDetail.confirmModal.animalType.goat');
  const packageTypeLabel = qurbanPackage.packageType === 'individual'
    ? t('qurbanDetail.confirmModal.packageType.individual')
    : t('qurbanDetail.confirmModal.packageType.shared');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('qurbanSavingsCreate.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('qurbanSavingsCreate.subtitle')}</p>
        </div>

        {/* Package Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('qurbanSavingsCreate.packageInfo.title')}</h2>
          <div className="flex items-start gap-4">
            {qurbanPackage.imageUrl && (
              <img
                src={qurbanPackage.imageUrl}
                alt={qurbanPackage.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{qurbanPackage.name}</h3>
              <p className="text-sm text-gray-600">
                {animalTypeLabel} - {packageTypeLabel}
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('qurbanSavingsCreate.packageInfo.packagePrice')}</span>
                  <span className="font-semibold text-gray-900">{formatRupiahFull(packagePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('qurbanSavingsCreate.packageInfo.adminFee')}</span>
                  <span className="font-semibold text-gray-900">{formatRupiahFull(adminFee)}</span>
                </div>
                {qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots && (
                  <p className="text-xs text-gray-500">
                    {t('qurbanSavingsCreate.packageInfo.sharedInfo', { maxSlots: qurbanPackage.maxSlots })}
                  </p>
                )}
                <div className="flex justify-between text-base border-t pt-2 mt-2">
                  <span className="font-semibold text-gray-900">{t('qurbanSavingsCreate.packageInfo.totalTarget')}</span>
                  <span className="font-bold text-primary-600">{formatRupiahFull(totalTarget)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('qurbanSavingsCreate.form.onBehalfOf')}
              </label>
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('qurbanSavingsCreate.form.period')}
              </label>
              <select
                value={formData.selectedPeriodId}
                onChange={(e) => {
                  const selectedPeriod = packagePeriodOptions.find(
                    (period) => period.periodId === e.target.value
                  );
                  setFormData({
                    ...formData,
                    selectedPeriodId: e.target.value,
                    selectedPackagePeriodId: selectedPeriod?.packagePeriodId || '',
                    selectedPackagePrice: Number(selectedPeriod?.price || 0),
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {packagePeriodOptions.map((period) => (
                  <option key={period.packagePeriodId} value={period.periodId}>
                    {period.periodName} - {formatRupiahFull(period.price)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {t('qurbanSavingsCreate.form.periodHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('qurbanSavingsCreate.form.frequency')}
              </label>
              <select
                value={formData.installmentFrequency}
                onChange={(e) => setFormData({ ...formData, installmentFrequency: e.target.value as any, installmentDay: e.target.value === 'weekly' ? 1 : 5 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="monthly">{t('qurbanSavingsCreate.form.frequencyMonthly')}</option>
                <option value="weekly">{t('qurbanSavingsCreate.form.frequencyWeekly')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('qurbanSavingsCreate.form.installmentCount')}
              </label>
              <select
                value={formData.installmentCount}
                onChange={(e) => setFormData({ ...formData, installmentCount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value={3}>{t('qurbanSavingsCreate.form.installmentCountOption', { count: 3 })}</option>
                <option value={6}>{t('qurbanSavingsCreate.form.installmentCountOption', { count: 6 })}</option>
                <option value={12}>{t('qurbanSavingsCreate.form.installmentCountOption', { count: 12 })}</option>
                <option value={24}>{t('qurbanSavingsCreate.form.installmentCountOption', { count: 24 })}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {t('qurbanSavingsCreate.form.installmentCountHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('qurbanSavingsCreate.form.installmentAmount')}
              </label>
              <input
                type="text"
                value={formatRupiahFull(installmentAmount)}
                disabled
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-900 font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('qurbanSavingsCreate.form.installmentAmountHelp', {
                  total: formatRupiahFull(totalTarget),
                  count: formData.installmentCount,
                  amount: formatRupiahFull(installmentAmount),
                })}
              </p>
            </div>

            {formData.installmentFrequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('qurbanSavingsCreate.form.installmentDate')}
                </label>
                <select
                  value={formData.installmentDay}
                  onChange={(e) => setFormData({ ...formData, installmentDay: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{t('qurbanSavingsCreate.form.installmentDateOption', { day })}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('qurbanSavingsCreate.form.installmentDateHelp', { day: formData.installmentDay })}
                </p>
              </div>
            )}

            {formData.installmentFrequency === 'weekly' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{t('qurbanSavingsCreate.form.weeklyInfoTitle')}</strong>{' '}
                  {t('qurbanSavingsCreate.form.weeklyInfoText')}{' '}
                  <strong>{t('qurbanSavingsCreate.form.weeklyInfoDay')}</strong>
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-800">
                <strong>{t('qurbanSavingsCreate.form.noteTitle')}</strong>{' '}
                {t('qurbanSavingsCreate.form.noteText')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
              >
                {t('qurbanSavingsCreate.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('qurbanSavingsCreate.actions.creating') : t('qurbanSavingsCreate.actions.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
