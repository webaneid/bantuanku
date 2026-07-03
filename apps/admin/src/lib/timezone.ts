import { formatInTimeZone, toDate } from 'date-fns-tz';

const INDONESIA_TZ = 'Asia/Jakarta';

export function formatDateWIB(date: Date | string, format: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, INDONESIA_TZ, format);
}

export function formatDateTimeWIB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, INDONESIA_TZ, 'dd MMM yyyy, HH:mm');
}

export function nowWIB(): Date {
  return toDate(new Date(), { timeZone: INDONESIA_TZ });
}

/**
 * Return today's date as yyyy-MM-dd string in WIB.
 * Use as default value for <input type="date"> instead of new Date().toISOString().split('T')[0].
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

/** Return first day of current month as yyyy-MM-dd in WIB. */
export function startOfMonthWIBInput(): string {
  return formatInTimeZone(new Date(), INDONESIA_TZ, 'yyyy-MM-01');
}

/** Return first day of current year as yyyy-MM-dd in WIB. */
export function startOfYearWIBInput(): string {
  return formatInTimeZone(new Date(), INDONESIA_TZ, 'yyyy-01-01');
}
