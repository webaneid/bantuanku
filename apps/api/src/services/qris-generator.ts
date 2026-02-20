import QRCode from "qrcode";

/**
 * QRIS Dynamic Nominal Generator
 *
 * Parse EMV TLV format, inject amount (Tag 54), recalculate CRC (Tag 63),
 * and generate QR code image.
 */

interface TlvEntry {
  tag: string;
  length: string;
  value: string;
}

/**
 * Parse EMV TLV payload string into array of TLV entries
 */
export function parseTlv(payload: string): TlvEntry[] {
  const entries: TlvEntry[] = [];
  let i = 0;

  while (i < payload.length) {
    if (i + 4 > payload.length) break;

    const tag = payload.substring(i, i + 2);
    const length = payload.substring(i + 2, i + 4);
    const len = parseInt(length, 10);

    if (isNaN(len) || i + 4 + len > payload.length) break;

    const value = payload.substring(i + 4, i + 4 + len);
    entries.push({ tag, length: length, value });
    i += 4 + len;
  }

  return entries;
}

/**
 * Inject amount into Tag 54 (Transaction Amount)
 * Removes existing Tag 54 if present, inserts new one before Tag 63 (CRC)
 */
export function injectAmount(payload: string, amount: number): string {
  const entries = parseTlv(payload);

  // Remove existing Tag 54 and Tag 63
  const filtered = entries.filter((e) => e.tag !== "54" && e.tag !== "63");

  // Change Tag 01 (Point of Initiation Method) from "11" (static) to "12" (dynamic)
  const tag01 = filtered.find((e) => e.tag === "01");
  if (tag01 && tag01.value === "11") {
    tag01.value = "12";
  }

  // Build payload without CRC
  let result = "";
  for (const entry of filtered) {
    result += entry.tag + entry.length + entry.value;
  }

  // Add Tag 54 (amount as string, no decimals for IDR)
  const amountStr = amount.toString();
  const amountLen = amountStr.length.toString().padStart(2, "0");
  result += "54" + amountLen + amountStr;

  // Add CRC placeholder
  result += "6304";

  // Calculate and append CRC
  const crc = calculateCrc(result);
  result += crc;

  return result;
}

/**
 * Inject reference into Tag 62 subtag 05 (Reference Label)
 */
export function injectReference(payload: string, ref: string): string {
  const entries = parseTlv(payload);

  // Find or create Tag 62
  const idx62 = entries.findIndex((e) => e.tag === "62");

  if (idx62 >= 0) {
    // Parse subtags of Tag 62
    const subEntries = parseTlv(entries[idx62].value);
    // Remove existing subtag 05
    const filteredSub = subEntries.filter((e) => e.tag !== "05");

    // Add subtag 05 with reference
    const refLen = ref.length.toString().padStart(2, "0");
    let subPayload = "";
    for (const sub of filteredSub) {
      subPayload += sub.tag + sub.length + sub.value;
    }
    subPayload += "05" + refLen + ref;

    // Update Tag 62
    const tag62Len = subPayload.length.toString().padStart(2, "0");
    entries[idx62] = { tag: "62", length: tag62Len, value: subPayload };
  } else {
    // Create Tag 62 with subtag 05
    const refLen = ref.length.toString().padStart(2, "0");
    const subPayload = "05" + refLen + ref;
    const tag62Len = subPayload.length.toString().padStart(2, "0");

    // Insert before Tag 63
    const idx63 = entries.findIndex((e) => e.tag === "63");
    const insertAt = idx63 >= 0 ? idx63 : entries.length;
    entries.splice(insertAt, 0, {
      tag: "62",
      length: tag62Len,
      value: subPayload,
    });
  }

  // Rebuild without CRC
  const filtered = entries.filter((e) => e.tag !== "63");
  let result = "";
  for (const entry of filtered) {
    result += entry.tag + entry.length + entry.value;
  }

  // Recalculate CRC
  result += "6304";
  const crc = calculateCrc(result);
  result += crc;

  return result;
}

/**
 * Calculate CRC16-CCITT
 * Polynomial: 0x1021, Initial: 0xFFFF
 */
export function calculateCrc(payload: string): string {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generate final EMV payload with amount and optional reference
 */
export function generatePayload(
  template: string,
  amount: number,
  ref?: string
): string {
  let payload = injectAmount(template, amount);

  if (ref) {
    payload = injectReference(payload, ref);
  }

  return payload;
}

/**
 * Generate QR code as data URL (base64 SVG)
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  const svgString = await QRCode.toString(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    type: "svg",
  });
  const base64 = btoa(svgString);
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Parse merchant name (Tag 59) and merchant city (Tag 60) from EMV payload
 */
export function parseMerchantInfo(payload: string): {
  merchantName: string;
  merchantCity: string;
} {
  const entries = parseTlv(payload);
  const tag59 = entries.find((e) => e.tag === "59");
  const tag60 = entries.find((e) => e.tag === "60");

  return {
    merchantName: tag59?.value || "",
    merchantCity: tag60?.value || "",
  };
}

/**
 * Validate CRC of an EMV payload
 * Returns true if CRC matches
 */
export function validateCrc(payload: string): boolean {
  if (payload.length < 8) return false;

  const withoutCrc = payload.substring(0, payload.length - 4);
  const existingCrc = payload.substring(payload.length - 4);
  const calculatedCrc = calculateCrc(withoutCrc);

  return existingCrc.toUpperCase() === calculatedCrc;
}
