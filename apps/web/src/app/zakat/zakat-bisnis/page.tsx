'use client';

import { useState, useEffect } from 'react';
import { Header, Footer } from '@/components/organisms';
import { useAuth } from '@/lib/auth';
import { fetchZakatConfig, calculateZakatTrade, formatCurrency } from '@/services/zakat';
import { useRouter } from 'next/navigation';

export default function ZakatBisnisPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Form state
  const [inventory, setInventory] = useState(0);
  const [receivables, setReceivables] = useState(0);
  const [cash, setCash] = useState(0);
  const [payables, setPayables] = useState(0);

  // Result state
  const [result, setResult] = useState<any>(null);

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

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);

    try {
      const params = {
        inventory,
        receivables,
        cash,
        payables,
      };

      const calculationResult = await calculateZakatTrade(params, token || undefined);
      setResult(calculationResult);
    } catch (error) {
      console.error('Calculation failed:', error);
      alert('Gagal menghitung zakat. Silakan coba lagi.');
    } finally {
      setCalculating(false);
    }
  };

  const handlePayment = () => {
    if (!result) return;

    const cartItem = {
      type: 'zakat',
      subType: 'maal',
      name: 'Zakat Bisnis',
      amount: result.zakatAmount,
      quantity: 1,
      pricePerUnit: result.zakatAmount,
      zakatData: {
        zakatType: 'maal',
        quantity: 1,
        pricePerUnit: result.zakatAmount,
      },
    };

    const existingCart = localStorage.getItem('cart');
    const cart = existingCart ? JSON.parse(existingCart) : [];
    cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));

    router.push('/checkout');
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

  const totalAssets = inventory + receivables + cash - payables;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
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
              Zakat Bisnis
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              Hitung zakat perdagangan dan usaha Anda
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Kalkulator Zakat Bisnis
              </h2>

              <form onSubmit={handleCalculate} className="space-y-6">
                {/* Inventory */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nilai Barang Dagangan/Stok <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inventory}
                    onChange={(e) => setInventory(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Rp 0"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Nilai barang dagangan yang siap dijual
                  </p>
                </div>

                {/* Receivables */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Piutang yang Dapat Ditagih
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={receivables}
                    onChange={(e) => setReceivables(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Rp 0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Piutang yang diharapkan dapat tertagih
                  </p>
                </div>

                {/* Cash */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kas/Uang Tunai Usaha
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cash}
                    onChange={(e) => setCash(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Rp 0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Uang tunai dan saldo bank usaha
                  </p>
                </div>

                {/* Payables */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hutang Usaha
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={payables}
                    onChange={(e) => setPayables(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Rp 0"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Hutang jangka pendek yang harus dibayar
                  </p>
                </div>

                {/* Total Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Modal Kerja Bersih</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAssets)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={calculating}
                  className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {calculating ? 'Menghitung...' : 'Hitung Zakat Bisnis'}
                </button>
              </form>
            </div>

            {/* Result */}
            <div>
              {result ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Hasil Perhitungan
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600">Modal Kerja Bersih</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(result.totalAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600">Nisab</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(result.nisabValue)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-semibold ${result.isWajib ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {result.isWajib ? 'Wajib Zakat' : 'Belum Wajib Zakat'}
                      </span>
                    </div>
                    {result.isWajib && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-bold text-gray-900">Zakat yang Harus Dibayar</span>
                        <span className="text-2xl font-bold text-primary-600">
                          {formatCurrency(result.zakatAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {result.isWajib && (
                    <button
                      onClick={handlePayment}
                      className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Bayar Sekarang
                    </button>
                  )}

                  {!result.isWajib && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                      Modal usaha Anda belum mencapai nisab. Namun, Anda tetap dapat bersedekah sesuai kemampuan.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">
                      Isi form di samping untuk menghitung zakat bisnis
                    </p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <h3 className="font-semibold text-emerald-900 mb-3">
                  Tentang Zakat Bisnis
                </h3>
                <ul className="text-sm text-emerald-800 space-y-2">
                  <li>• Nisab zakat perdagangan setara dengan 85 gram emas</li>
                  <li>• Modal usaha harus dimiliki selama 1 tahun (haul)</li>
                  <li>• Besar zakat adalah 2,5% dari modal kerja bersih</li>
                  <li>• Meliputi nilai barang dagangan, piutang, kas, dikurangi hutang jangka pendek</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
