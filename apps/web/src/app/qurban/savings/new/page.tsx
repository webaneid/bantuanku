'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSavings } from '@/services/qurban-savings';
import { fetchPackageDetail, fetchActivePeriods, type QurbanPackage, type QurbanPeriod, getAnimalTypeLabel, getPackageTypeLabel } from '@/services/qurban';
import { fetchPublicSettings, type PublicSettings } from '@/services/settings';
import { useAuth } from '@/lib/auth';
import { formatRupiahFull } from '@/lib/format';

export default function NewSavingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuth();
  const packagePeriodId = searchParams.get('packagePeriodId'); // Changed to packagePeriodId
  const periodIdFromQuery = searchParams.get('periodId');

  const [qurbanPackage, setQurbanPackage] = useState<QurbanPackage | null>(null);
  const [periods, setPeriods] = useState<QurbanPeriod[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    selectedPeriodId: periodIdFromQuery || '',
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
  const totalTarget = qurbanPackage ? qurbanPackage.price + adminFee : 0;
  const installmentAmount = formData.installmentCount > 0
    ? Math.ceil(totalTarget / formData.installmentCount)
    : 0;

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!packagePeriodId) {
      router.push('/qurban');
      return;
    }

    loadPackage();
  }, [isHydrated, user, packagePeriodId, router]);

  const loadPackage = async () => {
    if (!packagePeriodId) return;

    try {
      setIsLoading(true);
      const [packageResponse, periodsResponse, settingsData] = await Promise.all([
        fetchPackageDetail(packagePeriodId),
        fetchActivePeriods(),
        fetchPublicSettings(),
      ]);

      const packageData = packageResponse.data || packageResponse;
      const periodsData = periodsResponse.data || periodsResponse;

      setQurbanPackage(packageData);
      setPeriods(periodsData);
      setSettings(settingsData);

      // Set default period: prioritas dari query, lalu dari package, lalu periode pertama
      if (periodIdFromQuery) {
        setFormData(prev => ({ ...prev, selectedPeriodId: periodIdFromQuery }));
      } else if (packageData.periodId) {
        setFormData(prev => ({ ...prev, selectedPeriodId: packageData.periodId }));
      } else if (periodsData.length > 0) {
        setFormData(prev => ({ ...prev, selectedPeriodId: periodsData[0].id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data paket qurban');
      router.push('/qurban');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !qurbanPackage || !packagePeriodId || !formData.selectedPeriodId) return;

    try {
      setIsSubmitting(true);
      const savings = await createSavings({
        donorName: user.name,
        targetPeriodId: formData.selectedPeriodId,
        targetPackagePeriodId: packagePeriodId, // Use packagePeriodId
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
      alert('Gagal membuat tabungan. Silakan coba lagi.');
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

  if (!qurbanPackage || periods.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buat Tabungan Qurban</h1>
          <p className="text-sm text-gray-600 mt-1">Atur rencana cicilan Anda</p>
        </div>

        {/* Package Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Paket yang Dipilih</h2>
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
                {getAnimalTypeLabel(qurbanPackage.animalType)} - {getPackageTypeLabel(qurbanPackage.packageType)}
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Harga Paket:</span>
                  <span className="font-semibold text-gray-900">{formatRupiahFull(qurbanPackage.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Biaya Admin:</span>
                  <span className="font-semibold text-gray-900">{formatRupiahFull(adminFee)}</span>
                </div>
                {qurbanPackage.packageType === 'shared' && qurbanPackage.maxSlots && (
                  <p className="text-xs text-gray-500">
                    Dibagi {qurbanPackage.maxSlots} slot (paket patungan)
                  </p>
                )}
                <div className="flex justify-between text-base border-t pt-2 mt-2">
                  <span className="font-semibold text-gray-900">Total Target:</span>
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
                Atas Nama
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
                Periode Qurban
              </label>
              <select
                value={formData.selectedPeriodId}
                onChange={(e) => setFormData({ ...formData, selectedPeriodId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pilih kapan Anda ingin qurban disembelih
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frekuensi Cicilan
              </label>
              <select
                value={formData.installmentFrequency}
                onChange={(e) => setFormData({ ...formData, installmentFrequency: e.target.value as any, installmentDay: e.target.value === 'weekly' ? 1 : 5 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="monthly">Bulanan</option>
                <option value="weekly">Mingguan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Cicilan
              </label>
              <select
                value={formData.installmentCount}
                onChange={(e) => setFormData({ ...formData, installmentCount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value={3}>3 kali</option>
                <option value={6}>6 kali</option>
                <option value={12}>12 kali</option>
                <option value={24}>24 kali</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Tentukan berapa kali Anda ingin mencicil
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nominal per Cicilan
              </label>
              <input
                type="text"
                value={formatRupiahFull(installmentAmount)}
                disabled
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-900 font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatRupiahFull(totalTarget)} ÷ {formData.installmentCount} kali = {formatRupiahFull(installmentAmount)}/cicilan
              </p>
            </div>

            {formData.installmentFrequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Cicilan
                </label>
                <select
                  value={formData.installmentDay}
                  onChange={(e) => setFormData({ ...formData, installmentDay: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Tanggal {day}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Notifikasi cicilan akan dikirim setiap tanggal {formData.installmentDay}
                </p>
              </div>
            )}

            {formData.installmentFrequency === 'weekly' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Cicilan Mingguan:</strong> Notifikasi akan dikirim setiap hari <strong>Senin</strong>
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-800">
                <strong>Catatan:</strong> Nominal cicilan di atas hanya sebagai panduan. Anda dapat melunasi kapan saja tanpa terikat jadwal cicilan.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Membuat...' : 'Buat Tabungan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
