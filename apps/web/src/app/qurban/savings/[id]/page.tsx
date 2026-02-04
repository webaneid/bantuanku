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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !savings) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error || 'Tabungan tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/qurban/savings')}
            className="mt-4 text-red-600 hover:text-red-700 underline"
          >
            Kembali ke daftar tabungan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Detail Tabungan</h1>
      <p className="text-gray-600 mb-6">{savings.savingsNumber}</p>

      <ProgressBar
        current={savings.currentAmount}
        target={savings.targetAmount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
