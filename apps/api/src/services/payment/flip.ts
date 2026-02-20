import bcrypt from "bcryptjs";
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
    // Calculate expiry in hours (Flip uses expired_date)
    const expiryMinutes = request.expiryMinutes || 1440; // Default 24 hours
    const expiredDate = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Truncate title to max 55 chars (Flip limit)
    const title = `Donasi #${request.donationId}`.substring(0, 55);

    // Build request body for Flip PWF (Payment Without Form) API
    const formData = new URLSearchParams({
      title,
      type: "SINGLE", // Single-use payment link
      amount: request.amount.toString(),
      step: "2", // Step 2 = payment link with channel selection on Flip side
      sender_name: request.donorName || "Donor",
      sender_email: request.donorEmail || "donor@bantuanku.org",
      sender_phone_number: request.donorPhone || "08123456789",
      expired_date: `${expiredDate.getFullYear()}-${String(expiredDate.getMonth() + 1).padStart(2, '0')}-${String(expiredDate.getDate()).padStart(2, '0')} ${String(expiredDate.getHours()).padStart(2, '0')}:${String(expiredDate.getMinutes()).padStart(2, '0')}`,
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
    // Flip sends bcrypt hash of validation token as `token` in webhook callback
    const token = signature || (payload.token as string);

    if (!token || !this.validationToken) {
      console.warn("No validation token provided in Flip webhook");
      return false;
    }

    // token is bcrypt hash, validationToken is the plain text configured in Flip dashboard
    return bcrypt.compare(this.validationToken, token);
  }

  parseWebhook(payload: WebhookPayload): {
    externalId: string;
    status: "success" | "failed" | "expired";
    paidAt?: Date;
  } {
    // Flip webhook: bill_link_id matches link_id from createPayment response (stored as externalId)
    const billLinkId = (payload.bill_link_id || payload.id || payload.link_id) as string | number;
    const status = (payload.status as string)?.toUpperCase();

    let parsedStatus: "success" | "failed" | "expired" = "failed";

    // Flip statuses: SUCCESSFUL, FAILED, CANCELLED
    if (status === "SUCCESSFUL") {
      parsedStatus = "success";
    } else if (status === "EXPIRED") {
      parsedStatus = "expired";
    }

    return {
      externalId: billLinkId?.toString() || "",
      status: parsedStatus,
      paidAt: parsedStatus === "success" ? new Date() : undefined,
    };
  }
}
