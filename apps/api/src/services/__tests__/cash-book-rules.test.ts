// @ts-ignore
import { describe, it, expect } from "bun:test";
import {
  allocatePayment,
  classifyAccount,
  fundForDisbursement,
  fundForTransaction,
  normalizeAccountId,
} from "../cash-book-rules";

const none = { pokok: 0, kode_unik: 0, kelebihan: 0 };

describe("allocatePayment (kumulatif, semuanya pemasukan)", () => {
  it("bayar pas total + kode unik → pokok dan kode_unik", () => {
    expect(allocatePayment(100213, 100000, 213, none)).toEqual({ pokok: 100000, kode_unik: 213, kelebihan: 0 });
  });
  it("gateway tanpa kode unik → kode_unik 0 (hanya yang diterima)", () => {
    expect(allocatePayment(200000, 200000, 514, none)).toEqual({ pokok: 200000, kode_unik: 0, kelebihan: 0 });
  });
  it("pembayaran ganda → kelebihan (D6)", () => {
    const first = allocatePayment(100213, 100000, 213, none);
    const second = allocatePayment(100213, 100000, 213, first);
    expect(second).toEqual({ pokok: 0, kode_unik: 0, kelebihan: 100213 });
  });
  it("cicilan: pokok terisi bertahap", () => {
    const a = allocatePayment(300000, 1000000, 0, none);
    const b = allocatePayment(500000, 1000000, 0, a);
    const c = allocatePayment(200000, 1000000, 0, { pokok: 800000, kode_unik: 0, kelebihan: 0 });
    expect(a.pokok).toBe(300000);
    expect(b.pokok).toBe(500000);
    expect(c.pokok).toBe(200000);
  });
  it("total alokasi selalu sama dengan jumlah pembayaran", () => {
    for (const amount of [1, 999, 100000, 3400486]) {
      const r = allocatePayment(amount, 100000, 213, { pokok: 40000, kode_unik: 100, kelebihan: 5 });
      expect(r.pokok + r.kode_unik + r.kelebihan).toBe(amount);
    }
  });
  it("jumlah negatif/pecahan tidak menghasilkan nilai negatif", () => {
    const r = allocatePayment(-5, 100, 10, none);
    expect(r).toEqual({ pokok: 0, kode_unik: 0, kelebihan: 0 });
  });
});

describe("fundForTransaction", () => {
  it("zakat → zakat + jenis dari kategori", () => {
    expect(fundForTransaction({ productType: "zakat", category: "zakat_fitrah" })).toEqual({ fund: "zakat", fundDetail: "fitrah" });
  });
  it("qurban reguler dan tabungan", () => {
    expect(fundForTransaction({ productType: "qurban", typeSpecificData: {} })).toEqual({ fund: "qurban", fundDetail: "pembayaran" });
    expect(fundForTransaction({ productType: "qurban", typeSpecificData: { payment_type: "savings" } })).toEqual({ fund: "qurban", fundDetail: "tabungan" });
  });
  it("campaign: pilar wakaf dan fidyah (tak peka huruf besar)", () => {
    expect(fundForTransaction({ productType: "campaign", typeSpecificData: { pillar: "Wakaf" } }).fund).toBe("wakaf");
    expect(fundForTransaction({ productType: "campaign", pillar: "FIDYAH" }).fund).toBe("fidyah");
    expect(fundForTransaction({ productType: "campaign", pillar: "sedekah" })).toEqual({ fund: "campaign", fundDetail: "sedekah" });
  });
});

describe("fundForDisbursement", () => {
  it("memetakan kategori ke dana", () => {
    expect(fundForDisbursement({ category: "zakat_to_fakir" })).toEqual({ fund: "zakat", fundDetail: "fakir" });
    expect(fundForDisbursement({ category: "campaign_to_beneficiary", pillar: "wakaf" }).fund).toBe("wakaf");
    expect(fundForDisbursement({ category: "qurban_purchase_sapi" })).toEqual({ fund: "qurban", fundDetail: "purchase_sapi" });
    expect(fundForDisbursement({ category: "revenue_share_mitra" })).toEqual({ fund: "bagi_hasil", fundDetail: "mitra" });
    expect(fundForDisbursement({ category: "operational_rent" })).toEqual({ fund: "operasional", fundDetail: "rent" });
    expect(fundForDisbursement({ category: null }).fund).toBe("lainnya");
  });
});

describe("classifyAccount", () => {
  it("gateway lewat gatewayCode atau nama", () => {
    expect(classifyAccount({ gatewayCode: "Flip" })).toMatchObject({ kind: "gateway", refKey: "flip", method: "gateway" });
    expect(classifyAccount({ paymentMethod: "ipaymu" })).toMatchObject({ kind: "gateway", refKey: "ipaymu" });
  });
  it("bank dan QRIS (dua bentuk id)", () => {
    expect(classifyAccount({ paymentMethod: "bank-123" })).toMatchObject({ kind: "bank", refKey: "bank-123", method: "bank_transfer" });
    expect(classifyAccount({ paymentMethod: "bank_bank-123" })).toMatchObject({ kind: "bank", refKey: "bank-123" });
    expect(classifyAccount({ paymentMethod: "qris-9" })).toMatchObject({ kind: "qris", refKey: "qris-9", method: "qris" });
    expect(normalizeAccountId("bank_bank-5")).toBe("bank-5");
  });
  it("tunai dan tak dikenal", () => {
    expect(classifyAccount({ paymentMethod: "cash" })).toMatchObject({ kind: "cash", refKey: "cash" });
    expect(classifyAccount({ paymentMethod: "bank_transfer" })).toMatchObject({ kind: "unmapped", refKey: "unmapped" });
    expect(classifyAccount({})).toMatchObject({ kind: "unmapped" });
  });
});
