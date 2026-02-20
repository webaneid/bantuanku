"use client";

import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import CampaignForm, { CampaignFormData } from "@/components/CampaignForm";
import { useState } from "react";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const campaignId = params.id as string;
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  // Fetch campaign data
  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const response = await api.get(`/admin/campaigns/${campaignId}`);
      return response.data.data;
    },
  });

  // Transform campaign data for form
  const campaign = campaignData ? {
    title: campaignData.title,
    description: campaignData.description,
    content: campaignData.content,
    imageUrl: campaignData.imageUrl,
    images: campaignData.images,
    videoUrl: campaignData.videoUrl,
    goal: Number(campaignData.goal),
    category: campaignData.categoryId, // Map categoryId to category for form
    categoryId: campaignData.categoryId,
    pillar: campaignData.pillar,
    coordinatorId: campaignData.coordinatorId,
    mitraId: campaignData.mitraId,
    mitraName: campaignData.mitraName,
    status: campaignData.status,
    startDate: campaignData.startDate ? new Date(campaignData.startDate).toISOString().split('T')[0] : undefined,
    endDate: campaignData.endDate ? new Date(campaignData.endDate).toISOString().split('T')[0] : undefined,
    isFeatured: campaignData.isFeatured,
    isUrgent: campaignData.isUrgent,
    // SEO fields
    metaTitle: campaignData.metaTitle || "",
    metaDescription: campaignData.metaDescription || "",
    focusKeyphrase: campaignData.focusKeyphrase || "",
    canonicalUrl: campaignData.canonicalUrl || "",
    noIndex: Boolean(campaignData.noIndex),
    noFollow: Boolean(campaignData.noFollow),
    ogTitle: campaignData.ogTitle || "",
    ogDescription: campaignData.ogDescription || "",
    ogImageUrl: campaignData.ogImageUrl || "",
    seoScore: campaignData.seoScore || 0,
  } : undefined;

  const updateMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      return api.put(`/admin/campaigns/${campaignId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Campaign berhasil diperbarui!",
      });
    },
    onError: (error: any) => {
      const issues =
        error.response?.data?.issues ||
        error.response?.data?.error ||
        error.response?.data?.message;
      const msg = Array.isArray(issues) && issues.length > 0
        ? `${issues[0]?.path?.join(".") || "field"}: ${issues[0]?.message || "tidak valid"}`
        : typeof issues === "string"
          ? issues
          : issues
            ? JSON.stringify(issues)
            : "Gagal memperbarui campaign";
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: msg,
      });
    },
  });

  const handleSubmit = (data: CampaignFormData) => {
    console.log("Form data before transformation:", data);

    // Build clean payload
    const payload: any = {
      title: data.title,
      description: data.description,
      content: data.content || undefined,
      imageUrl: data.imageUrl || undefined,
      videoUrl: data.videoUrl || undefined,
      goal: Number(data.goal),
      categoryId: data.categoryId,
      pillar: data.pillar || undefined,
      coordinatorId: data.coordinatorId || null,
      status: data.status,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      isFeatured: data.isFeatured || false,
      isUrgent: data.isUrgent || false,
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

    // Handle images array
    if (data.images) {
      payload.images = Array.isArray(data.images)
        ? data.images.filter(Boolean)
        : [data.images].filter(Boolean);
    }

    console.log("Payload being sent to backend:", payload);
    updateMutation.mutate(payload);
  };

  const handleCancel = () => {
    router.push("/dashboard/campaigns");
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
          <h1 className="form-page-title">Edit Campaign</h1>
          <p className="form-page-subtitle">
            Perbarui informasi campaign fundraising
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <CampaignForm
          onSubmit={handleSubmit}
          initialData={campaign}
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
            form="campaign-form"
            className="btn btn-primary btn-lg"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Menyimpan..." : "Update Campaign"}
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
            router.push("/dashboard/campaigns");
          }
        }}
      />
    </div>
  );
}
