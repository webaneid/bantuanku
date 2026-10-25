/**
 * Aturan murni Buku Kas (ADR-0016, docs/arsitektur-buku-kas.md §4). Tanpa akses DB agar mudah diuji.
 * Persentase bagi hasil TIDAK ada di sini (hak berasal dari settings via `revenue_shares`).
 */

export type Fund = "zakat" | "qurban" | "campaign" | "wakaf" | "fidyah" | "operasional" | "bagi_hasil" | "lainnya";
export type Component = "pokok" | "kode_unik" | "kelebihan" | "biaya_transfer" | "koreksi";
export type AccountKind = "bank" | "qris" | "gateway" | "cash" | "unmapped";
export type PaymentMethod = "bank_transfer" | "qris" | "gateway" | "cash" | "other";

export const FUNDS = ["zakat", "qurban", "campaign", "wakaf", "fidyah", "operasional", "bagi_hasil", "lainnya"] as const;
export const COMPONENTS = ["pokok", "kode_unik", "kelebihan", "biaya_transfer", "koreksi"] as const;
export const METHODS = ["bank_transfer", "qris", "gateway", "cash", "other"] as const;
/** Dana program (punya hak bagi hasil dan penyaluran); sisanya adalah pengeluaran non-program. */
export const PROGRAM_FUNDS = ["zakat", "qurban", "campaign", "wakaf", "fidyah"] as const;

export const KNOWN_GATEWAYS = ["flip", "ipaymu", "midtrans", "xendit"] as const;

export interface PostedByComponent {
  pokok: number;
  kode_unik: number;
  kelebihan: number;
}

/**
 * Membagi satu pembayaran terverifikasi ke komponen, KUMULATIF per transaksi (mendukung cicilan):
 * `pokok` sampai total_amount, lalu `kode_unik` sampai unique_code, selebihnya `kelebihan`.
 * Ketiganya adalah pemasukan (D1, D6); label hanya untuk penelusuran.
 */
export function allocatePayment(
  amount: number,
  totalAmount: number,
  uniqueCode: number,
  posted: PostedByComponent
): PostedByComponent {
  let left = Math.max(0, Math.trunc(amount));
  const takePokok = Math.min(left, Math.max(0, totalAmount - posted.pokok));
  left -= takePokok;
  const takeKode = Math.min(left, Math.max(0, uniqueCode - posted.kode_unik));
  left -= takeKode;
  return { pokok: takePokok, kode_unik: takeKode, kelebihan: left };
}

const normalize = (v?: string | null) => (v || "").trim().toLowerCase();

export function fundFromPillar(pillar?: string | null): "wakaf" | "fidyah" | "campaign" {
  const p = normalize(pillar);
  if (p === "wakaf") return "wakaf";
  if (p === "fidyah") return "fidyah";
  return "campaign";
}

/** Sumber dana sebuah transaksi (jenis produk + pilar/kategori). `fundDetail` untuk penelusuran. */
export function fundForTransaction(input: {
  productType: string;
  category?: string | null;
  productId?: string | null;
  typeSpecificData?: Record<string, any> | null;
  pillar?: string | null;
}): { fund: Fund; fundDetail: string | null } {
  const tsd = input.typeSpecificData || {};
  if (input.productType === "zakat") {
    const cat = normalize(input.category); // zakat_fitrah, zakat_maal, ...
    return { fund: "zakat", fundDetail: cat.startsWith("zakat_") ? cat.slice(6) : cat || null };
  }
  if (input.productType === "qurban") {
    return { fund: "qurban", fundDetail: tsd.payment_type === "savings" ? "tabungan" : "pembayaran" };
  }
  const fund = fundFromPillar(input.pillar ?? tsd.pillar);
  return { fund, fundDetail: fund === "campaign" ? normalize(input.pillar ?? tsd.pillar) || null : null };
}

/**
 * Sumber dana sebuah pencairan. Kategori utama (`zakat_to_*`, `campaign_to_*`, `qurban_*`, `revenue_share_*`, `operational_*`);
 * bila kategori generik (mis. `zakat` pada penyaluran zakat lama), dipakai `disbursementType` dan `typeSpecificData`.
 */
export function fundForDisbursement(input: {
  category?: string | null;
  pillar?: string | null;
  disbursementType?: string | null;
  typeSpecificData?: Record<string, any> | null;
}): { fund: Fund; fundDetail: string | null } {
  const cat = normalize(input.category);
  const type = normalize(input.disbursementType);
  const tsd = input.typeSpecificData || {};
  if (cat.startsWith("zakat_to_")) return { fund: "zakat", fundDetail: cat.slice("zakat_to_".length) };
  if (cat.startsWith("campaign_to_")) return { fund: fundFromPillar(input.pillar), fundDetail: cat.slice("campaign_to_".length) };
  if (cat.startsWith("qurban_")) return { fund: "qurban", fundDetail: cat.slice("qurban_".length) };
  if (cat.startsWith("revenue_share_")) return { fund: "bagi_hasil", fundDetail: cat.slice("revenue_share_".length) };
  if (cat.startsWith("operational_")) return { fund: "operasional", fundDetail: cat.slice("operational_".length) };
  if (cat === "vendor_general_payment" || type === "vendor") return { fund: "operasional", fundDetail: "vendor" };
  if (type === "zakat" || cat === "zakat") return { fund: "zakat", fundDetail: normalize(tsd.asnaf) || null };
  if (type === "qurban" || cat === "qurban") return { fund: "qurban", fundDetail: null };
  if (type === "campaign" || cat === "campaign") return { fund: fundFromPillar(input.pillar), fundDetail: null };
  if (type === "revenue_share") return { fund: "bagi_hasil", fundDetail: null };
  if (type === "operational") return { fund: "operasional", fundDetail: cat || null };
  return { fund: "lainnya", fundDetail: cat || null };
}

export interface AccountClassification {
  kind: AccountKind;
  refKey: string;
  method: PaymentMethod;
  gatewayCode: string | null;
}

/** Id rekening muncul dalam dua bentuk (`bank-<ts>` dan `bank_bank-<ts>`); samakan ke bentuk settings. */
export function normalizeAccountId(id?: string | null): string {
  const v = normalize(id);
  if (v.startsWith("bank_bank-")) return v.slice(5);
  if (v.startsWith("qris_qris-")) return v.slice(5);
  return v;
}

/** Memetakan metode bayar (id settings / kode gateway / teks lain) ke satu akun kas. */
export function classifyAccount(input: { paymentMethod?: string | null; gatewayCode?: string | null }): AccountClassification {
  const gw = normalize(input.gatewayCode);
  if (gw) return { kind: "gateway", refKey: gw, method: "gateway", gatewayCode: gw };

  const pm = normalizeAccountId(input.paymentMethod);
  if ((KNOWN_GATEWAYS as readonly string[]).includes(pm)) {
    return { kind: "gateway", refKey: pm, method: "gateway", gatewayCode: pm };
  }
  if (pm.startsWith("qris-")) return { kind: "qris", refKey: pm, method: "qris", gatewayCode: null };
  if (pm.startsWith("bank-")) return { kind: "bank", refKey: pm, method: "bank_transfer", gatewayCode: null };
  if (pm === "cash" || pm.includes("tunai")) return { kind: "cash", refKey: "cash", method: "cash", gatewayCode: null };
  return { kind: "unmapped", refKey: "unmapped", method: "other", gatewayCode: null };
}
