'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { formatRupiahFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';
import { AccountPageHeader } from '@/components/account/AccountPageHeader';

interface Transaction {
  id: string;
  transactionNumber: string;
  productType: string;
  productName: string;
  totalAmount: number;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const { t, locale } = useI18n();
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const statusConfig = {
    pending: { label: t('account.transactions.status.pending'), color: 'bg-warning-50 text-warning-700 border-warning-200' },
    processing: { label: t('account.transactions.status.processing'), color: 'bg-blue-50 text-blue-700 border-blue-200' },
    paid: { label: t('account.transactions.status.paid'), color: 'bg-success-50 text-success-700 border-success-200' },
    cancelled: { label: t('account.transactions.status.cancelled'), color: 'bg-danger-50 text-danger-700 border-danger-200' },
  };

  const productTypeLabel = {
    campaign: t('account.transactions.productType.campaign'),
    zakat: t('account.transactions.productType.zakat'),
    qurban: t('account.transactions.productType.qurban'),
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }

    loadTransactions();
  }, [isHydrated, user, filter]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await api.get(`/transactions/my?${params.toString()}`);

      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.code;

      if (status === 401) {
        router.push('/login');
        return;
      }

      if (code === 'ECONNABORTED' || code === 'ERR_CANCELED') {
        return;
      }

      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filters = [
    { key: 'all', label: t('account.transactions.filter.all') },
    { key: 'pending', label: t('account.transactions.filter.pending') },
    { key: 'processing', label: t('account.transactions.filter.processing') },
    { key: 'paid', label: t('account.transactions.filter.paid') },
  ];

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));

  return (
    <div className="max-w-7xl mx-auto">
      <AccountPageHeader title={t('account.transactions.title')} subtitle={t('account.transactions.subtitle')} />

      <div className="mt-5 lg:mt-0 px-[15px] lg:px-0 space-y-5">
        {/* Filter: pil bergulir horizontal */}
        <div className="-mx-[15px] lg:mx-0 px-[15px] lg:px-0 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                filter === item.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{t('account.transactions.empty.title')}</h3>
            <p className="text-sm text-gray-500 mb-5">
              {filter === 'all' ? t('account.transactions.empty.allDesc') : t('account.transactions.empty.filteredDesc')}
            </p>
            {filter === 'all' && (
              <Link href="/program">
                <button className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white hover:bg-primary-700">
                  {t('account.transactions.empty.startDonating')}
                </button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table (tabel baku tidak diubah) */}
            <div className="hidden lg:block">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t('account.transactions.table.transactionNumber')}</th>
                      <th>{t('account.transactions.table.product')}</th>
                      <th>{t('account.transactions.table.type')}</th>
                      <th>{t('account.transactions.table.amount')}</th>
                      <th>{t('account.transactions.table.status')}</th>
                      <th>{t('account.transactions.table.date')}</th>
                      <th>{t('account.transactions.table.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
                      const productLabel = productTypeLabel[transaction.productType as keyof typeof productTypeLabel] || transaction.productType;

                      return (
                        <tr key={transaction.id}>
                          <td>
                            <div className="font-medium text-gray-900">{transaction.transactionNumber}</div>
                          </td>
                          <td>
                            <div className="text-sm text-gray-900">{transaction.productName}</div>
                          </td>
                          <td>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {productLabel}
                            </span>
                          </td>
                          <td className="mono text-sm">{formatRupiahFull(transaction.totalAmount)}</td>
                          <td>
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', status.color)}>
                              {status.label}
                            </span>
                          </td>
                          <td className="text-gray-600 text-sm">{formatDate(transaction.createdAt)}</td>
                          <td>
                            <div className="table-actions">
                              <Link href={`/invoice/${transaction.id}`}>
                                <button className="action-btn action-view" title={t('account.transactions.table.viewDetail')}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: kartu */}
            <ul className="m-0 list-none space-y-3 p-0 lg:hidden">
              {transactions.map((transaction) => {
                const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
                const productLabel = productTypeLabel[transaction.productType as keyof typeof productTypeLabel] || transaction.productType;

                return (
                  <li key={transaction.id}>
                    <Link
                      href={`/invoice/${transaction.id}`}
                      className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {productLabel}
                          </span>
                          <p className="mt-2 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">{transaction.productName}</p>
                        </div>
                        <span className={cn('flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium', status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-gray-100 pt-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-gray-500">{transaction.transactionNumber}</p>
                          <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                        </div>
                        <p className="flex-shrink-0 text-base font-bold text-gray-900">{formatRupiahFull(transaction.totalAmount)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
