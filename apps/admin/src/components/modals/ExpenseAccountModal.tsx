"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Autocomplete, { type AutocompleteOption } from "@/components/Autocomplete";
import FeedbackDialog from "@/components/FeedbackDialog";

type COA = {
  id: string;
  code: string;
  name: string;
  type: string;
  category?: string;
  normalBalance: string;
  isActive: boolean;
  description?: string;
};

interface ExpenseAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coa?: COA | null;
  isViewMode?: boolean;
}

export default function ExpenseAccountModal({
  isOpen,
  onClose,
  onSuccess,
  coa,
  isViewMode = false,
}: ExpenseAccountModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "expense",
    category: "operating_expense",
    normalBalance: "debit",
    isActive: true,
    description: "",
  });

  useEffect(() => {
    if (coa) {
      setFormData({
        code: coa.code || "",
        name: coa.name || "",
        type: coa.type || "expense",
        category: coa.category || "operating_expense",
        normalBalance: coa.normalBalance || "debit",
        isActive: coa.isActive ?? true,
        description: coa.description || "",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        type: "expense",
        category: "operating_expense",
        normalBalance: "debit",
        isActive: true,
        description: "",
      });
    }
  }, [coa, isOpen]);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
    next?: () => void;
  }>({ open: false, type: "success", title: "" });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/coa", {
        ...data,
        level: 1,
      });
      return response.data;
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Akun berhasil ditambahkan",
        message: "Data akun sudah tersimpan.",
        next: () => onSuccess(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menambahkan akun",
        message: error.response?.data?.error || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/admin/coa/${coa?.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Akun berhasil diupdate",
        message: "Perubahan data akun disimpan.",
        next: () => onSuccess(),
      });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal mengupdate akun",
        message: error.response?.data?.error || "Terjadi kesalahan. Coba lagi.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      setFeedback({
        open: true,
        type: "error",
        title: "Data belum lengkap",
        message: "Kode dan nama akun wajib diisi.",
      });
      return;
    }

    if (coa) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const typeOptions: AutocompleteOption[] = [
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
  ];

  const normalBalanceOptions: AutocompleteOption[] = [
    { value: "debit", label: "Debit" },
    { value: "credit", label: "Credit" },
  ];

  const closeFeedback = () => {
    const next = feedback.next;
    setFeedback((prev) => ({ ...prev, open: false, next: undefined }));
    next?.();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isViewMode ? "Detail Akun" : coa ? "Edit Akun" : "Tambah Akun"}
          </h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} id="coa-form">
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">
                  Kode Akun <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="form-input"
                  placeholder="e.g., 6001"
                  required
                  disabled={isViewMode}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Kode unik untuk akun ini
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Nama Akun <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Biaya Operasional Program"
                  required
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Tipe <span className="text-danger-500">*</span>
                </label>
                <Autocomplete
                  options={typeOptions}
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value })}
                  placeholder="Pilih Tipe"
                  allowClear={false}
                  disabled={isViewMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Normal Balance <span className="text-danger-500">*</span>
                </label>
                <Autocomplete
                  options={normalBalanceOptions}
                  value={formData.normalBalance}
                  onChange={(value) => setFormData({ ...formData, normalBalance: value })}
                  placeholder="Pilih Normal Balance"
                  allowClear={false}
                  disabled={isViewMode}
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <p className="font-semibold mb-1">💡 Panduan Normal Balance:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li><strong>Asset & Expense</strong> → pilih <strong>Debit</strong></li>
                    <li><strong>Liability, Equity & Income</strong> → pilih <strong>Credit</strong></li>
                  </ul>
                  <p className="mt-2 text-blue-700">
                    ⚠️ Untuk akun <strong>Penyaluran/Pengeluaran</strong>, gunakan Normal Balance <strong>Debit</strong>
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kategori</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-input"
                  placeholder="e.g., program_expense, operational_expense"
                  disabled={isViewMode}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Opsional: Sub-kategori untuk klasifikasi tambahan
                </p>
              </div>

              <div className="form-group">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    disabled={isViewMode}
                    className="form-checkbox"
                  />
                  <span className="form-label mb-0">Akun Aktif</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Deskripsi singkat akun ini..."
                  disabled={isViewMode}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {isViewMode ? "Tutup" : "Batal"}
          </button>
          {!isViewMode && (
            <button
              type="submit"
              form="coa-form"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Menyimpan..."
                : coa
                ? "Update"
                : "Simpan"}
            </button>
          )}
        </div>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={closeFeedback}
      />
    </div>
  );
}
