"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { formatRupiahFull } from "@/lib/format";
import { Button } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";

interface Stats {
  totalDonations: number;
  totalAmount: number;
  pendingDonations: number;
}

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

export default function DashboardPage() {
  const { user, isHydrated } = useAuth();
  const { t, locale } = useI18n();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const [stats, setStats] = useState<Stats>({ totalDonations: 0, totalAmount: 0, pendingDonations: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const statusConfig = {
    pending: { label: t("account.dashboard.status.pending"), color: "bg-warning-50 text-warning-700 border-warning-200" },
    processing: { label: t("account.dashboard.status.processing"), color: "bg-blue-50 text-blue-700 border-blue-200" },
    paid: { label: t("account.dashboard.status.paid"), color: "bg-success-50 text-success-700 border-success-200" },
    cancelled: { label: t("account.dashboard.status.cancelled"), color: "bg-danger-50 text-danger-700 border-danger-200" },
  };

  useEffect(() => {
    // Wait for hydration and user before fetching data
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        // Hydration done but no user, stop loading
        setIsLoading(false);
      }
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, transactionsRes] = await Promise.all([
          api.get("/account/stats"),
          api.get("/transactions/my?limit=5"),
        ]);

        if (statsRes.data.success) {
          setStats({
            totalDonations: 0,
            totalAmount: 0,
            pendingDonations: 0,
            ...statsRes.data.data,
          });
        }

        if (transactionsRes.data.success) {
          setTransactions(transactionsRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isHydrated, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {t("account.dashboard.greeting", { name: user?.name || "" })}
          </h1>
          <p className="text-primary-50 text-sm sm:text-base">
            {t("account.dashboard.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-success-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">{t("account.dashboard.stats.totalDonations")}</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalDonations}</p>
          <p className="text-xs text-gray-500 mt-2">{t("account.dashboard.stats.successTransactions")}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">{t("account.dashboard.stats.totalAmount")}</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatRupiahFull(stats.totalAmount)}</p>
          <p className="text-xs text-gray-500 mt-2">{t("account.dashboard.stats.yourContribution")}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-warning-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">{t("account.dashboard.stats.pendingDonations")}</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.pendingDonations}</p>
          <p className="text-xs text-gray-500 mt-2">{t("account.dashboard.stats.waitingPayment")}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link
          href="/account/transactions"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">{t("account.dashboard.quickActions.history")}</p>
        </Link>
        <Link
          href="/account/qurban-savings"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center mb-3 group-hover:bg-success-100 transition-colors">
            <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">{t("account.dashboard.quickActions.qurbanSavings")}</p>
        </Link>

        <Link
          href="/qurban"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center mb-3 group-hover:bg-warning-100 transition-colors">
            <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">{t("account.dashboard.quickActions.qurban")}</p>
        </Link>

        <Link
          href="/account/profile"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-info-50 flex items-center justify-center mb-3 group-hover:bg-info-100 transition-colors">
            <svg className="w-5 h-5 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">{t("account.dashboard.quickActions.profile")}</p>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{t("account.dashboard.recent.title")}</h2>
            {transactions.length > 0 && (
              <Link
                href="/account/transactions"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t("account.dashboard.recent.viewAll")}
              </Link>
            )}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">{t("account.dashboard.recent.emptyTitle")}</h3>
            <p className="text-sm text-gray-500 mb-6">{t("account.dashboard.recent.emptyDesc")}</p>
            <Link href="/">
              <Button>{t("account.dashboard.recent.startDonating")}</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => {
              const status = statusConfig[transaction.paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
              return (
                <Link
                  key={transaction.id}
                  href={`/invoice/${transaction.id}`}
                  className="block p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {transaction.transactionNumber}
                        </p>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        {transaction.productName}
                      </p>
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        {formatRupiahFull(transaction.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString(localeTag, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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
        )}
      </div>
    </div>
  );
}
