"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

interface DiscountForm {
  name: string;
  type: "automatic" | "voucher";
  discountType: "percentage" | "nominal";
  discountValue: string;
  maxDiscount: string;
  scopeType: "all" | "package" | "package_period" | "animal_type";
  scopeId: string;
  code: string;
  startDate: string;
  endDate: string;
  maxUsage: string;
  isActive: boolean;
  description: string;
}

const defaultForm: DiscountForm = {
  name: "",
  type: "automatic",
  discountType: "percentage",
  discountValue: "",
  maxDiscount: "",
  scopeType: "all",
  scopeId: "",
  code: "",
  startDate: "",
  endDate: "",
  maxUsage: "",
  isActive: true,
  description: "",
};

export default function NewDiscountPage() {
  const router = useRouter();
  const [form, setForm] = useState<DiscountForm>(defaultForm);
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/admin/qurban/discounts", data);
      return res.data;
    },
    onSuccess: () => router.push("/dashboard/qurban/discounts"),
    onError: (err: any) => setError(err.response?.data?.message || "Gagal membuat diskon"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload: any = {
      name: form.name,
      type: form.type,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      scopeType: form.scopeType,
      scopeId: form.scopeId || null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
      endDate: form.endDate ? new Date(form.endDate + "T23:59:59").toISOString() : "",
      isActive: form.isActive,
      description: form.description || null,
    };

    if (form.maxDiscount) payload.maxDiscount = Number(form.maxDiscount);
    if (form.maxUsage) payload.maxUsage = Number(form.maxUsage);
    if (form.type === "voucher") payload.code = form.code.toUpperCase();

    createMutation.mutate(payload);
  };

  const set = (field: keyof DiscountForm, val: any) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/qurban/discounts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Tag className="w-5 h-5 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900">Buat Diskon / Voucher Baru</h1>
      </div>

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
            placeholder="Contoh: Promo Idul Adha 2027"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon *</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="automatic">Otomatis (tanpa kode)</option>
              <option value="voucher">Voucher (perlu kode)</option>
            </select>
          </div>

          {form.type === "voucher" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Voucher *</label>
              <input
                type="text"
                required={form.type === "voucher"}
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="QURBAN10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Potongan *</label>
            <select
              value={form.discountType}
              onChange={(e) => set("discountType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="percentage">Persentase (%)</option>
              <option value="nominal">Nominal (Rp)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Diskon * {form.discountType === "percentage" ? "(1-100%)" : "(Rp)"}
            </label>
            <input
              type="number"
              required
              min={1}
              max={form.discountType === "percentage" ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
              placeholder={form.discountType === "percentage" ? "10" : "50000"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {form.discountType === "percentage" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maks Diskon (Rp) — opsional</label>
            <input
              type="number"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              placeholder="Kosongkan jika tidak ada batas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Untuk *</label>
          <select
            value={form.scopeType}
            onChange={(e) => { set("scopeType", e.target.value); set("scopeId", ""); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Semua Paket Qurban</option>
            <option value="animal_type">Jenis Hewan Tertentu</option>
            <option value="package">Paket Master Tertentu (ID)</option>
            <option value="package_period">Package-Period Tertentu (ID)</option>
          </select>
        </div>

        {form.scopeType === "animal_type" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Hewan *</label>
            <select
              value={form.scopeId}
              onChange={(e) => set("scopeId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Pilih jenis hewan</option>
              <option value="cow">Sapi</option>
              <option value="goat">Kambing</option>
              <option value="sheep">Domba</option>
            </select>
          </div>
        )}

        {(form.scopeType === "package" || form.scopeType === "package_period") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.scopeType === "package" ? "Package ID *" : "Package-Period ID *"}
            </label>
            <input
              type="text"
              required
              value={form.scopeId}
              onChange={(e) => set("scopeId", e.target.value)}
              placeholder={form.scopeType === "package" ? "ID paket master" : "ID package-period"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai (WIB) *</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir (WIB) *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Maks Penggunaan — opsional</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Internal — opsional</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Keterangan untuk tim internal"
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
          <label htmlFor="isActive" className="text-sm text-gray-700">Aktifkan langsung</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Menyimpan..." : "Simpan"}
          </button>
          <Link href="/dashboard/qurban/discounts" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
