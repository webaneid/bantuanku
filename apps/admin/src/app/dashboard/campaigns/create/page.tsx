"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import CampaignForm, { CampaignFormData } from "@/components/CampaignForm";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function CreateCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      return api.post("/admin/campaigns", data);
    },
    onSuccess: () => {
      toast.success("Campaign berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      router.push("/dashboard/campaigns");
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
            : "Gagal membuat campaign";
      toast.error(msg);
    },
  });

  const handleSubmit = (data: CampaignFormData) => {
    const payload: CampaignFormData = {
      ...data,
      imageUrl: data.imageUrl || undefined,
      images: Array.isArray(data.images)
        ? data.images
        : data.images
        ? [data.images].filter(Boolean)
        : [],
    };
    createMutation.mutate(payload);
  };

  const handleCancel = () => {
    router.push("/dashboard/campaigns");
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
          <h1 className="form-page-title">Buat Campaign Baru</h1>
          <p className="form-page-subtitle">
            Isi form di bawah untuk membuat campaign fundraising baru
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-page-card">
        <CampaignForm
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
            form="campaign-form"
            className="btn btn-primary btn-lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Menyimpan..." : "Buat Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
