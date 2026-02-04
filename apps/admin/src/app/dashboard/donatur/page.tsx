"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, EyeIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import DonorModal from "@/components/modals/DonorModal";

interface Donatur {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  whatsappNumber: string | null;
  website: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  totalDonations?: number;
  totalAmount?: number;
}

export default function DonaturPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDonatur, setEditingDonatur] = useState<Donatur | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch donatur from donatur table
  const { data: donaturData, isLoading } = useQuery({
    queryKey: ["donatur", searchQuery],
    queryFn: async () => {
      const response = await api.get("/admin/donatur", {
        params: { search: searchQuery, limit: 100 },
      });
      return response.data.data as Donatur[];
    },
  });

  const openCreateModal = () => {
    setEditingDonatur(null);
    setIsModalOpen(true);
  };

  const openEditModal = (donatur: Donatur) => {
    setEditingDonatur(donatur);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDonatur(null);
  };

  const handleSuccess = (createdId?: string) => {
    toast.success(editingDonatur ? "Donatur berhasil diperbarui!" : "Donatur berhasil dibuat!");
    queryClient.invalidateQueries({ queryKey: ["donatur"] });
    closeModal();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donatur</h1>
          <p className="text-gray-600 mt-1">Kelola data donatur dan riwayat donasi</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={openCreateModal}
        >
          <PlusIcon className="w-5 h-5" />
          Tambah Donatur
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Cari donatur..."
          className="form-input max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Bergabung</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : donaturData && donaturData.length > 0 ? (
              donaturData.map((donatur) => (
                <tr key={donatur.id}>
                  <td>
                    <div className="font-medium text-gray-900">{donatur.name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">{donatur.email}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">{donatur.phone || "-"}</div>
                  </td>
                  <td>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        donatur.isActive
                          ? "bg-success-50 text-success-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {donatur.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm text-gray-600">
                      {formatDate(donatur.createdAt)}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="action-btn action-view"
                        onClick={() => router.push(`/dashboard/donatur/${donatur.id}`)}
                        title="Lihat detail donatur"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="action-btn action-edit"
                        onClick={() => openEditModal(donatur)}
                        title="Edit donatur"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Belum ada donatur
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
        ) : donaturData && donaturData.length > 0 ? (
          donaturData.map((donatur) => (
            <div key={donatur.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="table-card-header-title">{donatur.name}</div>
                  <div className="table-card-header-subtitle">{donatur.email}</div>
                </div>
                <span
                  className={`table-card-header-badge ${
                    donatur.isActive
                      ? "bg-success-50 text-success-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {donatur.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Phone</span>
                <span className="table-card-row-value">{donatur.phone || "-"}</span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Bergabung</span>
                <span className="table-card-row-value">
                  {formatDate(donatur.createdAt)}
                </span>
              </div>

              <div className="table-card-footer">
                <button
                  type="button"
                  className="action-btn action-view"
                  onClick={() => router.push(`/dashboard/donatur/${donatur.id}`)}
                  title="Lihat detail donatur"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="action-btn action-edit"
                  onClick={() => openEditModal(donatur)}
                  title="Edit donatur"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">Belum ada donatur</div>
        )}
      </div>

      {/* Donor Modal */}
      <DonorModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        donatur={editingDonatur}
      />
    </div>
  );
}
