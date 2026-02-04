"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";
import Autocomplete, { type AutocompleteOption } from "@/components/Autocomplete";
import ExpenseAccountModal from "@/components/modals/ExpenseAccountModal";
import FeedbackDialog from "@/components/FeedbackDialog";

type COA = {
  id: string;
  code: string;
  name: string;
  type: string;
  category?: string;
  normalBalance: string;
  isActive: boolean;
  isSystem: boolean;
  description?: string;
};

export default function COAPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCOA, setSelectedCOA] = useState<COA | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["coa", currentPage, searchQuery, typeFilter, statusFilter],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: 10,
      };

      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter === "active") params.isActive = true;
      if (statusFilter === "inactive") params.isActive = false;

      const response = await api.get("/admin/coa", { params });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/coa/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coa"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Akun dihapus",
        message: "Akun berhasil dihapus.",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menghapus",
        message: error.response?.data?.error || "Terjadi kesalahan saat menghapus akun.",
      });
    },
  });

  const handleCreate = () => {
    setSelectedCOA(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (coa: COA) => {
    setSelectedCOA(coa);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (coa: COA) => {
    setSelectedCOA(coa);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (coa: COA) => {
    if (coa.isSystem) {
      setFeedback({
        open: true,
        type: "error",
        title: "Akun sistem",
        message: "Akun sistem tidak dapat dihapus.",
      });
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun "${coa.name}"?`)) {
      deleteMutation.mutate(coa.id);
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["coa"] });
  };

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const coaList = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  const typeOptions: AutocompleteOption[] = [
    { value: "", label: "All Types" },
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
  ];

  const statusOptions: AutocompleteOption[] = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Kelola akun-akun untuk pencatatan keuangan</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="btn btn-primary btn-md"
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Akun
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Cari kode atau nama akun..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
            />
          </div>
          <div>
            <Autocomplete
              options={typeOptions}
              value={typeFilter}
              onChange={handleFilterChange(setTypeFilter)}
              placeholder="All Types"
            />
          </div>
          <div>
            <Autocomplete
              options={statusOptions}
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              placeholder="All Status"
            />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container hidden lg:block">
        <table className="table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Akun</th>
              <th>Tipe</th>
              <th>Normal Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : coaList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              coaList.map((coa: COA) => (
                <tr key={coa.id}>
                  <td className="font-mono font-semibold">{coa.code}</td>
                  <td>{coa.name}</td>
                  <td>
                    <span className="badge badge-secondary capitalize">{coa.type}</span>
                  </td>
                  <td className="capitalize">{coa.normalBalance}</td>
                  <td>
                    {coa.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-secondary">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(coa)}
                        className="btn-icon btn-icon-secondary"
                        title="View"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(coa)}
                        className="btn-icon btn-icon-primary"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {!coa.isSystem && (
                        <button
                          onClick={() => handleDelete(coa)}
                          className="btn-icon btn-icon-danger"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards lg:hidden">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : coaList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Tidak ada data</div>
        ) : (
          coaList.map((coa: COA) => (
            <div key={coa.id} className="table-mobile-card">
              <div className="table-mobile-card-header">
                <div>
                  <div className="font-mono font-semibold text-gray-900">{coa.code}</div>
                  <div className="text-sm text-gray-600">{coa.name}</div>
                </div>
                {coa.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-secondary">Inactive</span>
                )}
              </div>
              <div className="table-mobile-card-body">
                <div className="table-mobile-card-row">
                  <span className="table-mobile-card-label">Tipe</span>
                  <span className="badge badge-secondary capitalize">{coa.type}</span>
                </div>
                <div className="table-mobile-card-row">
                  <span className="table-mobile-card-label">Normal Balance</span>
                  <span className="capitalize">{coa.normalBalance}</span>
                </div>
              </div>
              <div className="table-mobile-card-footer">
                <button onClick={() => handleView(coa)} className="btn-icon btn-icon-secondary">
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button onClick={() => handleEdit(coa)} className="btn-icon btn-icon-primary">
                  <PencilIcon className="w-4 h-4" />
                </button>
                {!coa.isSystem && (
                  <button onClick={() => handleDelete(coa)} className="btn-icon btn-icon-danger">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      <ExpenseAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        coa={selectedCOA}
        isViewMode={isViewMode}
      />

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
