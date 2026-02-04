import type { Database } from "@bantuanku/db";

interface ExportColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

export function generateCSV(data: unknown[], columns: ExportColumn[]): string {
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = (row as Record<string, unknown>)[col.key];
        const formatted = col.format ? col.format(value) : String(value ?? "");
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

export function formatCurrency(value: unknown): string {
  const num = typeof value === "number" ? value : 0;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function formatDate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBoolean(value: unknown): string {
  return value ? "Ya" : "Tidak";
}

export const campaignExportColumns: ExportColumn[] = [
  { header: "ID", key: "id" },
  { header: "Judul", key: "title" },
  { header: "Kategori", key: "category" },
  { header: "Pilar", key: "pillar" },
  { header: "Target", key: "goal", format: formatCurrency },
  { header: "Terkumpul", key: "collected", format: formatCurrency },
  { header: "Donatur", key: "donorCount" },
  { header: "Status", key: "status" },
  { header: "Unggulan", key: "isFeatured", format: formatBoolean },
  { header: "Mendesak", key: "isUrgent", format: formatBoolean },
  { header: "Tanggal Dibuat", key: "createdAt", format: formatDate },
  { header: "Tanggal Publish", key: "publishedAt", format: formatDate },
];

export const donationExportColumns: ExportColumn[] = [
  { header: "ID", key: "id" },
  { header: "Referensi", key: "referenceId" },
  { header: "Nama Donatur", key: "donorName" },
  { header: "Email", key: "donorEmail" },
  { header: "Telepon", key: "donorPhone" },
  { header: "Jumlah", key: "amount", format: formatCurrency },
  { header: "Biaya Admin", key: "feeAmount", format: formatCurrency },
  { header: "Total", key: "totalAmount", format: formatCurrency },
  { header: "Status Pembayaran", key: "paymentStatus" },
  { header: "Anonim", key: "isAnonymous", format: formatBoolean },
  { header: "Tanggal Dibuat", key: "createdAt", format: formatDate },
  { header: "Tanggal Bayar", key: "paidAt", format: formatDate },
];

export const disbursementExportColumns: ExportColumn[] = [
  { header: "ID", key: "id" },
  { header: "Referensi", key: "referenceId" },
  { header: "Jumlah", key: "amount", format: formatCurrency },
  { header: "Nama Penerima", key: "recipientName" },
  { header: "Bank Penerima", key: "recipientBank" },
  { header: "Rekening Penerima", key: "recipientAccount" },
  { header: "Tujuan", key: "purpose" },
  { header: "Status", key: "status" },
  { header: "Tanggal Pengajuan", key: "requestedAt", format: formatDate },
  { header: "Tanggal Disetujui", key: "approvedAt", format: formatDate },
  { header: "Tanggal Selesai", key: "completedAt", format: formatDate },
];

export const userExportColumns: ExportColumn[] = [
  { header: "ID", key: "id" },
  { header: "Nama", key: "name" },
  { header: "Email", key: "email" },
  { header: "Telepon", key: "phone" },
  { header: "Status", key: "isActive", format: formatBoolean },
  { header: "Email Terverifikasi", key: "emailVerifiedAt", format: (v) => (v ? "Ya" : "Tidak") },
  { header: "Tanggal Dibuat", key: "createdAt", format: formatDate },
];

export const ledgerExportColumns: ExportColumn[] = [
  { header: "Nomor Entry", key: "entryNumber" },
  { header: "Tanggal", key: "postedAt", format: formatDate },
  { header: "Kode Akun", key: "accountCode" },
  { header: "Nama Akun", key: "accountName" },
  { header: "Debit", key: "debit", format: formatCurrency },
  { header: "Kredit", key: "credit", format: formatCurrency },
  { header: "Memo", key: "memo" },
  { header: "Tipe Referensi", key: "refType" },
  { header: "Status", key: "status" },
];
