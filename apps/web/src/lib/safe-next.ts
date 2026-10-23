/**
 * Path tujuan setelah login/simpan profil (parameter `?next=`). Hanya path relatif di situs sendiri
 * (cegah open redirect). Browser membuang TAB/CR/LF saat mem-parse URL, jadi "/\t/evil.com" menjadi
 * "//evil.com": tolak karakter kontrol dan pastikan hasil parse tetap di origin yang sama.
 * Mengembalikan null bila tidak ada atau tidak aman.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) {
    return null;
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    if (new URL(value, origin).origin !== origin) return null;
  } catch {
    return null;
  }
  return value;
}

/** `next` dari query string halaman saat ini (client saja); null bila tidak ada/tidak aman. */
export function readNextFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  return safeNextPath(new URLSearchParams(window.location.search).get('next'));
}
