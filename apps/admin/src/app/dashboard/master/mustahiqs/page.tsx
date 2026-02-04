"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import MustahiqModal from "@/components/modals/MustahiqModal";
import Autocomplete from "@/components/Autocomplete";
import FeedbackDialog from "@/components/FeedbackDialog";

type Mustahiq = {
  id: string;
  mustahiqId?: string;
  name: string;
  asnafCategory: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  address?: string;
  nationalId?: string;
  dateOfBirth?: Date;
  gender?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

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

export default function MustahiqsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [asnafFilter, setAsnafFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMustahiq, setSelectedMustahiq] = useState<Mustahiq | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["mustahiqs", searchQuery, asnafFilter, statusFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (asnafFilter) params.asnafCategory = asnafFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get("/admin/mustahiqs", { params });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/mustahiqs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mustahiqs"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Mustahiq dihapus",
        message: "Data mustahiq berhasil dihapus.",
      });
    },
    onError: () => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menghapus",
        message: "Terjadi kesalahan saat menghapus mustahiq.",
      });
    },
  });

  const mustahiqs = data?.data || [];

  const handleCreate = () => {
    setSelectedMustahiq(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (mustahiq: Mustahiq) => {
    setSelectedMustahiq(mustahiq);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (mustahiq: Mustahiq) => {
    router.push(`/dashboard/master/mustahiqs/${mustahiq.id}`);
  };

  const handleDelete = (mustahiq: Mustahiq) => {
    if (confirm(`Yakin ingin menghapus mustahiq "${mustahiq.name}"?`)) {
      deleteMutation.mutate(mustahiq.id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMustahiq(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["mustahiqs"] });
    handleModalClose();
  };

  const asnafOptions = [
    { value: "", label: "Semua Asnaf" },
    ...ASNAF_CATEGORIES,
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Tidak Aktif" },
  ];

  const getAsnafLabel = (value: string) => {
    return ASNAF_CATEGORIES.find(cat => cat.value === value)?.label || value;
  };

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

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mustahiq Zakat</h1>
          <p className="text-gray-600 mt-1">Kelola data penerima zakat (mustahiq)</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="btn btn-primary btn-md"
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Mustahiq
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari mustahiq..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-full"
          />
        </div>
        <div className="w-full md:w-48">
          <Autocomplete
            options={asnafOptions}
            value={asnafFilter}
            onChange={setAsnafFilter}
            placeholder="Semua Asnaf"
          />
        </div>
        <div className="w-full md:w-48">
          <Autocomplete
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Semua Status"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kategori Asnaf</th>
              <th>Kontak</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {mustahiqs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Tidak ada data mustahiq
                </td>
              </tr>
            ) : (
              mustahiqs.map((mustahiq: Mustahiq) => (
                <tr key={mustahiq.id}>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">
                        {mustahiq.name}
                      </div>
                      {mustahiq.mustahiqId && (
                        <div className="text-sm text-gray-500">
                          ID: {mustahiq.mustahiqId}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-accent-50 text-accent-700">
                      {getAsnafLabel(mustahiq.asnafCategory)}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm">
                      {mustahiq.phone && (
                        <div className="text-gray-900">{mustahiq.phone}</div>
                      )}
                      {mustahiq.email && (
                        <div className="text-gray-500">{mustahiq.email}</div>
                      )}
                      {!mustahiq.phone && !mustahiq.email && (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        mustahiq.isActive
                          ? "bg-success-50 text-success-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {mustahiq.isActive ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        onClick={() => handleView(mustahiq)}
                        className="action-btn action-view"
                        title="Lihat"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        onClick={() => handleEdit(mustahiq)}
                        className="action-btn action-edit"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(mustahiq)}
                        className="action-btn action-delete"
                        title="Hapus"
                      >
                        <TrashIcon />
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
        {mustahiqs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Tidak ada data mustahiq
          </div>
        ) : (
          mustahiqs.map((mustahiq: Mustahiq) => (
            <div key={mustahiq.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{mustahiq.name}</div>
                  <div className="table-card-header-subtitle">
                    {getAsnafLabel(mustahiq.asnafCategory)}
                  </div>
                </div>
                <span
                  className={`table-card-header-badge ${
                    mustahiq.isActive
                      ? "bg-success-50 text-success-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {mustahiq.isActive ? "Aktif" : "Tidak Aktif"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Kontak</span>
                <span className="table-card-row-value">
                  {mustahiq.phone || mustahiq.email || "-"}
                </span>
              </div>

              <div className="table-card-footer">
                <button
                  onClick={() => handleView(mustahiq)}
                  className="action-btn action-view"
                  title="Lihat"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(mustahiq)}
                  className="action-btn action-edit"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(mustahiq)}
                  className="action-btn action-delete"
                  title="Hapus"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <MustahiqModal
          mustahiq={selectedMustahiq}
          isViewMode={isViewMode}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

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
