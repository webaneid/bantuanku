"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface CmsPageItem {
  id: string;
  title: string;
  slug: string;
  featureImageUrl: string | null;
  excerpt: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PagesAdminListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<CmsPageItem | null>(null);

  const canManage = useMemo(
    () => Boolean(user?.roles?.includes("super_admin") || user?.roles?.includes("admin_campaign")),
    [user?.roles]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pages", search, status, page],
    queryFn: async () => {
      const response = await api.get("/admin/pages", {
        params: {
          search: search || undefined,
          status,
          page,
          limit: 20,
        },
      });
      return response.data;
    },
    enabled: canManage,
  });

  const items: CmsPageItem[] = data?.data || [];
  const pagination: PaginationData = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Halaman berhasil dihapus.",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err?.response?.data?.message || "Gagal menghapus halaman.",
      });
    },
  });

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (!canManage) {
    return (
      <div className="dashboard-container">
        <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        <p className="text-sm text-gray-600 mt-2">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600 mt-1">Kelola halaman statis seperti Tentang Kami, Kontak, dan lainnya.</p>
        </div>
        <Link href="/dashboard/pages/create" className="btn btn-primary btn-md">
          <PlusIcon className="w-5 h-5" />
          Tambah Halaman
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            className="form-input"
            placeholder="Cari judul atau slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="form-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | "published" | "draft");
              setPage(1);
            }}
          >
            <option value="all">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <div className="text-sm text-gray-500 flex items-center justify-start md:justify-end">
            Total: {pagination.total}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Judul</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Dipublish</th>
              <th>Diperbarui</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">Belum ada halaman.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {item.featureImageUrl ? (
                        <img
                          src={item.featureImageUrl}
                          alt={item.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{item.excerpt || "-"}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-sm font-mono text-gray-600">/page/{item.slug}</span></td>
                  <td>
                    {item.isPublished ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-50 text-success-700">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Draft
                      </span>
                    )}
                  </td>
                  <td><span className="text-sm text-gray-600">{formatDate(item.publishedAt)}</span></td>
                  <td><span className="text-sm text-gray-600">{formatDate(item.updatedAt)}</span></td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/dashboard/pages/${item.id}/edit`} className="action-btn action-edit" title="Edit halaman">
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        className="action-btn action-delete"
                        onClick={() => setDeleteTarget(item)}
                        title="Hapus halaman"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-600">
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
          >
            Berikutnya
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Hapus Halaman</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                Anda yakin ingin menghapus halaman <span className="font-semibold">{deleteTarget.title}</span>?
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-md"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
