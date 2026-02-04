import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { roles, permissions, rolePermissions, createId } from "@bantuanku/db";
import { success, error } from "../../lib/response";
import { requireRole } from "../../middleware/auth";
import type { Env, Variables } from "../../types";

const rolesAdmin = new Hono<{ Bindings: Env; Variables: Variables }>();

rolesAdmin.use("*", requireRole("super_admin"));

const createRoleSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
});

const updateRoleSchema = createRoleSchema.partial();

rolesAdmin.get("/", async (c) => {
  const db = c.get("db");

  const data = await db.query.roles.findMany({
    orderBy: [asc(roles.name)],
  });

  return success(c, data);
});

rolesAdmin.post("/", zValidator("json", createRoleSchema), async (c) => {
  const body = c.req.valid("json");
  const db = c.get("db");

  const existingRole = await db.query.roles.findFirst({
    where: eq(roles.slug, body.slug),
  });

  if (existingRole) {
    return error(c, "Role slug already exists", 400);
  }

  const roleId = createId();

  await db.insert(roles).values({
    id: roleId,
    ...body,
  });

  return success(c, { id: roleId }, "Role created", 201);
});

rolesAdmin.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const role = await db.query.roles.findFirst({
    where: eq(roles.id, id),
  });

  if (!role) {
    return error(c, "Role not found", 404);
  }

  const rolePerms = await db.query.rolePermissions.findMany({
    where: eq(rolePermissions.roleId, id),
  });

  const permissionIds = rolePerms.map((rp) => rp.permissionId);

  return success(c, { ...role, permissionIds });
});

rolesAdmin.patch("/:id", zValidator("json", updateRoleSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = c.get("db");

  const role = await db.query.roles.findFirst({
    where: eq(roles.id, id),
  });

  if (!role) {
    return error(c, "Role not found", 404);
  }

  if (role.isSystem) {
    return error(c, "Cannot modify system role", 400);
  }

  await db
    .update(roles)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(roles.id, id));

  return success(c, null, "Role updated");
});

rolesAdmin.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const role = await db.query.roles.findFirst({
    where: eq(roles.id, id),
  });

  if (!role) {
    return error(c, "Role not found", 404);
  }

  if (role.isSystem) {
    return error(c, "Cannot delete system role", 400);
  }

  await db.delete(roles).where(eq(roles.id, id));

  return success(c, null, "Role deleted");
});

rolesAdmin.get("/permissions/all", async (c) => {
  const db = c.get("db");

  const data = await db.query.permissions.findMany({
    orderBy: [asc(permissions.module), asc(permissions.key)],
  });

  return success(c, data);
});

rolesAdmin.patch("/:id/permissions", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = await c.req.json();

  const { permissionIds } = body;

  if (!Array.isArray(permissionIds)) {
    return error(c, "permissionIds must be an array", 400);
  }

  const role = await db.query.roles.findFirst({
    where: eq(roles.id, id),
  });

  if (!role) {
    return error(c, "Role not found", 404);
  }

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

  for (const permissionId of permissionIds) {
    await db.insert(rolePermissions).values({
      roleId: id,
      permissionId,
    });
  }

  return success(c, null, "Role permissions updated");
});

export default rolesAdmin;
