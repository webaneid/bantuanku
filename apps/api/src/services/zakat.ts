import { eq } from "drizzle-orm";
import { zakatCalculatorConfigs, zakatCalculationLogs, settings, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

interface ZakatResult {
  type: string;
  nisabValue: number;
  isAboveNisab: boolean;
  zakatAmount: number;
  inputData: Record<string, unknown>;
}

export async function getGoldPrice(db: Database): Promise<number> {
  const setting = await db.query.settings.findFirst({
    where: eq(settings.key, "zakat_gold_price"),
  });
  return setting ? parseInt(setting.value) : 1140000;
}

export async function calculateZakatIncome(
  db: Database,
  params: { monthlyIncome: number; otherIncome?: number; monthlyExpenses?: number }
): Promise<ZakatResult> {
  const goldPrice = await getGoldPrice(db);
  const config = await db.query.zakatCalculatorConfigs.findFirst({
    where: eq(zakatCalculatorConfigs.type, "income"),
  });

  const nisabGram = config?.nisabGoldGram ? parseFloat(config.nisabGoldGram) : 85;
  const rateBps = config?.rateBps || 250;
  const nisabValue = nisabGram * goldPrice;

  const yearlyIncome = (params.monthlyIncome + (params.otherIncome || 0)) * 12;
  const yearlyExpenses = (params.monthlyExpenses || 0) * 12;
  const netIncome = yearlyIncome - yearlyExpenses;

  const isAboveNisab = netIncome >= nisabValue;
  const zakatAmount = isAboveNisab ? Math.floor((netIncome * rateBps) / 10000) : 0;

  return {
    type: "income",
    nisabValue,
    isAboveNisab,
    zakatAmount,
    inputData: params,
  };
}

export async function calculateZakatMaal(
  db: Database,
  params: { savings: number; deposits?: number; stocks?: number; otherAssets?: number; debts?: number }
): Promise<ZakatResult> {
  const goldPrice = await getGoldPrice(db);
  const config = await db.query.zakatCalculatorConfigs.findFirst({
    where: eq(zakatCalculatorConfigs.type, "maal"),
  });

  const nisabGram = config?.nisabGoldGram ? parseFloat(config.nisabGoldGram) : 85;
  const rateBps = config?.rateBps || 250;
  const nisabValue = nisabGram * goldPrice;

  const totalAssets = params.savings + (params.deposits || 0) + (params.stocks || 0) + (params.otherAssets || 0);
  const netAssets = totalAssets - (params.debts || 0);

  const isAboveNisab = netAssets >= nisabValue;
  const zakatAmount = isAboveNisab ? Math.floor((netAssets * rateBps) / 10000) : 0;

  return {
    type: "maal",
    nisabValue,
    isAboveNisab,
    zakatAmount,
    inputData: params,
  };
}

export async function calculateZakatGold(
  db: Database,
  params: { goldWeight: number; goldPrice?: number }
): Promise<ZakatResult> {
  const currentGoldPrice = params.goldPrice || (await getGoldPrice(db));
  const config = await db.query.zakatCalculatorConfigs.findFirst({
    where: eq(zakatCalculatorConfigs.type, "gold"),
  });

  const nisabGram = config?.nisabGoldGram ? parseFloat(config.nisabGoldGram) : 85;
  const rateBps = config?.rateBps || 250;
  const nisabValue = nisabGram * currentGoldPrice;

  const goldValue = params.goldWeight * currentGoldPrice;
  const isAboveNisab = params.goldWeight >= nisabGram;
  const zakatAmount = isAboveNisab ? Math.floor((goldValue * rateBps) / 10000) : 0;

  return {
    type: "gold",
    nisabValue,
    isAboveNisab,
    zakatAmount,
    inputData: { ...params, goldPrice: currentGoldPrice },
  };
}

export async function calculateZakatTrade(
  db: Database,
  params: { inventory: number; receivables?: number; cash?: number; payables?: number }
): Promise<ZakatResult> {
  const goldPrice = await getGoldPrice(db);
  const config = await db.query.zakatCalculatorConfigs.findFirst({
    where: eq(zakatCalculatorConfigs.type, "trade"),
  });

  const nisabGram = config?.nisabGoldGram ? parseFloat(config.nisabGoldGram) : 85;
  const rateBps = config?.rateBps || 250;
  const nisabValue = nisabGram * goldPrice;

  const totalAssets = params.inventory + (params.receivables || 0) + (params.cash || 0);
  const netAssets = totalAssets - (params.payables || 0);

  const isAboveNisab = netAssets >= nisabValue;
  const zakatAmount = isAboveNisab ? Math.floor((netAssets * rateBps) / 10000) : 0;

  return {
    type: "trade",
    nisabValue,
    isAboveNisab,
    zakatAmount,
    inputData: params,
  };
}

export async function calculateZakatFitrah(
  db: Database,
  params: { numberOfPeople: number; pricePerPerson?: number }
): Promise<ZakatResult> {
  let pricePerPerson = params.pricePerPerson;

  if (!pricePerPerson) {
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "zakat_fitrah_amount"),
    });
    pricePerPerson = setting ? parseInt(setting.value) : 45000;
  }

  const zakatAmount = params.numberOfPeople * pricePerPerson;

  return {
    type: "fitrah",
    nisabValue: 0,
    isAboveNisab: true,
    zakatAmount,
    inputData: { ...params, pricePerPerson },
  };
}

export async function calculateFidyah(
  db: Database,
  params: { numberOfDays: number; pricePerDay?: number }
): Promise<ZakatResult> {
  let pricePerDay = params.pricePerDay;

  if (!pricePerDay) {
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, "fidyah_amount_per_day"),
    });
    pricePerDay = setting ? parseInt(setting.value) : 45000;
  }

  const zakatAmount = params.numberOfDays * pricePerDay;

  return {
    type: "fidyah",
    nisabValue: 0,
    isAboveNisab: true,
    zakatAmount,
    inputData: { ...params, pricePerDay },
  };
}

export async function saveCalculationLog(
  db: Database,
  result: ZakatResult,
  userId?: string
) {
  await db.insert(zakatCalculationLogs).values({
    id: createId(),
    userId,
    calculatorType: result.type,
    inputData: result.inputData,
    nisabValue: result.nisabValue,
    resultAmount: result.zakatAmount,
  });
}
