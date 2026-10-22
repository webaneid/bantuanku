import { detectFileSignature } from "./file-signature";

// Unduhan media dari gateway GOWA (bukti transfer yang dikirim donatur via WhatsApp).
// Payload webhook adalah input tak tepercaya: referensi media TIDAK BOLEH menentukan
// host tujuan fetch, karena request ke GOWA membawa kredensial Basic auth organisasi.
// Hanya origin yang sama dengan `apiUrl` GOWA yang boleh dituju.

export const GOWA_MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const SAFE_RELATIVE_PATH = /^[A-Za-z0-9_\-./]+$/;
const SAFE_MEDIA_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function isSafeGowaMediaId(id: string): boolean {
  return SAFE_MEDIA_ID.test(id);
}

// Ubah referensi dari webhook (`__gowa_path__:x`, `__gowa_media__:x`, atau URL absolut)
// menjadi URL unduhan di host GOWA, atau null kalau referensi tidak aman.
export function resolveGowaMediaUrl(apiUrl: string, imageRef: string): string | null {
  let base: URL;
  try {
    base = new URL(apiUrl);
  } catch {
    return null;
  }
  const basePath = base.pathname.replace(/\/+$/, "");
  const baseHref = `${base.origin}${basePath}`;

  if (imageRef.startsWith("__gowa_path__:")) {
    const rel = imageRef.slice("__gowa_path__:".length).replace(/^\/+/, "");
    if (!rel || !SAFE_RELATIVE_PATH.test(rel) || rel.split("/").some((seg) => seg === ".." || seg === "")) {
      return null;
    }
    return `${baseHref}/${rel}`;
  }

  if (imageRef.startsWith("__gowa_media__:")) {
    const id = imageRef.slice("__gowa_media__:".length);
    return isSafeGowaMediaId(id) ? `${baseHref}/media/download/${id}` : null;
  }

  if (/^https?:\/\//i.test(imageRef)) {
    let u: URL;
    try {
      u = new URL(imageRef);
    } catch {
      return null;
    }
    // Bandingkan origin sungguhan — bukan substring (`includes`) yang bisa dikelabui
    // dengan menaruh nama host GOWA di path/query URL penyerang.
    if (u.origin !== base.origin || u.username || u.password) return null;
    return u.href;
  }

  return null;
}

// Baca body dengan batas ukuran; null kalau melebihi batas.
export async function readBodyWithLimit(res: Response, maxBytes: number): Promise<Buffer | null> {
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > maxBytes) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > maxBytes ? null : buf;
}

// Terima hanya gambar (JPEG/PNG/GIF/WebP) berdasarkan isi file sesungguhnya,
// dan kembalikan mime type hasil deteksi (bukan header yang bisa dipalsukan).
export function acceptImageBuffer(buffer: Buffer): { buffer: Buffer; mimeType: string } | null {
  const mime = detectFileSignature(buffer);
  if (!mime || !mime.startsWith("image/")) return null;
  return { buffer, mimeType: mime };
}
