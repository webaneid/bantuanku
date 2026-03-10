"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import FeedbackDialog from "@/components/FeedbackDialog";

type IncomeRange = {
  id: number;
  label: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  label: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
};

const emptyForm: FormData = {
  label: "",
  description: "",
  displayOrder: 0,
  isActive: true,
};

export default function PenghasilanBulananPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<IncomeRange | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-income-ranges"],
    queryFn: async () => {
      const response = await api.get("/admin/income-ranges");
      return response.data.data as IncomeRange[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post("/admin/income-ranges", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-income-ranges"] });
      setIsCreating(false);
      setFormData(emptyForm);
      setFeedback({ open: true, type: "success", title: "Penghasilan bulanan berhasil ditambahkan" });
    },
    onError: (err: any) => {
      setFeedback({ open: true, type: "error", title: "Gagal menambahkan", message: err.response?.data?.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) =>
      api.put(`/admin/income-ranges/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-income-ranges"] });
      setEditingId(null);
      setFormData(emptyForm);
      setFeedback({ open: true, type: "success", title: "Penghasilan bulanan berhasil diupdate" });
    },
    onError: (err: any) => {
      setFeedback({ open: true, type: "error", title: "Gagal mengupdate", message: err.response?.data?.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/income-ranges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-income-ranges"] });
      setDeleteTarget(null);
      setFeedback({ open: true, type: "success", title: "Penghasilan bulanan berhasil dihapus" });
    },
    onError: (err: any) => {
      setFeedback({ open: true, type: "error", title: "Gagal menghapus", message: err.response?.data?.message });
    },
  });

  const ranges = data || [];

  const startEdit = (range: IncomeRange) => {
    setEditingId(range.id);
    setIsCreating(false);
    setFormData({
      label: range.label,
      description: range.description || "",
      displayOrder: range.displayOrder,
      isActive: range.isActive,
    });
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ ...emptyForm, displayOrder: ranges.length + 1 });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData(emptyForm);
  };

  const handleSave = () => {
    if (!formData.label.trim()) {
      setFeedback({ open: true, type: "error", title: "Label wajib diisi" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Penghasilan Bulanan</h1>
          <p className="text-gray-600 mt-1">Kelola data range penghasilan bulanan untuk donatur</p>
        </div>
        {!isCreating && (
          <button type="button" onClick={startCreate} className="btn btn-primary btn-md">
            <PlusIcon className="w-5 h-5" />
            Tambah
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th className="w-16">Urutan</th>
              <th>Label</th>
              <th>Deskripsi</th>
              <th className="w-24">Status</th>
              <th className="w-28">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isCreating && (
              <tr className="bg-primary-50">
                <td>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="form-input w-16 text-center"
                    min={0}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="form-input"
                    placeholder="Contoh: < Rp 4.000.000"
                    autoFocus
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input"
                    placeholder="Opsional"
                  />
                </td>
                <td>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Aktif</span>
                  </label>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="action-btn text-success-600 hover:bg-success-50"
                      disabled={createMutation.isPending}
                      title="Simpan"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="action-btn text-gray-500 hover:bg-gray-100"
                      title="Batal"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {ranges.length === 0 && !isCreating ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-8">
                  Belum ada data penghasilan bulanan
                </td>
              </tr>
            ) : (
              ranges.map((range) =>
                editingId === range.id ? (
                  <tr key={range.id} className="bg-primary-50">
                    <td>
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                        className="form-input w-16 text-center"
                        min={0}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        className="form-input"
                        autoFocus
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="form-input"
                        placeholder="Opsional"
                      />
                    </td>
                    <td>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Aktif</span>
                      </label>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSave}
                          className="action-btn text-success-600 hover:bg-success-50"
                          disabled={updateMutation.isPending}
                          title="Simpan"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="action-btn text-gray-500 hover:bg-gray-100"
                          title="Batal"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={range.id}>
                    <td className="text-center text-gray-500">{range.displayOrder}</td>
                    <td className="font-medium text-gray-900">{range.label}</td>
                    <td className="text-gray-500 text-sm">{range.description || "-"}</td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          range.isActive
                            ? "bg-success-50 text-success-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {range.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(range)}
                          className="action-btn action-edit"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(range)}
                          className="action-btn action-delete"
                          title="Hapus"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Hapus Penghasilan Bulanan</h3>
            <p className="text-sm text-gray-600 mb-6">
              Yakin ingin menghapus &quot;{deleteTarget.label}&quot;?
            </p>
            <div className="flex justify-end gap-3">
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
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
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
