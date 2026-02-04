'use client';

import { useState, useEffect } from 'react';
import { Header, Footer } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchZakatConfig, formatCurrency } from '@/services/zakat';
import { useRouter } from 'next/navigation';
import ZakatConfirmModal from '@/components/zakat/ZakatConfirmModal';

export default function ZakatMaalPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedYearly, setCopiedYearly] = useState(false);
  const [copiedMonthly, setCopiedMonthly] = useState(false);
  const [infaqAmount, setInfaqAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedType, setSelectedType] = useState<'zakat' | 'infaq'>('zakat');

  // Form state - detailed breakdown
  const [uangTunai, setUangTunai] = useState(0);
  const [saham, setSaham] = useState(0);
  const [realEstate, setRealEstate] = useState(0);
  const [emas, setEmas] = useState(0);
  const [mobil, setMobil] = useState(0);
  const [hutang, setHutang] = useState(0);

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

  const handleCopyYearly = () => {
    navigator.clipboard.writeText(zakatTahunan.toString());
    setCopiedYearly(true);
    setTimeout(() => setCopiedYearly(false), 2000);
  };

  const handleCopyMonthly = () => {
    navigator.clipboard.writeText(zakatBulanan.toString());
    setCopiedMonthly(true);
    setTimeout(() => setCopiedMonthly(false), 2000);
  };

  const handlePayment = (amount: number, type: 'zakat' | 'infaq') => {
    if (amount <= 0) return;
    setSelectedAmount(amount);
    setSelectedType(type);
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
  const zakatMalPercentage = 0.025; // 2.5%

  const jumlahHarta = uangTunai + saham + realEstate + emas + mobil;
  const hartaBersih = jumlahHarta - hutang;
  const zakatTahunan = hartaBersih >= nishabEmas ? hartaBersih * zakatMalPercentage : 0;
  const zakatBulanan = zakatTahunan / 12;

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
              Kalkulator Zakat Maal
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              Hitung zakat harta (tabungan, deposito, saham, dan aset lainnya)
            </p>
          </div>

          {/* Calculator Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            <div className="space-y-6">
              {/* Header Info - Gold Price */}
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-900 mb-1">Harga Emas</p>
                    <p className="text-2xl font-bold text-primary-700">{formatCurrency(goldPricePerGram)}</p>
                    <p className="text-xs text-primary-600 mt-1">/gram</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-primary-700 mb-1">Harga emas per gram saat ini</p>
                  </div>
                </div>
              </div>

              {/* Nisab Info */}
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
                <p className="text-sm font-semibold text-emerald-900 mb-2">
                  Nisab: {nishabGoldGrams} x {formatCurrency(goldPricePerGram)} = {formatCurrency(nishabEmas)}
                </p>
              </div>

              {/* Input Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  a. Uang Tunai, Tabungan, Deposito atau sejenisnya
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={uangTunai || ''}
                    onChange={(e) => setUangTunai(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  b. Saham atau surat-surat berharga lainnya
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={saham || ''}
                    onChange={(e) => setSaham(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  c. Real Estate (tidak termasuk rumah tinggal yang dipakai sekarang)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={realEstate || ''}
                    onChange={(e) => setRealEstate(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  d. Emas, Perak, Permata atau sejenisnya
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={emas || ''}
                    onChange={(e) => setEmas(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  e. Mobil (lebih dari keperluan pekerjaan anggota keluarga)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={mobil || ''}
                    onChange={(e) => setMobil(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Jumlah Harta Simpanan */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">f. Jumlah Harta Simpanan (A+B+C+D+E)</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(jumlahHarta)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  g. Hutang Pribadi yg jatuh tempo dalam tahun ini
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={hutang || ''}
                    onChange={(e) => setHutang(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Harta Kena Zakat */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm font-medium text-primary-900 mb-1">h. Harta simpanan kena zakat (F-G, jika nisab)</p>
                <p className="text-xl font-bold text-primary-700">{formatCurrency(hartaBersih)}</p>
                {hartaBersih < nishabEmas && (
                  <p className="text-xs text-orange-600 mt-2">
                    Belum mencapai nishab ({formatCurrency(nishabEmas)})
                  </p>
                )}
              </div>

              {/* Hasil Zakat */}
              {hartaBersih >= nishabEmas && (
                <>
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-emerald-900">I. JUMLAH ZAKAT ATAS SIMPANAN YANG WAJIB DIBAYARKAN PER TAHUN (2,5% x H)</p>
                      <button
                        type="button"
                        onClick={handleCopyYearly}
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                      >
                        {copiedYearly ? 'Tersalin!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(zakatTahunan)}</p>
                  </div>

                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-primary-900">J. JUMLAH ZAKAT ATAS SIMPANAN YANG WAJIB DIBAYARKAN PER BULAN</p>
                      <button
                        type="button"
                        onClick={handleCopyMonthly}
                        className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                      >
                        {copiedMonthly ? 'Tersalin!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-primary-700">{formatCurrency(zakatBulanan)}</p>
                  </div>

                  {/* Bayar Button */}
                  <button
                    onClick={() => handlePayment(zakatTahunan, 'zakat')}
                    className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Tunaikan Zakat Sekarang
                  </button>
                </>
              )}

              {/* Input Nominal Manual jika belum nisab */}
              {hartaBersih < nishabEmas && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-900 mb-3">
                    Jika tidak mencapai nisab, Anda tetap dapat ber-infaq, silahkan isi kolom input nominal dibawah ini
                  </p>
                  <div className="relative mb-3">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={infaqAmount || ''}
                      onChange={(e) => setInfaqAmount(parseInt(e.target.value) || 0)}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Input Nominal"
                    />
                  </div>
                  {infaqAmount > 0 && (
                    <button
                      onClick={() => handlePayment(infaqAmount, 'infaq')}
                      className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Bayar Infaq
                    </button>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <h3 className="font-semibold text-emerald-900 mb-3">
                  Tentang Zakat Maal
                </h3>
                <ul className="text-sm text-emerald-800 space-y-2">
                  <li>• Nisab zakat maal setara dengan 85 gram emas</li>
                  <li>• Harta harus dimiliki selama 1 tahun (haul)</li>
                  <li>• Besar zakat maal adalah 2,5% dari total harta yang telah mencapai nisab</li>
                  <li>• Meliputi uang tunai, tabungan, deposito, saham, dan aset produktif lainnya</li>
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
        amount={selectedAmount}
        zakatName={selectedType === 'zakat' ? 'Zakat Maal' : 'Infaq (Zakat Maal)'}
        zakatType="maal"
      />
    </>
  );
}
