"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { toast } from "react-hot-toast";

interface RevenueShareDisbursementPanelProps {
  availabilityEndpoint: string;
  listEndpoint: string;
  createEndpoint: string;
  disbursementTypeLabel: string;
  categoryLabel: string;
  queryKeyPrefix: string;
}

interface AvailabilityData {
  availability: {
    totalEntitled: number;
    totalCommitted: number;
    totalPaid: number;
    totalAvailable: number;
  };
  recipient: {
    name: string;
    contact: string;
    bankAccount: {
      bankName: string;
      accountNumber: string;
      accountHolderName: string;
    } | null;
  };
  sourceBank: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null;
  canSubmit: boolean;
}

interface DisbursementListItem {
  id: string;
  disbursementNumber: string;
  disbursementType: string;
  category: string;
  recipientName: string;
  recipientBankName?: string | null;
  recipientBankAccount?: string | null;
  recipientBankAccountName?: string | null;
  amount: number;
  transferredAmount?: number | null;
  status: string;
  transferProofUrl?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

const statusBadgeMap: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  submitted: { label: "Diajukan", className: "bg-blue-50 text-blue-700" },
  approved: { label: "Disetujui", className: "bg-warning-50 text-warning-700" },
  rejected: { label: "Ditolak", className: "bg-danger-50 text-danger-700" },
  paid: { label: "Dibayar", className: "bg-success-50 text-success-700" },
};

function formatIDDate(date: string | null | undefined, style: "short" | "long" = "short") {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return style === "long"
    ? format(d, "dd MMMM yyyy", { locale: idLocale })
    : format(d, "dd MMM yyyy", { locale: idLocale });
}

export default function RevenueShareDisbursementPanel({
  availabilityEndpoint,
  listEndpoint,
  createEndpoint,
  disbursementTypeLabel,
  categoryLabel,
  queryKeyPrefix,
}: RevenueShareDisbursementPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    purpose: "",
    notes: "",
  });

  const { data: availabilityData, isLoading: availabilityLoading } = useQuery<AvailabilityData>({
    queryKey: [queryKeyPrefix, "availability"],
    queryFn: async () => {
      const response = await api.get(availabilityEndpoint);
      return response.data?.data;
    },
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: [queryKeyPrefix, "list", page],
    queryFn: async () => {
      const response = await api.get(listEndpoint, {
        params: { page, limit: 10 },
      });
      return response.data;
    },
  });

  const disbursements: DisbursementListItem[] = listData?.data || [];
  const pagination = listData?.pagination;

  const maxAmount = availabilityData?.availability?.totalAvailable || 0;
  const canSubmit = useMemo(() => {
    if (!availabilityData?.canSubmit) return false;
    if (!availabilityData?.recipient?.bankAccount) return false;
    const amountNumber = Number(form.amount || 0);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return false;
    if (amountNumber > maxAmount) return false;
    return form.purpose.trim().length >= 3;
  }, [availabilityData, form.amount, form.purpose, maxAmount]);

  useEffect(() => {
    if (!availabilityData) return;
    if (!form.amount) {
      setForm((prev) => ({
        ...prev,
        amount: String(Math.max(0, availabilityData.availability.totalAvailable || 0)),
      }));
    }
  }, [availabilityData, form.amount]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const amount = Math.floor(Number(form.amount || 0));
      return api.post(createEndpoint, {
        amount,
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || "Permintaan pencairan berhasil diajukan");
      setShowModal(false);
      setForm((prev) => ({ ...prev, purpose: "", notes: "" }));
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, "availability"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, "list"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal mengajukan pencairan");
    },
  });

  const selectedRow = disbursements.find((row) => row.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Hak Bagi Hasil</h3>
        {availabilityLoading ? (
          <p className="text-sm text-gray-500">Memuat data...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Hak</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">Rp {formatRupiah(availabilityData?.availability?.totalEntitled || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sudah Diajukan/Disalurkan</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">Rp {formatRupiah(availabilityData?.availability?.totalCommitted || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tersisa</p>
                <p className="text-3xl font-bold text-success-600 mt-1">Rp {formatRupiah(availabilityData?.availability?.totalAvailable || 0)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Termasuk alokasi yang sudah diajukan, disetujui, maupun dibayar.
            </p>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-md"
        >
          Ajukan Pencairan
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Riwayat Pencairan</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Tipe / Kategori</th>
                <th>Penerima</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Memuat data...</td>
                </tr>
              ) : disbursements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Belum ada data pencairan.</td>
                </tr>
              ) : (
                disbursements.map((row) => {
                  const status = statusBadgeMap[row.status] || statusBadgeMap.draft;
                  return (
                    <tr key={row.id}>
                      <td className="text-sm font-medium">{row.disbursementNumber}</td>
                      <td className="text-sm">
                        <p className="font-medium text-gray-900">Revenue Share</p>
                        <p className="text-gray-500">Pencairan Komisi Fundraiser</p>
                      </td>
                      <td className="text-sm">{row.recipientName}</td>
                      <td className="mono text-sm">Rp {formatRupiah(row.amount || 0)}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="text-sm">{formatIDDate(row.createdAt, "short")}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedId((prev) => (prev === row.id ? "" : row.id))}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-primary-600 hover:border-primary-300"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedRow && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="font-semibold text-gray-900 mb-3">Detail Pencairan</p>
            {selectedRow.status === "paid" ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <p className="text-gray-500">Status Persetujuan</p>
                    <p className="font-medium text-success-700 mt-1">
                      {selectedRow.approvedAt ? `Disetujui (${formatIDDate(selectedRow.approvedAt, "short")})` : "Disetujui"}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <p className="text-gray-500">Status Transfer</p>
                    <p className="font-medium text-success-700 mt-1">
                      {selectedRow.paidAt ? `Sudah ditransfer (${formatIDDate(selectedRow.paidAt, "short")})` : "Sudah ditransfer"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-gray-500">Bank Tujuan</p>
                    <p className="font-medium text-gray-900">{selectedRow.recipientBankName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Rekening Tujuan</p>
                    <p className="font-medium text-gray-900">{selectedRow.recipientBankAccount || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nominal Transfer</p>
                    <p className="font-medium text-gray-900">Rp {formatRupiah(selectedRow.transferredAmount ?? selectedRow.amount ?? 0)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Bukti Transfer</p>
                  {selectedRow.transferProofUrl ? (
                    <a
                      href={selectedRow.transferProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Lihat bukti transfer <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <p className="text-gray-700">Belum ada file bukti transfer.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Detail transfer lengkap tersedia setelah status berubah menjadi Dibayar.
              </p>
            )}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Hal {page} dari {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="btn btn-secondary btn-sm"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={page >= pagination.totalPages}
                className="btn btn-secondary btn-sm"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Ajukan Pencairan</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Tipe Pencairan</label>
                  <input readOnly value={disbursementTypeLabel} className="form-input bg-gray-50" />
                </div>
                <div>
                  <label className="form-label">Kategori</label>
                  <input readOnly value={categoryLabel} className="form-input bg-gray-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Bank Sumber</label>
                  <input
                    readOnly
                    value={availabilityData?.sourceBank ? `${availabilityData.sourceBank.bankName} - ${availabilityData.sourceBank.accountNumber}` : "Ditentukan admin"}
                    className="form-input bg-gray-50"
                  />
                </div>
                <div>
                  <label className="form-label">Jumlah Dana *</label>
                  <input
                    type="number"
                    min={1}
                    max={maxAmount}
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="form-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maksimum: Rp {formatRupiah(maxAmount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nama Penerima</label>
                  <input readOnly value={availabilityData?.recipient?.name || "-"} className="form-input bg-gray-50" />
                </div>
                <div>
                  <label className="form-label">Kontak</label>
                  <input readOnly value={availabilityData?.recipient?.contact || "-"} className="form-input bg-gray-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Bank Penerima</label>
                  <input readOnly value={availabilityData?.recipient?.bankAccount?.bankName || "-"} className="form-input bg-gray-50" />
                </div>
                <div>
                  <label className="form-label">No. Rekening</label>
                  <input readOnly value={availabilityData?.recipient?.bankAccount?.accountNumber || "-"} className="form-input bg-gray-50" />
                </div>
                <div>
                  <label className="form-label">Atas Nama</label>
                  <input readOnly value={availabilityData?.recipient?.bankAccount?.accountHolderName || "-"} className="form-input bg-gray-50" />
                </div>
              </div>

              <div>
                <label className="form-label">Tujuan Pencairan *</label>
                <textarea
                  rows={3}
                  value={form.purpose}
                  onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                  className="form-textarea"
                  placeholder="Contoh: Pencairan komisi fundraiser periode Februari 2026"
                />
              </div>

              <div>
                <label className="form-label">Catatan</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="form-textarea"
                  placeholder="Opsional"
                />
              </div>

              {!availabilityData?.recipient?.bankAccount && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-800">
                  Rekening bank penerima belum tersedia. Tambahkan rekening bank terlebih dahulu.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary btn-md"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending}
                className="btn btn-primary btn-md"
              >
                {submitMutation.isPending ? "Mengajukan..." : "Ajukan Pencairan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
