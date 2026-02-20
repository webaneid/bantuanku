"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";

const ITEMS_PER_PAGE = 10;

const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

const statusBadgeMap: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  verified: "bg-success-50 text-success-700",
  rejected: "bg-danger-50 text-danger-700",
  suspended: "bg-gray-100 text-gray-700",
};

const getStatusBadgeClass = (status: string) => {
  return statusBadgeMap[status?.toLowerCase() || ""] || "bg-gray-100 text-gray-700";
};

const programStatusBadgeMap: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-success-50 text-success-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-danger-50 text-danger-700",
  inactive: "bg-gray-100 text-gray-700",
};

const getProgramStatusBadgeClass = (status: string) => {
  return programStatusBadgeMap[status?.toLowerCase() || ""] || "bg-gray-100 text-gray-700";
};

const getProgramTypeLabel = (programType?: string) => {
  if (programType === "zakat") return "Zakat";
  if (programType === "qurban") return "Qurban";
  return "Campaign";
};

export default function MitraPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isMitra = user?.roles?.includes("mitra") && user.roles.length === 1;
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mitra: fetch data sendiri via /me
  const { data: mitraMe, isLoading: mitraMeLoading } = useQuery({
    queryKey: ["mitra-me"],
    queryFn: async () => {
      const response = await api.get("/admin/mitra/me");
      return response.data?.data;
    },
    enabled: isMitra,
  });

  // Admin: fetch stats & list
  const { data: statsData } = useQuery({
    queryKey: ["mitra-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/mitra/stats");
      return response.data?.data;
    },
    enabled: !isMitra,
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["mitra", currentPage, statusFilter, searchQuery],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await api.get("/admin/mitra", { params });
      return response.data;
    },
    placeholderData: keepPreviousData,
    enabled: !isMitra,
  });

  // === Mitra Dashboard View ===
  if (isMitra) {
    if (mitraMeLoading) {
      return (
        <div className="dashboard-container">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!mitraMe) {
      return (
        <div className="dashboard-container">
          <div className="card">
            <div className="text-center py-12 text-gray-500">
              Data mitra tidak ditemukan untuk akun ini.
            </div>
          </div>
        </div>
      );
    }

    const programs = mitraMe.programs || mitraMe.campaigns || [];

    const goToProgramDetail = (program: any) => {
      if (program.programType === "zakat") {
        router.push(`/dashboard/zakat/types/${program.id}/edit`);
        return;
      }
      if (program.programType === "qurban") {
        router.push(`/dashboard/qurban/packages/${program.id}/edit`);
        return;
      }
      router.push(`/dashboard/campaigns/${program.id}`);
    };

    return (
      <div className="dashboard-container">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Mitra</h1>
          <p className="text-gray-600 mt-1">Selamat datang, {mitraMe.name}</p>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClass(mitraMe.status)}`}>
            Status: {mitraMe.status}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Program</div>
            <div className="text-2xl font-bold text-gray-900">{mitraMe.totalPrograms || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Donasi Masuk</div>
            <div className="text-2xl font-bold text-primary-600">Rp {formatRupiah(mitraMe.totalDonationReceived || 0)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Bagi Hasil</div>
            <div className="text-2xl font-bold text-success-600">Rp {formatRupiah(mitraMe.totalRevenueEarned || 0)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Saldo</div>
            <div className="text-2xl font-bold text-gray-900">Rp {formatRupiah(mitraMe.currentBalance || 0)}</div>
          </div>
        </div>

        {/* Program List */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Program Saya</h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Nama Program</th>
                  <th>Status</th>
                  <th>Target</th>
                  <th>Terkumpul</th>
                  <th>Donatur/Order</th>
                </tr>
              </thead>
              <tbody>
                {programs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Belum ada program
                    </td>
                  </tr>
                ) : (
                  programs.map((program: any) => (
                    <tr key={`${program.programType || "campaign"}-${program.id}`}>
                      <td className="text-sm text-gray-700">{getProgramTypeLabel(program.programType)}</td>
                      <td>
                        <button
                          type="button"
                          className="font-medium text-gray-900 hover:text-primary-600 text-left"
                          onClick={() => goToProgramDetail(program)}
                        >
                          {program.title}
                        </button>
                      </td>
                      <td>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProgramStatusBadgeClass(program.status)}`}>
                          {program.status}
                        </span>
                      </td>
                      <td className="mono text-sm">
                        {program.programType === "campaign" ? `Rp ${formatRupiah(program.goal || 0)}` : "-"}
                      </td>
                      <td className="mono text-sm">
                        {program.programType === "campaign" || program.programType === "zakat" || program.programType === "qurban"
                          ? `Rp ${formatRupiah(program.collected || 0)}`
                          : "-"}
                      </td>
                      <td className="text-sm">
                        {program.programType === "campaign" || program.programType === "zakat" || program.programType === "qurban"
                          ? (program.donorCount || 0)
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const mitraList = data?.data || [];
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
  const isEmptyState = !isFetching && mitraList.length === 0;

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
            <p className="text-gray-600">Gagal memuat data mitra.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Mitra Lembaga</h1>
          <p className="text-gray-600 mt-1">Kelola mitra dan lembaga yang bermitra</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => router.push("/dashboard/mitra/create")}
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Mitra
        </button>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Mitra</div>
            <div className="text-2xl font-bold text-gray-900">{statsData.totalMitra || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Verified</div>
            <div className="text-2xl font-bold text-success-600">{statsData.verifiedMitra || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-gray-900">{statsData.pendingMitra || 0}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Donasi Masuk</div>
            <div className="text-2xl font-bold text-primary-600">Rp {formatRupiah(statsData.totalDonationReceived || 0)}</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            className="form-input flex-1"
            placeholder="Cari nama mitra..."
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
              <th>Nama Lembaga</th>
              <th>PIC</th>
              <th>Email</th>
              <th>Lokasi</th>
              <th>Status</th>
              <th>Program</th>
              <th>Total Donasi</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isEmptyState ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  {isFilterApplied
                    ? "Tidak ada mitra yang sesuai filter"
                    : "Belum ada mitra"}
                </td>
              </tr>
            ) : (
              mitraList.map((m: any) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {m.logoUrl ? (
                        <img
                          src={m.logoUrl}
                          alt={m.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {m.name?.charAt(0)?.toUpperCase() || "M"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{m.picName || "-"}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">{m.email || "-"}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">
                      {[m.regencyName, m.provinceName].filter(Boolean).join(", ") || "-"}
                    </div>
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="text-sm">{m.totalPrograms || 0}</td>
                  <td className="mono text-sm">Rp {formatRupiah(m.totalDonationReceived || 0)}</td>
                  <td className="text-gray-600 text-sm">
                    {format(new Date(m.createdAt), "dd MMM yyyy", { locale: idLocale })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-btn action-view"
                        onClick={() => router.push(`/dashboard/mitra/${m.id}`)}
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
            {isFilterApplied ? "Tidak ada mitra yang sesuai filter" : "Belum ada mitra"}
          </div>
        ) : (
          mitraList.map((m: any) => (
            <div key={m.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">
                    {m.name}
                  </div>
                  <div className="table-card-header-subtitle">{m.picName || "-"}</div>
                </div>
                <span className={`table-card-header-badge ${getStatusBadgeClass(m.status)}`}>
                  {m.status}
                </span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Email</span>
                <span className="table-card-row-value">{m.email || "-"}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Lokasi</span>
                <span className="table-card-row-value">
                  {[m.regencyName, m.provinceName].filter(Boolean).join(", ") || "-"}
                </span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Program</span>
                <span className="table-card-row-value">{m.totalPrograms || 0}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Total Donasi</span>
                <span className="table-card-row-value mono">Rp {formatRupiah(m.totalDonationReceived || 0)}</span>
              </div>
              <div className="table-card-row">
                <span className="table-card-row-label">Dibuat</span>
                <span className="table-card-row-value">
                  {format(new Date(m.createdAt), "dd MMM yyyy", { locale: idLocale })}
                </span>
              </div>
              <div className="table-card-footer">
                <button
                  type="button"
                  className="action-btn action-view"
                  onClick={() => router.push(`/dashboard/mitra/${m.id}`)}
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
