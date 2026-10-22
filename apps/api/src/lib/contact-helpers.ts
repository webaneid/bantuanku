/**
 * Contact Helpers - Backend utilities for normalizing contact information
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
 * Normalize contact data object
 */
export interface ContactData {
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
}

export function normalizeContactData(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = { ...data };
  
  if (normalized.email) {
    normalized.email = normalizeEmail(normalized.email);
  }
  
  if (normalized.phone) {
    normalized.phone = normalizePhone(normalized.phone);
  }
  
  if (normalized.whatsappNumber) {
    normalized.whatsappNumber = normalizePhone(normalized.whatsappNumber);
  }
  
  // Legacy support - also normalize 'whatsapp' field
  if (normalized.whatsapp) {
    normalized.whatsapp = normalizePhone(normalized.whatsapp);
  }
  
  if (normalized.website) {
    normalized.website = normalizeWebsite(normalized.website);
  }
  
  return normalized;
}

// Penyamaran data pribadi untuk respons publik (mis. pencarian donatur di checkout).
// Cukup untuk dikenali pemiliknya, tidak cukup untuk dipakai pihak lain.

/** "Ahmad Fauzi" -> "Ahm** Fau**" */
export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const keep = Math.min(3, Math.ceil(word.length / 2));
      return word.slice(0, keep) + "*".repeat(word.length - keep);
    })
    .join(" ");
}

/** "andi@gmail.com" -> "a***@gmail.com" */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** "081234567890" -> "0812******90" */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  if (phone.length <= 6) return phone[0] + "*".repeat(phone.length - 1);
  return phone.slice(0, 4) + "*".repeat(phone.length - 6) + phone.slice(-2);
}
