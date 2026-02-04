import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  GatewayCredentials,
} from "./types";

export class FlipAdapter implements PaymentGatewayAdapter {
  code = "flip";
  private secretKey: string;
  private validationToken: string;
  private isProduction: boolean;

  constructor(credentials: GatewayCredentials, isProduction = false) {
    this.secretKey = credentials.secretKey || "";
    this.validationToken = credentials.merchantId || ""; // Using merchantId field for validation token
    this.isProduction = isProduction;
  }

  private get baseUrl() {
    return this.isProduction
      ? "https://bigflip.id/api/v2"
      : "https://bigflip.id/big_sandbox_api/v2";
  }

  /**
   * Generate Basic Auth header for Flip API
   * Format: Base64(secretKey + ":")
   */
  private generateAuthHeader(): string {
    const authString = `${this.secretKey}:`;
    // Convert to base64
    const encoder = new TextEncoder();
    const data = encoder.encode(authString);
    const binaryString = String.fromCharCode(...data);
    const base64 = btoa(binaryString);
    return `Basic ${base64}`;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const referenceId = `DNT-${request.donationId}-${Date.now()}`;

    // Calculate expiry in hours (Flip uses expired_date)
    const expiryMinutes = request.expiryMinutes || 1440; // Default 24 hours
    const expiredDate = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Build request body for Flip PWF (Payment Without Form) API
    const formData = new URLSearchParams({
      title: `Donasi #${request.donationId}`,
      type: "SINGLE", // Single-use payment link
      amount: request.amount.toString(),
      step: "3", // Step 3 = Direct API payment (creates transaction immediately)
      sender_name: request.donorName || "Donor",
      sender_email: request.donorEmail || "donor@bantuanku.org",
      sender_phone_number: request.donorPhone || "08123456789",
      expired_date: expiredDate.toISOString(),
    });

    try {
      const authHeader = this.generateAuthHeader();

      const response = await fetch(`${this.baseUrl}/pwf/bill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: authHeader,
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Flip API error: ${response.status} - ${errorText}`,
        };
      }

      const result = (await response.json()) as {
        link_id?: number;
        link_url?: string;
        title?: string;
        type?: string;
        amount?: number;
        status?: string;
        expired_date?: string | null;
        errors?: Record<string, string[]>;
      };

      // Check for validation errors
      if (result.errors) {
        const errorMessages = Object.entries(result.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("; ");
        return {
          success: false,
          error: `Validation error: ${errorMessages}`,
        };
      }

      if (result.link_id && result.link_url && result.status === "ACTIVE") {
        return {
          success: true,
          externalId: result.link_id.toString(),
          paymentCode: result.link_id.toString(), // Flip uses link_id as reference
          paymentUrl: `https://${result.link_url}`,
          expiredAt: result.expired_date ? new Date(result.expired_date) : undefined,
        };
      }

      return {
        success: false,
        error: result.status === "INACTIVE"
          ? "Payment created but inactive - transaction may already exist"
          : "Payment creation failed - no active link returned",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async verifyWebhook(payload: WebhookPayload, signature?: string): Promise<boolean> {
    // Flip uses token validation instead of signature
    // The token should be sent in the webhook callback
    const token = signature || (payload.token as string);

    if (!token) {
      console.warn("No validation token provided in Flip webhook");
      return false;
    }

    // Compare with configured validation token
    return token === this.validationToken;
  }

  parseWebhook(payload: WebhookPayload): {
    externalId: string;
    status: "success" | "failed" | "expired";
    paidAt?: Date;
  } {
    // Flip webhook payload structure
    const billId = (payload.id || payload.bill_link_id || payload.link_id) as string | number;
    const status = (payload.status as string)?.toUpperCase();

    let parsedStatus: "success" | "failed" | "expired" = "failed";

    // Flip statuses: SUCCESSFUL, ACTIVE, INACTIVE, EXPIRED
    if (status === "SUCCESSFUL") {
      parsedStatus = "success";
    } else if (status === "EXPIRED") {
      parsedStatus = "expired";
    }

    return {
      externalId: billId?.toString() || "",
      status: parsedStatus,
      paidAt: parsedStatus === "success" ? new Date() : undefined,
    };
  }
}
