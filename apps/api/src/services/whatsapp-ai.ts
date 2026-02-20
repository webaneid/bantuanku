import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { campaigns, zakatTypes, zakatPeriods, transactions, transactionPayments, settings, donatur, qurbanSavings, qurbanPackages, qurbanPackagePeriods, qurbanPeriods, createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";
import { WhatsAppService } from "./whatsapp";
import { TransactionService } from "./transaction";
import { handleFlowStep, generateFirstFlowMessage, createZakatFlowState, createDonationFlowState, createFidyahFlowState, createQurbanFlowState, createQurbanSavingsFlowState, createQurbanSavingsDepositFlowState, type FlowState, type FlowContext } from "./whatsapp-flow";

// ---------------------------------------------------------------------------
// Gold Price Scraper (Pluang) with 1-hour cache
// ---------------------------------------------------------------------------
let _goldPriceCache: { price: number; fetchedAt: number } | null = null;
const GOLD_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchGoldPriceFromPluang(): Promise<number | null> {
  // Return cache if still fresh
  if (_goldPriceCache && Date.now() - _goldPriceCache.fetchedAt < GOLD_CACHE_TTL) {
    return _goldPriceCache.price;
  }

  try {
    const res = await fetch("https://pluang.com/asset/gold", {
      headers: { "User-Agent": "Bantuanku-ZakatBot/1.0" },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    if (!res.ok) return null;

    const html = await res.text();
    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match?.[1]) return null;

    const nextData = JSON.parse(match[1]);
    const priceText = nextData?.props?.pageProps?.goldAssetPerformance?.currentMidPrice;
    if (!priceText) return null;

    // "Rp2.735.207" → 2735207
    const numericPrice = Number(priceText.replace(/[^0-9]/g, ""));
    if (!numericPrice || numericPrice < 100000) return null; // sanity check

    _goldPriceCache = { price: numericPrice, fetchedAt: Date.now() };
    console.log(`[Zakat] Gold price from Pluang: Rp ${numericPrice.toLocaleString("id-ID")}/gram`);
    return numericPrice;
  } catch (err) {
    console.warn("[Zakat] Pluang scrape failed, will use DB setting:", (err as Error).message);
    return null;
  }
}

export async function getGoldPrice(db: Database): Promise<number> {
  // 1. Try live Pluang price
  const livePrice = await fetchGoldPriceFromPluang();
  if (livePrice) return livePrice;

  // 2. Fallback to DB setting
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "zakat_gold_price"),
  });
  return Number(row?.value) || 1_000_000;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function getFrontendUrl(db: Database, envFrontendUrl?: string): Promise<string> {
  if (envFrontendUrl) return envFrontendUrl.replace(/\/+$/, "");
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "organization_website"),
  });
  return (row?.value || "").replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationContext {
  phone: string;
  profileName: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  donaturId?: string;
  donorName?: string;
  flowState?: FlowState;
  lastActivity: number;
}

interface IncomingMessage {
  from: string;
  text: string;
  messageId: string;
  profileName: string;
  imageUrl?: string;
  imageMimeType?: string;
}

interface ToolContext {
  imageUrl?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  phone?: string;
}

interface ExecutionState {
  flowTrigger?: FlowState;
}

// ---------------------------------------------------------------------------
// Conversation context in-memory (Map) with TTL 30 minutes
// ---------------------------------------------------------------------------

const conversations = new Map<string, ConversationContext>();
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 minutes

function getConversation(phone: string, profileName: string): ConversationContext {
  // Cleanup expired conversations
  const now = Date.now();
  for (const [key, ctx] of conversations) {
    if (now - ctx.lastActivity > CONVERSATION_TTL) {
      conversations.delete(key);
    }
  }

  let ctx = conversations.get(phone);
  if (!ctx) {
    ctx = {
      phone,
      profileName,
      history: [],
      lastActivity: now,
    };
    conversations.set(phone, ctx);
  } else {
    ctx.lastActivity = now;
    ctx.profileName = profileName || ctx.profileName;
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Tool functions
// ---------------------------------------------------------------------------

async function searchCampaigns(
  db: Database,
  params: { query?: string; category?: string }
): Promise<string> {
  const results = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      slug: campaigns.slug,
      goal: campaigns.goal,
      collected: campaigns.collected,
      donorCount: campaigns.donorCount,
      pillar: campaigns.pillar,
      status: campaigns.status,
    })
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, "active"),
        params.query ? ilike(campaigns.title, `%${params.query}%`) : undefined
      )
    )
    .orderBy(desc(campaigns.donorCount))
    .limit(20);

  if (results.length === 0) {
    return "Tidak ditemukan program yang sesuai dengan pencarian.";
  }

  return results
    .map((c, i) => {
      const pct = c.goal
        ? Math.round(((c.collected || 0) / c.goal) * 100)
        : 0;
      return `${i + 1}. *${c.title}*\n   Target: Rp ${(c.goal || 0).toLocaleString("id-ID")}\n   Terkumpul: Rp ${(c.collected || 0).toLocaleString("id-ID")} (${pct}%)\n   ID: ${c.id}`;
    })
    .join("\n\n");
}

async function getProgramOverview(db: Database): Promise<string> {
  const lines: string[] = [];

  // 1. Campaign donasi (non-fidyah, non-wakaf)
  const donasi = await db
    .select({ id: campaigns.id, title: campaigns.title, pillar: campaigns.pillar })
    .from(campaigns)
    .where(eq(campaigns.status, "active"))
    .orderBy(desc(campaigns.donorCount))
    .limit(50);

  const donasiRegular = donasi.filter((c) => c.pillar !== "fidyah" && c.pillar !== "wakaf");
  const fidyahList = donasi.filter((c) => c.pillar === "fidyah");
  const wakafList = donasi.filter((c) => c.pillar === "wakaf");

  // 2. Zakat types
  const zakatList = await db
    .select({ id: zakatTypes.id, name: zakatTypes.name, calculatorType: zakatTypes.calculatorType })
    .from(zakatTypes)
    .where(eq(zakatTypes.isActive, true));

  // 3. Qurban packages (active periods)
  const qurbanList = await db
    .select({
      ppId: qurbanPackagePeriods.id,
      price: qurbanPackagePeriods.price,
      pkgName: qurbanPackages.name,
      animalType: qurbanPackages.animalType,
      packageType: qurbanPackages.packageType,
    })
    .from(qurbanPackagePeriods)
    .innerJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
    .innerJoin(qurbanPeriods, eq(qurbanPackagePeriods.periodId, qurbanPeriods.id))
    .where(
      and(
        eq(qurbanPeriods.status, "active"),
        eq(qurbanPackagePeriods.isAvailable, true),
        eq(qurbanPackages.isAvailable, true)
      )
    );

  // Build summary
  lines.push("RINGKASAN PROGRAM YANG TERSEDIA:");
  lines.push("");

  // Donasi
  if (donasiRegular.length > 0) {
    lines.push(`DONASI (${donasiRegular.length} program aktif):`);
    donasiRegular.slice(0, 5).forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c.title}`);
    });
    if (donasiRegular.length > 5) lines.push(`  ... dan ${donasiRegular.length - 5} program lainnya`);
    lines.push("");
  }

  // Zakat
  if (zakatList.length > 0) {
    lines.push(`ZAKAT (${zakatList.length} jenis):`);
    zakatList.forEach((z, i) => {
      lines.push(`  ${i + 1}. ${z.name}`);
    });
    lines.push("");
  }

  // Qurban
  if (qurbanList.length > 0) {
    lines.push(`QURBAN (${qurbanList.length} paket tersedia):`);
    qurbanList.slice(0, 5).forEach((q, i) => {
      const type = q.animalType === "cow" ? "Sapi" : "Kambing";
      const shared = q.packageType === "shared" ? " (Patungan)" : "";
      lines.push(`  ${i + 1}. ${q.pkgName} — ${type}${shared} Rp ${q.price.toLocaleString("id-ID")}`);
    });
    if (qurbanList.length > 5) lines.push(`  ... dan ${qurbanList.length - 5} paket lainnya`);
    lines.push("  Bisa bayar langsung atau cicil (Tabungan Qurban).");
    lines.push("");
  }

  // Fidyah
  if (fidyahList.length > 0) {
    lines.push(`FIDYAH (${fidyahList.length} program):`);
    fidyahList.forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c.title}`);
    });
    lines.push("");
  }

  // Wakaf
  if (wakafList.length > 0) {
    lines.push(`WAKAF (${wakafList.length} program):`);
    wakafList.forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c.title}`);
    });
    lines.push("");
  }

  if (lines.length <= 2) {
    return "Belum ada program yang tersedia saat ini.";
  }

  lines.push("Donatur bisa bertanya lebih detail tentang kategori mana yang diminati.");
  return lines.join("\n");
}

async function getCampaignDetail(
  db: Database,
  params: { campaignId: string }
): Promise<string> {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, params.campaignId),
  });

  if (!campaign) {
    return "Program tidak ditemukan.";
  }

  const pct = campaign.goal
    ? Math.round(((campaign.collected || 0) / campaign.goal) * 100)
    : 0;

  return [
    `*${campaign.title}*`,
    `Pilar: ${campaign.pillar || "-"}`,
    `Target: Rp ${(campaign.goal || 0).toLocaleString("id-ID")}`,
    `Terkumpul: Rp ${(campaign.collected || 0).toLocaleString("id-ID")} (${pct}%)`,
    `Donatur: ${campaign.donorCount || 0} orang`,
    `Status: ${campaign.status}`,
    `ID: ${campaign.id}`,
  ].join("\n");
}

async function checkTransactionStatus(
  db: Database,
  params: { phone?: string; transactionNumber?: string }
): Promise<string> {
  let txs;

  if (params.transactionNumber) {
    // Search by transaction number (exact or partial match, auto-fix missing "T" prefix)
    let txNum = params.transactionNumber.trim().toUpperCase();
    if (txNum.startsWith("RX-")) txNum = "T" + txNum; // fix common typo: RX- → TRX-

    txs = await db
      .select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        productType: transactions.productType,
        productName: transactions.productName,
        totalAmount: transactions.totalAmount,
        uniqueCode: transactions.uniqueCode,
        paymentStatus: transactions.paymentStatus,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(ilike(transactions.transactionNumber, `%${txNum}%`))
      .orderBy(desc(transactions.createdAt))
      .limit(5);
  } else if (params.phone) {
    const phone = params.phone.replace(/[^0-9]/g, "");
    txs = await db
      .select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        productType: transactions.productType,
        productName: transactions.productName,
        totalAmount: transactions.totalAmount,
        uniqueCode: transactions.uniqueCode,
        paymentStatus: transactions.paymentStatus,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(ilike(transactions.donorPhone, `%${phone.slice(-10)}%`))
      .orderBy(desc(transactions.createdAt))
      .limit(5);
  } else {
    return "Parameter phone atau transactionNumber diperlukan.";
  }

  if (!txs || txs.length === 0) {
    return "TIDAK ADA transaksi ditemukan untuk nomor ini. JANGAN langsung bilang 'transaksi tidak ditemukan' ke donatur. Sebagai gantinya, sampaikan dengan SOPAN bahwa kamu belum menemukan transaksi yang cocok, lalu minta donatur: (1) kirimkan bukti transfer berupa foto/screenshot, atau (2) sebutkan nomor transaksi (TRX-...) jika ada. Contoh: 'Mohon maaf, kami belum menemukan transaksi atas nama Bapak/Ibu. Bisa tolong kirimkan bukti transfer berupa foto/screenshot? Atau jika ada nomor transaksi (TRX-...), mohon disebutkan.'";
  }

  const statusMap: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    processing: "Sedang Diverifikasi",
    partial: "Pembayaran Sebagian",
    paid: "Lunas",
    failed: "Gagal",
    expired: "Kedaluwarsa",
  };

  return txs
    .map((tx, i) => {
      const typeLabel =
        tx.productType === "campaign"
          ? "Donasi Campaign"
          : tx.productType === "zakat"
          ? "Zakat"
          : "Qurban";
      const status = statusMap[tx.paymentStatus] || tx.paymentStatus;
      const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);
      return `${i + 1}. ${tx.transactionNumber} — ${typeLabel}\n   ID Transaksi: ${tx.id}\n   Program: ${tx.productName}\n   Total Transfer: Rp ${transferAmount.toLocaleString("id-ID")} — ${status}`;
    })
    .join("\n\n");
}

const calcTypeLabelMap: Record<string, string> = {
  fitrah: "Zakat Fitrah",
  maal: "Zakat Maal",
  penghasilan: "Zakat Penghasilan",
  profesi: "Zakat Profesi",
  pertanian: "Zakat Pertanian",
  peternakan: "Zakat Peternakan",
  bisnis: "Zakat Bisnis",
  perdagangan: "Zakat Perdagangan",
  "zakat-fitrah": "Zakat Fitrah",
  "zakat-maal": "Zakat Maal",
  "zakat-penghasilan": "Zakat Penghasilan",
  "zakat-profesi": "Zakat Profesi",
  "zakat-pertanian": "Zakat Pertanian",
  "zakat-peternakan": "Zakat Peternakan",
  "zakat-bisnis": "Zakat Bisnis",
};
export const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
export const truncateText = (text: string, max: number) => text.length > max ? text.slice(0, max).trimEnd() + "..." : text;

// Tool 1: Menu jenis zakat (tanpa parameter) — dipanggil jika user bilang "zakat" saja
async function getZakatMenu(db: Database): Promise<string> {
  const types = await db
    .select({
      id: zakatTypes.id,
      name: zakatTypes.name,
      calculatorType: zakatTypes.calculatorType,
      slug: zakatTypes.slug,
    })
    .from(zakatTypes)
    .where(eq(zakatTypes.isActive, true));

  if (types.length === 0) {
    return "Belum ada jenis zakat yang tersedia.";
  }

  const calcTypeMap = new Map<string, { calculatorType: string; label: string; programCount: number }>();
  for (const t of types) {
    const raw = t.calculatorType || t.slug;
    const ct = raw.startsWith("zakat-") ? raw.replace("zakat-", "") : raw;
    if (!calcTypeMap.has(ct)) {
      calcTypeMap.set(ct, {
        calculatorType: ct,
        label: calcTypeLabelMap[ct] || calcTypeLabelMap[raw] || `Zakat ${ct.charAt(0).toUpperCase() + ct.slice(1)}`,
        programCount: 1,
      });
    } else {
      calcTypeMap.get(ct)!.programCount++;
    }
  }

  // Format clean text like searchCampaigns — AI will formulate natural response
  return Array.from(calcTypeMap.values())
    .map((ct, i) => `${i + 1}. ${ct.label}${ct.programCount > 1 ? ` (${ct.programCount} program)` : ""}`)
    .join("\n");
}

// Tool 2: Daftar program zakat untuk jenis tertentu — dipanggil jika user sudah sebut jenis (fitrah, maal, dll)
async function getZakatPrograms(
  db: Database,
  params: { calculatorType: string }
): Promise<string> {
  const ct = params.calculatorType;
  if (!ct) {
    return "Parameter calculatorType wajib diisi. Contoh: fitrah, maal, penghasilan.";
  }

  // Try matching by calculatorType column first, then fallback to slug pattern
  // DB stores "zakat-fitrah" in calculator_type, but AI sends "fitrah"
  // Support both: "fitrah" and "zakat-fitrah"
  const withPrefix = ct.startsWith("zakat-") ? ct : `zakat-${ct}`;
  const withoutPrefix = ct.startsWith("zakat-") ? ct.replace("zakat-", "") : ct;

  const types = await db
    .select({
      id: zakatTypes.id,
      name: zakatTypes.name,
      description: zakatTypes.description,
      calculatorType: zakatTypes.calculatorType,
      slug: zakatTypes.slug,
    })
    .from(zakatTypes)
    .where(
      and(
        eq(zakatTypes.isActive, true),
        or(
          eq(zakatTypes.calculatorType, withoutPrefix),
          eq(zakatTypes.calculatorType, withPrefix),
          eq(zakatTypes.slug, withoutPrefix),
          eq(zakatTypes.slug, withPrefix)
        )
      )
    );

  if (types.length === 0) {
    return `Tidak ada program ${calcTypeLabelMap[ct] || ct} yang tersedia saat ini.`;
  }

  // If only 1 program → auto-select, tell AI to proceed directly
  if (types.length === 1) {
    const z = types[0];
    const label = calcTypeLabelMap[ct] || calcTypeLabelMap[withoutPrefix] || ct;
    const desc = z.description ? truncateText(stripHtml(z.description), 80) : "";
    return [
      `PROGRAM OTOMATIS DIPILIH (hanya 1 program ${label}):`,
      `Nama: ${z.name}`,
      desc ? `Deskripsi: ${desc}` : "",
      `zakatTypeId: ${z.id}`,
      `calculatorType: ${withoutPrefix}`,
      ``,
      `INSTRUKSI: Program sudah terpilih otomatis. JANGAN tampilkan daftar ke donatur. LANGSUNG lanjut ke langkah berikutnya:`,
      withoutPrefix === "fitrah"
        ? `→ Tanya donatur: "Zakat fitrah ini untuk berapa jiwa/orang?"`
        : withoutPrefix === "maal"
        ? `→ Tanya donatur: "Berapa total harta Anda? Dan apakah ada hutang yang perlu dikurangkan?"`
        : withoutPrefix === "penghasilan" || withoutPrefix === "profesi"
        ? `→ Tanya donatur: "Berapa penghasilan bulanan Anda?"`
        : withoutPrefix === "pertanian"
        ? `→ Tanya donatur: "Berapa nilai hasil panen Anda? Dan apakah menggunakan irigasi?"`
        : withoutPrefix === "peternakan"
        ? `→ Tanya donatur: "Berapa total nilai ternak Anda?"`
        : withoutPrefix === "bisnis"
        ? `→ Tanya donatur: "Berapa modal usaha, keuntungan, piutang, dan hutang usaha Anda?"`
        : `→ Tanyakan data yang diperlukan untuk kalkulator ${label}.`,
    ].filter(Boolean).join("\n");
  }

  // Multiple programs — show list for user to choose
  return types
    .map((z, i) => {
      const desc = z.description ? truncateText(stripHtml(z.description), 80) : "";
      return `${i + 1}. *${z.name}*${desc ? `\n   ${desc}` : ""}\n   ID: ${z.id}`;
    })
    .join("\n\n");
}

async function createDonation(
  db: Database,
  params: { campaignId: string; amount: number; donorName: string; donorPhone: string },
  envFrontendUrl?: string
): Promise<string> {
  if (!params.campaignId || !params.amount || !params.donorName || !params.donorPhone) {
    return "Parameter tidak lengkap. Dibutuhkan: campaignId, amount, donorName, donorPhone.";
  }

  if (params.amount < 10000) {
    return "Nominal minimum donasi adalah Rp 10.000.";
  }

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, params.campaignId),
  });

  if (!campaign || campaign.status !== "active") {
    return "Program tidak ditemukan atau tidak aktif.";
  }

  try {
    const txService = new TransactionService(db);
    const tx = await txService.create({
      product_type: "campaign",
      product_id: params.campaignId,
      quantity: 1,
      unit_price: params.amount,
      donor_name: params.donorName,
      donor_phone: params.donorPhone,
      include_unique_code: true,
    });

    const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);

    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    return [
      "Transaksi donasi berhasil dibuat!",
      `ID Transaksi: ${tx.id}`,
      `No. Transaksi: ${tx.transactionNumber}`,
      `Program: ${tx.productName}`,
      `Nominal: Rp ${tx.totalAmount.toLocaleString("id-ID")}`,
      tx.uniqueCode ? `Kode Unik: ${tx.uniqueCode}` : "",
      tx.uniqueCode ? `Total Transfer: Rp ${transferAmount.toLocaleString("id-ID")}` : "",
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch (err: any) {
    console.error("createDonation error:", err);
    return `Gagal membuat transaksi: ${err.message || "Terjadi kesalahan"}`;
  }
}

async function createZakatPayment(
  db: Database,
  params: { zakatTypeId: string; amount: number; donorName: string; donorPhone: string; quantity?: number },
  envFrontendUrl?: string
): Promise<string> {
  if (!params.zakatTypeId || !params.amount || !params.donorName || !params.donorPhone) {
    return "Parameter tidak lengkap. Dibutuhkan: zakatTypeId, amount, donorName, donorPhone.";
  }

  if (params.amount < 10000) {
    return "Nominal minimum zakat adalah Rp 10.000.";
  }

  const quantity = Math.max(1, Math.round(Number(params.quantity) || 1));

  // Find active zakat period for this type
  const period = await db.query.zakatPeriods.findFirst({
    where: and(
      eq(zakatPeriods.zakatTypeId, params.zakatTypeId),
      eq(zakatPeriods.status, "active")
    ),
    with: { zakatType: true },
  });

  if (!period) {
    return "Tidak ada periode zakat aktif untuk jenis zakat ini.";
  }

  // For fitrah with quantity > 1: unit_price = per-jiwa amount, quantity = jumlah jiwa
  // For others: quantity = 1, unit_price = total amount
  const unitPrice = quantity > 1 ? Math.round(params.amount / quantity) : params.amount;

  try {
    const txService = new TransactionService(db);
    const tx = await txService.create({
      product_type: "zakat",
      product_id: period.id,
      quantity: quantity,
      unit_price: unitPrice,
      donor_name: params.donorName,
      donor_phone: params.donorPhone,
      include_unique_code: true,
    });

    const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);

    const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
    const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : "";

    return [
      "Transaksi zakat berhasil dibuat!",
      `ID Transaksi: ${tx.id}`,
      `No. Transaksi: ${tx.transactionNumber}`,
      `Jenis Zakat: ${period.zakatType?.name || period.name}`,
      quantity > 1 ? `Jumlah Jiwa: ${quantity} orang × Rp ${unitPrice.toLocaleString("id-ID")}` : "",
      `Nominal: Rp ${tx.totalAmount.toLocaleString("id-ID")}`,
      tx.uniqueCode ? `Kode Unik: ${tx.uniqueCode}` : "",
      tx.uniqueCode ? `Total Transfer: Rp ${transferAmount.toLocaleString("id-ID")}` : "",
      `Status: Menunggu Pembayaran`,
      "",
      invoiceUrl ? `Link Invoice: ${invoiceUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch (err: any) {
    console.error("createZakatPayment error:", err);
    return `Gagal membuat transaksi zakat: ${err.message || "Terjadi kesalahan"}`;
  }
}

async function getPaymentLink(
  db: Database,
  params: { transactionId: string; method?: string },
  envFrontendUrl?: string
): Promise<string> {
  if (!params.transactionId) {
    return "Parameter transactionId diperlukan.";
  }

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, params.transactionId),
  });

  if (!tx) {
    return "Transaksi tidak ditemukan.";
  }

  if (tx.paymentStatus === "paid") {
    return "Transaksi ini sudah lunas.";
  }

  const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);

  const frontendUrl = await getFrontendUrl(db, envFrontendUrl);
  const invoiceUrl = frontendUrl ? `${frontendUrl}/invoice/${tx.id}` : `/invoice/${tx.id}`;

  return [
    `*Pembayaran: ${tx.transactionNumber}*`,
    `Total Transfer: *Rp ${transferAmount.toLocaleString("id-ID")}*`,
    "",
    `Silahkan lakukan pembayaran melalui halaman berikut:`,
    `👉 ${invoiceUrl}`,
  ].join("\n");
}

async function calculateZakat(
  db: Database,
  params: { zakatTypeId: string; params: Record<string, any> }
): Promise<string> {
  if (!params.zakatTypeId) {
    return "Parameter zakatTypeId diperlukan.";
  }

  const zakatType = await db.query.zakatTypes.findFirst({
    where: eq(zakatTypes.id, params.zakatTypeId),
  });

  if (!zakatType) {
    return "Jenis zakat tidak ditemukan.";
  }

  const rawCalcType = zakatType.calculatorType || zakatType.slug;
  // Normalize: DB stores "zakat-fitrah" → strip prefix to match switch cases "fitrah"
  const calcType = rawCalcType.startsWith("zakat-") ? rawCalcType.replace("zakat-", "") : rawCalcType;
  const p = params.params || {};

  // Load zakat settings from DB (no hardcodes)
  const zakatSettings = await db.select().from(settings).where(
    or(
      eq(settings.key, "zakat_fitrah_amount"),
      eq(settings.key, "zakat_gold_price"),
      eq(settings.key, "zakat_nisab_gold"),
      eq(settings.key, "zakat_mal_percentage"),
      eq(settings.key, "zakat_profession_percentage"),
    )
  );
  const getSetting = (key: string) => zakatSettings.find(s => s.key === key)?.value;

  let result: number = 0;
  let explanation = "";

  switch (calcType) {
    case "fitrah": {
      const jumlahJiwa = Number(p.jumlah_jiwa) || 1;
      const hargaPerJiwa = Number(zakatType.fitrahAmount) || Number(getSetting("zakat_fitrah_amount")) || 45000;
      result = jumlahJiwa * hargaPerJiwa;
      explanation = `${jumlahJiwa} jiwa × Rp ${hargaPerJiwa.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`;
      break;
    }
    case "penghasilan":
    case "profesi": {
      const penghasilan = Number(p.penghasilan) || 0;
      if (penghasilan <= 0) {
        return "Mohon informasikan penghasilan bulanan Anda (angka).";
      }
      const goldPriceProfesi = await getGoldPrice(db);
      const nisabGoldProfesi = Number(getSetting("zakat_nisab_gold")) || 85;
      const nisabProfesi = nisabGoldProfesi * goldPriceProfesi;
      const pctProfesi = Number(getSetting("zakat_profession_percentage")) || 2.5;
      if (penghasilan < nisabProfesi / 12) {
        return [
          `Penghasilan Rp ${penghasilan.toLocaleString("id-ID")}/bulan belum mencapai nisab.`,
          ``,
          `Nisab zakat penghasilan: ${nisabGoldProfesi} gram emas × Rp ${goldPriceProfesi.toLocaleString("id-ID")} = Rp ${nisabProfesi.toLocaleString("id-ID")}/tahun (≈ Rp ${Math.round(nisabProfesi / 12).toLocaleString("id-ID")}/bulan).`,
          ``,
          `Tidak wajib zakat penghasilan, namun Anda tetap bisa beramal melalui infaq atau sedekah untuk program-program kami. Apakah Anda tertarik berdonasi?`,
        ].join("\n");
      }
      result = Math.round(penghasilan * (pctProfesi / 100));
      explanation = `${pctProfesi}% × Rp ${penghasilan.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`;
      break;
    }
    case "maal": {
      const totalHarta = Number(p.total_harta) || 0;
      const hutang = Number(p.hutang) || 0;
      if (totalHarta <= 0) {
        return "Mohon informasikan total harta Anda (angka). Contoh: 500000000 untuk Rp 500 juta.";
      }
      const nett = totalHarta - hutang;
      if (nett <= 0) {
        return "Total harta setelah dikurangi hutang bernilai negatif atau nol. Tidak ada kewajiban zakat maal.";
      }
      // Nisab check: nett harta harus >= 85 gram emas
      const goldPriceMaal = await getGoldPrice(db);
      const nisabGoldMaal = Number(getSetting("zakat_nisab_gold")) || 85;
      const nisabMaal = nisabGoldMaal * goldPriceMaal;
      const pctMaal = Number(getSetting("zakat_mal_percentage")) || 2.5;
      if (nett < nisabMaal) {
        return [
          `Total harta bersih Anda: Rp ${nett.toLocaleString("id-ID")} (harta Rp ${totalHarta.toLocaleString("id-ID")} - hutang Rp ${hutang.toLocaleString("id-ID")}).`,
          ``,
          `Nisab zakat maal: ${nisabGoldMaal} gram emas × Rp ${goldPriceMaal.toLocaleString("id-ID")}/gram = *Rp ${nisabMaal.toLocaleString("id-ID")}*`,
          `(Harga emas terkini dari Pluang)`,
          ``,
          `Harta bersih Anda belum mencapai nisab, sehingga tidak wajib zakat maal. Namun Anda tetap bisa beramal melalui infaq atau sedekah untuk program-program kami. Apakah Anda tertarik berdonasi?`,
        ].join("\n");
      }
      result = Math.round(nett * (pctMaal / 100));
      explanation = [
        `Harta bersih: Rp ${totalHarta.toLocaleString("id-ID")} - Rp ${hutang.toLocaleString("id-ID")} = Rp ${nett.toLocaleString("id-ID")}`,
        `Nisab: ${nisabGoldMaal}g emas × Rp ${goldPriceMaal.toLocaleString("id-ID")} = Rp ${nisabMaal.toLocaleString("id-ID")} ✓`,
        `Zakat: ${pctMaal}% × Rp ${nett.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`,
      ].join("\n");
      break;
    }
    case "pertanian": {
      const hasilPanen = Number(p.hasil_panen) || 0;
      const irigasi = p.irigasi === true || p.irigasi === "true";
      const rate = irigasi ? 0.05 : 0.1;
      result = Math.round(hasilPanen * rate);
      explanation = `${irigasi ? "5%" : "10%"} × Rp ${hasilPanen.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`;
      break;
    }
    case "peternakan": {
      const nilaiTernak = Number(p.nilai_ternak) || 0;
      const pctMaalPeternakan = Number(getSetting("zakat_mal_percentage")) || 2.5;
      result = Math.round(nilaiTernak * (pctMaalPeternakan / 100));
      explanation = `${pctMaalPeternakan}% × Rp ${nilaiTernak.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`;
      break;
    }
    case "bisnis":
    case "perdagangan": {
      const modalUsaha = Number(p.modal_usaha) || 0;
      const keuntungan = Number(p.keuntungan) || 0;
      const piutang = Number(p.piutang) || 0;
      const hutangUsaha = Number(p.hutang) || 0;
      const nettBisnis = modalUsaha + keuntungan + piutang - hutangUsaha;
      const pctMaalBisnis = Number(getSetting("zakat_mal_percentage")) || 2.5;
      if (nettBisnis <= 0) {
        return "Nilai bersih usaha tidak mencukupi untuk zakat bisnis.";
      }
      result = Math.round(nettBisnis * (pctMaalBisnis / 100));
      explanation = `${pctMaalBisnis}% × Rp ${nettBisnis.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`;
      break;
    }
    default: {
      // Generic: 2.5% of amount
      const amount = Number(p.amount) || 0;
      if (amount <= 0) {
        return `Untuk menghitung zakat ${zakatType.name}, mohon berikan nominal hartanya.`;
      }
      result = Math.round(amount * 0.025);
      explanation = `2.5% × Rp ${amount.toLocaleString("id-ID")} = Rp ${result.toLocaleString("id-ID")}`;
    }
  }

  // Return ONLY the calculation data — no instructions, no "gunakan tool", no formatting
  // The system prompt (LANGKAH 5) handles what the AI should say/do next (konfirmasi)
  return `Perhitungan: ${explanation}. Total zakat: Rp ${result.toLocaleString("id-ID")}. Nama program: ${zakatType.name}.`;
}

async function registerDonatur(
  db: Database,
  params: { name: string; email: string; phone: string }
): Promise<string> {
  if (!params.name || !params.email || !params.phone) {
    return "Parameter tidak lengkap. Dibutuhkan: name, email, phone.";
  }

  const normalizedEmail = params.email.toLowerCase().trim();
  const normalizedPhone = params.phone.replace(/[^0-9]/g, "");

  // Check if already exists
  const existing = await db.query.donatur.findFirst({
    where: or(
      eq(donatur.email, normalizedEmail),
      eq(donatur.phone, normalizedPhone),
      eq(donatur.whatsappNumber, normalizedPhone)
    ),
  });

  if (existing) {
    return `Donatur sudah terdaftar dengan nama *${existing.name}* (${existing.email}).`;
  }

  const id = createId();
  await db.insert(donatur).values({
    id,
    name: params.name,
    email: normalizedEmail,
    phone: normalizedPhone,
    whatsappNumber: normalizedPhone,
  });

  return `Pendaftaran berhasil! Data donatur:\n- Nama: ${params.name}\n- Email: ${normalizedEmail}\n- WhatsApp: ${normalizedPhone}`;
}

async function getBankDetails(
  db: Database,
  params: { transactionId: string; phone?: string }
): Promise<string> {
  let tx: any = null;

  // Try finding by transactionId first
  if (params.transactionId) {
    tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, params.transactionId),
    });
  }

  // Fallback: find latest pending transaction by phone
  if (!tx && params.phone) {
    const normalPhone = params.phone.replace(/[^0-9]/g, "");
    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(
          ilike(transactions.donorPhone, `%${normalPhone.slice(-10)}%`),
          eq(transactions.paymentStatus, "pending")
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(1);
    tx = txs[0] || null;
  }

  if (!tx) return "Transaksi tidak ditemukan. Silakan buat transaksi terlebih dahulu.";

  const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);

  // Determine program filter based on product type and campaign pillar
  let programFilter = "general";
  if (tx.productType === "zakat") {
    programFilter = "zakat";
  } else if (tx.productType === "qurban") {
    programFilter = "qurban";
  } else if (tx.productType === "campaign" && tx.productId) {
    // Check campaign pillar
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, tx.productId),
    });
    if (campaign?.pillar) {
      const pillar = campaign.pillar.toLowerCase();
      if (pillar.includes("wakaf")) {
        programFilter = "wakaf";
      } else if (pillar.includes("sedekah") || pillar.includes("shodaqoh") || pillar.includes("sodakoh")) {
        programFilter = "sedekah";
      } else if (pillar.includes("infaq") || pillar.includes("infak")) {
        programFilter = "infaq";
      }
    }
  }

  // Load bank accounts from settings
  const bankSetting = await db.query.settings.findFirst({
    where: eq(settings.key, "payment_bank_accounts"),
  });

  if (!bankSetting?.value) {
    return "Belum ada rekening bank yang dikonfigurasi.";
  }

  let allBankAccounts: any[] = [];
  try {
    allBankAccounts = JSON.parse(bankSetting.value);
  } catch {
    return "Konfigurasi rekening bank tidak valid.";
  }

  if (allBankAccounts.length === 0) {
    return "Belum ada rekening bank yang tersedia.";
  }

  // Filter bank accounts by program
  let bankAccounts = allBankAccounts.filter((bank: any) => {
    const programs: string[] = Array.isArray(bank.programs) && bank.programs.length > 0
      ? bank.programs
      : ["general"];
    return programs.includes(programFilter);
  });

  // Fallback to "general" if no specific match
  if (bankAccounts.length === 0) {
    bankAccounts = allBankAccounts.filter((bank: any) => {
      const programs: string[] = Array.isArray(bank.programs) && bank.programs.length > 0
        ? bank.programs
        : ["general"];
      return programs.includes("general");
    });
  }

  // Last fallback: show all if nothing matched
  if (bankAccounts.length === 0) {
    bankAccounts = allBankAccounts;
  }

  const lines = [
    `*Pembayaran Transfer Bank*`,
    `No. Transaksi: ${tx.transactionNumber}`,
    `Total Transfer: *Rp ${transferAmount.toLocaleString("id-ID")}*`,
    "",
    "Silakan transfer ke rekening berikut:",
  ];

  for (const bank of bankAccounts) {
    lines.push("");
    lines.push(`🏦 *${bank.bankName}*`);
    lines.push(`No. Rekening: ${bank.accountNumber}`);
    lines.push(`Atas Nama: ${bank.accountName}`);
  }

  lines.push("");
  lines.push(`⚠️ Pastikan transfer sesuai nominal *Rp ${transferAmount.toLocaleString("id-ID")}* agar pembayaran mudah diverifikasi.`);

  return lines.join("\n");
}

async function confirmPayment(
  db: Database,
  params: { transactionId: string; amount: number; paymentDate?: string },
  context?: ToolContext
): Promise<string> {
  if (!params.transactionId) return "Parameter transactionId diperlukan.";
  if (!params.amount || params.amount <= 0) return "Nominal pembayaran harus lebih dari 0.";

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, params.transactionId),
  });

  if (!tx) return "Transaksi tidak ditemukan.";
  if (tx.paymentStatus === "paid") return "Transaksi ini sudah lunas.";
  if (tx.paymentStatus === "processing") return "Transaksi ini sudah dalam proses verifikasi. Mohon tunggu konfirmasi admin.";

  // Upload image to GCS if available
  let proofUrl = "";
  if (context?.imageBuffer) {
    try {
      const settingsData = await db.select().from(settings).where(eq(settings.category, "cdn"));
      const cdnEnabled = settingsData.find((s: any) => s.key === "cdn_enabled")?.value === "true";

      if (cdnEnabled) {
        const gcsConfig = {
          bucketName: settingsData.find((s: any) => s.key === "gcs_bucket_name")?.value || "",
          projectId: settingsData.find((s: any) => s.key === "gcs_project_id")?.value || "",
          clientEmail: settingsData.find((s: any) => s.key === "gcs_client_email")?.value || "",
          privateKey: settingsData.find((s: any) => s.key === "gcs_private_key")?.value || "",
        };

        if (gcsConfig.bucketName && gcsConfig.projectId && gcsConfig.clientEmail && gcsConfig.privateKey) {
          const mimeType = context.imageMimeType || "image/jpeg";
          const ext = mimeType.includes("png") ? "png" : "jpeg";
          const filename = `${Date.now()}-wa-proof.${ext}`;
          const path = `payment-proofs/transaction/${params.transactionId}/${filename}`;

          const { uploadToGCS } = await import("../lib/gcs");
          proofUrl = await uploadToGCS(gcsConfig, context.imageBuffer, path, mimeType);
        }
      }
    } catch (err) {
      console.error("[confirm_payment] GCS upload error:", err);
    }
  }

  // Create payment record
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  const paymentNumber = `PAY-${year}${month}${day}-${timestamp}`;

  const paymentDate = params.paymentDate ? new Date(params.paymentDate) : new Date();

  await db.insert(transactionPayments).values({
    id: createId(),
    paymentNumber,
    transactionId: params.transactionId,
    amount: params.amount,
    paymentDate,
    paymentMethod: tx.paymentMethodId || "bank_transfer",
    paymentProof: proofUrl || undefined,
    status: "pending",
    notes: "Konfirmasi pembayaran via WhatsApp Bot",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  // Update transaction status
  await db
    .update(transactions)
    .set({
      paidAmount: sql`${transactions.paidAmount} + ${params.amount}`,
      paymentStatus: "processing",
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, params.transactionId));

  const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);

  return [
    "Bukti pembayaran berhasil diterima!",
    `No. Transaksi: ${tx.transactionNumber}`,
    `Nominal Konfirmasi: Rp ${params.amount.toLocaleString("id-ID")}`,
    `Total Tagihan: Rp ${transferAmount.toLocaleString("id-ID")}`,
    proofUrl ? "Bukti Transfer: Tersimpan" : "Bukti Transfer: Gambar tidak tersedia",
    "Status: Menunggu Verifikasi Admin",
  ].join("\n");
}

async function sendQrisToWhatsapp(
  db: Database,
  params: { transactionId: string; phone: string }
): Promise<string> {
  if (!params.phone) {
    return "Parameter phone diperlukan.";
  }

  let tx: any = null;

  if (params.transactionId) {
    tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, params.transactionId),
    });
  }

  // Fallback: find latest pending transaction by phone
  if (!tx && params.phone) {
    const normalPhone = params.phone.replace(/[^0-9]/g, "");
    const txs = await db
      .select()
      .from(transactions)
      .where(
        and(
          ilike(transactions.donorPhone, `%${normalPhone.slice(-10)}%`),
          eq(transactions.paymentStatus, "pending")
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(1);
    tx = txs[0] || null;
  }

  if (!tx) return "Transaksi tidak ditemukan.";

  const transferAmount = tx.totalAmount + (tx.uniqueCode || 0);

  // Load QRIS accounts
  const qrisSetting = await db.query.settings.findFirst({
    where: eq(settings.key, "payment_qris_accounts"),
  });

  if (!qrisSetting?.value) {
    return "Belum ada QRIS yang dikonfigurasi.";
  }

  let qrisAccounts: any[] = [];
  try {
    qrisAccounts = JSON.parse(qrisSetting.value);
  } catch {
    return "Konfigurasi QRIS tidak valid.";
  }

  // Find dynamic QRIS account
  const dynamicQris = qrisAccounts.find((acc: any) => acc.isDynamic && acc.emvPayload);

  if (!dynamicQris) {
    // Fallback: static QRIS
    const staticQris = qrisAccounts[0];
    if (staticQris?.imageUrl) {
      // Send static image via WA
      const wa = new WhatsAppService(db);
      const config = await wa.getConfig();
      if (config.enabled && config.apiUrl) {
        const { GOWAClient } = await import("./whatsapp-gowa");
        const client = new GOWAClient({
          apiUrl: config.apiUrl,
          username: config.username,
          password: config.password,
          deviceId: config.deviceId,
          messageDelay: config.messageDelay,
        });
        await client.sendImage(
          params.phone,
          staticQris.imageUrl,
          `QRIS ${staticQris.name || ""}  — Rp ${transferAmount.toLocaleString("id-ID")}\n${tx.transactionNumber}`
        );
        return `QRIS telah dikirim. Total: Rp ${transferAmount.toLocaleString("id-ID")}. Silakan scan QR code di atas untuk melakukan pembayaran.`;
      }
    }
    return "QRIS tidak tersedia untuk transaksi ini.";
  }

  // Generate dynamic QRIS PNG
  const { generatePayload } = await import("./qris-generator");
  const QRCode = (await import("qrcode")).default;

  const payload = generatePayload(dynamicQris.emvPayload, transferAmount, tx.transactionNumber);
  const pngBuffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    type: "png",
  });

  // Send via GOWA
  const wa = new WhatsAppService(db);
  const config = await wa.getConfig();
  if (!config.enabled || !config.apiUrl) {
    return "WhatsApp belum dikonfigurasi.";
  }

  const { GOWAClient } = await import("./whatsapp-gowa");
  const client = new GOWAClient({
    apiUrl: config.apiUrl,
    username: config.username,
    password: config.password,
    deviceId: config.deviceId,
    messageDelay: config.messageDelay,
  });

  const caption = `*QRIS ${dynamicQris.name || ""}*\nNo. Transaksi: ${tx.transactionNumber}\nTotal: *Rp ${transferAmount.toLocaleString("id-ID")}*\n\nSilakan scan QR code untuk pembayaran.`;

  await client.sendFile(
    params.phone,
    pngBuffer,
    `QRIS-${tx.transactionNumber}.png`,
    caption
  );

  return `QRIS dengan nominal Rp ${transferAmount.toLocaleString("id-ID")} telah dikirim ke WhatsApp donatur. Nominal sudah terkunci di QR code.`;
}

// Tool execution dispatcher
async function executeTool(
  db: Database,
  toolName: string,
  params: Record<string, any>,
  envFrontendUrl?: string,
  context?: ToolContext,
  execState?: ExecutionState
): Promise<string> {
  switch (toolName) {
    case "get_program_overview":
      return getProgramOverview(db);
    case "search_campaigns":
      return searchCampaigns(db, params as any);
    case "get_campaign_detail":
      return getCampaignDetail(db, params as any);
    case "check_transaction_status":
      return checkTransactionStatus(db, params as any);
    case "get_zakat_menu":
      return getZakatMenu(db);
    case "get_zakat_programs":
      return getZakatPrograms(db, params as any);
    case "get_payment_link":
      return getPaymentLink(db, params as any, envFrontendUrl);
    case "register_donatur":
      return registerDonatur(db, params as any);
    case "get_bank_details":
      return getBankDetails(db, params as any);
    case "send_qris":
      return sendQrisToWhatsapp(db, params as any);
    case "confirm_payment": {
      // GUARD RAIL: REQUIRE image proof before processing payment confirmation
      if (!context?.imageBuffer) {
        console.warn("[WA AI] GUARD RAIL: confirm_payment called WITHOUT image proof. Blocked.");
        return "GAGAL: Bukti transfer belum dikirim. Donatur HARUS mengirim foto/screenshot bukti transfer terlebih dahulu. Sampaikan ke donatur: 'Mohon kirimkan bukti transfer berupa foto/screenshot agar kami dapat memproses konfirmasi pembayaran Anda.'";
      }
      return confirmPayment(db, params as any, context);
    }
    case "respond_to_user": {
      const msg = (params as any).message || "";
      // GUARD RAIL: Prevent AI from confirming payment without actually calling confirm_payment
      const lowerMsg = msg.toLowerCase();
      const paymentConfirmPhrases = [
        "telah kami terima",
        "telah diterima",
        "pembayaran diterima",
        "sedang diverifikasi",
        "sedang dalam proses verifikasi",
        "pembayaran berhasil",
        "pembayaran anda berhasil",
        "sudah kami terima",
        "sudah diterima",
        "berhasil diverifikasi",
        "verifikasi berhasil",
      ];
      if (paymentConfirmPhrases.some((p) => lowerMsg.includes(p))) {
        console.warn("[WA AI] GUARD RAIL: AI tried to confirm payment via respond_to_user without calling confirm_payment. Blocked.");
        return "Terima kasih atas informasinya. Untuk proses verifikasi pembayaran, mohon kirimkan *bukti transfer berupa foto/screenshot* ya. Kami perlu bukti transfer untuk memproses konfirmasi pembayaran Anda.";
      }
      return msg;
    }

    // --- Flow trigger tools (deterministic state machine takes over) ---
    case "start_zakat_flow": {
      // Check donor registration
      if (context?.phone) {
        const ph = context.phone.replace(/[^0-9]/g, "");
        const donor = await db.query.donatur.findFirst({ where: ilike(donatur.phone, `%${ph.slice(-10)}%`) });
        if (!donor) return "Donatur belum terdaftar. Silakan daftarkan terlebih dahulu menggunakan tool register_donatur.";
      }
      if (execState) execState.flowTrigger = createZakatFlowState(params as any);
      return "FLOW_ACTIVATED";
    }
    case "start_donation_flow": {
      if (!params.campaignId || !params.campaignName) return "Parameter campaignId dan campaignName diperlukan.";
      // Check donor registration
      if (context?.phone) {
        const ph = context.phone.replace(/[^0-9]/g, "");
        const donor = await db.query.donatur.findFirst({ where: ilike(donatur.phone, `%${ph.slice(-10)}%`) });
        if (!donor) return "Donatur belum terdaftar. Silakan daftarkan terlebih dahulu menggunakan tool register_donatur.";
      }
      if (execState) execState.flowTrigger = createDonationFlowState(params as any);
      return "FLOW_ACTIVATED";
    }
    case "start_fidyah_flow": {
      if (!params.campaignId || !params.campaignName) return "Parameter campaignId dan campaignName diperlukan.";
      // Check donor registration
      if (context?.phone) {
        const ph = context.phone.replace(/[^0-9]/g, "");
        const donor = await db.query.donatur.findFirst({ where: ilike(donatur.phone, `%${ph.slice(-10)}%`) });
        if (!donor) return "Donatur belum terdaftar. Silakan daftarkan terlebih dahulu menggunakan tool register_donatur.";
      }
      if (execState) execState.flowTrigger = createFidyahFlowState(params as any);
      return "FLOW_ACTIVATED";
    }
    case "start_qurban_flow": {
      // Check donor registration
      if (context?.phone) {
        const ph = context.phone.replace(/[^0-9]/g, "");
        const donor = await db.query.donatur.findFirst({ where: ilike(donatur.phone, `%${ph.slice(-10)}%`) });
        if (!donor) return "Donatur belum terdaftar. Silakan daftarkan terlebih dahulu menggunakan tool register_donatur.";
      }
      if (execState) execState.flowTrigger = createQurbanFlowState();
      return "FLOW_ACTIVATED";
    }
    case "start_qurban_savings_flow": {
      // Check donor registration
      if (context?.phone) {
        const ph = context.phone.replace(/[^0-9]/g, "");
        const donor = await db.query.donatur.findFirst({ where: ilike(donatur.phone, `%${ph.slice(-10)}%`) });
        if (!donor) return "Donatur belum terdaftar. Silakan daftarkan terlebih dahulu menggunakan tool register_donatur.";
      }
      if (execState) execState.flowTrigger = createQurbanSavingsFlowState();
      return "FLOW_ACTIVATED";
    }
    case "check_qurban_savings": {
      if (!context?.phone) return "Nomor HP tidak tersedia.";
      const ph = context.phone.replace(/[^0-9]/g, "");

      // Look up donatur for precise filtering
      const donaturForSavings = await db.query.donatur.findFirst({
        where: ilike(donatur.phone, `%${ph.slice(-10)}%`),
      });

      let savingsList = await db
        .select({
          id: qurbanSavings.id,
          savingsNumber: qurbanSavings.savingsNumber,
          donorName: qurbanSavings.donorName,
          donorEmail: qurbanSavings.donorEmail,
          targetAmount: qurbanSavings.targetAmount,
          currentAmount: qurbanSavings.currentAmount,
          installmentFrequency: qurbanSavings.installmentFrequency,
          installmentCount: qurbanSavings.installmentCount,
          installmentAmount: qurbanSavings.installmentAmount,
          status: qurbanSavings.status,
          pkgName: qurbanPackages.name,
        })
        .from(qurbanSavings)
        .leftJoin(qurbanPackagePeriods, eq(qurbanSavings.targetPackagePeriodId, qurbanPackagePeriods.id))
        .leftJoin(qurbanPackages, eq(qurbanPackagePeriods.packageId, qurbanPackages.id))
        .where(ilike(qurbanSavings.donorPhone, `%${ph.slice(-10)}%`));

      // Narrow down by donatur email/name to avoid showing other donors' savings
      if (savingsList.length > 1 && donaturForSavings?.email) {
        const byEmail = savingsList.filter((s) => s.donorEmail === donaturForSavings.email);
        if (byEmail.length > 0) savingsList = byEmail;
      }
      if (savingsList.length > 1 && donaturForSavings?.name) {
        const byName = savingsList.filter((s) => s.donorName === donaturForSavings.name);
        if (byName.length > 0) savingsList = byName;
      }

      if (savingsList.length === 0) {
        return "Tidak ditemukan tabungan qurban untuk nomor ini.";
      }

      const lines: string[] = [];
      for (const s of savingsList) {
        const pct = s.targetAmount > 0 ? Math.round((s.currentAmount / s.targetAmount) * 100) : 0;
        const freqLabel = s.installmentFrequency === "monthly" ? "bulan" : "minggu";
        const statusMap: Record<string, string> = {
          active: "Aktif", paused: "Dijeda", completed: "Selesai", converted: "Terkonversi", cancelled: "Dibatalkan",
        };
        lines.push(`No: ${s.savingsNumber}`);
        lines.push(`Paket: ${s.pkgName || "-"}`);
        lines.push(`Status: ${statusMap[s.status] || s.status}`);
        lines.push(`Progress: Rp ${s.currentAmount.toLocaleString("id-ID")} / Rp ${s.targetAmount.toLocaleString("id-ID")} (${pct}%)`);
        lines.push(`Cicilan: ${s.installmentCount}x @ Rp ${s.installmentAmount.toLocaleString("id-ID")}/${freqLabel}`);
        lines.push("---");
      }
      return lines.join("\n");
    }
    case "start_savings_deposit_flow": {
      // Check donor registration
      if (context?.phone) {
        const ph = context.phone.replace(/[^0-9]/g, "");
        const donor = await db.query.donatur.findFirst({ where: ilike(donatur.phone, `%${ph.slice(-10)}%`) });
        if (!donor) return "Donatur belum terdaftar. Silakan daftarkan terlebih dahulu menggunakan tool register_donatur.";
      }
      if (execState) execState.flowTrigger = createQurbanSavingsDepositFlowState();
      return "FLOW_ACTIVATED";
    }

    default:
      return `Tool "${toolName}" belum diimplementasikan.`;
  }
}

// ---------------------------------------------------------------------------
// AI provider call
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    name: "get_program_overview",
    description: "Tampilkan ringkasan SEMUA program yang tersedia: donasi, zakat, qurban, fidyah, wakaf. Gunakan ketika donatur bertanya 'ada program apa?', 'program apa saja?', 'mau berdonasi tapi bingung', atau pertanyaan umum tentang program.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_campaigns",
    description: "Cari program/campaign donasi SPESIFIK yang tersedia. Gunakan jika donatur sudah tahu mau cari program tertentu (misal 'program bencana', 'program yatim').",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Kata kunci pencarian" },
      },
    },
  },
  {
    name: "get_campaign_detail",
    description: "Lihat detail campaign termasuk progress donasi",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID campaign" },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "check_transaction_status",
    description: "Cek status transaksi. Bisa cari berdasarkan nomor HP donatur ATAU nomor transaksi (TRX-...).",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Nomor HP donatur" },
        transactionNumber: { type: "string", description: "Nomor transaksi (misal TRX-20260219-58636)" },
      },
    },
  },
  {
    name: "get_zakat_menu",
    description: "Tampilkan menu jenis zakat (fitrah, maal, penghasilan, dll). HANYA panggil tool ini jika donatur bilang 'zakat' TANPA menyebut jenis spesifik. Jika donatur sudah sebut jenis (misal 'zakat fitrah'), JANGAN panggil tool ini, panggil get_zakat_programs.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_zakat_programs",
    description: "Tampilkan daftar program zakat untuk jenis tertentu beserta ID-nya. Panggil tool ini jika donatur sudah menyebut jenis zakat: 'zakat fitrah' → calculatorType 'fitrah', 'zakat maal' → 'maal', 'zakat penghasilan' → 'penghasilan'.",
    parameters: {
      type: "object",
      properties: {
        calculatorType: {
          type: "string",
          description: "Jenis zakat: fitrah, maal, penghasilan, profesi, pertanian, peternakan, bisnis.",
        },
      },
      required: ["calculatorType"],
    },
  },
  {
    name: "start_zakat_flow",
    description: "Mulai proses pembayaran zakat. Panggil ketika donatur ingin MEMBAYAR zakat. Jika donatur sudah sebut jenis zakat, isi calculatorType.",
    parameters: {
      type: "object",
      properties: {
        calculatorType: {
          type: "string",
          description: "Jenis zakat jika sudah diketahui: fitrah, maal, penghasilan, profesi, pertanian, peternakan, bisnis. Kosongkan jika belum tahu.",
        },
      },
    },
  },
  {
    name: "start_donation_flow",
    description: "Mulai proses donasi untuk campaign tertentu (BUKAN fidyah). Panggil setelah donatur pilih program dan ingin MEMBAYAR.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID campaign" },
        campaignName: { type: "string", description: "Nama campaign" },
        amount: { type: "number", description: "Nominal donasi jika sudah disebutkan" },
      },
      required: ["campaignId", "campaignName"],
    },
  },
  {
    name: "start_fidyah_flow",
    description: "Mulai proses pembayaran fidyah. Panggil ketika donatur ingin MEMBAYAR fidyah. Sistem akan menanyakan jumlah orang, jumlah hari, dan atas nama siapa secara otomatis.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "ID campaign fidyah" },
        campaignName: { type: "string", description: "Nama campaign fidyah" },
      },
      required: ["campaignId", "campaignName"],
    },
  },
  {
    name: "start_qurban_flow",
    description: "Mulai proses pemesanan qurban LANGSUNG (bayar lunas). Panggil ketika donatur ingin MEMESAN qurban. Sistem akan menampilkan periode, paket (kambing/sapi, individu/patungan), jumlah, dan atas nama siapa secara otomatis.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "start_qurban_savings_flow",
    description: "Mulai proses TABUNGAN/CICILAN qurban. Panggil ketika donatur ingin MENABUNG/MENCICIL qurban, BUKAN bayar langsung. Sistem akan menampilkan periode, paket, lalu tanya frekuensi (bulanan/mingguan), jumlah cicilan, dan jadwal pengingat secara otomatis.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "check_qurban_savings",
    description: "Cek status dan progress tabungan qurban donatur. Panggil ketika donatur bertanya 'cek tabungan', 'tabungan saya', atau ingin tahu progress cicilan qurban.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "start_savings_deposit_flow",
    description: "Mulai proses setoran/cicilan tabungan qurban. Panggil ketika donatur ingin 'setor tabungan' atau 'bayar cicilan qurban'. Sistem akan menampilkan info tabungan, progress, dan nominal cicilan secara otomatis.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_payment_link",
    description: "Generate link pembayaran untuk transaksi",
    parameters: {
      type: "object",
      properties: {
        transactionId: { type: "string", description: "ID transaksi" },
        method: { type: "string", description: "Metode pembayaran (opsional)" },
      },
      required: ["transactionId"],
    },
  },
  {
    name: "register_donatur",
    description: "Daftarkan donatur baru ke sistem",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nama lengkap donatur" },
        email: { type: "string", description: "Alamat email donatur" },
        phone: { type: "string", description: "Nomor WhatsApp donatur" },
      },
      required: ["name", "email", "phone"],
    },
  },
  {
    name: "get_bank_details",
    description: "Tampilkan detail rekening bank untuk transfer pembayaran. Jika transactionId tidak diketahui, kirim phone untuk mencari transaksi pending terakhir.",
    parameters: {
      type: "object",
      properties: {
        transactionId: { type: "string", description: "ID transaksi (dari riwayat percakapan)" },
        phone: { type: "string", description: "Nomor HP donatur (fallback jika transactionId tidak tersedia)" },
      },
    },
  },
  {
    name: "send_qris",
    description: "Generate dan kirim gambar QRIS ke WhatsApp donatur untuk pembayaran",
    parameters: {
      type: "object",
      properties: {
        transactionId: { type: "string", description: "ID transaksi" },
        phone: { type: "string", description: "Nomor WhatsApp donatur tujuan" },
      },
      required: ["transactionId", "phone"],
    },
  },
  {
    name: "confirm_payment",
    description:
      "Konfirmasi pembayaran donatur berdasarkan bukti transfer yang dikirim. Gunakan tool ini setelah membaca gambar bukti transfer dan mengekstrak informasi pembayaran.",
    parameters: {
      type: "object",
      properties: {
        transactionId: {
          type: "string",
          description: "ID transaksi yang dibayar",
        },
        amount: {
          type: "number",
          description: "Jumlah nominal yang ditransfer (dari bukti transfer)",
        },
        paymentDate: {
          type: "string",
          description: "Tanggal pembayaran dalam format YYYY-MM-DD (dari bukti transfer)",
        },
      },
      required: ["transactionId", "amount"],
    },
  },
  {
    name: "respond_to_user",
    description:
      "Kirim pesan teks biasa ke donatur. Gunakan ini jika tidak ada tool aksi lain yang perlu dipanggil — misalnya untuk menyapa, menjawab pertanyaan, atau memberi informasi.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Pesan yang akan dikirim ke donatur",
        },
      },
      required: ["message"],
    },
  },
];

async function getAIConfig(db: Database): Promise<{
  provider: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}> {
  const rows = await db.query.settings.findMany({
    where: eq(settings.category, "whatsapp"),
  });

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    provider: map["whatsapp_bot_ai_provider"] || "gemini",
    apiKey: map["whatsapp_bot_ai_api_key"] || "",
    model: map["whatsapp_bot_ai_model"] || "gemini-2.0-flash",
    systemPrompt: map["whatsapp_bot_system_prompt"] || "",
  };
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delayMs = 3000
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 && i < retries) {
      console.warn(`Rate limited (429), retry ${i + 1}/${retries} after ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  db: Database,
  envFrontendUrl?: string,
  context?: ToolContext,
  execState?: ExecutionState
): Promise<string> {
  const currentContents: any[] = [];

  // Add conversation history
  for (const msg of history.slice(-10)) {
    currentContents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Add current message (with image if available for multimodal)
  const userParts: any[] = [{ text: userMessage }];
  if (context?.imageBuffer) {
    const base64 = context.imageBuffer.toString("base64");
    userParts.push({
      inline_data: {
        mime_type: context.imageMimeType || "image/jpeg",
        data: base64,
      },
    });
  }
  currentContents.push({
    role: "user",
    parts: userParts,
  });

  const tools = [
    {
      function_declarations: TOOL_DEFINITIONS.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Force Gemini to always call a tool (mode: "ANY") so it never responds
  // with just text when an action is needed. The respond_to_user tool is
  // available for plain text replies.
  const toolConfig = {
    function_calling_config: { mode: "ANY" },
  };

  const MAX_ROUNDS = 5;
  let lastToolResult = "";

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: currentContents,
      tools,
      tool_config: toolConfig,
    };

    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini API error (round ${round}):`, res.status, errText);
      return lastToolResult || "Maaf, terjadi gangguan. Silakan coba lagi nanti.";
    }

    const data = (await res.json()) as any;
    const parts = data.candidates?.[0]?.content?.parts || [];

    // Find function call in response
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (!functionCallPart) {
      // No function call (shouldn't happen with mode: ANY, but handle gracefully)
      const textPart = parts.find((p: any) => p.text);
      return textPart?.text || lastToolResult || "Maaf, saya tidak bisa memproses pesan Anda saat ini.";
    }

    const toolName = functionCallPart.functionCall.name;
    const toolArgs = functionCallPart.functionCall.args || {};

    // If AI just wants to send a text response, return it directly
    if (toolName === "respond_to_user") {
      return toolArgs.message || lastToolResult || "";
    }

    // Execute the actual tool
    const toolResult = await executeTool(db, toolName, toolArgs, envFrontendUrl, context, execState);
    lastToolResult = toolResult;

    // Check if a deterministic flow was triggered — break AI loop
    if (execState?.flowTrigger) return "";

    // Append model's function call + tool result to conversation for next round
    currentContents.push({
      role: "model",
      parts: [{ functionCall: { name: toolName, args: toolArgs } }],
    });
    currentContents.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: toolName,
            response: { result: toolResult },
          },
        },
      ],
    });

    // Continue loop — Gemini will process the tool result and either:
    // - Call another tool (e.g., send_qris after start_donation_flow)
    // - Call respond_to_user to format and return the final message
  }

  // Max rounds reached — return whatever we have
  return lastToolResult || "Maaf, terjadi gangguan. Silakan coba lagi.";
}

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  db: Database,
  envFrontendUrl?: string,
  context?: ToolContext,
  execState?: ExecutionState
): Promise<string> {
  const currentMessages: any[] = [];

  // Add conversation history
  for (const msg of history.slice(-10)) {
    currentMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current message (with image if available for multimodal)
  if (context?.imageBuffer) {
    const base64 = context.imageBuffer.toString("base64");
    currentMessages.push({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: context.imageMimeType || "image/jpeg",
            data: base64,
          },
        },
        { type: "text", text: userMessage },
      ],
    });
  } else {
    currentMessages.push({
      role: "user",
      content: userMessage,
    });
  }

  const tools = TOOL_DEFINITIONS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  const MAX_ROUNDS = 5;
  let lastToolResult = "";

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: currentMessages,
        tools,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Claude API error (round ${round}):`, res.status, errText);
      return lastToolResult || "Maaf, terjadi gangguan. Silakan coba lagi nanti.";
    }

    const data = (await res.json()) as any;

    // Check for tool use
    const toolUseBlock = data.content?.find((b: any) => b.type === "tool_use");
    if (!toolUseBlock) {
      // No tool call — return text response
      const textBlock = data.content?.find((b: any) => b.type === "text");
      return textBlock?.text || lastToolResult || "Maaf, saya tidak bisa memproses pesan Anda saat ini.";
    }

    // Handle respond_to_user shortcut
    if (toolUseBlock.name === "respond_to_user") {
      return toolUseBlock.input?.message || lastToolResult || "";
    }

    // Execute tool
    const toolResult = await executeTool(db, toolUseBlock.name, toolUseBlock.input || {}, envFrontendUrl, context, execState);
    lastToolResult = toolResult;

    // Check if a deterministic flow was triggered — break AI loop
    if (execState?.flowTrigger) return "";

    // Append assistant response + tool result for next round
    currentMessages.push({ role: "assistant", content: data.content });
    currentMessages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: toolResult,
        },
      ],
    });
  }

  return lastToolResult || "Maaf, terjadi gangguan. Silakan coba lagi.";
}

async function callGrok(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  db: Database,
  envFrontendUrl?: string,
  context?: ToolContext,
  execState?: ExecutionState
): Promise<string> {
  const currentMessages: any[] = [
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of history.slice(-10)) {
    currentMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current message (with image if available — Grok supports OpenAI vision format)
  if (context?.imageBuffer) {
    const base64 = context.imageBuffer.toString("base64");
    currentMessages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${context.imageMimeType || "image/jpeg"};base64,${base64}`,
          },
        },
        { type: "text", text: userMessage },
      ],
    });
  } else {
    currentMessages.push({
      role: "user",
      content: userMessage,
    });
  }

  const tools = TOOL_DEFINITIONS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const MAX_ROUNDS = 5;
  let lastToolResult = "";

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "grok-3-mini-fast",
        messages: currentMessages,
        tools,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Grok API error (round ${round}):`, res.status, errText);
      return lastToolResult || "Maaf, terjadi gangguan. Silakan coba lagi nanti.";
    }

    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    const assistantMsg = choice?.message;

    // No tool calls — return text response
    if (!assistantMsg?.tool_calls?.length) {
      return assistantMsg?.content || lastToolResult || "Maaf, saya tidak bisa memproses pesan Anda saat ini.";
    }

    const toolCall = assistantMsg.tool_calls[0];
    const toolName = toolCall.function.name;
    let toolArgs: Record<string, any> = {};
    try {
      toolArgs = JSON.parse(toolCall.function.arguments || "{}");
    } catch {}

    // Handle respond_to_user shortcut
    if (toolName === "respond_to_user") {
      return toolArgs.message || lastToolResult || "";
    }

    // Execute tool
    const toolResult = await executeTool(db, toolName, toolArgs, envFrontendUrl, context, execState);
    lastToolResult = toolResult;

    // Check if a deterministic flow was triggered — break AI loop
    if (execState?.flowTrigger) return "";

    // Append assistant message + tool result for next round
    currentMessages.push(assistantMsg);
    currentMessages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: toolResult,
    });
  }

  return lastToolResult || "Maaf, terjadi gangguan. Silakan coba lagi.";
}

// ---------------------------------------------------------------------------
// Build system prompt with global variables
// ---------------------------------------------------------------------------

async function buildSystemPrompt(db: Database, basePrompt: string, envFrontendUrl?: string): Promise<string> {
  const wa = new WhatsAppService(db, envFrontendUrl);
  const globalVars = await wa.getGlobalVariables();

  let prompt = basePrompt;
  for (const [key, value] of Object.entries(globalVars)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Main entry point: process incoming message
// ---------------------------------------------------------------------------

export async function processIncomingMessage(
  db: Database,
  msg: IncomingMessage,
  envFrontendUrl?: string
): Promise<void> {
  const ctx = getConversation(msg.from, msg.profileName);
  const wa = new WhatsAppService(db, envFrontendUrl);

  const aiConfig = await getAIConfig(db);

  if (!aiConfig.apiKey) {
    console.warn("WhatsApp bot: AI API key not configured");
    return;
  }

  // Lookup donatur dari DB berdasarkan nomor HP
  const phone = msg.from.replace(/[^0-9]/g, "");
  const donaturRow = await db.query.donatur.findFirst({
    where: ilike(donatur.phone, `%${phone.slice(-10)}%`),
  });
  const donorName = donaturRow?.name || msg.profileName;
  const donorPhone = msg.from;

  // Cache donor info on context for flow handlers
  ctx.donorName = donorName;
  ctx.donaturId = donaturRow?.id;

  // ---- FLOW STATE INTERCEPTION ----
  // If a deterministic flow is active, route to state machine (skip AI entirely)
  console.log(`[Flow] Check flowState for ${msg.from}: ${ctx.flowState ? `ACTIVE type=${ctx.flowState.type} step=${ctx.flowState.step}` : "NONE"} | text="${msg.text?.substring(0, 50)}" imageUrl=${!!msg.imageUrl}`);
  if (ctx.flowState) {
    if (msg.imageUrl) {
      // Image during flow = likely payment proof → exit flow, fall through to AI
      console.log(`[Flow] Image received during flow → exiting flow for ${msg.from}`);
      ctx.flowState = undefined;
    } else {
      try {
        const flowCtx: FlowContext = { phone: msg.from, donorName, donaturId: donaturRow?.id, flowState: ctx.flowState };
        await handleFlowStep(db, flowCtx, msg.text, wa, envFrontendUrl);
        // Sync flowState back (may have been cleared by flow completion)
        ctx.flowState = flowCtx.flowState;
        console.log(`[Flow] After step for ${msg.from}: ${ctx.flowState ? `type=${ctx.flowState.type} step=${ctx.flowState.step}` : "CLEARED"}`);
        ctx.history.push({ role: "user", content: msg.text });
        ctx.history.push({ role: "assistant", content: "[Flow otomatis]" });
        if (ctx.history.length > 20) ctx.history = ctx.history.slice(-20);
      } catch (err) {
        console.error("[Flow] Step error for", msg.from, ":", err);
        ctx.flowState = undefined;
        await wa.sendMessage(msg.from, "Maaf, terjadi kesalahan. Silakan mulai ulang.");
      }
      return; // DO NOT proceed to AI
    }
  }
  // ---- END FLOW INTERCEPTION ----

  // Download image early if available (before it expires)
  let imageBuffer: Buffer | undefined;
  let imageMimeType: string | undefined = msg.imageMimeType;
  if (msg.imageUrl) {
    try {
      // Get GOWA config for authenticated media downloads
      const waService = new WhatsAppService(db, envFrontendUrl);
      const gowaConfig = await waService.getConfig();
      const gowaAuth = btoa(`${gowaConfig.username}:${gowaConfig.password}`);
      const gowaHeaders: Record<string, string> = {
        Authorization: `Basic ${gowaAuth}`,
        "X-Device-Id": gowaConfig.deviceId,
      };

      if (msg.imageUrl.startsWith("__gowa_path__:")) {
        // GOWA relative path — resolve with apiUrl base
        const relativePath = msg.imageUrl.replace("__gowa_path__:", "");
        const downloadUrl = `${gowaConfig.apiUrl}/${relativePath}`;
        console.log("[WA AI] Downloading GOWA static media:", downloadUrl);
        const imgRes = await fetch(downloadUrl, { headers: gowaHeaders });
        if (imgRes.ok) {
          imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          imageMimeType = imageMimeType || imgRes.headers.get("content-type") || "image/jpeg";
          console.log("[WA AI] GOWA media downloaded:", imageBuffer.length, "bytes,", imageMimeType);
        } else {
          console.warn("[WA AI] GOWA media download failed:", imgRes.status, await imgRes.text().catch(() => ""));
        }
      } else if (msg.imageUrl.startsWith("__gowa_media__:")) {
        // GOWA media ID — download via GOWA API
        const mediaId = msg.imageUrl.replace("__gowa_media__:", "");
        const downloadUrl = `${gowaConfig.apiUrl}/media/download/${mediaId}`;
        console.log("[WA AI] Downloading GOWA media by ID:", downloadUrl);
        const imgRes = await fetch(downloadUrl, { headers: gowaHeaders });
        if (imgRes.ok) {
          imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          imageMimeType = imageMimeType || imgRes.headers.get("content-type") || "image/jpeg";
          console.log("[WA AI] GOWA media downloaded:", imageBuffer.length, "bytes,", imageMimeType);
        } else {
          console.warn("[WA AI] GOWA media download failed:", imgRes.status, await imgRes.text().catch(() => ""));
        }
      } else if (msg.imageUrl.startsWith("http")) {
        // Direct URL — try without auth first, then with GOWA auth
        console.log("[WA AI] Downloading image from URL:", msg.imageUrl);
        let imgRes = await fetch(msg.imageUrl);
        if (!imgRes.ok && gowaConfig.apiUrl && msg.imageUrl.includes(new URL(gowaConfig.apiUrl).host)) {
          // Retry with GOWA auth if same host
          console.log("[WA AI] Retrying with GOWA auth...");
          imgRes = await fetch(msg.imageUrl, { headers: gowaHeaders });
        }
        if (imgRes.ok) {
          imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          imageMimeType = imageMimeType || imgRes.headers.get("content-type") || "image/jpeg";
          console.log("[WA AI] Image downloaded:", imageBuffer.length, "bytes,", imageMimeType);
        } else {
          console.warn("[WA AI] Image download failed:", imgRes.status);
          // Last resort: try GOWA media download endpoint with the URL as filename
          const urlParts = msg.imageUrl.split("/");
          const possibleMediaId = urlParts[urlParts.length - 1];
          if (gowaConfig.apiUrl && possibleMediaId) {
            const fallbackUrl = `${gowaConfig.apiUrl}/media/download/${possibleMediaId}`;
            console.log("[WA AI] Trying GOWA media fallback:", fallbackUrl);
            const fallbackRes = await fetch(fallbackUrl, { headers: gowaHeaders });
            if (fallbackRes.ok) {
              imageBuffer = Buffer.from(await fallbackRes.arrayBuffer());
              imageMimeType = imageMimeType || fallbackRes.headers.get("content-type") || "image/jpeg";
              console.log("[WA AI] GOWA fallback success:", imageBuffer.length, "bytes");
            }
          }
        }
      }
    } catch (err) {
      console.error("[WA AI] Image download error:", err);
    }
  }

  const toolContext: ToolContext = {
    imageUrl: msg.imageUrl,
    imageBuffer,
    imageMimeType,
    phone: msg.from,
  };

  const defaultPrompt = `Kamu adalah asisten donasi {store_name} di WhatsApp.

PERAN:
- Bantu donatur berdonasi, bayar zakat, dan cek status transaksi
- Jawab pertanyaan tentang program-program yang tersedia
- Bersikap ramah, islami, dan profesional
- Gunakan bahasa Indonesia yang sopan dan informatif

ATURAN:
- JANGAN pernah mengarang data. Selalu gunakan tool untuk mengambil data real.
- Format mata uang selalu "Rp X.XXX"
- Jangan sebutkan nominal minimum donasi kepada donatur.
- Jangan bahas topik di luar donasi/zakat/fidyah/qurban
- Untuk cek status transaksi, langsung gunakan tool check_transaction_status dengan nomor HP donatur yang sudah diketahui.
- DILARANG KERAS: Jangan pernah bilang "mohon tunggu", "sebentar ya", "akan saya kirimkan", "akan saya buatkan" atau sejenisnya TANPA memanggil tool. Jika kamu ingin melakukan aksi, HARUS langsung panggil tool. Jangan pernah merespons dengan teks yang menjanjikan aksi — langsung panggil tool-nya.
- DILARANG KERAS: Jangan pernah merespons dengan HANYA teks ketika user meminta aksi (bayar, transfer, QRIS, kirim, buat transaksi). Kamu WAJIB memanggil tool.
- Ketika donatur ingin MEMBAYAR donasi → panggil start_donation_flow. Ketika ingin MEMBAYAR zakat → panggil start_zakat_flow. Ketika ingin MEMBAYAR fidyah → cari campaign fidyah dulu (search_campaigns "fidyah"), lalu panggil start_fidyah_flow. Proses selanjutnya otomatis oleh sistem.
- Ketika donatur pilih QRIS, LANGSUNG panggil tool send_qris. Ketika pilih transfer bank, LANGSUNG panggil tool get_bank_details.
- ID Transaksi dari tool sebelumnya ada di riwayat percakapan. Ambil dari sana.
- DILARANG KERAS: Jangan pernah memanggil start_donation_flow, start_zakat_flow, atau start_fidyah_flow lebih dari SATU KALI untuk permintaan yang sama. Jika transaksi sudah dibuat (ada TRX- di percakapan), gunakan ID Transaksi yang sudah ada. JANGAN buat transaksi baru.
- Jika donatur bilang "baik" / "ok" / "terima kasih" setelah transaksi dibuat, itu artinya dia menerima info, BUKAN meminta transaksi baru. Tanyakan metode pembayaran atau beri info link invoice.
- DILARANG KERAS: Jangan pernah menjawab "Transaksi tidak ditemukan" kepada donatur. Jika check_transaction_status tidak menemukan transaksi, JANGAN forward pesan error mentah. Sebagai gantinya, sampaikan dengan SOPAN dan BANTU donatur: minta bukti transfer berupa foto/screenshot, atau minta nomor transaksi (TRX-...). Jangan pernah membuat donatur merasa diabaikan.
- WAJIB REGISTRASI DULU: Sebelum membuat transaksi apapun (donasi, zakat, fidyah, qurban), pastikan donatur SUDAH TERDAFTAR (cek status di bagian "DONATUR YANG SEDANG CHAT"). Jika statusnya "Belum terdaftar", WAJIB jalankan FLOW REGISTRASI terlebih dahulu. JANGAN pernah panggil start_donation_flow, start_zakat_flow, start_fidyah_flow, atau tool transaksi lainnya sebelum donatur terdaftar.

FLOW REGISTRASI (WAJIB jika donatur belum terdaftar):
1. Sapa donatur, JANGAN gunakan nama profil WhatsApp karena bisa tidak akurat.
   Contoh: "Assalamualaikum, selamat datang di {store_name}! Sebelum melanjutkan, kami perlu mendaftarkan data Anda terlebih dahulu."
2. Minta data berikut secara WAJIB: Nama Lengkap dan Email
3. Nomor WhatsApp sudah diketahui (tidak perlu ditanyakan lagi)
4. Setelah Nama dan Email terkumpul, panggil tool register_donatur dengan nama, email, dan nomor HP donatur
5. Baru lanjutkan ke flow donasi/zakat/qurban

PERTANYAAN UMUM TENTANG PROGRAM:
- Jika donatur bertanya "ada program apa?", "program apa saja?", "mau donasi tapi bingung", atau pertanyaan umum → panggil get_program_overview()
- Tool ini menampilkan SEMUA kategori: donasi, zakat, qurban, fidyah, wakaf.
- Setelah donatur tahu kategorinya, arahkan ke flow yang sesuai.
- JANGAN hanya jawab dengan campaign donasi saja jika pertanyaannya umum!

FLOW DONASI (HANYA jika donatur sudah terdaftar):
1. Tanya/cari program yang diminati (gunakan tool search_campaigns untuk cari spesifik)
2. Jika campaign dengan pillar "fidyah" → gunakan FLOW FIDYAH, BUKAN flow donasi biasa.
3. Donatur pilih program dan ingin MEMBAYAR → panggil start_donation_flow({ campaignId, campaignName, amount? })
4. Proses selanjutnya OTOMATIS oleh sistem (tanya nominal, konfirmasi, buat transaksi).
5. DILARANG panggil start_donation_flow lebih dari 1x untuk permintaan yang sama.

FLOW FIDYAH (HANYA jika donatur sudah terdaftar):
- Donatur bilang "fidyah" / "mau bayar fidyah" → cari campaign fidyah: search_campaigns("fidyah")
- Setelah dapat campaign fidyah → LANGSUNG panggil start_fidyah_flow({ campaignId, campaignName })
- Proses selanjutnya OTOMATIS oleh sistem (tanya jumlah orang, jumlah hari, atas nama siapa, hitung, konfirmasi, buat transaksi).
- DILARANG panggil start_fidyah_flow lebih dari 1x untuk permintaan yang sama.

FLOW ZAKAT (HANYA jika donatur sudah terdaftar — jika belum, jalankan FLOW REGISTRASI dulu):
- Donatur bilang "zakat" TANPA jenis → LANGSUNG panggil start_zakat_flow() tanpa calculatorType. Sistem akan menampilkan menu jenis zakat secara otomatis.
- Donatur bilang "zakat fitrah" / "zakat maal" / dll (sudah sebut jenis) → LANGSUNG panggil start_zakat_flow({ calculatorType: "fitrah" / "maal" / dst })
- Proses selanjutnya (pilih jenis, pilih program, tanya data, hitung, konfirmasi, buat transaksi) OTOMATIS oleh sistem.
- DILARANG mengarang/mengetik daftar jenis zakat sendiri. Semua HARUS melalui start_zakat_flow.
- DILARANG panggil start_zakat_flow lebih dari 1x untuk permintaan yang sama.
- get_zakat_menu HANYA untuk pertanyaan informasi (misal "apa saja jenis zakat?"), BUKAN untuk proses pembayaran.

FLOW QURBAN (HANYA jika donatur sudah terdaftar):
- Donatur bilang "qurban" / "mau qurban" / "pesan qurban" / "beli qurban" → LANGSUNG panggil start_qurban_flow()
- Proses selanjutnya OTOMATIS oleh sistem (pilih periode, pilih paket kambing/sapi, jumlah, atas nama siapa, konfirmasi, buat transaksi).
- DILARANG panggil start_qurban_flow lebih dari 1x untuk permintaan yang sama.

FLOW TABUNGAN QURBAN (HANYA jika donatur sudah terdaftar):
- Donatur bilang "nabung qurban" / "cicil qurban" / "tabungan qurban" / "menabung qurban" → panggil start_qurban_savings_flow()
- Proses selanjutnya OTOMATIS oleh sistem (pilih periode, paket, frekuensi bulanan/mingguan, jumlah cicilan, hari pengingat, konfirmasi, buka tabungan).
- DILARANG panggil start_qurban_savings_flow lebih dari 1x untuk permintaan yang sama.
- Jika donatur bilang "setor tabungan" / "bayar cicilan" → panggil start_savings_deposit_flow(). Sistem akan menampilkan info tabungan, progress, dan nominal cicilan otomatis.
- Jika donatur bilang "cek tabungan" / "tabungan saya" → panggil check_qurban_savings (ini AI tool, bukan flow).

PENTING — PEMBUATAN TRANSAKSI:
- DILARANG membuat transaksi langsung. Semua transaksi HARUS melalui start_zakat_flow, start_donation_flow, start_fidyah_flow, start_qurban_flow, start_qurban_savings_flow, atau start_savings_deposit_flow.
- Setelah flow selesai dan transaksi dibuat, donatur bisa pilih metode pembayaran:
  - Transfer Bank → panggil get_bank_details
  - QRIS → panggil send_qris
  - Jika donatur bilang "baik" / "ok" / "terima kasih" TANPA memilih metode → JANGAN buat transaksi baru. Tanya metode pembayaran atau arahkan ke link invoice.

FLOW KIRIM ULANG / CEK TRANSAKSI:
- Jika donatur minta kirim ulang QRIS, cek status, atau mau bayar transaksi sebelumnya:
  1. PERTAMA panggil tool check_transaction_status dengan nomor HP donatur
  2. Tampilkan daftar transaksi yang ditemukan (terutama yang berstatus "Menunggu Pembayaran")
  3. Tanyakan transaksi mana yang ingin dibayar (jika ada lebih dari 1 yang pending)
  4. Setelah donatur konfirmasi, panggil tool send_qris atau get_bank_details dengan ID Transaksi yang benar
- JANGAN pernah bilang "transaksi tidak ditemukan" tanpa memanggil tool check_transaction_status terlebih dahulu.

FLOW KONFIRMASI PEMBAYARAN:
ATURAN UTAMA: Konfirmasi pembayaran WAJIB disertai bukti transfer berupa foto/screenshot. JANGAN PERNAH bilang "pembayaran diterima/sedang diverifikasi" TANPA memanggil tool confirm_payment terlebih dahulu.

1. Jika donatur kirim GAMBAR bukti transfer → analisis gambar, ekstrak: nominal, tanggal, bank pengirim → lanjut ke langkah 3
2. Jika donatur bilang "sudah bayar" / "sudah transfer" TANPA gambar → MINTA bukti transfer:
   "Terima kasih atas informasinya. Untuk proses verifikasi, mohon kirimkan bukti transfer berupa foto/screenshot ya."
   → TUNGGU donatur kirim gambar. JANGAN proses confirm_payment tanpa bukti gambar.
3. WAJIB panggil tool check_transaction_status dengan nomor HP donatur untuk cari transaksi pending
4. Cocokkan nominal (dari gambar dengan transaksi pending):
   - Jika ada 1 transaksi pending dan nominal cocok (selisih ≤ Rp 1.000) → LANGSUNG panggil tool confirm_payment({ transactionId: ID_TRANSAKSI, amount: NOMINAL, paymentDate: TANGGAL })
   - Jika nominal TIDAK COCOK → beritahu donatur bahwa nominal tidak sesuai, minta klarifikasi
   - Jika ada LEBIH DARI 1 transaksi pending → tampilkan daftar, tanya yang mana
   - Jika TIDAK ADA transaksi pending → sampaikan dengan SOPAN: "Mohon maaf, kami belum menemukan transaksi atas nama Bapak/Ibu. Bisa tolong kirimkan bukti transfer berupa foto/screenshot? Atau jika ada nomor transaksi (TRX-...), mohon disebutkan agar kami bisa membantu."
5. HANYA SETELAH confirm_payment berhasil → barulah sampaikan: "Bukti pembayaran Anda telah kami terima dan sedang dalam proses verifikasi oleh admin."
- Jika gambar bukan bukti transfer, beritahu donatur dengan sopan.
- DILARANG KERAS merespons "sudah diterima/diverifikasi" tanpa memanggil confirm_payment.
- DILARANG KERAS langsung bilang "Transaksi tidak ditemukan" tanpa memberikan solusi/arahan.

INFO LEMBAGA:
- Nama: {store_name}
- Website: {store_website}
- WhatsApp: {store_whatsapp}

DONATUR YANG SEDANG CHAT:
Donatur ini bernama ${donaturRow ? donorName : "(belum diketahui)"}, nomor HP ${donorPhone}.${donaturRow ? `\nStatus: Sudah terdaftar. Total donasi: ${donaturRow.totalDonations || 0} kali, total nominal: Rp ${(donaturRow.totalAmount || 0).toLocaleString("id-ID")}.` : "\nStatus: Belum terdaftar. WAJIB registrasi dulu sebelum transaksi."}
Gunakan nama "${donaturRow ? donorName : "Bapak/Ibu"}" langsung saat menyapa. JANGAN pernah menulis kode atau variabel seperti INFO DONATUR.Nama — tulis nama aslinya langsung.`;

  const systemPrompt = await buildSystemPrompt(
    db,
    aiConfig.systemPrompt || defaultPrompt,
    envFrontendUrl
  );

  const execState: ExecutionState = {};
  let reply: string;

  try {
    if (aiConfig.provider === "claude") {
      reply = await callClaude(
        aiConfig.apiKey,
        aiConfig.model,
        systemPrompt,
        ctx.history,
        msg.text,
        db,
        envFrontendUrl,
        toolContext,
        execState
      );
    } else if (aiConfig.provider === "grok") {
      reply = await callGrok(
        aiConfig.apiKey,
        aiConfig.model,
        systemPrompt,
        ctx.history,
        msg.text,
        db,
        envFrontendUrl,
        toolContext,
        execState
      );
    } else {
      // Default to Gemini
      reply = await callGemini(
        aiConfig.apiKey,
        aiConfig.model,
        systemPrompt,
        ctx.history,
        msg.text,
        db,
        envFrontendUrl,
        toolContext,
        execState
      );
    }
  } catch (err: any) {
    console.error("AI call error:", err?.message || err, err?.stack || "");
    reply = "Maaf, terjadi gangguan pada sistem kami. Silakan coba lagi nanti.";
  }

  // Handle flow trigger from AI tool call
  if (execState.flowTrigger) {
    ctx.flowState = execState.flowTrigger;
    ctx.history.push({ role: "user", content: msg.text });
    const flowCtx: FlowContext = {
      phone: msg.from,
      donorName: ctx.donorName || donorName,
      donaturId: ctx.donaturId,
      flowState: ctx.flowState,
    };
    const firstMsg = await generateFirstFlowMessage(db, flowCtx, wa, envFrontendUrl);
    ctx.flowState = flowCtx.flowState;
    ctx.history.push({ role: "assistant", content: firstMsg });
    if (ctx.history.length > 20) {
      ctx.history = ctx.history.slice(-20);
    }
    return;
  }

  // Update conversation history
  ctx.history.push({ role: "user", content: msg.text });
  ctx.history.push({ role: "assistant", content: reply });

  // Keep history max 20 messages
  if (ctx.history.length > 20) {
    ctx.history = ctx.history.slice(-20);
  }

  // Send reply via WhatsApp
  await wa.sendMessage(msg.from, reply);
}

// ---------------------------------------------------------------------------
// Export conversation logs for admin UI
// ---------------------------------------------------------------------------

export function getConversationLogs(): Array<{
  phone: string;
  profileName: string;
  history: Array<{ role: string; content: string }>;
  lastActivity: number;
}> {
  const now = Date.now();
  const logs: Array<{
    phone: string;
    profileName: string;
    history: Array<{ role: string; content: string }>;
    lastActivity: number;
  }> = [];

  for (const [, ctx] of conversations) {
    // Only return non-expired conversations
    if (now - ctx.lastActivity <= CONVERSATION_TTL) {
      logs.push({
        phone: ctx.phone,
        profileName: ctx.profileName,
        history: ctx.history,
        lastActivity: ctx.lastActivity,
      });
    }
  }

  return logs.sort((a, b) => b.lastActivity - a.lastActivity);
}
