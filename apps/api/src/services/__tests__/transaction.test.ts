import { describe, it, expect, beforeAll } from "bun:test";
import { db } from "@bantuanku/db/client";
import { TransactionService } from "../transaction";

describe("TransactionService", () => {
  let service: TransactionService;

  beforeAll(() => {
    service = new TransactionService(db);
  });

  describe("create", () => {
    it("should create campaign transaction", async () => {
      // First, get a campaign
      const campaigns = await db.query.campaigns.findMany({ limit: 1 });
      if (campaigns.length === 0) {
        console.log("No campaigns found, skipping test");
        return;
      }

      const transaction = await service.create({
        product_type: "campaign",
        product_id: campaigns[0].id,
        unit_price: 100000,
        donor_name: "Test Donor",
        donor_email: "test@example.com",
        donor_phone: "08123456789",
        type_specific_data: {
          campaign_id: campaigns[0].id,
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.productType).toBe("campaign");
      expect(transaction.totalAmount).toBe(100000);
      expect(transaction.paymentStatus).toBe("pending");
    });

    it("should create zakat transaction", async () => {
      const zakatTypes = await db.query.zakatTypes.findMany({ limit: 1 });
      if (zakatTypes.length === 0) {
        console.log("No zakat types found, skipping test");
        return;
      }

      const transaction = await service.create({
        product_type: "zakat",
        product_id: zakatTypes[0].id,
        unit_price: 500000,
        donor_name: "Test Donor Zakat",
        donor_phone: "08123456789",
        type_specific_data: {
          zakat_type_id: zakatTypes[0].id,
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.productType).toBe("zakat");
      expect(transaction.totalAmount).toBe(500000);
    });

    it("should create qurban transaction with admin fee", async () => {
      const packagePeriods = await db.query.qurbanPackagePeriods.findMany({
        limit: 1,
        with: { package: true, period: true },
      });
      if (packagePeriods.length === 0) {
        console.log("No qurban package periods found, skipping test");
        return;
      }

      const transaction = await service.create({
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

      expect(transaction).toBeDefined();
      expect(transaction.productType).toBe("qurban");
      expect(transaction.quantity).toBe(2);
      expect(transaction.adminFee).toBe(50000);
      expect(transaction.subtotal).toBe(packagePeriods[0].price * 2);
      expect(transaction.totalAmount).toBe(packagePeriods[0].price * 2 + 50000);
    });
  });

  describe("list", () => {
    it("should list transactions with filters", async () => {
      const result = await service.list({
        product_type: "campaign",
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getById", () => {
    it("should get transaction by id", async () => {
      const allTransactions = await service.list({ limit: 1 });
      if (allTransactions.length === 0) {
        console.log("No transactions found, skipping test");
        return;
      }

      const transaction = await service.getById(allTransactions[0].id);
      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe(allTransactions[0].id);
    });
  });
});
