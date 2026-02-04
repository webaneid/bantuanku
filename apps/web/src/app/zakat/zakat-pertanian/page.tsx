'use client';

import { useState, useEffect } from 'react';
import { Header, Footer } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchZakatConfig, formatCurrency } from '@/services/zakat';
import { useRouter } from 'next/navigation';
import ZakatConfirmModal from '@/components/zakat/ZakatConfirmModal';

export default function ZakatPertanianPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [infaqAmount, setInfaqAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedType, setSelectedType] = useState<'zakat' | 'infaq'>('zakat');

  // Form state
  const [pendapatan, setPendapatan] = useState(0);
  const [biayaProduksi, setBiayaProduksi] = useState(0);
  const [jenisPengairan, setJenisPengairan] = useState<'hujan' | 'irigasi'>('hujan');

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

  const handleCopy = () => {
    navigator.clipboard.writeText(zakatPertanian.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const ricePricePerKg = config?.ricePricePerKg || 0;
  const nishabPertanian = 750 * ricePricePerKg;
  const hasilBersih = pendapatan - biayaProduksi;
  const persenZakat = jenisPengairan === 'hujan' ? 0.1 : 0.05;
  const zakatPertanian = hasilBersih >= nishabPertanian ? hasilBersih * persenZakat : 0;

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
              Kalkulator Zakat Pertanian
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              Hitung zakat dari hasil pertanian Anda
            </p>
          </div>

          {/* Calculator Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            <div className="space-y-6">
              {/* Harga Beras */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga Beras per KG
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={formatCurrency(ricePricePerKg)}
                    readOnly
                    disabled
                    className="w-full pl-14 pr-16 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">/kg</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Harga beras diambil dari pengaturan sistem
                </p>
              </div>

              {/* Nisab Info */}
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
                <p className="text-sm text-emerald-900 italic mb-2">
                  nisab hasil pertanian adalah 5 wasq atau setara dengan 1.350 kg gabah atau 750 Kg beras. Hauilnya, tiap panen.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💚</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Nisab: 750 x {formatCurrency(ricePricePerKg)} = {formatCurrency(nishabPertanian)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Jenis Pengairan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  A. Jenis pengairan
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="jenisPengairan"
                      value="irigasi"
                      checked={jenisPengairan === 'irigasi'}
                      onChange={(e) => setJenisPengairan(e.target.value as 'irigasi')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-gray-900">Buatan (Irigasi)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="jenisPengairan"
                      value="hujan"
                      checked={jenisPengairan === 'hujan'}
                      onChange={(e) => setJenisPengairan(e.target.value as 'hujan')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-gray-900">Air Hujan</span>
                  </label>
                </div>
              </div>

              {/* Pendapatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  B. Pendapatan hasil panen
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={pendapatan || ''}
                    onChange={(e) => setPendapatan(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Biaya Produksi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  C. Biaya produksi (biaya pengolahan lahan, ongkos buruh, pembelian bibit, pupuk, obat-obatan)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={biayaProduksi || ''}
                    onChange={(e) => setBiayaProduksi(parseInt(e.target.value) || 0)}
                    className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Hasil Bersih */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm font-medium text-primary-900 mb-1">D. Hasil bersih panen (B dikurangi C, jika B &gt; nisab)</p>
                <p className="text-xl font-bold text-primary-700">{formatCurrency(hasilBersih)}</p>
                {hasilBersih < nishabPertanian && (
                  <p className="text-xs text-orange-600 mt-2">
                    Belum mencapai nishab ({formatCurrency(nishabPertanian)})
                  </p>
                )}
              </div>

              {/* Hasil Zakat */}
              {hasilBersih >= nishabPertanian && (
                <>
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-emerald-900">
                        I. Jumlah zakat pertanian yang wajib dibayarkan ({jenisPengairan === 'hujan' ? '10' : '5'}% x D)
                      </p>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                      >
                        {copied ? 'Tersalin!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(zakatPertanian)}</p>
                  </div>

                  {/* Bayar Button */}
                  <button
                    onClick={() => handlePayment(zakatPertanian, 'zakat')}
                    className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Tunaikan Zakat Sekarang
                  </button>
                </>
              )}

              {/* Input Nominal Manual jika belum nisab */}
              {hasilBersih < nishabPertanian && (
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
                  Tentang Zakat Pertanian
                </h3>
                <ul className="text-sm text-emerald-800 space-y-2">
                  <li>• Nisab zakat pertanian adalah 750 kg beras atau 1.350 kg gabah</li>
                  <li>• Ditunaikan setiap kali panen</li>
                  <li>• Besar zakat: 10% jika diairi air hujan, 5% jika diairi irigasi</li>
                  <li>• Meliputi hasil pertanian seperti padi, jagung, gandum, dan tanaman pangan lainnya</li>
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
        zakatName={selectedType === 'zakat' ? 'Zakat Pertanian' : 'Infaq (Zakat Pertanian)'}
        zakatType="pertanian"
      />
    </>
  );
}
