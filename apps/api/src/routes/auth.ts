import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, userRoles, roles, createId } from "@bantuanku/db";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { success, error } from "../lib/response";
import { authMiddleware } from "../middleware/auth";
import { authRateLimit } from "../middleware/ratelimit";
import { WhatsAppService } from "../services/whatsapp";
import type { Env, Variables } from "../types";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255),
  phone: z.string().max(20).optional(),
  whatsappNumber: z.string().min(10).max(20),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().max(128),
});

auth.post("/register", authRateLimit, zValidator("json", registerSchema), async (c) => {
  const { email, password, name, phone, whatsappNumber } = c.req.valid("json");
  const db = c.get("db");

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return error(c, "Email already registered", 400);
  }

  const passwordHash = await hashPassword(password);
  const userId = createId();

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    name,
    phone,
    whatsappNumber,
  });

  const userRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "user"),
  });

  if (userRole) {
    await db.insert(userRoles).values({
      userId,
      roleId: userRole.id,
    });
  }

  // Create or update donatur record for this user
  const { donatur, transactions } = await import("@bantuanku/db");
  const existingDonatur = await db.query.donatur.findFirst({
    where: eq(donatur.email, email.toLowerCase().trim()),
  });

  if (existingDonatur) {
    // Update existing donatur with password and link to user account
    await db
      .update(donatur)
      .set({
        passwordHash,
        name,
        phone: phone || existingDonatur.phone,
        whatsappNumber: whatsappNumber || existingDonatur.whatsappNumber,
        userId,
        updatedAt: new Date(),
      })
      .where(eq(donatur.id, existingDonatur.id));
  } else {
    // Create new donatur record linked to user account
    await db.insert(donatur).values({
      id: createId(),
      email,
      passwordHash,
      name,
      phone,
      whatsappNumber,
      userId,
    });
  }

  // Link existing transactions to new user account
  const { or } = await import("drizzle-orm");

  const normalizePhone = (input: string): string => {
    let cleaned = input.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+62")) {
      cleaned = "0" + cleaned.substring(3);
    } else if (cleaned.startsWith("62") && cleaned.length > 10) {
      cleaned = "0" + cleaned.substring(2);
    }
    if (cleaned && !cleaned.startsWith("0")) {
      cleaned = "0" + cleaned;
    }
    return cleaned;
  };

  const conditions = [eq(transactions.donorEmail, email.toLowerCase().trim())];
  if (phone) {
    conditions.push(eq(transactions.donorPhone, normalizePhone(phone)));
  }
  if (whatsappNumber) {
    conditions.push(eq(transactions.donorPhone, normalizePhone(whatsappNumber)));
  }

  if (conditions.length > 0) {
    await db
      .update(transactions)
      .set({ userId, updatedAt: new Date() })
      .where(or(...conditions));
  }

  // WhatsApp notification: selamat datang
  if (whatsappNumber) {
    try {
      const wa = new WhatsAppService(db, c.env.FRONTEND_URL);
      const waResult = await wa.send({
        phone: whatsappNumber,
        templateKey: "wa_tpl_register_welcome",
        variables: {
          customer_name: name,
          customer_email: email,
          customer_phone: phone || whatsappNumber,
        },
      });
      console.log("[WA] welcome notification result:", waResult);
    } catch (err) {
      console.error("[WA] welcome notification error:", err);
    }
  }

  return success(c, { id: userId, email, name }, "Registration successful", 201);
});

auth.post("/login", authRateLimit, zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = c.get("db");

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.passwordHash) {
    return error(c, "Invalid email or password", 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return error(c, "Invalid email or password", 401);
  }

  if (!user.isActive) {
    return error(c, "Account is disabled", 403);
  }

  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, user.id),
    with: {
      role: true,
    },
  });

  const rolesSlugs = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

  const accessToken = await signToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      roles: rolesSlugs,
      isDeveloper: Boolean(user.isDeveloper),
    },
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN || "15m"
  );

  const refreshToken = await signRefreshToken(user.id, c.env.JWT_SECRET);

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return success(c, {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      roles: rolesSlugs,
      isDeveloper: Boolean(user.isDeveloper),
    },
  });
});

auth.post("/refresh", async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;

  if (!refreshToken) {
    return error(c, "Refresh token required", 400);
  }

  const userId = await verifyRefreshToken(refreshToken, c.env.JWT_SECRET);

  if (!userId) {
    return error(c, "Invalid refresh token", 401);
  }

  const db = c.get("db");
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.isActive) {
    return error(c, "User not found or disabled", 401);
  }

  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, user.id),
    with: {
      role: true,
    },
  });

  const rolesSlugs = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

  const accessToken = await signToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      roles: rolesSlugs,
      isDeveloper: Boolean(user.isDeveloper),
    },
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN || "15m"
  );

  const newRefreshToken = await signRefreshToken(user.id, c.env.JWT_SECRET);

  return success(c, {
    accessToken,
    refreshToken: newRefreshToken,
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");

  // Fetch user auth data
  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
    columns: {
      id: true,
      email: true,
      name: true,
      phone: true,
      whatsappNumber: true,
      avatar: true,
      emailVerifiedAt: true,
      isDeveloper: true,
      createdAt: true,
    },
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  // Fetch donatur profile data (full profile)
  const { donatur, entityBankAccounts } = await import("@bantuanku/db");
  const donaturProfile = await db.query.donatur.findFirst({
    where: eq(donatur.email, user.email.toLowerCase().trim()),
    with: {
      province: true,
      regency: true,
      district: true,
      village: true,
    },
  });

  // Fetch bank accounts (linked to donatur, not user)
  let bankAccounts: any[] = [];
  if (donaturProfile) {
    bankAccounts = await db.query.entityBankAccounts.findMany({
      where: eq(entityBankAccounts.entityId, donaturProfile.id),
    });
  }

  // Debug: fetch roles from database to compare
  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, currentUser!.id),
    with: {
      role: true,
    },
  });

  const dbRoles = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

  console.log("=== /auth/me Debug ===");
  console.log("User ID:", currentUser!.id);
  console.log("User data from DB:", user);
  console.log("Donatur profile:", donaturProfile);
  console.log("Roles from JWT:", currentUser!.roles);
  console.log("Roles from DB:", dbRoles);

  const responseData = {
    ...user,
    // Include donatur profile fields
    website: donaturProfile?.website,
    detailAddress: donaturProfile?.detailAddress,
    provinceCode: donaturProfile?.provinceCode,
    regencyCode: donaturProfile?.regencyCode,
    districtCode: donaturProfile?.districtCode,
    villageCode: donaturProfile?.villageCode,
    province: donaturProfile?.province,
    regency: donaturProfile?.regency,
    district: donaturProfile?.district,
    village: donaturProfile?.village,
    donaturId: donaturProfile?.id,
    bankAccounts,
    roles: currentUser!.roles,
    isDeveloper: Boolean(user.isDeveloper),
    dbRoles: dbRoles, // Add this for debugging
  };

  console.log("Response data:", responseData);

  return success(c, responseData);
});

auth.patch("/me", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");
  const body = await c.req.json();

  const {
    name,
    phone,
    whatsappNumber,
    website,
    detailAddress,
    provinceCode,
    regencyCode,
    districtCode,
    villageCode,
    bankAccounts,
  } = body;

  // Get current user
  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  // Update basic info in users table
  await db
    .update(users)
    .set({
      name: name || undefined,
      phone: phone || undefined,
      whatsappNumber: whatsappNumber || undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser!.id));

  // Update donatur profile
  const { donatur, entityBankAccounts } = await import("@bantuanku/db");
  const donaturProfile = await db.query.donatur.findFirst({
    where: eq(donatur.email, user.email.toLowerCase().trim()),
  });

  if (donaturProfile) {
    // Update existing donatur profile
    await db
      .update(donatur)
      .set({
        name: name || undefined,
        phone: phone || undefined,
        whatsappNumber: whatsappNumber || undefined,
        website: website || undefined,
        detailAddress: detailAddress || undefined,
        provinceCode: provinceCode || undefined,
        regencyCode: regencyCode || undefined,
        districtCode: districtCode || undefined,
        villageCode: villageCode || undefined,
        updatedAt: new Date(),
      })
      .where(eq(donatur.id, donaturProfile.id));

    // Handle bank accounts if provided
    if (bankAccounts && Array.isArray(bankAccounts)) {
      const { and } = await import("drizzle-orm");

      // Delete existing bank accounts for this donatur
      await db
        .delete(entityBankAccounts)
        .where(
          and(
            eq(entityBankAccounts.entityId, donaturProfile.id),
            eq(entityBankAccounts.entityType, "donatur")
          )
        );

      // Insert new bank accounts
      if (bankAccounts.length > 0) {
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityId: donaturProfile.id,
            entityType: "donatur" as const,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }
  } else {
    // Create donatur profile if doesn't exist
    const newDonatur = await db.insert(donatur).values({
      id: createId(),
      email: user.email,
      passwordHash: user.passwordHash,
      name: name || user.name,
      phone: phone || user.phone,
      whatsappNumber: whatsappNumber || user.whatsappNumber,
      website,
      detailAddress,
      provinceCode,
      regencyCode,
      districtCode,
      villageCode,
    }).returning();

    // Insert bank accounts for new donatur
    if (bankAccounts && Array.isArray(bankAccounts) && bankAccounts.length > 0 && newDonatur[0]) {
      await db.insert(entityBankAccounts).values(
        bankAccounts.map((account: any) => ({
          id: createId(),
          entityId: newDonatur[0].id,
          entityType: "donatur" as const,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
        }))
      );
    }
  }

  return success(c, null, "Profile updated");
});

// Get unified profile data for ANY role (employee, mitra, donatur/user, super_admin, etc.)
auth.get("/me/profile-data", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");

  const { employees, mitra: mitraTable, donatur, entityBankAccounts, indonesiaProvinces, indonesiaRegencies, indonesiaDistricts, indonesiaVillages } = await import("@bantuanku/db");

  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
    columns: {
      id: true,
      email: true,
      name: true,
      phone: true,
      whatsappNumber: true,
      avatar: true,
      isDeveloper: true,
      createdAt: true,
    },
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, currentUser!.id),
    with: { role: true },
  });
  const rolesSlugs = userRolesList.map((ur) => (ur as any).role?.slug).filter(Boolean);

  // Determine entity type based on roles
  let entityType: "employee" | "mitra" | "donatur" | null = null;
  let entityData: any = null;
  let bankAccounts: any[] = [];

  // 1. Check employee (super_admin, admin_finance, admin_campaign, program_coordinator, employee)
  const employeeRecord = await db
    .select({
      id: employees.id,
      employeeId: employees.employeeId,
      name: employees.name,
      position: employees.position,
      department: employees.department,
      employmentType: employees.employmentType,
      email: employees.email,
      phone: employees.phone,
      whatsappNumber: employees.whatsappNumber,
      website: employees.website,
      detailAddress: employees.detailAddress,
      provinceCode: employees.provinceCode,
      regencyCode: employees.regencyCode,
      districtCode: employees.districtCode,
      villageCode: employees.villageCode,
      provinceName: indonesiaProvinces.name,
      regencyName: indonesiaRegencies.name,
      districtName: indonesiaDistricts.name,
      villageName: indonesiaVillages.name,
      joinDate: employees.joinDate,
      createdAt: employees.createdAt,
    })
    .from(employees)
    .leftJoin(indonesiaProvinces, eq(employees.provinceCode, indonesiaProvinces.code))
    .leftJoin(indonesiaRegencies, eq(employees.regencyCode, indonesiaRegencies.code))
    .leftJoin(indonesiaDistricts, eq(employees.districtCode, indonesiaDistricts.code))
    .leftJoin(indonesiaVillages, eq(employees.villageCode, indonesiaVillages.code))
    .where(eq(employees.userId, currentUser!.id))
    .limit(1);

  if (employeeRecord.length > 0) {
    entityType = "employee";
    entityData = employeeRecord[0];
    const { and } = await import("drizzle-orm");
    bankAccounts = await db
      .select()
      .from(entityBankAccounts)
      .where(and(eq(entityBankAccounts.entityType, "employee"), eq(entityBankAccounts.entityId, entityData.id)));
  }

  // 2. Check mitra (if no employee found and user has mitra role)
  if (!entityType && rolesSlugs.includes("mitra")) {
    const mitraRecord = await db
      .select({
        id: mitraTable.id,
        name: mitraTable.name,
        slug: mitraTable.slug,
        description: mitraTable.description,
        logoUrl: mitraTable.logoUrl,
        picName: mitraTable.picName,
        picPosition: mitraTable.picPosition,
        email: mitraTable.email,
        phone: mitraTable.phone,
        whatsappNumber: mitraTable.whatsappNumber,
        website: mitraTable.website,
        detailAddress: mitraTable.detailAddress,
        provinceCode: mitraTable.provinceCode,
        regencyCode: mitraTable.regencyCode,
        districtCode: mitraTable.districtCode,
        villageCode: mitraTable.villageCode,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        ktpUrl: mitraTable.ktpUrl,
        bankBookUrl: mitraTable.bankBookUrl,
        npwpUrl: mitraTable.npwpUrl,
        status: mitraTable.status,
        createdAt: mitraTable.createdAt,
      })
      .from(mitraTable)
      .leftJoin(indonesiaProvinces, eq(mitraTable.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(mitraTable.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(mitraTable.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(mitraTable.villageCode, indonesiaVillages.code))
      .where(eq(mitraTable.userId, currentUser!.id))
      .limit(1);

    if (mitraRecord.length > 0) {
      entityType = "mitra";
      entityData = mitraRecord[0];
      const { and } = await import("drizzle-orm");
      bankAccounts = await db
        .select()
        .from(entityBankAccounts)
        .where(and(eq(entityBankAccounts.entityType, "mitra"), eq(entityBankAccounts.entityId, entityData.id)));
    }
  }

  // 3. Fallback to donatur (user role)
  if (!entityType) {
    const donaturRecord = await db
      .select({
        id: donatur.id,
        name: donatur.name,
        email: donatur.email,
        phone: donatur.phone,
        whatsappNumber: donatur.whatsappNumber,
        website: donatur.website,
        detailAddress: donatur.detailAddress,
        provinceCode: donatur.provinceCode,
        regencyCode: donatur.regencyCode,
        districtCode: donatur.districtCode,
        villageCode: donatur.villageCode,
        provinceName: indonesiaProvinces.name,
        regencyName: indonesiaRegencies.name,
        districtName: indonesiaDistricts.name,
        villageName: indonesiaVillages.name,
        createdAt: donatur.createdAt,
      })
      .from(donatur)
      .leftJoin(indonesiaProvinces, eq(donatur.provinceCode, indonesiaProvinces.code))
      .leftJoin(indonesiaRegencies, eq(donatur.regencyCode, indonesiaRegencies.code))
      .leftJoin(indonesiaDistricts, eq(donatur.districtCode, indonesiaDistricts.code))
      .leftJoin(indonesiaVillages, eq(donatur.villageCode, indonesiaVillages.code))
      .where(eq(donatur.userId, currentUser!.id))
      .limit(1);

    if (donaturRecord.length > 0) {
      entityType = "donatur";
      entityData = donaturRecord[0];
      const { and } = await import("drizzle-orm");
      bankAccounts = await db
        .select()
        .from(entityBankAccounts)
        .where(and(eq(entityBankAccounts.entityType, "donatur"), eq(entityBankAccounts.entityId, entityData.id)));
    }
  }

  return success(c, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      avatar: user.avatar,
      isDeveloper: Boolean(user.isDeveloper),
      createdAt: user.createdAt,
    },
    roles: rolesSlugs,
    entityType,
    entity: entityData,
    bankAccounts,
  });
});

// Update own profile (employee, mitra, or donatur - based on role)
auth.patch("/me/profile", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");
  const body = await c.req.json();

  const { employees, mitra: mitraTable, donatur, entityBankAccounts } = await import("@bantuanku/db");
  const { and } = await import("drizzle-orm");

  const {
    name,
    phone,
    whatsappNumber,
    website,
    detailAddress,
    provinceCode,
    regencyCode,
    districtCode,
    villageCode,
    bankAccounts,
    // Mitra-specific
    picName,
    picPosition,
    description,
  } = body;

  // Sync name to users table
  const userUpdateData: any = { updatedAt: new Date() };
  if (name) userUpdateData.name = name;
  if (phone !== undefined) userUpdateData.phone = phone || null;
  if (whatsappNumber !== undefined) userUpdateData.whatsappNumber = whatsappNumber || null;
  await db.update(users).set(userUpdateData).where(eq(users.id, currentUser!.id));

  // 1. Try employee first
  const employee = await db.query.employees.findFirst({
    where: eq(employees.userId, currentUser!.id),
  });

  if (employee) {
    await db
      .update(employees)
      .set({
        name: name || employee.name,
        phone: phone !== undefined ? (phone || null) : employee.phone,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber || null) : employee.whatsappNumber,
        website: website !== undefined ? (website || null) : employee.website,
        detailAddress: detailAddress !== undefined ? (detailAddress || null) : employee.detailAddress,
        provinceCode: provinceCode !== undefined ? (provinceCode || null) : employee.provinceCode,
        regencyCode: regencyCode !== undefined ? (regencyCode || null) : employee.regencyCode,
        districtCode: districtCode !== undefined ? (districtCode || null) : employee.districtCode,
        villageCode: villageCode !== undefined ? (villageCode || null) : employee.villageCode,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employee.id));

    // Handle bank accounts
    if (bankAccounts && Array.isArray(bankAccounts)) {
      await db.delete(entityBankAccounts).where(and(eq(entityBankAccounts.entityType, "employee"), eq(entityBankAccounts.entityId, employee.id)));
      if (bankAccounts.length > 0) {
        const { createId } = await import("@bantuanku/db");
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityType: "employee" as const,
            entityId: employee.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }

    return success(c, null, "Profile updated");
  }

  // 2. Try mitra
  const mitraRecord = await db.query.mitra.findFirst({
    where: eq(mitraTable.userId, currentUser!.id),
  });

  if (mitraRecord) {
    await db
      .update(mitraTable)
      .set({
        picName: picName !== undefined ? picName : mitraRecord.picName,
        picPosition: picPosition !== undefined ? (picPosition || null) : mitraRecord.picPosition,
        description: description !== undefined ? (description || null) : mitraRecord.description,
        email: mitraRecord.email, // email cannot change
        phone: phone !== undefined ? (phone || null) : mitraRecord.phone,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber || null) : mitraRecord.whatsappNumber,
        website: website !== undefined ? (website || null) : mitraRecord.website,
        detailAddress: detailAddress !== undefined ? (detailAddress || null) : mitraRecord.detailAddress,
        provinceCode: provinceCode !== undefined ? (provinceCode || null) : mitraRecord.provinceCode,
        regencyCode: regencyCode !== undefined ? (regencyCode || null) : mitraRecord.regencyCode,
        districtCode: districtCode !== undefined ? (districtCode || null) : mitraRecord.districtCode,
        villageCode: villageCode !== undefined ? (villageCode || null) : mitraRecord.villageCode,
        updatedAt: new Date(),
      })
      .where(eq(mitraTable.id, mitraRecord.id));

    // Handle bank accounts
    if (bankAccounts && Array.isArray(bankAccounts)) {
      await db.delete(entityBankAccounts).where(and(eq(entityBankAccounts.entityType, "mitra"), eq(entityBankAccounts.entityId, mitraRecord.id)));
      if (bankAccounts.length > 0) {
        const { createId } = await import("@bantuanku/db");
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityType: "mitra" as const,
            entityId: mitraRecord.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }

    return success(c, null, "Profile updated");
  }

  // 3. Fallback to donatur
  const donaturRecord = await db.query.donatur.findFirst({
    where: eq(donatur.userId, currentUser!.id),
  });

  if (donaturRecord) {
    await db
      .update(donatur)
      .set({
        name: name || donaturRecord.name,
        phone: phone !== undefined ? (phone || null) : donaturRecord.phone,
        whatsappNumber: whatsappNumber !== undefined ? (whatsappNumber || null) : donaturRecord.whatsappNumber,
        website: website !== undefined ? (website || null) : donaturRecord.website,
        detailAddress: detailAddress !== undefined ? (detailAddress || null) : donaturRecord.detailAddress,
        provinceCode: provinceCode !== undefined ? (provinceCode || null) : donaturRecord.provinceCode,
        regencyCode: regencyCode !== undefined ? (regencyCode || null) : donaturRecord.regencyCode,
        districtCode: districtCode !== undefined ? (districtCode || null) : donaturRecord.districtCode,
        villageCode: villageCode !== undefined ? (villageCode || null) : donaturRecord.villageCode,
        updatedAt: new Date(),
      })
      .where(eq(donatur.id, donaturRecord.id));

    // Handle bank accounts
    if (bankAccounts && Array.isArray(bankAccounts)) {
      await db.delete(entityBankAccounts).where(and(eq(entityBankAccounts.entityType, "donatur"), eq(entityBankAccounts.entityId, donaturRecord.id)));
      if (bankAccounts.length > 0) {
        const { createId } = await import("@bantuanku/db");
        await db.insert(entityBankAccounts).values(
          bankAccounts.map((account: any) => ({
            id: createId(),
            entityType: "donatur" as const,
            entityId: donaturRecord.id,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
          }))
        );
      }
    }

    return success(c, null, "Profile updated");
  }

  // No entity found - just update users table (already done above)
  return success(c, null, "Profile updated");
});

auth.patch("/me/password", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const db = c.get("db");
  const body = await c.req.json();

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return error(c, "Current password and new password required", 400);
  }

  if (newPassword.length < 8) {
    return error(c, "New password must be at least 8 characters", 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser!.id),
  });

  if (!user || !user.passwordHash) {
    return error(c, "User not found", 404);
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValid) {
    return error(c, "Current password is incorrect", 400);
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentUser!.id));

  return success(c, null, "Password updated");
});

// Check if email/phone exists in users or donatur table
auth.get("/check-registration", async (c) => {
  const db = c.get("db");
  const email = c.req.query("email");
  const phone = c.req.query("phone");

  if (!email && !phone) {
    return error(c, "Email or phone required", 400);
  }

  // Normalize phone
  const normalizePhone = (input: string): string => {
    let cleaned = input.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+62")) {
      cleaned = "0" + cleaned.substring(3);
    } else if (cleaned.startsWith("62") && cleaned.length > 10) {
      cleaned = "0" + cleaned.substring(2);
    }
    if (cleaned && !cleaned.startsWith("0")) {
      cleaned = "0" + cleaned;
    }
    return cleaned;
  };

  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  // Check in users table first
  let existingUser = null;
  if (email) {
    existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });
  }

  if (existingUser) {
    return success(c, {
      exists: true,
      registered: !!existingUser.passwordHash,
      source: "users",
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      whatsappNumber: existingUser.whatsappNumber,
    });
  }

  // Check in donatur table
  const { donatur } = await import("@bantuanku/db");
  const { or } = await import("drizzle-orm");

  const conditions = [];
  if (email) conditions.push(eq(donatur.email, email.toLowerCase().trim()));
  if (normalizedPhone) {
    conditions.push(eq(donatur.phone, normalizedPhone));
    conditions.push(eq(donatur.whatsappNumber, normalizedPhone));
  }

  if (conditions.length === 0) {
    return success(c, { exists: false, registered: false });
  }

  const existingDonatur = await db.query.donatur.findFirst({
    where: or(...conditions),
  });

  if (existingDonatur) {
    return success(c, {
      exists: true,
      registered: !!existingDonatur.passwordHash,
      source: "donatur",
      name: existingDonatur.name,
      email: existingDonatur.email,
      phone: existingDonatur.phone,
      whatsappNumber: existingDonatur.whatsappNumber,
    });
  }

  return success(c, { exists: false, registered: false });
});

export default auth;
