'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSavingsList, type QurbanSavings } from '@/services/qurban-savings';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { formatRupiahFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/provider';
import { AccountPageHeader } from '@/components/account/AccountPageHeader';

export default function SavingsListPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const { t, locale } = useI18n();
  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const [savingsList, setSavingsList] = useState<QurbanSavings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const statusConfig = {
    active: { label: t("account.qurbanSavings.status.active"), color: "bg-info-50 text-info-700 border-info-200" },
    completed: { label: t("account.qurbanSavings.status.completed"), color: "bg-success-50 text-success-700 border-success-200" },
    converted: { label: t("account.qurbanSavings.status.converted"), color: "bg-info-50 text-info-700 border-info-200" },
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

  const formatDate = (value: string, month: 'short' | 'long' = 'short') =>
    new Date(value).toLocaleDateString(localeTag, { day: 'numeric', month, year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto">
      <AccountPageHeader
        title={t("account.qurbanSavings.listTitle")}
        subtitle={t("account.qurbanSavings.totalCount", { count: savingsList.length })}
        action={
          <Link
            href="/qurban"
            className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary-700 shadow-sm hover:bg-primary-50 transition-colors lg:bg-primary-600 lg:text-white lg:hover:bg-primary-700 lg:text-sm"
          >
            {t("account.qurbanSavings.viewPackages")}
          </Link>
        }
      />

      <div className="mt-5 lg:mt-0 px-[15px] lg:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : savingsList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-dark mb-1">{t("account.qurbanSavings.emptyTitle")}</h3>
            <p className="text-sm text-gray-500 mb-5">{t("account.qurbanSavings.emptyDesc")}</p>
            <Link
              href="/qurban"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary-500 px-6 font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              {t("account.qurbanSavings.viewPackages")}
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table (tabel baku tidak diubah) */}
            <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("account.qurbanSavings.table.savingsNumber")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("account.qurbanSavings.table.package")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("account.qurbanSavings.table.progress")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("account.qurbanSavings.table.status")}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("account.qurbanSavings.table.date")}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("account.qurbanSavings.table.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savingsList.map((savings) => {
                      const status = statusConfig[savings.status as keyof typeof statusConfig] || statusConfig.active;
                      const progress = (savings.currentAmount / savings.targetAmount) * 100;

                      return (
                        <tr key={savings.id} className="hover:bg-light">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-dark">{savings.savingsNumber}</div>
                            <div className="text-sm text-gray-500">{savings.donorName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-dark">{savings.targetPackage?.name || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-dark mb-1">{formatRupiahFull(savings.currentAmount)}</div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                            <div className="text-xs text-gray-500">
                              {t("account.qurbanSavings.progressOf", { percent: progress.toFixed(1), target: formatRupiahFull(savings.targetAmount) })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", status.color)}>{status.label}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(savings.createdAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link href={`/account/qurban-savings/${savings.id}`} className="text-primary-600 hover:text-primary-900">
                              {t("account.qurbanSavings.table.detail")}
                            </Link>
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
              {savingsList.map((savings) => {
                const status = statusConfig[savings.status as keyof typeof statusConfig] || statusConfig.active;
                const progress = (savings.currentAmount / savings.targetAmount) * 100;

                return (
                  <li key={savings.id}>
                    <Link
                      href={`/account/qurban-savings/${savings.id}`}
                      className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug text-dark">{savings.targetPackage?.name || '-'}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{savings.savingsNumber} · {savings.donorName}</p>
                        </div>
                        <span className={cn("flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", status.color)}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-lg font-bold text-dark">{formatRupiahFull(savings.currentAmount)}</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500">
                          {t("account.qurbanSavings.progressOf", { percent: progress.toFixed(1), target: formatRupiahFull(savings.targetAmount) })}
                        </p>
                      </div>

                      <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">{formatDate(savings.createdAt, 'long')}</p>
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
