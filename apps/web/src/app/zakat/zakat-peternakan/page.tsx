'use client';

import { useState, useEffect } from 'react';
import { Header, Footer } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchZakatConfig, formatCurrency } from '@/services/zakat';
import { useRouter } from 'next/navigation';
import ZakatConfirmModal from '@/components/zakat/ZakatConfirmModal';

export default function ZakatPeternakanPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [jenisTernak, setJenisTernak] = useState('sapi');
  const [nilaiTernak, setNilaiTernak] = useState(0);

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
    if (nilaiTernak <= 0) return;

    const goldPricePerGram = config?.goldPricePerGram || 0;
    const nishabGoldGrams = 85;
    const nishabEmas = nishabGoldGrams * goldPricePerGram;
    const zakatMalPercentage = 0.025;
    const zakatAmount = nilaiTernak >= nishabEmas ? nilaiTernak * zakatMalPercentage : 0;

    if (zakatAmount <= 0) {
      alert('Nilai ternak belum mencapai nisab');
      return;
    }

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

  const goldPricePerGram = config?.goldPricePerGram || 0;
  const nishabGoldGrams = 85;
  const nishabEmas = nishabGoldGrams * goldPricePerGram;
  const zakatMalPercentage = 0.025;
  const zakatAmount = nilaiTernak >= nishabEmas ? nilaiTernak * zakatMalPercentage : 0;

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
              Kalkulator Zakat Peternakan
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              Hitung zakat dari hewan ternak Anda
            </p>
          </div>

          {/* Calculator Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            <div className="space-y-6">
              {/* Jenis Ternak */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Ternak
                </label>
                <select
                  value={jenisTernak}
                  onChange={(e) => setJenisTernak(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="sapi">Sapi/Kerbau</option>
                  <option value="kambing">Kambing/Domba</option>
                  <option value="unta">Unta</option>
                </select>
              </div>

              {/* Nilai Ternak */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nilai Ternak (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={nilaiTernak || ''}
                    onChange={(e) => setNilaiTernak(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Total nilai seluruh ternak yang dimiliki
                </p>
              </div>

              {/* Nisab Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">Nishab Zakat Peternakan</p>
                <p className="text-sm text-amber-700">
                  Sapi: 30 ekor | Kambing: 40 ekor | Unta: 5 ekor
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Atau setara dengan nishab emas ({formatCurrency(nishabEmas)})
                </p>
              </div>

              {/* Hasil Perhitungan */}
              {nilaiTernak > 0 && (
                <>
                  {zakatAmount > 0 ? (
                    <>
                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                        <p className="text-sm font-bold text-emerald-900 mb-2">Jumlah Zakat Peternakan (2,5% dari nilai ternak)</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(zakatAmount)}</p>
                      </div>

                      {/* Bayar Button */}
                      <button
                        onClick={handlePayment}
                        className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Tunaikan Zakat Sekarang
                      </button>
                    </>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-orange-900">
                        Nilai ternak belum mencapai nishab ({formatCurrency(nishabEmas)})
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        Namun, Anda tetap dapat ber-infaq sesuai kemampuan
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <h3 className="font-semibold text-emerald-900 mb-3">
                  Tentang Zakat Peternakan
                </h3>
                <ul className="text-sm text-emerald-800 space-y-2">
                  <li>• Nisab sapi/kerbau: 30 ekor, kambing/domba: 40 ekor, unta: 5 ekor</li>
                  <li>• Harus dimiliki selama 1 tahun (haul)</li>
                  <li>• Besar zakat: 2,5% dari nilai ternak atau sesuai ketentuan syariat untuk jumlah tertentu</li>
                  <li>• Ternak harus digembalakan dan dikembangbiakkan</li>
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
        amount={zakatAmount}
        zakatName="Zakat Peternakan"
        zakatType="peternakan"
      />
    </>
  );
}
