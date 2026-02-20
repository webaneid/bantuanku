"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import Autocomplete, { type AutocompleteOption } from "@/components/Autocomplete";
import { getCategoryLabel } from "@/lib/category-utils";
import { useAuth } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Diajukan",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Dibayar",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-primary-50 text-primary-700",
  approved: "bg-success-50 text-success-700",
  rejected: "bg-danger-50 text-danger-700",
  paid: "bg-success-50 text-success-700",
};

type FilterView = "all" | "pending" | "approved";

export default function DisbursementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  const [page, setPage] = useState(1);
  const [activeView, setActiveView] = useState<FilterView>("all");
  const [filters, setFilters] = useState({
    disbursement_type: "",
    status: "",
    category: "",
  });

  useEffect(() => {
    const view = searchParams.get("view") as FilterView;
    if (view === "pending" || view === "approved") {
      setActiveView(view);
    } else {
      setActiveView("all");
    }
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["disbursements", page, filters, activeView],
    queryFn: async () => {
      const statusFilter =
        activeView === "pending" ? "submitted" :
        activeView === "approved" ? "approved" :
        filters.status;

      const response = await api.get("/admin/disbursements", {
        params: {
          page,
          limit: 20,
          ...filters,
          status: statusFilter,
        },
      });
      return response.data;
    },
  });

  const disbursements = data?.data || [];
  const pagination = data?.pagination || {};

  const typeOptions: AutocompleteOption[] = [
    { value: "", label: "Semua Tipe" },
    { value: "campaign", label: "Campaign" },
    { value: "zakat", label: "Zakat" },
    { value: "qurban", label: "Qurban" },
    { value: "operational", label: "Operational" },
    { value: "vendor", label: "Vendor" },
    { value: "revenue_share", label: "Revenue Share" },
  ];

  const statusOptions: AutocompleteOption[] = [
    { value: "", label: "Semua Status" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Diajukan" },
    { value: "approved", label: "Disetujui" },
    { value: "rejected", label: "Ditolak" },
    { value: "paid", label: "Dibayar" },
  ];

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDisbursementType = (type: string) => {
    const map: Record<string, string> = {
      campaign: "Campaign",
      zakat: "Zakat",
      qurban: "Qurban",
      operational: "Operational",
      vendor: "Vendor",
      revenue_share: "Revenue Share",
    };
    return map[type] || type;
  };

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pencairan Dana</h1>
          <p className="text-gray-600 mt-1">{isCoordinator ? "Daftar pencairan dana untuk Anda" : isMitra ? "Daftar pencairan dana program Anda" : isEmployeeOnly ? "Daftar pencairan dana untuk Anda" : "Kelola semua pencairan dana"}</p>
        </div>
        <Link
          href="/dashboard/disbursements/create"
          className="btn btn-primary"
        >
          <PlusIcon className="w-5 h-5" />
          {isCoordinator || isMitra || isEmployeeOnly ? "Ajukan Pencairan" : "Buat Pencairan"}
        </Link>
      </div>

      {/* Submenu Tabs - hidden for coordinator, employee and mitra */}
      {!isCoordinator && !isMitra && !isEmployeeOnly && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => {
                router.push("/dashboard/disbursements");
                setPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === "all"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Semua Pencairan
            </button>
            <button
              onClick={() => {
                router.push("/dashboard/disbursements?view=pending");
                setPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === "pending"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pengajuan
            </button>
            <button
              onClick={() => {
                router.push("/dashboard/disbursements?view=approved");
                setPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === "approved"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Disetujui
            </button>
          </nav>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
            <Autocomplete
              options={typeOptions}
              value={filters.disbursement_type}
              onChange={(value) => {
                setFilters({ ...filters, disbursement_type: value });
                setPage(1);
              }}
              placeholder="Pilih Tipe"
            />
          </div>
          {activeView === "all" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Autocomplete
                options={statusOptions}
                value={filters.status}
                onChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setPage(1);
                }}
                placeholder="Pilih Status"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : disbursements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Tidak ada data pencairan</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Tipe / Kategori</th>
                  <th>Penerima</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {disbursements.map((d: any) => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium text-gray-900">{d.disbursementNumber}</div>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{formatDisbursementType(d.disbursementType)}</div>
                      <div className="text-sm text-gray-500">{getCategoryLabel(d.category)}</div>
                    </td>
                    <td>{d.recipientName}</td>
                    <td className="mono text-sm">Rp {formatRupiah(d.amount)}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[d.status]}`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td className="text-gray-600 text-sm">{formatDate(d.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="action-btn action-view"
                          onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                          title="Lihat Detail"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="table-mobile-cards">
            {disbursements.map((d: any) => (
              <div key={d.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title">{d.disbursementNumber}</div>
                    <div className="table-card-header-subtitle">{formatDisbursementType(d.disbursementType)}</div>
                  </div>
                  <span className={`table-card-header-badge ${STATUS_COLORS[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Kategori</span>
                  <span className="table-card-row-value">{getCategoryLabel(d.category)}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Penerima</span>
                  <span className="table-card-row-value">{d.recipientName}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Jumlah</span>
                  <span className="table-card-row-value mono">Rp {formatRupiah(d.amount)}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal</span>
                  <span className="table-card-row-value">{formatDate(d.createdAt)}</span>
                </div>

                <div className="table-card-footer">
                  <button
                    className="action-btn action-view"
                    onClick={() => router.push(`/dashboard/disbursements/${d.id}`)}
                    title="Lihat Detail"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Halaman {pagination.page} dari {pagination.totalPages} · Total {pagination.total} data
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
