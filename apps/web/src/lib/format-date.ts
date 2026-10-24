import { formatInTimeZone } from 'date-fns-tz';
import { id as indonesianLocale } from 'date-fns/locale';

// Dipisah dari format.ts: date-fns-tz + locale (±9 kB gzip) hanya dibawa halaman yang memformat tanggal,
// bukan semua halaman yang cuma memformat rupiah.
const INDONESIA_TZ = 'Asia/Jakarta';

/**
 * Format date to Indonesian locale in WIB (Asia/Jakarta) timezone
 * @param date - Date object or string
 * @param format - Format type ('short', 'long', 'full')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const fmtStr =
    format === 'short'
      ? 'd MMM yyyy'
      : format === 'long'
      ? 'd MMMM yyyy'
      : 'EEEE, d MMMM yyyy';

  return formatInTimeZone(d, INDONESIA_TZ, fmtStr, { locale: indonesianLocale });
}

/**
 * Get relative time (e.g., "2 hari yang lalu")
 * @param date - Date object or string
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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
 * Format date with time in WIB (Asia/Jakarta) timezone
 * @param date - Date object or string
 * @param includeSeconds - Include seconds in time (default: false)
 * @returns Formatted datetime string (e.g., "31 Jan 2026, 14:30")
 */
export function formatDateTime(
  date: Date | string,
  includeSeconds: boolean = false
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const fmtStr = includeSeconds ? 'd MMM yyyy, HH:mm:ss' : 'd MMM yyyy, HH:mm';
  return formatInTimeZone(d, INDONESIA_TZ, fmtStr);
}
