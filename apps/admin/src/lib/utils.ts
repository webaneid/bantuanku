import { formatRupiah, formatRupiahShort } from "./format";

export function formatCurrency(amount: number): string {
  return `Rp ${formatRupiah(amount)}`;
}

export function formatCurrencyShort(amount: number): string {
  return `Rp ${formatRupiahShort(amount)}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
