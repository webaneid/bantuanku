import type { PaymentGatewayAdapter, PaymentRequest, PaymentResponse, WebhookPayload, GatewayCredentials } from "./types";

export class MidtransAdapter implements PaymentGatewayAdapter {
  code = "midtrans";
  private serverKey: string;
  private isProduction: boolean;

  constructor(credentials: GatewayCredentials, isProduction = false) {
    this.serverKey = credentials.serverKey || "";
    this.isProduction = isProduction;
  }

  private get baseUrl() {
    return this.isProduction
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com";
  }

  private get authHeader() {
    return `Basic ${btoa(this.serverKey + ":")}`;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const orderId = `DNT-${request.donationId}-${Date.now()}`;
    const expiryMinutes = request.expiryMinutes || 1440;

    const payload: Record<string, unknown> = {
      transaction_details: {
        order_id: orderId,
        gross_amount: request.amount,
      },
      customer_details: {
        first_name: request.donorName,
        email: request.donorEmail || undefined,
        phone: request.donorPhone || undefined,
      },
      expiry: {
        unit: "minutes",
        duration: expiryMinutes,
      },
    };

    if (request.methodCode.includes("va")) {
      const bankCode = request.methodCode.replace("_va", "");
      payload.payment_type = "bank_transfer";
      payload.bank_transfer = { bank: bankCode };
    } else if (request.methodCode === "gopay") {
      payload.payment_type = "gopay";
    } else if (request.methodCode === "qris") {
      payload.payment_type = "qris";
    }

    try {
      const response = await fetch(`${this.baseUrl}/v2/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as Record<string, unknown>;

      if (data.status_code === "201" || data.status_code === "200") {
        const expiredAt = new Date();
        expiredAt.setMinutes(expiredAt.getMinutes() + expiryMinutes);

        let paymentCode = "";
        if (data.va_numbers && Array.isArray(data.va_numbers) && data.va_numbers.length > 0) {
          paymentCode = (data.va_numbers[0] as Record<string, string>).va_number;
        } else if (data.permata_va_number) {
          paymentCode = data.permata_va_number as string;
        }

        return {
          success: true,
          externalId: orderId,
          paymentCode,
          paymentUrl: (data.actions as Record<string, string>[])?.[0]?.url,
          qrCode: data.qr_string as string,
          expiredAt,
        };
      }

      return {
        success: false,
        error: (data.status_message as string) || "Payment creation failed",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async verifyWebhook(payload: WebhookPayload, signature?: string): Promise<boolean> {
    if (!signature) return false;

    const orderId = payload.order_id as string;
    const statusCode = payload.status_code as string;
    const grossAmount = payload.gross_amount as string;

    const rawSignature = orderId + statusCode + grossAmount + this.serverKey;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawSignature);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return computedSignature === signature;
  }

  parseWebhook(payload: WebhookPayload): { externalId: string; status: "success" | "failed" | "expired"; paidAt?: Date } {
    const transactionStatus = payload.transaction_status as string;
    const fraudStatus = payload.fraud_status as string;

    let status: "success" | "failed" | "expired" = "failed";

    if (transactionStatus === "capture" && fraudStatus === "accept") {
      status = "success";
    } else if (transactionStatus === "settlement") {
      status = "success";
    } else if (transactionStatus === "expire") {
      status = "expired";
    }

    return {
      externalId: payload.order_id as string,
      status,
      paidAt: status === "success" ? new Date() : undefined,
    };
  }
}
