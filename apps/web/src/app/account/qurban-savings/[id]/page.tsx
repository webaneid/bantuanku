'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSavingsDetail, getSavingsTransactions, type QurbanSavings, type SavingsTransaction } from '@/services/qurban-savings';
import DepositForm from './DepositForm';
import TransactionList from './TransactionList';
import ProgressBar from './ProgressBar';
import { useAuth } from '@/lib/auth';

export default function SavingsDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const [savings, setSavings] = useState<QurbanSavings | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push('/login');
      return;
    }

    loadData();
  }, [isHydrated, user, router, params.id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [savingsData, transactionsData] = await Promise.all([
        getSavingsDetail(params.id),
        getSavingsTransactions(params.id),
      ]);
      setSavings(savingsData);
      setTransactions(transactionsData);
    } catch (err) {
      console.error('Error loading savings detail:', err);
      setError('Gagal memuat data tabungan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !savings) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error || 'Tabungan tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/account/qurban-savings')}
            className="mt-4 text-red-600 hover:text-red-700 underline"
          >
            Kembali ke daftar tabungan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Detail Tabungan</h1>
        <p className="text-sm text-gray-600 mt-1">{savings.savingsNumber}</p>
      </div>

      <ProgressBar
        current={savings.currentAmount}
        target={savings.targetAmount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Riwayat Setoran</h2>
          <TransactionList transactions={transactions} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Setor Baru</h2>
          <DepositForm savingsId={savings.id} onSuccess={loadData} />
        </div>
      </div>
    </div>
  );
}
