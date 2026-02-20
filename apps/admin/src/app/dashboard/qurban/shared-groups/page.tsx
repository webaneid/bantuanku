"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Eye, X } from "lucide-react";
import api from "@/lib/api";
import Autocomplete from "@/components/Autocomplete";
import Pagination from "@/components/Pagination";
import { formatRupiah } from "@/lib/format";

interface SharedGroup {
  id: string;
  package_id: string;
  package_period_id: string;
  period_id: string;
  group_number: number;
  max_slots: number;
  slots_filled: number;
  status: "open" | "full" | "confirmed" | "executed";
  created_at: string;
  package_name?: string;
  period_name?: string;
  animal_type?: string;
}

interface GroupMember {
  order_id: string;
  order_number: string;
  donor_name: string;
  donor_phone: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
}

export default function QurbanGroupsPage() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<SharedGroup | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch periods for filter
  const { data: periods = [] } = useQuery({
    queryKey: ["qurban-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data.data || response.data;
    },
  });

  // Fetch shared groups
  const { data: groups = [], isLoading } = useQuery<SharedGroup[]>({
    queryKey: ["qurban-shared-groups"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/shared-groups");
      return response.data.data || response.data;
    },
  });

  // Filter groups
  const filteredGroups = groups.filter((group: any) => {
    if (filterPeriod && group.period_id !== filterPeriod) return false;
    if (filterStatus && group.status !== filterStatus) return false;
    return true;
  });

  const handleViewDetail = async (group: any) => {
    setSelectedGroup(group);
    // Fetch group members
    const response = await api.get(`/admin/qurban/shared-groups/${group.id}`);
    const data = response.data;
    setGroupMembers(data.members || []);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-info-50 text-info-700",
      full: "bg-warning-50 text-warning-700",
      confirmed: "bg-success-50 text-success-700",
      executed: "bg-accent-50 text-accent-700",
      pending: "bg-warning-50 text-warning-700",
      paid: "bg-success-50 text-success-700",
      partial: "bg-warning-50 text-warning-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Terbuka",
      full: "Penuh",
      confirmed: "Dikonfirmasi",
      executed: "Dieksekusi",
      pending: "Pending",
      paid: "Lunas",
      partial: "Cicilan",
    };
    return labels[status] || status;
  };

  // Pagination logic
  const totalItems = filteredGroups.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const periodOptions = [
    { value: "", label: "Semua Periode" },
    ...periods.map((period: any) => ({
      value: period.id,
      label: period.name,
    })),
  ];

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "open", label: "Terbuka" },
    { value: "full", label: "Penuh" },
    { value: "confirmed", label: "Dikonfirmasi" },
    { value: "paid", label: "Sudah Lunas" },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Grup Patungan Qurban
          </h1>
          <p className="text-sm text-gray-600 mt-1">Monitoring grup patungan sapi</p>
        </div>
        <div className="bg-info-50 border border-info-200 text-info-700 px-4 py-2 rounded-lg">
          <span className="font-semibold">{filteredGroups.length}</span> grup aktif
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <Autocomplete
          options={periodOptions}
          value={filterPeriod}
          onChange={handleFilterChange(setFilterPeriod)}
          placeholder="Semua Periode"
        />
        <Autocomplete
          options={statusOptions}
          value={filterStatus}
          onChange={handleFilterChange(setFilterStatus)}
          placeholder="Semua Status"
        />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedGroups.map((group: any) => {
              const progressPercent = (group.slots_filled / group.max_slots) * 100;
              const isFull = group.slots_filled >= group.max_slots;
              return (
                <div key={group.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{group.package_name}</h3>
                      <p className="text-sm text-gray-600">{group.period_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Group #{group.group_number}</p>
                    </div>
                    <button
                      onClick={() => handleViewDetail(group)}
                      className="action-btn action-view"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.status)}`}>
                        {getStatusLabel(group.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {group.animal_type === "cow" ? "🐄 Sapi" : "🐐 Kambing"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Slot Terisi</span>
                        <span className="font-semibold">
                          {group.slots_filled} / {group.max_slots} orang
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isFull ? "bg-success-500" : "bg-info-500"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t text-center">
                      <button
                        onClick={() => handleViewDetail(group)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Lihat Detail Anggota →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {filteredGroups.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada grup patungan</p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detail Grup Patungan</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Group Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Informasi Grup</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Paket</p>
                    <p className="font-medium">{selectedGroup.package_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Periode</p>
                    <p>{selectedGroup.period_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedGroup.status)}`}>
                      {getStatusLabel(selectedGroup.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Anggota</p>
                    <p className="font-semibold">{selectedGroup.slots_filled} / {selectedGroup.max_slots} orang</p>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Daftar Anggota</h3>
                <div className="space-y-3">
                  {groupMembers.map((member, idx) => (
                    <div key={member.order_id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            {idx + 1}. {member.donor_name}
                          </p>
                          <p className="text-sm text-gray-600">{member.donor_phone}</p>
                          <p className="text-xs text-gray-500 mono mt-1">{member.order_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold mono text-sm">Rp {formatRupiah(member.total_amount)}</p>
                          <p className="text-sm text-success-600 mono">Bayar: Rp {formatRupiah(member.paid_amount)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(member.order_status)}`}>
                          Order: {getStatusLabel(member.order_status)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(member.payment_status)}`}>
                          Bayar: {getStatusLabel(member.payment_status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="border rounded-lg p-4 bg-info-50">
                <h3 className="font-semibold mb-3">Ringkasan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Target</p>
                    <p className="font-bold text-lg mono">
                      Rp {formatRupiah(groupMembers.reduce((sum, m) => sum + m.total_amount, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Terbayar</p>
                    <p className="font-bold text-lg text-success-600 mono">
                      Rp {formatRupiah(groupMembers.reduce((sum, m) => sum + m.paid_amount, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
