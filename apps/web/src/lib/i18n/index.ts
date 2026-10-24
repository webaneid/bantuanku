import { enMessages } from "./locales/en";
import { idMessages } from "./locales/id";
import { DEFAULT_LOCALE, normalizeLocale, translateWith } from "./core";
import type { Locale, Messages, TranslateParams } from "./types";

// Hanya untuk kode SERVER (kedua kamus ikut). Komponen klien memakai `useI18n` dari ./provider.
export { DEFAULT_LOCALE, normalizeLocale };

export const dictionaries: Record<Locale, Messages> = {
  id: idMessages,
  en: enMessages,
};

export function translate(
  locale: Locale,
  key: string,
  params?: TranslateParams
): string {
  return translateWith(dictionaries, dictionaries[DEFAULT_LOCALE], locale, key, params);
}
