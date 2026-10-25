'use client';

import { formatCurrency } from '@/lib/format';
import { SavingsTransaction } from '@/services/qurban-savings';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';

export default function TransactionList({ transactions }: { transactions: SavingsTransaction[] }) {
  const { t, locale } = useI18n();
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const statusColors: Record<SavingsTransaction['status'], string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    processing: 'bg-info-50 text-info-700 border-info-200',
    paid: 'bg-success-50 text-success-700 border-success-200',
    pending: 'bg-warning-50 text-warning-700 border-warning-200',
    verified: 'bg-success-50 text-success-700 border-success-200',
    rejected: 'bg-danger-50 text-danger-700 border-danger-200',
  };

  const statusLabels: Record<SavingsTransaction['status'], string> = {
    draft: t('account.qurbanSavingsDetail.status.draft'),
    processing: t('account.qurbanSavingsDetail.status.processing'),
    paid: t('account.qurbanSavingsDetail.status.paid'),
    pending: t('account.qurbanSavingsDetail.status.pending'),
    verified: t('account.qurbanSavingsDetail.status.verified'),
    rejected: t('account.qurbanSavingsDetail.status.rejected'),
  };

  const formatDateByLocale = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(date));

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-white py-8 text-center text-sm text-gray-500 shadow-sm">
        {t('account.qurbanSavingsDetail.noTransactions')}
      </div>
    );
  }

  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {transactions.map((tx) => (
        <li key={tx.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500">{tx.transactionNumber}</p>
              <p className="text-lg font-bold text-dark">{formatCurrency(tx.amount)}</p>
            </div>
            <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[tx.status]}`}>
              {statusLabels[tx.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">{formatDateByLocale(tx.createdAt)}</p>
          {tx.notes && <p className="mt-2 text-sm text-gray-600">{tx.notes}</p>}
          {tx.verifiedAt && (
            <p className="mt-2 text-xs text-success-700">
              {t('account.qurbanSavingsDetail.verifiedAt', { date: formatDateByLocale(tx.verifiedAt) })}
            </p>
          )}
          {tx.transactionId && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <Link
                href={`/invoice/${tx.transactionId}`}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                {t('account.qurbanSavingsDetail.viewReceipt')}
              </Link>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
