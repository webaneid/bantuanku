import { Hono } from "hono";
import {
  mitra,
  entityBankAccounts,
  campaigns,
  zakatTypes,
  qurbanPackages,
  qurbanPackagePeriods,
  transactions,
  indonesiaProvinces,
  indonesiaRegencies,
  indonesiaDistricts,
  indonesiaVillages,
  users,
  userRoles,
  roles,
  createId,
  generateSlug,
} from "@bantuanku/db";
import { eq, ilike, or, desc, and, sql, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireRoles } from "../../middleware/auth";
import { success, error, paginated } from "../../lib/response";
import { normalizeContactData } from "../../lib/contact-helpers";
import { hashPassword } from "../../lib/password";
import type { Env, Variables } from "../../types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const buildMitraProgramData = async (
  db: any,
  ownerUserId: string | null | undefined,
  campaignList: any[]
) => {
  const normalizedOwnerUserId = ownerUserId || null;

  const zakatTypeList = normalizedOwnerUserId
    ? await db
        .select({
          id: zakatTypes.id,
          title: zakatTypes.name,
          slug: zakatTypes.slug,
          status: sql<string>`case when ${zakatTypes.isActive} then 'active' else 'inactive' end`,
          createdAt: zakatTypes.createdAt,
        })
        .from(zakatTypes)
        .where(eq(zakatTypes.createdBy, normalizedOwnerUserId))
        .orderBy(desc(zakatTypes.createdAt))
    : [];

  const qurbanPackageList = normalizedOwnerUserId
    ? await db
        .select({
          id: qurbanPackages.id,
          title: qurbanPackages.name,
          slug: qurbanPackages.id,
          status: sql<string>`case when ${qurbanPackages.isAvailable} then 'active' else 'inactive' end`,
          createdAt: qurbanPackages.createdAt,
        })
        .from(qurbanPackages)
        .where(eq(qurbanPackages.createdBy, normalizedOwnerUserId))
        .orderBy(desc(qurbanPackages.createdAt))
    : [];

  const zakatStatsMap = new Map<string, { collected: number; donorCount: number }>();
  if (zakatTypeList.length > 0) {
    const ownedZakatTypeIds = new Set(zakatTypeList.map((item: any) => item.id));
    const paidZakatTransactions = await db
      .select({
        totalAmount: transactions.totalAmount,
        typeSpecificData: transactions.typeSpecificData,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.productType, "zakat"),
          eq(transactions.paymentStatus, "paid")
        )
      );

    for (const tx of paidZakatTransactions) {
      const txZakatTypeId = (tx.typeSpecificData as any)?.zakat_type_id;
      if (!txZakatTypeId || !ownedZakatTypeIds.has(txZakatTypeId)) continue;

      const current = zakatStatsMap.get(txZakatTypeId) || { collected: 0, donorCount: 0 };
      current.collected += Number(tx.totalAmount || 0);
      current.donorCount += 1;
      zakatStatsMap.set(txZakatTypeId, current);
    }
  }

  const qurbanStatsMap = new Map<string, { collected: number; donorCount: number }>();
  if (qurbanPackageList.length > 0) {
    const packageIds = qurbanPackageList.map((item: any) => item.id);
    const ownedPackagePeriods = await db
      .select({
        packagePeriodId: qurbanPackagePeriods.id,
        packageId: qurbanPackagePeriods.packageId,
      })
      .from(qurbanPackagePeriods)
      .where(inArray(qurbanPackagePeriods.packageId, packageIds));

    if (ownedPackagePeriods.length > 0) {
      const packagePeriodToPackageMap = new Map<string, string>();
      const packagePeriodIds: string[] = [];

      for (const row of ownedPackagePeriods) {
        packagePeriodToPackageMap.set(row.packagePeriodId, row.packageId);
        packagePeriodIds.push(row.packagePeriodId);
      }

      const paidQurbanTransactions = await db
        .select({
          productId: transactions.productId,
          totalAmount: transactions.totalAmount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.productType, "qurban"),
            eq(transactions.paymentStatus, "paid"),
            inArray(transactions.productId, packagePeriodIds)
          )
        );

      for (const tx of paidQurbanTransactions) {
        const packageId = packagePeriodToPackageMap.get(tx.productId);
        if (!packageId) continue;

        const current = qurbanStatsMap.get(packageId) || { collected: 0, donorCount: 0 };
        current.collected += Number(tx.totalAmount || 0);
        current.donorCount += 1;
        qurbanStatsMap.set(packageId, current);
      }
    }
  }

  const programs = [
    ...campaignList.map((item: any) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status || "draft",
      programType: "campaign" as const,
      pillar: item.pillar,
      goal: item.goal,
      collected: item.collected,
      donorCount: item.donorCount,
      createdAt: item.createdAt,
    })),
    ...zakatTypeList.map((item: any) => {
      const stat = zakatStatsMap.get(item.id) || { collected: 0, donorCount: 0 };
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        status: item.status,
        programType: "zakat" as const,
        pillar: "zakat",
        goal: 0,
        collected: stat.collected,
        donorCount: stat.donorCount,
        createdAt: item.createdAt,
      };
    }),
    ...qurbanPackageList.map((item: any) => {
      const stat = qurbanStatsMap.get(item.id) || { collected: 0, donorCount: 0 };
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        status: item.status,
        programType: "qurban" as const,
        pillar: "qurban",
        goal: 0,
        collected: stat.collected,
        donorCount: stat.donorCount, // untuk qurban = total order
        createdAt: item.createdAt,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    zakatTypeList,
    qurbanPackageList,
    programs,
  };
};

// Validation schemas
const bankAccountSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, "Nama bank wajib diisi"),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  accountHolderName: z.string().min(1, "Nama pemilik wajib diisi"),
});

const mitraSchema = z.object({
  name: z.string().min(3, "Nama lembaga minimal 3 karakter"),
  slug: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),

  picName: z.string().min(2, "Nama penanggung jawab minimal 2 karakter"),
  picPosition: z.string().optional(),

  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10).optional(),
  whatsappNumber: z.string().min(10).optional(),
  website: z.string().optional(),

  detailAddress: z.string().optional(),
  provinceCode: z.string().optional(),
  regencyCode: z.string().optional(),
  districtCode: z.string().optional(),
  villageCode: z.string().optional(),
  postalCode: z.string().optional().nullable(),

  ktpUrl: z.string().optional(),
  bankBookUrl: z.string().optional(),
  npwpUrl: z.string().optional(),

  bankAccounts: z.array(bankAccountSchema).optional(),

  notes: z.string().optional(),

  password: z.string().min(8, "Password minimal 8 karakter").optional(),
});

// GET /admin/mitra/me - Mitra lihat data sendiri
app.get("/me", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user")!;

    const baseSelect = db
      .select({
        id: mitra.id,
        name: mitra.name,
        slug: mitra.slug,
        description: mitra.description,
        logoUrl: mitra.logoUrl,
        picName: mitra.picName,
        picPosition: mitra.picPosition,
        email: mitra.email,
        phone: mitra.phone,
        whatsappNumber: mitra.whatsappNumber,
        website: mitra.website,
        detailAddress: mitra.detailAddress,
        provinceCode: mitra.provinceCode,
        regencyCode: mitra.regencyCode,
        districtCode: mitra.districtCode,
        villageCode: mitra.villageCode,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        ktpUrl: mitra.ktpUrl,
        bankBookUrl: mitra.bankBookUrl,
        npwpUrl: mitra.npwpUrl,
        status: mitra.status,
        totalPrograms: mitra.totalPrograms,
        totalDonationReceived: mitra.totalDonationReceived,
        totalRevenueEarned: mitra.totalRevenueEarned,
        currentBalance: mitra.currentBalance,
        totalWithdrawn: mitra.totalWithdrawn,
        userId: mitra.userId,
        createdAt: mitra.createdAt,
      })
      .from(mitra)
      .leftJoin(indonesiaProvinces, eq(mitra.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(mitra.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(mitra.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(mitra.villageCode, indonesiaVillages.code));

    // Cari mitra berdasarkan userId dari JWT.
    let [record] = await baseSelect
      .where(eq(mitra.userId, user.id))
      .limit(1);

    // Fallback untuk data lama yang belum link userId.
    if (!record && user.email) {
      [record] = await baseSelect
        .where(eq(mitra.email, user.email))
        .limit(1);
    }

    if (!record) {
      return error(c, "Data mitra tidak ditemukan untuk akun ini", 404);
    }

    // Get bank accounts
    const bankAccountsList = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "mitra"),
          eq(entityBankAccounts.entityId, record.id)
        )
      );

    // Get campaigns
    const campaignList = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        status: campaigns.status,
        pillar: campaigns.pillar,
        goal: campaigns.goal,
        collected: campaigns.collected,
        donorCount: campaigns.donorCount,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.mitraId, record.id))
      .orderBy(desc(campaigns.createdAt));

    const { zakatTypeList, qurbanPackageList, programs } = await buildMitraProgramData(
      db,
      record.userId || user.id,
      campaignList
    );

    return success(c, {
      ...record,
      bankAccounts: bankAccountsList,
      campaigns: campaignList,
      zakatTypes: zakatTypeList,
      qurbanPackages: qurbanPackageList,
      programs,
    });
  } catch (err: any) {
    console.error("Error fetching mitra me:", err);
    return error(c, "Failed to fetch mitra data", 500);
  }
});

// GET /admin/mitra/me/programs - Mitra lihat program miliknya
app.get("/me/programs", async (c) => {
  try {
    const db = c.get("db");
    const user = c.get("user")!;

    // Cari mitra berdasarkan userId
    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.userId, user.id),
    });

    if (!mitraRecord) {
      return error(c, "Data mitra tidak ditemukan", 404);
    }

    const campaignList = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        status: campaigns.status,
        pillar: campaigns.pillar,
        goal: campaigns.goal,
        collected: campaigns.collected,
        donorCount: campaigns.donorCount,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.mitraId, mitraRecord.id))
      .orderBy(desc(campaigns.createdAt));

    const { zakatTypeList, qurbanPackageList, programs } = await buildMitraProgramData(
      db,
      mitraRecord.userId || user.id,
      campaignList
    );

    return success(c, {
      campaigns: campaignList,
      zakatTypes: zakatTypeList,
      qurbanPackages: qurbanPackageList,
      programs,
    });
  } catch (err: any) {
    console.error("Error fetching mitra programs:", err);
    return error(c, "Failed to fetch programs", 500);
  }
});

// GET /admin/mitra/stats
app.get("/stats", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");

    const [stats] = await db
      .select({
        totalMitra: sql<number>`count(*)`,
        pendingMitra: sql<number>`count(*) filter (where ${mitra.status} = 'pending')`,
        verifiedMitra: sql<number>`count(*) filter (where ${mitra.status} = 'verified')`,
        rejectedMitra: sql<number>`count(*) filter (where ${mitra.status} = 'rejected')`,
        suspendedMitra: sql<number>`count(*) filter (where ${mitra.status} = 'suspended')`,
        totalDonationReceived: sql<number>`coalesce(sum(${mitra.totalDonationReceived}), 0)`,
        totalRevenueEarned: sql<number>`coalesce(sum(${mitra.totalRevenueEarned}), 0)`,
      })
      .from(mitra);

    return success(c, stats);
  } catch (err: any) {
    console.error("Error fetching mitra stats:", err);
    return error(c, "Failed to fetch stats", 500);
  }
});

// GET /admin/mitra - List with pagination (staff only)
app.get("/", requireRoles("super_admin", "admin_campaign", "admin_finance"), async (c) => {
  try {
    const db = c.get("db");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "";
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status) {
      conditions.push(eq(mitra.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(mitra.name, `%${search}%`),
          ilike(mitra.email, `%${search}%`),
          ilike(mitra.picName, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0
      ? (conditions.length > 1 ? and(...conditions) : conditions[0])
      : undefined;

    const list = await db
      .select({
        id: mitra.id,
        name: mitra.name,
        slug: mitra.slug,
        logoUrl: mitra.logoUrl,
        picName: mitra.picName,
        email: mitra.email,
        phone: mitra.phone,
        status: mitra.status,
        totalPrograms: mitra.totalPrograms,
        totalDonationReceived: mitra.totalDonationReceived,
        totalRevenueEarned: mitra.totalRevenueEarned,
        currentBalance: mitra.currentBalance,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        createdAt: mitra.createdAt,
      })
      .from(mitra)
      .leftJoin(indonesiaProvinces, eq(mitra.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(mitra.regencyCode, indonesiaRegencies.code))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(mitra.createdAt));

    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(mitra)
      .where(whereClause);

    return paginated(c, list, {
      page,
      limit,
      total: Number(countResult?.total || 0),
    });
  } catch (err: any) {
    console.error("Error fetching mitra:", err);
    return error(c, "Failed to fetch mitra", 500);
  }
});

// GET /admin/mitra/:id - Detail (staff only, mitra gunakan /me)
app.get("/:id", requireRoles("super_admin", "admin_campaign", "admin_finance"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const [record] = await db
      .select({
        id: mitra.id,
        name: mitra.name,
        slug: mitra.slug,
        description: mitra.description,
        logoUrl: mitra.logoUrl,
        picName: mitra.picName,
        picPosition: mitra.picPosition,
        email: mitra.email,
        phone: mitra.phone,
        whatsappNumber: mitra.whatsappNumber,
        website: mitra.website,
        detailAddress: mitra.detailAddress,
        provinceCode: mitra.provinceCode,
        regencyCode: mitra.regencyCode,
        districtCode: mitra.districtCode,
        villageCode: mitra.villageCode,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        villagePostalCode: indonesiaVillages.postalCode,
        ktpUrl: mitra.ktpUrl,
        bankBookUrl: mitra.bankBookUrl,
        npwpUrl: mitra.npwpUrl,
        status: mitra.status,
        verifiedBy: mitra.verifiedBy,
        verifiedAt: mitra.verifiedAt,
        rejectionReason: mitra.rejectionReason,
        totalPrograms: mitra.totalPrograms,
        totalDonationReceived: mitra.totalDonationReceived,
        totalRevenueEarned: mitra.totalRevenueEarned,
        currentBalance: mitra.currentBalance,
        totalWithdrawn: mitra.totalWithdrawn,
        userId: mitra.userId,
        notes: mitra.notes,
        createdAt: mitra.createdAt,
        updatedAt: mitra.updatedAt,
      })
      .from(mitra)
      .leftJoin(indonesiaProvinces, eq(mitra.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(mitra.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(mitra.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(mitra.villageCode, indonesiaVillages.code))
      .where(eq(mitra.id, id))
      .limit(1);

    if (!record) {
      return error(c, "Mitra tidak ditemukan", 404);
    }

    // Get bank accounts
    const bankAccountsList = await db
      .select()
      .from(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "mitra"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    // Get campaigns count
    const [campaignsCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(campaigns)
      .where(eq(campaigns.mitraId, id));

    return success(c, {
      ...record,
      bankAccounts: bankAccountsList,
      campaignsCount: Number(campaignsCount?.total || 0),
    });
  } catch (err: any) {
    console.error("Error fetching mitra detail:", err);
    return error(c, "Failed to fetch mitra", 500);
  }
});

// POST /admin/mitra - Create
app.post("/", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();
    const validated = mitraSchema.parse(body);

    const { bankAccounts, postalCode, password, ...data } = validated;

    // Normalize kontak
    const normalized = normalizeContactData(data);

    // Generate slug
    let slug = data.slug || generateSlug(data.name);
    const existingSlug = await db.query.mitra.findFirst({
      where: eq(mitra.slug, slug),
    });
    if (existingSlug) {
      slug = slug + "-" + createId().slice(0, 4);
    }

    const cleanData: any = {
      ...normalized,
      slug,
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      ktpUrl: data.ktpUrl || null,
      bankBookUrl: data.bankBookUrl || null,
      npwpUrl: data.npwpUrl || null,
      logoUrl: data.logoUrl || null,
      status: "pending",
    };

    // If password provided, create user account
    if (password) {
      // Check email uniqueness
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });
      if (existingUser) {
        return error(c, "Email sudah digunakan oleh user lain", 400);
      }

      // Find mitra role
      const mitraRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "mitra"),
      });
      if (!mitraRole) {
        return error(c, "Role mitra belum tersedia", 400);
      }

      // Hash password & create user
      const passwordHash = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          id: createId(),
          email: data.email,
          passwordHash,
          name: data.picName,
          phone: data.phone || null,
          isActive: true,
        })
        .returning();

      // Assign mitra role
      await db.insert(userRoles).values({
        id: createId(),
        userId: newUser.id,
        roleId: mitraRole.id,
      });

      cleanData.userId = newUser.id;
    }

    const [newMitra] = await db.insert(mitra).values(cleanData).returning();

    // Insert bank accounts
    if (bankAccounts && bankAccounts.length > 0) {
      const bankAccountsToInsert = bankAccounts.map((account) => ({
        entityType: "mitra",
        entityId: newMitra.id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
      }));
      await db.insert(entityBankAccounts).values(bankAccountsToInsert);
    }

    return success(c, newMitra, "Mitra berhasil dibuat", 201);
  } catch (err: any) {
    console.error("Error creating mitra:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to create mitra", 500);
  }
});

// PUT /admin/mitra/:id - Update
app.put("/:id", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = mitraSchema.parse(body);

    const { bankAccounts, postalCode, ...data } = validated;

    const normalized = normalizeContactData(data);

    const cleanData: any = {
      ...normalized,
      detailAddress: data.detailAddress || null,
      provinceCode: data.provinceCode || null,
      regencyCode: data.regencyCode || null,
      districtCode: data.districtCode || null,
      villageCode: data.villageCode || null,
      ktpUrl: data.ktpUrl || null,
      bankBookUrl: data.bankBookUrl || null,
      npwpUrl: data.npwpUrl || null,
      logoUrl: data.logoUrl || null,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(mitra)
      .set(cleanData)
      .where(eq(mitra.id, id))
      .returning();

    if (!updated) {
      return error(c, "Mitra tidak ditemukan", 404);
    }

    // Replace bank accounts
    if (bankAccounts !== undefined) {
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityType, "mitra"),
            eq(entityBankAccounts.entityId, id)
          )
        );

      if (bankAccounts.length > 0) {
        const bankAccountsToInsert = bankAccounts.map((account) => ({
          entityType: "mitra",
          entityId: id,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
        }));
        await db.insert(entityBankAccounts).values(bankAccountsToInsert);
      }
    }

    return success(c, updated, "Mitra berhasil diupdate");
  } catch (err: any) {
    console.error("Error updating mitra:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to update mitra", 500);
  }
});

// DELETE /admin/mitra/:id
app.delete("/:id", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    // Check if has active campaigns
    const [campaignsCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(campaigns)
      .where(and(eq(campaigns.mitraId, id), eq(campaigns.status, "active")));

    if (Number(campaignsCount?.total || 0) > 0) {
      return error(c, "Tidak bisa menghapus mitra yang memiliki program aktif", 400);
    }

    // Delete bank accounts first
    await db
      .delete(entityBankAccounts)
      .where(
        and(
          eq(entityBankAccounts.entityType, "mitra"),
          eq(entityBankAccounts.entityId, id)
        )
      );

    // Delete mitra
    const [deleted] = await db
      .delete(mitra)
      .where(eq(mitra.id, id))
      .returning();

    if (!deleted) {
      return error(c, "Mitra tidak ditemukan", 404);
    }

    return success(c, null, "Mitra berhasil dihapus");
  } catch (err: any) {
    console.error("Error deleting mitra:", err);
    return error(c, "Failed to delete mitra", 500);
  }
});

// POST /admin/mitra/:id/verify
app.post("/:id/verify", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const user = c.get("user");

    const existing = await db.query.mitra.findFirst({ where: eq(mitra.id, id) });
    if (!existing) return error(c, "Mitra tidak ditemukan", 404);
    if (existing.status === "verified") return error(c, "Mitra sudah terverifikasi", 400);

    const [updated] = await db
      .update(mitra)
      .set({
        status: "verified",
        verifiedBy: user.id,
        verifiedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(mitra.id, id))
      .returning();

    return success(c, updated, "Mitra berhasil diverifikasi");
  } catch (err: any) {
    console.error("Error verifying mitra:", err);
    return error(c, "Failed to verify mitra", 500);
  }
});

// POST /admin/mitra/:id/reject
app.post("/:id/reject", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { reason } = body;

    const existing = await db.query.mitra.findFirst({ where: eq(mitra.id, id) });
    if (!existing) return error(c, "Mitra tidak ditemukan", 404);

    const [updated] = await db
      .update(mitra)
      .set({
        status: "rejected",
        rejectionReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(mitra.id, id))
      .returning();

    return success(c, updated, "Mitra ditolak");
  } catch (err: any) {
    console.error("Error rejecting mitra:", err);
    return error(c, "Failed to reject mitra", 500);
  }
});

// POST /admin/mitra/:id/suspend
app.post("/:id/suspend", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const [updated] = await db
      .update(mitra)
      .set({
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(eq(mitra.id, id))
      .returning();

    if (!updated) return error(c, "Mitra tidak ditemukan", 404);

    return success(c, updated, "Mitra berhasil di-suspend");
  } catch (err: any) {
    console.error("Error suspending mitra:", err);
    return error(c, "Failed to suspend mitra", 500);
  }
});

// POST /admin/mitra/:id/activate
app.post("/:id/activate", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const [updated] = await db
      .update(mitra)
      .set({
        status: "verified",
        updatedAt: new Date(),
      })
      .where(eq(mitra.id, id))
      .returning();

    if (!updated) return error(c, "Mitra tidak ditemukan", 404);

    return success(c, updated, "Mitra berhasil diaktifkan");
  } catch (err: any) {
    console.error("Error activating mitra:", err);
    return error(c, "Failed to activate mitra", 500);
  }
});

// POST /admin/mitra/:id/activate-user - Activate mitra as user account
app.post("/:id/activate-user", requireRoles("super_admin"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");
    const body = await c.req.json();

    const schema = z.object({
      email: z.string().email("Email tidak valid"),
      password: z.string().min(8, "Password minimal 8 karakter"),
    });

    const { email, password } = schema.parse(body);

    // 1. Check mitra exists and doesn't have user_id yet
    const existing = await db.query.mitra.findFirst({
      where: eq(mitra.id, id),
    });

    if (!existing) {
      return error(c, "Mitra tidak ditemukan", 404);
    }

    if (existing.userId) {
      return error(c, "Mitra sudah memiliki akun user", 400);
    }

    // 2. Check email not taken
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return error(c, "Email sudah digunakan", 400);
    }

    // 3. Find mitra role
    const mitraRole = await db.query.roles.findFirst({
      where: eq(roles.slug, "mitra"),
    });

    if (!mitraRole) {
      return error(c, "Role mitra belum tersedia", 400);
    }

    // 4. Hash password & create user
    const passwordHash = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        id: createId(),
        email,
        passwordHash,
        name: existing.picName,
        phone: existing.phone || null,
        isActive: true,
      })
      .returning();

    // 5. Assign mitra role
    await db.insert(userRoles).values({
      id: createId(),
      userId: newUser.id,
      roleId: mitraRole.id,
    });

    // 6. Update mitra with userId
    await db
      .update(mitra)
      .set({
        userId: newUser.id,
        updatedAt: new Date(),
      })
      .where(eq(mitra.id, id));

    return success(c, {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      role: {
        id: mitraRole.id,
        slug: mitraRole.slug,
        name: mitraRole.name,
      },
    }, "Akun login mitra berhasil dibuat", 201);
  } catch (err: any) {
    console.error("Error activating mitra user:", err);
    if (err instanceof z.ZodError) {
      return error(c, err.errors[0].message, 400);
    }
    return error(c, "Failed to activate mitra user", 500);
  }
});

// GET /admin/mitra/:id/programs - List programs belonging to mitra (staff only)
app.get("/:id/programs", requireRoles("super_admin", "admin_campaign", "admin_finance"), async (c) => {
  try {
    const db = c.get("db");
    const id = c.req.param("id");

    const mitraRecord = await db.query.mitra.findFirst({
      where: eq(mitra.id, id),
      columns: { id: true, userId: true },
    });

    if (!mitraRecord) {
      return error(c, "Mitra tidak ditemukan", 404);
    }

    const campaignList = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        slug: campaigns.slug,
        status: campaigns.status,
        pillar: campaigns.pillar,
        goal: campaigns.goal,
        collected: campaigns.collected,
        donorCount: campaigns.donorCount,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.mitraId, id))
      .orderBy(desc(campaigns.createdAt));

    const { zakatTypeList, qurbanPackageList, programs } = await buildMitraProgramData(
      db,
      mitraRecord.userId,
      campaignList
    );

    return success(c, {
      campaigns: campaignList,
      zakatTypes: zakatTypeList,
      qurbanPackages: qurbanPackageList,
      programs,
    });
  } catch (err: any) {
    console.error("Error fetching mitra programs:", err);
    return error(c, "Failed to fetch programs", 500);
  }
});

export default app;
