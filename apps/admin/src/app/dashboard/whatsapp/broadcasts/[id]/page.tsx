"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, XCircle, RefreshCw } from "lucide-react";
import api from "@/lib/api";

type BroadcastJob = {
  id: string;
  name: string;
  type: string;
  templateKey: string | null;
  contentOverride: string | null;
  audienceScope: string;
  referenceId: string | null;
  referenceName: string | null;
  batchSize: number;
  batchIntervalMinutes: number;
  currentOffset: number;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  nextBatchAt: string | null;
};

type BroadcastLog = {
  id: string;
  donaturId: string | null;
  templateKey: string | null;
  phone: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  donaturRef?: { id: string; name: string | null } | null;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Menunggu", className: "bg-yellow-100 text-yellow-800" },
  processing: { label: "Berjalan", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Selesai", className: "bg-green-100 text-green-800" },
  failed: { label: "Gagal", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Dibatalkan", className: "bg-gray-100 text-gray-700" },
};

const LOG_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  sent: { label: "Terkirim", className: "text-green-600" },
  failed: { label: "Gagal", className: "text-red-600" },
  skipped_no_phone: { label: "No HP", className: "text-gray-400" },
  skipped_recently_sent: { label: "Skip duplikat", className: "text-gray-400" },
  skipped_opt_out: { label: "Opt-out", className: "text-gray-400" },
};

function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
}

export default function BroadcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [logPage, setLogPage] = useState(1);

  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ["broadcast", id],
    queryFn: () => api.get(`/admin/whatsapp/broadcasts/${id}`).then((r) => r.data.data as BroadcastJob),
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job && ["processing", "pending"].includes(job.status)) return 15000;
      return false;
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["broadcast-logs", id, logPage],
    queryFn: () =>
      api.get(`/admin/whatsapp/broadcasts/${id}/logs?page=${logPage}&limit=50`).then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/admin/whatsapp/broadcasts/${id}/cancel`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["broadcast", id] }),
  });

  const job = jobData;
  const logs: BroadcastLog[] = logsData?.items || [];
  const logsPagination = logsData?.pagination;

  if (jobLoading) {
    return <div className="p-6 text-gray-400">Memuat...</div>;
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-red-600">Broadcast tidak ditemukan.</p>
        <Link href="/dashboard/whatsapp/broadcasts" className="text-blue-600 text-sm mt-2 inline-block">
          ← Kembali
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[job.status] || { label: job.status, className: "bg-gray-100 text-gray-700" };
  const progress = job.totalRecipients > 0 ? Math.round(((job.sentCount + job.failedCount + job.skippedCount) / job.totalRecipients) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/whatsapp/broadcasts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{job.name}</h1>
          <p className="text-sm text-gray-500">ID: {job.id}</p>
        </div>
        <span className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
        {["pending", "processing"].includes(job.status) && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="ml-auto flex items-center gap-1 text-sm text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle size={14} /> Batalkan
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Penerima", value: job.totalRecipients, color: "text-gray-900" },
          { label: "Terkirim", value: job.sentCount, color: "text-green-700" },
          { label: "Gagal", value: job.failedCount, color: "text-red-600" },
          { label: "Dilewati", value: job.skippedCount, color: "text-gray-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {job.totalRecipients > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress pengiriman</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Job info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Detail Konfigurasi</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-gray-500">Tipe</dt><dd className="font-medium">{job.type}</dd></div>
          <div><dt className="text-gray-500">Audience</dt><dd className="font-medium">{job.audienceScope}</dd></div>
          <div><dt className="text-gray-500">Template Key</dt><dd className="font-medium">{job.templateKey || "-"}</dd></div>
          <div><dt className="text-gray-500">Batch Size</dt><dd className="font-medium">{job.batchSize}</dd></div>
          <div><dt className="text-gray-500">Jeda Batch</dt><dd className="font-medium">{job.batchIntervalMinutes} menit</dd></div>
          <div><dt className="text-gray-500">Offset Saat Ini</dt><dd className="font-medium">{job.currentOffset}</dd></div>
          <div><dt className="text-gray-500">Batch Berikutnya</dt><dd className="font-medium">{formatDate(job.nextBatchAt)}</dd></div>
          <div><dt className="text-gray-500">Dibuat</dt><dd className="font-medium">{formatDate(job.createdAt)}</dd></div>
          <div><dt className="text-gray-500">Dimulai</dt><dd className="font-medium">{formatDate(job.startedAt)}</dd></div>
          <div><dt className="text-gray-500">Selesai</dt><dd className="font-medium">{formatDate(job.completedAt)}</dd></div>
          {job.referenceId && <div><dt className="text-gray-500">Reference ID</dt><dd className="font-medium">{job.referenceId}</dd></div>}
          {job.errorMessage && <div className="col-span-2"><dt className="text-gray-500">Error</dt><dd className="text-red-600">{job.errorMessage}</dd></div>}
        </dl>
      </div>

      {/* Logs table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Log Pengiriman</h3>
        </div>
        {logsLoading ? (
          <div className="p-6 text-center text-gray-400">Memuat log...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Belum ada log.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Donatur</th>
                <th className="px-4 py-3 text-left">Nomor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Waktu Kirim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const ls = LOG_STATUS_LABELS[log.status] || { label: log.status, className: "text-gray-500" };
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800">{log.donaturRef?.name || log.donaturId || "-"}</td>
                    <td className="px-4 py-2 text-gray-500">{log.phone || "-"}</td>
                    <td className={`px-4 py-2 text-center font-medium ${ls.className}`}>{ls.label}</td>
                    <td className="px-4 py-2 text-gray-400">{formatDate(log.sentAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {logsPagination && logsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
            <span>Total: {logsPagination.total} log</span>
            <div className="flex gap-2">
              <button disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button disabled={logPage >= logsPagination.totalPages} onClick={() => setLogPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
