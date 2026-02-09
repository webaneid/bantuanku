import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  GatewayCredentials,
} from "./types";

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
      ? "https://app.ipaymu.com/api/v2"
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

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const referenceId = `DNT-${request.donationId}-${Date.now()}`;
    const expiryHours = Math.ceil((request.expiryMinutes || 1440) / 60);

    // Determine payment method and channel from methodCode
    const { paymentMethod, paymentChannel } =
      this.parseMethodCode(request.methodCode);

    // IMPORTANT: Ensure amount is a number (not string)
    const amount = Number(request.amount);

    console.log('===== iPay mu Payment Creation Debug =====');
    console.log('Donation ID:', request.donationId);
    console.log('Request Amount (original):', request.amount);
    console.log('Request Amount (type):', typeof request.amount);
    console.log('Amount (converted to number):', amount);
    console.log('Payment Method:', paymentMethod);
    console.log('Payment Channel:', paymentChannel);

    // Build request body
    const body = {
      account: this.va,
      name: request.donorName,
      email: request.donorEmail || "donor@bantuanku.org",
      phone: request.donorPhone || "08123456789",
      amount: amount,
      notifyUrl: `${process.env.APP_URL || "http://localhost:50245"}/v1/webhooks/ipaymu`,
      expired: expiryHours,
      referenceId,
      paymentMethod,
      paymentChannel,
      product: [`Donation #${request.donationId}`],
      qty: [1],
      price: [amount],
    };

    console.log('Request Body to iPay mu:', JSON.stringify(body, null, 2));

    try {
      const bodyJson = JSON.stringify(body);
      const signature = await this.generateSignature("POST", bodyJson);

      const response = await fetch(`${this.baseUrl}/payment/direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          va: this.va,
          signature,
        },
        body: bodyJson,
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
          Expired?: string;
          Fee?: number;
          Total?: number;
        };
        Message?: string;
      };

      console.log('iPay mu Response:', JSON.stringify(result, null, 2));

      if (result.Success && result.Data) {
        const data = result.Data;
        const expiredAt = data.Expired ? new Date(data.Expired) : undefined;

        console.log('iPay mu Success - Fee:', data.Fee);
        console.log('iPay mu Success - Total:', data.Total);
        console.log('===== End iPay mu Debug =====');

        return {
          success: true,
          externalId: data.ReferenceId,
          paymentCode: data.PaymentNo,
          paymentUrl: data.PaymentUrl,
          qrCode: data.QrString || data.QrImage,
          expiredAt,
        };
      }

      console.log('iPay mu Error:', result.Message);
      console.log('===== End iPay mu Debug =====');

      return {
        success: false,
        error: result.Message || "Payment creation failed",
      };
    } catch (err) {
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

  async verifyWebhook(payload: WebhookPayload, signature?: string): Promise<boolean> {
    if (!signature) return false;

    try {
      const encoder = new TextEncoder();
      const bodyJson = JSON.stringify(payload);

      // Generate HMAC SHA256 signature and encode to base64
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
        encoder.encode(bodyJson)
      );

      // Convert to base64
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const binaryString = String.fromCharCode(...signatureArray);
      const computedSignature = btoa(binaryString);

      return computedSignature === signature;
    } catch (err) {
      console.error("Error verifying iPaymu webhook signature:", err);
      return false;
    }
  }

  parseWebhook(payload: WebhookPayload): {
    externalId: string;
    status: "success" | "failed" | "expired";
    paidAt?: Date;
  } {
    const referenceId = payload.referenceId as string;
    const status = (payload.status as string)?.toLowerCase();

    let parsedStatus: "success" | "failed" | "expired" = "failed";

    if (status === "success" || status === "paid" || status === "berhasil") {
      parsedStatus = "success";
    } else if (status === "expired" || status === "kadaluarsa") {
      parsedStatus = "expired";
    }

    return {
      externalId: referenceId,
      status: parsedStatus,
      paidAt: parsedStatus === "success" ? new Date() : undefined,
    };
  }
}
