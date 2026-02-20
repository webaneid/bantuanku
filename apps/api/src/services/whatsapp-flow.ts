/**
 * Deterministic State Machine for WhatsApp payment flows (zakat & donation).
 * Replaces AI-driven transaction creation to prevent hallucination, skipped steps, and duplicates.
 */
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { campaigns, zakatTypes, zakatPeriods, settings, donatur, qurbanPackages, qurbanPeriods, qurbanPackagePeriods, qurbanSharedGroups, qurbanSavings } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { TransactionService } from "./transaction";
import { getGoldPrice, getFrontendUrl, stripHtml, truncateText } from "./whatsapp-ai";
import { WhatsAppService } from "./whatsapp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlowState {
  type: "zakat" | "donation" | "fidyah" | "qurban" | "qurban_savings" | "qurban_savings_deposit";
  step: string;
  data: Record<string, any>;
  startedAt: number;
}

/** Minimal context passed from whatsapp-ai.ts */
export interface FlowContext {
  phone: string;
  donorName?: string;
  donaturId?: string;
  flowState?: FlowState;
}

// ---------------------------------------------------------------------------
// Flow State Constructors
// ---------------------------------------------------------------------------

export function createZakatFlowState(params: { calculatorType?: string }): FlowState {
  return {
    type: "zakat",
    step: params.calculatorType ? "select_program" : "select_type",
    data: { calculatorType: params.calculatorType || null },
    startedAt: Date.now(),
  };
}

export function createDonationFlowState(params: { campaignId: string; campaignName: string; amount?: number }): FlowState {
  return {
    type: "donation",
    step: params.amount ? "confirm" : "ask_amount",
    data: {
      campaignId: params.campaignId,
      campaignName: params.campaignName,
      amount: params.amount || null,
    },
    startedAt: Date.now(),
  };
}

export function createFidyahFlowState(params: { campaignId: string; campaignName: string }): FlowState {
  return {
    type: "fidyah",
    step: "ask_person_count",
    data: {
      campaignId: params.campaignId,
      campaignName: params.campaignName,
    },
    startedAt: Date.now(),
  };
}

export function createQurbanFlowState(): FlowState {
  return {
    type: "qurban",
    step: "select_period",
    data: {},
    startedAt: Date.now(),
  };
}

export function createQurbanSavingsFlowState(): FlowState {
  return {
    type: "qurban_savings",
    step: "select_period",
    data: {},
    startedAt: Date.now(),
  };
}

export function createQurbanSavingsDepositFlowState(): FlowState {
  return {
    type: "qurban_savings_deposit",
    step: "show_savings",
    data: {},
    startedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Input Parsing Utilities (deterministic, no AI)
// ---------------------------------------------------------------------------

export function parseIndonesianAmount(input: string): number | null {
  let text = input.trim().toLowerCase();
  // Remove "rp" prefix with optional dot/space
  text = text.replace(/^rp\.?\s*/i, "");
  // Remove spaces
  text = text.replace(/\s+/g, "");

  // Check for suffix multipliers: jt/juta/j → ×1_000_000, rb/ribu/r → ×1_000
  const suffixMatch = text.match(/^([\d.,]+)\s*(jt|juta|j|rb|ribu|r|m)\b/i);
  if (suffixMatch) {
    const numStr = suffixMatch[1].replace(/,/g, ".");
    const num = parseFloat(numStr);
    if (isNaN(num)) return null;
    const suffix = suffixMatch[2].toLowerCase();
    if (["jt", "juta", "j", "m"].includes(suffix)) return Math.round(num * 1_000_000);
    if (["rb", "ribu", "r"].includes(suffix)) return Math.round(num * 1_000);
  }

  // Plain number: handle Indonesian format "1.500.000" (dots as thousands)
  // If has multiple dots → Indonesian format. Replace dots with nothing.
  const dotCount = (text.match(/\./g) || []).length;
  if (dotCount > 1) {
    text = text.replace(/\./g, "");
  } else if (dotCount === 1) {
    // Single dot: could be decimal (1.5) or thousands (1.000)
    // If 3 digits after dot → thousands separator
    if (/\.\d{3}$/.test(text)) {
      text = text.replace(".", "");
    }
    // Otherwise keep as decimal
  }
  // Replace comma with dot (Indonesian decimal)
  text = text.replace(",", ".");

  const result = parseFloat(text);
  if (isNaN(result) || result <= 0 || !isFinite(result)) return null;
  return Math.round(result);
}

function parseJiwaCount(input: string): number | null {
  const text = input.trim().toLowerCase();
  // Direct number
  const num = parseInt(text, 10);
  if (!isNaN(num) && num >= 1 && num <= 999) return num;
  // Word numbers
  const wordMap: Record<string, number> = {
    satu: 1, seorang: 1, "se orang": 1,
    dua: 2, tiga: 3, empat: 4, lima: 5,
    enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
  };
  return wordMap[text] || null;
}

export function matchConfirmation(input: string): "yes" | "no" | null {
  const n = input.trim().toLowerCase();
  const yesPatterns = [
    "ya", "iya", "y", "ok", "oke", "okey", "okay", "lanjut", "setuju",
    "boleh", "mau", "bener", "benar", "betul", "yoi", "gas", "siap",
    "yap", "yup", "yes", "yess", "ayo", "lanjutkan", "proses",
  ];
  const noPatterns = [
    "tidak", "tdk", "ga", "gak", "nggak", "no", "nope", "jangan",
    "engga", "enggak", "kagak", "ogah", "gamau", "gajadi", "ga jadi",
  ];
  if (yesPatterns.some((p) => n === p || n.startsWith(p + " "))) return "yes";
  if (noPatterns.some((p) => n === p || n.startsWith(p + " "))) return "no";
  return null;
}

export function matchCancel(input: string): boolean {
  const n = input.trim().toLowerCase();
  const patterns = ["batal", "cancel", "batalkan", "stop", "keluar", "exit"];
  return patterns.some((p) => n === p || n.startsWith(p + " "));
}

function matchZakatTypeKeyword(input: string): string | null {
  const n = input.trim().toLowerCase().replace(/zakat\s*/i, "");
  const map: Record<string, string> = {
    fitrah: "fitrah", fitra: "fitrah",
    maal: "maal", mal: "maal", mall: "maal",
    penghasilan: "penghasilan", gaji: "penghasilan",
    profesi: "profesi",
    pertanian: "pertanian", tani: "pertanian",
    peternakan: "peternakan", ternak: "peternakan",
    bisnis: "bisnis", usaha: "bisnis", dagang: "bisnis", perdagangan: "bisnis",
  };
  // Exact match
  if (map[n]) return map[n];
  // Partial match
  for (const [key, val] of Object.entries(map)) {
    if (n.includes(key)) return val;
  }
  return null;
}

function matchNumberFromList(input: string, listLength: number): number | null {
  const num = parseInt(input.trim(), 10);
  if (isNaN(num) || num < 1 || num > listLength) return null;
  return num - 1; // 0-based
}

const calcTypeLabelMap: Record<string, string> = {
  fitrah: "Zakat Fitrah", maal: "Zakat Maal", penghasilan: "Zakat Penghasilan",
  profesi: "Zakat Profesi", pertanian: "Zakat Pertanian", peternakan: "Zakat Peternakan",
  bisnis: "Zakat Bisnis", perdagangan: "Zakat Perdagangan",
};

function fmt(n: number): string {
  return n.toLocaleString("id-ID");
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export async function handleFlowStep(
  db: Database,
  ctx: FlowContext,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  const flow = ctx.flowState!;
  console.log(`[Flow] handleFlowStep: type=${flow.type} step=${flow.step} text="${text.substring(0, 50)}" phone=${ctx.phone}`);

  // Cancel at any step
  if (matchCancel(text)) {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Proses dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }

  // Guard: donatur must be registered before creating any transaction
  if (flow.step === "confirm" && !ctx.donaturId) {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Maaf, Anda belum terdaftar sebagai donatur. Silakan daftar terlebih dahulu dengan mengirimkan nama lengkap dan email Anda.");
    return;
  }

  try {
    if (flow.type === "zakat") {
      await handleZakatStep(db, ctx, flow, text, wa, envFrontendUrl);
    } else if (flow.type === "donation") {
      await handleDonationStep(db, ctx, flow, text, wa, envFrontendUrl);
    } else if (flow.type === "fidyah") {
      await handleFidyahStep(db, ctx, flow, text, wa, envFrontendUrl);
    } else if (flow.type === "qurban") {
      await handleQurbanStep(db, ctx, flow, text, wa, envFrontendUrl);
    } else if (flow.type === "qurban_savings") {
      await handleQurbanSavingsStep(db, ctx, flow, text, wa, envFrontendUrl);
    } else if (flow.type === "qurban_savings_deposit") {
      await handleQurbanSavingsDepositStep(db, ctx, flow, text, wa, envFrontendUrl);
    }
    console.log(`[Flow] After step: type=${flow.type} step=${flow.step} flowState=${ctx.flowState ? "ACTIVE" : "CLEARED"}`);
  } catch (err: any) {
    console.error("[Flow] Error in step:", flow.type, flow.step, err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Maaf, terjadi kesalahan. Silakan mulai ulang.");
  }
}

/**
 * Sends the first message when a flow is activated.
 * Called from processIncomingMessage after AI triggers a flow.
 */
export async function generateFirstFlowMessage(
  db: Database,
  ctx: FlowContext,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<string> {
  const flow = ctx.flowState!;

  if (flow.type === "zakat") {
    if (flow.data.calculatorType) {
      // Already know the type → show programs
      return await enterSelectProgram(db, ctx, flow, wa);
    } else {
      // Show type menu
      return await sendZakatTypeMenu(db, flow, wa, ctx.phone);
    }
  } else if (flow.type === "donation") {
    if (flow.data.amount) {
      // Amount already known → show confirmation
      const msg = buildDonationConfirmMessage(flow);
      await wa.sendMessage(ctx.phone, msg);
      return msg;
    } else {
      const msg = `*Donasi — ${flow.data.campaignName}*\n\nBerapa nominal yang ingin Anda donasikan?\n\nKetik nominal (misal: *100rb*, *500000*, atau *1jt*).\nKetik *batal* untuk membatalkan.`;
      await wa.sendMessage(ctx.phone, msg);
      return msg;
    }
  } else if (flow.type === "fidyah") {
    const msg = `*Fidyah — ${flow.data.campaignName}*\n\nFidyah ini untuk berapa orang?\n\nKetik jumlah orang (misal: *1* atau *3*).\nKetik *batal* untuk membatalkan.`;
    await wa.sendMessage(ctx.phone, msg);
    return msg;
  } else if (flow.type === "qurban") {
    return await sendQurbanPeriodMenu(db, flow, wa, ctx.phone);
  } else if (flow.type === "qurban_savings") {
    return await sendQurbanSavingsPeriodMenu(db, flow, wa, ctx.phone);
  } else if (flow.type === "qurban_savings_deposit") {
    return await sendSavingsDepositInfo(db, ctx, flow, wa);
  }

  return "";
}

// ---------------------------------------------------------------------------
// Zakat Flow
// ---------------------------------------------------------------------------

async function handleZakatStep(
  db: Database,
  ctx: FlowContext,
  flow: FlowState,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  switch (flow.step) {
    case "select_type":
      return zakatSelectType(db, ctx, flow, text, wa);
    case "select_program":
      return zakatSelectProgram(db, ctx, flow, text, wa);
    case "ask_data":
      return zakatAskData(db, ctx, flow, text, wa);
    case "ask_data_hutang":
      return zakatAskDataHutang(db, ctx, flow, text, wa);
    case "ask_data_irigasi":
      return zakatAskDataIrigasi(db, ctx, flow, text, wa);
    case "ask_data_bisnis_keuntungan":
      return zakatAskDataField(db, ctx, flow, text, wa, "keuntungan", "Berapa keuntungan usaha Anda?\n\nKetik nominal (misal: *50jt*) atau *0* jika tidak ada.", "ask_data_bisnis_piutang");
    case "ask_data_bisnis_piutang":
      return zakatAskDataField(db, ctx, flow, text, wa, "piutang", "Berapa piutang usaha Anda?\n\nKetik nominal (misal: *10jt*) atau *0* jika tidak ada.", "ask_data_bisnis_hutang");
    case "ask_data_bisnis_hutang":
      return zakatAskDataField(db, ctx, flow, text, wa, "hutang", "Berapa hutang usaha Anda?\n\nKetik nominal (misal: *5jt*) atau *0* jika tidak ada.", "__calculate__");
    case "ask_on_behalf":
      return zakatAskOnBehalf(db, ctx, flow, text, wa);
    case "confirm":
      return zakatConfirm(db, ctx, flow, text, wa, envFrontendUrl);
    default:
      ctx.flowState = undefined;
      await wa.sendMessage(ctx.phone, "Terjadi kesalahan. Silakan mulai ulang.");
  }
}

async function sendZakatTypeMenu(db: Database, flow: FlowState, wa: WhatsAppService, phone: string): Promise<string> {
  const types = await db
    .select({ id: zakatTypes.id, name: zakatTypes.name, calculatorType: zakatTypes.calculatorType, slug: zakatTypes.slug })
    .from(zakatTypes)
    .where(eq(zakatTypes.isActive, true));

  if (types.length === 0) {
    flow.step = "__done__";
    const msg = "Belum ada jenis zakat yang tersedia saat ini.";
    await wa.sendMessage(phone, msg);
    return msg;
  }

  // Group by calculatorType
  const ctMap = new Map<string, { label: string; count: number }>();
  for (const t of types) {
    const raw = t.calculatorType || t.slug;
    const ct = raw.startsWith("zakat-") ? raw.replace("zakat-", "") : raw;
    if (!ctMap.has(ct)) {
      ctMap.set(ct, { label: calcTypeLabelMap[ct] || `Zakat ${ct.charAt(0).toUpperCase() + ct.slice(1)}`, count: 1 });
    } else {
      ctMap.get(ct)!.count++;
    }
  }

  const typeList = Array.from(ctMap.entries()).map(([key, val]) => ({ key, ...val }));
  flow.data.typeList = typeList;
  flow.step = "select_type";

  const menuLines = typeList.map((t, i) => `${i + 1}. ${t.label}${t.count > 1 ? ` (${t.count} program)` : ""}`);
  const msg = [
    "Silakan pilih jenis zakat:",
    "",
    ...menuLines,
    "",
    "Ketik nomor atau nama jenis zakat.",
    "Ketik *batal* untuk membatalkan.",
  ].join("\n");

  await wa.sendMessage(phone, msg);
  return msg;
}

async function zakatSelectType(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const typeList: Array<{ key: string; label: string }> = flow.data.typeList || [];

  // Try number match
  const idx = matchNumberFromList(text, typeList.length);
  if (idx !== null) {
    flow.data.calculatorType = typeList[idx].key;
    await enterSelectProgram(db, ctx, flow, wa);
    return;
  }

  // Try keyword match
  const keyword = matchZakatTypeKeyword(text);
  if (keyword) {
    const found = typeList.find((t) => t.key === keyword);
    if (found) {
      flow.data.calculatorType = found.key;
      await enterSelectProgram(db, ctx, flow, wa);
      return;
    }
  }

  // Also check confirmation (user might be confused)
  const conf = matchConfirmation(text);
  if (conf === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Proses dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }

  // Invalid
  await wa.sendMessage(ctx.phone, `Pilihan tidak valid. Silakan ketik nomor (1-${typeList.length}) atau nama jenis zakat.`);
}

async function enterSelectProgram(db: Database, ctx: FlowContext, flow: FlowState, wa: WhatsAppService): Promise<string> {
  const ct = flow.data.calculatorType!;
  const withPrefix = ct.startsWith("zakat-") ? ct : `zakat-${ct}`;
  const withoutPrefix = ct.startsWith("zakat-") ? ct.replace("zakat-", "") : ct;

  const programs = await db
    .select({ id: zakatTypes.id, name: zakatTypes.name, description: zakatTypes.description, calculatorType: zakatTypes.calculatorType, slug: zakatTypes.slug })
    .from(zakatTypes)
    .where(and(
      eq(zakatTypes.isActive, true),
      or(
        eq(zakatTypes.calculatorType, withoutPrefix),
        eq(zakatTypes.calculatorType, withPrefix),
        eq(zakatTypes.slug, withoutPrefix),
        eq(zakatTypes.slug, withPrefix)
      )
    ));

  if (programs.length === 0) {
    ctx.flowState = undefined;
    const label = calcTypeLabelMap[withoutPrefix] || ct;
    const msg = `Tidak ada program ${label} yang tersedia saat ini. Silakan ketik pesan baru.`;
    await wa.sendMessage(ctx.phone, msg);
    return msg;
  }

  if (programs.length === 1) {
    // Auto-select
    flow.data.zakatTypeId = programs[0].id;
    flow.data.zakatTypeName = programs[0].name;
    return await enterAskData(db, ctx, flow, wa);
  }

  // Multiple programs
  flow.data.programList = programs.map((p) => ({ id: p.id, name: p.name, description: p.description }));
  flow.step = "select_program";

  const label = calcTypeLabelMap[withoutPrefix] || ct;
  const lines = programs.map((p, i) => {
    const desc = p.description ? truncateText(stripHtml(p.description), 80) : "";
    return `${i + 1}. *${p.name}*${desc ? `\n   ${desc}` : ""}`;
  });

  const msg = [
    `Pilih program ${label}:`,
    "",
    ...lines,
    "",
    `Ketik nomor (1-${programs.length}).`,
    "Ketik *batal* untuk membatalkan.",
  ].join("\n");

  await wa.sendMessage(ctx.phone, msg);
  return msg;
}

async function zakatSelectProgram(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const programList: Array<{ id: string; name: string }> = flow.data.programList || [];

  // Try number
  const idx = matchNumberFromList(text, programList.length);
  if (idx !== null) {
    flow.data.zakatTypeId = programList[idx].id;
    flow.data.zakatTypeName = programList[idx].name;
    await enterAskData(db, ctx, flow, wa);
    return;
  }

  // Try name match (fuzzy)
  const lower = text.trim().toLowerCase();
  const found = programList.find((p) => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
  if (found) {
    flow.data.zakatTypeId = found.id;
    flow.data.zakatTypeName = found.name;
    await enterAskData(db, ctx, flow, wa);
    return;
  }

  await wa.sendMessage(ctx.phone, `Pilihan tidak valid. Silakan ketik nomor (1-${programList.length}).`);
}

async function enterAskData(db: Database, ctx: FlowContext, flow: FlowState, wa: WhatsAppService): Promise<string> {
  const ct = flow.data.calculatorType!;
  flow.step = "ask_data";

  let msg = "";
  switch (ct) {
    case "fitrah":
      msg = `*${flow.data.zakatTypeName}*\n\nZakat fitrah ini untuk berapa jiwa/orang?\nAnda bisa membayarkan untuk diri sendiri dan keluarga.\n\nKetik jumlah jiwa (misal: *3*).\nKetik *batal* untuk membatalkan.`;
      break;
    case "maal":
      msg = `*${flow.data.zakatTypeName}*\n\nBerapa total harta yang Anda miliki saat ini?\n(Termasuk tabungan, deposito, investasi, emas, dll)\n\nKetik nominal (misal: *500jt* atau *500.000.000*).\nKetik *batal* untuk membatalkan.`;
      break;
    case "penghasilan":
    case "profesi":
      msg = `*${flow.data.zakatTypeName}*\n\nBerapa penghasilan bulanan Anda?\n\nKetik nominal (misal: *10jt* atau *10.000.000*).\nKetik *batal* untuk membatalkan.`;
      break;
    case "pertanian":
      msg = `*${flow.data.zakatTypeName}*\n\nBerapa nilai hasil panen Anda (dalam Rupiah)?\n\nKetik nominal (misal: *50jt* atau *50.000.000*).\nKetik *batal* untuk membatalkan.`;
      break;
    case "peternakan":
      msg = `*${flow.data.zakatTypeName}*\n\nBerapa total nilai ternak Anda?\n\nKetik nominal (misal: *100jt* atau *100.000.000*).\nKetik *batal* untuk membatalkan.`;
      break;
    case "bisnis":
    case "perdagangan":
      msg = `*${flow.data.zakatTypeName}*\n\nBerapa modal usaha Anda?\n\nKetik nominal (misal: *200jt* atau *200.000.000*).\nKetik *batal* untuk membatalkan.`;
      break;
    default:
      msg = `*${flow.data.zakatTypeName}*\n\nBerapa total harta/aset untuk zakat ini?\n\nKetik nominal (misal: *100jt*).\nKetik *batal* untuk membatalkan.`;
  }

  await wa.sendMessage(ctx.phone, msg);
  return msg;
}

async function zakatAskData(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const ct = flow.data.calculatorType!;

  switch (ct) {
    case "fitrah": {
      const jiwa = parseJiwaCount(text);
      if (!jiwa) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan jumlah jiwa (angka). Contoh: *3*");
        return;
      }
      flow.data.jumlah_jiwa = jiwa;
      flow.step = "ask_on_behalf";
      console.log(`[Flow] fitrah: jiwa=${jiwa}, step set to "ask_on_behalf", zakatTypeId=${flow.data.zakatTypeId}`);
      const jiwaTxt = jiwa === 1 ? "1 jiwa" : `${jiwa} jiwa`;
      await wa.sendMessage(ctx.phone, `Baik, zakat fitrah untuk *${jiwaTxt}*.\n\nBoleh kami tahu atas nama siapa zakat fitrah ini ditunaikan?\n\nKetik nama (misal: *Ahmad dan keluarga*).\nKetik *batal* untuk membatalkan.`);
      return;
    }
    case "maal": {
      const amount = parseIndonesianAmount(text);
      if (!amount) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan nominal harta dalam Rupiah. Contoh: *500jt* atau *500000000*");
        return;
      }
      flow.data.total_harta = amount;
      flow.step = "ask_data_hutang";
      await wa.sendMessage(ctx.phone, "Apakah ada hutang yang perlu dikurangkan?\n\nKetik nominal hutang (misal: *200rb*) atau ketik *0* jika tidak ada.");
      return;
    }
    case "penghasilan":
    case "profesi": {
      const amount = parseIndonesianAmount(text);
      if (!amount) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan penghasilan bulanan. Contoh: *10jt* atau *10000000*");
        return;
      }
      flow.data.penghasilan = amount;
      await calculateAndShowResult(db, ctx, flow, wa);
      return;
    }
    case "pertanian": {
      const amount = parseIndonesianAmount(text);
      if (!amount) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan nilai hasil panen. Contoh: *50jt* atau *50000000*");
        return;
      }
      flow.data.hasil_panen = amount;
      flow.step = "ask_data_irigasi";
      await wa.sendMessage(ctx.phone, "Apakah sawah Anda menggunakan irigasi?\n\nKetik *1* = Ya (irigasi) → tarif 5%\nKetik *2* = Tidak (tadah hujan) → tarif 10%");
      return;
    }
    case "peternakan": {
      const amount = parseIndonesianAmount(text);
      if (!amount) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan nilai ternak. Contoh: *100jt* atau *100000000*");
        return;
      }
      flow.data.nilai_ternak = amount;
      await calculateAndShowResult(db, ctx, flow, wa);
      return;
    }
    case "bisnis":
    case "perdagangan": {
      const amount = parseIndonesianAmount(text);
      if (amount === null) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan modal usaha. Contoh: *200jt* atau *200000000*");
        return;
      }
      flow.data.modal_usaha = amount;
      flow.step = "ask_data_bisnis_keuntungan";
      await wa.sendMessage(ctx.phone, "Berapa keuntungan usaha Anda?\n\nKetik nominal (misal: *50jt*) atau *0* jika tidak ada.");
      return;
    }
    default: {
      // Generic fallback
      const amount = parseIndonesianAmount(text);
      if (!amount) {
        await wa.sendMessage(ctx.phone, "Mohon masukkan nominal. Contoh: *100jt* atau *100000000*");
        return;
      }
      flow.data.generic_amount = amount;
      await calculateAndShowResult(db, ctx, flow, wa);
    }
  }
}

async function zakatAskDataHutang(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const n = text.trim().toLowerCase();
  let hutang = 0;
  if (n === "0" || n === "tidak" || n === "tidak ada" || n === "tdk" || n === "ga ada" || n === "gak ada") {
    hutang = 0;
  } else {
    const parsed = parseIndonesianAmount(text);
    if (parsed === null) {
      await wa.sendMessage(ctx.phone, "Mohon masukkan nominal hutang. Contoh: *200rb* atau ketik *0* jika tidak ada.");
      return;
    }
    hutang = parsed;
  }
  flow.data.hutang = hutang;
  await calculateAndShowResult(db, ctx, flow, wa);
}

async function zakatAskDataIrigasi(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const n = text.trim().toLowerCase();
  if (n === "1" || n === "ya" || n === "iya" || n === "yes") {
    flow.data.irigasi = true;
  } else if (n === "2" || n === "tidak" || n === "tdk" || n === "no" || n === "ga" || n === "gak") {
    flow.data.irigasi = false;
  } else {
    await wa.sendMessage(ctx.phone, "Ketik *1* untuk Ya (irigasi) atau *2* untuk Tidak (tadah hujan).");
    return;
  }
  await calculateAndShowResult(db, ctx, flow, wa);
}

async function zakatAskOnBehalf(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  console.log(`[Flow] zakatAskOnBehalf: text="${text}" zakatTypeId=${flow.data.zakatTypeId} jiwa=${flow.data.jumlah_jiwa}`);
  const name = text.trim();
  if (!name || name.length < 2) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan nama. Contoh: *Ahmad dan keluarga*");
    return;
  }
  flow.data.onBehalfOf = name;
  console.log(`[Flow] zakatAskOnBehalf: calling calculateAndShowResult for "${name}"`);
  await calculateAndShowResult(db, ctx, flow, wa);
  console.log(`[Flow] zakatAskOnBehalf: done, step=${flow.step} flowState=${ctx.flowState ? "ACTIVE" : "CLEARED"}`);
}

/** Generic handler for bisnis sub-steps that just collect a number and advance */
async function zakatAskDataField(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService,
  fieldName: string, errorPrompt: string, nextStep: string
): Promise<void> {
  const n = text.trim().toLowerCase();
  let amount = 0;
  if (n === "0" || n === "tidak" || n === "tidak ada" || n === "tdk" || n === "ga ada") {
    amount = 0;
  } else {
    const parsed = parseIndonesianAmount(text);
    if (parsed === null) {
      await wa.sendMessage(ctx.phone, `Mohon masukkan nominal ${fieldName}. Contoh: *50jt* atau ketik *0* jika tidak ada.`);
      return;
    }
    amount = parsed;
  }
  flow.data[fieldName] = amount;

  if (nextStep === "__calculate__") {
    await calculateAndShowResult(db, ctx, flow, wa);
  } else {
    flow.step = nextStep;
    await wa.sendMessage(ctx.phone, errorPrompt);
  }
}

// ---------------------------------------------------------------------------
// Zakat Calculator (reuses existing logic from whatsapp-ai.ts)
// ---------------------------------------------------------------------------

interface CalcResult {
  amount: number;
  explanation: string;
  nisabNotMet: boolean;
  nisabMessage?: string;
}

async function calculateZakatAmount(db: Database, flow: FlowState): Promise<CalcResult> {
  const ct = flow.data.calculatorType!;

  // Load settings
  const zakatSettings = await db.select().from(settings).where(
    or(
      eq(settings.key, "zakat_fitrah_amount"),
      eq(settings.key, "zakat_gold_price"),
      eq(settings.key, "zakat_nisab_gold"),
      eq(settings.key, "zakat_mal_percentage"),
      eq(settings.key, "zakat_profession_percentage"),
    )
  );
  const getSetting = (key: string) => zakatSettings.find((s) => s.key === key)?.value;

  // Load zakatType for fitrahAmount
  const zakatType = await db.query.zakatTypes.findFirst({
    where: eq(zakatTypes.id, flow.data.zakatTypeId),
  });

  switch (ct) {
    case "fitrah": {
      const jumlahJiwa = flow.data.jumlah_jiwa || 1;
      const hargaPerJiwa = Number(zakatType?.fitrahAmount) || Number(getSetting("zakat_fitrah_amount")) || 45000;
      const total = jumlahJiwa * hargaPerJiwa;
      return {
        amount: total,
        explanation: `${jumlahJiwa} jiwa × Rp ${fmt(hargaPerJiwa)} = Rp ${fmt(total)}`,
        nisabNotMet: false,
      };
    }
    case "maal": {
      const totalHarta = flow.data.total_harta || 0;
      const hutang = flow.data.hutang || 0;
      const nett = totalHarta - hutang;
      if (nett <= 0) {
        return { amount: 0, explanation: "", nisabNotMet: true, nisabMessage: "Total harta setelah dikurangi hutang bernilai negatif atau nol. Tidak ada kewajiban zakat maal." };
      }
      const goldPrice = await getGoldPrice(db);
      const nisabGold = Number(getSetting("zakat_nisab_gold")) || 85;
      const nisab = nisabGold * goldPrice;
      const pct = Number(getSetting("zakat_mal_percentage")) || 2.5;
      if (nett < nisab) {
        return {
          amount: 0, explanation: "", nisabNotMet: true,
          nisabMessage: [
            `Total harta bersih Anda: Rp ${fmt(nett)} (harta Rp ${fmt(totalHarta)} - hutang Rp ${fmt(hutang)}).`,
            ``,
            `Nisab zakat maal: ${nisabGold} gram emas × Rp ${fmt(goldPrice)}/gram = *Rp ${fmt(nisab)}*`,
            `(Harga emas terkini dari Pluang)`,
            ``,
            `Harta bersih Anda belum mencapai nisab, sehingga tidak wajib zakat maal. Namun Anda tetap bisa beramal melalui infaq atau sedekah.`,
          ].join("\n"),
        };
      }
      const total = Math.round(nett * (pct / 100));
      return {
        amount: total, nisabNotMet: false,
        explanation: [
          `Harta bersih: Rp ${fmt(totalHarta)} - Rp ${fmt(hutang)} = Rp ${fmt(nett)}`,
          `Nisab: ${nisabGold}g emas × Rp ${fmt(goldPrice)} = Rp ${fmt(nisab)} ✓`,
          `Zakat: ${pct}% × Rp ${fmt(nett)} = Rp ${fmt(total)}`,
        ].join("\n"),
      };
    }
    case "penghasilan":
    case "profesi": {
      const penghasilan = flow.data.penghasilan || 0;
      const goldPrice = await getGoldPrice(db);
      const nisabGold = Number(getSetting("zakat_nisab_gold")) || 85;
      const nisab = nisabGold * goldPrice;
      const pct = Number(getSetting("zakat_profession_percentage")) || 2.5;
      if (penghasilan < nisab / 12) {
        return {
          amount: 0, explanation: "", nisabNotMet: true,
          nisabMessage: [
            `Penghasilan Rp ${fmt(penghasilan)}/bulan belum mencapai nisab.`,
            ``,
            `Nisab zakat penghasilan: ${nisabGold} gram emas × Rp ${fmt(goldPrice)} = Rp ${fmt(nisab)}/tahun (≈ Rp ${fmt(Math.round(nisab / 12))}/bulan).`,
            ``,
            `Tidak wajib zakat penghasilan, namun Anda tetap bisa beramal melalui infaq atau sedekah.`,
          ].join("\n"),
        };
      }
      const total = Math.round(penghasilan * (pct / 100));
      return { amount: total, nisabNotMet: false, explanation: `${pct}% × Rp ${fmt(penghasilan)} = Rp ${fmt(total)}` };
    }
    case "pertanian": {
      const hasilPanen = flow.data.hasil_panen || 0;
      const irigasi = flow.data.irigasi === true;
      const rate = irigasi ? 5 : 10;
      const total = Math.round(hasilPanen * (rate / 100));
      return { amount: total, nisabNotMet: false, explanation: `${rate}% × Rp ${fmt(hasilPanen)} = Rp ${fmt(total)}` };
    }
    case "peternakan": {
      const nilaiTernak = flow.data.nilai_ternak || 0;
      const pct = Number(getSetting("zakat_mal_percentage")) || 2.5;
      const total = Math.round(nilaiTernak * (pct / 100));
      return { amount: total, nisabNotMet: false, explanation: `${pct}% × Rp ${fmt(nilaiTernak)} = Rp ${fmt(total)}` };
    }
    case "bisnis":
    case "perdagangan": {
      const modal = flow.data.modal_usaha || 0;
      const keuntungan = flow.data.keuntungan || 0;
      const piutang = flow.data.piutang || 0;
      const hutang = flow.data.hutang || 0;
      const nett = modal + keuntungan + piutang - hutang;
      const pct = Number(getSetting("zakat_mal_percentage")) || 2.5;
      if (nett <= 0) {
        return { amount: 0, explanation: "", nisabNotMet: true, nisabMessage: "Nilai bersih usaha tidak mencukupi untuk zakat bisnis." };
      }
      const total = Math.round(nett * (pct / 100));
      return { amount: total, nisabNotMet: false, explanation: `${pct}% × Rp ${fmt(nett)} = Rp ${fmt(total)}` };
    }
    default: {
      const amount = flow.data.generic_amount || 0;
      const total = Math.round(amount * 0.025);
      return { amount: total, nisabNotMet: false, explanation: `2.5% × Rp ${fmt(amount)} = Rp ${fmt(total)}` };
    }
  }
}

async function calculateAndShowResult(db: Database, ctx: FlowContext, flow: FlowState, wa: WhatsAppService): Promise<void> {
  const result = await calculateZakatAmount(db, flow);

  if (result.nisabNotMet) {
    ctx.flowState = undefined;
    const msg = [
      result.nisabMessage || "Harta belum mencapai nisab.",
      "",
      "Silakan ketik pesan baru jika membutuhkan bantuan.",
    ].join("\n");
    await wa.sendMessage(ctx.phone, msg);
    return;
  }

  if (result.amount <= 0) {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Hasil perhitungan zakat: Rp 0. Tidak ada zakat yang harus dibayar.");
    return;
  }

  flow.data.calculatedAmount = result.amount;
  flow.data.calculationExplanation = result.explanation;
  flow.step = "confirm";

  // Build detail lines based on type
  const ct = flow.data.calculatorType;
  const detailLines: string[] = [];
  if (ct === "fitrah") {
    detailLines.push(`Jumlah Jiwa: ${flow.data.jumlah_jiwa} orang`);
    if (flow.data.onBehalfOf) detailLines.push(`Atas Nama: ${flow.data.onBehalfOf}`);
  } else {
    detailLines.push(result.explanation);
  }

  const niatTarget = ct === "fitrah" && flow.data.onBehalfOf
    ? `fitrah untuk ${flow.data.onBehalfOf}`
    : ct === "fitrah" ? "fitrah" : (flow.data.zakatTypeName?.toLowerCase() || "");

  const msg = [
    `*Konfirmasi Zakat*`,
    ``,
    `Jenis: ${flow.data.zakatTypeName}`,
    ...detailLines,
    ``,
    `*Total Zakat: Rp ${fmt(result.amount)}*`,
    ``,
    `Sebelum Anda ketik *Ya*, silakan melafalkan niat zakat ${niatTarget}. Semoga Allah meridhoi apa yang kita lakukan. Amin 🤲`,
    ``,
    `Ketik *Ya* untuk memproses pembayaran atau *Batal* untuk membatalkan.`,
  ].join("\n");

  await wa.sendMessage(ctx.phone, msg);
}

async function zakatConfirm(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService, envFrontendUrl?: string): Promise<void> {
  const conf = matchConfirmation(text);

  if (conf === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Proses zakat dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }

  if (conf !== "yes") {
    await wa.sendMessage(ctx.phone, "Ketik *Ya* untuk melanjutkan pembayaran atau *Batal* untuk membatalkan.");
    return;
  }

  // Create transaction
  const period = await db.query.zakatPeriods.findFirst({
    where: and(
      eq(zakatPeriods.zakatTypeId, flow.data.zakatTypeId),
      eq(zakatPeriods.status, "active")
    ),
    with: { zakatType: true },
  });

  if (!period) {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Maaf, tidak ada periode zakat aktif untuk jenis ini saat ini. Silakan hubungi admin.");
    return;
  }

  const quantity = flow.data.jumlah_jiwa || 1;
  const amount = flow.data.calculatedAmount;
  const unitPrice = quantity > 1 ? Math.round(amount / quantity) : amount;
  const donorName = ctx.donorName || "Donatur";
  const donorPhone = ctx.phone;

  // Lookup donatur email for transaction
  const donaturRecord = ctx.donaturId
    ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
    : null;

  try {
    const txService = new TransactionService(db);
    const typeSpecificData: Record<string, any> = {};
    if (flow.data.onBehalfOf) typeSpecificData.on_behalf_of = flow.data.onBehalfOf;

    const tx = await txService.create({
      product_type: "zakat",
      product_id: period.id,
      quantity,
      unit_price: unitPrice,
      donor_name: donorName,
      donor_email: donaturRecord?.email || undefined,
      donor_phone: donorPhone,
      donatur_id: ctx.donaturId,
      include_unique_code: true,
      type_specific_data: Object.keys(typeSpecificData).length > 0 ? typeSpecificData : undefined,
    });

    const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);
    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    ctx.flowState = undefined; // Flow complete

    const msg = [
      "Transaksi zakat berhasil dibuat!",
      "",
      `No. Transaksi: ${tx.transactionNumber}`,
      `Jenis Zakat: ${period.zakatType?.name || period.name}`,
      flow.data.onBehalfOf ? `Atas Nama: ${flow.data.onBehalfOf}` : "",
      quantity > 1 ? `Jumlah Jiwa: ${quantity} orang × Rp ${fmt(unitPrice)}` : "",
      `Nominal: Rp ${fmt(tx.totalAmount)}`,
      tx.uniqueCode ? `Kode Unik: ${tx.uniqueCode}` : "",
      tx.uniqueCode ? `*Total Transfer: Rp ${fmt(transferAmount)}*` : `*Total Transfer: Rp ${fmt(tx.totalAmount)}*`,
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
      "",
      "Silakan pilih metode pembayaran:",
      "- Ketik *Transfer Bank* untuk info rekening",
      "- Ketik *QRIS* untuk pembayaran via QR Code",
      "",
      "Atau bayar langsung melalui link invoice di atas.",
    ].filter(Boolean).join("\n");

    await wa.sendMessage(ctx.phone, msg);
  } catch (err: any) {
    console.error("[Flow] Create zakat transaction error:", err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, `Gagal membuat transaksi: ${err.message || "Terjadi kesalahan"}. Silakan coba lagi.`);
  }
}

// ---------------------------------------------------------------------------
// Donation Flow
// ---------------------------------------------------------------------------

async function handleDonationStep(
  db: Database,
  ctx: FlowContext,
  flow: FlowState,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  switch (flow.step) {
    case "ask_amount":
      return donationAskAmount(db, ctx, flow, text, wa);
    case "confirm":
      return donationConfirm(db, ctx, flow, text, wa, envFrontendUrl);
    default:
      ctx.flowState = undefined;
      await wa.sendMessage(ctx.phone, "Terjadi kesalahan. Silakan mulai ulang.");
  }
}

async function donationAskAmount(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const amount = parseIndonesianAmount(text);

  if (!amount) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan nominal donasi. Contoh: *100rb*, *500000*, atau *1jt*");
    return;
  }

  if (amount < 10000) {
    await wa.sendMessage(ctx.phone, "Nominal minimum donasi adalah Rp 10.000. Silakan masukkan nominal yang lebih besar.");
    return;
  }

  flow.data.amount = amount;
  flow.step = "confirm";

  const msg = buildDonationConfirmMessage(flow);
  await wa.sendMessage(ctx.phone, msg);
}

function buildDonationConfirmMessage(flow: FlowState): string {
  return [
    `*Konfirmasi Donasi*`,
    ``,
    `Program: ${flow.data.campaignName}`,
    `Nominal: *Rp ${fmt(flow.data.amount)}*`,
    ``,
    `Sebelum Anda ketik *Ya*, silakan melafalkan niat berdonasi untuk ${flow.data.campaignName}. Semoga Allah meridhoi apa yang kita lakukan. Amin 🤲`,
    ``,
    `Ketik *Ya* untuk melanjutkan atau *Batal* untuk membatalkan.`,
  ].join("\n");
}

async function donationConfirm(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService, envFrontendUrl?: string): Promise<void> {
  const conf = matchConfirmation(text);

  if (conf === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Proses donasi dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }

  if (conf !== "yes") {
    await wa.sendMessage(ctx.phone, "Ketik *Ya* untuk melanjutkan pembayaran atau *Batal* untuk membatalkan.");
    return;
  }

  // Verify campaign
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, flow.data.campaignId),
  });

  if (!campaign || campaign.status !== "active") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Program tidak ditemukan atau tidak aktif. Silakan pilih program lain.");
    return;
  }

  const donorName = ctx.donorName || "Donatur";
  const donorPhone = ctx.phone;

  // Lookup donatur email for transaction
  const donaturRecord = ctx.donaturId
    ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
    : null;

  try {
    const txService = new TransactionService(db);
    const tx = await txService.create({
      product_type: "campaign",
      product_id: flow.data.campaignId,
      quantity: 1,
      unit_price: flow.data.amount,
      donor_name: donorName,
      donor_email: donaturRecord?.email || undefined,
      donor_phone: donorPhone,
      donatur_id: ctx.donaturId,
      include_unique_code: true,
    });

    const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);
    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    ctx.flowState = undefined; // Flow complete

    const msg = [
      "Transaksi donasi berhasil dibuat!",
      "",
      `No. Transaksi: ${tx.transactionNumber}`,
      `Program: ${tx.productName}`,
      `Nominal: Rp ${fmt(tx.totalAmount)}`,
      tx.uniqueCode ? `Kode Unik: ${tx.uniqueCode}` : "",
      tx.uniqueCode ? `*Total Transfer: Rp ${fmt(transferAmount)}*` : `*Total Transfer: Rp ${fmt(tx.totalAmount)}*`,
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
      "",
      "Silakan pilih metode pembayaran:",
      "- Ketik *Transfer Bank* untuk info rekening",
      "- Ketik *QRIS* untuk pembayaran via QR Code",
      "",
      "Atau bayar langsung melalui link invoice di atas.",
    ].filter(Boolean).join("\n");

    await wa.sendMessage(ctx.phone, msg);
  } catch (err: any) {
    console.error("[Flow] Create donation error:", err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, `Gagal membuat transaksi: ${err.message || "Terjadi kesalahan"}. Silakan coba lagi.`);
  }
}

// ---------------------------------------------------------------------------
// Fidyah Flow
// ---------------------------------------------------------------------------

async function handleFidyahStep(
  db: Database,
  ctx: FlowContext,
  flow: FlowState,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  switch (flow.step) {
    case "ask_person_count":
      return fidyahAskPersonCount(db, ctx, flow, text, wa);
    case "ask_day_count":
      return fidyahAskDayCount(db, ctx, flow, text, wa);
    case "ask_on_behalf":
      return fidyahAskOnBehalf(db, ctx, flow, text, wa);
    case "confirm":
      return fidyahConfirm(db, ctx, flow, text, wa, envFrontendUrl);
    default:
      ctx.flowState = undefined;
      await wa.sendMessage(ctx.phone, "Terjadi kesalahan. Silakan mulai ulang.");
  }
}

async function fidyahAskPersonCount(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const count = parseJiwaCount(text);
  if (!count) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan jumlah orang (angka). Contoh: *1* atau *3*");
    return;
  }

  flow.data.personCount = count;
  flow.step = "ask_day_count";
  await wa.sendMessage(ctx.phone, `Baik, fidyah untuk *${count} orang*.\n\nUntuk berapa hari?\n\nKetik jumlah hari (misal: *1*, *5*, atau *30*).\nKetik *batal* untuk membatalkan.`);
}

async function fidyahAskDayCount(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const num = parseInt(text.trim(), 10);
  if (isNaN(num) || num < 1 || num > 366) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan jumlah hari (angka 1-366). Contoh: *2* atau *30*");
    return;
  }

  flow.data.dayCount = num;
  flow.step = "ask_on_behalf";
  await wa.sendMessage(ctx.phone, `Baik, fidyah untuk *${flow.data.personCount} orang × ${num} hari*.\n\nAtas nama siapa fidyah ini?\n\nKetik nama (misal: *Bapak Ahmad*).\nKetik *batal* untuk membatalkan.`);
}

async function fidyahAskOnBehalf(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const name = text.trim();
  if (!name || name.length < 2) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan nama. Contoh: *Bapak Ahmad*");
    return;
  }

  flow.data.onBehalfOf = name;

  // Load fidyah price per day from settings
  const fidyahSetting = await db.query.settings.findFirst({
    where: eq(settings.key, "fidyah_amount_per_day"),
  });
  const pricePerDay = Number(fidyahSetting?.value) || 45000;
  flow.data.pricePerDay = pricePerDay;

  const totalAmount = flow.data.personCount * flow.data.dayCount * pricePerDay;
  flow.data.amount = totalAmount;
  flow.step = "confirm";

  const msg = [
    `*Konfirmasi Fidyah*`,
    ``,
    `Program: ${flow.data.campaignName}`,
    `Atas Nama: ${name}`,
    `Jumlah Orang: ${flow.data.personCount}`,
    `Jumlah Hari: ${flow.data.dayCount}`,
    `Harga per Hari: Rp ${fmt(pricePerDay)}`,
    ``,
    `${flow.data.personCount} orang × ${flow.data.dayCount} hari × Rp ${fmt(pricePerDay)} = *Rp ${fmt(totalAmount)}*`,
    ``,
    `Sebelum Anda ketik *Ya*, silakan melafalkan niat fidyah untuk ${name}. Semoga Allah meridhoi apa yang kita lakukan. Amin 🤲`,
    ``,
    `Ketik *Ya* untuk memproses pembayaran atau *Batal* untuk membatalkan.`,
  ].join("\n");

  await wa.sendMessage(ctx.phone, msg);
}

async function fidyahConfirm(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService, envFrontendUrl?: string): Promise<void> {
  const conf = matchConfirmation(text);

  if (conf === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Proses fidyah dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }

  if (conf !== "yes") {
    await wa.sendMessage(ctx.phone, "Ketik *Ya* untuk melanjutkan pembayaran atau *Batal* untuk membatalkan.");
    return;
  }

  // Verify campaign
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, flow.data.campaignId),
  });

  if (!campaign || campaign.status !== "active") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Program fidyah tidak ditemukan atau tidak aktif. Silakan hubungi admin.");
    return;
  }

  const donorName = ctx.donorName || "Donatur";
  const donorPhone = ctx.phone;

  // Lookup donatur email for transaction
  const donaturRecord = ctx.donaturId
    ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
    : null;

  try {
    const txService = new TransactionService(db);
    const tx = await txService.create({
      product_type: "campaign",
      product_id: flow.data.campaignId,
      quantity: 1,
      unit_price: flow.data.amount,
      donor_name: donorName,
      donor_email: donaturRecord?.email || undefined,
      donor_phone: donorPhone,
      donatur_id: ctx.donaturId,
      include_unique_code: true,
      type_specific_data: {
        fidyah_person_count: flow.data.personCount,
        fidyah_day_count: flow.data.dayCount,
        on_behalf_of: flow.data.onBehalfOf,
        price_per_day: flow.data.pricePerDay,
      },
    });

    const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);
    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    ctx.flowState = undefined; // Flow complete

    const msg = [
      "Transaksi fidyah berhasil dibuat!",
      "",
      `No. Transaksi: ${tx.transactionNumber}`,
      `Program: ${tx.productName}`,
      `Atas Nama: ${flow.data.onBehalfOf}`,
      `${flow.data.personCount} orang × ${flow.data.dayCount} hari × Rp ${fmt(flow.data.pricePerDay)}`,
      `Nominal: Rp ${fmt(tx.totalAmount)}`,
      tx.uniqueCode ? `Kode Unik: ${tx.uniqueCode}` : "",
      tx.uniqueCode ? `*Total Transfer: Rp ${fmt(transferAmount)}*` : `*Total Transfer: Rp ${fmt(tx.totalAmount)}*`,
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
      "",
      "Silakan pilih metode pembayaran:",
      "- Ketik *Transfer Bank* untuk info rekening",
      "- Ketik *QRIS* untuk pembayaran via QR Code",
      "",
      "Atau bayar langsung melalui link invoice di atas.",
    ].filter(Boolean).join("\n");

    await wa.sendMessage(ctx.phone, msg);
  } catch (err: any) {
    console.error("[Flow] Create fidyah transaction error:", err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, `Gagal membuat transaksi: ${err.message || "Terjadi kesalahan"}. Silakan coba lagi.`);
  }
}

// ---------------------------------------------------------------------------
// Qurban Flow
// ---------------------------------------------------------------------------

async function handleQurbanStep(
  db: Database,
  ctx: FlowContext,
  flow: FlowState,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  switch (flow.step) {
    case "select_period":
      return qurbanSelectPeriod(db, ctx, flow, text, wa);
    case "select_package":
      return qurbanSelectPackage(db, ctx, flow, text, wa);
    case "ask_quantity":
      return qurbanAskQuantity(db, ctx, flow, text, wa);
    case "ask_on_behalf":
      return qurbanAskOnBehalf(db, ctx, flow, text, wa);
    case "confirm":
      return qurbanConfirm(db, ctx, flow, text, wa, envFrontendUrl);
    default:
      ctx.flowState = undefined;
      await wa.sendMessage(ctx.phone, "Terjadi kesalahan. Silakan mulai ulang.");
  }
}

async function sendQurbanPeriodMenu(db: Database, flow: FlowState, wa: WhatsAppService, phone: string): Promise<string> {
  const periods = await db
    .select({
      id: qurbanPeriods.id,
      name: qurbanPeriods.name,
      hijriYear: qurbanPeriods.hijriYear,
      executionDate: qurbanPeriods.executionDate,
    })
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.status, "active"))
    .orderBy(desc(qurbanPeriods.gregorianYear));

  if (periods.length === 0) {
    flow.step = "__done__";
    const msg = "Belum ada periode qurban aktif saat ini.";
    await wa.sendMessage(phone, msg);
    return msg;
  }

  if (periods.length === 1) {
    // Auto-select single period
    flow.data.periodId = periods[0].id;
    flow.data.periodName = periods[0].name;
    return await sendQurbanPackageMenu(db, flow, wa, phone);
  }

  flow.data.periodList = periods.map((p) => ({ id: p.id, name: p.name }));
  flow.step = "select_period";

  const lines = periods.map((p, i) => `${i + 1}. *${p.name}*`);
  const msg = [
    "Silakan pilih periode qurban:",
    "",
    ...lines,
    "",
    "Ketik nomor untuk memilih.",
    "Ketik *batal* untuk membatalkan.",
  ].join("\n");

  await wa.sendMessage(phone, msg);
  return msg;
}

async function qurbanSelectPeriod(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const periodList: Array<{ id: string; name: string }> = flow.data.periodList || [];
  const idx = matchNumberFromList(text, periodList.length);
  if (idx !== null) {
    flow.data.periodId = periodList[idx].id;
    flow.data.periodName = periodList[idx].name;
    await sendQurbanPackageMenu(db, flow, wa, ctx.phone);
    return;
  }
  await wa.sendMessage(ctx.phone, `Pilihan tidak valid. Ketik nomor (1-${periodList.length}).`);
}

async function sendQurbanPackageMenu(db: Database, flow: FlowState, wa: WhatsAppService, phone: string): Promise<string> {
  // Get packages available for this period
  const pkgPeriods = await db
    .select({
      ppId: qurbanPackagePeriods.id,
      price: qurbanPackagePeriods.price,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      isAvailable: qurbanPackagePeriods.isAvailable,
      pkgId: qurbanPackages.id,
      name: qurbanPackages.name,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      maxSlots: qurbanPackages.maxSlots,
      description: qurbanPackages.description,
    })
    .from(qurbanPackagePeriods)
    .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(
      and(
        eq(qurbanPackagePeriods.periodId, flow.data.periodId),
        eq(qurbanPackagePeriods.isAvailable, true),
        eq(qurbanPackages.isAvailable, true)
      )
    );

  if (pkgPeriods.length === 0) {
    flow.step = "__done__";
    const msg = `Tidak ada paket qurban tersedia untuk periode ${flow.data.periodName}.`;
    await wa.sendMessage(phone, msg);
    return msg;
  }

  // Calculate available stock/slots
  const availablePackages = pkgPeriods.filter((p) => {
    if (p.packageType === "individual") return (p.stock - p.stockSold) > 0;
    // shared: check available slots
    const totalSlots = p.stock * (p.maxSlots || 7);
    return (totalSlots - p.slotsFilled) > 0;
  });

  if (availablePackages.length === 0) {
    flow.step = "__done__";
    const msg = `Semua paket qurban untuk periode ${flow.data.periodName} sudah habis.`;
    await wa.sendMessage(phone, msg);
    return msg;
  }

  flow.data.packageList = availablePackages.map((p) => ({
    ppId: p.ppId,
    pkgId: p.pkgId,
    name: p.name,
    animalType: p.animalType,
    packageType: p.packageType,
    maxSlots: p.maxSlots,
    price: p.price,
    stock: p.stock,
    stockSold: p.stockSold,
    slotsFilled: p.slotsFilled,
  }));
  flow.step = "select_package";

  const lines = availablePackages.map((p, i) => {
    const typeLabel = p.animalType === "cow" ? "Sapi" : "Kambing";
    const modeLabel = p.packageType === "shared" ? `Patungan ${p.maxSlots} orang` : "Individu";
    const priceLabel = `Rp ${fmt(p.price)}`;
    const stockInfo = p.packageType === "individual"
      ? `(sisa ${p.stock - p.stockSold} ekor)`
      : `(sisa ${(p.stock * (p.maxSlots || 7)) - p.slotsFilled} slot)`;
    return `${i + 1}. *${p.name}*\n   ${typeLabel} - ${modeLabel}\n   ${priceLabel}/slot ${stockInfo}`;
  });

  const msg = [
    `*Paket Qurban — ${flow.data.periodName}*`,
    "",
    ...lines,
    "",
    "Ketik nomor untuk memilih paket.",
    "Ketik *batal* untuk membatalkan.",
  ].join("\n");

  await wa.sendMessage(phone, msg);
  return msg;
}

async function qurbanSelectPackage(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const packageList: Array<any> = flow.data.packageList || [];
  const idx = matchNumberFromList(text, packageList.length);
  if (idx === null) {
    await wa.sendMessage(ctx.phone, `Pilihan tidak valid. Ketik nomor (1-${packageList.length}).`);
    return;
  }

  const selected = packageList[idx];
  flow.data.selectedPackage = selected;

  if (selected.packageType === "individual") {
    // Individual: ask quantity
    const availableStock = selected.stock - selected.stockSold;
    flow.step = "ask_quantity";
    await wa.sendMessage(ctx.phone, `*${selected.name}*\nHarga: Rp ${fmt(selected.price)}/ekor\nStok tersedia: ${availableStock} ekor\n\nMau pesan berapa ekor?\n\nKetik jumlah (misal: *1* atau *2*).\nKetik *batal* untuk membatalkan.`);
  } else {
    // Shared (patungan): quantity = 1 slot
    flow.data.quantity = 1;
    flow.step = "ask_on_behalf";
    await wa.sendMessage(ctx.phone, `*${selected.name}*\n${selected.animalType === "cow" ? "Sapi" : "Kambing"} patungan ${selected.maxSlots} orang\nHarga: Rp ${fmt(selected.price)}/slot\n\nAtas nama siapa qurban ini?\n\nKetik nama (misal: *Ahmad bin Abdullah*).\nKetik *batal* untuk membatalkan.`);
  }
}

async function qurbanAskQuantity(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const num = parseInt(text.trim(), 10);
  const selected = flow.data.selectedPackage;
  const availableStock = selected.stock - selected.stockSold;

  if (isNaN(num) || num < 1) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan jumlah (angka minimal 1).");
    return;
  }
  if (num > availableStock) {
    await wa.sendMessage(ctx.phone, `Stok tidak cukup. Tersedia ${availableStock} ekor. Ketik jumlah yang sesuai.`);
    return;
  }

  flow.data.quantity = num;
  flow.step = "ask_on_behalf";
  const ekorTxt = num === 1 ? "1 ekor" : `${num} ekor`;
  await wa.sendMessage(ctx.phone, `Baik, pesanan *${ekorTxt}* ${selected.name}.\n\nAtas nama siapa qurban ini?\n\nKetik nama (misal: *Ahmad bin Abdullah*).\nKetik *batal* untuk membatalkan.`);
}

async function qurbanAskOnBehalf(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService): Promise<void> {
  const name = text.trim();
  if (!name || name.length < 2) {
    await wa.sendMessage(ctx.phone, "Mohon masukkan nama. Contoh: *Ahmad bin Abdullah*");
    return;
  }
  flow.data.onBehalfOf = name;
  flow.step = "confirm";

  const selected = flow.data.selectedPackage;
  const quantity = flow.data.quantity;
  const typeLabel = selected.animalType === "cow" ? "Sapi" : "Kambing";
  const modeLabel = selected.packageType === "shared" ? `Patungan ${selected.maxSlots} orang` : "Individu";

  // Load admin fee settings
  const feeSettings = await db.select().from(settings).where(
    or(
      eq(settings.key, "amil_qurban_sapi_fee"),
      eq(settings.key, "amil_qurban_perekor_fee")
    )
  );
  const getFee = (key: string) => Number(feeSettings.find((s) => s.key === key)?.value) || 0;
  const baseFee = selected.animalType === "cow" ? getFee("amil_qurban_sapi_fee") : getFee("amil_qurban_perekor_fee");
  const adminFeePerUnit = selected.packageType === "shared" && selected.maxSlots
    ? Math.ceil(baseFee / selected.maxSlots)
    : baseFee;
  flow.data.adminFeePerUnit = adminFeePerUnit;

  const subtotal = selected.price * quantity;
  const totalAdminFee = adminFeePerUnit * quantity;
  const total = subtotal + totalAdminFee;
  flow.data.totalAmount = total;

  const detailLines: string[] = [
    `Paket: ${selected.name}`,
    `Jenis: ${typeLabel} - ${modeLabel}`,
    `Atas Nama: ${name}`,
    quantity > 1 ? `Jumlah: ${quantity} ekor × Rp ${fmt(selected.price)}` : `Harga: Rp ${fmt(selected.price)}`,
    `Periode: ${flow.data.periodName}`,
  ];

  if (totalAdminFee > 0) {
    detailLines.push(`Biaya Admin: Rp ${fmt(totalAdminFee)}`);
  }

  const msg = [
    "*Konfirmasi Qurban*",
    "",
    ...detailLines,
    "",
    `*Total: Rp ${fmt(total)}*`,
    "",
    `Sebelum Anda ketik *Ya*, silakan melafalkan niat qurban untuk ${name}. Semoga Allah meridhoi apa yang kita lakukan. Amin 🤲`,
    "",
    "Ketik *Ya* untuk memproses pembayaran atau *Batal* untuk membatalkan.",
  ].join("\n");

  await wa.sendMessage(ctx.phone, msg);
}

async function qurbanConfirm(db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService, envFrontendUrl?: string): Promise<void> {
  const conf = matchConfirmation(text);

  if (conf === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Proses qurban dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }

  if (conf !== "yes") {
    await wa.sendMessage(ctx.phone, "Ketik *Ya* untuk melanjutkan pembayaran atau *Batal* untuk membatalkan.");
    return;
  }

  const selected = flow.data.selectedPackage;
  const quantity = flow.data.quantity;
  const donorName = ctx.donorName || "Donatur";
  const donorPhone = ctx.phone;

  // Lookup donatur email for transaction
  const donaturRecord = ctx.donaturId
    ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
    : null;

  try {
    const txService = new TransactionService(db);
    const adminFeePerUnit = flow.data.adminFeePerUnit || 0;
    const totalAdminFee = adminFeePerUnit * quantity;

    const tx = await txService.create({
      product_type: "qurban",
      product_id: selected.ppId, // packagePeriodId
      quantity,
      unit_price: selected.price,
      admin_fee: totalAdminFee,
      donor_name: donorName,
      donor_email: donaturRecord?.email || undefined,
      donor_phone: donorPhone,
      donatur_id: ctx.donaturId,
      include_unique_code: true,
      type_specific_data: {
        period_id: flow.data.periodId,
        package_id: selected.pkgId,
        package_period_id: selected.ppId,
        onBehalfOf: flow.data.onBehalfOf,
        animal_type: selected.animalType,
        package_type: selected.packageType,
      },
    });

    const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);
    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    ctx.flowState = undefined; // Flow complete

    const typeLabel = selected.animalType === "cow" ? "Sapi" : "Kambing";
    const msg = [
      "Transaksi qurban berhasil dibuat!",
      "",
      `No. Transaksi: ${tx.transactionNumber}`,
      `Paket: ${tx.productName}`,
      `Jenis: ${typeLabel}`,
      `Atas Nama: ${flow.data.onBehalfOf}`,
      `Periode: ${flow.data.periodName}`,
      quantity > 1 ? `Jumlah: ${quantity} ekor × Rp ${fmt(selected.price)}` : "",
      `Nominal: Rp ${fmt(tx.totalAmount)}`,
      tx.uniqueCode ? `Kode Unik: ${tx.uniqueCode}` : "",
      tx.uniqueCode ? `*Total Transfer: Rp ${fmt(transferAmount)}*` : `*Total Transfer: Rp ${fmt(tx.totalAmount)}*`,
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
      "",
      "Silakan pilih metode pembayaran:",
      "- Ketik *Transfer Bank* untuk info rekening",
      "- Ketik *QRIS* untuk pembayaran via QR Code",
      "",
      "Atau bayar langsung melalui link invoice di atas.",
      "",
      "---",
      "Belum siap bayar lunas? Kami punya fasilitas *Tabungan Qurban* — cicil mulai 3x sampai 24x. Ketik *nabung qurban* untuk info lebih lanjut.",
    ].filter(Boolean).join("\n");

    await wa.sendMessage(ctx.phone, msg);
  } catch (err: any) {
    console.error("[Flow] Create qurban transaction error:", err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, `Gagal membuat transaksi: ${err.message || "Terjadi kesalahan"}. Silakan coba lagi.`);
  }
}

// ---------------------------------------------------------------------------
// Qurban Savings Flow (Tabungan Qurban)
// ---------------------------------------------------------------------------

async function handleQurbanSavingsStep(
  db: Database,
  ctx: FlowContext,
  flow: FlowState,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  switch (flow.step) {
    case "select_period":
      return qurbanSavingsSelectPeriod(db, ctx, flow, text, wa);
    case "select_package":
      return qurbanSavingsSelectPackage(db, ctx, flow, text, wa);
    case "ask_frequency":
      return qurbanSavingsAskFrequency(db, ctx, flow, text, wa);
    case "ask_installment_count":
      return qurbanSavingsAskInstallmentCount(db, ctx, flow, text, wa);
    case "ask_installment_day":
      return qurbanSavingsAskInstallmentDay(db, ctx, flow, text, wa);
    case "confirm":
      return qurbanSavingsConfirm(db, ctx, flow, text, wa, envFrontendUrl);
    default:
      ctx.flowState = undefined;
      await wa.sendMessage(ctx.phone, "Terjadi kesalahan. Silakan mulai ulang.");
  }
}

/** Show active qurban periods for savings */
async function sendQurbanSavingsPeriodMenu(
  db: Database,
  flow: FlowState,
  wa: WhatsAppService,
  phone: string
): Promise<string> {
  const periods = await db
    .select()
    .from(qurbanPeriods)
    .where(eq(qurbanPeriods.status, "active"))
    .orderBy(desc(qurbanPeriods.hijriYear));

  if (periods.length === 0) {
    flow.step = "__done__";
    const msg = "Maaf, saat ini belum ada periode qurban yang tersedia untuk tabungan.";
    await wa.sendMessage(phone, msg);
    return msg;
  }

  if (periods.length === 1) {
    flow.data.periodId = periods[0].id;
    flow.data.periodName = periods[0].name || `Qurban ${periods[0].hijriYear}H`;
    flow.step = "select_package";
    return await sendQurbanSavingsPackageMenu(db, flow, wa, phone);
  }

  flow.data._periods = periods.map((p) => ({ id: p.id, name: p.name || `Qurban ${p.hijriYear}H` }));
  flow.step = "select_period";

  const lines = ["*Tabungan Qurban — Pilih Periode*", ""];
  periods.forEach((p, i) => {
    const label = p.name || `Qurban ${p.hijriYear}H`;
    lines.push(`${i + 1}. ${label}`);
  });
  lines.push("", "Ketik *nomor* untuk memilih periode.");
  lines.push("Ketik *batal* untuk membatalkan.");

  const msg = lines.join("\n");
  await wa.sendMessage(phone, msg);
  return msg;
}

async function qurbanSavingsSelectPeriod(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService
): Promise<void> {
  const periods: { id: string; name: string }[] = flow.data._periods || [];
  const idx = matchNumberFromList(text, periods.length);
  if (idx === null) {
    await wa.sendMessage(ctx.phone, `Ketik angka 1-${periods.length} untuk memilih periode.`);
    return;
  }
  flow.data.periodId = periods[idx].id;
  flow.data.periodName = periods[idx].name;
  delete flow.data._periods;
  flow.step = "select_package";
  await sendQurbanSavingsPackageMenu(db, flow, wa, ctx.phone);
}

/** Show packages for selected period */
async function sendQurbanSavingsPackageMenu(
  db: Database, flow: FlowState, wa: WhatsAppService, phone: string
): Promise<string> {
  const pkgPeriods = await db
    .select({
      ppId: qurbanPackagePeriods.id,
      price: qurbanPackagePeriods.price,
      stock: qurbanPackagePeriods.stock,
      stockSold: qurbanPackagePeriods.stockSold,
      slotsFilled: qurbanPackagePeriods.slotsFilled,
      isAvailable: qurbanPackagePeriods.isAvailable,
      pkgId: qurbanPackages.id,
      name: qurbanPackages.name,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
      maxSlots: qurbanPackages.maxSlots,
      description: qurbanPackages.description,
    })
    .from(qurbanPackagePeriods)
    .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(
      and(
        eq(qurbanPackagePeriods.periodId, flow.data.periodId),
        eq(qurbanPackagePeriods.isAvailable, true),
        eq(qurbanPackages.isAvailable, true)
      )
    );

  if (pkgPeriods.length === 0) {
    flow.step = "__done__";
    const msg = "Maaf, belum ada paket qurban tersedia di periode ini.";
    await wa.sendMessage(phone, msg);
    return msg;
  }

  flow.data._packages = pkgPeriods.map((p) => ({
    ppId: p.ppId, pkgId: p.pkgId, name: p.name, animalType: p.animalType,
    packageType: p.packageType, maxSlots: p.maxSlots, price: p.price,
    stock: p.stock, stockSold: p.stockSold, slotsFilled: p.slotsFilled,
  }));

  const lines = [`*Tabungan Qurban — Pilih Paket*`, `Periode: ${flow.data.periodName}`, ""];
  pkgPeriods.forEach((p, i) => {
    const typeLabel = p.animalType === "cow" ? "Sapi" : "Kambing";
    const sharedLabel = p.packageType === "shared" ? ` (Patungan ${p.maxSlots} orang)` : " (Individu)";
    lines.push(`${i + 1}. ${p.name}`);
    lines.push(`   ${typeLabel}${sharedLabel} — Rp ${fmt(p.price)}`);
  });
  lines.push("", "Ketik *nomor* untuk memilih paket.");
  lines.push("Ketik *batal* untuk membatalkan.");

  const msg = lines.join("\n");
  await wa.sendMessage(phone, msg);
  return msg;
}

async function qurbanSavingsSelectPackage(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService
): Promise<void> {
  const packages: any[] = flow.data._packages || [];
  const idx = matchNumberFromList(text, packages.length);
  if (idx === null) {
    await wa.sendMessage(ctx.phone, `Ketik angka 1-${packages.length} untuk memilih paket.`);
    return;
  }
  const selected = packages[idx];
  flow.data.selectedPackage = selected;
  delete flow.data._packages;

  // Calculate admin fee (same logic as direct qurban)
  let adminFee = 0;
  try {
    const feeKey = selected.animalType === "cow" ? "amil_qurban_sapi_fee" : "amil_qurban_perekor_fee";
    const feeRow = await db.query.settings.findFirst({ where: eq(settings.key, feeKey) });
    if (feeRow?.value) {
      const baseFee = parseInt(feeRow.value, 10) || 0;
      adminFee = selected.packageType === "shared" && selected.maxSlots
        ? Math.round(baseFee / selected.maxSlots)
        : baseFee;
    }
  } catch {}
  flow.data.adminFee = adminFee;
  flow.data.targetAmount = selected.price + adminFee;

  flow.step = "ask_frequency";
  const msg = [
    `*Tabungan Qurban — Jadwal Cicilan*`,
    `Paket: ${selected.name}`,
    `Target: Rp ${fmt(flow.data.targetAmount)}${adminFee > 0 ? ` (termasuk admin Rp ${fmt(adminFee)})` : ""}`,
    "",
    "Anda ingin diingatkan cicilan setiap:",
    "1. *Bulanan*",
    "2. *Mingguan*",
    "",
    "Ketik *1* atau *2*.",
  ].join("\n");
  await wa.sendMessage(ctx.phone, msg);
}

async function qurbanSavingsAskFrequency(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService
): Promise<void> {
  const n = text.trim().toLowerCase();
  let frequency: string;
  if (n === "1" || n.includes("bulan")) {
    frequency = "monthly";
  } else if (n === "2" || n.includes("minggu")) {
    frequency = "weekly";
  } else {
    await wa.sendMessage(ctx.phone, "Ketik *1* untuk Bulanan atau *2* untuk Mingguan.");
    return;
  }
  flow.data.frequency = frequency;
  flow.step = "ask_installment_count";

  const options = frequency === "monthly"
    ? ["1. 3x cicilan", "2. 6x cicilan", "3. 12x cicilan", "4. 24x cicilan"]
    : ["1. 12x cicilan", "2. 24x cicilan", "3. 48x cicilan"];

  const freqLabel = frequency === "monthly" ? "Bulanan" : "Mingguan";
  const msg = [
    `*Tabungan Qurban — Jumlah Cicilan*`,
    `Frekuensi: ${freqLabel}`,
    "",
    "Mau berapa kali cicilan?",
    ...options,
    "",
    "Ketik *nomor* untuk memilih.",
  ].join("\n");
  await wa.sendMessage(ctx.phone, msg);
}

async function qurbanSavingsAskInstallmentCount(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService
): Promise<void> {
  const n = text.trim();
  const monthlyOptions = [3, 6, 12, 24];
  const weeklyOptions = [12, 24, 48];
  const options = flow.data.frequency === "monthly" ? monthlyOptions : weeklyOptions;

  const idx = matchNumberFromList(n, options.length);
  // Also allow direct number input like "6" or "12"
  let count: number | null = null;
  if (idx !== null) {
    count = options[idx];
  } else {
    const direct = parseInt(n, 10);
    if (!isNaN(direct) && options.includes(direct)) {
      count = direct;
    }
  }

  if (count === null) {
    await wa.sendMessage(ctx.phone, `Pilih salah satu: ${options.map((o, i) => `${i + 1}. ${o}x`).join(", ")}`);
    return;
  }

  flow.data.installmentCount = count;
  flow.data.installmentAmount = Math.ceil(flow.data.targetAmount / count);
  flow.step = "ask_installment_day";

  if (flow.data.frequency === "monthly") {
    const msg = [
      `*Tabungan Qurban — Tanggal Pengingat*`,
      `Cicilan: ${count}x @ Rp ${fmt(flow.data.installmentAmount)}/bulan`,
      "",
      "Mau diingatkan setiap tanggal berapa? (1-28)",
      "",
      "Ketik angka tanggal (misal: *1*, *15*, *25*).",
    ].join("\n");
    await wa.sendMessage(ctx.phone, msg);
  } else {
    const msg = [
      `*Tabungan Qurban — Hari Pengingat*`,
      `Cicilan: ${count}x @ Rp ${fmt(flow.data.installmentAmount)}/minggu`,
      "",
      "Mau diingatkan setiap hari apa?",
      "1. Senin",
      "2. Selasa",
      "3. Rabu",
      "4. Kamis",
      "5. Jumat",
      "6. Sabtu",
      "7. Minggu",
      "",
      "Ketik *nomor* hari.",
    ].join("\n");
    await wa.sendMessage(ctx.phone, msg);
  }
}

async function qurbanSavingsAskInstallmentDay(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService
): Promise<void> {
  const n = parseInt(text.trim(), 10);

  if (flow.data.frequency === "monthly") {
    if (isNaN(n) || n < 1 || n > 28) {
      await wa.sendMessage(ctx.phone, "Ketik angka tanggal antara 1-28.");
      return;
    }
    flow.data.installmentDay = n;
  } else {
    // Weekly: 1-7 (Senin-Minggu)
    const dayMap: Record<string, number> = {
      senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6, minggu: 7, ahad: 7,
    };
    const textLower = text.trim().toLowerCase();
    let day: number | null = null;
    if (!isNaN(n) && n >= 1 && n <= 7) {
      day = n;
    } else if (dayMap[textLower]) {
      day = dayMap[textLower];
    }
    if (day === null) {
      await wa.sendMessage(ctx.phone, "Ketik angka 1-7 (1=Senin, 7=Minggu) atau nama hari.");
      return;
    }
    flow.data.installmentDay = day;
  }

  // Show summary and ask confirmation
  flow.step = "confirm";
  const selected = flow.data.selectedPackage;
  const typeLabel = selected.animalType === "cow" ? "Sapi" : "Kambing";
  const sharedLabel = selected.packageType === "shared" ? ` (Patungan ${selected.maxSlots} orang)` : " (Individu)";

  let dayLabel: string;
  if (flow.data.frequency === "monthly") {
    dayLabel = `Tanggal ${flow.data.installmentDay} setiap bulan`;
  } else {
    const dayNames = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    dayLabel = `Setiap hari ${dayNames[flow.data.installmentDay]}`;
  }

  const msg = [
    "*Konfirmasi Tabungan Qurban*",
    "",
    `Periode: ${flow.data.periodName}`,
    `Paket: ${selected.name}`,
    `Jenis: ${typeLabel}${sharedLabel}`,
    `Harga Paket: Rp ${fmt(selected.price)}`,
    flow.data.adminFee > 0 ? `Admin: Rp ${fmt(flow.data.adminFee)}` : "",
    `*Target Tabungan: Rp ${fmt(flow.data.targetAmount)}*`,
    "",
    `Frekuensi: ${flow.data.frequency === "monthly" ? "Bulanan" : "Mingguan"}`,
    `Jumlah Cicilan: ${flow.data.installmentCount}x`,
    `Cicilan per ${flow.data.frequency === "monthly" ? "bulan" : "minggu"}: *Rp ${fmt(flow.data.installmentAmount)}*`,
    `Pengingat: ${dayLabel}`,
    "",
    "Ketik *Ya* untuk membuka tabungan atau *Batal* untuk membatalkan.",
  ].filter(Boolean).join("\n");
  await wa.sendMessage(ctx.phone, msg);
}

async function qurbanSavingsConfirm(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService, envFrontendUrl?: string
): Promise<void> {
  const confirm = matchConfirmation(text);
  if (confirm === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Tabungan qurban dibatalkan. Silakan ketik pesan baru jika membutuhkan bantuan.");
    return;
  }
  if (confirm !== "yes") {
    await wa.sendMessage(ctx.phone, "Ketik *Ya* untuk membuka tabungan atau *Batal* untuk membatalkan.");
    return;
  }

  try {
    // Look up donatur record
    const donorPhone = ctx.phone.replace(/[^0-9]/g, "");
    const donaturRecord = ctx.donaturId
      ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
      : null;
    const donorName = ctx.donorName || donaturRecord?.name || donorPhone;

    // Generate savings number
    const now = new Date();
    const year = now.getFullYear();
    const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();
    const savingsNumber = `SAV-QBN-${year}-${randomStr}`;

    const selected = flow.data.selectedPackage;

    // Create savings record
    const [savings] = await db
      .insert(qurbanSavings)
      .values({
        savingsNumber,
        donorName,
        donorEmail: donaturRecord?.email || undefined,
        donorPhone: ctx.phone,
        userId: donaturRecord?.userId || undefined,
        targetPackagePeriodId: selected.ppId,
        targetPeriodId: flow.data.periodId,
        targetPackageId: selected.pkgId,
        targetAmount: flow.data.targetAmount,
        currentAmount: 0,
        installmentFrequency: flow.data.frequency,
        installmentCount: flow.data.installmentCount,
        installmentAmount: flow.data.installmentAmount,
        installmentDay: flow.data.installmentDay,
        startDate: now,
        status: "active",
      })
      .returning();

    ctx.flowState = undefined; // Flow complete

    const freqLabel = flow.data.frequency === "monthly" ? "bulan" : "minggu";
    const msg = [
      "Tabungan Qurban berhasil dibuka!",
      "",
      `No. Tabungan: *${savingsNumber}*`,
      `Paket: ${selected.name}`,
      `Periode: ${flow.data.periodName}`,
      `Target: Rp ${fmt(flow.data.targetAmount)}`,
      `Cicilan: ${flow.data.installmentCount}x @ Rp ${fmt(flow.data.installmentAmount)}/${freqLabel}`,
      "",
      "Untuk melakukan setoran, ketik *setor tabungan*.",
      "Untuk cek saldo tabungan, ketik *cek tabungan*.",
      "",
      "Kami akan mengingatkan Anda setiap jadwal cicilan. Semoga qurbannya berkah!",
    ].join("\n");
    await wa.sendMessage(ctx.phone, msg);
  } catch (err: any) {
    console.error("[Flow] Create qurban savings error:", err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, `Gagal membuat tabungan: ${err.message || "Terjadi kesalahan"}. Silakan coba lagi.`);
  }
}

// ---------------------------------------------------------------------------
// Qurban Savings Deposit Flow (Setor Tabungan)
// ---------------------------------------------------------------------------

async function handleQurbanSavingsDepositStep(
  db: Database,
  ctx: FlowContext,
  flow: FlowState,
  text: string,
  wa: WhatsAppService,
  envFrontendUrl?: string
): Promise<void> {
  switch (flow.step) {
    case "select_savings":
      return savingsDepositSelectSavings(db, ctx, flow, text, wa);
    case "ask_amount":
      return savingsDepositAskAmount(db, ctx, flow, text, wa, envFrontendUrl);
    default:
      ctx.flowState = undefined;
      await wa.sendMessage(ctx.phone, "Terjadi kesalahan. Silakan mulai ulang.");
  }
}

/** First message: look up active savings and show info */
async function sendSavingsDepositInfo(
  db: Database, ctx: FlowContext, flow: FlowState, wa: WhatsAppService
): Promise<string> {
  const ph = ctx.phone.replace(/[^0-9]/g, "");

  // Look up donatur for precise filtering
  const donaturRecord = ctx.donaturId
    ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
    : null;

  // Broad fetch by phone first
  let savingsList = await db
    .select({
      id: qurbanSavings.id,
      savingsNumber: qurbanSavings.savingsNumber,
      targetAmount: qurbanSavings.targetAmount,
      currentAmount: qurbanSavings.currentAmount,
      installmentFrequency: qurbanSavings.installmentFrequency,
      installmentCount: qurbanSavings.installmentCount,
      installmentAmount: qurbanSavings.installmentAmount,
      targetPackagePeriodId: qurbanSavings.targetPackagePeriodId,
      donorName: qurbanSavings.donorName,
      donorPhone: qurbanSavings.donorPhone,
      donorEmail: qurbanSavings.donorEmail,
      pkgName: qurbanPackages.name,
    })
    .from(qurbanSavings)
    .leftJoin(qurbanPackagePeriods, eq(qurbanSavings.targetPackagePeriodId, qurbanPackagePeriods.id))
    .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .where(and(
      ilike(qurbanSavings.donorPhone, `%${ph.slice(-10)}%`),
      eq(qurbanSavings.status, "active")
    ));

  // Narrow down: if donatur has email, prefer savings matching that email
  if (savingsList.length > 1 && donaturRecord?.email) {
    const byEmail = savingsList.filter((s) => s.donorEmail === donaturRecord.email);
    if (byEmail.length > 0) savingsList = byEmail;
  }
  // Also try narrowing by exact name match
  if (savingsList.length > 1 && donaturRecord?.name) {
    const byName = savingsList.filter((s) => s.donorName === donaturRecord.name);
    if (byName.length > 0) savingsList = byName;
  }

  if (savingsList.length === 0) {
    ctx.flowState = undefined;
    const msg = "Anda belum memiliki tabungan qurban aktif. Ketik *nabung qurban* untuk membuka tabungan baru.";
    await wa.sendMessage(ctx.phone, msg);
    return msg;
  }

  if (savingsList.length === 1) {
    // Auto-select the only active savings
    const s = savingsList[0];
    flow.data.savings = s;
    flow.step = "ask_amount";

    const pct = s.targetAmount > 0 ? Math.round((s.currentAmount / s.targetAmount) * 100) : 0;
    const remaining = Math.max(0, s.targetAmount - s.currentAmount);
    const freqLabel = s.installmentFrequency === "monthly" ? "bulan" : "minggu";
    const paidCount = s.installmentAmount > 0 ? Math.floor(s.currentAmount / s.installmentAmount) : 0;

    const msg = [
      "*Setor Tabungan Qurban*",
      "",
      `No. Tabungan: ${s.savingsNumber}`,
      `Paket: ${s.pkgName || "-"}`,
      `Target: Rp ${fmt(s.targetAmount)}`,
      `Terkumpul: Rp ${fmt(s.currentAmount)} (${pct}%)`,
      `Sisa: Rp ${fmt(remaining)}`,
      `Cicilan: ${s.installmentCount}x @ Rp ${fmt(s.installmentAmount)}/${freqLabel}`,
      `Sudah setor: ${paidCount}x dari ${s.installmentCount}x`,
      "",
      `Nominal setoran: *Rp ${fmt(s.installmentAmount)}*`,
      "",
      "Ketik *Ya* untuk setor dengan nominal di atas.",
      "Atau ketik nominal lain (misal: *700rb*, *1jt*).",
      "Ketik *batal* untuk membatalkan.",
    ].join("\n");
    await wa.sendMessage(ctx.phone, msg);
    return msg;
  }

  // Multiple active savings — ask which one
  flow.data._savingsList = savingsList;
  flow.step = "select_savings";

  const lines = ["*Setor Tabungan Qurban*", "", "Anda memiliki beberapa tabungan aktif:", ""];
  savingsList.forEach((s, i) => {
    const pct = s.targetAmount > 0 ? Math.round((s.currentAmount / s.targetAmount) * 100) : 0;
    lines.push(`${i + 1}. ${s.savingsNumber} — ${s.pkgName || "-"}`);
    lines.push(`   Progress: Rp ${fmt(s.currentAmount)} / Rp ${fmt(s.targetAmount)} (${pct}%)`);
  });
  lines.push("", "Ketik *nomor* untuk memilih tabungan.");

  const msg = lines.join("\n");
  await wa.sendMessage(ctx.phone, msg);
  return msg;
}

async function savingsDepositSelectSavings(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService
): Promise<void> {
  const list: any[] = flow.data._savingsList || [];
  const idx = matchNumberFromList(text, list.length);
  if (idx === null) {
    await wa.sendMessage(ctx.phone, `Ketik angka 1-${list.length} untuk memilih tabungan.`);
    return;
  }

  const s = list[idx];
  flow.data.savings = s;
  delete flow.data._savingsList;
  flow.step = "ask_amount";

  const pct = s.targetAmount > 0 ? Math.round((s.currentAmount / s.targetAmount) * 100) : 0;
  const remaining = Math.max(0, s.targetAmount - s.currentAmount);
  const freqLabel = s.installmentFrequency === "monthly" ? "bulan" : "minggu";
  const paidCount = s.installmentAmount > 0 ? Math.floor(s.currentAmount / s.installmentAmount) : 0;

  const msg = [
    "*Setor Tabungan Qurban*",
    "",
    `No. Tabungan: ${s.savingsNumber}`,
    `Paket: ${s.pkgName || "-"}`,
    `Target: Rp ${fmt(s.targetAmount)}`,
    `Terkumpul: Rp ${fmt(s.currentAmount)} (${pct}%)`,
    `Sisa: Rp ${fmt(remaining)}`,
    `Cicilan: ${s.installmentCount}x @ Rp ${fmt(s.installmentAmount)}/${freqLabel}`,
    `Sudah setor: ${paidCount}x dari ${s.installmentCount}x`,
    "",
    `Nominal setoran: *Rp ${fmt(s.installmentAmount)}*`,
    "",
    "Ketik *Ya* untuk setor dengan nominal di atas.",
    "Atau ketik nominal lain (misal: *700rb*, *1jt*).",
    "Ketik *batal* untuk membatalkan.",
  ].join("\n");
  await wa.sendMessage(ctx.phone, msg);
}

async function savingsDepositAskAmount(
  db: Database, ctx: FlowContext, flow: FlowState, text: string, wa: WhatsAppService, envFrontendUrl?: string
): Promise<void> {
  const s = flow.data.savings;
  let amount: number;

  const confirm = matchConfirmation(text);
  if (confirm === "yes") {
    // Use default installment amount
    amount = s.installmentAmount;
  } else if (confirm === "no") {
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, "Setoran dibatalkan.");
    return;
  } else {
    // Try parse as amount
    const parsed = parseIndonesianAmount(text);
    if (parsed === null) {
      await wa.sendMessage(ctx.phone, "Ketik *Ya* untuk setor Rp " + fmt(s.installmentAmount) + ", atau ketik nominal lain (misal: *700rb*).");
      return;
    }
    if (parsed < 10000) {
      await wa.sendMessage(ctx.phone, "Minimal setoran Rp 10.000. Silakan ketik nominal yang valid.");
      return;
    }
    amount = parsed;
  }

  try {
    // Look up donatur for donatur_id
    const donaturRecord = ctx.donaturId
      ? await db.query.donatur.findFirst({ where: eq(donatur.id, ctx.donaturId) })
      : null;

    const txService = new TransactionService(db);
    const tx = await txService.create({
      product_type: "qurban",
      product_id: s.targetPackagePeriodId || s.id,
      quantity: 1,
      unit_price: amount,
      donor_name: s.donorName,
      donor_email: s.donorEmail || donaturRecord?.email || undefined,
      donor_phone: s.donorPhone,
      donatur_id: ctx.donaturId,
      include_unique_code: false,
      type_specific_data: {
        payment_type: "savings",
        savings_id: s.id,
        savings_number: s.savingsNumber,
        target_package_period_id: s.targetPackagePeriodId,
        category: "qurban_savings",
      },
    });

    ctx.flowState = undefined;

    const remaining = Math.max(0, s.targetAmount - s.currentAmount - amount);
    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    const msg = [
      "Setoran tabungan berhasil dibuat!",
      "",
      `No. Transaksi: ${tx.transactionNumber}`,
      `Tabungan: ${s.savingsNumber}`,
      `Nominal Setoran: *Rp ${fmt(amount)}*`,
      `Sisa target: Rp ${fmt(remaining)}`,
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
      "",
      "Silakan pilih metode pembayaran:",
      "- Ketik *Transfer Bank* untuk info rekening",
      "- Ketik *QRIS* untuk pembayaran via QR Code",
      "",
      "Atau bayar langsung melalui link invoice di atas.",
    ].filter(Boolean).join("\n");
    await wa.sendMessage(ctx.phone, msg);
  } catch (err: any) {
    console.error("[Flow] Create savings deposit error:", err);
    ctx.flowState = undefined;
    await wa.sendMessage(ctx.phone, `Gagal membuat setoran: ${err.message || "Terjadi kesalahan"}. Silakan coba lagi.`);
  }
}
