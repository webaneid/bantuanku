"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { EyeIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/Modal";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import FeedbackDialog from "@/components/FeedbackDialog";
import { formatRupiah } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export default function CampaignsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Bulk selection states
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const showFeedback = (type: "success" | "error", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch categories from API
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories");
      return response.data.data;
    },
  });

  // Filter options
  const categoryOptions = [
    { value: "", label: "Semua Kategori" },
    ...(categoriesData || []).map((cat: any) => ({
      value: cat.id,
      label: cat.name,
    })),
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Selesai" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns");
      return response.data.data;
    },
  });

  // Fetch current user's employee record if program_coordinator or employee
  const needsEmployeeRecord = user?.roles?.includes("program_coordinator") || user?.roles?.includes("employee");
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      if (!needsEmployeeRecord) return null;
      const response = await api.get("/admin/employees");
      const employees = response.data.data;
      return employees.find((emp: any) => emp.userId === user?.id);
    },
    enabled: !!needsEmployeeRecord,
  });

  const isMitra = user?.roles?.includes("mitra") && user.roles.length === 1;
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("admin_finance");

  // Fetch mitra record to check approval status
  const { data: mitraRecord } = useQuery({
    queryKey: ["my-mitra-record"],
    queryFn: async () => {
      const response = await api.get("/admin/mitra/me");
      return response.data?.data || null;
    },
    enabled: !!isMitra,
  });
  const isMitraApproved = mitraRecord?.status === "verified";

  // Helper to check if user can edit/delete a campaign
  const canEditCampaign = (campaign: any) => {
    if (user?.roles?.includes("super_admin") || user?.roles?.includes("admin_campaign")) {
      return true;
    }
    if (user?.roles?.includes("program_coordinator") && currentEmployee) {
      return campaign.coordinatorId === currentEmployee.id || campaign.createdBy === user.id;
    }
    // Employee can edit campaigns where they are the coordinator (penanggung jawab)
    if (isEmployeeOnly && currentEmployee) {
      return campaign.coordinatorId === currentEmployee.id;
    }
    // Mitra can edit all their own campaigns (already filtered by API)
    if (isMitra) {
      return true;
    }
    return false;
  };

  const canDeleteCampaign = (campaign: any) => {
    return user?.roles?.includes("super_admin") || user?.roles?.includes("admin_campaign");
  };

  const canCreateCampaign = () => {
    return user?.roles?.includes("super_admin") ||
           user?.roles?.includes("admin_campaign") ||
           user?.roles?.includes("program_coordinator") ||
           (isMitra && isMitraApproved);
  };

  // Filter campaigns based on search and filters
  const filteredCampaigns = campaigns?.filter((campaign: any) => {
    const matchesSearch = searchQuery === "" ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "" || campaign.categoryId === categoryFilter;
    const matchesStatus = statusFilter === "" || campaign.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination logic
  const totalItems = filteredCampaigns?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = filteredCampaigns?.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setIsDeleteModalOpen(false);
      setSelectedCampaign(null);
      showFeedback("success", "Berhasil", "Campaign berhasil dihapus!");
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal menghapus campaign");
    },
  });

  const handleDelete = () => {
    if (selectedCampaign) {
      deleteMutation.mutate(selectedCampaign.id);
    }
  };

  // Bulk actions handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedCampaigns?.map((c: any) => c.id) || [];
      setSelectedCampaigns(allIds);
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns([...selectedCampaigns, id]);
    } else {
      setSelectedCampaigns(selectedCampaigns.filter(cid => cid !== id));
    }
  };

  const isAllSelected = paginatedCampaigns?.length > 0 && selectedCampaigns.length === paginatedCampaigns?.length;
  const isSomeSelected = selectedCampaigns.length > 0 && selectedCampaigns.length < (paginatedCampaigns?.length || 0);

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map(id => api.delete(`/admin/campaigns/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setIsBulkDeleteModalOpen(false);
      setSelectedCampaigns([]);
      showFeedback("success", "Berhasil", `${selectedCampaigns.length} campaign berhasil dihapus!`);
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal menghapus campaigns");
    },
  });

  // Bulk set featured mutation
  const bulkSetFeaturedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map(id => api.patch(`/admin/campaigns/${id}`, { isFeatured: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setSelectedCampaigns([]);
      showFeedback("success", "Berhasil", `${selectedCampaigns.length} campaign berhasil dijadikan unggulan!`);
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal mengubah status featured");
    },
  });

  // Bulk set urgent mutation
  const bulkSetUrgentMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map(id => api.patch(`/admin/campaigns/${id}`, { isUrgent: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setSelectedCampaigns([]);
      showFeedback("success", "Berhasil", `${selectedCampaigns.length} campaign berhasil dijadikan mendesak!`);
    },
    onError: (error: any) => {
      showFeedback("error", "Gagal", error.response?.data?.message || "Gagal mengubah status urgent");
    },
  });

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedCampaigns);
  };

  const handleBulkSetFeatured = () => {
    bulkSetFeaturedMutation.mutate(selectedCampaigns);
  };

  const handleBulkSetUrgent = () => {
    bulkSetUrgentMutation.mutate(selectedCampaigns);
  };

  const handleView = (campaign: any) => {
    router.push(`/dashboard/campaigns/${campaign.id}`);
  };

  const handleEdit = (campaign: any) => {
    router.push(`/dashboard/campaigns/${campaign.id}/edit`);
  };

  const openDeleteModal = (campaign: any) => {
    setSelectedCampaign(campaign);
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Kelola campaign fundraising</p>
        </div>
        {canCreateCampaign() && (
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={() => router.push("/dashboard/campaigns/create")}
          >
            <PlusIcon className="w-5 h-5" />
            Buat Campaign
          </button>
        )}
      </div>

      {/* Bulk Actions Bar (hidden for mitra) */}
      {!isMitra && selectedCampaigns.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary-900">
              {selectedCampaigns.length} campaign terpilih
            </span>
            <button
              className="text-xs text-primary-600 hover:text-primary-700 underline"
              onClick={() => setSelectedCampaigns([])}
            >
              Batalkan
            </button>
          </div>
          <div className="flex items-center gap-2">
            {user?.roles?.includes("super_admin") && (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={handleBulkSetFeatured}
                  disabled={bulkSetFeaturedMutation.isPending}
                >
                  {bulkSetFeaturedMutation.isPending ? "Processing..." : "Jadikan Unggulan"}
                </button>
                <button
                  className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleBulkSetUrgent}
                  disabled={bulkSetUrgentMutation.isPending}
                >
                  {bulkSetUrgentMutation.isPending ? "Processing..." : "Jadikan Mendesak"}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                >
                  Hapus
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filter-container">
        <div className="filter-group">
          <input
            type="text"
            className="form-input"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <Autocomplete
            options={categoryOptions}
            value={categoryFilter}
            onChange={handleFilterChange(setCategoryFilter)}
            placeholder="All Categories"
          />
        </div>

        <div className="filter-group">
          <Autocomplete
            options={statusOptions}
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            placeholder="All Status"
          />
        </div>
      </div>

      <div className="table-container">
        {/* Desktop Table View */}
        <table className="table">
          <thead>
            <tr>
              {!isMitra && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              <th className="sortable">Campaign</th>
              <th className="sortable">Goal</th>
              <th className="sortable">Collected</th>
              <th className="sortable">Donors</th>
              <th className="sortable">Status</th>
              <th className="sortable">Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCampaigns?.map((campaign: any) => {
              const progress = (campaign.collected / campaign.goal) * 100;
              const iconClass =
                campaign.category === "pendidikan"
                  ? "icon-blue"
                  : campaign.category === "kesehatan"
                  ? "icon-green"
                  : "icon-purple";

              return (
                <tr key={campaign.id}>
                  {!isMitra && (
                    <td>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={(e) => handleSelectCampaign(campaign.id, e.target.checked)}
                      />
                    </td>
                  )}
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">
                        {campaign.title}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {campaign.categoryName || campaign.category}
                      </div>
                    </div>
                  </td>
                  <td className="mono text-sm">
                    Rp {formatRupiah(campaign.goal)}
                  </td>
                  <td>
                    <div className="mono text-sm mb-2">
                      Rp {formatRupiah(campaign.collected)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 mono">
                      {progress.toFixed(0)}%
                    </div>
                  </td>
                  <td className="mono">{campaign.donorCount || 0}</td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        campaign.status === "active"
                          ? "bg-success-50 text-success-700"
                          : campaign.status === "draft"
                          ? "bg-gray-100 text-gray-700"
                          : campaign.status === "completed"
                          ? "bg-primary-50 text-primary-700"
                          : "bg-danger-50 text-danger-700"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="text-gray-600 text-sm">
                    {format(new Date(campaign.createdAt), "EEEE, dd MMM yyyy", {
                      locale: idLocale,
                    })}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn action-view"
                        title="View"
                        onClick={() => handleView(campaign)}
                      >
                        <EyeIcon />
                      </button>
                      {canEditCampaign(campaign) && (
                        <button
                          className="action-btn action-edit"
                          title="Edit"
                          onClick={() => handleEdit(campaign)}
                        >
                          <PencilIcon />
                        </button>
                      )}
                      {canDeleteCampaign(campaign) && (
                        <button
                          className="action-btn action-delete"
                          title="Delete"
                          onClick={() => openDeleteModal(campaign)}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredCampaigns?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {campaigns?.length === 0
                ? (isEmployeeOnly
                    ? "Tidak ada campaign yang berada dibawah tanggung jawab Anda."
                    : "Belum ada campaign. Buat campaign pertama Anda!")
                : "Tidak ada campaign yang sesuai dengan filter."}
            </p>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="table-mobile-cards">
          {paginatedCampaigns?.map((campaign: any) => {
            const progress = (campaign.collected / campaign.goal) * 100;

            return (
              <div key={campaign.id} className="table-card">
                <div className="flex items-start gap-3 mb-3">
                  {!isMitra && (
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={(e) => handleSelectCampaign(campaign.id, e.target.checked)}
                    />
                  )}
                  <div className="flex-1">
                    <div className="table-card-header">
                      <div className="table-card-header-left">
                        <div className="table-card-header-title">{campaign.title}</div>
                        <div className="table-card-header-subtitle">{campaign.category}</div>
                      </div>
                      <span
                        className={`table-card-header-badge ${
                          campaign.status === "active"
                            ? "bg-success-50 text-success-700"
                            : campaign.status === "draft"
                            ? "bg-gray-100 text-gray-700"
                            : campaign.status === "completed"
                            ? "bg-primary-50 text-primary-700"
                            : "bg-danger-50 text-danger-700"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Target</span>
                  <span className="table-card-row-value mono">Rp {formatRupiah(campaign.goal)}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Terkumpul</span>
                  <span className="table-card-row-value mono">Rp {formatRupiah(campaign.collected)}</span>
                </div>

                <div className="table-card-row">
                  <span className="table-card-row-label">Donors</span>
                  <span className="table-card-row-value">{campaign.donorCount || 0} orang</span>
                </div>

                <div className="table-card-progress">
                  <div className="table-card-progress-bar">
                    <div
                      className="table-card-progress-bar-fill"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="table-card-progress-text">{progress.toFixed(0)}%</div>
                </div>

                <div className="table-card-footer">
                  <button
                    className="action-btn action-view"
                    title="View"
                    onClick={() => handleView(campaign)}
                  >
                    <EyeIcon />
                  </button>
                  {canEditCampaign(campaign) && (
                    <button
                      className="action-btn action-edit"
                      title="Edit"
                      onClick={() => handleEdit(campaign)}
                    >
                      <PencilIcon />
                    </button>
                  )}
                  {canDeleteCampaign(campaign) && (
                    <button
                      className="action-btn action-delete"
                      title="Delete"
                      onClick={() => openDeleteModal(campaign)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCampaign(null);
        }}
        title="Hapus Campaign"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Apakah Anda yakin ingin menghapus campaign{" "}
            <strong>{selectedCampaign?.title}</strong>?
          </p>
          <p className="text-sm text-danger-600">
            Tindakan ini tidak dapat dibatalkan. Semua data terkait campaign ini akan terhapus.
          </p>

          <div className="modal-footer">
            <button
              className="btn btn-secondary btn-md"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedCampaign(null);
              }}
            >
              Batal
            </button>
            <button
              className="btn btn-danger btn-md"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus Campaign"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          setIsBulkDeleteModalOpen(false);
        }}
        title="Hapus Campaign (Tindakan Masal)"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Apakah Anda yakin ingin menghapus{" "}
            <strong>{selectedCampaigns.length} campaign</strong> yang dipilih?
          </p>
          <p className="text-sm text-danger-600">
            Tindakan ini tidak dapat dibatalkan. Semua data terkait campaign-campaign ini akan terhapus.
          </p>

          <div className="modal-footer">
            <button
              className="btn btn-secondary btn-md"
              onClick={() => {
                setIsBulkDeleteModalOpen(false);
              }}
            >
              Batal
            </button>
            <button
              className="btn btn-danger btn-md"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Menghapus..." : `Hapus ${selectedCampaigns.length} Campaign`}
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
