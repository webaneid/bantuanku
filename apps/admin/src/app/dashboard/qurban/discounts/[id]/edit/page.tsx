"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

export default function EditDiscountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState("");

  const [form, setForm] = useState<any>({
    name: "",
    isActive: true,
    description: "",
    maxUsage: "",
    maxDiscount: "",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["qurban-discount", id],
    queryFn: async () => {
      const res = await api.get(`/admin/qurban/discounts/${id}`);
      return res.data.data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || "",
        isActive: data.isActive ?? true,
        description: data.description || "",
        maxUsage: data.maxUsage != null ? String(data.maxUsage) : "",
        maxDiscount: data.maxDiscount != null ? String(data.maxDiscount) : "",
        startDate: data.startDate ? data.startDate.substring(0, 10) : "",
        endDate: data.endDate ? data.endDate.substring(0, 10) : "",
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/admin/qurban/discounts/${id}`, payload);
      return res.data;
    },
    onSuccess: () => router.push(`/dashboard/qurban/discounts/${id}`),
    onError: (err: any) => setError(err.response?.data?.message || "Gagal mengupdate diskon"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload: any = {
      name: form.name,
      isActive: form.isActive,
      description: form.description || null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate + "T23:59:59").toISOString() : undefined,
    };

    if (form.maxUsage !== "") payload.maxUsage = Number(form.maxUsage);
    if (form.maxDiscount !== "") payload.maxDiscount = Number(form.maxDiscount);

    updateMutation.mutate(payload);
  };

  const set = (field: string, val: any) => setForm((prev: any) => ({ ...prev, [field]: val }));

  if (isLoading) return <div className="p-6 text-gray-500">Memuat...</div>;
  if (!data) return <div className="p-6 text-gray-500">Diskon tidak ditemukan</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/qurban/discounts/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Tag className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900">Edit Diskon</h1>
      </div>

      {data.usageCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          Diskon ini sudah digunakan {data.usageCount} kali. Field krusial (tipe, nilai, kode) tidak bisa diubah.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Program *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Read-only fields (can't be edited if usageCount > 0) */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipe (tidak bisa diubah)</label>
            <p className="font-medium text-sm">{data.type === "automatic" ? "Otomatis" : "Voucher"}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nilai Diskon (tidak bisa diubah)</label>
            <p className="font-medium text-sm">
              {data.discountType === "percentage" ? `${data.discountValue}%` : `Rp ${Number(data.discountValue).toLocaleString("id-ID")}`}
            </p>
          </div>
          {data.code && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kode Voucher (tidak bisa diubah)</label>
              <p className="font-mono font-semibold text-sm">{data.code}</p>
            </div>
          )}
        </div>

        {data.discountType === "percentage" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maks Diskon (Rp)</label>
            <input
              type="number"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              placeholder="Kosongkan jika tidak ada batas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir *</label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Maks Penggunaan</label>
          <input
            type="number"
            min={1}
            value={form.maxUsage}
            onChange={(e) => set("maxUsage", e.target.value)}
            placeholder="Kosongkan untuk unlimited"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Internal</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="w-4 h-4 text-primary-600"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Diskon aktif</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <Link
            href={`/dashboard/qurban/discounts/${id}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
