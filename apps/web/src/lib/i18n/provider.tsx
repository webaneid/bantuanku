"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_LOCALE, normalizeLocale, translateWith } from "./core";
import { idMessages } from "./locales/id";
import type { Locale, Messages, TranslateParams } from "./types";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * Bundel klien hanya membawa kamus Indonesia (default + fallback, ikut cache browser). Kamus bahasa lain dikirim server
 * lewat `initialMessages` hanya bila locale aktif bukan default, dan dimuat lazy bila pengguna mengganti bahasa.
 */
export function I18nProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: React.ReactNode;
  initialLocale?: string;
  initialMessages?: Partial<Record<Locale, Messages>>;
}) {
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));
  const [dictionaries, setDictionaries] = useState<Partial<Record<Locale, Messages>>>(() => ({
    [DEFAULT_LOCALE]: idMessages,
    ...initialMessages,
  }));

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      const normalized = normalizeLocale(nextLocale);
      if (dictionaries[normalized] || normalized === DEFAULT_LOCALE) {
        setLocaleState(normalized);
        return;
      }
      import("./locales/en").then(({ enMessages }) => {
        setDictionaries((prev) => ({ ...prev, [normalized]: enMessages }));
        setLocaleState(normalized);
      });
    },
    [dictionaries]
  );

  const t = useCallback(
    (key: string, params?: TranslateParams) => {
      return translateWith(dictionaries, idMessages, locale || DEFAULT_LOCALE, key, params);
    },
    [locale, dictionaries]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
