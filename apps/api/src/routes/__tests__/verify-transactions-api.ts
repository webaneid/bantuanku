/**
 * Manual verification script for Transactions API
 * Run: npx tsx src/routes/__tests__/verify-transactions-api.ts
 */

import "dotenv/config";

async function verify() {
  const BASE_URL = process.env.API_URL || "http://localhost:8787";

  console.log("🔄 Verifying Transactions API...\n");
  console.log(`API URL: ${BASE_URL}\n`);

  try {
    // Test 1: GET /v1/transactions - List transactions
    console.log("📋 Test 1: GET /v1/transactions");
    const listResponse = await fetch(`${BASE_URL}/v1/transactions?limit=5`);
    const listData = await listResponse.json();
    console.log(`Status: ${listResponse.status}`);
    console.log(`Success: ${listData.success}`);
    console.log(`Data count: ${listData.data?.length || 0}\n`);

    // Test 2: POST /v1/transactions - Create campaign transaction
    console.log("📋 Test 2: POST /v1/transactions (Campaign)");

    // First, get a campaign
    const campaignsResponse = await fetch(`${BASE_URL}/v1/campaigns?limit=1`);
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.success && campaignsData.data.length > 0) {
      const campaign = campaignsData.data[0];

      const createResponse = await fetch(`${BASE_URL}/v1/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_type: "campaign",
          product_id: campaign.id,
          unit_price: 100000,
          donor_name: "Test API Campaign",
          donor_email: "test-api-campaign@example.com",
          donor_phone: "08123456789",
          type_specific_data: {
            campaign_id: campaign.id,
          },
        }),
      });

      const createData = await createResponse.json();
      console.log(`Status: ${createResponse.status}`);
      console.log(`Success: ${createData.success}`);
      if (createData.success) {
        console.log(`Transaction ID: ${createData.data.id}`);
        console.log(`Transaction Number: ${createData.data.transactionNumber}`);
        console.log(`Product: ${createData.data.productName}`);
        console.log(`Total: Rp ${createData.data.totalAmount.toLocaleString()}\n`);

        // Test 3: GET /v1/transactions/:id
        console.log("📋 Test 3: GET /v1/transactions/:id");
        const detailResponse = await fetch(`${BASE_URL}/v1/transactions/${createData.data.id}`);
        const detailData = await detailResponse.json();
        console.log(`Status: ${detailResponse.status}`);
        console.log(`Success: ${detailData.success}`);
        if (detailData.success) {
          console.log(`Retrieved transaction: ${detailData.data.data?.transactionNumber || detailData.data.data?.id}\n`);
        }
      } else {
        console.log(`Error: ${createData.message}\n`);
      }
    } else {
      console.log("⚠️  No campaigns found to test\n");
    }

    console.log("✅ API verification completed!");
  } catch (error: any) {
    console.error("\n❌ Error during verification:", error.message);
    throw error;
  }
}

verify();
