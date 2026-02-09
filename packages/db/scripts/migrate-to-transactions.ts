/**
 * Migration Script: Migrate legacy tables to unified transactions
 *
 * Migrates:
 * - donations → transactions
 * - zakat_donations → transactions
 * - qurban_orders → transactions
 * - donation_payments → transaction_payments
 * - zakat_payments → transaction_payments
 * - qurban_payments → transaction_payments
 *
 * Usage: npx tsx scripts/migrate-to-transactions.ts
 */

import "dotenv/config";
import { createDb } from "../src/client";
import { createId } from "../src/utils";
import {
  donations,
  zakatDonations,
  qurbanOrders,
  donationPayments,
  zakatPayments,
  qurbanPayments,
  transactions,
  transactionPayments,
  campaigns,
  zakatTypes,
  qurbanPackagePeriods,
  qurbanPackages,
} from "../src/schema";
import { eq } from "drizzle-orm";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const db = createDb(databaseUrl);

  console.log("🔄 Starting migration to unified transactions...\n");

  const stats = {
    donations: { migrated: 0, payments: 0 },
    zakat: { migrated: 0, payments: 0 },
    qurban: { migrated: 0, payments: 0 },
  };

  // 1. Migrate Donations
  console.log("📋 Migrating donations...");
  const allDonations = await db.query.donations.findMany({
    with: { campaign: true },
  });

  for (const donation of allDonations) {
    await createTransactionFromDonation(db, donation);
    stats.donations.migrated++;

    // Migrate donation payments
    const payments = await db.query.donationPayments.findMany({
      where: eq(donationPayments.donationId, donation.id),
    });

    for (const payment of payments) {
      await createTransactionPaymentFromDonationPayment(db, donation.id, payment);
      stats.donations.payments++;
    }
  }
  console.log(`✅ Migrated ${stats.donations.migrated} donations with ${stats.donations.payments} payments\n`);

  // 2. Migrate Zakat
  console.log("📋 Migrating zakat donations...");
  const allZakat = await db.query.zakatDonations.findMany({
    with: { zakatType: true },
  });

  for (const zakat of allZakat) {
    await createTransactionFromZakat(db, zakat);
    stats.zakat.migrated++;

    // Migrate zakat payments
    const payments = await db.query.zakatPayments.findMany({
      where: eq(zakatPayments.zakatDonationId, zakat.id),
    });

    for (const payment of payments) {
      await createTransactionPaymentFromZakatPayment(db, zakat.id, payment);
      stats.zakat.payments++;
    }
  }
  console.log(`✅ Migrated ${stats.zakat.migrated} zakat donations with ${stats.zakat.payments} payments\n`);

  // 3. Migrate Qurban
  console.log("📋 Migrating qurban orders...");
  const allQurban = await db.query.qurbanOrders.findMany({
    with: {
      packagePeriod: {
        with: {
          package: true,
          period: true,
        },
      },
    },
  });

  for (const qurban of allQurban) {
    await createTransactionFromQurban(db, qurban);
    stats.qurban.migrated++;

    // Migrate qurban payments
    const payments = await db.query.qurbanPayments.findMany({
      where: eq(qurbanPayments.orderId, qurban.id),
    });

    for (const payment of payments) {
      await createTransactionPaymentFromQurbanPayment(db, qurban.id, payment);
      stats.qurban.payments++;
    }
  }
  console.log(`✅ Migrated ${stats.qurban.migrated} qurban orders with ${stats.qurban.payments} payments\n`);

  // Validation
  console.log("🔍 Validation Summary:");
  console.log(`   Total Transactions: ${stats.donations.migrated + stats.zakat.migrated + stats.qurban.migrated}`);
  console.log(`   Total Payments: ${stats.donations.payments + stats.zakat.payments + stats.qurban.payments}`);
  console.log(`   - Donations: ${stats.donations.migrated} transactions, ${stats.donations.payments} payments`);
  console.log(`   - Zakat: ${stats.zakat.migrated} transactions, ${stats.zakat.payments} payments`);
  console.log(`   - Qurban: ${stats.qurban.migrated} transactions, ${stats.qurban.payments} payments`);

  console.log("\n✅ Migration completed successfully!");
}

function mapPaymentStatus(legacyStatus: string): string {
  switch (legacyStatus) {
    case "success":
      return "paid";
    case "processing":
      return "pending";
    case "pending":
      return "pending";
    case "paid":
      return "paid";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "cancelled";
    default:
      return "pending";
  }
}

async function createTransactionFromDonation(db: any, donation: any) {
  const campaign = donation.campaign;

  await db.insert(transactions).values({
    id: donation.id,
    transactionNumber: donation.referenceId,
    productType: "campaign",
    productId: donation.campaignId,
    productName: campaign?.title || "Campaign",
    productDescription: campaign?.description,
    productImage: campaign?.imageUrl,
    quantity: 1,
    unitPrice: donation.amount,
    subtotal: donation.amount,
    adminFee: 0,
    totalAmount: donation.totalAmount,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    donorPhone: donation.donorPhone,
    isAnonymous: donation.isAnonymous,
    paymentMethodId: donation.paymentMethodId,
    paymentStatus: mapPaymentStatus(donation.paymentStatus),
    paidAmount: donation.paidAmount,
    paidAt: donation.paidAt,
    typeSpecificData: {
      campaign_id: donation.campaignId,
      pillar: campaign?.pillar,
    },
    message: donation.message,
    notes: donation.note,
    createdAt: donation.createdAt,
    updatedAt: donation.updatedAt,
  } as any);
}

async function createTransactionFromZakat(db: any, zakat: any) {
  const zakatType = zakat.zakatType;

  await db.insert(transactions).values({
    id: zakat.id,
    transactionNumber: zakat.referenceId,
    productType: "zakat",
    productId: zakat.zakatTypeId,
    productName: zakatType?.name || "Zakat",
    productDescription: zakatType?.description,
    productImage: zakatType?.imageUrl,
    quantity: 1,
    unitPrice: zakat.amount,
    subtotal: zakat.amount,
    adminFee: 0,
    totalAmount: zakat.amount,
    donorName: zakat.donorName,
    donorEmail: zakat.donorEmail,
    donorPhone: zakat.donorPhone,
    isAnonymous: zakat.isAnonymous,
    paymentMethodId: zakat.paymentMethodId,
    paymentStatus: mapPaymentStatus(zakat.paymentStatus),
    paidAmount: zakat.paidAmount,
    paidAt: zakat.paidAt,
    typeSpecificData: {
      zakat_type_id: zakat.zakatTypeId,
      calculator_data: zakat.calculatorData,
      calculated_zakat: zakat.calculatedZakat,
    },
    message: zakat.message,
    createdAt: zakat.createdAt,
    updatedAt: zakat.updatedAt,
  } as any);
}

async function createTransactionFromQurban(db: any, qurban: any) {
  const pkg = qurban.packagePeriod?.package;
  const period = qurban.packagePeriod?.period;

  await db.insert(transactions).values({
    id: qurban.id,
    transactionNumber: qurban.orderNumber,
    productType: "qurban",
    productId: qurban.packagePeriodId,
    productName: pkg?.name || "Qurban",
    productDescription: pkg?.description,
    productImage: pkg?.imageUrl,
    quantity: qurban.quantity,
    unitPrice: qurban.unitPrice,
    subtotal: qurban.quantity * qurban.unitPrice,
    adminFee: qurban.adminFee || 0,
    totalAmount: qurban.totalAmount,
    donorName: qurban.donorName,
    donorEmail: qurban.donorEmail,
    donorPhone: qurban.donorPhone,
    isAnonymous: false,
    paymentMethodId: qurban.paymentMethodId,
    paymentStatus: mapPaymentStatus(qurban.paymentStatus),
    paidAmount: qurban.paidAmount,
    paidAt: null,
    typeSpecificData: {
      period_id: qurban.packagePeriod?.periodId,
      package_id: qurban.packagePeriod?.packageId,
      shared_group_id: qurban.sharedGroupId,
      on_behalf_of: qurban.onBehalfOf,
    },
    message: qurban.notes,
    createdAt: qurban.createdAt,
    updatedAt: qurban.updatedAt,
  } as any);
}

async function createTransactionPaymentFromDonationPayment(db: any, transactionId: string, payment: any) {
  await db.insert(transactionPayments).values({
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    transactionId: transactionId,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    paymentChannel: payment.paymentChannel,
    paymentProof: payment.paymentProof,
    verifiedBy: payment.verifiedBy,
    verifiedAt: payment.verifiedAt,
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    notes: payment.notes,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  } as any);
}

async function createTransactionPaymentFromZakatPayment(db: any, transactionId: string, payment: any) {
  await db.insert(transactionPayments).values({
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    transactionId: transactionId,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    paymentChannel: payment.paymentChannel,
    paymentProof: payment.paymentProof,
    verifiedBy: payment.verifiedBy,
    verifiedAt: payment.verifiedAt,
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    notes: payment.notes,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  } as any);
}

async function createTransactionPaymentFromQurbanPayment(db: any, transactionId: string, payment: any) {
  await db.insert(transactionPayments).values({
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    transactionId: transactionId,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    paymentChannel: payment.paymentChannel,
    installmentNumber: payment.installmentNumber,
    paymentProof: payment.paymentProof,
    verifiedBy: payment.verifiedBy,
    verifiedAt: payment.verifiedAt,
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    notes: payment.notes,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  } as any);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
