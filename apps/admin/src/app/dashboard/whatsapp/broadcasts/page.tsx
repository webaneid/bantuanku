"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Eye, XCircle } from "lucide-react";
import api from "@/lib/api";

type BroadcastJob = {
  id: string;
  name: string;
  type: string;
  audienceScope: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  completedAt: string | null;
};

type CreateForm = {
  name: string;
  type: "campaign_new" | "manual_content" | "manual_free" | "reengagement";
  templateKey: string;
  contentOverride: string;
  referenceId: string;
  referenceName: string;
  audienceScope: "all" | "campaign_donors" | "inactive_62d";
  batchSize: number;
  batchIntervalMinutes: number;
};

type CampaignOption = { value: string; label: string };

type Estimate = { count: number; batches: number; estimatedHours: number } | null;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Menunggu", className: "bg-yellow-100 text-yellow-800" },
  processing: { label: "Berjalan", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Selesai", className: "bg-green-100 text-green-800" },
  failed: { label: "Gagal", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Dibatalkan", className: "bg-gray-100 text-gray-700" },
};

const TYPE_LABELS: Record<string, string> = {
  campaign_new: "Program Baru",
  manual_content: "Template Manual",
  manual_free: "Pesan Bebas",
  reengagement: "Re-engagement",
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Semua donatur aktif",
  campaign_donors: "Donatur campaign tertentu",
  inactive_62d: "Tidak aktif 62+ hari",
};

// Render template preview: replace {var} with sample values
function renderPreview(template: string, campaignTitle?: string): string {
  return template
    .replace(/\{customer_name\}/g, "Budi Santoso")
    .replace(/\{store_name\}/g, "Laziswaf Darunnajah")
    .replace(/\{campaign_title\}/g, campaignTitle || "Nama Program")
    .replace(/\{campaign_name\}/g, campaignTitle || "Nama Program")
    .replace(/\{campaign_slug\}/g, "nama-program")
    .replace(/\{frontend_url\}/g, "https://bantuanku.org")
    .replace(/\{[^}]+\}/g, "[...]");
}

export default function BroadcastsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: "",
    type: "manual_content",
    templateKey: "",
    contentOverride: "",
    referenceId: "",
    referenceName: "",
    audienceScope: "all",
    batchSize: 50,
    batchIntervalMinutes: 60,
  });
  const [formError, setFormError] = useState("");
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Fetch active campaigns for autocomplete
  const { data: campaignsData } = useQuery({
    queryKey: ["autocomplete-campaigns"],
    queryFn: () => api.get("/autocomplete/campaigns?q=").then((r) => r.data.data as Array<{ id: string; title: string }>),
    enabled: showCreate,
    staleTime: 60000,
  });

  const campaignOptions: CampaignOption[] = (campaignsData || []).map((c) => ({
    value: c.id,
    label: c.title,
  }));

  const { data, isLoading } = useQuery({
    queryKey: ["broadcasts", page],
    queryFn: () => api.get(`/admin/whatsapp/broadcasts?page=${page}&limit=20`).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post("/admin/whatsapp/broadcasts", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      setShowCreate(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || "Gagal membuat broadcast");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/whatsapp/broadcasts/${id}/cancel`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["broadcasts"] }),
  });

  function resetForm() {
    setForm({ name: "", type: "manual_content", templateKey: "", contentOverride: "", referenceId: "", referenceName: "", audienceScope: "all", batchSize: 50, batchIntervalMinutes: 60 });
    setFormError("");
    setTemplatePreview(null);
    setEstimate(null);
  }

  // Fetch template preview when templateKey changes
  useEffect(() => {
    if (!form.templateKey || form.type === "manual_free") {
      setTemplatePreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/whatsapp/templates/${form.templateKey}`);
        const { content } = res.data.data;
        setTemplatePreview(content ? renderPreview(content, form.referenceName) : null);
      } catch {
        setTemplatePreview(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.templateKey, form.referenceName]);

  // Fetch estimate when audienceScope / referenceId / batchSize changes
  const fetchEstimate = useCallback(async (f: CreateForm) => {
    setEstimateLoading(true);
    try {
      const params = new URLSearchParams({
        audienceScope: f.audienceScope,
        batchSize: String(f.batchSize),
        batchIntervalMinutes: String(f.batchIntervalMinutes),
      });
      if (f.referenceId) params.set("referenceId", f.referenceId);
      const res = await api.get(`/admin/whatsapp/broadcasts/estimate?${params}`);
      setEstimate(res.data.data);
    } catch {
      setEstimate(null);
    } finally {
      setEstimateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showCreate) return;
    const timer = setTimeout(() => fetchEstimate(form), 500);
    return () => clearTimeout(timer);
  }, [form.audienceScope, form.referenceId, form.batchSize, form.batchIntervalMinutes, showCreate, fetchEstimate]);

  function handleCampaignSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = campaignOptions.find((c) => c.value === e.target.value);
    if (!selected) return;
    setForm((f) => ({
      ...f,
      referenceId: selected.value,
      referenceName: selected.label,
      templateKey: "wa_tpl_campaign_new",
      audienceScope: "campaign_donors",
      name: f.name || `Broadcast: ${selected.label}`,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      audienceScope: form.audienceScope,
      batchSize: form.batchSize,
      batchIntervalMinutes: form.batchIntervalMinutes,
    };
    if (form.type !== "manual_free") payload.templateKey = form.templateKey;
    if (form.type === "manual_free") payload.contentOverride = form.contentOverride;
    if (form.referenceId) { payload.referenceId = form.referenceId; payload.referenceName = form.referenceName; }
    createMutation.mutate(payload);
  }

  const jobs: BroadcastJob[] = data?.items || [];
  const pagination = data?.pagination;

  const previewContent = form.type === "manual_free"
    ? (form.contentOverride ? renderPreview(form.contentOverride) : null)
    : templatePreview;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">Kirim pesan massal ke donatur secara terjadwal.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Plus size={16} /> Buat Broadcast
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Memuat...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Belum ada broadcast.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-left">Audience</th>
                <th className="px-4 py-3 text-center">Terkirim</th>
                <th className="px-4 py-3 text-center">Gagal</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => {
                const statusInfo = STATUS_LABELS[job.status] || { label: job.status, className: "bg-gray-100 text-gray-700" };
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{job.name}</td>
                    <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[job.type] || job.type}</td>
                    <td className="px-4 py-3 text-gray-600">{AUDIENCE_LABELS[job.audienceScope] || job.audienceScope}</td>
                    <td className="px-4 py-3 text-center text-green-700 font-medium">{job.sentCount}</td>
                    <td className="px-4 py-3 text-center text-red-600">{job.failedCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/whatsapp/broadcasts/${job.id}`} className="text-blue-600 hover:text-blue-800" title="Detail">
                          <Eye size={16} />
                        </Link>
                        {["pending", "processing"].includes(job.status) && (
                          <button onClick={() => cancelMutation.mutate(job.id)} className="text-red-500 hover:text-red-700" title="Batalkan">
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Total: {pagination.total} broadcast</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Buat Broadcast Baru</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left — Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Broadcast</label>
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const t = e.target.value as CreateForm["type"];
                      setForm((f) => ({ ...f, type: t, templateKey: "", contentOverride: "", referenceId: "", referenceName: "" }));
                      setTemplatePreview(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="manual_content">Template Manual</option>
                    <option value="manual_free">Pesan Bebas</option>
                    <option value="campaign_new">Program Baru</option>
                    <option value="reengagement">Re-engagement</option>
                  </select>
                </div>

                {/* Campaign picker — untuk manual_content dan campaign_new */}
                {(form.type === "manual_content" || form.type === "campaign_new") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Campaign</label>
                    <select
                      value={form.referenceId}
                      onChange={handleCampaignSelect}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">-- Pilih campaign aktif --</option>
                      {campaignOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {form.referenceName && (
                      <p className="text-xs text-green-700 mt-1">✓ {form.referenceName}</p>
                    )}
                  </div>
                )}

                {/* Template key — untuk non-manual_free + non-campaign-picker */}
                {form.type !== "manual_free" && form.type !== "manual_content" && form.type !== "campaign_new" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Key</label>
                    <input
                      type="text"
                      value={form.templateKey}
                      onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="cth: wa_tpl_reengagement"
                    />
                  </div>
                )}

                {/* Template key readonly display untuk manual_content/campaign_new */}
                {(form.type === "manual_content" || form.type === "campaign_new") && form.templateKey && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Key</label>
                    <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                      {form.templateKey}
                    </div>
                  </div>
                )}

                {/* Free text content */}
                {form.type === "manual_free" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>
                    <textarea
                      rows={5}
                      value={form.contentOverride}
                      onChange={(e) => setForm((f) => ({ ...f, contentOverride: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Gunakan {customer_name} untuk nama donatur, {store_name} untuk nama lembaga"
                    />
                  </div>
                )}

                {/* Nama Broadcast */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Broadcast</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="cth: Broadcast Program Ramadhan 2026"
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                  <select
                    value={form.audienceScope}
                    onChange={(e) => setForm((f) => ({ ...f, audienceScope: e.target.value as CreateForm["audienceScope"] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">Semua donatur aktif</option>
                    <option value="campaign_donors">Donatur campaign tertentu</option>
                    <option value="inactive_62d">Tidak aktif 62+ hari</option>
                  </select>
                </div>

                {/* Estimasi */}
                <div className={`rounded-lg px-3 py-2 text-sm border ${estimateLoading ? "bg-gray-50 border-gray-200 text-gray-400" : estimate ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                  {estimateLoading ? "Menghitung estimasi..." : estimate
                    ? `~${estimate.count.toLocaleString("id-ID")} penerima · ${estimate.batches} batch · selesai ±${estimate.estimatedHours} jam`
                    : "Pilih audience untuk melihat estimasi"}
                </div>

                {/* Batch config */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Batch</label>
                    <input
                      type="number" min={1} max={500}
                      value={form.batchSize}
                      onChange={(e) => setForm((f) => ({ ...f, batchSize: parseInt(e.target.value) || 50 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jeda (menit)</label>
                    <input
                      type="number" min={1} max={1440}
                      value={form.batchIntervalMinutes}
                      onChange={(e) => setForm((f) => ({ ...f, batchIntervalMinutes: parseInt(e.target.value) || 60 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Batal
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {createMutation.isPending ? "Menyimpan..." : "Buat & Antri"}
                  </button>
                </div>
              </form>

              {/* Right — Preview */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview Pesan</p>
                {previewContent ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {previewContent}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-400 text-sm">
                    {form.type === "manual_free"
                      ? "Tulis pesan untuk melihat preview"
                      : "Pilih template untuk melihat preview"}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">* Preview menggunakan data contoh</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
