import { formatInTimeZone, toDate } from 'date-fns-tz';

const INDONESIA_TZ = 'Asia/Jakarta';

/**
 * Get current year in WIB timezone
 * Use for order/payment/savings number generation
 */
export function getCurrentYearWIB(): number {
  return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'yyyy'));
}

/**
 * Get current month in WIB timezone (1-12)
 */
export function getCurrentMonthWIB(): number {
  return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'M'));
}

/**
 * Get current date in WIB timezone (1-31)
 */
export function getCurrentDateWIB(): number {
  return parseInt(formatInTimeZone(new Date(), INDONESIA_TZ, 'd'));
}

/**
 * Format date to WIB string
 */
export function formatWIB(date: Date, format: string): string {
  return formatInTimeZone(date, INDONESIA_TZ, format);
}

/**
 * Add hours in WIB context
 * Use for payment expiration calculations
 */
export function addHoursWIB(date: Date, hours: number): Date {
  const wibTime = toDate(date, { timeZone: INDONESIA_TZ });
  wibTime.setHours(wibTime.getHours() + hours);
  return wibTime;
}

/**
 * Add days in WIB context
 * Use for analytics date range calculations
 */
export function addDaysWIB(date: Date, days: number): Date {
  const wibTime = toDate(date, { timeZone: INDONESIA_TZ });
  wibTime.setDate(wibTime.getDate() + days);
  return wibTime;
}

/**
 * Get start of month in WIB
 * Use for monthly reports and dashboard
 */
export function getStartOfMonthWIB(date: Date): Date {
  const year = parseInt(formatInTimeZone(date, INDONESIA_TZ, 'yyyy'));
  const month = parseInt(formatInTimeZone(date, INDONESIA_TZ, 'M')) - 1; // JS months are 0-indexed
  // Create date at midnight WIB on the 1st of the month
  return new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000);
}

/**
 * Get current WIB Date object
 */
export function nowWIB(): Date {
  return toDate(new Date(), { timeZone: INDONESIA_TZ });
}
