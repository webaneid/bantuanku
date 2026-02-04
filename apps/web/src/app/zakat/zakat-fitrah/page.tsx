'use client';

import { useState, useEffect } from 'react';
import { Header, Footer } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchZakatConfig, formatCurrency } from '@/services/zakat';
import { useRouter } from 'next/navigation';
import ZakatConfirmModal from '@/components/zakat/ZakatConfirmModal';

export default function ZakatFitrahPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [jumlahJiwa, setJumlahJiwa] = useState(1);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await fetchZakatConfig();
      setConfig(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (jumlahJiwa <= 0) return;
    setShowModal(true);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="text-center py-16">
              <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Memuat...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const zakatFitrahAmount = config?.zakatFitrahPerPerson || 50000;
  const totalZakat = jumlahJiwa * zakatFitrahAmount;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Kalkulator Zakat Fitrah
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              Tunaikan zakat fitrah untuk diri dan keluarga Anda
            </p>
          </div>

          {/* Calculator Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            <div className="space-y-6">
              {/* Jumlah Jiwa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Jiwa
                </label>
                <input
                  type="number"
                  min="1"
                  value={jumlahJiwa}
                  onChange={(e) => setJumlahJiwa(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Termasuk diri sendiri dan tanggungan
                </p>
              </div>

              {/* Nominal Per Jiwa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nominal Zakat Fitrah
                </label>
                <input
                  type="text"
                  value={formatCurrency(zakatFitrahAmount)}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Nominal per jiwa (setara 2.5-3 kg beras)
                </p>
              </div>

              {/* Ketentuan Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-900 mb-1">Ketentuan Zakat Fitrah</p>
                <p className="text-sm text-emerald-700">
                  {formatCurrency(zakatFitrahAmount)} per jiwa
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Wajib dibayarkan sebelum Shalat Idul Fitri
                </p>
              </div>

              {/* Hasil Perhitungan */}
              {jumlahJiwa > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-emerald-900 mb-2">Total Zakat Fitrah</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalZakat)}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {jumlahJiwa} jiwa x {formatCurrency(zakatFitrahAmount)}
                  </p>
                </div>
              )}

              {/* Bayar Button */}
              {jumlahJiwa > 0 && (
                <button
                  onClick={handlePayment}
                  className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Tunaikan Zakat Fitrah Sekarang
                </button>
              )}

              {/* Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <h3 className="font-semibold text-emerald-900 mb-3">
                  Tentang Zakat Fitrah
                </h3>
                <ul className="text-sm text-emerald-800 space-y-2">
                  <li>• Zakat fitrah wajib dikeluarkan sebelum Shalat Idul Fitri</li>
                  <li>• Besarnya 1 sha&apos; (2,5 kg atau 3,5 liter) beras atau makanan pokok setempat</li>
                  <li>• Diwajibkan atas setiap Muslim yang memiliki kelebihan dari kebutuhan pokoknya</li>
                  <li>• Dapat dikeluarkan sejak awal Ramadan hingga sebelum Shalat Id</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Zakat Confirm Modal */}
      <ZakatConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        amount={totalZakat}
        zakatName="Zakat Fitrah"
        zakatType="fitrah"
        quantity={jumlahJiwa}
        pricePerUnit={zakatFitrahAmount}
      />
    </>
  );
}
