"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import ZakatTypeForm, { ZakatTypeFormData } from "@/components/ZakatTypeForm";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function CreateZakatTypePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: ZakatTypeFormData) => {
      return api.post("/admin/zakat/types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-types-active"] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Jenis zakat berhasil ditambahkan!",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal menambahkan jenis zakat",
      });
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

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, open: false }));
          if (redirectAfterFeedback) {
            setRedirectAfterFeedback(false);
            router.push("/dashboard/zakat/types");
          }
        }}
      />
    </div>
  );
}
