// Deteksi tipe file sesungguhnya dari magic bytes (file signature), bukan dari
// `file.type` (Content-Type) yang dikirim client — Content-Type gampang
// dipalsukan (attacker bisa upload .php/.exe dengan header Content-Type
// dipalsukan jadi image/jpeg dan lolos pengecekan berbasis string saja).

interface Signature {
  mime: string;
  bytes: number[];
}

const SIGNATURES: Signature[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // "GIF8"
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
];

function matchesSignature(buffer: Buffer, sig: Signature): boolean {
  if (buffer.length < sig.bytes.length) return false;
  return sig.bytes.every((b, i) => buffer[i] === b);
}

function isWebP(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // "RIFF" di byte 0-3, "WEBP" di byte 8-11
  return (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  );
}

// Return mime type sesungguhnya berdasarkan isi file, atau null kalau tidak dikenali
// (JPEG, PNG, GIF, WebP, PDF — set format yang dipakai di seluruh upload bantuanku).
export function detectFileSignature(buffer: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (matchesSignature(buffer, sig)) return sig.mime;
  }
  if (isWebP(buffer)) return "image/webp";
  return null;
}

// Verifikasi isi file benar-benar cocok kategori yang diizinkan (gambar dan/atau PDF)
// berdasarkan magic bytes — dipakai di semua endpoint upload sebagai pengganti/pelengkap
// cek `file.type` yang mudah dipalsukan.
export function isAllowedFileSignature(
  buffer: Buffer,
  options: { allowImages?: boolean; allowPdf?: boolean }
): boolean {
  const detected = detectFileSignature(buffer);
  if (!detected) return false;
  if (options.allowPdf && detected === "application/pdf") return true;
  if (options.allowImages && detected.startsWith("image/")) return true;
  return false;
}
