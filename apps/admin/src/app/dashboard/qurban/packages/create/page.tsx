"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import QurbanPackageForm, { QurbanPackageFormData } from "@/components/QurbanPackageForm";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function CreateQurbanPackagePage() {
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
        // SEO fields
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        focusKeyphrase: data.focusKeyphrase || null,
        canonicalUrl: data.canonicalUrl || null,
        noIndex: data.noIndex || false,
        noFollow: data.noFollow || false,
        ogTitle: data.ogTitle || null,
        ogDescription: data.ogDescription || null,
        ogImageUrl: data.ogImageUrl || null,
        seoScore: data.seoScore || 0,
      };
      return api.post("/admin/qurban/packages", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-packages"] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Paket qurban berhasil ditambahkan!",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal menambahkan paket qurban",
      });
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

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, open: false }));
          if (redirectAfterFeedback) {
            setRedirectAfterFeedback(false);
            router.push("/dashboard/qurban/packages");
          }
        }}
      />
    </div>
  );
}
