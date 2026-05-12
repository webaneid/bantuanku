const REF_KEY = "bantuanku_ref";
const REF_EXPIRY_KEY = "bantuanku_ref_expiry";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 jam

export function saveReferralCode(code: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REF_KEY, code);
  localStorage.setItem(REF_EXPIRY_KEY, String(Date.now() + EXPIRY_MS));
}

export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const expiry = localStorage.getItem(REF_EXPIRY_KEY);
  if (!expiry || Date.now() > Number(expiry)) {
    clearReferralCode();
    return null;
  }
  return localStorage.getItem(REF_KEY);
}

export function clearReferralCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REF_KEY);
  localStorage.removeItem(REF_EXPIRY_KEY);
}
