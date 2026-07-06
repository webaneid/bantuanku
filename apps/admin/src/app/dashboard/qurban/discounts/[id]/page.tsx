"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, ArrowLeft, Edit2, Power } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function DiscountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: discountData, isLoading } = useQuery({
    queryKey: ["qurban-discount", id],
    queryFn: async () => {
      const res = await api.get(`/admin/qurban/discounts/${id}`);
      return res.data.data;
    },
  });

  const { data: usagesData } = useQuery({
    queryKey: ["qurban-discount-usages", id],
    queryFn: async () => {
      const res = await api.get(`/admin/qurban/discounts/${id}/usages?limit=50`);
      return res.data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => api.post(`/admin/qurban/discounts/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-discount", id] });
    },
  });

  if (isLoading) return <div className="p-6 text-gray-500">Memuat...</div>;
  if (!discountData) return <div className="p-6 text-gray-500">Diskon tidak ditemukan</div>;

  const d = discountData;
  const usages = usagesData?.data || [];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/qurban/discounts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Tag className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900">{d.name}</h1>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/dashboard/qurban/discounts/${id}/edit`}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Link>
          {d.isActive && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-yellow-300 text-yellow-700 rounded-lg text-sm hover:bg-yellow-50"
            >
              <Power className="w-4 h-4" />
              Nonaktifkan
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500">Tipe</dt>
            <dd className="font-medium">{d.type === "automatic" ? "Otomatis" : "Voucher"}</dd>
          </div>
          {d.code && (
            <div>
              <dt className="text-gray-500">Kode Voucher</dt>
              <dd className="font-mono font-semibold">{d.code}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Nilai Diskon</dt>
            <dd className="font-medium">
              {d.discountType === "percentage"
                ? `${d.discountValue}%${d.maxDiscount ? ` (maks Rp ${Number(d.maxDiscount).toLocaleString("id-ID")})` : ""}`
                : `Rp ${Number(d.discountValue).toLocaleString("id-ID")}`}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Scope</dt>
            <dd className="font-medium">
              {d.scopeType === "all" ? "Semua Paket" : `${d.scopeType}: ${d.scopeId}`}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Berlaku</dt>
            <dd>
              {new Date(d.startDate).toLocaleDateString("id-ID")} — {new Date(d.endDate).toLocaleDateString("id-ID")}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Penggunaan</dt>
            <dd>{d.usageCount}{d.maxUsage ? ` / ${d.maxUsage}` : " (unlimited)"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {d.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </dd>
          </div>
          {d.description && (
            <div className="col-span-2">
              <dt className="text-gray-500">Catatan</dt>
              <dd>{d.description}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Riwayat Penggunaan ({usages.length})
        </h2>
        {usages.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada penggunaan</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 text-gray-500">
                <th className="pb-2 font-medium">Donatur</th>
                <th className="pb-2 font-medium">Order / Tabungan</th>
                <th className="pb-2 font-medium">Potongan</th>
                <th className="pb-2 font-medium">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usages.map((u: any) => (
                <tr key={u.id} className="text-gray-700">
                  <td className="py-2">{u.donorName || u.donorPhone || "—"}</td>
                  <td className="py-2 font-mono text-xs">
                    {u.orderNumber || u.savingsNumber || "—"}
                  </td>
                  <td className="py-2">Rp {Number(u.discountAmount).toLocaleString("id-ID")}</td>
                  <td className="py-2 text-gray-500">
                    {new Date(u.appliedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Nonaktifkan Diskon</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Nonaktifkan diskon <strong>{d.name}</strong>? Diskon tidak bisa digunakan setelah dinonaktifkan.
              </p>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 bg-white text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deactivateMutation.mutate();
                  setConfirmOpen(false);
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
