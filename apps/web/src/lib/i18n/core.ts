import type { Locale, Messages, TranslateParams } from "./types";

export const DEFAULT_LOCALE: Locale = "id";

export function normalizeLocale(locale?: string | null): Locale {
  if (locale === "en") return "en";
  return DEFAULT_LOCALE;
}

function getByPath(messages: Messages, path: string): string | Messages | undefined {
  return path.split(".").reduce<string | Messages | undefined>((acc, segment) => {
    if (!acc || typeof acc === "string") return undefined;
    return acc[segment];
  }, messages);
}

const warnedKeys = new Set<string>();

/** Dev saja: key hilang biasanya berarti namespace belum diumumkan di layout rute (ADR-0014). */
function warnMissingKey(key: string) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(`[i18n] key tidak ditemukan: "${key}" (cek namespace di layout rute / kamus)`);
}

/**
 * Terjemahan murni (tanpa mengimpor kamus). Kamus dioper pemanggil supaya bundel klien hanya membawa
 * kamus yang dipakai: server memakai `lib/i18n/index.ts` (kedua kamus), klien hanya pesan yang dikirim server.
 */
export function translateWith(
  dictionaries: Partial<Record<Locale, Messages>>,
  fallbackMessages: Messages,
  locale: Locale,
  key: string,
  params?: TranslateParams
): string {
  const activeMessages = dictionaries[locale] || fallbackMessages;

  const localized = getByPath(activeMessages, key);
  const fallback = getByPath(fallbackMessages, key);
  const value = (typeof localized === "string" ? localized : undefined) ||
    (typeof fallback === "string" ? fallback : undefined) ||
    key;

  if (value === key && process.env.NODE_ENV !== "production") warnMissingKey(key);

  if (!params) return value;

  return Object.entries(params).reduce((message, [paramKey, paramValue]) => {
    const token = `{${paramKey}}`;
    return message.split(token).join(String(paramValue));
  }, value);
}
