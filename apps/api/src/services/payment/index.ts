import type { PaymentGatewayAdapter, GatewayCredentials } from "./types";
import { MidtransAdapter } from "./midtrans";
import { XenditAdapter } from "./xendit";
import { IPaymuAdapter } from "./ipaymu";
import { FlipAdapter } from "./flip";
import { ManualAdapter } from "./manual";

export * from "./types";

export function createPaymentAdapter(
  gatewayCode: string,
  credentials: GatewayCredentials,
  isProduction = false
): PaymentGatewayAdapter {
  switch (gatewayCode) {
    case "midtrans":
      return new MidtransAdapter(credentials, isProduction);
    case "xendit":
      return new XenditAdapter(credentials);
    case "ipaymu":
      return new IPaymuAdapter(credentials, isProduction);
    case "flip":
      return new FlipAdapter(credentials, isProduction);
    case "manual":
      return new ManualAdapter();
    default:
      throw new Error(`Unknown payment gateway: ${gatewayCode}`);
  }
}
