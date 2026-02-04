"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface CampaignLiability {
  campaignId: string;
  campaignTitle: string;
  totalDonations: number;
  totalDisbursements: number;
  remainingLiability: number;
  donationCount: number;
  disbursementCount: number;
}

export default function LiabilityBalanceReportPage() {
  const [sortBy, setSortBy] = useState<"title" | "liability">("liability");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch liability balance per campaign
  const { data: report, isLoading } = useQuery({
    queryKey: ["liability-balance"],
    queryFn: async () => {
      const response = await api.get("/admin/reports/liability-balance");
      return response.data?.data || [];
    },
  });

  const campaigns = (report || []) as CampaignLiability[];

  // Sort campaigns
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    if (sortBy === "title") {
      return sortOrder === "asc"
        ? a.campaignTitle.localeCompare(b.campaignTitle)
        : b.campaignTitle.localeCompare(a.campaignTitle);
    } else {
      return sortOrder === "asc"
        ? a.remainingLiability - b.remainingLiability
        : b.remainingLiability - a.remainingLiability;
    }
  });

  // Calculate totals
  const totals = campaigns.reduce(
    (acc, campaign) => ({
      totalDonations: acc.totalDonations + campaign.totalDonations,
      totalDisbursements: acc.totalDisbursements + campaign.totalDisbursements,
      remainingLiability: acc.remainingLiability + campaign.remainingLiability,
    }),
    { totalDonations: 0, totalDisbursements: 0, remainingLiability: 0 }
  );

  const handleSort = (column: "title" | "liability") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Saldo Titipan Dana</h1>
          <p className="text-sm text-gray-600 mt-1">
            Menampilkan saldo titipan dana (liability) per campaign berdasarkan jurnal akuntansi
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Donasi Diterima</div>
            <div className="text-2xl font-bold text-success-600">
              {formatCurrency(totals.totalDonations)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Disalurkan</div>
            <div className="text-2xl font-bold text-primary-600">
              {formatCurrency(totals.totalDisbursements)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Saldo Titipan (Liability)</div>
            <div className="text-2xl font-bold text-warning-600">
              {formatCurrency(totals.remainingLiability)}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-2">
                      Campaign
                      {sortBy === "title" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Donasi Masuk
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Disalurkan
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("liability")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Sisa Titipan
                      {sortBy === "liability" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    % Disalurkan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : sortedCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Belum ada data transaksi
                    </td>
                  </tr>
                ) : (
                  sortedCampaigns.map((campaign) => {
                    const disbursementPercentage =
                      campaign.totalDonations > 0
                        ? (campaign.totalDisbursements / campaign.totalDonations) * 100
                        : 0;

                    return (
                      <tr key={campaign.campaignId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.campaignTitle}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {campaign.donationCount} donasi · {campaign.disbursementCount}{" "}
                            penyaluran
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-success-600">
                            {formatCurrency(campaign.totalDonations)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-primary-600">
                            {formatCurrency(campaign.totalDisbursements)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-warning-600">
                            {formatCurrency(campaign.remainingLiability)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {disbursementPercentage.toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Footer Totals */}
              {!isLoading && campaigns.length > 0 && (
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-6 py-4 font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-right font-bold text-success-600">
                      {formatCurrency(totals.totalDonations)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary-600">
                      {formatCurrency(totals.totalDisbursements)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-warning-600">
                      {formatCurrency(totals.remainingLiability)}
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      {totals.totalDonations > 0
                        ? ((totals.totalDisbursements / totals.totalDonations) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Tentang Saldo Titipan Dana
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Saldo titipan dana (liability) menunjukkan total donasi yang belum disalurkan untuk
                setiap campaign. Berdasarkan model akuntansi nonprofit, donasi dicatat sebagai
                kewajiban (liability) di akun 2210 - Titipan Dana Campaign. Saat dana disalurkan,
                kewajiban berkurang. Data ini dihitung dari jurnal ledger entries secara real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
