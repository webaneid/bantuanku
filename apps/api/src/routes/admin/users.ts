import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, like, sql, and } from "drizzle-orm";
import { users, userRoles, roles, createId } from "@bantuanku/db";
import { hashPassword } from "../../lib/password";
import { success, error, paginated } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const usersAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

usersAdmin.use("*", requireRole("super_admin"));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

usersAdmin.get("/", async (c) => {
  const db = c.get("db");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const search = c.req.query("search");

  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(like(users.name, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.users.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(users.createdAt)],
      columns: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
      with: {
        userRoles: {
          columns: {
            roleId: true,
          },
        },
      },
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause),
  ]);

  // Map data to include roleIds array
  const usersWithRoles = data.map(user => ({
    ...user,
    roleIds: user.userRoles?.map(ur => ur.roleId) || [],
  }));

  return paginated(c, usersWithRoles, {
    page,
    limit,
    total: Number(countResult[0]?.count || 0),
  });
});

usersAdmin.post("/", zValidator("json", createUserSchema), async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, body.email),
  });

  if (existingUser) {
    return error(c, "Email already registered", 400);
  }

  const passwordHash = await hashPassword(body.password);
  const userId = createId();

  await db.insert(users).values({
    id: userId,
    email: body.email,
    passwordHash,
    name: body.name,
    phone: body.phone,
  });

  if (body.roleIds && body.roleIds.length > 0) {
    for (const roleId of body.roleIds) {
      await db.insert(userRoles).values({
        userId,
        roleId,
      });
    }
  }

  return success(c, { id: userId }, "User created", 201);
});

usersAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      isActive: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, id),
  });

  const roleIds = userRolesList.map((ur) => ur.roleId);

  return success(c, { ...user, roleIds });
});

usersAdmin.patch("/:id", zValidator("json", updateUserSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = c.get("db");

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  await db
    .update(users)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  return success(c, null, "User updated");
});

usersAdmin.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const currentUser = c.get("user");

  if (currentUser!.id === id) {
    return error(c, "Cannot delete your own account", 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  await db.delete(users).where(eq(users.id, id));

  return success(c, null, "User deleted");
});

usersAdmin.patch("/:id/roles", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = await c.req.json();

  const { roleIds } = body;

  if (!Array.isArray(roleIds)) {
    return error(c, "roleIds must be an array", 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  await db.delete(userRoles).where(eq(userRoles.userId, id));

  for (const roleId of roleIds) {
    await db.insert(userRoles).values({
      userId: id,
      roleId,
    });
  }

  return success(c, null, "User roles updated");
});

// Change password endpoint
const changePasswordSchema = z.object({
  password: z.string().min(6),
});

usersAdmin.put("/:id/password", zValidator("json", changePasswordSchema), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return error(c, "User not found", 404);
  }

  const passwordHash = await hashPassword(body.password);

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  return success(c, null, "Password updated");
});

export default usersAdmin;
