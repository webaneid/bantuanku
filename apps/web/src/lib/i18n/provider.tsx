"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, normalizeLocale, translateWith } from "./core";
import type { Locale, Messages, TranslateParams } from "./types";

interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: TranslateParams) => string;
}

const LocaleContext = createContext<Locale | undefined>(undefined);
const MessagesContext = createContext<Messages>({});

/**
 * Klien tidak membundel kamus apa pun (ADR-0014): server mengirim namespace dasar lewat `messages` di root layout
 * dan namespace rute lewat `I18nExtend` (lihat `I18nNamespaces`). Pesan sudah digabung server untuk locale aktif.
 * Ganti bahasa = tulis cookie + `router.refresh()`; locale dan pesan baru datang dari server.
 */
export function I18nProvider({
  children,
  initialLocale,
  messages,
}: {
  children: React.ReactNode;
  initialLocale?: string;
  messages: Messages;
}) {
  return (
    <LocaleContext.Provider value={normalizeLocale(initialLocale)}>
      <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>
    </LocaleContext.Provider>
  );
}

/** Menambah namespace rute ke pesan milik induk (namespace antar-rute tidak bertabrakan). */
export function I18nExtend({ messages, children }: { messages: Messages; children: React.ReactNode }) {
  const parent = useContext(MessagesContext);
  const merged = useMemo(() => ({ ...parent, ...messages }), [parent, messages]);
  return <MessagesContext.Provider value={merged}>{children}</MessagesContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const locale = useContext(LocaleContext);
  const messages = useContext(MessagesContext);
  if (!locale) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return useMemo(
    () => ({
      locale,
      t: (key: string, params?: TranslateParams) =>
        translateWith({ [locale || DEFAULT_LOCALE]: messages }, messages, locale, key, params),
    }),
    [locale, messages]
  );
}
