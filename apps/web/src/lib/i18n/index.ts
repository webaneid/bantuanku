import { enMessages } from "./locales/en";
import { idMessages } from "./locales/id";
import type { Locale, Messages, TranslateParams } from "./types";

export const DEFAULT_LOCALE: Locale = "id";

export const dictionaries: Record<Locale, Messages> = {
  id: idMessages,
  en: enMessages,
};

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

export function translate(
  locale: Locale,
  key: string,
  params?: TranslateParams
): string {
  const activeMessages = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
  const fallbackMessages = dictionaries[DEFAULT_LOCALE];

  const localized = getByPath(activeMessages, key);
  const fallback = getByPath(fallbackMessages, key);
  const value = (typeof localized === "string" ? localized : undefined) ||
    (typeof fallback === "string" ? fallback : undefined) ||
    key;

  if (!params) return value;

  return Object.entries(params).reduce((message, [paramKey, paramValue]) => {
    const token = `{${paramKey}}`;
    return message.split(token).join(String(paramValue));
  }, value);
}
