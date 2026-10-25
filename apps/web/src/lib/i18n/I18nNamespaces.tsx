import { cookies } from "next/headers";
import { I18nExtend } from "./provider";
import { normalizeLocale } from "./core";
import { pickMessages } from "./server";

/**
 * Komponen SERVER untuk `layout.tsx` rute: mengirim namespace kamus yang dipakai rute itu ke klien (ADR-0014).
 * Contoh: `<I18nNamespaces names={["checkout", "payment"]}>{children}</I18nNamespaces>`.
 */
export function I18nNamespaces({ names, children }: { names: readonly string[]; children: React.ReactNode }) {
  const locale = normalizeLocale(cookies().get("locale")?.value);
  return <I18nExtend messages={pickMessages(locale, names)}>{children}</I18nExtend>;
}
