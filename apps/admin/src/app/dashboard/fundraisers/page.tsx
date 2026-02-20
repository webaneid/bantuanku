"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";

const ITEMS_PER_PAGE = 10;

const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const statusBadgeMap: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  active: "bg-success-50 text-success-700",
  suspended: "bg-red-50 text-red-700",
};

const getStatusBadgeClass = (status: string) => {
  return statusBadgeMap[status?.toLowerCase() || ""] || "bg-gray-100 text-gray-700";
};

export default function FundraisersPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["fundraiser-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/stats");
      return response.data?.data;
    },
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["fundraisers", currentPage, statusFilter, searchQuery],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await api.get("/admin/fundraisers", { params });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const fundraisers = data?.data || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const isFilterApplied = Boolean(statusFilter || searchQuery);
  const isEmptyState = !isFetching && fundraisers.length === 0;

  if (isLoading && !data) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dashboard-container">
        <div className="card">
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-600">Gagal memuat data fundraiser.</p>
            <button className="btn btn-secondary btn-md" onClick={() => refetch()}>
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fundraisers</h1>
          <p className="text-gray-600 mt-1">Kelola penggalang dana dan referral</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => router.push("/dashboard/fundraisers/create")}
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Fundraiser
        </button>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Fundraiser</div>
            <div className="text-2xl font-bold text-gray-900">{statsData.totalFundraisers || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Aktif</div>
            <div className="text-2xl font-bold text-success-600">{statsData.activeFundraisers || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Referral</div>
            <div className="text-2xl font-bold text-gray-900">{statsData.totalReferrals || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Donasi</div>
            <div className="text-2xl font-bold text-primary-600">Rp {formatRupiah(statsData.totalDonationAmount || 0)}</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            className="form-input flex-1"
            placeholder="Cari kode fundraiser..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-md">Cari</button>
        </form>
      </div>

      {/* Filters */}
      <div className="filter-container">
        <div className="filter-group">
          <Autocomplete
            options={statusOptions}
            value={statusFilter}
            onChange={(value: string) => { setStatusFilter(value); setCurrentPage(1); }}
            placeholder="Semua Status"
          />
        </div>
        <div className="filter-group">
          <button
            type="button"
            className="btn btn-secondary btn-md w-full"
            onClick={handleResetFilters}
            disabled={!isFilterApplied && searchInput === ""}
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Status</th>
              <th>Total Referral</th>
              <th>Total Donasi</th>
              <th>Komisi</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isEmptyState ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  {isFilterApplied
                    ? "Tidak ada fundraiser yang sesuai filter"
                    : "Belum ada fundraiser"}
                </td>
              </tr>
            ) : (
              fundraisers.map((f: any) => (
                <tr key={f.id}>
                  <td>
                    <span className="font-mono text-sm font-semibold text-gray-900">{f.code}</span>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">
                      {f.donaturName || f.employeeName || "-"}
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-gray-600">
                      {f.donaturId ? "Donatur" : "Employee"}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(f.status)}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="text-sm">{f.totalReferrals || 0}</td>
                  <td className="mono text-sm">Rp {formatRupiah(f.totalDonationAmount || 0)}</td>
                  <td className="mono text-sm">Rp {formatRupiah(f.totalCommissionEarned || 0)}</td>
                  <td className="text-gray-600 text-sm">
                    {format(new Date(f.createdAt), "dd MMM yyyy", { locale: idLocale })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-btn action-view"
                        onClick={() => router.push(`/dashboard/fundraisers/${f.id}`)}
                        title="Lihat detail"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {isEmptyState ? (
          <div className="text-center py-12 text-gray-500">
            {isFilterApplied ? "Tidak ada fundraiser yang sesuai filter" : "Belum ada fundraiser"}
          </div>
        ) : (
          fundraisers.map((f: any) => (
            <div key={f.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">
                    {f.donaturName || f.employeeName || "-"}
                  </div>
                  <div className="table-card-header-subtitle font-mono">{f.code}</div>
                </div>
                <span className={`table-card-header-badge ${getStatusBadgeClass(f.status)}`}>
                  {f.status}
                </span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Tipe</span>
                <span className="table-card-row-value">{f.donaturId ? "Donatur" : "Employee"}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Total Referral</span>
                <span className="table-card-row-value">{f.totalReferrals || 0}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Total Donasi</span>
                <span className="table-card-row-value mono">Rp {formatRupiah(f.totalDonationAmount || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Komisi</span>
                <span className="table-card-row-value mono">Rp {formatRupiah(f.totalCommissionEarned || 0)}</span>
              </div>
              <div className="table-card-footer">
                <button
                  type="button"
                  className="action-btn action-view"
                  onClick={() => router.push(`/dashboard/fundraisers/${f.id}`)}
                  title="Lihat detail"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
