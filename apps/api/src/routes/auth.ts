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
  const { donatur, donations } = await import("@bantuanku/db");
  const existingDonatur = await db.query.donatur.findFirst({
    where: eq(donatur.email, email.toLowerCase().trim()),
  });

  if (existingDonatur) {
    // Update existing donatur with password
    await db
      .update(donatur)
      .set({
        passwordHash,
        name,
        phone: phone || existingDonatur.phone,
        whatsappNumber: whatsappNumber || existingDonatur.whatsappNumber,
        updatedAt: new Date(),
      })
      .where(eq(donatur.id, existingDonatur.id));
  } else {
    // Create new donatur record
    await db.insert(donatur).values({
      id: createId(),
      email,
      passwordHash,
      name,
      phone,
      whatsappNumber,
    });
  }

  // Link existing donations to new user account
  // Update donations that have matching email or phone
  const { or } = await import("drizzle-orm");

  const conditions = [eq(donations.donorEmail, email.toLowerCase().trim())];

  // Normalize phone for matching
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

  if (phone) {
    conditions.push(eq(donations.donorPhone, normalizePhone(phone)));
  }
  if (whatsappNumber) {
    conditions.push(eq(donations.donorPhone, normalizePhone(whatsappNumber)));
  }

  // Update all matching donations to link them to the new user
  if (conditions.length > 0) {
    await db
      .update(donations)
      .set({ userId, updatedAt: new Date() })
      .where(or(...conditions));
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
