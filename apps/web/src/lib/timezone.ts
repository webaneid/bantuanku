import { formatInTimeZone, toDate } from 'date-fns-tz';

const INDONESIA_TZ = 'Asia/Jakarta';

/**
 * Format date to WIB timezone with Indonesian locale
 * @param date - Date object or string
 * @param format - date-fns format string
 * @returns Formatted date string in WIB
 */
export function formatDateWIB(date: Date | string, format: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, INDONESIA_TZ, format);
}

/**
 * Get current date/time in WIB timezone
 * @returns Date object representing current time in WIB
 */
export function nowWIB(): Date {
  return toDate(new Date(), { timeZone: INDONESIA_TZ });
}

/**
 * Convert any date to WIB timezone
 * @param date - Date object or string
 * @returns Date object in WIB timezone
 */
export function toWIB(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toDate(d, { timeZone: INDONESIA_TZ });
}

/**
 * Return today's date as yyyy-MM-dd string in WIB.
 * Use as default value for <input type="date"> instead of new Date().toISOString().split('T')[0]
 * which can return yesterday's date between 00:00-06:59 WIB.
 */
export function todayWIBDateInput(): string {
  return formatInTimeZone(new Date(), INDONESIA_TZ, 'yyyy-MM-dd');
}

/**
 * Convert an API timestamp to yyyy-MM-dd string in WIB for <input type="date">.
 * Use in edit forms instead of new Date(value).toISOString().slice(0, 10).
 */
export function toWIBDateInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return formatInTimeZone(d, INDONESIA_TZ, 'yyyy-MM-dd');
}
