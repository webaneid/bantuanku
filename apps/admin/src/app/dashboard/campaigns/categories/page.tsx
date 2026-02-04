"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      return response.data.data as Category[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return api.post("/admin/categories", data);
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal membuat kategori");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string } }) => {
      return api.put(`/admin/categories/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Kategori berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal memperbarui kategori");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus kategori");
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori Campaign</h1>
          <p className="text-gray-600 mt-1">Kelola kategori untuk campaign fundraising</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={openCreateModal}
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Kategori
        </button>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nama Kategori</th>
              <th>Slug</th>
              <th>Deskripsi</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : categoriesData && categoriesData.length > 0 ? (
              categoriesData.map((category) => (
                <tr key={category.id}>
                  <td>
                    <div className="font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600 mono">{category.slug}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">
                      {category.description || "-"}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">
                      {formatDate(category.createdAt)}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-btn action-edit"
                        onClick={() => openEditModal(category)}
                        title="Edit kategori"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="action-btn action-delete"
                        onClick={() => handleDelete(category.id, category.name)}
                        title="Hapus kategori"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Belum ada kategori
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="table-mobile-cards">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : categoriesData && categoriesData.length > 0 ? (
          categoriesData.map((category) => (
            <div key={category.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{category.name}</div>
                  <div className="table-card-header-subtitle mono">{category.slug}</div>
                </div>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Deskripsi</span>
                <span className="table-card-row-value">
                  {category.description || "-"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Dibuat</span>
                <span className="table-card-row-value">
                  {formatDate(category.createdAt)}
                </span>
              </div>

              <div className="table-card-footer">
                <button
                  type="button"
                  className="action-btn action-edit"
                  onClick={() => openEditModal(category)}
                  title="Edit kategori"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="action-btn action-delete"
                  onClick={() => handleDelete(category.id, category.name)}
                  title="Hapus kategori"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">Belum ada kategori</div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="form-field">
                  <label className="form-label">
                    Nama Kategori <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Wakaf, Sedekah, dll"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Deskripsi kategori (opsional)"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={closeModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Menyimpan..."
                    : editingCategory
                    ? "Update Kategori"
                    : "Buat Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
