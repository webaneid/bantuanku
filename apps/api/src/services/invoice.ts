import { createId } from "@bantuanku/db";
import type { Database } from "@bantuanku/db";

interface InvoiceParams {
  donationId: string;
  amount: number;
  feeAmount?: number;
  payerName: string;
  payerEmail?: string;
  payerPhone?: string;
  issuedBy?: string;
}

export async function createInvoice(db: Database, params: InvoiceParams) {
  const invoiceNumber = generateInvoiceNumber();
  const invoiceId = createId();

  // TODO: Implement invoice creation via universal system
  return { invoiceId, invoiceNumber };
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}
