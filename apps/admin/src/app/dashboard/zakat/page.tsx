"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  BanknotesIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

export default function ZakatDashboardPage() {
  // Fetch zakat statistics
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["zakat-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/stats");
      return response.data.data;
    },
  });

  // Fetch active zakat types
  const { data: typesData, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["zakat-types-active"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { isActive: "true", limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch recent donations
  const { data: recentDonations, isLoading: isLoadingDonations } = useQuery({
    queryKey: ["zakat-recent-donations"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/stats/recent-donations", {
        params: { limit: 5 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch recent distributions
  const { data: recentDistributions, isLoading: isLoadingDistributions } = useQuery({
    queryKey: ["zakat-recent-distributions"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/stats/recent-distributions", {
        params: { limit: 5 },
      });
      return response.data?.data || [];
    },
  });

  if (isLoadingStats || isLoadingTypes) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const stats = statsData || {
    donations: { paidAmount: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 },
    distributions: { disbursedAmount: 0, approvedAmount: 0, draftAmount: 0, disbursedCount: 0 },
    balance: 0,
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Zakat</h1>
            <p className="text-gray-600 mt-1">
              Kelola dan pantau dana zakat yang masuk dan tersalurkan
            </p>
          </div>
          <Link href="/dashboard/zakat/types" className="btn btn-primary btn-md">
            Kelola Jenis Zakat
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Total Dana Masuk */}
          <div className="relative overflow-hidden bg-gradient-to-br from-success-50 to-success-100 rounded-2xl p-6 shadow-sm border border-success-200 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success-600 opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <BanknotesIcon className="h-6 w-6 text-success-600" />
                </div>
                <span className="text-xs font-medium text-success-700 bg-success-200 px-3 py-1 rounded-full">
                  Terbayar
                </span>
              </div>
              <p className="text-sm font-medium text-success-900 mb-1">Dana Masuk</p>
              <p className="text-2xl font-bold text-success-900 mb-2">
                {formatCurrency(stats.donations.paidAmount)}
              </p>
              <p className="text-xs text-success-700">
                {stats.donations.paidCount} pembayaran selesai
              </p>
            </div>
          </div>

          {/* Total Dana Tersalurkan */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-sm border border-orange-200 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600 opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <ArrowUpCircleIcon className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-orange-700 bg-orange-200 px-3 py-1 rounded-full">
                  Tersalurkan
                </span>
              </div>
              <p className="text-sm font-medium text-orange-900 mb-1">Dana Tersalurkan</p>
              <p className="text-2xl font-bold text-orange-900 mb-2">
                {formatCurrency(stats.distributions.disbursedAmount)}
              </p>
              <p className="text-xs text-orange-700">
                {stats.distributions.disbursedCount} penyaluran
              </p>
            </div>
          </div>

          {/* Saldo */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 shadow-sm border border-primary-200 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600 opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <ScaleIcon className="h-6 w-6 text-primary-600" />
                </div>
                <span className="text-xs font-medium text-primary-700 bg-primary-200 px-3 py-1 rounded-full">
                  Saldo
                </span>
              </div>
              <p className="text-sm font-medium text-primary-900 mb-1">Saldo Zakat</p>
              <p className="text-2xl font-bold text-primary-900 mb-2">
                {formatCurrency(stats.balance)}
              </p>
              <p className="text-xs text-primary-700">
                Dana yang belum tersalurkan
              </p>
            </div>
          </div>

          {/* Dana Pending */}
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-400 opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <ArrowDownCircleIcon className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-xs font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full">
                  Pending
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Dana Pending</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {formatCurrency(stats.donations.pendingAmount)}
              </p>
              <p className="text-xs text-gray-700">
                {stats.donations.pendingCount} pembayaran menunggu
              </p>
            </div>
          </div>
        </div>

        {/* Zakat Types Overview */}
        <div className="content-card mb-6">
          <div className="content-card-header">
            <h2 className="content-card-title">Jenis Zakat Aktif</h2>
          </div>
          <div className="content-card-body">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoadingTypes ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </>
              ) : !typesData || typesData.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  Tidak ada jenis zakat aktif
                </div>
              ) : (
                typesData.map((type: any) => {
                  const typeStats = statsData?.donationsByType?.find(
                    (d: any) => d.zakatTypeId === type.id
                  ) || { totalAmount: 0, count: 0 };

                  return (
                    <div
                      key={type.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{type.icon}</span>
                            <h3 className="font-semibold text-gray-900">{type.name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {type.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Terkumpul:</span>
                          <span className="font-semibold text-success-700">
                            {formatCurrency(typeStats.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>{typeStats.count} pembayaran</span>
                          <Link
                            href={`/dashboard/zakat/donations?zakatTypeId=${type.id}`}
                            className="text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            Lihat detail →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Distribution by Asnaf */}
        {statsData?.distributionsByCategory && statsData.distributionsByCategory.length > 0 && (
          <div className="content-card mb-6">
            <div className="content-card-header">
              <h2 className="content-card-title">
                Penyaluran per Asnaf (8 Golongan Penerima)
              </h2>
            </div>
            <div className="content-card-body">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {statsData.distributionsByCategory.map((item: any) => (
                  <div key={item.category} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase font-medium">
                      {item.category}
                    </div>
                    <div className="text-lg font-bold text-gray-900 mt-1">
                      {formatCurrency(item.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.count} penyaluran</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Recent Donations */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">Pembayaran Terbaru</h2>
              <Link
                href="/dashboard/zakat/donations"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            <div className="content-card-body">
              {isLoadingDonations ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : recentDonations.length > 0 ? (
                <div className="space-y-3">
                  {recentDonations.map((donation: any) => (
                    <div
                      key={donation.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {donation.donorName}
                          {donation.isAnonymous && (
                            <span className="text-xs text-gray-500 ml-2">(Anonim)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {donation.zakatTypeName} •{" "}
                          {new Date(donation.createdAt).toLocaleDateString("id-ID")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-success-700">
                          {formatCurrency(donation.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Belum ada pembayaran</div>
              )}
            </div>
          </div>

          {/* Recent Distributions */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">Penyaluran Terbaru</h2>
              <Link
                href="/dashboard/zakat/distributions"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            <div className="content-card-body">
              {isLoadingDistributions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : recentDistributions.length > 0 ? (
                <div className="space-y-3">
                  {recentDistributions.map((distribution: any) => (
                    <div
                      key={distribution.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {distribution.recipientName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {distribution.recipientCategory} • {distribution.zakatTypeName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-warning-700">
                          {formatCurrency(distribution.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Belum ada penyaluran</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">Aksi Cepat</h2>
          </div>
          <div className="content-card-body">
            <div className="grid gap-3 md:grid-cols-3">
              <Link
                href="/dashboard/zakat/donations"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <BanknotesIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">Lihat Pembayaran</span>
              </Link>
              <Link
                href="/dashboard/zakat/distributions/new"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <ArrowUpCircleIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">Buat Penyaluran</span>
              </Link>
              <Link
                href="/dashboard/zakat/reports"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <ScaleIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">Laporan Zakat</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
