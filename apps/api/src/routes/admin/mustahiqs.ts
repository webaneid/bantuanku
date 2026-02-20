import { Hono } from "hono";
import {
  mustahiqs,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  entityBankAccounts,
} from "@bantuanku/db";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import { z } from "zod";
import type { Env, Variables } from "../../types";
import { normalizeContactData } from "../../lib/contact-helpers";
import { requireRole } from "../../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Bank account validation schema
const bankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  accountHolderName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
});

// Validation schema
const mustahiqSchema = z.object({
  mustahiqId: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Nama lengkap wajib diisi"),
  asnafCategory: z.string().min(1, "Kategori Asnaf wajib diisi"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  whatsappNumber: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  provinceCode: z.string().optional().or(z.literal("")),
  regencyCode: z.string().optional().or(z.literal("")),
  districtCode: z.string().optional().or(z.literal("")),
  villageCode: z.string().optional().or(z.literal("")),
  detailAddress: z.string().optional().or(z.literal("")),
  nationalId: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),

  // Bank accounts - handled separately
  bankAccounts: z.array(bankAccountSchema).optional(),

  // Legacy bank fields - will be deprecated
  bankName: z.string().optional().or(z.literal("")),
  bankAccount: z.string().optional().or(z.literal("")),
  bankAccountName: z.string().optional().or(z.literal("")),

  notes: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

// GET /admin/mustahiqs - List with pagination and filters
app.get("/", async (c) => {
  try {
    const db = c.get("db");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const asnafCategory = c.req.query("asnafCategory") || "";
    const status = c.req.query("status") || "";

    const offset = (page - 1) * limit;

    let conditions = [];

    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(mustahiqs.name, `%${search}%`),
          ilike(mustahiqs.mustahiqId, `%${search}%`),
          ilike(mustahiqs.phone, `%${search}%`),
          ilike(mustahiqs.email, `%${search}%`)
        )
      );
    }

    // Asnaf Category filter
    if (asnafCategory) {
      conditions.push(eq(mustahiqs.asnafCategory, asnafCategory));
    }

    // Status filter
    if (status === "active") {
      conditions.push(eq(mustahiqs.isActive, true));
    } else if (status === "inactive") {
      conditions.push(eq(mustahiqs.isActive, false));
    }

    const whereClause = conditions.length > 0 ? conditions : undefined;

    // Get mustahiqs
    const mustahiqList = await db.query.mustahiqs.findMany({
      where: whereClause ? (conditions.length > 1 ? or(...conditions) : conditions[0]) : undefined,
      limit,
      offset,
      orderBy: [desc(mustahiqs.createdAt)],
      with: {
        province: true,
        regency: true,
        district: true,
        village: true,
      },
    });

    // Fetch bank accounts for all mustahiqs
    const mustahiqIds = mustahiqList.map((m) => m.id);
    const bankAccountsList = mustahiqIds.length > 0
      ? await db
          .select()
          .from(entityBankAccounts)
          .where(
            and(
              eq(entityBankAccounts.entityType, "mustahiq"),
              or(...mustahiqIds.map((id) => eq(entityBankAccounts.entityId, id)))
            )
          )
      : [];

    // Group bank accounts by mustahiq ID
    const bankAccountsMap = new Map<string, typeof bankAccountsList>();
    bankAccountsList.forEach((account) => {
      const existing = bankAccountsMap.get(account.entityId) || [];
      bankAccountsMap.set(account.entityId, [...existing, account]);
    });

    // Attach bank accounts to mustahiqs
    const mustahiqListWithBankAccounts = mustahiqList.map((mustahiq) => ({
      ...mustahiq,
      bankAccounts: bankAccountsMap.get(mustahiq.id) || [],
    }));

    // Get total count
    const totalMustahiqs = await db.query.mustahiqs.findMany({
      where: whereClause ? (conditions.length > 1 ? or(...conditions) : conditions[0]) : undefined,
    });

    return c.json({
      data: mustahiqListWithBankAccounts,
      pagination: {
        page,
        limit,
        total: totalMustahiqs.length,
        totalPages: Math.ceil(totalMustahiqs.length / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching mustahiqs:", error);
    return c.json({ error: "Failed to fetch mustahiqs" }, 500);
  }
});

// GET /admin/mustahiqs/:id - Get single mustahiq
app.get("/:id", async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const mustahiq = await db.query.mustahiqs.findFirst({
      where: eq(mustahiqs.id, id),
      with: {
        province: true,
        regency: true,
        district: true,
        village: true,
      },
    });

    if (!mustahiq) {
      return c.json({ error: "Mustahiq not found" }, 404);
    }

    // Fetch bank accounts for this mustahiq
    const bankAccountsList = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "mustahiq"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    return c.json({
      data: {
        ...mustahiq,
        bankAccounts: bankAccountsList,
      },
    });
  } catch (error: any) {
    console.error("Error fetching mustahiq:", error);
    return c.json({ error: "Failed to fetch mustahiq" }, 500);
  }
});

// POST /admin/mustahiqs - Create new mustahiq
app.post("/", requireRole("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();
    const validated = mustahiqSchema.parse(body);
    
    // Normalize contact data
    const normalizedBody = normalizeContactData(validated);

    // Extract bank accounts
    const { bankAccounts, ...data } = normalizedBody;

    // Convert empty strings to null for optional fields to avoid unique constraint issues
    const [newMustahiq] = await db
      .insert(mustahiqs)
      .values({
        name: data.name,
        asnafCategory: data.asnafCategory,
        mustahiqId: data.mustahiqId || null,
        email: data.email || null,
        phone: data.phone || null,
        whatsappNumber: data.whatsappNumber || null,
        website: data.website || null,
        provinceCode: data.provinceCode || null,
        regencyCode: data.regencyCode || null,
        districtCode: data.districtCode || null,
        villageCode: data.villageCode || null,
        detailAddress: data.detailAddress || null,
        nationalId: data.nationalId || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankAccountName: data.bankAccountName || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      })
      .returning();

    // Insert bank accounts if provided
    if (bankAccounts && bankAccounts.length > 0) {
      const bankAccountsToInsert = bankAccounts.map((account: any) => ({
        entityType: "mustahiq",
        entityId: newMustahiq.id,
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
          eq(entityBankAccounts.entityType, "mustahiq"),
          eq(entityBankAccounts.entityId, newMustahiq.id)
        )
      );

    return c.json({
      data: {
        ...newMustahiq,
        bankAccounts: createdBankAccounts,
      },
    }, 201);
  } catch (error: any) {
    console.error("Error creating mustahiq:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to create mustahiq" }, 500);
  }
});

// PUT /admin/mustahiqs/:id - Update mustahiq
app.put("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = mustahiqSchema.parse(body);
    
    // Normalize contact data
    const normalizedBody = normalizeContactData(validated);

    // Extract bank accounts
    const { bankAccounts, ...data } = normalizedBody;

    // Convert empty strings to null for optional fields to avoid unique constraint issues
    const [updatedMustahiq] = await db
      .update(mustahiqs)
      .set({
        ...data,
        mustahiqId: data.mustahiqId || null,
        email: data.email || null,
        phone: data.phone || null,
        whatsappNumber: data.whatsappNumber || null,
        website: data.website || null,
        provinceCode: data.provinceCode || null,
        regencyCode: data.regencyCode || null,
        districtCode: data.districtCode || null,
        villageCode: data.villageCode || null,
        detailAddress: data.detailAddress || null,
        nationalId: data.nationalId || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankAccountName: data.bankAccountName || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(mustahiqs.id, id))
      .returning();

    if (!updatedMustahiq) {
      return c.json({ error: "Mustahiq not found" }, 404);
    }

    // Update bank accounts - delete old ones and insert new ones
    if (bankAccounts !== undefined) {
      // Delete existing bank accounts
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityType, "mustahiq"),
            eq(entityBankAccounts.entityId, id)
          )
        );

      // Insert new bank accounts if any
      if (bankAccounts && bankAccounts.length > 0) {
        const bankAccountsToInsert = bankAccounts.map((account: any) => ({
          entityType: "mustahiq",
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
          eq(entityBankAccounts.entityType, "mustahiq"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    return c.json({
      data: {
        ...updatedMustahiq,
        bankAccounts: updatedBankAccounts,
      },
    });
  } catch (error: any) {
    console.error("Error updating mustahiq:", error);
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors[0].message }, 400);
    }
    return c.json({ error: "Failed to update mustahiq" }, 500);
  }
});

// DELETE /admin/mustahiqs/:id - Delete mustahiq
app.delete("/:id", requireRole("super_admin", "admin_campaign"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    // Delete associated bank accounts first
    await db
      .delete(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "mustahiq"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    const [deletedMustahiq] = await db
      .delete(mustahiqs)
      .where(eq(mustahiqs.id, id))
      .returning();

    if (!deletedMustahiq) {
      return c.json({ error: "Mustahiq not found" }, 404);
    }

    return c.json({ message: "Mustahiq deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting mustahiq:", error);
    return c.json({ error: "Failed to delete mustahiq" }, 500);
  }
});

export default app;
