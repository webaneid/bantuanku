"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import QurbanPackageForm, { QurbanPackageFormData } from "@/components/QurbanPackageForm";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function EditQurbanPackagePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const packageId = params.id as string;
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  // Fetch existing package data
  const { data: packageData, isLoading } = useQuery({
    queryKey: ["qurban-package", packageId],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/packages/${packageId}`);
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
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
      return api.patch(`/admin/qurban/packages/${packageId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qurban-packages"] });
      queryClient.invalidateQueries({ queryKey: ["qurban-package", packageId] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Paket qurban berhasil diperbarui!",
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui paket qurban",
      });
    },
  });

  const handleSubmit = (data: QurbanPackageFormData) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    router.push("/dashboard/qurban/packages");
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

  // Transform data for form
  const qurbanPackage = packageData ? {
    name: packageData.name,
    description: packageData.description || "",
    animalType: packageData.animalType,
    packageType: packageData.packageType,
    maxSlots: packageData.maxSlots || undefined,
    imageUrl: packageData.imageUrl,
    isFeatured: packageData.isFeatured,
    // SEO fields
    metaTitle: packageData.metaTitle || "",
    metaDescription: packageData.metaDescription || "",
    focusKeyphrase: packageData.focusKeyphrase || "",
    canonicalUrl: packageData.canonicalUrl || "",
    noIndex: Boolean(packageData.noIndex),
    noFollow: Boolean(packageData.noFollow),
    ogTitle: packageData.ogTitle || "",
    ogDescription: packageData.ogDescription || "",
    ogImageUrl: packageData.ogImageUrl || "",
    seoScore: packageData.seoScore || 0,
    periods: packageData.periods?.map((p: any) => ({
      periodId: p.periodId,
      periodName: p.periodName,
      price: p.price,
      stock: p.stock,
      isAvailable: p.isAvailable ?? true,
      executionDateOverride: p.executionDateOverride
        ? new Date(p.executionDateOverride).toISOString().split("T")[0]
        : "",
      executionTimeNote: p.executionTimeNote || "",
      executionLocation: p.executionLocation || "",
      executionNotes: p.executionNotes || "",
    })) || [],
  } : undefined;

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
          <h1 className="form-page-title">Edit Paket Qurban</h1>
          <p className="form-page-subtitle">
            Perbarui informasi paket hewan qurban
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <QurbanPackageForm
          onSubmit={handleSubmit}
          initialData={qurbanPackage}
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
            form="qurban-package-form"
            className="btn btn-primary btn-lg"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
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
