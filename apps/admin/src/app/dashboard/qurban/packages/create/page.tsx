"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import QurbanPackageForm, { QurbanPackageFormData } from "@/components/QurbanPackageForm";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function CreateQurbanPackagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: QurbanPackageFormData) => {
      const payload = {
        name: data.name,
        description: data.description,
        animalType: data.animalType,
        packageType: data.packageType,
        maxSlots: data.packageType === "shared" ? data.maxSlots : null,
        imageUrl: data.imageUrl || null,
        isFeatured: data.isFeatured,
        periods: data.periods,
      };
      return api.post("/admin/qurban/packages", payload);
    },
    onSuccess: () => {
      toast.success("Paket qurban berhasil ditambahkan!");
      queryClient.invalidateQueries({ queryKey: ["qurban-packages"] });
      router.push("/dashboard/qurban/packages");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambahkan paket qurban");
    },
  });

  const handleSubmit = (data: QurbanPackageFormData) => {
    createMutation.mutate(data);
  };

  const handleCancel = () => {
    router.push("/dashboard/qurban/packages");
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="form-page-header">
        <button
          className="btn btn-secondary btn-md"
          onClick={handleCancel}
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>

        <div className="form-page-header-content">
          <h1 className="form-page-title">Tambah Paket Qurban</h1>
          <p className="form-page-subtitle">
            Buat paket hewan qurban baru yang dapat dijual di berbagai periode
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <QurbanPackageForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />

        {/* Form Actions */}
        <div className="form-page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={handleCancel}
            disabled={createMutation.isPending}
          >
            Batal
          </button>
          <button
            type="submit"
            form="qurban-package-form"
            className="btn btn-primary btn-lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Menyimpan..." : "Simpan Paket"}
          </button>
        </div>
      </div>
    </div>
  );
}
