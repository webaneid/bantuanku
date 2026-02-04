const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 21;

export function createId(): string {
  let id = "";
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

export function generateReferenceId(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}${month}${day}-${random}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
