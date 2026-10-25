'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSavingsDetail, getSavingsTransactions, type QurbanSavings, type SavingsTransaction } from '@/services/qurban-savings';
import DepositForm from './DepositForm';
import TransactionList from './TransactionList';
import ProgressBar from './ProgressBar';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n/provider';
import { AccountPageHeader } from '@/components/account/AccountPageHeader';

export default function SavingsDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const { t } = useI18n();
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
      const status = (err as any)?.response?.status;
      const code = (err as any)?.code;

      if (status === 401) {
        router.push('/login');
        return;
      }

      if (code === 'ECONNABORTED' || code === 'ERR_CANCELED') {
        return;
      }

      console.error('Error loading savings detail:', err);
      setError(t('account.qurbanSavingsDetail.loadFailed'));
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
      <div className="max-w-5xl mx-auto px-[15px] lg:px-0 pt-5 lg:pt-0">
        <div className="rounded-2xl bg-danger-50 p-6">
          <p className="text-danger-700">{error || t('account.qurbanSavingsDetail.notFound')}</p>
          <button
            onClick={() => router.push('/account/qurban-savings')}
            className="mt-4 text-danger-600 hover:text-danger-700 underline"
          >
            {t('account.qurbanSavingsDetail.backToList')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <AccountPageHeader
        title={t('account.qurbanSavingsDetail.title')}
        subtitle={savings.savingsNumber}
        backHref="/account/qurban-savings"
      />

      <div className="mt-5 lg:mt-0 px-[15px] lg:px-0 space-y-5">
        <ProgressBar current={savings.currentAmount} target={savings.targetAmount} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Mobile: setor dulu (aksi utama), riwayat di bawah; desktop: riwayat kiri, setor kanan */}
          <section className="order-2 lg:order-1">
            <h2 className="mb-3 text-base font-bold text-dark">{t('account.qurbanSavingsDetail.historyTitle')}</h2>
            <TransactionList transactions={transactions} />
          </section>

          <section className="order-1 lg:order-2">
            <h2 className="mb-3 text-base font-bold text-dark">{t('account.qurbanSavingsDetail.depositTitle')}</h2>
            <div className="rounded-2xl bg-white p-4 shadow-sm lg:p-5">
              <DepositForm
                savingsId={savings.id}
                defaultAmount={Number(savings.installmentAmount || 0)}
                onSuccess={loadData}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
