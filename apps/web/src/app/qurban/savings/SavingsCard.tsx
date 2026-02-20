'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import { QurbanSavings } from '@/services/qurban-savings';
import { useI18n } from '@/lib/i18n/provider';

export default function SavingsCard({ savings }: { savings: QurbanSavings }) {
  const { t } = useI18n();
  const progress = (savings.currentAmount / savings.targetAmount) * 100;

  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    converted: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    active: t('account.qurbanSavings.status.active'),
    completed: t('account.qurbanSavings.status.completed'),
    converted: t('account.qurbanSavings.status.converted'),
    cancelled: t('account.qurbanSavings.status.cancelled'),
  };

  return (
    <Link href={`/qurban/savings/${savings.id}`}>
      <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-gray-500">{t('account.qurbanSavings.table.savingsNumber')}</p>
            <p className="font-semibold">{savings.savingsNumber}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${statusColors[savings.status]}`}>
            {statusLabels[savings.status]}
          </span>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">{t('account.qurbanSavings.table.progress')}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">
            {formatCurrency(savings.currentAmount)} / {formatCurrency(savings.targetAmount)}
            <span className="ml-2 font-semibold">{progress.toFixed(1)}%</span>
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <p>{t('account.qurbanSavingsDetail.target')}: {formatCurrency(savings.targetAmount)}</p>
          <p>{t('account.qurbanSavingsDetail.remaining')}: {formatCurrency(savings.targetAmount - savings.currentAmount)}</p>
        </div>
      </div>
    </Link>
  );
}
