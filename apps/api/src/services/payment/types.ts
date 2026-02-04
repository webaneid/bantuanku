export interface PaymentRequest {
  donationId: string;
  amount: number;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  methodCode: string;
  expiryMinutes?: number;
}

export interface PaymentResponse {
  success: boolean;
  externalId?: string;
  paymentCode?: string;
  paymentUrl?: string;
  qrCode?: string;
  expiredAt?: Date;
  error?: string;
}

export interface WebhookPayload {
  [key: string]: unknown;
}

export interface PaymentGatewayAdapter {
  code: string;
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyWebhook(payload: WebhookPayload, signature?: string): Promise<boolean>;
  parseWebhook(payload: WebhookPayload): {
    externalId: string;
    status: "success" | "failed" | "expired";
    paidAt?: Date;
  };
}

export interface GatewayCredentials {
  serverKey?: string;
  clientKey?: string;
  secretKey?: string;
  publicKey?: string;
  callbackToken?: string;
  merchantId?: string;
}
