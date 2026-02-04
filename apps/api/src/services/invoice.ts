import { invoices, createId } from "@bantuanku/db";
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
  const now = new Date();
  const invoiceId = createId();

  await db.insert(invoices).values({
    id: invoiceId,
    invoiceNumber,
    donationId: params.donationId,
    issuedAt: now,
    issuedBy: params.issuedBy || "system",
    subtotal: params.amount,
    feeAmount: params.feeAmount || 0,
    totalAmount: params.amount + (params.feeAmount || 0),
    currency: "IDR",
    payerName: params.payerName,
    payerEmail: params.payerEmail,
    payerPhone: params.payerPhone,
    status: "paid",
    paidAt: now,
  });

  return { invoiceId, invoiceNumber };
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}
