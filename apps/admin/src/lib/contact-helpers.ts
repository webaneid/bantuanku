/**
 * Contact Helpers - Utilities for normalizing and formatting contact information
 * 
 * Standard format in database:
 * - Phone/WhatsApp: 08521234567 (no spaces, dashes, or country code)
 * - Email: lowercase
 * - Website: with protocol (https://)
 */

/**
 * Normalize phone number to standard format: 08521234567
 * - Removes spaces, dashes, parentheses
 * - Converts +62 or 62 to 0
 * - Returns only digits starting with 0
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove all non-digit characters except +
  let cleaned = input.replace(/[^\d+]/g, '');
  
  // Handle international format +62 or 62
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('62') && cleaned.length > 10) {
    // Only convert if it looks like international format (62812... not 6212...)
    cleaned = '0' + cleaned.substring(2);
  }
  
  // Ensure it starts with 0
  if (cleaned && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

/**
 * Convert standard phone format to WhatsApp format: 628521234567
 * Used for WhatsApp API integration
 */
export function toWhatsAppFormat(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  if (!normalized || !normalized.startsWith('0')) return '';
  
  // Convert 08xxx to 628xxx
  return '62' + normalized.substring(1);
}

/**
 * Convert standard phone format to international format: +628521234567
 */
export function toInternationalFormat(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  if (!normalized || !normalized.startsWith('0')) return '';
  
  // Convert 08xxx to +628xxx
  return '+62' + normalized.substring(1);
}

/**
 * Format phone for display with spaces: 0852 1234 5678
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  if (!normalized) return phone || '';
  
  // Format: 0852 1234 5678 or 0852 123 456
  if (normalized.length >= 11) {
    return `${normalized.substring(0, 4)} ${normalized.substring(4, 8)} ${normalized.substring(8)}`;
  } else if (normalized.length >= 8) {
    return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`;
  }
  
  return normalized;
}

/**
 * Normalize email to lowercase
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalize website URL - ensure it has protocol
 */
export function normalizeWebsite(url: string | null | undefined): string {
  if (!url) return '';
  
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  // Add https:// if no protocol specified
  if (!trimmed.match(/^https?:\/\//i)) {
    return 'https://' + trimmed;
  }
  
  return trimmed;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indonesian format)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhone(phone);
  
  // Indonesian phone should be 10-13 digits starting with 0
  return /^0\d{9,12}$/.test(normalized);
}

/**
 * Validate website URL
 */
export function isValidWebsite(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const normalized = normalizeWebsite(url);
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format contact data for database
 */
export interface ContactData {
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
}

export function normalizeContactData(data: ContactData): ContactData {
  return {
    email: data.email ? normalizeEmail(data.email) : undefined,
    phone: data.phone ? normalizePhone(data.phone) : undefined,
    whatsappNumber: data.whatsappNumber ? normalizePhone(data.whatsappNumber) : undefined,
    website: data.website ? normalizeWebsite(data.website) : undefined,
  };
}
