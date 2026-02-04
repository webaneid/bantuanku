"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import ZakatTypeForm, { ZakatTypeFormData } from "@/components/ZakatTypeForm";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function CreateZakatTypePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: ZakatTypeFormData) => {
      return api.post("/admin/zakat/types", data);
    },
    onSuccess: () => {
      toast.success("Jenis zakat berhasil ditambahkan!");
      queryClient.invalidateQueries({ queryKey: ["zakat-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-types-active"] });
      router.push("/dashboard/zakat/types");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menambahkan jenis zakat");
    },
  });

  const handleSubmit = (data: ZakatTypeFormData) => {
    createMutation.mutate(data);
  };

  const handleCancel = () => {
    router.push("/dashboard/zakat/types");
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
          <h1 className="form-page-title">Tambah Jenis Zakat</h1>
          <p className="form-page-subtitle">
            Buat jenis zakat baru untuk sistem
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <ZakatTypeForm
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
            form="zakat-type-form"
            className="btn btn-primary btn-lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Menyimpan..." : "Simpan Jenis Zakat"}
          </button>
        </div>
      </div>
    </div>
  );
}
