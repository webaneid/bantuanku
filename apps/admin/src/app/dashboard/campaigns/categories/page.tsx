"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import FeedbackDialog from "@/components/FeedbackDialog";
import SEOPanel, { type SEOData } from "@/components/SEOPanel";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyphrase?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
  noFollow?: boolean | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  seoScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [seoValues, setSeoValues] = useState<Partial<SEOData>>({
    focusKeyphrase: "",
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    noIndex: false,
    noFollow: false,
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    seoScore: 0,
  });

  const handleSEOChange = useCallback((data: Partial<SEOData>) => {
    setSeoValues(data);
  }, []);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const showFeedback = (type: "success" | "error", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

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
    mutationFn: async (data: Record<string, any>) => {
      return api.post("/admin/categories", data);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Kategori berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal membuat kategori");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      return api.put(`/admin/categories/${id}`, data);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Kategori berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal memperbarui kategori");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Kategori berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal menghapus kategori");
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setSeoValues({
      focusKeyphrase: "",
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      noIndex: false,
      noFollow: false,
      ogTitle: "",
      ogDescription: "",
      ogImageUrl: "",
      seoScore: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setSeoValues({
      focusKeyphrase: category.focusKeyphrase || "",
      metaTitle: category.metaTitle || "",
      metaDescription: category.metaDescription || "",
      canonicalUrl: category.canonicalUrl || "",
      noIndex: Boolean(category.noIndex),
      noFollow: Boolean(category.noFollow),
      ogTitle: category.ogTitle || "",
      ogDescription: category.ogDescription || "",
      ogImageUrl: category.ogImageUrl || "",
      seoScore: category.seoScore || 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setSeoValues({
      focusKeyphrase: "",
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      noIndex: false,
      noFollow: false,
      ogTitle: "",
      ogDescription: "",
      ogImageUrl: "",
      seoScore: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, ...seoValues };
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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

              <div className="p-6 pt-0">
                <SEOPanel
                  value={seoValues}
                  onChange={handleSEOChange}
                  contentData={{
                    title: formData.name || "",
                    slug: editingCategory?.slug || "",
                    description: formData.description || "",
                    content: formData.description || "",
                  }}
                  entityType="category"
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Hapus Kategori</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Apakah Anda yakin ingin menghapus kategori "{deleteTarget.name}"?
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setDeleteTarget(null)}
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
                {deleteMutation.isPending ? "Menghapus..." : "Hapus Kategori"}
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
