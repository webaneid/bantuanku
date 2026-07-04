"use client";

import { useState, useRef } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";

type ImportMode = "skip" | "update";
type RowStatus = "valid" | "error" | "duplicate";

interface RowResult {
  rowNumber: number;
  status: RowStatus;
  duplicateType?: "whatsapp" | "email" | "in_file";
  existingId?: string;
  data: {
    name?: string;
    whatsappNumber?: string;
    email?: string;
    phone?: string;
    gender?: string;
    detailAddress?: string;
    nik?: string;
  };
  errors?: string[];
}

interface PreviewData {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  rows: RowResult[];
}

interface CommitResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: number;
  mode: ImportMode;
}

type Step = "upload" | "preview" | "result";
type FilterStatus = "all" | "valid" | "error" | "duplicate";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDonaturModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [mode, setMode] = useState<ImportMode>("skip");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep("upload");
    setMode("skip");
    setFile(null);
    setError(null);
    setPreviewData(null);
    setCommitResult(null);
    setFilterStatus("all");
    setIsLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv"].includes(ext)) {
      setError("Format file harus .xlsx atau .csv");
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files[0] ?? null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/donatur/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewData(res.data.data as PreviewData);
      setStep("preview");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal membaca file. Coba lagi.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post(`/admin/donatur/import/commit?mode=${mode}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCommitResult(res.data.data as CommitResult);
      setStep("result");
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal mengimport data. Coba lagi.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async () => {
    const res = await api.get("/admin/donatur/import/template", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-import-donatur.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRows = previewData?.rows.filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  const statusIcon = (status: RowStatus) => {
    if (status === "valid") return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
    if (status === "error") return <XCircleIcon className="w-4 h-4 text-red-600" />;
    return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />;
  };

  const statusLabel = (row: RowResult) => {
    if (row.status === "valid") return "Baru";
    if (row.status === "error") return row.errors?.join("; ") ?? "Error";
    return `Duplikat (${row.duplicateType === "whatsapp" ? "WhatsApp" : row.duplicateType === "email" ? "Email" : "Dalam file"})`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-3xl">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Import Donatur</h2>
          <button type="button" className="modal-close" onClick={handleClose}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 text-sm">
          {(["upload", "preview", "result"] as Step[]).map((s, i) => {
            const labels = { upload: "Upload", preview: "Preview", result: "Hasil" };
            const active = step === s;
            const done =
              (s === "upload" && (step === "preview" || step === "result")) ||
              (s === "preview" && step === "result");
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-gray-200" />}
                <span
                  className={`flex items-center gap-1 font-medium ${
                    active ? "text-primary-600" : done ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                      active
                        ? "bg-primary-600 text-white"
                        : done
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {labels[s]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="modal-body">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <p className="text-sm text-gray-600">
                  Upload file Excel (.xlsx) atau CSV berisi data donatur yang akan diimpor.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="btn btn-ghost btn-sm whitespace-nowrap ml-4"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              {/* Mode selector */}
              <div>
                <label className="form-label">Mode duplikat</label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="skip"
                      checked={mode === "skip"}
                      onChange={() => setMode("skip")}
                      className="form-radio"
                    />
                    <span className="text-sm">
                      <strong>Skip</strong> — lewati donatur yang sudah ada
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="update"
                      checked={mode === "update"}
                      onChange={() => setMode("update")}
                      className="form-radio"
                    />
                    <span className="text-sm">
                      <strong>Update</strong> — perbarui data donatur yang sudah ada
                    </span>
                  </label>
                </div>
              </div>

              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary-400 bg-primary-50"
                    : file
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                <ArrowUpTrayIcon className={`w-10 h-10 mx-auto mb-3 ${file ? "text-green-500" : "text-gray-400"}`} />
                {file ? (
                  <div>
                    <p className="font-medium text-green-700">{file.name}</p>
                    <p className="text-sm text-green-600 mt-1">
                      {(file.size / 1024).toFixed(1)} KB — klik untuk ganti file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">Drag & drop file di sini</p>
                    <p className="text-sm text-gray-500 mt-1">atau klik untuk pilih file (.xlsx, .csv)</p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" /> {error}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && previewData && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total", value: previewData.totalRows, color: "gray" },
                  { label: "Akan Ditambah", value: previewData.validRows, color: "green" },
                  { label: "Error", value: previewData.errorRows, color: "red" },
                  { label: "Duplikat", value: previewData.duplicateRows, color: "yellow" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`p-3 rounded-lg text-center border ${
                      s.color === "green"
                        ? "bg-green-50 border-green-200"
                        : s.color === "red"
                        ? "bg-red-50 border-red-200"
                        : s.color === "yellow"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`text-2xl font-bold ${
                        s.color === "green"
                          ? "text-green-700"
                          : s.color === "red"
                          ? "text-red-700"
                          : s.color === "yellow"
                          ? "text-yellow-700"
                          : "text-gray-700"
                      }`}
                    >
                      {s.value}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Duplicate mode info */}
              {previewData.duplicateRows > 0 && (
                <div className="text-sm p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                  {previewData.duplicateRows} donatur duplikat akan{" "}
                  <strong>{mode === "skip" ? "dilewati" : "diperbarui"}</strong> saat import.
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-1 border-b border-gray-200">
                {(["all", "valid", "error", "duplicate"] as FilterStatus[]).map((f) => {
                  const counts = {
                    all: previewData.totalRows,
                    valid: previewData.validRows,
                    error: previewData.errorRows,
                    duplicate: previewData.duplicateRows,
                  };
                  const labels = { all: "Semua", valid: "Baru", error: "Error", duplicate: "Duplikat" };
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilterStatus(f)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        filterStatus === f
                          ? "border-primary-600 text-primary-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {labels[f]} ({counts[f]})
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              <div className="overflow-auto max-h-72 border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Baris</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nama</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">WhatsApp</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows?.map((row) => (
                      <tr key={row.rowNumber} className={`
                        ${row.status === "error" ? "bg-red-50" : ""}
                        ${row.status === "duplicate" ? "bg-yellow-50" : ""}
                      `}>
                        <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {statusIcon(row.status)}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{row.data.name || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{row.data.whatsappNumber || "-"}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{statusLabel(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" /> {error}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === "result" && commitResult && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Import Selesai</h3>
              <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
                {[
                  { label: "Ditambahkan", value: commitResult.imported, color: "green" },
                  { label: "Dilewati", value: commitResult.skipped, color: "gray" },
                  { label: "Diperbarui", value: commitResult.updated, color: "blue" },
                  { label: "Gagal", value: commitResult.errors, color: "red" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`p-3 rounded-lg text-center border ${
                      s.color === "green"
                        ? "bg-green-50 border-green-200"
                        : s.color === "blue"
                        ? "bg-blue-50 border-blue-200"
                        : s.color === "red"
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`text-2xl font-bold ${
                        s.color === "green"
                          ? "text-green-700"
                          : s.color === "blue"
                          ? "text-blue-700"
                          : s.color === "red"
                          ? "text-red-700"
                          : "text-gray-700"
                      }`}
                    >
                      {s.value}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step === "upload" && (
            <>
              <button type="button" className="btn btn-ghost" onClick={handleClose}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={!file || isLoading}
              >
                {isLoading ? "Menganalisa..." : "Analisa File"}
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep("upload")}
                disabled={isLoading}
              >
                Kembali
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCommit}
                disabled={isLoading || (previewData?.validRows === 0 && previewData?.duplicateRows === 0)}
              >
                {isLoading
                  ? "Mengimport..."
                  : `Import ${
                      mode === "update"
                        ? `${(previewData?.validRows ?? 0) + (previewData?.duplicateRows ?? 0)} data`
                        : `${previewData?.validRows ?? 0} data baru`
                    }`}
              </button>
            </>
          )}

          {step === "result" && (
            <button type="button" className="btn btn-primary" onClick={handleClose}>
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
