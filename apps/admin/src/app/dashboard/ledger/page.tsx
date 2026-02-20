/**
 * @deprecated This ledger system is deprecated. Use /dashboard/disbursements instead.
 * This page is read-only for historical data only.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  BanknotesIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type StatusFilter = "all" | "draft" | "submitted" | "approved" | "rejected" | "paid";

export default function LedgerPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["ledger", statusFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 50 };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await api.get("/admin/ledger", { params });
      return response.data;
    },
  });

  const ledger = data?.data || [];

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-primary-50 text-primary-700",
      approved: "bg-success-50 text-success-700",
      rejected: "bg-danger-50 text-danger-700",
      paid: "bg-success-50 text-success-700",
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status] || badges.draft}`}>
        {status}
      </span>
    );
  };

  const statusTabs = [
    { key: "all", label: "All", count: ledger.length },
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Submitted" },
    { key: "approved", label: "Approved" },
    { key: "paid", label: "Paid" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
          <p className="text-gray-600 mt-1">Kelola catatan transaksi keuangan</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/ledger/create")}
          className="btn btn-primary btn-md"
        >
          <PlusIcon className="w-5 h-5" />
          Buat Pengajuan
        </button>
      </div>

      {/* Deprecation Warning */}
      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-warning-800">Sistem Lama - Data Read-Only</h3>
            <p className="text-sm text-warning-700 mt-1">
              Halaman ini menampilkan data historis ledger lama. Untuk membuat pengeluaran baru, gunakan{" "}
              <a href="/dashboard/disbursements" className="font-medium underline">
                Sistem Disbursement Terbaru
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as StatusFilter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.key
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Referensi</th>
              <th>Campaign</th>
              <th>Penerima</th>
              <th>Jumlah</th>
              <th>Akun Beban</th>
              <th>Status</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry: any) => (
              <tr key={entry.id}>
                <td>
                  <div className="font-mono text-sm font-medium text-gray-900">
                    {entry.referenceId}
                  </div>
                </td>
                <td>
                  <div className="font-medium text-gray-900">
                    {entry.campaign?.title || "-"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.purpose}
                  </div>
                </td>
                <td>
                  <div className="text-sm text-gray-900">
                    {entry.recipientName || "-"}
                  </div>
                  {entry.recipientBank && (
                    <div className="text-xs text-gray-500">
                      {entry.recipientBank} - {entry.recipientAccount}
                    </div>
                  )}
                </td>
                <td className="mono text-sm">
                  Rp {formatRupiah(entry.amount)}
                </td>
                <td>
                  <div className="text-sm text-gray-900">
                    {entry.expenseAccount?.name || "-"}
                  </div>
                  <div className="text-xs text-gray-500 mono">
                    {entry.expenseAccount?.code}
                  </div>
                </td>
                <td>{getStatusBadge(entry.status)}</td>
                <td className="text-gray-600 text-sm">
                  {format(new Date(entry.createdAt), "dd MMM yyyy", { locale: idLocale })}
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      onClick={() => router.push(`/dashboard/ledger/${entry.id}`)}
                      className="action-btn action-view"
                      title="Lihat Detail"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    {entry.status === "draft" && (
                      <>
                        <button
                          onClick={() => router.push(`/dashboard/ledger/${entry.id}/edit`)}
                          className="action-btn action-edit"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="action-btn action-delete" title="Hapus">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {entry.status === "submitted" && (
                      <>
                        <button className="action-btn action-view" title="Approve">
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button className="action-btn action-delete" title="Reject">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {entry.status === "approved" && (
                      <button className="action-btn action-view" title="Mark as Paid">
                        <BanknotesIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {ledger.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada data catatan</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {ledger.map((entry: any) => (
          <div key={entry.id} className="table-card">
            <div className="table-card-header">
              <div className="table-card-header-left">
                <div className="table-card-header-title mono">
                  {entry.referenceId}
                </div>
                <div className="table-card-header-subtitle">
                  {entry.campaign?.title || "-"}
                </div>
              </div>
              {getStatusBadge(entry.status)}
            </div>

            <div className="table-card-row">
              <span className="table-card-row-label">Penerima</span>
              <span className="table-card-row-value">
                {entry.recipientName || "-"}
              </span>
            </div>

            <div className="table-card-row">
              <span className="table-card-row-label">Jumlah</span>
              <span className="table-card-row-value mono">
                Rp {formatRupiah(entry.amount)}
              </span>
            </div>

            <div className="table-card-row">
              <span className="table-card-row-label">Akun Beban</span>
              <span className="table-card-row-value">
                {entry.expenseAccount?.name || "-"}
              </span>
            </div>

            <div className="table-card-row">
              <span className="table-card-row-label">Tanggal</span>
              <span className="table-card-row-value">
                {format(new Date(entry.createdAt), "dd MMM yyyy", { locale: idLocale })}
              </span>
            </div>

            <div className="table-card-footer">
              <button
                onClick={() => router.push(`/dashboard/ledger/${entry.id}`)}
                className="action-btn action-view"
                title="Lihat Detail"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
              {entry.status === "draft" && (
                <>
                  <button
                    onClick={() => router.push(`/dashboard/ledger/${entry.id}/edit`)}
                    className="action-btn action-edit"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button className="action-btn action-delete" title="Hapus">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </>
              )}
              {entry.status === "submitted" && (
                <>
                  <button className="action-btn action-view" title="Approve">
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button className="action-btn action-delete" title="Reject">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </>
              )}
              {entry.status === "approved" && (
                <button className="action-btn action-view" title="Mark as Paid">
                  <BanknotesIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {ledger.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Tidak ada data catatan</p>
          </div>
        )}
      </div>
    </div>
  );
}
