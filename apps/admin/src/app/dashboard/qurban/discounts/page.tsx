"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Edit2, Trash2, Power, Clock } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

interface Discount {
  id: string;
  name: string;
  type: "automatic" | "voucher";
  discountType: "percentage" | "nominal";
  discountValue: number;
  maxDiscount: number | null;
  scopeType: string;
  code: string | null;
  startDate: string;
  endDate: string;
  maxUsage: number | null;
  usageCount: number;
  isActive: boolean;
  description: string | null;
}

function getStatusBadge(discount: Discount) {
  const now = new Date();
  const start = new Date(discount.startDate);
  const end = new Date(discount.endDate);

  if (!discount.isActive) return { label: "Nonaktif", color: "bg-gray-100 text-gray-700" };
  if (now < start) return { label: "Belum Berlaku", color: "bg-yellow-100 text-yellow-700" };
  if (now > end) return { label: "Kadaluarsa", color: "bg-red-100 text-red-700" };
  if (discount.maxUsage !== null && discount.usageCount >= discount.maxUsage)
    return { label: "Habis", color: "bg-orange-100 text-orange-700" };
  return { label: "Aktif", color: "bg-green-100 text-green-700" };
}

export default function QurbanDiscountsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["qurban-discounts", search, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/admin/qurban/discounts?${params}`);
      return res.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/qurban/discounts/${id}/deactivate`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qurban-discounts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/qurban/discounts/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qurban-discounts"] }),
  });

  const discounts: Discount[] = data?.data || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Diskon & Voucher Qurban</h1>
        </div>
        <Link
          href="/dashboard/qurban/discounts/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Buat Baru
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Cari nama atau kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Tipe</option>
          <option value="automatic">Otomatis</option>
          <option value="voucher">Voucher</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="expired">Kadaluarsa</option>
          <option value="inactive">Nonaktif</option>
          <option value="exhausted">Habis</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Belum ada data diskon</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 font-medium text-gray-600">Nama</th>
                <th className="pb-3 font-medium text-gray-600">Tipe</th>
                <th className="pb-3 font-medium text-gray-600">Kode</th>
                <th className="pb-3 font-medium text-gray-600">Nilai Diskon</th>
                <th className="pb-3 font-medium text-gray-600">Penggunaan</th>
                <th className="pb-3 font-medium text-gray-600">Berlaku</th>
                <th className="pb-3 font-medium text-gray-600">Status</th>
                <th className="pb-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {discounts.map((d) => {
                const status = getStatusBadge(d);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">
                      <Link href={`/dashboard/qurban/discounts/${d.id}`} className="hover:text-primary-600">
                        {d.name}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        d.type === "automatic" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {d.type === "automatic" ? "Otomatis" : "Voucher"}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-gray-600">
                      {d.code || "—"}
                    </td>
                    <td className="py-3">
                      {d.discountType === "percentage"
                        ? `${d.discountValue}%${d.maxDiscount ? ` (maks Rp ${d.maxDiscount.toLocaleString("id-ID")})` : ""}`
                        : `Rp ${d.discountValue.toLocaleString("id-ID")}`}
                    </td>
                    <td className="py-3">
                      {d.usageCount}{d.maxUsage ? ` / ${d.maxUsage}` : ""}
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(d.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      {" — "}
                      {new Date(d.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/qurban/discounts/${d.id}/edit`}
                          className="p-1 hover:text-primary-600 text-gray-400"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {d.isActive && (
                          <button
                            onClick={() => {
                              if (confirm("Nonaktifkan diskon ini?")) {
                                deactivateMutation.mutate(d.id);
                              }
                            }}
                            className="p-1 hover:text-yellow-600 text-gray-400"
                            title="Nonaktifkan"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        {d.usageCount === 0 && (
                          <button
                            onClick={() => {
                              if (confirm("Hapus diskon ini? Tindakan tidak dapat dibatalkan.")) {
                                deleteMutation.mutate(d.id);
                              }
                            }}
                            className="p-1 hover:text-red-600 text-gray-400"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
