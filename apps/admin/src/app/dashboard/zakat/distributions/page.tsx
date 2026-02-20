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
import { useAuth } from "@/lib/auth";

const ASNAF_CATEGORIES = [
  { value: "fakir", label: "Fakir" },
  { value: "miskin", label: "Miskin" },
  { value: "amil", label: "Amil" },
  { value: "mualaf", label: "Mualaf" },
  { value: "riqab", label: "Riqab" },
  { value: "gharim", label: "Gharim" },
  { value: "fisabilillah", label: "Fisabilillah" },
  { value: "ibnus_sabil", label: "Ibnus Sabil" },
];

export default function ZakatDistributionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canCreate = !user?.roles?.includes("program_coordinator") || user?.roles?.includes("super_admin");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [zakatTypeFilter, setZakatTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [asnafFilter, setAsnafFilter] = useState("");

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

  // Fetch distributions from universal disbursements
  const { data: distributionsData, isLoading } = useQuery({
    queryKey: ["zakat-distributions"],
    queryFn: async () => {
      const response = await api.get("/admin/disbursements", {
        params: {
          disbursement_type: "zakat",
          limit: 1000
        },
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

  const asnafOptions = [
    { value: "", label: "Semua Asnaf" },
    ...ASNAF_CATEGORIES,
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "draft", label: "Draft" },
    { value: "approved", label: "Disetujui" },
    { value: "paid", label: "Tersalurkan" },
  ];

  // Filter distributions
  const filteredDistributions = distributionsData?.filter((distribution: any) => {
    const matchesSearch =
      searchQuery === "" ||
      distribution.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      distribution.purpose?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = zakatTypeFilter === "" || distribution.typeSpecificData?.zakatTypeId === zakatTypeFilter;
    const matchesStatus = statusFilter === "" || distribution.status === statusFilter;
    const matchesAsnaf = asnafFilter === "" || distribution.typeSpecificData?.asnaf === asnafFilter;

    return matchesSearch && matchesType && matchesStatus && matchesAsnaf;
  });

  // Pagination logic
  const totalItems = filteredDistributions?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDistributions = filteredDistributions?.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleView = (distribution: any) => {
    router.push(`/dashboard/disbursements/${distribution.id}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Penyaluran Zakat</h1>
          <p className="text-gray-600 mt-1">Kelola penyaluran dana zakat kepada 8 asnaf</p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => router.push("/dashboard/disbursements/create?type=zakat")}
          >
            <PlusIcon className="w-5 h-5" />
            Buat Penyaluran Baru
          </button>
        )}
      </div>

      {/* Filters Section */}
      <div className="filter-container">
        <div className="filter-group">
          <input
            type="text"
            className="form-input"
            placeholder="Cari penerima atau tujuan..."
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
            options={asnafOptions}
            value={asnafFilter}
            onChange={handleFilterChange(setAsnafFilter)}
            placeholder="Semua Asnaf"
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
              <th className="sortable">Penerima</th>
              <th className="sortable">Asnaf</th>
              <th className="sortable">Jenis Zakat</th>
              <th className="sortable">Jumlah</th>
              <th className="sortable">Status</th>
              <th className="sortable">Tanggal</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDistributions?.map((distribution: any) => {
              return (
                <tr key={distribution.id}>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">
                        {distribution.recipientName || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {distribution.purpose || "-"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-gray-900 capitalize">
                      {distribution.typeSpecificData?.asnaf || distribution.referenceName || "N/A"}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      {distribution.typeSpecificData?.zakatTypeName || "N/A"}
                    </div>
                  </td>
                  <td className="mono text-sm">Rp {formatRupiah(distribution.amount)}</td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        distribution.status === "paid"
                          ? "bg-success-50 text-success-700"
                          : distribution.status === "approved"
                          ? "bg-primary-50 text-primary-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {distribution.status === "paid"
                        ? "Tersalurkan"
                        : distribution.status === "approved"
                        ? "Disetujui"
                        : "Draft"}
                    </span>
                  </td>
                  <td className="text-gray-600 text-sm">
                    {format(new Date(distribution.createdAt), "EEEE, dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn action-view"
                        title="View"
                        onClick={() => handleView(distribution)}
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

        {filteredDistributions?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {distributionsData?.length === 0
                ? "Belum ada penyaluran zakat."
                : "Tidak ada penyaluran yang sesuai dengan filter."}
            </p>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="table-mobile-cards">
          {paginatedDistributions?.map((distribution: any) => {
            return (
              <div key={distribution.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title">
                      {distribution.recipientName || "N/A"}
                    </div>
                    <div className="table-card-header-subtitle">
                      {distribution.typeSpecificData?.asnaf || distribution.referenceName || "N/A"}
                    </div>
                  </div>
                  <span
                    className={`table-card-header-badge ${
                      distribution.status === "paid"
                        ? "bg-success-50 text-success-700"
                        : distribution.status === "approved"
                        ? "bg-primary-50 text-primary-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {distribution.status === "paid"
                      ? "Tersalurkan"
                      : distribution.status === "approved"
                      ? "Disetujui"
                      : "Draft"}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tujuan</span>
                  <span className="table-card-row-value">{distribution.purpose || "-"}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Jenis Zakat</span>
                  <span className="table-card-row-value">{distribution.typeSpecificData?.zakatTypeName || "N/A"}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Jumlah</span>
                  <span className="table-card-row-value mono">
                    Rp {formatRupiah(distribution.amount)}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal</span>
                  <span className="table-card-row-value">
                    {format(new Date(distribution.createdAt), "dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </span>
                </div>

                <div className="table-card-footer">
                  <button
                    className="action-btn action-view"
                    title="View"
                    onClick={() => handleView(distribution)}
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
