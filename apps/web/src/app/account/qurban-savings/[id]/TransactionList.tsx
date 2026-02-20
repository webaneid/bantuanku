'use client';

import { formatCurrency } from '@/lib/format';
import { SavingsTransaction } from '@/services/qurban-savings';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';

export default function TransactionList({ transactions }: { transactions: SavingsTransaction[] }) {
  const { t, locale } = useI18n();
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const statusColors: Record<SavingsTransaction['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
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
      timeZone: 'Asia/Jakarta',
    }).format(new Date(date));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('account.qurbanSavingsDetail.noTransactions')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <div key={tx.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-gray-500">{tx.transactionNumber}</p>
              <p className="font-semibold text-lg">{formatCurrency(tx.amount)}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${statusColors[tx.status]}`}>
              {statusLabels[tx.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500">{formatDateByLocale(tx.createdAt)}</p>
          {tx.notes && (
            <p className="text-sm text-gray-600 mt-2">{tx.notes}</p>
          )}
          {tx.verifiedAt && (
            <p className="text-xs text-green-600 mt-2">
              {t('account.qurbanSavingsDetail.verifiedAt', { date: formatDateByLocale(tx.verifiedAt) })}
            </p>
          )}
          {tx.transactionId && (
            <div className="mt-3">
              <Link
                href={`/invoice/${tx.transactionId}`}
                className="text-sm text-primary-600 hover:text-primary-700 underline"
              >
                {t('account.qurbanSavingsDetail.viewReceipt')}
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
