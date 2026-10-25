"use client";

import { useState } from "react";
import { startOfMonthWIBInput, todayWIBDateInput } from "@/lib/timezone";

/** Label tampilan Buku Kas (ADR-0016). Nilai asli = kunci API. */
export const FUND_LABEL: Record<string, string> = {
  zakat: "Zakat",
  qurban: "Qurban",
  campaign: "Campaign / Sedekah",
  wakaf: "Wakaf",
  fidyah: "Fidyah",
  operasional: "Operasional",
  bagi_hasil: "Bagi Hasil",
  lainnya: "Lainnya",
};
export const PROGRAM_FUNDS = ["zakat", "qurban", "campaign", "wakaf", "fidyah"] as const;

export const COMPONENT_LABEL: Record<string, string> = {
  pokok: "Pokok",
  kode_unik: "Kode unik",
  kelebihan: "Kelebihan bayar",
  biaya_transfer: "Biaya transfer",
  koreksi: "Koreksi",
};

export const METHOD_LABEL: Record<string, string> = {
  bank_transfer: "Transfer bank",
  qris: "QRIS",
  gateway: "Payment gateway",
  cash: "Tunai",
  other: "Lainnya",
};

export const KIND_LABEL: Record<string, string> = {
  bank: "Bank",
  qris: "QRIS",
  gateway: "Gateway",
  cash: "Tunai",
  unmapped: "Metode Lain",
};

export const PARTY_LABEL: Record<string, string> = {
  amil: "Amil",
  developer: "Developer",
  mitra: "Mitra",
  fundraiser: "Influencer",
};

export const STATUS_LABEL: Record<string, string> = {
  lunas: "Lunas",
  sebagian: "Sebagian",
  belum: "Belum dibayar",
  kosong: "Tidak ada",
};

/** Rentang tanggal bawaan: awal bulan berjalan sampai hari ini (WIB). */
export function useCashbookRange() {
  const [startDate, setStartDate] = useState(startOfMonthWIBInput());
  const [endDate, setEndDate] = useState(todayWIBDateInput());
  return { startDate, endDate, setStartDate, setEndDate };
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

export function fundText(fund: string, detail?: string | null) {
  const base = FUND_LABEL[fund] || fund;
  return detail ? `${base} · ${detail.replace(/_/g, " ")}` : base;
}
