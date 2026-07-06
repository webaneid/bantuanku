"use client";

import { useEffect } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
};

const VARIANT_CLASSES = {
  danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  warning: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
  primary: "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500",
};

const ICON_CLASSES = {
  danger: "bg-red-100 text-red-600",
  warning: "bg-yellow-100 text-yellow-600",
  primary: "bg-primary-100 text-primary-600",
};

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onClose,
  confirmLabel = "Lanjutkan",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${ICON_CLASSES[variant]}`}>
            <ExclamationTriangleIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-1 text-sm text-gray-600">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
