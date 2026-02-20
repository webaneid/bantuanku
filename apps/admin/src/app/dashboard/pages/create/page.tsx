"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import FeedbackDialog from "@/components/FeedbackDialog";
import PageForm, { type PageFormData } from "@/components/PageForm";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function CreatePageAdminPage() {
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

  const createMutation = useMutation({
    mutationFn: async (payload: PageFormData) => {
      const response = await api.post("/admin/pages", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Halaman berhasil dibuat.",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err?.response?.data?.message || "Gagal membuat halaman.",
      });
    },
  });

  if (!canManage) {
    return (
      <div className="dashboard-container">
        <h1 className="text-2xl font-bold text-gray-900">Tambah Page</h1>
        <p className="text-sm text-gray-600 mt-2">Anda tidak memiliki akses ke halaman ini.</p>
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
          <h1 className="form-page-title">Tambah Page</h1>
          <p className="form-page-subtitle">
            Buat halaman statis baru dan publish saat sudah siap.
          </p>
        </div>
      </div>

      <div className="form-page-card">
        <PageForm
          isLoading={createMutation.isPending}
          onCancel={() => router.push("/dashboard/pages")}
          onSubmit={(data, mode) => {
            createMutation.mutate({
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
