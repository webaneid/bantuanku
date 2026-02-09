export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function formatRupiahShort(amount: number): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

/**
 * Get human-readable label for payment status
 * @param status - Payment status from database
 * @returns Indonesian label for the status
 */
export function getPaymentStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    processing: "Menunggu Verifikasi",
    partial: "Dibayar Sebagian",
    paid: "Lunas",
    success: "Lunas", // Legacy status
    failed: "Ditolak",
    expired: "Kadaluarsa",
  };

  return statusMap[status] || status;
}

/**
 * Get badge CSS classes for payment status
 * @param status - Payment status from database
 * @returns Tailwind CSS classes for badge styling
 */
export function getPaymentStatusBadgeClass(status: string): string {
  const badgeMap: Record<string, string> = {
    pending: "bg-warning-50 text-warning-700",
    processing: "bg-blue-50 text-blue-700",
    partial: "bg-yellow-100 text-yellow-700",
    paid: "bg-success-50 text-success-700",
    success: "bg-success-50 text-success-700", // Legacy status
    failed: "bg-danger-50 text-danger-700",
    expired: "bg-gray-100 text-gray-700",
  };

  return badgeMap[status] || "bg-gray-100 text-gray-700";
}

/**
 * Get human-readable label for transaction payment status
 * @param status - Transaction payment status (pending, verified, rejected)
 * @returns Indonesian label for the status
 */
export function getTransactionPaymentStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Menunggu Verifikasi",
    verified: "Terverifikasi",
    rejected: "Ditolak",
  };

  return statusMap[status] || status;
}

/**
 * Get badge CSS classes for transaction payment status
 * @param status - Transaction payment status (pending, verified, rejected)
 * @returns Tailwind CSS classes for badge styling
 */
export function getTransactionPaymentStatusBadgeClass(status: string): string {
  const badgeMap: Record<string, string> = {
    pending: "bg-blue-50 text-blue-700",
    verified: "bg-success-50 text-success-700",
    rejected: "bg-danger-50 text-danger-700",
  };

  return badgeMap[status] || "bg-gray-100 text-gray-700";
}
