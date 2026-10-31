import { inArray } from "drizzle-orm";
import { settings } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

// Satu-satunya tempat hitung zakat di server. Dipakai alur zakat bot WA, tool calculate_zakat,
// dan endpoint maal publik. Aturan mengikuti kalkulator web; parameter dari tabel `settings`
// (satu-satunya sumber yang bisa diubah admin).

export const ZAKAT_PERTANIAN_NISAB_KG = 750;

export type ZakatKind = "fitrah" | "maal" | "profesi" | "pertanian" | "peternakan" | "bisnis" | "umum";

export interface ZakatParams {
  goldPrice: number; // Rp per gram
  nisabGoldGram: number;
  maalRatePct: number; // persen, mis. 2.5
  professionRatePct: number;
  ricePrice: number; // Rp per kg (nisab pertanian); 0 = tidak diketahui
  fitrahPerPerson: number;
}

export interface ZakatInput {
  jumlahJiwa?: number;
  fitrahPerPerson?: number; // override per jenis zakat (zakat_types.fitrah_amount)
  totalHarta?: number;
  hutang?: number;
  penghasilan?: number; // per bulan
  bonus?: number;
  penghasilanLain?: number;
  pengeluaran?: number;
  hasilPanen?: number;
  biayaProduksi?: number;
  irigasi?: boolean;
  nilaiTernak?: number;
  modalUsaha?: number;
  keuntungan?: number;
  piutang?: number;
  nilai?: number; // jenis umum
}

export interface ZakatResult {
  kind: ZakatKind;
  amount: number;
  nisabMet: boolean;
  nisab: number; // 0 bila tidak ada nisab
  ratePct: number;
  base: number;
  explanation: string;
  notMetMessage?: string;
}

const SETTING_KEYS = [
  "zakat_gold_price",
  "zakat_nisab_gold",
  "zakat_mal_percentage",
  "zakat_profession_percentage",
  "zakat_rice_price",
  "zakat_fitrah_amount",
] as const;

export async function loadZakatParams(db: Database): Promise<ZakatParams> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...SETTING_KEYS]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const v = Number(map.get(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    goldPrice: num("zakat_gold_price", 1140000),
    nisabGoldGram: num("zakat_nisab_gold", 85),
    maalRatePct: num("zakat_mal_percentage", 2.5),
    professionRatePct: num("zakat_profession_percentage", 2.5),
    ricePrice: num("zakat_rice_price", 0),
    fitrahPerPerson: num("zakat_fitrah_amount", 45000),
  };
}

// "zakat-fitrah" / "fitrah" / "penghasilan" / "perdagangan" → jenis baku; null bila tidak dikenal
export function normalizeZakatKind(raw: string | null | undefined): ZakatKind | null {
  if (!raw) return null;
  const k = raw.trim().toLowerCase().replace(/^zakat-/, "");
  switch (k) {
    case "fitrah":
    case "maal":
    case "pertanian":
    case "peternakan":
      return k;
    case "profesi":
    case "penghasilan":
      return "profesi";
    case "bisnis":
    case "perdagangan":
      return "bisnis";
    case "umum":
      return "umum";
    default:
      return null;
  }
}

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const n0 = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

const INFAQ_HINT = "Tidak wajib zakat, namun Anda tetap bisa beramal melalui infaq atau sedekah.";

function notMet(kind: ZakatKind, base: number, nisab: number, ratePct: number, message: string): ZakatResult {
  return { kind, amount: 0, nisabMet: false, nisab, ratePct, base, explanation: "", notMetMessage: message };
}

export function calculateZakat(kind: ZakatKind, input: ZakatInput, p: ZakatParams): ZakatResult {
  switch (kind) {
    case "fitrah": {
      const jiwa = Math.max(1, Math.floor(n0(input.jumlahJiwa)) || 1);
      const perJiwa = n0(input.fitrahPerPerson) || p.fitrahPerPerson;
      const amount = jiwa * perJiwa;
      return {
        kind, amount, nisabMet: true, nisab: 0, ratePct: 0, base: amount,
        explanation: `${jiwa} jiwa × Rp ${fmt(perJiwa)} = Rp ${fmt(amount)}`,
      };
    }

    case "maal": {
      const harta = n0(input.totalHarta);
      const hutang = n0(input.hutang);
      const bersih = harta - hutang;
      const nisab = Math.round(p.nisabGoldGram * p.goldPrice);
      if (bersih <= 0) {
        return notMet(kind, bersih, nisab, p.maalRatePct, "Total harta setelah dikurangi hutang bernilai nol atau negatif. Tidak ada kewajiban zakat maal.");
      }
      if (bersih < nisab) {
        return notMet(kind, bersih, nisab, p.maalRatePct, [
          `Harta bersih Anda: Rp ${fmt(bersih)} (harta Rp ${fmt(harta)} - hutang Rp ${fmt(hutang)}).`,
          `Nisab zakat maal: ${p.nisabGoldGram} gram emas × Rp ${fmt(p.goldPrice)}/gram = Rp ${fmt(nisab)}.`,
          `Harta bersih belum mencapai nisab. ${INFAQ_HINT}`,
        ].join("\n"));
      }
      const amount = Math.floor((bersih * p.maalRatePct) / 100);
      return {
        kind, amount, nisabMet: true, nisab, ratePct: p.maalRatePct, base: bersih,
        explanation: [
          `Harta bersih: Rp ${fmt(harta)} - Rp ${fmt(hutang)} = Rp ${fmt(bersih)}`,
          `Nisab: ${p.nisabGoldGram}g emas × Rp ${fmt(p.goldPrice)} = Rp ${fmt(nisab)} (tercapai)`,
          `Zakat: ${p.maalRatePct}% × Rp ${fmt(bersih)} = Rp ${fmt(amount)}`,
        ].join("\n"),
      };
    }

    case "profesi": {
      const total = n0(input.penghasilan) + n0(input.bonus) + n0(input.penghasilanLain);
      const bersih = total - n0(input.pengeluaran);
      const nisabTahun = Math.round(p.nisabGoldGram * p.goldPrice);
      const nisabBulan = Math.round(nisabTahun / 12);
      if (bersih <= 0) {
        return notMet(kind, bersih, nisabBulan, p.professionRatePct, "Penghasilan bersih per bulan belum diisi atau bernilai nol. Mohon informasikan penghasilan bulanan Anda.");
      }
      if (bersih < nisabBulan) {
        return notMet(kind, bersih, nisabBulan, p.professionRatePct, [
          `Penghasilan bersih Rp ${fmt(bersih)}/bulan belum mencapai nisab.`,
          `Nisab zakat penghasilan: ${p.nisabGoldGram} gram emas × Rp ${fmt(p.goldPrice)} = Rp ${fmt(nisabTahun)}/tahun (≈ Rp ${fmt(nisabBulan)}/bulan).`,
          INFAQ_HINT,
        ].join("\n"));
      }
      const amount = Math.floor((bersih * p.professionRatePct) / 100);
      return {
        kind, amount, nisabMet: true, nisab: nisabBulan, ratePct: p.professionRatePct, base: bersih,
        explanation: `${p.professionRatePct}% × Rp ${fmt(bersih)} (penghasilan bersih per bulan) = Rp ${fmt(amount)}`,
      };
    }

    case "pertanian": {
      const bersih = n0(input.hasilPanen) - n0(input.biayaProduksi);
      const ratePct = input.irigasi ? 5 : 10; // irigasi berbiaya 5%, tadah hujan 10%
      const nisab = p.ricePrice > 0 ? Math.round(ZAKAT_PERTANIAN_NISAB_KG * p.ricePrice) : 0;
      if (bersih <= 0) {
        return notMet(kind, bersih, nisab, ratePct, "Hasil panen bersih belum diisi atau bernilai nol. Mohon informasikan nilai hasil panen Anda.");
      }
      if (nisab > 0 && bersih < nisab) {
        return notMet(kind, bersih, nisab, ratePct, [
          `Hasil panen bersih Rp ${fmt(bersih)} belum mencapai nisab.`,
          `Nisab zakat pertanian: ${ZAKAT_PERTANIAN_NISAB_KG} kg × Rp ${fmt(p.ricePrice)}/kg = Rp ${fmt(nisab)}.`,
          INFAQ_HINT,
        ].join("\n"));
      }
      const amount = Math.floor((bersih * ratePct) / 100);
      return {
        kind, amount, nisabMet: true, nisab, ratePct, base: bersih,
        explanation: `${ratePct}% (${input.irigasi ? "irigasi" : "tadah hujan"}) × Rp ${fmt(bersih)} = Rp ${fmt(amount)}`,
      };
    }

    case "peternakan": {
      const nilai = n0(input.nilaiTernak);
      const nisab = Math.round(p.nisabGoldGram * p.goldPrice);
      if (nilai <= 0) {
        return notMet(kind, nilai, nisab, p.maalRatePct, "Nilai ternak belum diisi atau bernilai nol. Mohon informasikan total nilai ternak Anda.");
      }
      if (nilai < nisab) {
        return notMet(kind, nilai, nisab, p.maalRatePct, [
          `Nilai ternak Rp ${fmt(nilai)} belum mencapai nisab.`,
          `Nisab (setara ${p.nisabGoldGram} gram emas): Rp ${fmt(nisab)}.`,
          INFAQ_HINT,
        ].join("\n"));
      }
      const amount = Math.floor((nilai * p.maalRatePct) / 100);
      return {
        kind, amount, nisabMet: true, nisab, ratePct: p.maalRatePct, base: nilai,
        explanation: `${p.maalRatePct}% × Rp ${fmt(nilai)} = Rp ${fmt(amount)}`,
      };
    }

    case "bisnis": {
      const bersih = n0(input.modalUsaha) + n0(input.keuntungan) + n0(input.piutang) - n0(input.hutang);
      const nisab = Math.round(p.nisabGoldGram * p.goldPrice);
      if (bersih <= 0) {
        return notMet(kind, bersih, nisab, p.maalRatePct, "Nilai bersih usaha bernilai nol atau negatif, sehingga tidak ada kewajiban zakat bisnis.");
      }
      if (bersih < nisab) {
        return notMet(kind, bersih, nisab, p.maalRatePct, [
          `Nilai bersih usaha Rp ${fmt(bersih)} belum mencapai nisab.`,
          `Nisab (setara ${p.nisabGoldGram} gram emas): Rp ${fmt(nisab)}.`,
          INFAQ_HINT,
        ].join("\n"));
      }
      const amount = Math.floor((bersih * p.maalRatePct) / 100);
      return {
        kind, amount, nisabMet: true, nisab, ratePct: p.maalRatePct, base: bersih,
        explanation: `${p.maalRatePct}% × Rp ${fmt(bersih)} = Rp ${fmt(amount)}`,
      };
    }

    case "umum": {
      const nilai = n0(input.nilai);
      const amount = Math.floor((nilai * p.maalRatePct) / 100);
      return {
        kind, amount, nisabMet: nilai > 0, nisab: 0, ratePct: p.maalRatePct, base: nilai,
        explanation: `${p.maalRatePct}% × Rp ${fmt(nilai)} = Rp ${fmt(amount)}`,
        notMetMessage: nilai > 0 ? undefined : "Nominal belum diisi.",
      };
    }
  }
}
