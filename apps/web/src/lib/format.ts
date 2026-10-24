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
 * Rupiah ringkas untuk kartu: "Rp 145 Jt", "Rp 1,2 M", "Rp 750 Rb" (satuan Indonesia, koma desimal).
 * Satu desimal hanya bila perlu; di bawah seribu ditulis penuh.
 */
export function formatRupiahCompact(amount: number | null | undefined): string {
  const value = Math.max(0, Number(amount || 0));
  const units: Array<[number, string]> = [
    [1_000_000_000_000, 'T'],
    [1_000_000_000, 'M'],
    [1_000_000, 'Jt'],
    [1_000, 'Rb'],
  ];

  for (const [size, suffix] of units) {
    if (value >= size) {
      const scaled = Math.round((value / size) * 10) / 10;
      return `Rp ${String(scaled).replace('.', ',')} ${suffix}`;
    }
  }
  return `Rp ${Math.round(value)}`;
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
