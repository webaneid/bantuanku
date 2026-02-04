import type { PaymentGatewayAdapter, PaymentRequest, PaymentResponse, WebhookPayload, GatewayCredentials } from "./types";

export class XenditAdapter implements PaymentGatewayAdapter {
  code = "xendit";
  private secretKey: string;
  private callbackToken: string;

  constructor(credentials: GatewayCredentials) {
    this.secretKey = credentials.secretKey || "";
    this.callbackToken = credentials.callbackToken || "";
  }

  private get authHeader() {
    return `Basic ${btoa(this.secretKey + ":")}`;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const externalId = `DNT-${request.donationId}-${Date.now()}`;
    const expiryMinutes = request.expiryMinutes || 1440;
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + expiryMinutes);

    try {
      if (request.methodCode.includes("va")) {
        return await this.createVA(request, externalId, expiredAt);
      } else if (["ovo", "dana", "linkaja", "shopeepay"].includes(request.methodCode)) {
        return await this.createEwallet(request, externalId, expiredAt);
      } else if (request.methodCode === "qris") {
        return await this.createQris(request, externalId, expiredAt);
      }

      return { success: false, error: "Unsupported payment method" };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  private async createVA(request: PaymentRequest, externalId: string, expiredAt: Date): Promise<PaymentResponse> {
    const bankCode = request.methodCode.replace("_va", "").toUpperCase();

    const response = await fetch("https://api.xendit.co/callback_virtual_accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        external_id: externalId,
        bank_code: bankCode,
        name: request.donorName.substring(0, 50),
        expected_amount: request.amount,
        expiration_date: expiredAt.toISOString(),
        is_single_use: true,
      }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.id) {
      return {
        success: true,
        externalId: data.id as string,
        paymentCode: data.account_number as string,
        expiredAt,
      };
    }

    return { success: false, error: (data.message as string) || "VA creation failed" };
  }

  private async createEwallet(request: PaymentRequest, externalId: string, expiredAt: Date): Promise<PaymentResponse> {
    const channelCode = request.methodCode.toUpperCase();

    const response = await fetch("https://api.xendit.co/ewallets/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        reference_id: externalId,
        currency: "IDR",
        amount: request.amount,
        checkout_method: "ONE_TIME_PAYMENT",
        channel_code: `ID_${channelCode}`,
        channel_properties: {
          mobile_number: request.donorPhone,
          success_redirect_url: "https://bantuanku.org/donation/success",
          failure_redirect_url: "https://bantuanku.org/donation/failed",
        },
      }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.id) {
      const actions = data.actions as Record<string, string>;
      return {
        success: true,
        externalId: data.id as string,
        paymentUrl: actions?.mobile_deeplink_checkout_url || actions?.desktop_web_checkout_url,
        expiredAt,
      };
    }

    return { success: false, error: (data.message as string) || "E-wallet creation failed" };
  }

  private async createQris(request: PaymentRequest, externalId: string, expiredAt: Date): Promise<PaymentResponse> {
    const response = await fetch("https://api.xendit.co/qr_codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        reference_id: externalId,
        type: "DYNAMIC",
        currency: "IDR",
        amount: request.amount,
        expires_at: expiredAt.toISOString(),
      }),
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.id) {
      return {
        success: true,
        externalId: data.id as string,
        qrCode: data.qr_string as string,
        expiredAt,
      };
    }

    return { success: false, error: (data.message as string) || "QRIS creation failed" };
  }

  async verifyWebhook(payload: WebhookPayload, signature?: string): Promise<boolean> {
    if (!signature || !this.callbackToken) return false;
    return signature === this.callbackToken;
  }

  parseWebhook(payload: WebhookPayload): { externalId: string; status: "success" | "failed" | "expired"; paidAt?: Date } {
    const status = payload.status as string;
    const externalId = (payload.external_id || payload.reference_id || payload.id) as string;

    let parsedStatus: "success" | "failed" | "expired" = "failed";

    if (status === "PAID" || status === "SETTLED" || status === "SUCCEEDED" || status === "COMPLETED") {
      parsedStatus = "success";
    } else if (status === "EXPIRED") {
      parsedStatus = "expired";
    }

    return {
      externalId,
      status: parsedStatus,
      paidAt: parsedStatus === "success" ? new Date() : undefined,
    };
  }
}
