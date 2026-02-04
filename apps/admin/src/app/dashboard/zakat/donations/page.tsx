"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import { formatRupiah } from "@/lib/format";

export default function ZakatDonationsPage() {
  const router = useRouter();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [zakatTypeFilter, setZakatTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch zakat types for filter
  const { data: typesData } = useQuery({
    queryKey: ["zakat-types-active"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { isActive: "true", limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch donations
  const { data: donationsData, isLoading } = useQuery({
    queryKey: ["zakat-donations"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/donations", {
        params: { limit: 1000 },
      });
      return response.data?.data || [];
    },
  });

  // Filter options
  const zakatTypeOptions = [
    { value: "", label: "Semua Jenis Zakat" },
    ...(typesData || []).map((type: any) => ({
      value: type.id,
      label: `${type.icon || ""} ${type.name}`,
    })),
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "success", label: "Berhasil" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Gagal" },
    { value: "expired", label: "Kadaluarsa" },
  ];

  // Filter donations
  const filteredDonations = donationsData?.filter((donation: any) => {
    const matchesSearch =
      searchQuery === "" ||
      donation.donaturName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.donaturEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = zakatTypeFilter === "" || donation.zakatTypeId === zakatTypeFilter;
    const matchesStatus = statusFilter === "" || donation.paymentStatus === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination logic
  const totalItems = filteredDonations?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDonations = filteredDonations?.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleView = (donation: any) => {
    router.push(`/dashboard/zakat/donations/${donation.id}`);
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembayaran Zakat</h1>
          <p className="text-gray-600 mt-1">Kelola dan pantau pembayaran zakat yang masuk</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => router.push("/dashboard/zakat/donations/new")}
        >
          <PlusIcon className="w-5 h-5" />
          Catat Pembayaran Baru
        </button>
      </div>

      {/* Filters Section */}
      <div className="filter-container">
        <div className="filter-group">
          <input
            type="text"
            className="form-input"
            placeholder="Cari nama atau email donatur..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

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
      </div>

      <div className="table-container">
        {/* Desktop Table View */}
        <table className="table">
          <thead>
            <tr>
              <th className="sortable">Donatur</th>
              <th className="sortable">Jenis Zakat</th>
              <th className="sortable">Jumlah</th>
              <th className="sortable">Status</th>
              <th className="sortable">Tanggal</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDonations?.map((donation: any) => {
              return (
                <tr key={donation.id}>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">
                        {donation.donaturName || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {donation.donaturEmail || "-"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900">
                      {donation.zakatTypeName || "N/A"}
                    </div>
                  </td>
                  <td className="mono text-sm">Rp {formatRupiah(donation.amount)}</td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        donation.paymentStatus === "success"
                          ? "bg-success-50 text-success-700"
                          : donation.paymentStatus === "pending"
                          ? "bg-warning-50 text-warning-700"
                          : donation.paymentStatus === "failed"
                          ? "bg-danger-50 text-danger-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {donation.paymentStatus === "success"
                        ? "Berhasil"
                        : donation.paymentStatus === "pending"
                        ? "Pending"
                        : donation.paymentStatus === "failed"
                        ? "Gagal"
                        : "Kadaluarsa"}
                    </span>
                  </td>
                  <td className="text-gray-600 text-sm">
                    {format(new Date(donation.createdAt), "EEEE, dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn action-view"
                        title="View"
                        onClick={() => handleView(donation)}
                      >
                        <EyeIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDonations?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {donationsData?.length === 0
                ? "Belum ada pembayaran zakat."
                : "Tidak ada pembayaran yang sesuai dengan filter."}
            </p>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="table-mobile-cards">
          {paginatedDonations?.map((donation: any) => {
            return (
              <div key={donation.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title">
                      {donation.donaturName || "N/A"}
                    </div>
                    <div className="table-card-header-subtitle">
                      {donation.zakatTypeName || "N/A"}
                    </div>
                  </div>
                  <span
                    className={`table-card-header-badge ${
                      donation.paymentStatus === "success"
                        ? "bg-success-50 text-success-700"
                        : donation.paymentStatus === "pending"
                        ? "bg-warning-50 text-warning-700"
                        : donation.paymentStatus === "failed"
                        ? "bg-danger-50 text-danger-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {donation.paymentStatus === "success"
                      ? "Berhasil"
                      : donation.paymentStatus === "pending"
                      ? "Pending"
                      : donation.paymentStatus === "failed"
                      ? "Gagal"
                      : "Kadaluarsa"}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Email</span>
                  <span className="table-card-row-value">{donation.donaturEmail || "-"}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Jumlah</span>
                  <span className="table-card-row-value mono">
                    Rp {formatRupiah(donation.amount)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal</span>
                  <span className="table-card-row-value">
                    {format(new Date(donation.createdAt), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </span>
                </div>

                <div className="table-card-footer">
                  <button
                    className="action-btn action-view"
                    title="View"
                    onClick={() => handleView(donation)}
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}
      </div>
    </main>
  );
}
