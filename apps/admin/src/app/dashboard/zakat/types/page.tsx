"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface ZakatType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon: string | null;
  hasCalculator: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function ZakatTypesPage() {
  const queryClient = useQueryClient();

  // Fetch zakat types
  const { data: typesData, isLoading } = useQuery({
    queryKey: ["zakat-types-all"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/admin/zakat/types/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-types-active"] });
      toast.success("Jenis zakat berhasil dihapus!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menghapus jenis zakat");
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus jenis zakat "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Jenis Zakat</h1>
            <p className="text-gray-600 mt-1">Atur jenis-jenis zakat yang tersedia di sistem</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/zakat" className="btn btn-secondary btn-md">
              Kembali ke Dashboard
            </Link>
            <Link href="/dashboard/zakat/types/create" className="btn btn-primary btn-md">
              <PlusIcon className="h-5 w-5" />
              Tambah Jenis Zakat
            </Link>
          </div>
        </div>

        {/* Types List */}
        <div className="table-container">
          {typesData && typesData.length > 0 ? (
            <div className="space-y-3">
              {typesData
                .sort((a: ZakatType, b: ZakatType) => a.displayOrder - b.displayOrder)
                .map((type: ZakatType) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl">{type.icon || "📦"}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{type.name}</h3>
                          {type.isActive ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-50 text-success-700">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                              Tidak Aktif
                            </span>
                          )}
                          {type.hasCalculator && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                              Ada Kalkulator
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Slug: {type.slug}</span>
                          <span>Urutan: {type.displayOrder}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/zakat/types/${type.id}/edit`}
                        className="btn btn-sm btn-secondary"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(type.id, type.name)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Belum ada jenis zakat. Klik tombol "Tambah Jenis Zakat" untuk menambahkan.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
