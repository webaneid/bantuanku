/**
 * Manual verification script for TransactionService
 * Run: npx tsx src/services/__tests__/verify-transaction-service.ts
 */

import "dotenv/config";
import { createDb } from "@bantuanku/db/client";
import { TransactionService } from "../transaction";

async function verify() {
  console.log("🔄 Verifying TransactionService...\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const db = createDb(databaseUrl);
  const service = new TransactionService(db);

  try {
    // Test 1: Create Campaign Transaction
    console.log("📋 Test 1: Create Campaign Transaction");
    const campaigns = await db.query.campaigns.findMany({ limit: 1 });
    if (campaigns.length > 0) {
      const campaignTx = await service.create({
        product_type: "campaign",
        product_id: campaigns[0].id,
        unit_price: 100000,
        donor_name: "Test Donor Campaign",
        donor_email: "test-campaign@example.com",
        donor_phone: "08123456789",
        type_specific_data: {
          campaign_id: campaigns[0].id,
        },
      });
      console.log(`✅ Created campaign transaction: ${campaignTx.transactionNumber}`);
      console.log(`   - Product: ${campaignTx.productName}`);
      console.log(`   - Total: Rp ${campaignTx.totalAmount.toLocaleString()}`);
    } else {
      console.log("⚠️  No campaigns found");
    }

    // Test 2: Create Zakat Transaction
    console.log("\n📋 Test 2: Create Zakat Transaction");
    const zakatTypes = await db.query.zakatTypes.findMany({ limit: 1 });
    if (zakatTypes.length > 0) {
      const zakatTx = await service.create({
        product_type: "zakat",
        product_id: zakatTypes[0].id,
        unit_price: 500000,
        donor_name: "Test Donor Zakat",
        donor_phone: "08123456789",
        type_specific_data: {
          zakat_type_id: zakatTypes[0].id,
        },
      });
      console.log(`✅ Created zakat transaction: ${zakatTx.transactionNumber}`);
      console.log(`   - Product: ${zakatTx.productName}`);
      console.log(`   - Total: Rp ${zakatTx.totalAmount.toLocaleString()}`);
    } else {
      console.log("⚠️  No zakat types found");
    }

    // Test 3: Create Qurban Transaction
    console.log("\n📋 Test 3: Create Qurban Transaction");
    const packagePeriods = await db.query.qurbanPackagePeriods.findMany({
      limit: 1,
      with: { package: true },
    });
    if (packagePeriods.length > 0) {
      const qurbanTx = await service.create({
        product_type: "qurban",
        product_id: packagePeriods[0].id,
        quantity: 2,
        admin_fee: 50000,
        donor_name: "Test Donor Qurban",
        donor_phone: "08123456789",
        type_specific_data: {
          period_id: packagePeriods[0].periodId,
          package_id: packagePeriods[0].packageId,
        },
      });
      console.log(`✅ Created qurban transaction: ${qurbanTx.transactionNumber}`);
      console.log(`   - Product: ${qurbanTx.productName}`);
      console.log(`   - Quantity: ${qurbanTx.quantity}`);
      console.log(`   - Unit Price: Rp ${qurbanTx.unitPrice.toLocaleString()}`);
      console.log(`   - Subtotal: Rp ${qurbanTx.subtotal.toLocaleString()}`);
      console.log(`   - Admin Fee: Rp ${qurbanTx.adminFee.toLocaleString()}`);
      console.log(`   - Total: Rp ${qurbanTx.totalAmount.toLocaleString()}`);
    } else {
      console.log("⚠️  No qurban package periods found");
    }

    // Test 4: List Transactions
    console.log("\n📋 Test 4: List Transactions");
    const list = await service.list({ limit: 3 });
    console.log(`✅ Listed ${list.length} transactions`);
    list.forEach((tx, i) => {
      console.log(`   ${i + 1}. ${tx.transactionNumber} - ${tx.productType} - ${tx.productName}`);
    });

    // Test 5: Get by ID
    console.log("\n📋 Test 5: Get Transaction by ID");
    if (list.length > 0) {
      const tx = await service.getById(list[0].id);
      console.log(`✅ Retrieved transaction: ${tx?.transactionNumber}`);
    }

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Error during verification:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

verify();
