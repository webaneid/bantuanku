"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { EyeIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/Modal";
import FeedbackDialog from "@/components/FeedbackDialog";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";

export default function ActivityReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [referenceTypeFilter, setReferenceTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const showFeedback = (type: "success" | "error", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  // Fetch activity reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["activity-reports", referenceTypeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (referenceTypeFilter) params.append("reference_type", referenceTypeFilter);
      if (statusFilter) params.append("status", statusFilter);
      const response = await api.get(`/admin/activity-reports?${params.toString()}`);
      return response.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/activity-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-reports"] });
      showFeedback("success", "Berhasil", "Laporan kegiatan berhasil dihapus");
      setIsDeleteModalOpen(false);
      setSelectedReport(null);
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal menghapus laporan kegiatan");
    },
  });

  const handleDelete = () => {
    if (selectedReport) {
      deleteMutation.mutate(selectedReport.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      published: "bg-success-50 text-success-700",
    };
    return badges[status] || "bg-gray-100 text-gray-700";
  };

  // Pagination logic
  const totalItems = reports?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = reports?.slice(startIndex, endIndex) || [];

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleReferenceTypeFilterChange = (value: string) => {
    setReferenceTypeFilter(value);
    setCurrentPage(1);
  };

  const referenceTypeOptions = [
    { value: "", label: "Semua Jenis" },
    { value: "campaign", label: "Campaign" },
    { value: "zakat_period", label: "Zakat - Periode" },
    { value: "zakat_disbursement", label: "Zakat - Pencairan" },
    { value: "qurban_period", label: "Qurban - Periode" },
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
  ];

  const getReferenceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      campaign: "Campaign",
      zakat_period: "Zakat - Periode",
      zakat_disbursement: "Zakat - Pencairan",
      qurban_period: "Qurban - Periode",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="dashboard-title">Laporan Kegiatan</h1>
          <p className="text-gray-600 mt-1">Kelola laporan kegiatan untuk Campaign, Zakat, dan Qurban</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/activity-reports/create")}
          className="btn btn-primary"
        >
          <PlusIcon className="w-5 h-5" />
          Buat Laporan Kegiatan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Laporan
            </label>
            <Autocomplete
              options={referenceTypeOptions}
              value={referenceTypeFilter}
              onChange={handleReferenceTypeFilterChange}
              placeholder="Semua Jenis"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Autocomplete
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusFilterChange}
              placeholder="Semua Status"
            />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
            <thead>
              <tr>
                <th>Judul Laporan</th>
                <th>Jenis</th>
                <th>Referensi</th>
                <th>Tanggal Kegiatan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports && paginatedReports.length > 0 ? (
                paginatedReports.map((report: any) => (
                  <tr key={report.id}>
                    <td>
                      <div className="font-medium text-gray-900">{report.title}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-600">
                        {getReferenceTypeLabel(report.referenceType || "campaign")}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-600">{report.referenceName || "-"}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-600">
                        {format(new Date(report.activityDate), "dd MMM yyyy", { locale: idLocale })}
                      </div>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(report.status)}`}>
                        {report.status === "draft" ? "Draft" : "Published"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => router.push(`/dashboard/activity-reports/${report.id}`)}
                          className="action-btn action-view"
                          title="Lihat Detail"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/activity-reports/${report.id}/edit`)}
                          className="action-btn action-edit"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setIsDeleteModalOpen(true);
                          }}
                          className="action-btn action-delete"
                          title="Hapus"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Belum ada laporan kegiatan
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        {/* Mobile Cards */}
        <div className="table-mobile-cards">
          {paginatedReports && paginatedReports.length > 0 ? (
            paginatedReports.map((report: any) => (
              <div key={report.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title">{report.title}</div>
                    <div className="table-card-header-subtitle">
                      {getReferenceTypeLabel(report.referenceType || "campaign")} • {report.referenceName || "-"}
                    </div>
                  </div>
                  <span className={`table-card-header-badge ${getStatusBadge(report.status)}`}>
                    {report.status === "draft" ? "Draft" : "Published"}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal Kegiatan</span>
                  <span className="table-card-row-value">
                    {format(new Date(report.activityDate), "dd MMM yyyy", { locale: idLocale })}
                  </span>
                </div>

                <div className="table-card-footer">
                  <button
                    onClick={() => router.push(`/dashboard/activity-reports/${report.id}`)}
                    className="action-btn action-view"
                    title="Lihat Detail"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/activity-reports/${report.id}/edit`)}
                    className="action-btn action-edit"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setIsDeleteModalOpen(true);
                    }}
                    className="action-btn action-delete"
                    title="Hapus"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              Belum ada laporan kegiatan
            </div>
          )}
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

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Hapus Laporan Kegiatan"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus laporan kegiatan &quot;{selectedReport?.title}&quot;?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn btn-secondary btn-md"
              disabled={deleteMutation.isPending}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger btn-md"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </Modal>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
