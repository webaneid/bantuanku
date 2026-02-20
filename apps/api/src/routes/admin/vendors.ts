import { Hono } from "hono";
import {
  vendors,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  entityBankAccounts,
} from "@bantuanku/db";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import { z } from "zod";
import { normalizeContactData } from "../../lib/contact-helpers";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Bank account validation schema
const bankAccountSchema = z.object({
  id: z.string().optional(), // Only for existing accounts
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  accountHolderName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
});

// Validation schema
const vendorSchema = z.object({
  name: z.string().min(1, "Nama vendor wajib diisi"),
  type: z.string().min(1, "Tipe vendor wajib dipilih"),
  category: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(), // Legacy - will be deprecated

  // Address - Indonesia Address System
  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  postalCode: z.string().optional().nullable(), // From AddressForm, not stored in DB

  // Bank accounts - handled separately
  bankAccounts: z.array(bankAccountSchema).optional(),

  // Legacy bank fields - will be deprecated
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountName: z.string().optional(),

  taxId: z.string().optional(),
  businessLicense: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /admin/vendors - List with pagination and filters
app.get("/", async (c) => {
  try {
    const db = c.get("db");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const type = c.req.query("type") || "";
    const status = c.req.query("status") || "";

    const offset = (page - 1) * limit;

    let conditions = [];

    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(vendors.name, `%${search}%`),
          ilike(vendors.contactPerson, `%${search}%`),
          ilike(vendors.email, `%${search}%`)
        )
      );
    }

    // Type filter
    if (type) {
      conditions.push(eq(vendors.type, type));
    }

    // Status filter
    if (status === "active") {
      conditions.push(eq(vendors.isActive, true));
    } else if (status === "inactive") {
      conditions.push(eq(vendors.isActive, false));
    }

    const whereClause = conditions.length > 0
      ? (conditions.length > 1 ? and(...conditions) : conditions[0])
      : undefined;

    // Get vendors with address data
    const vendorList = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        type: vendors.type,
        category: vendors.category,
        contactPerson: vendors.contactPerson,
        email: vendors.email,
        phone: vendors.phone,
        whatsappNumber: vendors.whatsappNumber,
        website: vendors.website,
        address: vendors.address, // Legacy

        // Address fields
        detailAddress: vendors.detailAddress,
        provinceCode: vendors.provinceCode,
        regencyCode: vendors.regencyCode,
        districtCode: vendors.districtCode,
        villageCode: vendors.villageCode,

        // Address names from joined tables
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,

        // Legacy bank fields
        bankName: vendors.bankName,
        bankAccount: vendors.bankAccount,
        bankAccountName: vendors.bankAccountName,

        taxId: vendors.taxId,
        businessLicense: vendors.businessLicense,
        isActive: vendors.isActive,
        notes: vendors.notes,
        createdAt: vendors.createdAt,
        updatedAt: vendors.updatedAt,
      })
      .from(vendors)
      .leftJoin(indonesiaProvinces, eq(vendors.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(vendors.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(vendors.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(vendors.villageCode, indonesiaVillages.code))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(vendors.createdAt));

    // Fetch bank accounts for all vendors
    const vendorIds = vendorList.map((v) => v.id);
    const bankAccountsList = vendorIds.length > 0
      ? await db
          .select()
          .from(entityBankAccounts)
          .where(
            and(
              eq(entityBankAccounts.entityType, "vendor"),
              or(...vendorIds.map((id) => eq(entityBankAccounts.entityId, id)))
            )
          )
      : [];

    // Group bank accounts by vendor ID
    const bankAccountsMap = new Map<string, typeof bankAccountsList>();
    bankAccountsList.forEach((account) => {
      const existing = bankAccountsMap.get(account.entityId) || [];
      bankAccountsMap.set(account.entityId, [...existing, account]);
    });

    // Attach bank accounts to vendors
    const vendorListWithBankAccounts = vendorList.map((vendor) => ({
      ...vendor,
      bankAccounts: bankAccountsMap.get(vendor.id) || [],
    }));

    // Get total count
    const countResult = await db
      .select()
      .from(vendors)
      .where(whereClause);

    const totalVendors = countResult.length;

    return c.json({
      data: vendorListWithBankAccounts,
      pagination: {
        page,
        limit,
        total: totalVendors,
        totalPages: Math.ceil(totalVendors / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching vendors:", error);
    return c.json({ error: "Failed to fetch vendors" }, 500);
  }
});

// GET /admin/vendors/:id - Get single vendor
app.get("/:id", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const result = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        type: vendors.type,
        category: vendors.category,
        contactPerson: vendors.contactPerson,
        email: vendors.email,
        phone: vendors.phone,
        whatsappNumber: vendors.whatsappNumber,
        website: vendors.website,
        address: vendors.address, // Legacy

        // Address fields
        detailAddress: vendors.detailAddress,
        provinceCode: vendors.provinceCode,
        regencyCode: vendors.regencyCode,
        districtCode: vendors.districtCode,
        villageCode: vendors.villageCode,

        // Address names
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,

        bankName: vendors.bankName,
        bankAccount: vendors.bankAccount,
        bankAccountName: vendors.bankAccountName,
        taxId: vendors.taxId,
        businessLicense: vendors.businessLicense,
        isActive: vendors.isActive,
        notes: vendors.notes,
        createdAt: vendors.createdAt,
        updatedAt: vendors.updatedAt,
      })
      .from(vendors)
      .leftJoin(indonesiaProvinces, eq(vendors.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(vendors.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(vendors.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(vendors.villageCode, indonesiaVillages.code))
      .where(eq(vendors.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      return c.json({ error: "Vendor not found" }, 404);
    }

    // Fetch bank accounts for this vendor
    const bankAccountsList = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "vendor"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    return c.json({
      data: {
        ...result[0],
        bankAccounts: bankAccountsList,
      },
    });
  } catch (error: any) {
    console.error("Error fetching vendor:", error);
    return c.json({ error: "Failed to fetch vendor" }, 500);
  }
});

// POST /admin/vendors - Create new vendor
app.post("/", requireRole("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();
    const validated = vendorSchema.parse(body);

    // Normalize contact data
    const normalizedBody = normalizeContactData(validated);

    // Extract bank accounts and postalCode
    const { bankAccounts, postalCode, ...data } = normalizedBody;

    // Convert empty strings to null for optional fields (IMPORTANT!)
    const cleanData: any = {
      ...data,
      category: data.category || null,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsappNumber: data.whatsappNumber || null,
      website: data.website || null,
      address: data.address || null,
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
      bankAccountName: data.bankAccountName || null,
      taxId: data.taxId || null,
      businessLicense: data.businessLicense || null,
      notes: data.notes || null,
      isActive: validated.isActive ?? true,
    };

    const [newVendor] = await db
      .insert(vendors)
      .values(cleanData)
      .returning();

    // Insert bank accounts if provided
    if (bankAccounts && bankAccounts.length > 0) {
      const bankAccountsToInsert = bankAccounts.map((account: any) => ({
        entityType: "vendor",
        entityId: newVendor.id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
      }));

      await db.insert(entityBankAccounts).values(bankAccountsToInsert);
    }

    // Fetch the created bank accounts
    const createdBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "vendor"),
          eq(entityBankAccounts.entityId, newVendor.id)
        )
      );

    return c.json({
      data: {
        ...newVendor,
        bankAccounts: createdBankAccounts,
      },
    }, 201);
  } catch (error: any) {
    console.error("Error creating vendor:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to create vendor" }, 500);
  }
});

// PUT /admin/vendors/:id - Update vendor
app.put("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = vendorSchema.parse(body);

    // Normalize contact data
    const normalizedBody = normalizeContactData(validated);

    // Extract bank accounts and postalCode
    const { bankAccounts, postalCode, ...data } = normalizedBody;

    // Convert empty strings to null (same as POST)
    const cleanData: any = {
      ...data,
      category: data.category || null,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsappNumber: data.whatsappNumber || null,
      website: data.website || null,
      address: data.address || null,
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
      bankAccountName: data.bankAccountName || null,
      taxId: data.taxId || null,
      businessLicense: data.businessLicense || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    };

    const [updatedVendor] = await db
      .update(vendors)
      .set(cleanData)
      .where(eq(vendors.id, id))
      .returning();

    if (!updatedVendor) {
      return c.json({ error: "Vendor not found" }, 404);
    }

    // Update bank accounts - delete old ones and insert new ones
    if (bankAccounts !== undefined) {
      // Delete existing bank accounts
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityType, "vendor"),
            eq(entityBankAccounts.entityId, id)
          )
        );

      // Insert new bank accounts if any
      if (bankAccounts && bankAccounts.length > 0) {
        const bankAccountsToInsert = bankAccounts.map((account: any) => ({
          entityType: "vendor",
          entityId: id,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
        }));

        await db.insert(entityBankAccounts).values(bankAccountsToInsert);
      }
    }

    // Fetch updated bank accounts
    const updatedBankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "vendor"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    return c.json({
      data: {
        ...updatedVendor,
        bankAccounts: updatedBankAccounts,
      },
    });
  } catch (error: any) {
    console.error("Error updating vendor:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to update vendor" }, 500);
  }
});

// DELETE /admin/vendors/:id - Delete vendor
app.delete("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    // Delete associated bank accounts first
    await db
      .delete(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "vendor"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    const [deletedVendor] = await db
      .delete(vendors)
      .where(eq(vendors.id, id))
      .returning();

    if (!deletedVendor) {
      return c.json({ error: "Vendor not found" }, 404);
    }

    return c.json({ message: "Vendor deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting vendor:", error);
    return c.json({ error: "Failed to delete vendor" }, 500);
  }
});

export default app;
