import { createDb, createId } from "@bantuanku/db";
import {
  qurbanSavings,
  qurbanSavingsTransactions,
  qurbanSavingsConversions,
  qurbanPackagePeriods,
  transactions,
  transactionPayments,
  and,
  eq,
  sql,
} from "@bantuanku/db";
import * as path from "path";
import * as fs from "fs";

const devVarsPath = path.join(process.cwd(), ".dev.vars");
if (fs.existsSync(devVarsPath)) {
  const envContent = fs.readFileSync(devVarsPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const db = createDb(databaseUrl);

const toDatePart = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

async function resolveTargetPackagePeriodId(savings: any): Promise<string | null> {
  if (savings.targetPackagePeriodId) return savings.targetPackagePeriodId;
  if (!savings.targetPackageId || !savings.targetPeriodId) return null;

  const packagePeriod = await db.query.qurbanPackagePeriods.findFirst({
    where: and(
      eq(qurbanPackagePeriods.packageId, savings.targetPackageId),
      eq(qurbanPackagePeriods.periodId, savings.targetPeriodId)
    ),
  });

  return packagePeriod?.id || null;
}

async function alreadyMigrated(legacyTxId: string): Promise<boolean> {
  const existing = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.category, "qurban_savings"),
      eq(transactions.productType, "qurban"),
      sql`${transactions.typeSpecificData} ->> 'legacy_savings_transaction_id' = ${legacyTxId}`
    ),
  });

  return Boolean(existing);
}

async function conversionAlreadyMigrated(legacyTxId: string): Promise<boolean> {
  const existing = await db.query.qurbanSavingsConversions.findFirst({
    where: eq(qurbanSavingsConversions.sourceLegacyTransactionId, legacyTxId),
  });
  return Boolean(existing);
}

async function runBackfill() {
  const legacyRows = await db
    .select()
    .from(qurbanSavingsTransactions)
    .orderBy(qurbanSavingsTransactions.createdAt);

  console.log(`Found ${legacyRows.length} legacy savings transactions`);

  let migrated = 0;
  let migratedConversions = 0;
  let skippedExisting = 0;
  let skippedUnsupported = 0;
  let skippedInvalid = 0;

  for (const legacy of legacyRows) {
    if (legacy.transactionType === "conversion") {
      if (await conversionAlreadyMigrated(legacy.id)) {
        skippedExisting++;
        continue;
      }

      const conversionDate = legacy.verifiedAt || legacy.transactionDate || legacy.createdAt || new Date();
      const amount = Number(legacy.amount || 0);

      await db.insert(qurbanSavingsConversions).values({
        id: createId(),
        savingsId: legacy.savingsId,
        convertedAmount: amount,
        sourceLegacyTransactionId: legacy.id,
        notes: legacy.notes || "Backfill legacy conversion",
        convertedBy: legacy.verifiedBy || null,
        convertedAt: conversionDate,
        createdAt: conversionDate,
      } as any);

      await db
        .update(qurbanSavings)
        .set({
          status: "converted",
          updatedAt: new Date(),
        })
        .where(eq(qurbanSavings.id, legacy.savingsId));

      migratedConversions++;
      continue;
    }

    if (legacy.transactionType !== "deposit") {
      skippedUnsupported++;
      continue;
    }

    if (await alreadyMigrated(legacy.id)) {
      skippedExisting++;
      continue;
    }

    const savings = await db.query.qurbanSavings.findFirst({
      where: eq(qurbanSavings.id, legacy.savingsId),
    });

    if (!savings) {
      skippedInvalid++;
      console.warn(`Skip ${legacy.id}: savings ${legacy.savingsId} not found`);
      continue;
    }

    const targetPackagePeriodId = await resolveTargetPackagePeriodId(savings);
    if (!targetPackagePeriodId) {
      skippedInvalid++;
      console.warn(`Skip ${legacy.id}: target package-period for savings ${savings.id} not found`);
      continue;
    }

    const packagePeriod = await db.query.qurbanPackagePeriods.findFirst({
      where: eq(qurbanPackagePeriods.id, targetPackagePeriodId),
      with: {
        package: true,
      },
    });

    if (!packagePeriod) {
      skippedInvalid++;
      console.warn(`Skip ${legacy.id}: package-period ${targetPackagePeriodId} missing`);
      continue;
    }

    const amount = Number(legacy.amount || 0);
    const legacyDate = legacy.transactionDate || legacy.createdAt || new Date();
    const createdAt = legacy.createdAt || legacyDate;
    const updatedAt = legacy.verifiedAt || createdAt;

    const txStatus =
      legacy.status === "verified"
        ? "paid"
        : legacy.status === "pending"
          ? "processing"
          : "pending";

    const paymentStatus =
      legacy.status === "verified"
        ? "verified"
        : legacy.status === "pending"
          ? "pending"
          : "rejected";

    const paidAt = legacy.status === "verified" ? (legacy.verifiedAt || legacyDate) : null;
    const paidAmount = legacy.status === "verified" || legacy.status === "pending" ? amount : 0;

    const txNumber = `TRX-SAV-BF-${toDatePart(createdAt)}-${legacy.id.toUpperCase()}`;
    const paymentNumber = `PAY-SAV-BF-${toDatePart(createdAt)}-${legacy.id.toUpperCase()}`;

    const [newTx] = await db
      .insert(transactions)
      .values({
        id: createId(),
        transactionNumber: txNumber,
        productType: "qurban",
        productId: targetPackagePeriodId,
        productName: packagePeriod.package.name,
        productDescription: packagePeriod.package.description,
        productImage: packagePeriod.package.imageUrl,
        quantity: 1,
        unitPrice: amount,
        subtotal: amount,
        adminFee: 0,
        totalAmount: amount,
        uniqueCode: 0,
        donorName: savings.donorName,
        donorEmail: savings.donorEmail,
        donorPhone: savings.donorPhone,
        userId: savings.userId,
        paymentMethodId: legacy.paymentMethod || legacy.paymentChannel || "bank_transfer",
        paymentStatus: txStatus as any,
        paidAmount,
        paidAt,
        typeSpecificData: {
          payment_type: "savings",
          savings_id: savings.id,
          savings_number: savings.savingsNumber,
          target_package_period_id: targetPackagePeriodId,
          legacy_savings_transaction_id: legacy.id,
          backfill_source: "qurban_savings_transactions",
        },
        category: "qurban_savings",
        transactionType: "income",
        notes: legacy.notes || "Backfill legacy qurban savings transaction",
        createdAt,
        updatedAt,
      } as any)
      .returning();

    await db
      .insert(transactionPayments)
      .values({
        id: createId(),
        paymentNumber,
        transactionId: newTx.id,
        amount,
        paymentDate: legacyDate,
        paymentMethod: legacy.paymentMethod || "bank_transfer",
        paymentChannel: legacy.paymentChannel || null,
        paymentProof: legacy.paymentProof || null,
        status: paymentStatus as any,
        verifiedBy: legacy.status === "verified" ? legacy.verifiedBy : null,
        verifiedAt: legacy.status === "verified" ? (legacy.verifiedAt || legacyDate) : null,
        rejectedBy: legacy.status === "rejected" ? legacy.verifiedBy : null,
        rejectedAt: legacy.status === "rejected" ? (legacy.verifiedAt || legacyDate) : null,
        rejectionReason: legacy.status === "rejected" ? (legacy.notes || "Rejected (legacy)") : null,
        notes: legacy.notes || null,
        createdAt,
        updatedAt,
      } as any);

    migrated++;
  }

  console.log("\nBackfill finished:");
  console.log(`- Migrated deposits: ${migrated}`);
  console.log(`- Migrated conversions: ${migratedConversions}`);
  console.log(`- Skipped (already migrated): ${skippedExisting}`);
  console.log(`- Skipped (unsupported type): ${skippedUnsupported}`);
  console.log(`- Skipped (invalid refs): ${skippedInvalid}`);
}

runBackfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
