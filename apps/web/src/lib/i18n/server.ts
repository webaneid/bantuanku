import { dictionaries } from "./index";
import { DEFAULT_LOCALE } from "./core";
import type { Locale, Messages } from "./types";

function isMessages(value: string | Messages | undefined): value is Messages {
  return typeof value === "object" && value !== null;
}

function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] = isMessages(current) && isMessages(value) ? deepMerge(current, value) : value;
  }
  return result;
}

/**
 * Pesan untuk namespace tertentu pada locale aktif (KODE SERVER). Locale non-default digabung di atas `id`
 * supaya key yang belum diterjemahkan tetap jatuh ke Indonesia tanpa mengirim dua kamus ke klien.
 */
export function pickMessages(locale: Locale, names: readonly string[]): Messages {
  const result: Messages = {};
  for (const name of names) {
    const base = dictionaries[DEFAULT_LOCALE][name];
    const localized = locale === DEFAULT_LOCALE ? undefined : dictionaries[locale][name];
    if (isMessages(base) && isMessages(localized)) result[name] = deepMerge(base, localized);
    else if (base !== undefined) result[name] = base;
    else if (localized !== undefined) result[name] = localized;
  }
  return result;
}
