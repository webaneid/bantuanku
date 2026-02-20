"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "@/lib/feedback-toast";
import { formatRupiahFull } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";

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
  sourceBankName?: string | null;
  sourceBankAccount?: string | null;
  transferProofUrl?: string | null;
  transferDate?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export default function RevenueShareDisbursementPanel({
  availabilityEndpoint,
  listEndpoint,
  createEndpoint,
  disbursementTypeLabel,
  categoryLabel,
  queryKeyPrefix,
}: RevenueShareDisbursementPanelProps) {
  const { t, locale } = useI18n();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedRowId, setSelectedRowId] = useState<string>("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    purpose: "",
    notes: "",
  });
  const statusBadge: Record<string, { label: string; color: string }> = {
    draft: { label: t("account.revenueShareDisbursement.status.draft"), color: "bg-gray-100 text-gray-700" },
    submitted: { label: t("account.revenueShareDisbursement.status.submitted"), color: "bg-blue-100 text-blue-700" },
    approved: { label: t("account.revenueShareDisbursement.status.approved"), color: "bg-warning-100 text-warning-700" },
    rejected: { label: t("account.revenueShareDisbursement.status.rejected"), color: "bg-danger-100 text-danger-700" },
    paid: { label: t("account.revenueShareDisbursement.status.paid"), color: "bg-success-100 text-success-700" },
  };

  const formatDateShort = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));

  const formatDateLong = (date: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(date));

  const { data: availabilityData, isLoading: availabilityLoading } = useQuery<AvailabilityData>({
    queryKey: [queryKeyPrefix, "availability"],
    queryFn: async () => {
      const response = await api.get(availabilityEndpoint);
      return response.data?.data;
    },
  });

  const { data: disbursementsData, isLoading: disbursementsLoading } = useQuery({
    queryKey: [queryKeyPrefix, "list", page],
    queryFn: async () => {
      const response = await api.get(listEndpoint, { params: { page, limit: 10 } });
      return response.data;
    },
  });

  const disbursements: DisbursementListItem[] = disbursementsData?.data || [];
  const pagination = disbursementsData?.pagination;

  const maxAmount = availabilityData?.availability?.totalAvailable || 0;
  const canSubmit = useMemo(() => {
    if (!availabilityData?.canSubmit) return false;
    if (!availabilityData?.recipient?.bankAccount) return false;
    if (maxAmount <= 0) return false;
    const amountNumber = Number(form.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return false;
    if (amountNumber > maxAmount) return false;
    return form.purpose.trim().length >= 3;
  }, [availabilityData, form.amount, form.purpose, maxAmount]);

  useEffect(() => {
    if (!availabilityData) return;
    if (!form.amount) {
      setForm((prev) => ({ ...prev, amount: String(Math.max(0, availabilityData.availability.totalAvailable || 0)) }));
    }
  }, [availabilityData, form.amount]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = Math.floor(Number(form.amount || 0));
      return api.post(createEndpoint, {
        amount,
        purpose: form.purpose.trim(),
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || t("account.revenueShareDisbursement.toasts.submitSuccess"));
      setForm((prev) => ({ ...prev, purpose: "", notes: "" }));
      setShowFormModal(false);
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, "availability"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, "list"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t("account.revenueShareDisbursement.toasts.submitFailed"));
    },
  });

  const selectedRow = disbursements.find((row) => row.id === selectedRowId) || null;

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-primary-900 mb-3">{t("account.revenueShareDisbursement.entitlementTitle")}</h3>
        {availabilityLoading ? (
          <p className="text-sm text-gray-500">{t("account.revenueShareDisbursement.loading")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-primary-700">{t("account.revenueShareDisbursement.totalEntitled")}</p>
                <p className="text-2xl font-bold text-primary-900">{formatRupiahFull(availabilityData?.availability?.totalEntitled || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-primary-700">{t("account.revenueShareDisbursement.totalCommitted")}</p>
                <p className="text-2xl font-bold text-primary-900">{formatRupiahFull(availabilityData?.availability?.totalCommitted || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-primary-700">{t("account.revenueShareDisbursement.totalAvailable")}</p>
                <p className="text-2xl font-bold text-success-600">{formatRupiahFull(availabilityData?.availability?.totalAvailable || 0)}</p>
              </div>
            </div>
            <p className="text-sm text-primary-700 mt-3">
              {t("account.revenueShareDisbursement.entitlementHint")}
            </p>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowFormModal(true)}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          {t("account.revenueShareDisbursement.submitButton")}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t("account.revenueShareDisbursement.historyTitle")}</h3>
        </div>

        {disbursementsLoading ? (
          <div className="p-6 text-sm text-gray-500">{t("account.revenueShareDisbursement.loading")}</div>
        ) : disbursements.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">{t("account.revenueShareDisbursement.emptyHistory")}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.number")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.typeCategory")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.recipient")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.amount")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.status")}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.date")}</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("account.revenueShareDisbursement.table.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {disbursements.map((row) => {
                    const badge = statusBadge[row.status] || statusBadge.draft;
                    return (
                      <tr key={row.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.disbursementNumber}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{disbursementTypeLabel}</p>
                          <p className="text-sm text-gray-500">{categoryLabel}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{row.recipientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatRupiahFull(row.amount || 0)}</td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex px-2.5 py-1 text-xs font-medium rounded-full", badge.color)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateShort(row.createdAt)}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedRowId((prev) => (prev === row.id ? "" : row.id))}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-500 hover:text-primary-600 hover:border-primary-300"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedRow && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">{t("account.revenueShareDisbursement.detailTitle")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500">{t("account.revenueShareDisbursement.table.number")}</p>
                    <p className="font-medium text-gray-900">{selectedRow.disbursementNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("account.revenueShareDisbursement.table.status")}</p>
                    <p className="font-medium text-gray-900">{(statusBadge[selectedRow.status] || statusBadge.draft).label}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("account.revenueShareDisbursement.table.date")}</p>
                    <p className="font-medium text-gray-900">{formatDateLong(selectedRow.createdAt)}</p>
                  </div>
                </div>

                {selectedRow.status === "paid" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-gray-500">{t("account.revenueShareDisbursement.approvalStatus")}</p>
                        <p className="font-medium text-success-700 mt-1">
                          {selectedRow.approvedAt ? t("account.revenueShareDisbursement.approvedOn", { date: formatDateShort(selectedRow.approvedAt) }) : t("account.revenueShareDisbursement.approved")}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-gray-500">{t("account.revenueShareDisbursement.transferStatus")}</p>
                        <p className="font-medium text-success-700 mt-1">
                          {selectedRow.paidAt ? t("account.revenueShareDisbursement.transferredOn", { date: formatDateShort(selectedRow.paidAt) }) : t("account.revenueShareDisbursement.transferred")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">{t("account.revenueShareDisbursement.recipientBank")}</p>
                        <p className="font-medium text-gray-900">{selectedRow.recipientBankName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("account.revenueShareDisbursement.recipientAccount")}</p>
                        <p className="font-medium text-gray-900">{selectedRow.recipientBankAccount || "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("account.revenueShareDisbursement.transferredAmount")}</p>
                        <p className="font-medium text-gray-900">{formatRupiahFull(selectedRow.transferredAmount ?? selectedRow.amount ?? 0)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t("account.revenueShareDisbursement.transferProof")}</p>
                      {selectedRow.transferProofUrl ? (
                        <a
                          href={selectedRow.transferProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          {t("account.revenueShareDisbursement.viewTransferProof")}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <p className="text-sm text-gray-600">{t("account.revenueShareDisbursement.noTransferProof")}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {t("account.revenueShareDisbursement.detailAfterPaid")}
                  </p>
                )}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">{t("account.revenueShareDisbursement.pageOf", { page, total: pagination.totalPages })}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    {t("account.revenueShareDisbursement.previous")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    {t("account.revenueShareDisbursement.next")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFormModal(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t("account.revenueShareDisbursement.modal.title")}</h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.disbursementType")}</label>
                <input value={disbursementTypeLabel} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.category")}</label>
                <input value={categoryLabel} readOnly className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.sourceBank")}</label>
                <input
                  readOnly
                  value={availabilityData?.sourceBank ? `${availabilityData.sourceBank.bankName} - ${availabilityData.sourceBank.accountNumber}` : t("account.revenueShareDisbursement.modal.sourceBankFallback")}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.amount")}</label>
                <input
                  type="number"
                  min={1}
                  max={maxAmount}
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">{t("account.revenueShareDisbursement.modal.maxAmount", { amount: formatRupiahFull(maxAmount) })}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.recipientName")}</label>
                <input
                  readOnly
                  value={availabilityData?.recipient?.name || "-"}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.recipientContact")}</label>
                <input
                  readOnly
                  value={availabilityData?.recipient?.contact || "-"}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.recipientBank")}</label>
                <input
                  readOnly
                  value={availabilityData?.recipient?.bankAccount?.bankName || "-"}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.recipientAccount")}</label>
                <input
                  readOnly
                  value={availabilityData?.recipient?.bankAccount?.accountNumber || "-"}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.recipientAccountName")}</label>
                <input
                  readOnly
                  value={availabilityData?.recipient?.bankAccount?.accountHolderName || "-"}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.purpose")}</label>
              <textarea
                value={form.purpose}
                onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                rows={2}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t("account.revenueShareDisbursement.modal.purposePlaceholder")}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">{t("account.revenueShareDisbursement.modal.notes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t("account.revenueShareDisbursement.modal.notesPlaceholder")}
              />
            </div>

            {!availabilityData?.recipient?.bankAccount && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-800">
                {t("account.revenueShareDisbursement.modal.missingBankWarning")}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t("account.revenueShareDisbursement.modal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? t("account.revenueShareDisbursement.modal.submitting") : t("account.revenueShareDisbursement.modal.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
