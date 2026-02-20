"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
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
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const statusBadgeMap: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  partial: "bg-primary-50 text-primary-700",
  paid: "bg-success-50 text-success-700",
  cancelled: "bg-gray-100 text-gray-700",
};

const getStatusBadgeClass = (status: string) => {
  const normalized = status?.toLowerCase() || "";
  return statusBadgeMap[normalized] || "bg-gray-100 text-gray-700";
};

export default function ZakatDonationsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [zakatTypeFilter, setZakatTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: zakatTypesData } = useQuery({
    queryKey: ["admin-zakat-type-options"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { page: 1, limit: 100 },
      });
      return response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const zakatTypeOptions = useMemo(() => {
    const base = [{ value: "", label: "Semua Jenis Zakat" }];
    if (!zakatTypesData) {
      return base;
    }

    return [
      ...base,
      ...zakatTypesData.map((type: any) => ({
        value: type.id,
        label: type.name,
      })),
    ];
  }, [zakatTypesData]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{
    data: any[];
    pagination: { total: number; totalPages: number; page: number; limit: number };
  }>({
    queryKey: [
      "zakat-donations",
      currentPage,
      statusFilter,
      zakatTypeFilter,
      searchQuery,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params: any = {
        product_type: "zakat",
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (statusFilter) params.status = statusFilter;
      if (zakatTypeFilter) params.product_id = zakatTypeFilter;
      if (searchQuery) params.donor_email = searchQuery;

      const response = await api.get("/transactions", { params });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? transactions.length;
  const totalPages = pagination?.totalPages ?? 0;

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleDateChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setZakatTypeFilter("");
    setSearchInput("");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const renderStatusBadge = (status: string) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(status)}`}>
      {status || "unknown"}
    </span>
  );

  if (isLoading && !data) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
            <p className="text-gray-600">Gagal memuat data transaksi.</p>
            <button className="btn btn-secondary btn-md" onClick={() => refetch()}>
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFilterApplied = Boolean(
    statusFilter ||
      zakatTypeFilter ||
      searchQuery ||
      startDate ||
      endDate
  );

  const isEmptyState = !isFetching && transactions.length === 0;

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Zakat</h1>
          <p className="text-gray-600 mt-1">Semua transaksi pembayaran zakat</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => router.push("/dashboard/transactions/create?product_type=zakat")}
        >
          <PlusIcon className="w-5 h-5" />
          Catat Pembayaran Baru
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <input
            type="text"
            className="form-input flex-1"
            placeholder="Cari email muzaki..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-md">
            Cari
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="filter-container">
        <div className="filter-group">
          <Autocomplete
            options={zakatTypeOptions}
            value={zakatTypeFilter}
            onChange={handleFilterChange(setZakatTypeFilter)}
            placeholder="Semua Jenis Zakat"
          />
        </div>

        <div className="filter-group">
          <Autocomplete
            options={statusOptions}
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            placeholder="Semua Status"
          />
        </div>

        <div className="filter-group">
          <input
            type="date"
            className="form-input"
            placeholder="Tanggal Mulai"
            value={startDate}
            onChange={handleDateChange(setStartDate)}
            max={endDate || undefined}
          />
        </div>

        <div className="filter-group">
          <input
            type="date"
            className="form-input"
            placeholder="Tanggal Akhir"
            value={endDate}
            onChange={handleDateChange(setEndDate)}
            min={startDate || undefined}
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
              <th>No. Transaksi</th>
              <th>Muzaki</th>
              <th>Jenis Zakat</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isEmptyState ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  {isFilterApplied
                    ? "Tidak ada transaksi yang sesuai dengan filter saat ini"
                    : "Belum ada transaksi"}
                </td>
              </tr>
            ) : (
              transactions.map((transaction: any) => (
                <tr key={transaction.id}>
                  <td>
                    <div className="font-mono text-sm font-semibold text-gray-900">
                      {transaction.transactionNumber}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">
                      {transaction.donorName}
                      {transaction.isAnonymous && (
                        <span className="ml-2 text-xs text-warning-600 font-normal">(Anonim)</span>
                      )}
                    </div>
                    {transaction.donorEmail && (
                      <div className="text-xs text-gray-500">{transaction.donorEmail}</div>
                    )}
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      {transaction.productName}
                    </div>
                  </td>
                  <td className="mono text-sm">
                    Rp {formatRupiah(transaction.totalAmount)}
                  </td>
                  <td>{renderStatusBadge(transaction.paymentStatus)}</td>
                  <td className="text-gray-600 text-sm">
                    {format(new Date(transaction.createdAt), "dd MMM yyyy, HH:mm", {
                      locale: idLocale,
                    })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-btn action-view"
                        onClick={() => router.push(`/dashboard/transactions/${transaction.id}`)}
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
            {isFilterApplied
              ? "Tidak ada transaksi yang sesuai dengan filter saat ini"
              : "Belum ada transaksi"}
          </div>
        ) : (
          transactions.map((transaction: any) => (
            <div key={transaction.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">
                    {transaction.donorName}
                    {transaction.isAnonymous && (
                      <span className="ml-1 text-xs text-warning-600 font-normal">(Anonim)</span>
                    )}
                  </div>
                  <div className="table-card-header-subtitle">
                    {transaction.transactionNumber}
                  </div>
                </div>
                <span
                  className={`table-card-header-badge ${getStatusBadgeClass(
                    transaction.paymentStatus
                  )}`}
                >
                  {transaction.paymentStatus || "unknown"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Jenis Zakat</span>
                <span className="table-card-row-value">{transaction.productName}</span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Nominal</span>
                <span className="table-card-row-value mono">
                  Rp {formatRupiah(transaction.totalAmount)}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Dibuat</span>
                <span className="table-card-row-value">
                  {format(new Date(transaction.createdAt), "dd MMM yyyy, HH:mm", {
                    locale: idLocale,
                  })}
                </span>
              </div>

              <div className="table-card-footer">
                <button
                  type="button"
                  className="action-btn action-view"
                  onClick={() => router.push(`/dashboard/transactions/${transaction.id}`)}
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
