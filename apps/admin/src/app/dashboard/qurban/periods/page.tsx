"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Period {
  id: string;
  name: string;
  hijriYear: string;
  gregorianYear: number;
  startDate: string;
  endDate: string;
  executionDate: string;
  status: "draft" | "active" | "closed" | "executed";
  description?: string;
}

export default function PeriodsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  const canEdit = (!user?.roles?.includes("admin_finance") || user?.roles?.includes("super_admin")) && !isMitra;
  const [showModal, setShowModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [deleteTargetPeriodId, setDeleteTargetPeriodId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    hijriYear: "",
    gregorianYear: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    executionDate: "",
    status: "draft" as const,
    description: "",
  });

  // Fetch periods
  const { data: periodsData, isLoading } = useQuery({
    queryKey: ["qurban-periods"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data;
    },
  });

  // Create period mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post("/admin/qurban/periods", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-periods"] });
      setShowModal(false);
      resetForm();
    },
  });

  // Update period mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await api.patch(`/admin/qurban/periods/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-periods"] });
      setShowModal(false);
      resetForm();
    },
  });

  // Delete period mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/qurban/periods/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-periods"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      hijriYear: "",
      gregorianYear: new Date().getFullYear(),
      startDate: "",
      endDate: "",
      executionDate: "",
      status: "draft",
      description: "",
    });
    setEditingPeriod(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPeriod) {
      updateMutation.mutate({ id: editingPeriod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleView = (periodId: string) => {
    router.push(`/dashboard/qurban/periods/${periodId}`);
  };

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setFormData({
      name: period.name,
      hijriYear: period.hijriYear,
      gregorianYear: period.gregorianYear,
      startDate: period.startDate.split("T")[0],
      endDate: period.endDate.split("T")[0],
      executionDate: period.executionDate.split("T")[0],
      status: period.status,
      description: period.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetPeriodId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetPeriodId) return;
    deleteMutation.mutate(deleteTargetPeriodId);
    setDeleteTargetPeriodId(null);
  };

  const statusColors = {
    draft: "badge-neutral",
    active: "badge-success",
    closed: "badge-warning",
    executed: "badge-info",
  };

  const statusLabels = {
    draft: "Draft",
    active: "Aktif",
    closed: "Ditutup",
    executed: "Selesai",
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Periode Qurban</h1>
          <p className="text-sm text-gray-600">Kelola periode penerimaan qurban</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Tambah Periode
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : periodsData?.data?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {isMitra
            ? "Belum ada periode qurban global yang tersedia."
            : 'Belum ada periode qurban. Klik "Tambah Periode" untuk membuat periode baru.'}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Tahun Hijriyah</th>
                  <th>Waktu</th>
                  <th>Tanggal Penyembelihan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {periodsData?.data?.map((period: Period) => (
                  <tr key={period.id}>
                    <td>
                      <div className="font-medium text-gray-900">{period.name}</div>
                    </td>
                    <td className="text-sm">{period.hijriYear} H</td>
                    <td className="text-sm text-gray-600">
                      {format(new Date(period.startDate), "d MMMM", { locale: idLocale })} - {format(new Date(period.endDate), "d MMMM yyyy", { locale: idLocale })}
                    </td>
                    <td className="text-sm text-gray-600">
                      {format(new Date(period.executionDate), "dd MMM yyyy", { locale: idLocale })}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          period.status === "active"
                            ? "bg-success-50 text-success-700"
                            : period.status === "draft"
                            ? "bg-gray-100 text-gray-700"
                            : period.status === "closed"
                            ? "bg-warning-50 text-warning-700"
                            : "bg-primary-50 text-primary-700"
                        }`}
                      >
                        {statusLabels[period.status]}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleView(period.id)}
                          className="action-btn action-view"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(period)}
                              className="action-btn action-edit"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(period.id)}
                              className="action-btn action-delete"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="table-mobile-cards">
            {periodsData?.data?.map((period: Period) => (
              <div key={period.id} className="table-card">
                <div className="table-card-header">
                  <div className="table-card-header-left">
                    <div className="table-card-header-title">{period.name}</div>
                  </div>
                  <span
                    className={`table-card-header-badge ${
                      period.status === "active"
                        ? "bg-success-50 text-success-700"
                        : period.status === "draft"
                        ? "bg-gray-100 text-gray-700"
                        : period.status === "closed"
                        ? "bg-warning-50 text-warning-700"
                        : "bg-primary-50 text-primary-700"
                    }`}
                  >
                    {statusLabels[period.status]}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tahun Hijriyah</span>
                  <span className="table-card-row-value">{period.hijriYear} H</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Waktu</span>
                  <span className="table-card-row-value">
                    {format(new Date(period.startDate), "d MMMM", { locale: idLocale })} - {format(new Date(period.endDate), "d MMMM yyyy", { locale: idLocale })}
                  </span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Tanggal Penyembelihan</span>
                  <span className="table-card-row-value">
                    {format(new Date(period.executionDate), "dd MMM yyyy", { locale: idLocale })}
                  </span>
                </div>

                <div className="table-card-footer">
                  <button
                    onClick={() => handleView(period.id)}
                    className="action-btn action-view"
                    title="Lihat Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleEdit(period)}
                        className="action-btn action-edit"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(period.id)}
                        className="action-btn action-delete"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Form */}
      {showModal && canEdit && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPeriod ? "Edit Periode" : "Tambah Periode Baru"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid gap-4">
                  <div>
                    <label className="form-label">
                      Nama Periode
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="Qurban 1446 H / 2026"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">
                        Tahun Hijriyah
                      </label>
                      <input
                        type="text"
                        value={formData.hijriYear}
                        onChange={(e) => setFormData({ ...formData, hijriYear: e.target.value })}
                        className="form-input"
                        placeholder="1446"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Tahun Masehi
                      </label>
                      <input
                        type="number"
                        value={formData.gregorianYear}
                        onChange={(e) =>
                          setFormData({ ...formData, gregorianYear: parseInt(e.target.value) })
                        }
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">
                        Mulai Penerimaan
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Tutup Penerimaan
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Tanggal Penyembelihan
                      </label>
                      <input
                        type="date"
                        value={formData.executionDate}
                        onChange={(e) =>
                          setFormData({ ...formData, executionDate: e.target.value })
                        }
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  {!isMitra && (
                    <div>
                      <label className="form-label">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as any,
                          })
                        }
                        className="form-select"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Aktif</option>
                        <option value="closed">Ditutup</option>
                        <option value="executed">Selesai</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="form-label">
                      Deskripsi
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="form-textarea"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetPeriodId && canEdit && (
        <div className="modal-backdrop" onClick={() => setDeleteTargetPeriodId(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Hapus Periode</h3>
              <button
                type="button"
                onClick={() => setDeleteTargetPeriodId(null)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="text-gray-700">Yakin ingin menghapus periode ini?</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setDeleteTargetPeriodId(null)}
                className="btn btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn btn-danger"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
