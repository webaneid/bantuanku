import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  GatewayCredentials,
} from "./types";
import { timingSafeEqualString } from "../../lib/security";

/** Header `timestamp` iPaymu: YYYYMMDDHHmmss (UTC, sesuai contoh resmi). */
export function ipaymuTimestamp(): string {
  return new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
}

/** iPaymu mengirim waktu kedaluwarsa sebagai string WIB tanpa zona ("2026-10-24 23:03:23"). */
export function parseIpaymuExpired(value?: string): Date | undefined {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(" ", "T") + "+07:00" : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export interface IpaymuChannel {
  /** nilai untuk `paymentMethod:paymentChannel`, mis. "va:bni" */
  id: string;
  code: string;
  name: string;
  logo?: string;
}

export interface IpaymuChannelGroup {
  code: string;
  name: string;
  channels: IpaymuChannel[];
}

// Hanya kelompok yang alur bayarnya sudah didukung (VA, QRIS, e-wallet, minimarket)
const SUPPORTED_GROUPS = ["va", "qris", "ewallet", "cstore"];

const FALLBACK_CHANNELS: IpaymuChannelGroup[] = [
  {
    code: "va",
    name: "Virtual Account",
    channels: ["bca", "bni", "bri", "mandiri", "cimb", "permata"].map((code) => ({
      id: `va:${code}`,
      code,
      name: code.toUpperCase(),
    })),
  },
  { code: "qris", name: "QRIS", channels: [{ id: "qris:qris", code: "qris", name: "QRIS" }] },
  {
    code: "ewallet",
    name: "E-Wallet",
    channels: [{ id: "ewallet:dana", code: "dana", name: "DANA" }],
  },
  {
    code: "cstore",
    name: "Minimarket",
    channels: ["alfamart", "indomaret"].map((code) => ({ id: `cstore:${code}`, code, name: code[0].toUpperCase() + code.slice(1) })),
  },
];

const CHANNEL_CACHE_TTL_MS = 10 * 60 * 1000;
const CHANNEL_FALLBACK_TTL_MS = 60 * 1000;
const channelCache = new Map<string, { expiresAt: number; groups: IpaymuChannelGroup[] }>();

export class IPaymuAdapter implements PaymentGatewayAdapter {
  code = "ipaymu";
  private va: string;
  private apiKey: string;
  private isProduction: boolean;

  constructor(credentials: GatewayCredentials, isProduction = false) {
    this.va = credentials.merchantId || "";
    this.apiKey = credentials.secretKey || "";
    this.isProduction = isProduction;
  }

  private get baseUrl() {
    return this.isProduction
      ? "https://my.ipaymu.com/api/v2"
      : "https://sandbox.ipaymu.com/api/v2";
  }

  /**
   * Generate HMAC SHA256 signature for iPaymu API
   */
  private async generateSignature(
    method: string,
    bodyJson: string
  ): Promise<string> {
    const encoder = new TextEncoder();

    // Step 1: Hash the request body with SHA256
    const bodyData = encoder.encode(bodyJson);
    const bodyHashBuffer = await crypto.subtle.digest("SHA-256", bodyData);
    const bodyHashArray = Array.from(new Uint8Array(bodyHashBuffer));
    const bodyHash = bodyHashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase();

    // Step 2: Create string to sign
    const stringToSign = `${method}:${this.va}:${bodyHash}:${this.apiKey}`;

    // Step 3: Generate HMAC SHA256 signature
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.apiKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(stringToSign)
    );

    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signature;
  }

  private async buildHeaders(method: string, bodyJson: string): Promise<Record<string, string>> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      va: this.va,
      signature: await this.generateSignature(method, bodyJson),
      timestamp: ipaymuTimestamp(),
    };
  }

  /**
   * Daftar channel aktif merchant dari iPaymu (GET /payment-channels), di-cache 10 menit.
   * Gagal/lambat -> daftar bawaan (cache 1 menit) supaya halaman bayar tetap tampil.
   */
  async getChannels(): Promise<IpaymuChannelGroup[]> {
    const cacheKey = `${this.isProduction ? "prod" : "sandbox"}:${this.va}`;
    const cached = channelCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.groups;

    try {
      // Signature GET memakai hash dari body "{}" (body kosong ditolak iPaymu)
      const response = await fetch(`${this.baseUrl}/payment-channels`, {
        method: "GET",
        headers: await this.buildHeaders("GET", "{}"),
        signal: AbortSignal.timeout(8_000),
      });
      const result = (await response.json()) as {
        Success?: boolean;
        Data?: Array<{
          Code: string;
          Name: string;
          Channels?: Array<{ Code: string; Name: string; Logo?: string }>;
        }>;
      };

      if (!result.Success || !Array.isArray(result.Data)) throw new Error("respons channel tidak valid");

      const groups: IpaymuChannelGroup[] = result.Data
        .filter((g) => SUPPORTED_GROUPS.includes(g.Code) && (g.Channels || []).length > 0)
        .sort((a, b) => SUPPORTED_GROUPS.indexOf(a.Code) - SUPPORTED_GROUPS.indexOf(b.Code))
        .map((g) => ({
          code: g.Code,
          name: g.Name,
          channels: (g.Channels || []).map((ch) => ({
            // QRIS: kode channel iPaymu "mpm", tetapi Direct Payment yang terbukti memakai "qris:qris"
            id: g.Code === "qris" ? "qris:qris" : `${g.Code}:${ch.Code}`,
            code: ch.Code,
            name: ch.Name,
            logo: ch.Logo,
          })),
        }));

      if (groups.length === 0) throw new Error("tidak ada channel yang didukung");

      channelCache.set(cacheKey, { expiresAt: Date.now() + CHANNEL_CACHE_TTL_MS, groups });
      return groups;
    } catch (err) {
      console.error("iPaymu payment-channels gagal, memakai daftar bawaan:", err instanceof Error ? err.message : err);
      channelCache.set(cacheKey, { expiresAt: Date.now() + CHANNEL_FALLBACK_TTL_MS, groups: FALLBACK_CHANNELS });
      return FALLBACK_CHANNELS;
    }
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const referenceId = `DNT-${request.donationId}-${Date.now()}`;
    const expiryHours = Math.ceil((request.expiryMinutes || 1440) / 60);

    // Determine payment method and channel from methodCode
    const { paymentMethod, paymentChannel } =
      this.parseMethodCode(request.methodCode);

    // IMPORTANT: Ensure amount is a number (not string)
    const amount = Number(request.amount);

    // Build request body
    const body = {
      account: this.va,
      name: request.donorName,
      email: request.donorEmail || "donor@example.com",
      phone: request.donorPhone || "08123456789",
      amount: amount,
      notifyUrl: `${process.env.API_URL || process.env.APP_URL || "http://localhost:50245"}/v1/payments/ipaymu/webhook`,
      expired: expiryHours,
      referenceId,
      paymentMethod,
      paymentChannel,
      product: [`Donation #${request.donationId}`],
      qty: [1],
      price: [amount],
    };

    try {
      const bodyJson = JSON.stringify(body);

      const response = await fetch(`${this.baseUrl}/payment/direct`, {
        method: "POST",
        headers: await this.buildHeaders("POST", bodyJson),
        body: bodyJson,
        // Tanpa timeout, gangguan di sisi iPaymu (mis. VA sandbox) membuat request checkout menggantung
        signal: AbortSignal.timeout(30_000),
      });

      const result = (await response.json()) as {
        Success?: boolean;
        Data?: {
          ReferenceId?: string;
          PaymentNo?: string;
          PaymentName?: string;
          Via?: string;
          Channel?: string;
          QrImage?: string;
          QrString?: string;
          PaymentUrl?: string;
          Url?: string;
          Expired?: string;
          Fee?: number;
          Total?: number;
        };
        Message?: string;
      };

      if (result.Success && result.Data) {
        const data = result.Data;

        return {
          success: true,
          externalId: data.ReferenceId,
          paymentCode: data.PaymentNo,
          // Url hanya ada untuk e-wallet (alihkan ke aplikasi/halaman e-wallet)
          paymentUrl: data.PaymentUrl || data.Url,
          qrCode: data.QrString || data.QrImage,
          expiredAt: parseIpaymuExpired(data.Expired),
        };
      }

      console.error("iPaymu create payment gagal:", result.Message);

      return {
        success: false,
        error: result.Message || "Payment creation failed",
      };
    } catch (err) {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        return { success: false, error: "iPaymu tidak merespons (timeout 30 detik), coba lagi atau pilih metode lain" };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Parse method code to iPaymu payment method and channel
   * Supports two formats:
   * 1. "method:channel" format (e.g., "va:bca", "qris:qris", "cstore:gopay")
   * 2. Legacy format (e.g., "bca_va", "qris", "gopay")
   */
  private parseMethodCode(methodCode: string): {
    paymentMethod: string;
    paymentChannel: string;
  } {
    // Check if it's already in "method:channel" format
    if (methodCode.includes(":")) {
      const [method, channel] = methodCode.split(":");
      return { paymentMethod: method, paymentChannel: channel };
    }

    // Legacy format handling
    if (methodCode.includes("_va")) {
      // Virtual Account (e.g., "bca_va")
      const channel = methodCode.replace("_va", "");
      return { paymentMethod: "va", paymentChannel: channel };
    } else if (methodCode === "qris") {
      // QRIS
      return { paymentMethod: "qris", paymentChannel: "qris" };
    } else if (["gopay", "ovo", "dana", "linkaja", "shopeepay", "alfamart", "indomaret"].includes(methodCode)) {
      // E-wallet & Convenience Store
      return { paymentMethod: "cstore", paymentChannel: methodCode };
    } else if (methodCode === "credit_card" || methodCode === "cc") {
      // Credit card
      return { paymentMethod: "cc", paymentChannel: "cc" };
    } else if (methodCode === "online") {
      // Debit online
      return { paymentMethod: "online", paymentChannel: "online" };
    } else if (methodCode === "cod") {
      // Cash on delivery
      return { paymentMethod: "cod", paymentChannel: "cod" };
    }

    // Default to QRIS
    return { paymentMethod: "qris", paymentChannel: "qris" };
  }

  /**
   * Validasi X-Signature callback iPaymu (docs.ipaymu.com/id/docs/callback):
   * normalisasi tipe -> urutkan key A-Z -> JSON -> HMAC-SHA256 hex dengan nomor VA sebagai kunci.
   * Dokumen tidak menyebut apakah JSON ditandatangani dengan "/" di-escape (gaya PHP json_encode),
   * jadi beberapa varian serialisasi dicoba; cocok dengan salah satu = valid.
   */
  async verifyWebhook(payload: WebhookPayload, signature?: string): Promise<boolean> {
    if (!signature || !this.va) return false;

    try {
      const normalized = normalizeCallbackPayload(payload);
      const plain = JSON.stringify(normalized);
      const phpSlashes = plain.replace(/\//g, "\\/");
      const phpFull = phpSlashes.replace(/[\u0080-\uffff]/g, (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"));

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(this.va),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const received = signature.trim().toLowerCase();
      for (const candidate of new Set([plain, phpSlashes, phpFull])) {
        const buffer = await crypto.subtle.sign("HMAC", key, encoder.encode(candidate));
        const hex = Array.from(new Uint8Array(buffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (timingSafeEqualString(hex, received)) return true;
      }
      return false;
    } catch (err) {
      console.error("Error verifying iPaymu webhook signature:", err);
      return false;
    }
  }

  /**
   * Cek status transaksi ke iPaymu (POST /transaction). Dipakai sebagai konfirmasi server-to-server
   * bila signature callback tidak valid: callback "berhasil" hanya dipercaya jika iPaymu sendiri
   * menyatakan transaksi itu sukses dan reference_id-nya sama.
   */
  async confirmWebhook(payload: WebhookPayload): Promise<boolean> {
    const status = Number(payload.status_code);
    const trxId = payload.trx_id;
    const referenceId = payload.reference_id ?? payload.referenceId;
    if (status !== 1 || !trxId) return false;

    try {
      const bodyJson = JSON.stringify({ transactionId: String(trxId) });
      const response = await fetch(`${this.baseUrl}/transaction`, {
        method: "POST",
        headers: await this.buildHeaders("POST", bodyJson),
        body: bodyJson,
        signal: AbortSignal.timeout(15_000),
      });
      const result = (await response.json()) as {
        Success?: boolean;
        Data?: { Status?: number; ReferenceId?: string | null };
      };

      const trxStatus = result.Data?.Status;
      const successful = result.Success === true && (trxStatus === 1 || trxStatus === 6);
      // ReferenceId wajib ada dan sama: tanpa ini, transaksi sukses milik orang lain (mis. ReferenceId
      // kosong) bisa dipasangkan dengan reference_id pembayaran yang masih pending
      const sameReference = !!referenceId && result.Data?.ReferenceId === String(referenceId);
      return successful && sameReference;
    } catch (err) {
      console.error("iPaymu check transaction gagal:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  parseWebhook(payload: WebhookPayload): {
    externalId: string;
    status: "success" | "failed" | "expired";
    paidAt?: Date;
  } {
    // Format callback: reference_id, status ("berhasil"/"pending"/"expired"), status_code (1/0/-2)
    const referenceId = String(payload.reference_id ?? payload.referenceId ?? "");
    const status = String(payload.status ?? "").toLowerCase();
    const statusCode = payload.status_code !== undefined ? Number(payload.status_code) : undefined;

    let parsedStatus: "success" | "failed" | "expired" = "failed";

    if (statusCode === 1 || status === "berhasil" || status === "success" || status === "paid") {
      parsedStatus = "success";
    } else if (statusCode === -2 || status === "expired" || status === "kadaluarsa") {
      parsedStatus = "expired";
    }

    return {
      externalId: referenceId,
      status: parsedStatus,
      paidAt: parsedStatus === "success" ? new Date() : undefined,
    };
  }
}

const CALLBACK_INT_FIELDS = ["trx_id", "status_code", "transaction_status_code", "paid_off"];

/** Normalisasi tipe callback sesuai dokumen iPaymu sebelum menghitung signature; key diurutkan A-Z. */
function normalizeCallbackPayload(payload: WebhookPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(payload).sort()) {
    const value = payload[key];
    if (CALLBACK_INT_FIELDS.includes(key)) {
      out[key] = Number(value);
    } else if (key === "is_escrow") {
      out[key] = value === true || value === "true" || value === "1" || value === 1;
    } else if (key === "additional_info") {
      if (Array.isArray(value)) out[key] = value;
      else {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : [];
          out[key] = Array.isArray(parsed) ? parsed : [];
        } catch {
          out[key] = [];
        }
      }
    } else {
      out[key] = value === null || value === undefined ? value : String(value);
    }
  }
  if (!("additional_info" in out)) out.additional_info = [];
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
