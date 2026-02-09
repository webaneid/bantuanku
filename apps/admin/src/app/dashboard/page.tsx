"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Heart, DollarSign, Users, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/dashboard/stats");
      return response.data.data;
    },
  });

  const statCards = [
    {
      title: "Total Campaigns",
      value: stats?.totalCampaigns || 0,
      icon: Heart,
      color: "bg-blue-500",
      active: stats?.activeCampaigns || 0,
    },
    {
      title: "Total Donations",
      value: stats?.totalDonations || 0,
      icon: DollarSign,
      color: "bg-green-500",
      amount: stats?.totalAmount || 0,
    },
    {
      title: "Total Donors",
      value: stats?.totalDonors || 0,
      icon: Users,
      color: "bg-purple-500",
    },
    {
      title: "Pending Disbursements",
      value: stats?.pendingDisbursements || 0,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Bantuanku Admin Dashboard</p>
      </div>

      {/* New Feature Highlight */}
      <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-3xl">✨</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Form Transaksi Universal</h3>
            <p className="text-sm text-blue-800 mb-3">
              Buat semua tipe transaksi (Campaign, Zakat, Qurban) dalam satu form yang mudah dan cepat.
            </p>
            <a
              href="/dashboard/transactions/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Buat Transaksi Baru →
            </a>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              {stat.active !== undefined && (
                <p className="text-sm text-gray-500 mt-1">{stat.active} active</p>
              )}
              {stat.amount !== undefined && (
                <p className="text-sm text-gray-500 mt-1">
                  Rp {(stat.amount / 1000000).toFixed(1)}M
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeCampaigns || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount Collected</p>
              <p className="text-2xl font-bold text-green-600">
                Rp {((stats?.totalAmount || 0) / 1000000).toFixed(2)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Donation</p>
              <p className="text-2xl font-bold text-blue-600">
                Rp {(
                  (stats?.totalAmount || 0) / (stats?.totalDonations || 1) / 1000
                ).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
