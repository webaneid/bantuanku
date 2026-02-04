import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, like, sql, and, or } from "drizzle-orm";
import {
  donatur,
  donations,
  createId,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  entityBankAccounts,
} from "@bantuanku/db";
import { hashPassword } from "../../lib/password";
import { normalizeContactData } from "../../lib/contact-helpers";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const donaturAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Bank account validation schema
const bankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  accountHolderName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
});

const createDonaturSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10),
  whatsappNumber: z.string().trim().min(10).optional(),
  website: z.string().trim().optional(),

  // Address system
  detailAddress: z.string().trim().optional(),
  provinceCode: z.string().trim().optional(),
  regencyCode: z.string().trim().optional(),
  districtCode: z.string().trim().optional(),
  villageCode: z.string().trim().optional(),
  postalCode: z.string().optional().nullable(),

  // Bank accounts
  bankAccounts: z.array(bankAccountSchema).optional(),

  password: z.string().trim().min(8).optional().or(z.literal("")),
});

const updateDonaturSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),

  // Address system
  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  postalCode: z.string().optional().nullable(),

  // Bank accounts
  bankAccounts: z.array(bankAccountSchema).optional(),

  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

// GET all donatur
donaturAdmin.get("/", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const search = c.req.query("search");

  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(donatur.name, `%${search}%`),
        like(donatur.email, `%${search}%`),
        like(donatur.phone, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rawData, countResult] = await Promise.all([
    db
      .select({
        id: donatur.id,
        email: donatur.email,
        name: donatur.name,
        phone: donatur.phone,
        whatsappNumber: donatur.whatsappNumber,
        website: donatur.website,
        detailAddress: donatur.detailAddress,
        provinceCode: donatur.provinceCode,
        regencyCode: donatur.regencyCode,
        districtCode: donatur.districtCode,
        villageCode: donatur.villageCode,
        avatar: donatur.avatar,
        totalDonations: donatur.totalDonations,
        totalAmount: donatur.totalAmount,
        emailVerifiedAt: donatur.emailVerifiedAt,
        phoneVerifiedAt: donatur.phoneVerifiedAt,
        isActive: donatur.isActive,
        isAnonymous: donatur.isAnonymous,
        lastLoginAt: donatur.lastLoginAt,
        createdAt: donatur.createdAt,
        updatedAt: donatur.updatedAt,
        // Address names from joined tables
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,
      })
      .from(donatur)
      .leftJoin(
        indonesiaProvinces,
        eq(donatur.provinceCode, indonesiaProvinces.code)
      )
      .leftJoin(
        indonesiaRegencies,
        eq(donatur.regencyCode, indonesiaRegencies.code)
      )
      .leftJoin(
        indonesiaDistricts,
        eq(donatur.districtCode, indonesiaDistricts.code)
      )
      .leftJoin(
        indonesiaVillages,
        eq(donatur.villageCode, indonesiaVillages.code)
      )
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(donatur.createdAt)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(donatur)
      .where(whereClause),
  ]);

  // Fetch bank accounts for all donatur
  const donaturIds = rawData.map((d) => d.id);
  const bankAccountsList = donaturIds.length > 0
    ? await db
        .select()
        .from(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityType, "donatur"),
            or(...donaturIds.map((id) => eq(entityBankAccounts.entityId, id)))
          )
        )
    : [];

  // Group bank accounts by donatur ID
  const bankAccountsMap = new Map<string, typeof bankAccountsList>();
  bankAccountsList.forEach((account) => {
    const existing = bankAccountsMap.get(account.entityId) || [];
    bankAccountsMap.set(account.entityId, [...existing, account]);
  });

  // Attach bank accounts to donatur
  const donaturWithBankAccounts = rawData.map((d) => ({
    ...d,
    bankAccounts: bankAccountsMap.get(d.id) || [],
  }));

  return paginated(c, donaturWithBankAccounts, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

// POST create donatur
donaturAdmin.post(
  "/",
  requireRole("super_admin", "admin_campaign"),
  zValidator("json", createDonaturSchema, (result, c) => {
    if (!result.success) {
      console.log("Validation error:", JSON.stringify(result.error.flatten(), null, 2));
      const fieldErrors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(fieldErrors).map(([field, errors]) =>
        `${field}: ${errors?.join(", ")}`
      ).join("; ");
      return c.json(
        {
          success: false,
          message: `Validation error: ${errorMessages}`,
          errors: result.error.flatten()
        },
        400
      );
    }
  }),
  async (c) => {
    const body = c.req.valid("json");
    console.log("Create donatur body:", JSON.stringify(body, null, 2));
    const db = c.get("db");

    // Normalize contact data
    const normalizedBody = normalizeContactData(body);

    // Extract bank accounts and postalCode
    const { bankAccounts, postalCode, ...donaturData } = normalizedBody;

    // Check if email already exists
    const existing = await db.query.donatur.findFirst({
      where: eq(donatur.email, normalizedBody.email),
    });

    if (existing) {
      return error(c, "Email sudah terdaftar", 400);
    }

    const donaturId = createId();
    const insertData: any = {
      id: donaturId,
      email: donaturData.email,
      name: donaturData.name,
      phone: donaturData.phone,
      whatsappNumber: donaturData.whatsappNumber,
      website: donaturData.website,
    };

    // Address system
    if (donaturData.detailAddress) insertData.detailAddress = donaturData.detailAddress;
    if (donaturData.provinceCode) insertData.provinceCode = donaturData.provinceCode;
    if (donaturData.regencyCode) insertData.regencyCode = donaturData.regencyCode;
    if (donaturData.districtCode) insertData.districtCode = donaturData.districtCode;
    if (donaturData.villageCode) insertData.villageCode = donaturData.villageCode;

    // Hash password if provided
    if (donaturData.password) {
      insertData.passwordHash = await hashPassword(donaturData.password);
    }

    await db.insert(donatur).values(insertData);

    // Insert bank accounts if provided
    if (bankAccounts && bankAccounts.length > 0) {
      const bankAccountsToInsert = bankAccounts.map((account: any) => ({
        entityType: "donatur",
        entityId: donaturId,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
      }));

      await db.insert(entityBankAccounts).values(bankAccountsToInsert);
    }

    return success(c, { id: donaturId }, "Donatur berhasil dibuat", 201);
  }
);

// GET single donatur
donaturAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const rawData = await db
    .select({
      id: donatur.id,
      email: donatur.email,
      name: donatur.name,
      phone: donatur.phone,
      whatsappNumber: donatur.whatsappNumber,
      website: donatur.website,
      detailAddress: donatur.detailAddress,
      provinceCode: donatur.provinceCode,
      regencyCode: donatur.regencyCode,
      districtCode: donatur.districtCode,
      villageCode: donatur.villageCode,
      avatar: donatur.avatar,
      totalDonations: donatur.totalDonations,
      totalAmount: donatur.totalAmount,
      emailVerifiedAt: donatur.emailVerifiedAt,
      phoneVerifiedAt: donatur.phoneVerifiedAt,
      isActive: donatur.isActive,
      isAnonymous: donatur.isAnonymous,
      lastLoginAt: donatur.lastLoginAt,
      createdAt: donatur.createdAt,
      updatedAt: donatur.updatedAt,
      // Address names
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      villagePostalCode: indonesiaVillages.postalCode,
    })
    .from(donatur)
    .leftJoin(
      indonesiaProvinces,
      eq(donatur.provinceCode, indonesiaProvinces.code)
    )
    .leftJoin(
      indonesiaRegencies,
      eq(donatur.regencyCode, indonesiaRegencies.code)
    )
    .leftJoin(
      indonesiaDistricts,
      eq(donatur.districtCode, indonesiaDistricts.code)
    )
    .leftJoin(
      indonesiaVillages,
      eq(donatur.villageCode, indonesiaVillages.code)
    )
    .where(eq(donatur.id, id))
    .limit(1);

  if (!rawData || rawData.length === 0) {
    return error(c, "Donatur tidak ditemukan", 404);
  }

  // Fetch bank accounts for this donatur
  const bankAccountsList = await db
    .select()
    .from(entityBankAccounts)
    .where(
      and(
        eq(entityBankAccounts.entityType, "donatur"),
        eq(entityBankAccounts.entityId, id)
      )
    );

  const data = rawData[0];

  // Get donation stats
  const donationStats = await db
    .select({
      count: sql<number>`count(*)`,
      total: sql<number>`sum(amount)`,
    })
    .from(donations)
    .where(eq(donations.donaturId, id));

  return success(c, {
    ...data,
    bankAccounts: bankAccountsList,
    donationCount: Number(donationStats[0]?.count || 0),
    donationTotal: Number(donationStats[0]?.total || 0),
  });
});

// PUT update donatur
donaturAdmin.put(
  "/:id",
  requireRole("super_admin", "admin_campaign"),
  zValidator("json", updateDonaturSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.get("db");

    // Normalize contact data
    const normalizedBody = normalizeContactData(body);

    // Extract bank accounts and postalCode
    const { bankAccounts, postalCode, ...donaturData } = normalizedBody;

    const existing = await db.query.donatur.findFirst({
      where: eq(donatur.id, id),
    });

    if (!existing) {
      return error(c, "Donatur tidak ditemukan", 404);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (donaturData.name !== undefined) updateData.name = donaturData.name;
    if (donaturData.phone !== undefined) updateData.phone = donaturData.phone;
    if (donaturData.whatsappNumber !== undefined) updateData.whatsappNumber = donaturData.whatsappNumber;
    if (donaturData.website !== undefined) updateData.website = donaturData.website;

    // Address system
    if (donaturData.detailAddress !== undefined) updateData.detailAddress = donaturData.detailAddress;
    if (donaturData.provinceCode !== undefined) updateData.provinceCode = donaturData.provinceCode;
    if (donaturData.regencyCode !== undefined) updateData.regencyCode = donaturData.regencyCode;
    if (donaturData.districtCode !== undefined) updateData.districtCode = donaturData.districtCode;
    if (donaturData.villageCode !== undefined) updateData.villageCode = donaturData.villageCode;

    if (donaturData.isActive !== undefined) updateData.isActive = donaturData.isActive;

    if (donaturData.password) {
      updateData.passwordHash = await hashPassword(donaturData.password);
    }

    await db
      .update(donatur)
      .set(updateData)
      .where(eq(donatur.id, id));

    // Update bank accounts - delete old ones and insert new ones
    if (bankAccounts !== undefined) {
      // Delete existing bank accounts
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityType, "donatur"),
            eq(entityBankAccounts.entityId, id)
          )
        );

      // Insert new bank accounts if any
      if (bankAccounts && bankAccounts.length > 0) {
        const bankAccountsToInsert = bankAccounts.map((account: any) => ({
          entityType: "donatur",
          entityId: id,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
        }));

        await db.insert(entityBankAccounts).values(bankAccountsToInsert);
      }
    }

    return success(c, null, "Donatur berhasil diperbarui");
  }
);

// DELETE donatur
donaturAdmin.delete(
  "/:id",
  requireRole("super_admin"),
  async (c) => {
    const id = c.req.param("id");
    const db = c.get("db");

    const existing = await db.query.donatur.findFirst({
      where: eq(donatur.id, id),
    });

    if (!existing) {
      return error(c, "Donatur tidak ditemukan", 404);
    }

    // Check if has donations
    const hasDonations = await db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(eq(donations.donaturId, id));

    if (Number(hasDonations[0]?.count) > 0) {
      return error(c, "Tidak bisa menghapus donatur yang sudah pernah donasi", 400);
    }

    // Delete associated bank accounts first
    await db
      .delete(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "donatur"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    await db.delete(donatur).where(eq(donatur.id, id));

    return success(c, null, "Donatur berhasil dihapus");
  }
);

// GET donatur donations history
donaturAdmin.get("/:id/donations", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.query.donations.findMany({
      where: eq(donations.donaturId, id),
      limit,
      offset,
      orderBy: [desc(donations.createdAt)],
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(eq(donations.donaturId, id)),
  ]);

  return paginated(c, data, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

export default donaturAdmin;
