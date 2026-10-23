'use client';

import { formatCurrency } from '@/lib/format';
import { useI18n } from '@/lib/i18n/provider';

export default function ProgressBar({ current, target }: { current: number; target: number }) {
  const { t } = useI18n();
  const progress = target > 0 ? (current / target) * 100 : 0;
  const remaining = Math.max(target - current, 0);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{t('account.qurbanSavingsDetail.progressTitle')}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{progress.toFixed(1)}%</p>
        </div>
        <p className="text-right text-xs text-gray-500">
          {formatCurrency(current)} / {formatCurrency(target)}
        </p>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 px-2 py-3">
          <p className="mb-1 text-[11px] text-gray-500">{t('account.qurbanSavingsDetail.target')}</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(target)}</p>
        </div>
        <div className="rounded-xl bg-success-50 px-2 py-3">
          <p className="mb-1 text-[11px] text-gray-500">{t('account.qurbanSavingsDetail.collected')}</p>
          <p className="text-sm font-semibold text-success-700">{formatCurrency(current)}</p>
        </div>
        <div className="rounded-xl bg-warning-50 px-2 py-3">
          <p className="mb-1 text-[11px] text-gray-500">{t('account.qurbanSavingsDetail.remaining')}</p>
          <p className="text-sm font-semibold text-warning-700">{formatCurrency(remaining)}</p>
        </div>
      </div>
    </div>
  );
}
