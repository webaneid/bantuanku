import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt";
import { error } from "../lib/response";
import type { Env, Variables } from "../types";

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(c, "Unauthorized", 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      return error(c, "Invalid or expired token", 401);
    }

    c.set("user", {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      whatsappNumber: payload.whatsappNumber,
      roles: payload.roles,
      isDeveloper: Boolean(payload.isDeveloper),
    });

    await next();
  }
);

export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload) {
        c.set("user", {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          whatsappNumber: payload.whatsappNumber,
          roles: payload.roles,
          isDeveloper: Boolean(payload.isDeveloper),
        });
      }
    }

    await next();
  }
);

export function requireRole(...roles: string[]) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return error(c, "Unauthorized", 401);
    }

    const hasRole = user.roles.some((role) => roles.includes(role));

    if (!hasRole) {
      return error(c, "Forbidden", 403);
    }

    await next();
  });
}

export const requireDeveloper = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return error(c, "Unauthorized", 401);
    }

    if (!user.isDeveloper) {
      return error(c, "Forbidden", 403);
    }

    await next();
  }
);

// Aliases for convenience
export const requireAuth = authMiddleware;
export const requireRoles = requireRole;
