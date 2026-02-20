"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import Autocomplete from "@/components/Autocomplete";
import { useAuth } from "@/lib/auth";

export default function ZakatPeriodsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = !user?.roles?.includes("admin_finance") || user?.roles?.includes("super_admin");
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  const showTabs = !isMitra; // Only admin sees tabs

  const [activeTab, setActiveTab] = useState<"internal" | "mitra">("internal");
  const [yearFilter, setYearFilter] = useState("");
  const [zakatTypeFilter, setZakatTypeFilter] = useState("");
  const [mitraFilter, setMitraFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    zakatTypeId: "",
    name: "",
    year: new Date().getFullYear().toString(),
    hijriYear: "",
    startDate: "",
    endDate: "",
    executionDate: "",
    status: "draft" as const,
    description: "",
  });

  // Fetch zakat types
  const { data: typesData } = useQuery({
    queryKey: ["zakat-types"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch mitra list (for filter dropdown, admin only)
  const { data: mitraData } = useQuery({
    queryKey: ["mitra-list"],
    queryFn: async () => {
      const response = await api.get("/admin/mitra", {
        params: { limit: 100, status: "verified" },
      });
      return response.data?.data || [];
    },
    enabled: showTabs,
  });

  // Fetch periods with tab scope
  const { data: periodsData, isLoading } = useQuery({
    queryKey: ["zakat-periods", yearFilter, zakatTypeFilter, showTabs ? activeTab : "all", mitraFilter],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/periods", {
        params: {
          ...(yearFilter && { year: yearFilter }),
          ...(zakatTypeFilter && { zakatTypeId: zakatTypeFilter }),
          ...(showTabs && { mitraScope: activeTab }),
          ...(mitraFilter && { mitraId: mitraFilter }),
          limit: 1000,
        },
      });
      return response.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/zakat/periods", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-periods"] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/admin/zakat/periods/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-periods"] });
      setShowModal(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/zakat/periods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-periods"] });
    },
  });

  const resetForm = () => {
    setFormData({
      zakatTypeId: "",
      name: "",
      year: new Date().getFullYear().toString(),
      hijriYear: "",
      startDate: "",
      endDate: "",
      executionDate: "",
      status: "draft",
      description: "",
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleView = (periodId: string) => {
    router.push(`/dashboard/zakat/periods/${periodId}`);
  };

  const handleEdit = (period: any) => {
    setFormData({
      zakatTypeId: period.zakatTypeId,
      name: period.name,
      year: period.year.toString(),
      hijriYear: period.hijriYear || "",
      startDate: period.startDate ? format(new Date(period.startDate), "yyyy-MM-dd") : "",
      endDate: period.endDate ? format(new Date(period.endDate), "yyyy-MM-dd") : "",
      executionDate: period.executionDate ? format(new Date(period.executionDate), "yyyy-MM-dd") : "",
      status: period.status || "draft",
      description: period.description || "",
    });
    setEditingId(period.id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    deleteMutation.mutate(deleteTargetId);
    setDeleteTargetId(null);
  };

  const handleTabChange = (tab: "internal" | "mitra") => {
    setActiveTab(tab);
    setMitraFilter(""); // Reset mitra filter when switching tabs
  };

  const zakatTypes = Array.isArray(typesData) ? typesData : [];
  const periods = periodsData || [];
  const mitraList = Array.isArray(mitraData) ? mitraData : [];

  const zakatTypeOptions = [
    { value: "", label: "Semua Jenis" },
    ...zakatTypes.map((t: any) => ({ value: t.id, label: t.name })),
  ];

  const years = [...new Set<number>(periods.map((p: any) => p.year))]
    .sort((a, b) => b - a);
  const yearOptions = [
    { value: "", label: "Semua Tahun" },
    ...years.map((y) => ({ value: y.toString(), label: y.toString() })),
  ];

  const mitraOptions = [
    { value: "", label: "Semua Mitra" },
    ...mitraList.map((m: any) => ({ value: m.id, label: m.name })),
  ];

  const showMitraColumn = activeTab === "mitra" && showTabs;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Periode Zakat</h1>
            <p className="text-gray-600 mt-1">Kelola periode penerimaan dan penyaluran zakat</p>
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              <Plus className="w-5 h-5" />
              Buat Periode Baru
            </button>
          )}
        </div>

        {/* Tabs (admin only) */}
        {showTabs && (
          <div className="border-b border-gray-200 mb-4">
            <div className="flex">
              <button
                onClick={() => handleTabChange("internal")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "internal"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Internal
              </button>
              <button
                onClick={() => handleTabChange("mitra")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "mitra"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Mitra
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-container">
          <div className="filter-group">
            <Autocomplete
              options={yearOptions}
              value={yearFilter}
              onChange={setYearFilter}
              placeholder="Semua Tahun"
            />
          </div>
          <div className="filter-group">
            <Autocomplete
              options={zakatTypeOptions}
              value={zakatTypeFilter}
              onChange={setZakatTypeFilter}
              placeholder="Semua Jenis"
            />
          </div>
          {showMitraColumn && (
            <div className="filter-group">
              <Autocomplete
                options={mitraOptions}
                value={mitraFilter}
                onChange={setMitraFilter}
                placeholder="Semua Mitra"
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Jenis Zakat</th>
                {showMitraColumn && <th>Mitra</th>}
                <th>Tahun</th>
                <th>Mulai - Selesai</th>
                <th>Tanggal Penyaluran</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period: any) => (
                <tr key={period.id}>
                  <td>
                    <div className="font-medium text-gray-900">{period.name}</div>
                    {period.hijriYear && (
                      <div className="text-sm text-gray-500">{period.hijriYear}</div>
                    )}
                  </td>
                  <td>{period.zakatTypeName}</td>
                  {showMitraColumn && (
                    <td>
                      <span className="text-sm text-gray-700">{period.mitraName || "-"}</span>
                    </td>
                  )}
                  <td>{period.year}</td>
                  <td>
                    {period.startDate && period.endDate ? (
                      <div className="text-sm">
                        {format(new Date(period.startDate), "dd MMM", { locale: idLocale })} - {format(new Date(period.endDate), "dd MMM yyyy", { locale: idLocale })}
                      </div>
                    ) : "-"}
                  </td>
                  <td>
                    {period.executionDate ? (
                      <span className="text-orange-600 font-medium">
                        {format(new Date(period.executionDate), "dd MMM yyyy", { locale: idLocale })}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      period.status === "executed" ? "bg-success-50 text-success-700" :
                      period.status === "active" ? "bg-primary-50 text-primary-700" :
                      period.status === "closed" ? "bg-gray-100 text-gray-700" :
                      "bg-yellow-50 text-yellow-700"
                    }`}>
                      {period.status === "executed" ? "Tersalurkan" :
                       period.status === "active" ? "Aktif" :
                       period.status === "closed" ? "Ditutup" :
                       "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn action-view"
                        onClick={() => handleView(period.id)}
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <>
                          <button
                            className="action-btn action-edit"
                            onClick={() => handleEdit(period)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="action-btn action-delete"
                            onClick={() => handleDelete(period.id)}
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

          {periods.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {activeTab === "mitra" && showTabs
                  ? "Belum ada periode zakat dari mitra."
                  : "Belum ada periode zakat."}
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? "Edit Periode" : "Buat Periode Baru"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Jenis Zakat <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={zakatTypes.map((t: any) => ({ value: t.id, label: t.name }))}
                    value={formData.zakatTypeId}
                    onChange={(value) => setFormData({ ...formData, zakatTypeId: value })}
                    placeholder="Pilih Jenis Zakat"
                    allowClear={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nama Periode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Zakat Fitrah 1446H"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tahun Masehi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tahun Hijriah</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.hijriYear}
                      onChange={(e) => setFormData({ ...formData, hijriYear: e.target.value })}
                      placeholder="Contoh: 1446H"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tanggal Selesai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tanggal Penyaluran
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.executionDate}
                    onChange={(e) => setFormData({ ...formData, executionDate: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Untuk Zakat Fitrah: sebelum sholat Idul Fitri
                  </p>
                </div>

                {!isMitra && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <Autocomplete
                      options={[
                        { value: "draft", label: "Draft" },
                        { value: "active", label: "Aktif" },
                        { value: "closed", label: "Ditutup" },
                        { value: "executed", label: "Tersalurkan" },
                      ]}
                      value={formData.status}
                      onChange={(value) => setFormData({ ...formData, status: value as any })}
                      placeholder="Pilih Status"
                      allowClear={false}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Deskripsi</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Keterangan tambahan..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {editingId ? "Simpan Perubahan" : "Buat Periode"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTargetId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Hapus Periode</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-700">Hapus periode ini?</p>
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => setDeleteTargetId(null)}
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
      </div>
    </main>
  );
}
