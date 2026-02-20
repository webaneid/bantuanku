const REF_KEY = "bantuanku_ref";

export function saveReferralCode(code: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REF_KEY, code);
}

export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REF_KEY);
}

export function clearReferralCode() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REF_KEY);
}
