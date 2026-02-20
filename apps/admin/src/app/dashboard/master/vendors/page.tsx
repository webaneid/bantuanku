"use client";

import { useState } from "react";
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
import VendorModal from "@/components/modals/VendorModal";
import Autocomplete from "@/components/Autocomplete";
import FeedbackDialog from "@/components/FeedbackDialog";

type Vendor = {
  id: string;
  name: string;
  type: string;
  category?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  taxId?: string;
  businessLicense?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", searchQuery, typeFilter, statusFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get("/admin/vendors", { params });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Vendor dihapus",
        message: "Data vendor berhasil dihapus.",
      });
    },
    onError: () => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menghapus",
        message: "Terjadi kesalahan saat menghapus vendor.",
      });
    },
  });

  const vendors = data?.data || [];

  const handleCreate = () => {
    setSelectedVendor(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!vendorToDelete) return;
    deleteMutation.mutate(vendorToDelete.id);
    setIsDeleteModalOpen(false);
    setVendorToDelete(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedVendor(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
    handleModalClose();
  };

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "supplier", label: "Supplier" },
    { value: "contractor", label: "Contractor" },
    { value: "service_provider", label: "Service Provider" },
    { value: "consultant", label: "Consultant" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Kelola data vendor</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="btn btn-primary btn-md"
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-full"
          />
        </div>
        <div className="w-full md:w-48">
          <Autocomplete
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All Types"
          />
        </div>
        <div className="w-full md:w-48">
          <Autocomplete
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nama Vendor</th>
              <th>Tipe</th>
              <th>Kontak</th>
              <th>Bank</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  Tidak ada data vendor
                </td>
              </tr>
            ) : (
              vendors.map((vendor: Vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <div className="font-medium text-gray-900">{vendor.name}</div>
                    {vendor.category && (
                      <div className="text-sm text-gray-500">{vendor.category}</div>
                    )}
                  </td>
                  <td>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {vendor.type}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      {vendor.contactPerson || "-"}
                    </div>
                    {vendor.phone && (
                      <div className="text-xs text-gray-500">{vendor.phone}</div>
                    )}
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      {vendor.bankName || "-"}
                    </div>
                    {vendor.bankAccount && (
                      <div className="text-xs text-gray-500 mono">{vendor.bankAccount}</div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        vendor.isActive
                          ? "bg-success-50 text-success-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {vendor.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        onClick={() => handleView(vendor)}
                        className="action-btn action-view"
                        title="View"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="action-btn action-edit"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
                        className="action-btn action-delete"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
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
        {vendors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Tidak ada data vendor
          </div>
        ) : (
          vendors.map((vendor: Vendor) => (
            <div key={vendor.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{vendor.name}</div>
                  {vendor.category && (
                    <div className="table-card-header-subtitle">{vendor.category}</div>
                  )}
                </div>
                <span
                  className={`table-card-header-badge ${
                    vendor.isActive
                      ? "bg-success-50 text-success-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {vendor.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Tipe</span>
                <span className="table-card-row-value">{vendor.type}</span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Kontak</span>
                <span className="table-card-row-value">
                  {vendor.contactPerson || "-"}
                </span>
              </div>

              {vendor.phone && (
                <div className="table-card-row">
                  <span className="table-card-row-label">Telepon</span>
                  <span className="table-card-row-value">{vendor.phone}</span>
                </div>
              )}

              {vendor.bankName && (
                <div className="table-card-row">
                  <span className="table-card-row-label">Bank</span>
                  <span className="table-card-row-value">
                    {vendor.bankName}
                    {vendor.bankAccount && ` - ${vendor.bankAccount}`}
                  </span>
                </div>
              )}

              <div className="table-card-footer">
                <button
                  onClick={() => handleView(vendor)}
                  className="action-btn action-view"
                  title="View"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(vendor)}
                  className="action-btn action-edit"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(vendor)}
                  className="action-btn action-delete"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <VendorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        vendor={selectedVendor}
        isViewMode={isViewMode}
      />

      {isDeleteModalOpen && vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Hapus Vendor</h3>
            <p className="text-sm text-gray-600 mb-6">
              Yakin ingin menghapus vendor &quot;{vendorToDelete.name}&quot;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setVendorToDelete(null);
                }}
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-md"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
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
