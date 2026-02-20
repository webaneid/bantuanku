"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import FeedbackDialog from "@/components/FeedbackDialog";
import PageForm, { type PageFormData } from "@/components/PageForm";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function EditPageAdminPage() {
  const params = useParams<{ id: string }>();
  const pageId = params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const canManage = Boolean(user?.roles?.includes("super_admin") || user?.roles?.includes("admin_campaign"));

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["admin-page-detail", pageId],
    queryFn: async () => {
      const response = await api.get(`/admin/pages/${pageId}`);
      return response.data?.data;
    },
    enabled: canManage && !!pageId,
  });

  const initialData = useMemo(() => {
    if (!pageData) return undefined;
    return {
      title: pageData.title || "",
      slug: pageData.slug || "",
      featureImageUrl: pageData.featureImageUrl || "",
      excerpt: pageData.excerpt || "",
      content: pageData.content || "",
      isPublished: Boolean(pageData.isPublished),
      // SEO fields
      metaTitle: pageData.metaTitle || "",
      metaDescription: pageData.metaDescription || "",
      focusKeyphrase: pageData.focusKeyphrase || "",
      canonicalUrl: pageData.canonicalUrl || "",
      noIndex: Boolean(pageData.noIndex),
      noFollow: Boolean(pageData.noFollow),
      ogTitle: pageData.ogTitle || "",
      ogDescription: pageData.ogDescription || "",
      ogImageUrl: pageData.ogImageUrl || "",
      seoScore: pageData.seoScore || 0,
    };
  }, [pageData]);

  const updateMutation = useMutation({
    mutationFn: async (payload: PageFormData) => {
      const response = await api.put(`/admin/pages/${pageId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-page-detail", pageId] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Halaman berhasil diperbarui.",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err?.response?.data?.message || "Gagal memperbarui halaman.",
      });
    },
  });

  if (!canManage) {
    return (
      <div className="dashboard-container">
        <h1 className="text-2xl font-bold text-gray-900">Edit Page</h1>
        <p className="text-sm text-gray-600 mt-2">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  if (isLoading || !initialData) {
    if (!isLoading && !initialData) {
      return (
        <div className="dashboard-container">
          <h1 className="text-2xl font-bold text-gray-900">Edit Page</h1>
          <p className="text-sm text-gray-600 mt-2">Halaman tidak ditemukan.</p>
        </div>
      );
    }

    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="form-page-header">
        <button
          className="btn btn-secondary btn-md"
          onClick={() => router.push("/dashboard/pages")}
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>

        <div className="form-page-header-content">
          <h1 className="form-page-title">Edit Page</h1>
          <p className="form-page-subtitle">
            Ubah konten halaman statis dan update status publish sesuai kebutuhan.
          </p>
        </div>
      </div>

      <div className="form-page-card">
        <PageForm
          initialData={initialData}
          isLoading={updateMutation.isPending}
          onCancel={() => router.push("/dashboard/pages")}
          onSubmit={(data, mode) => {
            updateMutation.mutate({
              ...data,
              isPublished: mode === "publish",
            });
          }}
        />
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
            router.push("/dashboard/pages");
          }
        }}
      />
    </div>
  );
}
