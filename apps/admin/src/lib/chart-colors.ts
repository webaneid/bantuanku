/**
 * Warna grafik (recharts) dari token (ADR-0015): brand = CSS variable (ikut setting Warna Brand),
 * semantik = nilai palet Tailwind (amber/red/blue), tidak mengikuti brand.
 */
export const CHART = {
  primary: "rgb(var(--color-primary-500))",
  secondary: "rgb(var(--color-secondary-500))",
  info: "#3b82f6",
  danger: "#ef4444",
  warning: "#f59e0b",
  neutral: "#6b7280",
} as const;

/** Urutan warna untuk pie/donut: brand dulu, lalu semantik dan netral. */
export const CHART_PALETTE = [CHART.primary, CHART.secondary, CHART.info, CHART.danger, CHART.warning, "#8b5cf6", "#6366f1", CHART.neutral];
