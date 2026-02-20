"use client";

import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import ZakatTypeForm, { ZakatTypeFormData } from "@/components/ZakatTypeForm";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function EditZakatTypePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const zakatTypeId = params.id as string;
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  // Fetch zakat type data
  const { data: zakatTypeData, isLoading } = useQuery({
    queryKey: ["zakat-type", zakatTypeId],
    queryFn: async () => {
      const response = await api.get(`/admin/zakat/types/${zakatTypeId}`);
      return response.data.data;
    },
  });

  // Transform zakat type data for form
  const zakatType = zakatTypeData ? {
    name: zakatTypeData.name,
    slug: zakatTypeData.slug,
    description: zakatTypeData.description || "",
    imageUrl: zakatTypeData.imageUrl,
    icon: zakatTypeData.icon || "",
    hasCalculator: zakatTypeData.hasCalculator,
    isActive: zakatTypeData.isActive,
    displayOrder: zakatTypeData.displayOrder,
    calculatorType: zakatTypeData.calculatorType || "",
    fitrahAmount: zakatTypeData.fitrahAmount || "",
    // SEO fields
    metaTitle: zakatTypeData.metaTitle || "",
    metaDescription: zakatTypeData.metaDescription || "",
    focusKeyphrase: zakatTypeData.focusKeyphrase || "",
    canonicalUrl: zakatTypeData.canonicalUrl || "",
    noIndex: Boolean(zakatTypeData.noIndex),
    noFollow: Boolean(zakatTypeData.noFollow),
    ogTitle: zakatTypeData.ogTitle || "",
    ogDescription: zakatTypeData.ogDescription || "",
    ogImageUrl: zakatTypeData.ogImageUrl || "",
    seoScore: zakatTypeData.seoScore || 0,
  } : undefined;

  const updateMutation = useMutation({
    mutationFn: async (data: ZakatTypeFormData) => {
      return api.put(`/admin/zakat/types/${zakatTypeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zakat-types-all"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-types-active"] });
      queryClient.invalidateQueries({ queryKey: ["zakat-type", zakatTypeId] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Jenis zakat berhasil diperbarui!",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui jenis zakat",
      });
    },
  });

  const handleSubmit = (data: ZakatTypeFormData) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    router.push("/dashboard/zakat/types");
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

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
          <h1 className="form-page-title">Edit Jenis Zakat</h1>
          <p className="form-page-subtitle">
            Perbarui informasi jenis zakat
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <ZakatTypeForm
          onSubmit={handleSubmit}
          initialData={zakatType}
          isLoading={updateMutation.isPending}
        />

        {/* Form Actions */}
        <div className="form-page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            Batal
          </button>
          <button
            type="submit"
            form="zakat-type-form"
            className="btn btn-primary btn-lg"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Menyimpan..." : "Update Jenis Zakat"}
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
