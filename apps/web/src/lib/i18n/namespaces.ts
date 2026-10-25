/**
 * Namespace yang dikirim server di root layout untuk SEMUA halaman (dipakai Header/Footer).
 * Namespace lain diumumkan per rute lewat `<I18nNamespaces names={[...]} />` di `layout.tsx` rute (ADR-0014).
 * Pemeriksa: `npm run check:i18n`.
 */
export const BASE_NAMESPACES = ["common", "footer"] as const;
