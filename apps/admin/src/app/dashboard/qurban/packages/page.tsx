"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Beef, Plus, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import Autocomplete from "@/components/Autocomplete";
import { useAuth } from "@/lib/auth";

interface Period {
  id: string;
  name: string;
  hijri_year: number;
  gregorian_year: number;
  status: "draft" | "active" | "closed" | "executed";
}

interface PackagePeriod {
  packagePeriodId: string;
  periodId: string;
  periodName: string;
  hijriYear: string;
  gregorianYear: number;
  price: number;
  stock: number;
  stockSold: number;
  slotsFilled: number;
  isAvailable: boolean;
  createdAt: string;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  animalType: "cow" | "goat";
  packageType: "individual" | "shared";
  maxSlots: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  periods: PackagePeriod[];
}

export default function QurbanPackagesPage() {
  const [filterPeriod, setFilterPeriod] = useState<string>("");
  const [filterAnimal, setFilterAnimal] = useState<string>("");
  const [deleteTargetPackageId, setDeleteTargetPackageId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = !user?.roles?.includes("admin_finance") || user?.roles?.includes("super_admin");

  // Fetch periods for dropdown
  const { data: periodsData } = useQuery({
    queryKey: ["qurban-periods-list"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data;
    },
  });

  // Handle both response formats: { data: [] } or direct array
  const periods: Period[] = Array.isArray(periodsData)
    ? periodsData
    : (periodsData?.data || []);

  // Fetch packages
  const { data: packagesData, isLoading } = useQuery({
    queryKey: ["qurban-packages"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/packages");
      return response.data;
    },
  });

  // Handle both response formats: { data: [] } or direct array
  const packages: Package[] = Array.isArray(packagesData)
    ? packagesData
    : (packagesData?.data || []);

  // Filter packages
  const filteredPackages = packages.filter((pkg) => {
    // Check if package has any period matching the filter
    if (filterPeriod !== "") {
      const hasMatchingPeriod = pkg.periods?.some(p => p.periodId === filterPeriod);
      if (!hasMatchingPeriod) return false;
    }
    if (filterAnimal !== "" && pkg.animalType !== filterAnimal) return false;
    return true;
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/qurban/packages/${id}`);
      return response.data.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-packages"] });
    },
  });

  const handleDelete = (id: string) => {
    setDeleteTargetPackageId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetPackageId) return;
    deleteMutation.mutate(deleteTargetPackageId);
    setDeleteTargetPackageId(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Beef className="h-6 w-6" />
            Paket Hewan Qurban
          </h1>
          <p className="text-sm text-gray-600 mt-1">Kelola paket hewan qurban</p>
        </div>
        {canEdit && (
          <Link
            href="/dashboard/qurban/packages/create"
            className="btn btn-primary btn-md"
          >
            <Plus className="h-4 w-4" />
            Tambah Paket
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <Autocomplete
          options={[
            { value: "", label: "Semua Periode" },
            ...periods.map((period) => ({
              value: period.id,
              label: period.name,
            })),
          ]}
          value={filterPeriod}
          onChange={setFilterPeriod}
          placeholder="Semua Periode"
        />
        <Autocomplete
          options={[
            { value: "", label: "Semua Jenis" },
            { value: "cow", label: "Sapi" },
            { value: "goat", label: "Kambing" },
          ]}
          value={filterAnimal}
          onChange={setFilterAnimal}
          placeholder="Semua Jenis"
        />
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.map((pkg) => {
              // Get period to display: filtered period or first available period
              const displayPeriod = filterPeriod
                ? pkg.periods?.find(p => p.periodId === filterPeriod)
                : pkg.periods?.[0];

              return (
                <div key={pkg.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      {displayPeriod && (
                        <p className="text-sm text-gray-600">{displayPeriod.periodName}</p>
                      )}
                      {!displayPeriod && pkg.periods && pkg.periods.length > 0 && (
                        <p className="text-sm text-gray-600">{pkg.periods.length} periode tersedia</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/qurban/packages/${pkg.id}/edit`}
                          className="action-btn action-edit"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="action-btn action-delete"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          pkg.animalType === "cow"
                            ? "bg-warning-50 text-warning-700"
                            : "bg-success-50 text-success-700"
                        }`}
                      >
                        {pkg.animalType === "cow" ? "🐄 Sapi" : "🐐 Kambing"}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          pkg.packageType === "individual"
                            ? "bg-accent-50 text-accent-700"
                            : "bg-info-50 text-info-700"
                        }`}
                      >
                        {pkg.packageType === "individual" ? "Individual" : "Patungan"}
                      </span>
                      {pkg.isFeatured && (
                        <span className="text-xs px-2 py-1 rounded bg-accent-50 text-accent-700">
                          ⭐ Featured
                        </span>
                      )}
                    </div>

                    {displayPeriod && (
                      <>
                        <div className="text-xl font-bold text-primary-600">
                          {formatPrice(displayPeriod.price)}
                          {pkg.packageType === "shared" && pkg.maxSlots && (
                            <span className="text-sm text-gray-600 font-normal">/slot</span>
                          )}
                        </div>

                        {pkg.packageType === "shared" && pkg.maxSlots && (
                          <p className="text-sm text-gray-600">Max {pkg.maxSlots} orang/paket</p>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-gray-600">Stok:</span>
                          <span
                            className={`font-semibold ${
                              displayPeriod.stock > 10
                                ? "text-success-600"
                                : displayPeriod.stock > 0
                                ? "text-warning-600"
                                : "text-danger-600"
                            }`}
                          >
                            {displayPeriod.stock}
                          </span>
                        </div>
                      </>
                    )}

                    {!displayPeriod && (
                      <p className="text-sm text-gray-500 italic">Belum ada periode untuk paket ini</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {deleteTargetPackageId && (
            <div className="modal-backdrop" onClick={() => setDeleteTargetPackageId(null)}>
              <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Hapus Paket</h3>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetPackageId(null)}
                    className="modal-close"
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  <p className="text-gray-700">Hapus paket ini? Tindakan ini tidak dapat dibatalkan.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDeleteTargetPackageId(null)}
                    disabled={deleteMutation.isPending}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
