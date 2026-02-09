"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType: "mustahiq" | "employee" | "vendor";
  entityId: string;
  entityName: string;
}

export default function AddBankAccountModal({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  entityId,
  entityName,
}: AddBankAccountModalProps) {
  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
  });

  const addBankAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const endpoint = `${
        entityType === "mustahiq"
          ? "/admin/mustahiqs"
          : entityType === "employee"
          ? "/admin/employees"
          : "/admin/vendors"
      }/${entityId}/bank-account`;

      const response = await api.post(endpoint, {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Rekening bank berhasil ditambahkan");
      setFormData({
        bankName: "",
        accountNumber: "",
        accountHolderName: "",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menambahkan rekening bank");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName) {
      toast.error("Semua field harus diisi");
      return;
    }

    addBankAccountMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Tambah Rekening Bank
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={addBankAccountMutation.isPending}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Menambahkan rekening untuk: <span className="font-semibold">{entityName}</span>
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Nama Bank <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.bankName}
              onChange={(e) =>
                setFormData({ ...formData, bankName: e.target.value })
              }
              placeholder="Contoh: Bank BCA"
              disabled={addBankAccountMutation.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Nomor Rekening <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.accountNumber}
              onChange={(e) =>
                setFormData({ ...formData, accountNumber: e.target.value })
              }
              placeholder="Contoh: 1234567890"
              disabled={addBankAccountMutation.isPending}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Nama Pemilik Rekening <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={formData.accountHolderName}
              onChange={(e) =>
                setFormData({ ...formData, accountHolderName: e.target.value })
              }
              placeholder="Contoh: John Doe"
              disabled={addBankAccountMutation.isPending}
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary btn-md flex-1"
              disabled={addBankAccountMutation.isPending}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md flex-1"
              disabled={addBankAccountMutation.isPending}
            >
              {addBankAccountMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
