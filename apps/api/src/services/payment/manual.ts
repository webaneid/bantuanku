import type { PaymentGatewayAdapter, PaymentRequest, PaymentResponse, WebhookPayload } from "./types";

export class ManualAdapter implements PaymentGatewayAdapter {
  code = "manual";

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const externalId = `MNL-${request.donationId}-${Date.now()}`;
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 48);

    return {
      success: true,
      externalId,
      expiredAt,
    };
  }

  async verifyWebhook(): Promise<boolean> {
    return true;
  }

  parseWebhook(payload: WebhookPayload): { externalId: string; status: "success" | "failed" | "expired"; paidAt?: Date } {
    return {
      externalId: payload.externalId as string,
      status: payload.status as "success" | "failed" | "expired",
      paidAt: payload.status === "success" ? new Date() : undefined,
    };
  }
}
