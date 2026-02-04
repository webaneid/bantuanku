"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Modal from "@/components/Modal";
import { toast } from "react-hot-toast";
import { useState } from "react";

export default function ViewActivityReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["activity-report", id],
    queryFn: async () => {
      const response = await api.get(`/admin/activity-reports/${id}`);
      return response.data?.data;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      return api.post(`/admin/activity-reports/${id}/publish`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-report", id] });
      queryClient.invalidateQueries({ queryKey: ["activity-reports"] });
      toast.success("Status laporan berhasil diubah");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal mengubah status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/admin/activity-reports/${id}`);
    },
    onSuccess: () => {
      toast.success("Laporan kegiatan berhasil dihapus");
      router.push("/dashboard/campaigns/activity-reports");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal menghapus laporan");
    },
  });

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-12">
          <p className="text-gray-500">Laporan tidak ditemukan</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/campaigns/activity-reports")}
            className="btn btn-primary btn-md mt-4"
          >
            Kembali ke Daftar Laporan
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    return status === "published"
      ? "bg-success-100 text-success-700"
      : "bg-gray-100 text-gray-700";
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/campaigns/activity-reports")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali ke Daftar Laporan
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail Laporan Kegiatan</h1>
            <p className="text-gray-600 mt-1">Informasi lengkap laporan kegiatan</p>
          </div>
          <div className="flex gap-3">
            {report.status === "draft" ? (
              <button
                type="button"
                onClick={() => publishMutation.mutate("published")}
                className="btn btn-success btn-md"
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? "Publishing..." : "Publish"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => publishMutation.mutate("draft")}
                className="btn btn-secondary btn-md"
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? "Unpublishing..." : "Unpublish"}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push(`/dashboard/campaigns/activity-reports/${id}/edit`)}
              className="btn btn-primary btn-md"
            >
              <PencilIcon className="w-5 h-5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn btn-danger btn-md"
            >
              <TrashIcon className="w-5 h-5" />
              Hapus
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Status & Metadata */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex items-center justify-between">
            <span className={`badge ${getStatusBadge(report.status)}`}>
              {report.status === "draft" ? "Draft" : "Published"}
            </span>
            <div className="text-sm text-gray-500">
              Dibuat: {format(new Date(report.createdAt), "dd MMMM yyyy, HH:mm", { locale: idLocale })}
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Campaign</h3>
          <p className="text-lg font-semibold text-gray-900">{report.campaign?.title || "-"}</p>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">{report.title}</h2>
        </div>

        {/* Activity Date */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Tanggal Kegiatan</h3>
          <p className="text-lg text-gray-900">
            {format(new Date(report.activityDate), "dd MMMM yyyy", { locale: idLocale })}
          </p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Deskripsi Kegiatan</h3>
          <div
            className="prose max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: report.description }}
          />
        </div>

        {/* Gallery */}
        {report.gallery && report.gallery.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Gallery Foto</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {report.gallery.map((url: string, index: number) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <img
                    src={url}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {report.creator && (
          <div className="border-t border-gray-200 pt-6 text-sm text-gray-500">
            <p>Dibuat oleh: {report.creator.name}</p>
            {report.publishedAt && (
              <p>Dipublikasikan: {format(new Date(report.publishedAt), "dd MMMM yyyy, HH:mm", { locale: idLocale })}</p>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Hapus Laporan Kegiatan"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus laporan &quot;{report.title}&quot;?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn btn-secondary btn-md"
              disabled={deleteMutation.isPending}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="btn btn-danger btn-md"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
