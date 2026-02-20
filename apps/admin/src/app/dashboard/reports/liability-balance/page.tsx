"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import ExportButton from "@/components/reports/ExportButton";
import { exportToExcel } from "@/utils/export-excel";

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

  const handleExportExcel = () => {
    exportToExcel({
      data: sortedCampaigns.map((c) => ({
        campaign: c.campaignTitle,
        donationCount: c.donationCount,
        disbursementCount: c.disbursementCount,
        totalDonations: c.totalDonations,
        totalDisbursements: c.totalDisbursements,
        remainingLiability: c.remainingLiability,
        percentage: c.totalDonations > 0
          ? `${((c.totalDisbursements / c.totalDonations) * 100).toFixed(1)}%`
          : "0%",
      })),
      columns: [
        { header: "Campaign", key: "campaign", width: 35 },
        { header: "Jml Donasi", key: "donationCount", width: 12, format: "number" },
        { header: "Jml Penyaluran", key: "disbursementCount", width: 14, format: "number" },
        { header: "Total Donasi", key: "totalDonations", width: 18, format: "currency" },
        { header: "Total Disalurkan", key: "totalDisbursements", width: 18, format: "currency" },
        { header: "Sisa Titipan", key: "remainingLiability", width: 18, format: "currency" },
        { header: "% Disalurkan", key: "percentage", width: 14 },
      ],
      filename: `Saldo-Titipan-Dana-${new Date().toISOString().slice(0, 10)}`,
      title: "Laporan Saldo Titipan Dana",
      summaryRow: {
        campaign: "TOTAL",
        totalDonations: totals.totalDonations,
        totalDisbursements: totals.totalDisbursements,
        remainingLiability: totals.remainingLiability,
        percentage: totals.totalDonations > 0
          ? `${((totals.totalDisbursements / totals.totalDonations) * 100).toFixed(1)}%`
          : "0%",
      },
    });
  };

  return (
    <div className="dashboard-container">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Saldo Titipan Dana</h1>
            <p className="text-sm text-gray-600 mt-1">
              Menampilkan saldo titipan dana (liability) per campaign berdasarkan jurnal akuntansi
            </p>
          </div>
          <ExportButton
            onExportExcel={handleExportExcel}
            onPrint={() => window.print()}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Donasi Diterima</div>
            <div className="text-2xl font-bold text-success-600 mono">
              Rp {formatRupiah(totals.totalDonations)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Disalurkan</div>
            <div className="text-2xl font-bold text-primary-600 mono">
              Rp {formatRupiah(totals.totalDisbursements)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600 mb-1">Saldo Titipan (Liability)</div>
            <div className="text-2xl font-bold text-warning-600 mono">
              Rp {formatRupiah(totals.remainingLiability)}
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-2">
                    Campaign
                    {sortBy === "title" && (
                      <span className="text-gray-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="text-right">Donasi Masuk</th>
                <th className="text-right">Disalurkan</th>
                <th
                  className="text-right cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("liability")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Sisa Titipan
                    {sortBy === "liability" && (
                      <span className="text-gray-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="text-center">% Disalurkan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">Loading...</td>
                </tr>
              ) : sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">Belum ada data transaksi</td>
                </tr>
              ) : (
                sortedCampaigns.map((campaign) => {
                  const pct = campaign.totalDonations > 0
                    ? (campaign.totalDisbursements / campaign.totalDonations) * 100
                    : 0;
                  return (
                    <tr key={campaign.campaignId} className="hover:bg-gray-50">
                      <td>
                        <div className="text-sm font-medium text-gray-900">{campaign.campaignTitle}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {campaign.donationCount} donasi · {campaign.disbursementCount} penyaluran
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-medium text-success-600 mono">
                          Rp {formatRupiah(campaign.totalDonations)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-medium text-primary-600 mono">
                          Rp {formatRupiah(campaign.totalDisbursements)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-bold text-warning-600 mono">
                          Rp {formatRupiah(campaign.remainingLiability)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!isLoading && campaigns.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="font-bold text-gray-900">TOTAL</td>
                  <td className="text-right font-bold text-success-600 mono">Rp {formatRupiah(totals.totalDonations)}</td>
                  <td className="text-right font-bold text-primary-600 mono">Rp {formatRupiah(totals.totalDisbursements)}</td>
                  <td className="text-right font-bold text-warning-600 mono">Rp {formatRupiah(totals.remainingLiability)}</td>
                  <td className="text-center font-bold">
                    {totals.totalDonations > 0
                      ? ((totals.totalDisbursements / totals.totalDonations) * 100).toFixed(1)
                      : 0}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="table-mobile-cards">
          {sortedCampaigns.map((campaign) => {
            const pct = campaign.totalDonations > 0
              ? (campaign.totalDisbursements / campaign.totalDonations) * 100
              : 0;
            return (
              <div key={campaign.campaignId} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title">{campaign.campaignTitle}</div>
                    <div className="table-card-header-subtitle">
                      {campaign.donationCount} donasi · {campaign.disbursementCount} penyaluran
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-row-label">Donasi Masuk</span>
                  <span className="table-card-row-value mono text-success-600 font-medium">
                    Rp {formatRupiah(campaign.totalDonations)}
                  </span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-row-label">Disalurkan</span>
                  <span className="table-card-row-value mono text-primary-600 font-medium">
                    Rp {formatRupiah(campaign.totalDisbursements)}
                  </span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-row-label">Sisa Titipan</span>
                  <span className="table-card-row-value mono text-warning-600 font-bold">
                    Rp {formatRupiah(campaign.remainingLiability)}
                  </span>
                </div>
              </div>
            );
          })}

          {!isLoading && sortedCampaigns.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada data transaksi</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">Tentang Saldo Titipan Dana</h3>
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
