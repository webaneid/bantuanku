/**
 * Format number to Indonesian Rupiah currency
 * @param amount - Number to format
 * @returns Formatted string (e.g., "1.000.000")
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Alias for formatRupiah for backward compatibility
 * @param amount - Number to format
 * @returns Formatted string (e.g., "1.000.000")
 */
export const formatCurrency = formatRupiah;

/**
 * Format number to full Rupiah with prefix
 * @param amount - Number to format
 * @returns Formatted string (e.g., "Rp 1.000.000")
 */
export function formatRupiahFull(amount: number | null | undefined): string {
  return `Rp ${formatRupiah(amount)}`;
}

/**
 * Parse Rupiah string to number
 * @param rupiah - Rupiah string (e.g., "1.000.000" or "Rp 1.000.000")
 * @returns Number
 */
export function parseRupiah(rupiah: string): number {
  return parseInt(rupiah.replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * Format number with K, M, B suffixes
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format percentage
 * @param value - Number value
 * @param total - Total value
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(
  value: number,
  total: number,
  decimals: number = 0
): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return percentage.toFixed(decimals) + '%';
}

/**
 * Format phone number to Indonesian format
 * @param phone - Phone number string
 * @returns Formatted phone (e.g., "0812-3456-7890")
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  // Format: 0812-3456-7890
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{4})(\d{4})(\d{3})/, '$1-$2-$3');
  }

  // Format: 0812-3456-78901
  if (cleaned.length === 12) {
    return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  return phone;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format date to Indonesian locale in WIB timezone
 * @param date - Date object or string
 * @param format - Format type ('short', 'long', 'full')
 * @returns Formatted date string in WIB timezone
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }
      : format === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }
      : {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta'
        };

  return d.toLocaleDateString('id-ID', options);
}

/**
 * Get relative time in WIB timezone (e.g., "2 hari yang lalu")
 * @param date - Date object or string
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Calculate time difference in WIB timezone context
  // Both dates are interpreted in WIB timezone for consistent calculation
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} tahun yang lalu`;
  if (months > 0) return `${months} bulan yang lalu`;
  if (weeks > 0) return `${weeks} minggu yang lalu`;
  if (days > 0) return `${days} hari yang lalu`;
  if (hours > 0) return `${hours} jam yang lalu`;
  if (minutes > 0) return `${minutes} menit yang lalu`;
  return 'Baru saja';
}

/**
 * Format date with time in WIB timezone
 * @param date - Date object or string
 * @param includeSeconds - Include seconds in time (default: false)
 * @returns Formatted datetime string (e.g., "31 Jan 2026, 14:30 WIB")
 */
export function formatDateTime(
  date: Date | string,
  includeSeconds: boolean = false
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
    timeZone: 'Asia/Jakarta',
    hour12: false
  };

  const datePart = d.toLocaleDateString('id-ID', dateOptions);
  const timePart = d.toLocaleTimeString('id-ID', timeOptions);

  return `${datePart}, ${timePart} WIB`;
}
