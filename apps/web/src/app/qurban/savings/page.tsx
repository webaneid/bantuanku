'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSavingsList, type QurbanSavings } from '@/services/qurban-savings';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { formatRupiahFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';

export default function SavingsListPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const { t, locale } = useI18n();
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const [savingsList, setSavingsList] = useState<QurbanSavings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const statusConfig = {
    active: { label: t("account.qurbanSavings.status.active"), color: "bg-blue-50 text-blue-700 border-blue-200" },
    completed: { label: t("account.qurbanSavings.status.completed"), color: "bg-success-50 text-success-700 border-success-200" },
    converted: { label: t("account.qurbanSavings.status.converted"), color: "bg-purple-50 text-purple-700 border-purple-200" },
    cancelled: { label: t("account.qurbanSavings.status.cancelled"), color: "bg-danger-50 text-danger-700 border-danger-200" },
  };

  useEffect(() => {
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        setIsLoading(false);
      }
      return;
    }

    loadSavings();
  }, [isHydrated, user, router]);

  const loadSavings = async () => {
    try {
      setIsLoading(true);
      const data = await getSavingsList();
      setSavingsList(data);
    } catch (err) {
      console.error('Error loading savings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("account.qurbanSavings.listTitle")}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {t("account.qurbanSavings.totalCount", { count: savingsList.length })}
          </p>
        </div>
        <Link
          href="/qurban/savings/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          {t("account.qurbanSavings.createNew")}
        </Link>
      </div>

      {/* Savings List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : savingsList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">{t("account.qurbanSavings.emptyTitle")}</h3>
          <p className="text-sm text-gray-500 mb-6">{t("account.qurbanSavings.emptyDesc")}</p>
          <Link
            href="/qurban/savings/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            {t("account.qurbanSavings.createNewFull")}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("account.qurbanSavings.table.savingsNumber")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("account.qurbanSavings.table.package")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("account.qurbanSavings.table.progress")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("account.qurbanSavings.table.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("account.qurbanSavings.table.date")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("account.qurbanSavings.table.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {savingsList.map((savings) => {
                  const status = statusConfig[savings.status as keyof typeof statusConfig] || statusConfig.active;
                  const progress = (savings.currentAmount / savings.targetAmount) * 100;

                  return (
                    <tr key={savings.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{savings.savingsNumber}</div>
                        <div className="text-sm text-gray-500">{savings.donorName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {savings.targetPackage?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900 mb-1">
                          {formatRupiahFull(savings.currentAmount)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-success-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("account.qurbanSavings.progressOf", { percent: progress.toFixed(1), target: formatRupiahFull(savings.targetAmount) })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", status.color)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(savings.createdAt).toLocaleDateString(localeTag, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/qurban/savings/${savings.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          {t("account.qurbanSavings.table.detail")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="sm:hidden divide-y divide-gray-200">
            {savingsList.map((savings) => {
              const status = statusConfig[savings.status as keyof typeof statusConfig] || statusConfig.active;
              const progress = (savings.currentAmount / savings.targetAmount) * 100;

              return (
                <Link
                  key={savings.id}
                  href={`/qurban/savings/${savings.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {savings.savingsNumber}
                        </p>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {savings.donorName}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {savings.targetPackage?.name || '-'}
                      </p>
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-success-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatRupiahFull(savings.currentAmount)} / {formatRupiahFull(savings.targetAmount)} ({progress.toFixed(1)}%)
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(savings.createdAt).toLocaleDateString(localeTag, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
