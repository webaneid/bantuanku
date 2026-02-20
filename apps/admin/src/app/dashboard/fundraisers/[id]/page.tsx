"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiah } from "@/lib/format";
import Pagination from "@/components/Pagination";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "";

const typeLabelMap: Record<string, string> = {
  campaign: "Campaign",
  zakat: "Zakat",
  qurban: "Qurban",
};

const typeBadgeMap: Record<string, string> = {
  campaign: "bg-primary-50 text-primary-700",
  zakat: "bg-emerald-50 text-emerald-700",
  qurban: "bg-amber-50 text-amber-700",
};

function SocialShareButtons({
  url,
  title,
  onCopySuccess,
}: {
  url: string;
  title: string;
  onCopySuccess: () => void;
}) {
  const text = encodeURIComponent(`${title} - ${url}`);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex items-center gap-1">
      {/* Copy */}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url);
          onCopySuccess();
        }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        title="Copy link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      {/* WhatsApp */}
      <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="WhatsApp">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      {/* Facebook */}
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Facebook">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      {/* X / Twitter */}
      <a href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-900 transition-colors" title="X">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      {/* LinkedIn */}
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition-colors" title="LinkedIn">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      {/* Threads */}
      <a href={`https://www.threads.net/intent/post?text=${text}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-900 transition-colors" title="Threads">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 2.227-.017 4.074-.517 5.49-1.482 1.2-.82 2.1-1.97 2.1-3.39 0-1.317-.575-2.16-1.71-2.502-.814-.244-1.747-.261-2.39.015-.452.196-.784.488-.98.866 1.677.226 3.186.712 3.84 2.027.45.903.396 1.965-.15 2.988-.63 1.185-1.775 1.974-3.412 2.353-.87.2-1.79.254-2.74.16-2.31-.228-4.08-1.168-4.88-2.587-.69-1.225-.76-2.82-.186-4.245.667-1.65 2.106-2.942 4.17-3.738.175-.067.353-.13.534-.189-.055-.915-.217-1.727-.485-2.352-.405-.943-1.078-1.48-1.893-1.51h-.063c-.776 0-1.46.357-1.924 1.006-.495.694-.73 1.662-.676 2.797l-2.12.1c-.09-1.653.3-3.09 1.1-4.06.87-1.058 2.13-1.619 3.618-1.619h.093c1.401.051 2.527.788 3.164 2.073.355.715.573 1.58.652 2.548 1.2-.215 2.449-.182 3.575.186 1.907.624 3.091 2.16 3.091 4.352 0 2.163-1.321 3.855-3.066 5.044-1.782 1.214-4.052 1.824-6.69 1.845z" />
        </svg>
      </a>
    </div>
  );
}

const statusBadgeMap: Record<string, string> = {
  pending: "bg-warning-50 text-warning-700",
  active: "bg-success-50 text-success-700",
  suspended: "bg-red-50 text-red-700",
};

const getStatusBadgeClass = (status: string) => {
  return statusBadgeMap[status?.toLowerCase() || ""] || "bg-gray-100 text-gray-700";
};

export default function FundraiserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);
  const [referralPage, setReferralPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"share" | "pendapatan">("share");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);
  const [editForm, setEditForm] = useState({
    commissionPercentage: "",
    notes: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fundraiser", id],
    queryFn: async () => {
      const response = await api.get(`/admin/fundraisers/${id}`);
      return response.data?.data;
    },
  });

  const { data: referralsData } = useQuery({
    queryKey: ["fundraiser-referrals", id, referralPage],
    queryFn: async () => {
      const response = await api.get(`/admin/fundraisers/${id}/referrals`, {
        params: { page: referralPage, limit: 10 },
      });
      return response.data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ["fundraiser-active-programs"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers/active-programs");
      return response.data?.data || [];
    },
    enabled: !!data && data.status === "active",
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/admin/fundraisers/${id}/approve`, {}),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Fundraiser berhasil di-approve",
      });
      refetch();
    },
    onError: (err: any) =>
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal approve",
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/admin/fundraisers/${id}/suspend`, {}),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Fundraiser berhasil di-suspend",
      });
      refetch();
    },
    onError: (err: any) =>
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal suspend",
      }),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/admin/fundraisers/${id}/activate`, {}),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Fundraiser berhasil diaktifkan",
      });
      refetch();
    },
    onError: (err: any) =>
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal aktivasi",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/admin/fundraisers/${id}`, payload),
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Fundraiser berhasil diupdate",
      });
      setShowEditModal(false);
      refetch();
    },
    onError: (err: any) =>
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal update",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/fundraisers/${id}`),
    onSuccess: () => {
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Fundraiser berhasil dihapus",
      });
      setShowDeleteModal(false);
    },
    onError: (err: any) =>
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal hapus",
      }),
  });

  const handleOpenEdit = () => {
    if (!data) return;
    setEditForm({
      commissionPercentage: data.commissionPercentage || "5.00",
      notes: data.notes || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      commissionPercentage: parseFloat(editForm.commissionPercentage) || 5,
      notes: editForm.notes,
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  const referrals = referralsData?.data || [];
  const referralPagination = referralsData?.pagination;

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

  if (!data) {
    return (
      <div className="dashboard-container">
        <div className="card text-center py-12">
          <p className="text-gray-600">Fundraiser tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const name = data.donaturName || data.employeeName || "-";
  const email = data.donaturEmail || data.employeeEmail || "-";
  const phone = data.donaturPhone || data.employeePhone || "-";
  const type = data.donaturId ? "Donatur" : "Employee";

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/fundraisers")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detail Fundraiser</h1>
          <p className="text-gray-600">{name} - {data.code}</p>
        </div>
        <div className="flex gap-2">
          {data.status === "pending" && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "..." : "Approve"}
            </button>
          )}
          {data.status === "active" && (
            <button
              type="button"
              className="btn btn-secondary btn-md text-red-600"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "..." : "Suspend"}
            </button>
          )}
          {data.status === "suspended" && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? "..." : "Aktifkan"}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-md" onClick={handleOpenEdit}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-md text-red-600"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Hapus
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Status</div>
          <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(data.status)}`}>
            {data.status}
          </span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Referral</div>
          <div className="text-2xl font-bold">{data.totalReferrals || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Donasi</div>
          <div className="text-xl font-bold">Rp {formatRupiah(data.totalDonationAmount || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Komisi</div>
          <div className="text-xl font-bold text-primary-600">Rp {formatRupiah(data.totalCommissionEarned || 0)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Saldo</div>
          <div className="text-xl font-bold text-success-600">Rp {formatRupiah(data.currentBalance || 0)}</div>
        </div>
      </div>

      {/* Tabs */}
      {data.status === "active" && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-0 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "share"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Share Program
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pendapatan")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pendapatan"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pendapatan
            </button>
          </nav>
        </div>
      )}

      {/* Tab: Share Program */}
      {data.status === "active" && activeTab === "share" && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">
            Link share dengan kode referral <span className="font-mono font-semibold text-primary-600">{data.code}</span>
          </p>
          {programs && programs.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Jenis</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p: any) => {
                    const fullUrl = `${WEB_URL}${p.shareUrl}?ref=${data.code}`;
                    return (
                      <tr key={`${p.type}-${p.id}`}>
                        <td className="text-sm font-medium text-gray-900">{p.name}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeBadgeMap[p.type] || "bg-gray-100 text-gray-700"}`}>
                            {typeLabelMap[p.type] || p.type}
                          </span>
                        </td>
                        <td>
                          <SocialShareButtons
                            url={fullUrl}
                            title={p.name}
                            onCopySuccess={() =>
                              setFeedback({
                                open: true,
                                type: "success",
                                title: "Berhasil",
                                message: "Link tersalin!",
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Belum ada program aktif</p>
          )}
        </div>
      )}

      {/* Tab: Pendapatan (or default when not active) */}
      {(data.status !== "active" || activeTab === "pendapatan") && (
        <>
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Fundraiser Info */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Informasi Fundraiser</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Kode</span>
                  <span className="font-mono font-semibold">{data.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug</span>
                  <span className="font-mono">{data.slug || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipe</span>
                  <span>{type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nama</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span>{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Telepon</span>
                  <span>{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Komisi (%)</span>
                  <span>{data.commissionPercentage || "5.00"}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Terdaftar</span>
                  <span>{format(new Date(data.createdAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}</span>
                </div>
                {data.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Disetujui</span>
                    <span>{format(new Date(data.approvedAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}</span>
                  </div>
                )}
                {data.notes && (
                  <div>
                    <span className="text-gray-500">Catatan</span>
                    <p className="mt-1 text-sm text-gray-700">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Info */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Informasi Rekening</h3>
              {(data.bankAccounts || []).length > 0 ? (
                <div className="space-y-3">
                  {(data.bankAccounts || []).map((acc: any, i: number) => (
                    <div key={acc.id || i} className={i > 0 ? "pt-3 border-t border-gray-100" : ""}>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nama Bank</span>
                        <span>{acc.bankName}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">No. Rekening</span>
                        <span className="font-mono">{acc.accountNumber}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">Atas Nama</span>
                        <span>{acc.accountHolderName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Belum ada rekening bank</p>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-medium mb-3">Riwayat Keuangan</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Komisi Diperoleh</span>
                    <span className="font-medium">Rp {formatRupiah(data.totalCommissionEarned || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Ditarik</span>
                    <span className="font-medium">Rp {formatRupiah(data.totalWithdrawn || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Saldo Saat Ini</span>
                    <span className="text-success-600">Rp {formatRupiah(data.currentBalance || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Riwayat Referral</h3>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. Transaksi</th>
                    <th>Donatur</th>
                    <th>Produk</th>
                    <th>Nominal Donasi</th>
                    <th>Komisi (%)</th>
                    <th>Komisi (Rp)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        Belum ada referral
                      </td>
                    </tr>
                  ) : (
                    referrals.map((ref: any) => (
                      <tr key={ref.id}>
                        <td className="text-sm text-gray-600">
                          {format(new Date(ref.createdAt), "dd MMM yyyy", { locale: idLocale })}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="font-mono text-sm text-primary-600 hover:underline"
                            onClick={() => router.push(`/dashboard/transactions/${ref.transactionId}`)}
                          >
                            {ref.transactionNumber || ref.transactionId}
                          </button>
                        </td>
                        <td className="text-sm">{ref.donorName || "-"}</td>
                        <td className="text-sm">{ref.productName || "-"}</td>
                        <td className="mono text-sm">Rp {formatRupiah(ref.donationAmount || 0)}</td>
                        <td className="text-sm">{ref.commissionPercentage}%</td>
                        <td className="mono text-sm">Rp {formatRupiah(ref.commissionAmount || 0)}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ref.status === "paid" ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"
                          }`}>
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {referralPagination && referralPagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={referralPage}
                  totalPages={referralPagination.totalPages}
                  totalItems={referralPagination.total}
                  onPageChange={setReferralPage}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Fundraiser</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Komisi (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="form-input"
                  value={editForm.commissionPercentage}
                  onChange={(e) => setEditForm({ ...editForm, commissionPercentage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={() => setShowEditModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-md"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Hapus Fundraiser</h3>
            <p className="text-sm text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus fundraiser ini?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-md"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
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
        onClose={() => {
          setFeedback((prev) => ({ ...prev, open: false }));
          if (redirectAfterFeedback) {
            setRedirectAfterFeedback(false);
            router.push("/dashboard/fundraisers");
          }
        }}
      />

    </div>
  );
}
