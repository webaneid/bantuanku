"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

import KPICards from "@/components/dashboard/KPICards";
import RevenueChart from "@/components/dashboard/RevenueChart";
import IncomeBreakdown from "@/components/dashboard/IncomeBreakdown";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";

const PERIOD_LABELS: Record<string, string> = {
  "7d": "7 Hari",
  "30d": "30 Hari",
  "90d": "90 Hari",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isMitra = user?.roles?.includes("mitra") && user.roles.length === 1;
  const [period, setPeriod] = useState("30d");

  // Redirect mitra ke halaman mitra sendiri
  useEffect(() => {
    if (isMitra) {
      router.replace("/dashboard/mitra");
    }
  }, [isMitra, router]);

  // Enhanced stats (KPI + trend)
  const { data: enhancedStats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard-enhanced-stats", period],
    queryFn: async () => {
      const response = await api.get(`/admin/dashboard/enhanced-stats?period=${period}`);
      return response.data.data;
    },
    enabled: !isMitra,
  });

  // Category breakdown
  const { data: categoryStats, isLoading: loadingCategory } = useQuery({
    queryKey: ["dashboard-stats-by-category"],
    queryFn: async () => {
      const response = await api.get("/admin/dashboard/stats-by-category");
      return response.data.data;
    },
    enabled: !isMitra,
  });

  // Recent transactions
  const { data: recentDonations = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent-donations"],
    queryFn: async () => {
      const response = await api.get("/admin/dashboard/recent-donations?limit=10");
      return response.data.data;
    },
    enabled: !isMitra,
  });

  if (isMitra) return null;

  const isLoading = loadingStats || loadingCategory || loadingRecent;
  const firstName = user?.name?.split(" ")[0] || "Admin";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="dashboard-kpi-grid">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="dashboard-skeleton__kpi" />
          ))}
        </div>
        <div className="dashboard-grid dashboard-grid--charts">
          <div className="dashboard-skeleton__chart" />
          <div className="dashboard-skeleton__chart" />
        </div>
        <div className="dashboard-grid dashboard-grid--bottom">
          <div className="dashboard-skeleton__list" />
          <div className="dashboard-skeleton__list" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selamat datang kembali, {firstName}
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards data={enhancedStats} periodLabel={PERIOD_LABELS[period]} />

      {/* Charts Row: Revenue (2/3) + Donut (1/3) */}
      <div className="dashboard-grid dashboard-grid--charts">
        <RevenueChart
          data={enhancedStats?.trend || []}
          period={period}
          onPeriodChange={setPeriod}
        />
        <IncomeBreakdown data={categoryStats} />
      </div>

      {/* Bottom Row: Activity (2/3) + Quick Actions (1/3) */}
      <div className="dashboard-grid dashboard-grid--bottom">
        <RecentActivity data={recentDonations} />
        <QuickActions
          pendingDisbursements={enhancedStats?.totals?.pendingDisbursements || 0}
          pendingDisbursementsAmount={enhancedStats?.totals?.pendingDisbursementsAmount || 0}
        />
      </div>
    </div>
  );
}
