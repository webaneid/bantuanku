"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Pillar {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const isProtectedPillar = (pillar: Pillar) => pillar.isDefault;

export default function PillarsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // Fetch pillars
  const { data: pillarsData, isLoading } = useQuery({
    queryKey: ["pillars"],
    queryFn: async () => {
      const response = await api.get("/pillars");
      return response.data.data as Pillar[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return api.post("/admin/pillars", data);
    },
    onSuccess: () => {
      toast.success("Pilar berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ["pillars"] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal membuat pilar");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string } }) => {
      return api.put(`/admin/pillars/${id}`, data);
    },
    onSuccess: () => {
      toast.success("Pilar berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["pillars"] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal memperbarui pilar");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/pillars/${id}`);
    },
    onSuccess: () => {
      toast.success("Pilar berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["pillars"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus pilar");
    },
  });

  const openCreateModal = () => {
    setEditingPillar(null);
    setFormData({ name: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (pillar: Pillar) => {
    if (isProtectedPillar(pillar)) {
      toast.error("Pilar default tidak dapat diubah.");
      return;
    }
    setEditingPillar(pillar);
    setFormData({
      name: pillar.name,
      description: pillar.description || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPillar(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPillar) {
      updateMutation.mutate({ id: editingPillar.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (pillar: Pillar) => {
    if (isProtectedPillar(pillar)) {
      toast.error("Pilar default tidak dapat dihapus.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus pilar "${pillar.name}"?`)) {
      deleteMutation.mutate(pillar.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Pilar Campaign</h1>
          <p className="text-gray-600 mt-1">Kelola pilar untuk campaign fundraising</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={openCreateModal}
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Pilar
        </button>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nama Pilar</th>
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
            ) : pillarsData && pillarsData.length > 0 ? (
              pillarsData.map((pillar) => (
                <tr key={pillar.id}>
                  <td>
                    <div className="font-medium text-gray-900">{pillar.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600 mono">{pillar.slug}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">
                      {pillar.description || "-"}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">
                      {formatDate(pillar.createdAt)}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-btn action-edit"
                        onClick={() => openEditModal(pillar)}
                        title="Edit pilar"
                        disabled={isProtectedPillar(pillar)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="action-btn action-delete"
                        onClick={() => handleDelete(pillar)}
                        title="Hapus pilar"
                        disabled={isProtectedPillar(pillar)}
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
                  Belum ada pilar
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
        ) : pillarsData && pillarsData.length > 0 ? (
          pillarsData.map((pillar) => (
            <div key={pillar.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{pillar.name}</div>
                  <div className="table-card-header-subtitle mono">{pillar.slug}</div>
                </div>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Deskripsi</span>
                <span className="table-card-row-value">
                  {pillar.description || "-"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Dibuat</span>
                <span className="table-card-row-value">
                  {formatDate(pillar.createdAt)}
                </span>
              </div>

              <div className="table-card-footer">
                <button
                  type="button"
                  className="action-btn action-edit"
                  onClick={() => openEditModal(pillar)}
                  title="Edit pilar"
                  disabled={isProtectedPillar(pillar)}
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="action-btn action-delete"
                  onClick={() => handleDelete(pillar)}
                  title="Hapus pilar"
                  disabled={isProtectedPillar(pillar)}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">Belum ada pilar</div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPillar ? "Edit Pilar" : "Tambah Pilar"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="form-field">
                  <label className="form-label">
                    Nama Pilar <span className="text-danger-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pendidikan, Kesehatan, dll"
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
                    placeholder="Deskripsi pilar (opsional)"
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
                    : editingPillar
                    ? "Update Pilar"
                    : "Buat Pilar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
